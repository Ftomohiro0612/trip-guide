-- Add internal classification for reaction tags without changing existing visit data.
ALTER TABLE public.reaction_tags
  ADD COLUMN IF NOT EXISTS tag_type TEXT NOT NULL DEFAULT 'behavior';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'reaction_tags_tag_type_check'
      AND conrelid = 'public.reaction_tags'::regclass
  ) THEN
    ALTER TABLE public.reaction_tags
      ADD CONSTRAINT reaction_tags_tag_type_check
      CHECK (tag_type IN ('interest', 'behavior'));
  END IF;
END $$;

UPDATE public.reaction_tags
SET tag_type = 'interest'
WHERE category IN (
  'creature',
  'active',
  'vehicle',
  'creative',
  'learning',
  'character',
  'nature',
  'food'
);

INSERT INTO public.reaction_tags (id, label, category, sort_order, tag_type) VALUES
  ('seaside_play', '海・磯遊び', 'active', 95, 'interest'),
  ('creature_search', '生き物探し', 'nature', 175, 'interest')
ON CONFLICT (id) DO NOTHING;
