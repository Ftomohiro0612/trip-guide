-- 写真から作成した private / manual place の地図表示用座標。
-- 生EXIFや写真メタデータは保存せず、記録に必要な緯度経度だけを保持する。
ALTER TABLE public.visits
  ADD COLUMN place_latitude DOUBLE PRECISION,
  ADD COLUMN place_longitude DOUBLE PRECISION;

ALTER TABLE public.visits
  ADD CONSTRAINT visits_place_coordinates_pair_check
  CHECK (
    (place_latitude IS NULL AND place_longitude IS NULL)
    OR
    (
      place_latitude IS NOT NULL
      AND place_longitude IS NOT NULL
      AND place_latitude BETWEEN -90 AND 90
      AND place_longitude BETWEEN -180 AND 180
    )
  );

COMMENT ON COLUMN public.visits.place_latitude IS
  '写真から作成した private/manual place の地図表示用緯度。生EXIFは保存しない。';
COMMENT ON COLUMN public.visits.place_longitude IS
  '写真から作成した private/manual place の地図表示用経度。生EXIFは保存しない。';
