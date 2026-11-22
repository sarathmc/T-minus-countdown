CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE TABLE public.users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE FUNCTION public.handle_new_auth_user() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  PERFORM set_config('request.jwt.claim.sub', NEW.id::text, true);
  INSERT INTO public.users(id) VALUES (NEW.id) ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();
CREATE TABLE public.countdowns (
  id uuid PRIMARY KEY, user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title varchar(64) NOT NULL CHECK (char_length(btrim(title)) BETWEEN 1 AND 64), description varchar(2000) NOT NULL DEFAULT '',
  target_at timestamptz NOT NULL, time_zone varchar(100) NOT NULL, category varchar(20) NOT NULL CHECK (category IN ('personal','work','study','travel','health','finance','other')),
  status varchar(12) NOT NULL CHECK (status IN ('active','paused','archived')), created_at timestamptz NOT NULL, updated_at timestamptz NOT NULL
);
CREATE TABLE public.milestones (
  id uuid PRIMARY KEY, countdown_id uuid NOT NULL REFERENCES public.countdowns(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE, title varchar(160) NOT NULL CHECK (char_length(btrim(title)) > 0), description varchar(2000) NOT NULL DEFAULT '',
  due_at timestamptz NOT NULL, offset_days integer CHECK (offset_days >= 0), is_complete boolean NOT NULL DEFAULT false, is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(countdown_id, due_at)
);
CREATE TABLE public.reminders (
  id uuid PRIMARY KEY, user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  countdown_id uuid NOT NULL REFERENCES public.countdowns(id) ON DELETE CASCADE,
  milestone_id uuid REFERENCES public.milestones(id) ON DELETE SET NULL, title varchar(160) NOT NULL, description varchar(2000) NOT NULL DEFAULT '',
  scheduled_at timestamptz NOT NULL, time_zone varchar(100) NOT NULL, type varchar(16) NOT NULL CHECK (type IN ('countdown','milestone','custom')),
  enabled boolean NOT NULL DEFAULT true, status varchar(16) NOT NULL DEFAULT 'scheduled', created_at timestamptz NOT NULL, updated_at timestamptz NOT NULL
);
CREATE TABLE public.reminder_preferences (
  user_id uuid PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE, notifications_enabled boolean NOT NULL DEFAULT false,
  daily_reminder_enabled boolean NOT NULL DEFAULT false, daily_reminder_time varchar(5) NOT NULL DEFAULT '09:00' CHECK (daily_reminder_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
  time_zone varchar(100) NOT NULL, updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.notification_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  endpoint text NOT NULL UNIQUE, p256dh text NOT NULL, auth text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.wallpaper_preferences (
  user_id uuid PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE, settings jsonb NOT NULL, updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.synchronization_metadata (
  user_id uuid PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE, last_synced_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.deleted_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  entity varchar(20) NOT NULL CHECK (entity IN ('countdown','milestone','reminder')), record_id uuid NOT NULL, deleted_at timestamptz NOT NULL DEFAULT now(), UNIQUE(user_id, entity, record_id)
);
CREATE INDEX countdowns_user_target_idx ON public.countdowns(user_id,target_at);
CREATE INDEX milestones_user_due_idx ON public.milestones(user_id,due_at);
CREATE INDEX reminders_user_schedule_idx ON public.reminders(user_id,scheduled_at) WHERE enabled;
CREATE INDEX deleted_records_user_time_idx ON public.deleted_records(user_id,deleted_at);

-- API transactions set request.jwt.claim.sub to the token-verified subject before querying.
DO $$ DECLARE table_name text; BEGIN
  FOREACH table_name IN ARRAY ARRAY['users','countdowns','milestones','reminders','reminder_preferences','notification_subscriptions','wallpaper_preferences','synchronization_metadata','deleted_records'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY', table_name);
    IF table_name = 'users' THEN
      EXECUTE format('CREATE POLICY owner_access ON public.%I USING (id::text = current_setting(''request.jwt.claim.sub'', true)) WITH CHECK (id::text = current_setting(''request.jwt.claim.sub'', true))', table_name);
    ELSE
      EXECUTE format('CREATE POLICY owner_access ON public.%I USING (user_id::text = current_setting(''request.jwt.claim.sub'', true)) WITH CHECK (user_id::text = current_setting(''request.jwt.claim.sub'', true))', table_name);
    END IF;
  END LOOP;
END $$;