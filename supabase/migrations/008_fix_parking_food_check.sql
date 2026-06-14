-- visits.parking / visits.food_rating の CHECK 制約を旧値・新値のスーパーセットへ置換する
ALTER TABLE public.visits DROP CONSTRAINT IF EXISTS visits_parking_check;
ALTER TABLE public.visits ADD CONSTRAINT visits_parking_check
  CHECK (parking IS NULL OR parking IN (
    'car_easy', 'car_normal', 'car_trouble', 'train', 'bus', 'walk_bike',
    'easy', 'normal', 'difficult', 'full', 'none', 'not_used'));

ALTER TABLE public.visits DROP CONSTRAINT IF EXISTS visits_food_rating_check;
ALTER TABLE public.visits ADD CONSTRAINT visits_food_rating_check
  CHECK (food_rating IS NULL OR food_rating IN (
    'no_meal', 'ate_inside', 'brought_food', 'ate_outside', 'had_trouble',
    'great', 'ok', 'poor', 'no_food'));
