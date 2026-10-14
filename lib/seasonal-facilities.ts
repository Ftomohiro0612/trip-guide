import type { Facility } from "@/types/facility";

export interface SeasonalFacilityPick {
  facility: Facility;
  reason: string;
}

const SEASON_MONTHS = {
  春: [3, 4, 5],
  夏: [6, 7, 8],
  秋: [9, 10, 11],
  冬: [12, 1, 2],
} as const;

export function selectSeasonalFacilities(
  facilities: readonly Facility[],
  accessDate: string,
  limit = 3,
  diversity: "both" | "prefecture" | "category" | "none" = "both",
): SeasonalFacilityPick[] {
  const month = Number(accessDate.slice(5, 7));
  if (!Number.isInteger(month) || month < 1 || month > 12) return [];
  const prefectures = new Set<string>();
  const categories = new Set<string>();

  return facilities
    .map((facility) => ({
      facility,
      reason: getSeasonalFacilityReason(facility, month),
    }))
    .filter((pick): pick is SeasonalFacilityPick => Boolean(pick.reason))
    .sort((a, b) => a.facility.id - b.facility.id)
    .filter(({ facility }) => {
      if (diversity === "both" && (
        prefectures.has(facility.prefecture_id) ||
        categories.has(facility.category_id)
      )) return false;
      if (diversity === "prefecture" && prefectures.has(facility.prefecture_id)) return false;
      if (diversity === "category" && categories.has(facility.category_id)) return false;
      prefectures.add(facility.prefecture_id);
      categories.add(facility.category_id);
      return true;
    })
    .slice(0, limit);
}

export function selectSeasonalCandidateFacilities(
  facilities: readonly Facility[],
  limit = 3,
  diversity: "both" | "prefecture" | "category" | "none" = "both",
): Facility[] {
  const candidates = new Map<number, Facility>();
  for (let month = 1; month <= 12; month += 1) {
    const accessDate = `2000-${String(month).padStart(2, "0")}-15`;
    for (const pick of selectSeasonalFacilities(
      facilities,
      accessDate,
      limit,
      diversity,
    )) {
      candidates.set(pick.facility.id, pick.facility);
    }
  }
  return [...candidates.values()].sort((left, right) => left.id - right.id);
}

export function getSeasonalFacilityReason(
  facility: Facility,
  month: number,
): string | null {
  const sources = [
    ...(facility.signature_experiences ?? []),
    ...(facility.things_to_do ?? []),
    facility.description,
  ].filter(Boolean);

  for (const source of sources) {
    if (textStatesMonth(source, month)) return extractReason(source, month);
  }
  return null;
}

function textStatesMonth(source: string, month: number): boolean {
  for (const match of source.matchAll(
    /([1-9]|1[0-2])\s*月?\s*(?:〜|～|－|-)\s*([1-9]|1[0-2])\s*月/gu,
  )) {
    if (monthIsInRange(month, Number(match[1]), Number(match[2]))) return true;
  }
  for (const match of source.matchAll(/([1-9]|1[0-2])\s*月(?:には|に|限定)/gu)) {
    if (Number(match[1]) === month) return true;
  }
  for (const [season, months] of Object.entries(SEASON_MONTHS)) {
    if (source.includes(season) && (months as readonly number[]).includes(month)) {
      return true;
    }
  }
  return false;
}

function extractReason(source: string, month: number): string {
  const sentences = source
    .split(/[。\n]/u)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
  const sentence =
    sentences.find((candidate) => textStatesMonth(candidate, month)) ?? source;
  const normalized = sentence.replace(
    /([0-9]\s*月?)\s*[-－]\s*([0-9])/gu,
    "$1〜$2",
  );
  return normalized.length <= 54
    ? normalized
    : `${normalized.slice(0, 53).trimEnd()}…`;
}

function monthIsInRange(month: number, start: number, end: number): boolean {
  return start <= end
    ? month >= start && month <= end
    : month >= start || month <= end;
}
