-- ================================================================
-- メモリップ Phase 1 スキーマ
-- Supabase ダッシュボード → SQL エディタ で実行してください
-- ================================================================

-- ----------------------------------------------------------------
-- profiles（ユーザープロフィール）
-- ----------------------------------------------------------------
CREATE TABLE public.profiles (
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name    TEXT,
  home_prefecture TEXT,     -- 都道府県コード（例: "13" = 東京）
  home_city_code  TEXT,     -- 市区町村コード（任意）
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "自分のプロフィールのみ"
  ON public.profiles FOR ALL
  USING (auth.uid() = id);

-- 新規ユーザー登録時に profile を自動作成するトリガー
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (id)
  VALUES (NEW.id)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ----------------------------------------------------------------
-- children（子どもプロフィール）
-- ----------------------------------------------------------------
CREATE TABLE public.children (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  nickname     TEXT NOT NULL,
  birth_year   SMALLINT NOT NULL,
  birth_month  SMALLINT NOT NULL CHECK (birth_month BETWEEN 1 AND 12),
  gender       TEXT CHECK (gender IN ('male', 'female', 'other')),
  sort_order   SMALLINT DEFAULT 0,
  created_at   TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.children ENABLE ROW LEVEL SECURITY;
CREATE POLICY "自分の子どもプロフィールのみ"
  ON public.children FOR ALL
  USING (auth.uid() = user_id);

-- ----------------------------------------------------------------
-- GRANT（authenticated ロールへのアクセス権付与）
-- ----------------------------------------------------------------
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.children TO authenticated;

-- ----------------------------------------------------------------
-- Phase 1 完了確認クエリ（実行後の動作確認用）
-- ----------------------------------------------------------------
-- SELECT tablename, rowsecurity FROM pg_tables
--   WHERE schemaname = 'public' AND tablename IN ('profiles', 'children');
-- → rowsecurity = true になっていれば RLS 有効
