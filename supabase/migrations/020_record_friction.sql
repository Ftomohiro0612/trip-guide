-- Quick records preserve unanswered evaluations as NULL. Existing rows are untouched.
ALTER TABLE public.wishlists
  ADD COLUMN planned_date DATE,
  ADD COLUMN visit_prompt_shown_at TIMESTAMPTZ,
  ADD COLUMN visit_prompt_dismissed_at TIMESTAMPTZ;

ALTER TABLE public.visits
  ALTER COLUMN family_revisit DROP NOT NULL,
  ALTER COLUMN parent_fatigue DROP NOT NULL;

ALTER TABLE public.visit_children
  ALTER COLUMN satisfaction DROP NOT NULL;
