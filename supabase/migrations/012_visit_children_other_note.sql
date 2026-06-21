-- Add free-text notes for reaction "other" choices.
-- These columns are memo-only and are intentionally not used for controlled
-- reaction tag aggregation or visit_child_tags.
ALTER TABLE public.visit_children
  ADD COLUMN IF NOT EXISTS interest_other_note TEXT;

ALTER TABLE public.visit_children
  ADD COLUMN IF NOT EXISTS behavior_other_note TEXT;
