-- ================================================================
-- メモリップ Phase 4 子どもプロフィール写真
-- Supabase ダッシュボード → SQL エディタ で実行してください
-- ================================================================

ALTER TABLE public.children
  ADD COLUMN IF NOT EXISTS avatar_url TEXT;

INSERT INTO storage.buckets (id, name, public)
VALUES ('child-avatars', 'child-avatars', false)
ON CONFLICT (id) DO UPDATE SET public = false;

CREATE POLICY "自分の子どもアバターを参照"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'child-avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "自分の子どもアバターを追加"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'child-avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "自分の子どもアバターを更新"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'child-avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  )
  WITH CHECK (
    bucket_id = 'child-avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "自分の子どもアバターを削除"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'child-avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
