-- Add pool to reaction_tags.
-- Current schema (005): id, label, category, sort_order, is_active, created_at.
INSERT INTO public.reaction_tags (id, label, category, sort_order)
SELECT 'pool', 'プール', 'active', COALESCE(MAX(sort_order), 0) + 1
FROM public.reaction_tags
ON CONFLICT (id) DO NOTHING;
