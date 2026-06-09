-- ================================================================
-- メモリップ Phase 2 スキーマ
-- Supabase ダッシュボード → SQL エディタ で実行してください
-- ================================================================

-- ----------------------------------------------------------------
-- visits（おでかけ記録）
-- ----------------------------------------------------------------
CREATE TYPE date_precision AS ENUM ('exact', 'month', 'year', 'unknown');

CREATE TABLE public.visits (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

  -- 施設
  facility_slug    TEXT NOT NULL,
  facility_name    TEXT NOT NULL,

  -- 訪問日（精度対応）
  visited_on       DATE,
  visited_year     SMALLINT,
  visited_month    SMALLINT CHECK (visited_month BETWEEN 1 AND 12),
  date_precision   date_precision NOT NULL DEFAULT 'exact',
  is_past_entry    BOOLEAN NOT NULL DEFAULT false,

  -- 必須：家族評価
  family_revisit   TEXT NOT NULL CHECK (family_revisit IN ('yes','conditional','once_enough','no')),
  parent_fatigue   TEXT NOT NULL CHECK (parent_fatigue IN ('easy','normal','tired','exhausted')),

  -- 任意：期待との比較
  expectation_vs_reality TEXT CHECK (expectation_vs_reality IN ('exceeded','met','below')),

  -- 任意：自由メモ
  parent_memo      TEXT,

  created_at       TIMESTAMPTZ DEFAULT now(),
  updated_at       TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_visits_user_id    ON public.visits(user_id);
CREATE INDEX idx_visits_facility   ON public.visits(facility_slug);
CREATE INDEX idx_visits_visited_on ON public.visits(visited_on DESC NULLS LAST);

ALTER TABLE public.visits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "自分の訪問記録のみ"
  ON public.visits FOR ALL
  USING (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.visits TO authenticated;

-- ----------------------------------------------------------------
-- visit_children（訪問×子ども・満足度）
-- ----------------------------------------------------------------
CREATE TYPE child_satisfaction AS ENUM (
  'loved',         -- 大満足
  'enjoyed',       -- 楽しんだ
  'neutral',       -- 普通
  'not_fit',       -- 合わなかった
  'could_not_join' -- 参加できなかった
);

CREATE TABLE public.visit_children (
  visit_id            UUID NOT NULL REFERENCES public.visits(id) ON DELETE CASCADE,
  child_id            UUID NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,
  satisfaction        child_satisfaction NOT NULL,
  child_age_at_visit  SMALLINT,
  reaction_tags       TEXT[],
  PRIMARY KEY (visit_id, child_id)
);

ALTER TABLE public.visit_children ENABLE ROW LEVEL SECURITY;
CREATE POLICY "自分の訪問×子どものみ"
  ON public.visit_children FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.visits v
      WHERE v.id = visit_id AND v.user_id = auth.uid()
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.visit_children TO authenticated;

-- ----------------------------------------------------------------
-- wishlists（行きたいリスト）
-- ----------------------------------------------------------------
CREATE TABLE public.wishlists (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  facility_slug  TEXT NOT NULL,
  facility_name  TEXT NOT NULL,
  memo           TEXT,
  created_at     TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, facility_slug)
);

ALTER TABLE public.wishlists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "自分の行きたいリストのみ"
  ON public.wishlists FOR ALL
  USING (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.wishlists TO authenticated;

-- ----------------------------------------------------------------
-- RLS テスト手順（別ユーザーのデータが見えないことを確認）
-- ----------------------------------------------------------------
-- 1. SET LOCAL role = authenticated;
-- 2. SET LOCAL "request.jwt.claims" = '{"sub":"<ユーザーAのUUID>"}';
-- 3. SELECT * FROM visits;        -- 自分のレコードのみ表示されること
-- 4. SELECT * FROM visit_children; -- 自分のvisit経由のみ表示されること
-- 5. SELECT * FROM wishlists;     -- 自分のレコードのみ表示されること
-- ----------------------------------------------------------------
