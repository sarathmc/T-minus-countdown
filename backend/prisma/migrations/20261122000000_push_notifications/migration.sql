CREATE TABLE public.push_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  reminder_id uuid NOT NULL REFERENCES public.reminders(id) ON DELETE CASCADE,
  subscription_id uuid NOT NULL REFERENCES public.notification_subscriptions(id) ON DELETE CASCADE,
  status varchar(16) NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued','sending','delivered','retrying','failed','cancelled','expired')),
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  delivered_at timestamptz,
  last_error varchar(500),
  idempotency_key varchar(128) NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(reminder_id, subscription_id)
);
CREATE INDEX push_deliveries_due_idx ON public.push_deliveries(status, next_attempt_at);
CREATE INDEX push_deliveries_user_due_idx ON public.push_deliveries(user_id, status, next_attempt_at);
ALTER TABLE public.push_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_deliveries FORCE ROW LEVEL SECURITY;
CREATE POLICY owner_access ON public.push_deliveries
  USING (user_id::text = current_setting('request.jwt.claim.sub', true))
  WITH CHECK (user_id::text = current_setting('request.jwt.claim.sub', true));
