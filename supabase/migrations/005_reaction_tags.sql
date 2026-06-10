-- 1. reaction_tags マスタ
CREATE TABLE public.reaction_tags (
  id          TEXT PRIMARY KEY,
  label       TEXT NOT NULL,
  category    TEXT NOT NULL,
  sort_order  INT  NOT NULL DEFAULT 0,
  is_active   BOOL NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.reaction_tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reaction_tags: public read"
  ON public.reaction_tags FOR SELECT USING (true);
GRANT SELECT ON public.reaction_tags TO authenticated;

-- 2. visit_children に id を追加
ALTER TABLE public.visit_children
  ADD COLUMN id UUID NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE public.visit_children
  ADD CONSTRAINT visit_children_id_key UNIQUE (id);

-- 3. visit_child_tags テーブル
CREATE TABLE public.visit_child_tags (
  visit_child_id UUID NOT NULL
    REFERENCES public.visit_children(id) ON DELETE CASCADE,
  tag_id         TEXT NOT NULL
    REFERENCES public.reaction_tags(id) ON DELETE RESTRICT,
  PRIMARY KEY (visit_child_id, tag_id)
);
ALTER TABLE public.visit_child_tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "visit_child_tags: owner via visit"
  ON public.visit_child_tags FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.visit_children vc
      JOIN public.visits v ON v.id = vc.visit_id
      WHERE vc.id = visit_child_id AND v.user_id = auth.uid()
    )
  );
GRANT SELECT, INSERT, DELETE ON public.visit_child_tags TO authenticated;

-- 4. シードデータ
INSERT INTO public.reaction_tags (id, label, category, sort_order) VALUES
  ('animal',              '動物',             'creature',   10),
  ('animal_contact',      'ふれあい',         'creature',   20),
  ('animal_feed',         'エサやり',         'creature',   30),
  ('water_play',          '水遊び',           'active',     40),
  ('playground',          '遊具',             'active',     50),
  ('athletic',            'アスレチック',     'active',     60),
  ('slide',               'すべり台',         'active',     70),
  ('running',             '走る',             'active',     80),
  ('wide_space',          '広い場所',         'active',     90),
  ('vehicle',             '乗り物',           'vehicle',   100),
  ('craft',               '工作',             'creative',  110),
  ('experience',          '体験',             'creative',  120),
  ('exhibition',          '展示',             'learning',  130),
  ('science',             '科学',             'learning',  140),
  ('dinosaur',            '恐竜',             'learning',  150),
  ('character',           'キャラクター',     'character', 160),
  ('nature',              '自然',             'nature',    170),
  ('food',                '食べ物',           'food',      180),
  ('played_with_friends', '友達と遊んだ',     'social',    190),
  ('played_with_siblings','きょうだいで遊んだ','social',   200),
  ('first_time',          '初めてできた',     'growth',    210),
  ('did_alone',           '一人でできた',     'growth',    220),
  ('brave_challenge',     '怖がらず挑戦した', 'growth',    230),
  ('other',               'その他',           'other',     999);
