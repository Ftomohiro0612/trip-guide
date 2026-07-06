import facilitiesJson from "../data/facilities_data.json";
import type { FacilitiesData, PrefectureId } from "@/types/facility";

const data = facilitiesJson as unknown as FacilitiesData;

export const PILOT_PREFS = [
  "tokyo",
  "kanagawa",
  "saitama",
  "chiba",
] as const;
export const PILOT_CATS = ["park", "museum", "indoor-play"] as const;
export const CROSS_MIN = 8;

export type PilotCrossParam = {
  id: (typeof PILOT_PREFS)[number];
  categoryId: (typeof PILOT_CATS)[number];
};

const visibleFacilities = data.facilities.filter(
  (f) => f.data_quality_status !== "exclude_candidate",
);

function isPilotPref(prefId: string): prefId is (typeof PILOT_PREFS)[number] {
  return PILOT_PREFS.includes(prefId as (typeof PILOT_PREFS)[number]);
}

function isPilotCat(catId: string): catId is (typeof PILOT_CATS)[number] {
  return PILOT_CATS.includes(catId as (typeof PILOT_CATS)[number]);
}

export function isPilotCross(prefId: string, catId: string): boolean {
  if (!isPilotPref(prefId) || !isPilotCat(catId)) return false;

  const count = visibleFacilities.filter(
    (f) =>
      f.prefecture_id === (prefId as PrefectureId) && f.category_id === catId,
  ).length;

  return count >= CROSS_MIN;
}

export function getPilotCrossParams(): PilotCrossParam[] {
  return PILOT_PREFS.flatMap((id) =>
    PILOT_CATS.filter((categoryId) => isPilotCross(id, categoryId)).map(
      (categoryId) => ({ id, categoryId }),
    ),
  );
}
