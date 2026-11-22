ALTER TABLE public.countdowns
  ADD COLUMN revision integer NOT NULL DEFAULT 1;

ALTER TABLE public.milestones
  ADD COLUMN revision integer NOT NULL DEFAULT 1;

ALTER TABLE public.reminders
  ADD COLUMN revision integer NOT NULL DEFAULT 1;
