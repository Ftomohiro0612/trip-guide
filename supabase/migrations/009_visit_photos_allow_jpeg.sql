-- WebP非対応ブラウザのJPEGフォールバック保存を許可する。
-- Supabase SQL Editor でオーナーが手動適用する。

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'storage'
      AND table_name = 'buckets'
      AND column_name = 'allowed_mime_types'
  ) THEN
    EXECUTE 'UPDATE storage.buckets SET allowed_mime_types = ARRAY[''image/webp'', ''image/jpeg'']::text[] WHERE id = ''visit-photos''';
  END IF;
END $$;
