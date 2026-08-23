-- 掲載イベントを起点にした体験記録の耐久性を保つsnapshot。
-- イベントCanonはDB外の静的データなので、event_idにはFKを設定しない。
ALTER TABLE public.visits
  ADD COLUMN event_id TEXT,
  ADD COLUMN event_title_snapshot TEXT,
  ADD COLUMN event_date_label_snapshot TEXT,
  ADD COLUMN event_venue_name_snapshot TEXT,
  ADD COLUMN event_prefecture_label_snapshot TEXT;

ALTER TABLE public.visits
  ADD CONSTRAINT visits_event_title_snapshot_check
  CHECK (event_id IS NULL OR event_title_snapshot IS NOT NULL);

COMMENT ON COLUMN public.visits.event_id IS
  '記録作成時点の掲載イベントID（DB外CanonのためFKなし）。';
COMMENT ON COLUMN public.visits.event_title_snapshot IS
  'イベント終了・削除後も表示するための記録作成時点のイベント名。';
COMMENT ON COLUMN public.visits.event_date_label_snapshot IS
  '記録作成時点のイベント開催日時表示。';
COMMENT ON COLUMN public.visits.event_venue_name_snapshot IS
  '記録作成時点のイベント会場表示名。';
COMMENT ON COLUMN public.visits.event_prefecture_label_snapshot IS
  '記録作成時点のイベント都道府県表示名。';
