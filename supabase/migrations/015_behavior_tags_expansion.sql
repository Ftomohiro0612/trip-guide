-- Add visit-varying behavior signals without changing existing tags or records.
INSERT INTO public.reaction_tags (id, label, category, sort_order, tag_type) VALUES
  ('immersed', '夢中で遊んだ', 'engagement', 120, 'behavior'),
  ('focused', '集中していた', 'engagement', 125, 'behavior'),
  ('all_smiles', 'ずっと笑顔だった', 'emotion', 130, 'behavior'),
  ('energetic_to_end', '最後まで元気だった', 'stamina', 135, 'behavior'),
  ('tired_midway', '途中で疲れた', 'stamina', 140, 'behavior'),
  ('got_bored', 'すぐ飽きた', 'engagement', 145, 'behavior'),
  ('was_scared', '怖がっていた', 'emotion', 150, 'behavior'),
  ('improved', '前より上手になった', 'growth', 235, 'behavior')
ON CONFLICT (id) DO NOTHING;
