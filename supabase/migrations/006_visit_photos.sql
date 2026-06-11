-- ================================================================
-- メモリップ Phase A 写真登録 DB・Storage 基盤
-- Supabase ダッシュボード -> SQL エディタでこのファイル全体を実行してください
-- ================================================================

-- ----------------------------------------------------------------
-- Storage bucket: visit-photos
-- ----------------------------------------------------------------
-- private bucket のみを使用する。公開 bucket / 公開URL発行は使用しない。
-- SQL Editor で storage.buckets への変更が許可されない場合は、Supabase
-- Dashboard -> Storage から以下を手動作成・確認すること。
--   - Bucket name: visit-photos
--   - Public bucket: OFF
--   - File size limit: 5 MB
--   - Allowed MIME types: image/webp
INSERT INTO storage.buckets (id, name, public)
VALUES ('visit-photos', 'visit-photos', false)
ON CONFLICT (id) DO UPDATE
SET public = false;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'storage'
      AND table_name = 'buckets'
      AND column_name = 'file_size_limit'
  ) THEN
    EXECUTE 'UPDATE storage.buckets SET file_size_limit = 5242880 WHERE id = ''visit-photos''';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'storage'
      AND table_name = 'buckets'
      AND column_name = 'allowed_mime_types'
  ) THEN
    EXECUTE 'UPDATE storage.buckets SET allowed_mime_types = ARRAY[''image/webp'']::text[] WHERE id = ''visit-photos''';
  END IF;
END $$;

-- ----------------------------------------------------------------
-- visit_photos（訪問写真）
-- ----------------------------------------------------------------
CREATE TABLE public.visit_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id UUID NOT NULL REFERENCES public.visits(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  thumb_path TEXT NOT NULL,
  width INT,
  height INT,
  bytes INT,
  taken_on DATE,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT visit_photos_storage_path_format
    CHECK (storage_path LIKE user_id::text || '/' || visit_id::text || '/%'),
  CONSTRAINT visit_photos_thumb_path_format
    CHECK (thumb_path LIKE user_id::text || '/' || visit_id::text || '/%'),
  CONSTRAINT visit_photos_paths_different
    CHECK (storage_path <> thumb_path),
  CONSTRAINT visit_photos_width_positive
    CHECK (width IS NULL OR width > 0),
  CONSTRAINT visit_photos_height_positive
    CHECK (height IS NULL OR height > 0),
  CONSTRAINT visit_photos_bytes_positive
    CHECK (bytes IS NULL OR bytes > 0),
  CONSTRAINT visit_photos_sort_order_non_negative
    CHECK (sort_order >= 0),
  CONSTRAINT visit_photos_storage_path_unique UNIQUE (storage_path),
  CONSTRAINT visit_photos_thumb_path_unique UNIQUE (thumb_path)
);

COMMENT ON TABLE public.visit_photos IS
  'Private photos attached to visits. No location metadata or raw photo metadata columns are stored.';
COMMENT ON COLUMN public.visit_photos.storage_path IS
  'Private Supabase Storage path: {user_id}/{visit_id}/{photo_id}.webp';
COMMENT ON COLUMN public.visit_photos.thumb_path IS
  'Private Supabase Storage path: {user_id}/{visit_id}/{photo_id}_thumb.webp';
COMMENT ON COLUMN public.visit_photos.taken_on IS
  'Photo date only, read before client-side metadata stripping.';

CREATE INDEX idx_visit_photos_visit ON public.visit_photos(visit_id);
CREATE INDEX idx_visit_photos_user ON public.visit_photos(user_id);

ALTER TABLE public.visit_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "visit_photos select own visit"
  ON public.visit_photos FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.visits v
      WHERE v.id = visit_photos.visit_id
        AND v.user_id = auth.uid()
    )
  );

CREATE POLICY "visit_photos insert own visit"
  ON public.visit_photos FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.visits v
      WHERE v.id = visit_photos.visit_id
        AND v.user_id = auth.uid()
    )
  );

CREATE POLICY "visit_photos delete own visit"
  ON public.visit_photos FOR DELETE
  TO authenticated
  USING (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.visits v
      WHERE v.id = visit_photos.visit_id
        AND v.user_id = auth.uid()
    )
  );

GRANT SELECT, INSERT, DELETE ON public.visit_photos TO authenticated;

-- ----------------------------------------------------------------
-- 1訪問あたりの写真枚数制限
-- ----------------------------------------------------------------
-- 現在は無料プランの上限 2 枚/visit を DB 層で強制する。
-- 将来 profiles.plan 等を追加した場合は、この関数内で user_id ごとに
-- Plus などの上限へ分岐させる。
CREATE OR REPLACE FUNCTION public.visit_photo_limit_for_user(p_user_id UUID)
RETURNS INT
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- TODO: profiles.plan が導入されたら p_user_id を元に上限を返す。
  -- 例: free=2, plus=10
  RETURN 2;
