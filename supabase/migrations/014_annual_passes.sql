-- ================================================================
-- メモリップ Phase 4: 年パス（年間パスポート）管理
-- Supabase ダッシュボード → SQL エディタ で実行してください
-- ================================================================

CREATE TABLE public.annual_passes (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

  -- 施設
  facility_slug TEXT NOT NULL,
  facility_name TEXT NOT NULL,

  -- 年パス情報
  expires_on    DATE NOT NULL,
  holder_note   TEXT,   -- 対象者メモ（例: 家族全員 / 望結のみ）
  memo          TEXT,

  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now(),

  -- 同じ施設の年パスは1アカウント1件（更新時は期限を編集する）
  UNIQUE (user_id, facility_slug)
);

CREATE INDEX idx_annual_passes_user_id ON public.annual_passes(user_id);
CREATE INDEX idx_annual_passes_expires ON public.annual_passes(expires_on);

ALTER TABLE public.annual_passes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "自分の年パスのみ"
  ON public.annual_passes FOR ALL
  USING (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.annual_passes TO authenticated;
