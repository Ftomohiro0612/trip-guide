-- visits に公開状態(status)を追加。既存レコードはすべて published 扱いで移行。
ALTER TABLE public.visits
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'published'
    CHECK (status IN ('draft','published'));

CREATE INDEX IF NOT EXISTS idx_visits_user_status
  ON public.visits(user_id, status);
