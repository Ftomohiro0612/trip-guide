-- マイページ Phase 1: おすすめ情報を受け取りたい都道府県（アカウント単位・複数選択）
-- Supabase Dashboard の SQL Editor で Owner が手動適用する。

CREATE TABLE public.mypage_recommendation_settings (
  user_id         UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  prefecture_ids  TEXT[] NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT mypage_recommendation_prefecture_count
    CHECK (cardinality(prefecture_ids) <= 47),
  CONSTRAINT mypage_recommendation_prefecture_vocabulary
    CHECK (
      prefecture_ids <@ ARRAY[
        'hokkaido', 'aomori', 'iwate', 'miyagi', 'akita', 'yamagata',
        'fukushima', 'ibaraki', 'tochigi', 'gunma', 'saitama', 'chiba',
        'tokyo', 'kanagawa', 'niigata', 'toyama', 'ishikawa', 'fukui',
        'yamanashi', 'nagano', 'gifu', 'shizuoka', 'aichi', 'mie',
        'shiga', 'kyoto', 'osaka', 'hyogo', 'nara', 'wakayama',
        'tottori', 'shimane', 'okayama', 'hiroshima', 'yamaguchi',
        'tokushima', 'kagawa', 'ehime', 'kochi', 'fukuoka', 'saga',
        'nagasaki', 'kumamoto', 'oita', 'miyazaki', 'kagoshima', 'okinawa'
      ]::TEXT[]
    )
);

ALTER TABLE public.mypage_recommendation_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "自分のマイページおすすめ地域のみ"
  ON public.mypage_recommendation_settings
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE
  ON public.mypage_recommendation_settings
  TO authenticated;
