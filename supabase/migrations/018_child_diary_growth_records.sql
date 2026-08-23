-- ================================================================
-- メモリップ こども日記・成長記録（身長履歴）
-- Supabase ダッシュボード → SQL エディタ で実行してください
-- ================================================================

-- ----------------------------------------------------------------
-- visit_children（訪問×子ども）に、子ども本人の言葉を残す日記を追加
-- 既存の visit_children RLS（訪問記録の所有者経由）が適用されます。
-- ----------------------------------------------------------------
ALTER TABLE public.visit_children
  ADD COLUMN child_diary TEXT;

COMMENT ON COLUMN public.visit_children.child_diary IS
  '子ども本人のおでかけ日記。まだ書けない子は、親が子どもの言葉を代筆する。';

-- ----------------------------------------------------------------
-- child_growth_records（子どもごとの日付付き身長履歴）
-- 訪問には直接紐付けず、任意のタイミングで記録します。
-- ----------------------------------------------------------------
CREATE TABLE public.child_growth_records (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id     UUID NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,
  recorded_on  DATE NOT NULL,
  height_cm    NUMERIC(5,1) NOT NULL CHECK (height_cm > 0 AND height_cm <= 300),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (child_id, recorded_on)
);

CREATE INDEX idx_child_growth_records_child_date
  ON public.child_growth_records(child_id, recorded_on DESC);

ALTER TABLE public.child_growth_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "自分の子どもの成長記録のみ"
  ON public.child_growth_records FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.children c
      WHERE c.id = child_id AND c.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.children c
      WHERE c.id = child_id AND c.user_id = auth.uid()
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE
  ON public.child_growth_records TO authenticated;