END;
$$;

CREATE OR REPLACE FUNCTION public.check_visit_photo_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  photo_count INT;
  photo_limit INT;
  visit_owner UUID;
BEGIN
  -- 同一 visit への同時 INSERT を直列化して、3枚目の競合挿入を防ぐ。
  SELECT v.user_id
    INTO visit_owner
  FROM public.visits v
  WHERE v.id = NEW.visit_id
  FOR UPDATE;

  IF visit_owner IS NULL THEN
    RAISE EXCEPTION 'visit not found for photo';
  END IF;

  IF NEW.user_id <> visit_owner THEN
    RAISE EXCEPTION 'photo user_id must match visit owner';
  END IF;

  photo_limit := public.visit_photo_limit_for_user(NEW.user_id);

  SELECT COUNT(*)
    INTO photo_count
  FROM public.visit_photos vp
  WHERE vp.visit_id = NEW.visit_id;

  IF photo_count >= photo_limit THEN
    RAISE EXCEPTION 'photo limit reached for this visit';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_visit_photo_limit
  BEFORE INSERT ON public.visit_photos
  FOR EACH ROW EXECUTE FUNCTION public.check_visit_photo_limit();

-- ----------------------------------------------------------------
-- Storage RLS policies
-- ----------------------------------------------------------------
-- Path は {user_id}/{visit_id}/... 形式。Storage policy では先頭フォルダが
-- auth.uid() と一致する authenticated user のみ読み書き削除を許可する。
CREATE POLICY "visit-photos storage read own folder"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'visit-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "visit-photos storage insert own folder"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'visit-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "visit-photos storage update own folder"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'visit-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'visit-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "visit-photos storage delete own folder"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'visit-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- ----------------------------------------------------------------
-- RLS テスト手順（SQL Editor で手動確認）
-- ----------------------------------------------------------------
-- 1. Supabase Authentication で user_a / user_b の2ユーザーを用意する。
-- 2. 下記の <user_a_uuid> / <user_b_uuid> を実 UUID に置き換える。
-- 3. 管理者権限のまま、各ユーザーの visit を1件ずつ作成する。
--
-- INSERT INTO public.visits (
--   id, user_id, facility_slug, facility_name, visited_on,
--   date_precision, is_past_entry, family_revisit, parent_fatigue
-- )
-- VALUES
--   ('00000000-0000-0000-0000-0000000000a1', '<user_a_uuid>',
--    'rls-test-a', 'RLS Test A', CURRENT_DATE,
--    'exact', false, 'yes', 'normal'),
--   ('00000000-0000-0000-0000-0000000000b1', '<user_b_uuid>',
--    'rls-test-b', 'RLS Test B', CURRENT_DATE,
--    'exact', false, 'yes', 'normal');
--
-- 4. user_a として実行し、自分の visit への INSERT/SELECT が通ることを確認する。
--
-- BEGIN;
-- SET LOCAL ROLE authenticated;
-- SELECT set_config('request.jwt.claim.sub', '<user_a_uuid>', true);
-- SELECT set_config('request.jwt.claims', '{"sub":"<user_a_uuid>","role":"authenticated"}', true);
--
-- INSERT INTO public.visit_photos (
--   id, visit_id, user_id, storage_path, thumb_path, width, height, bytes, taken_on
-- )
-- VALUES
--   ('10000000-0000-0000-0000-000000000001',
--    '00000000-0000-0000-0000-0000000000a1',
--    '<user_a_uuid>',
--    '<user_a_uuid>/00000000-0000-0000-0000-0000000000a1/10000000-0000-0000-0000-000000000001.webp',
--    '<user_a_uuid>/00000000-0000-0000-0000-0000000000a1/10000000-0000-0000-0000-000000000001_thumb.webp',
--    1600, 1200, 100000, CURRENT_DATE);
--
-- SELECT COUNT(*) AS own_photo_count
-- FROM public.visit_photos
-- WHERE visit_id = '00000000-0000-0000-0000-0000000000a1';
-- ROLLBACK;
--
-- 5. user_a として user_b の visit_id に INSERT すると RLS で拒否されることを確認する。
--    失敗期待のため、上記とは別実行にする。
--
-- 6. 同じ visit_id へ2枚までは INSERT 可能、3枚目は
--    "photo limit reached for this visit" で拒否されることを確認する。
--
-- 7. Storage は user_a セッションで
--    <user_a_uuid>/<visit_id>/sample.webp への upload/select/remove が通り、
--    <user_b_uuid>/<visit_id>/sample.webp は 403/404 になることを確認する。
--
-- 8. 確認後、管理者権限でテスト visit を削除する。
--    visit 削除時、public.visit_photos は ON DELETE CASCADE で削除される。
--
-- DELETE FROM public.visits
-- WHERE id IN (
--   '00000000-0000-0000-0000-0000000000a1',
--   '00000000-0000-0000-0000-0000000000b1'
-- );
