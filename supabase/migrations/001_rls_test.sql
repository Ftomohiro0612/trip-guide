-- ================================================================
-- RLS テスト手順（Phase 1 完了条件）
-- Supabase ダッシュボード → SQL エディタ で実行してください
-- ================================================================
-- 前提: 実際に2つのテストアカウント（user_a / user_b）を作成し、
--        それぞれのユーザーIDを以下に設定して実行してください。
--
-- ① Supabase Authentication でテストユーザー2人を作成
-- ② 下記の :user_a_id / :user_b_id を実際の UUID に置き換えて実行
-- ================================================================

-- テスト用 UUID（実際の値に置き換えること）
DO $$
DECLARE
  v_user_a UUID := '<user_a の UUID>'; -- ← ここを置き換え
  v_user_b UUID := '<user_b の UUID>'; -- ← ここを置き換え
BEGIN

  -- 1. profiles が自動作成されているか確認
  ASSERT (SELECT COUNT(*) FROM public.profiles WHERE id = v_user_a) = 1,
    'user_a の profile が存在しない';
  ASSERT (SELECT COUNT(*) FROM public.profiles WHERE id = v_user_b) = 1,
    'user_b の profile が存在しない';

  -- 2. user_a の children を直接 INSERT（管理者権限で確認用）
  INSERT INTO public.children (user_id, nickname, birth_year, birth_month)
  VALUES (v_user_a, 'テスト太郎（A）', 2020, 4);

  -- 3. RLS チェック: user_b として実行したとき user_a のデータが見えないこと
  -- ※ set_config は Supabase の anon key で実行時に機能します
  -- ※ ここは管理者 SQL では通過するため、実際には Auth を切り替えて
  --    フロントエンドから確認してください（以下はロジック確認用）

  RAISE NOTICE 'RLS テスト用レコード作成完了。フロントエンドで user_b でログインし、/mypage/children にアクセスして user_a のデータが表示されないことを確認してください。';

  -- クリーンアップ
  DELETE FROM public.children WHERE user_id = v_user_a AND nickname = 'テスト太郎（A）';

END;
$$;

-- ----------------------------------------------------------------
-- 簡易確認クエリ（RLS 設定確認）
-- ----------------------------------------------------------------
SELECT
  tablename,
  CASE WHEN rowsecurity THEN '✅ RLS 有効' ELSE '❌ RLS 無効' END AS rls_status
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('profiles', 'children');
