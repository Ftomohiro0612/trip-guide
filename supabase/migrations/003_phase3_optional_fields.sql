-- ================================================================
-- メモリップ Phase 3 任意フィールド追加
-- Supabase ダッシュボード → SQL エディタ で実行してください
-- ================================================================

-- ----------------------------------------------------------------
-- visits テーブル：任意フィールド追加
-- ----------------------------------------------------------------

-- 天気
ALTER TABLE public.visits
  ADD COLUMN weather TEXT
    CHECK (weather IN ('sunny','cloudy','rainy','snowy','unknown'));

-- 気温感
ALTER TABLE public.visits
  ADD COLUMN temp_feeling TEXT
    CHECK (temp_feeling IN ('hot','comfortable','cold'));

-- 滞在時間（分単位）
ALTER TABLE public.visits
  ADD COLUMN stay_duration_min INTEGER
    CHECK (stay_duration_min > 0);

-- 時間は足りたか
ALTER TABLE public.visits
  ADD COLUMN time_was_enough TEXT
    CHECK (time_was_enough IN ('enough','want_more','too_long'));

-- 食事・売店評価
ALTER TABLE public.visits
  ADD COLUMN food_rating TEXT
    CHECK (food_rating IN ('great','ok','poor','no_food'));

-- 混雑状況
ALTER TABLE public.visits
  ADD COLUMN crowding TEXT
    CHECK (crowding IN ('empty','normal','busy','very_busy','unknown'));

-- 駐車場
ALTER TABLE public.visits
  ADD COLUMN parking TEXT
    CHECK (parking IN ('easy','normal','difficult','full','none','not_used'));

-- ----------------------------------------------------------------
-- profiles テーブル：家族共有用 household_id（将来拡張用）
-- ----------------------------------------------------------------
-- 現時点ではロジックなし。nullable / 外部キーなし。
-- 将来の household スペース共有機能のためにカラムだけ確保する。
ALTER TABLE public.profiles
  ADD COLUMN household_id UUID;

-- ----------------------------------------------------------------
-- 確認クエリ（実行後の確認用）
-- ----------------------------------------------------------------
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_schema = 'public' AND table_name = 'visits'
--   AND column_name IN (
--     'weather','temp_feeling','stay_duration_min',
--     'time_was_enough','food_rating','crowding','parking'
--   )
-- ORDER BY column_name;
--
-- SELECT column_name FROM information_schema.columns
-- WHERE table_schema = 'public' AND table_name = 'profiles'
--   AND column_name = 'household_id';
