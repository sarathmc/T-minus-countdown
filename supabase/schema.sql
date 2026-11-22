-- Optional Phase 2: multi-device sync and accounts.
create extension if not exists pgcrypto;
create table if not exists public.countdowns (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 64),
  description text not null default '',
  target_at timestamptz not null,
  revision integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.milestones (
  id uuid primary key default gen_random_uuid(),
  countdown_id uuid not null references public.countdowns(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  due_at timestamptz not null,
  revision integer not null default 1,
  offset_days integer,
  is_complete boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.countdowns enable row level security;
alter table public.milestones enable row level security;
create policy "Users manage their countdowns" on public.countdowns for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users manage their milestones" on public.milestones for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index if not exists countdowns_user_target_idx on public.countdowns(user_id,target_at);
create index if not exists milestones_countdown_due_idx on public.milestones(countdown_id,due_at);
