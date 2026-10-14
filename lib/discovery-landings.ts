import type {
  Facility,
  PrefectureId,
  RecommendedForTag,
} from "@/types/facility";

export interface DecisionPick {
  facility: Facility;
  reason: string;
}

export interface MunicipalityGroup {
  municipality: string;
  facilities: Facility[];
}

export type DecisionLandingKind =
  | { type: "category" }
  | { type: "prefecture" }
  | { type: "theme"; slug: string; recommendedTag?: RecommendedForTag };

type PickRule = {
  matches: (facility: Facility) => boolean;
  reason: (facility: Facility) => string;
};

export function isDecisionPickEligible(facility: Facility): boolean {
  return (
    facility.data_quality_status !== "exclude_candidate" &&
    facility.closure_status === undefined &&
    facility.child_use_status !== "restricted" &&
    facility.child_use_status !== "not_allowed"
  );
}

export function selectDecisionPicks(
  facilities: readonly Facility[],
  kind: DecisionLandingKind,
  limit = 3,
): DecisionPick[] {
  const candidates = facilities
    .filter(isDecisionPickEligible)
    .slice()
    .sort((left, right) => left.id - right.id);
  const rules = getPickRules(kind);
  const selected: DecisionPick[] = [];
  const selectedIds = new Set<number>();

  for (const rule of rules) {
    const facility = candidates.find(
      (candidate) => !selectedIds.has(candidate.id) && rule.matches(candidate),
    );
    if (!facility) continue;
    selected.push({ facility, reason: rule.reason(facility) });
    selectedIds.add(facility.id);
    if (selected.length === limit) return selected;
  }

  for (const facility of candidates) {
    if (selectedIds.has(facility.id)) continue;
    selected.push({ facility, reason: getExistingExperienceReason(facility) });
    if (selected.length === limit) break;
  }
  return selected;
}

export function parseMunicipality(
  address: string,
  prefectureName: string,
): string | null {
  const normalized = address
    .normalize("NFKC")
    .replace(/^〒?\d{3}-?\d{4}\s*/u, "")
    .replace(/^(?:日本|Japan)[、,\s]*/iu, "")
    .replace(new RegExp(`^${escapeRegExp(prefectureName)}`), "")
    .trim();
  if (!normalized) return null;

  const city = normalized.match(/^(.+?市)/u)?.[1];
  if (city) return city;

  const ward = normalized.match(/^(.+?区)/u)?.[1];
  if (ward) return ward;

  const townOrVillage = normalized.match(
    /^(?:[^市区町村\s]+郡)?([^市区町村\s]+(?:町|村))/u,
  )?.[1];
  return townOrVillage ?? null;
}

export function groupFacilitiesByMunicipality(
  facilities: readonly Facility[],
  prefectureName: string,
): MunicipalityGroup[] {
  const grouped = new Map<string, Facility[]>();
  for (const facility of facilities) {
    const municipality = parseMunicipality(facility.address, prefectureName);
    if (!municipality) continue;
    const current = grouped.get(municipality) ?? [];
    current.push(facility);
    grouped.set(municipality, current);
  }

  return [...grouped.entries()]
    .map(([municipality, entries]) => ({
      municipality,
      facilities: entries.slice().sort((left, right) => left.id - right.id),
    }))
    .sort(
      (left, right) =>
        right.facilities.length - left.facilities.length ||
        left.municipality.localeCompare(right.municipality, "ja"),
    );
}

export function getMunicipalityParseCoverage(
  facilities: readonly Facility[],
  prefectureName: string,
): { parsed: number; total: number; percent: number } {
  const parsed = facilities.filter((facility) =>
    parseMunicipality(facility.address, prefectureName),
  ).length;
  return {
    parsed,
    total: facilities.length,
    percent: facilities.length === 0 ? 0 : (parsed / facilities.length) * 100,
  };
}

export function buildFacilitiesHref(params: Record<string, string>): string {
  const search = new URLSearchParams(params);
  return `/facilities?${search.toString()}`;
}

export function buildThemeMapHref(params: Record<string, string>): string {
  const search = new URLSearchParams({ scope: "facilities", ...params });
  return `/api/discovery-map?${search.toString()}`;
}

function getPickRules(kind: DecisionLandingKind): PickRule[] {
  if (kind.type === "prefecture") {
    return [
      rule((facility) => facility.rain_friendly === "◎", "雨でも快適"),
      rule(
        (facility) => facility.tags.includes("0-3歳OK"),
        "0〜3歳と行きやすい",
      ),
      rule((facility) => facility.is_free, "無料で遊べる"),
    ];
  }

  if (kind.type === "theme") {
    if (kind.slug === "rainy-day") {
      return [
        rule((facility) => facility.indoor_outdoor === "屋内", "屋内で雨を避けやすい"),
        rule((facility) => facility.tags.includes("0-3歳OK"), "雨の日も0〜3歳と行きやすい"),
        rule((facility) => facility.is_free, "雨の日も無料で遊べる"),
      ];
    }
    if (kind.slug === "free") {
      return [
        rule((facility) => facility.rain_friendly === "◎", "無料・雨でも快適"),
        rule((facility) => facility.tags.includes("0-3歳OK"), "無料・0〜3歳OK"),
        rule(() => true, "入場・利用無料"),
      ];
    }
    if (kind.slug === "kids-0-3") {
      return [
        rule((facility) => facility.rain_friendly === "◎", "0〜3歳OK・雨でも快適"),
        rule((facility) => facility.is_free, "0〜3歳OK・無料"),
        rule(() => true, "0〜3歳OK"),
      ];
    }
    if (kind.slug === "elementary") {
      return [
        rule((facility) => facility.rain_friendly === "◎", "小学生向け・雨でも快適"),
        rule((facility) => facility.is_free, "小学生向け・無料"),
        rule(() => true, "小学生向け"),
      ];
    }
    if (kind.slug === "water-play") {
      return [
        rule((facility) => facility.summer_water_play === "◎", "水遊び◎"),
        rule((facility) => facility.is_free, "水遊び候補・無料"),
        rule((facility) => facility.tags.includes("0-3歳OK"), "水遊び候補・0〜3歳OK"),
      ];
    }
    if (kind.slug === "playground") {
      return [
        rule((facility) => facility.is_free, "大型遊具・無料"),
        rule((facility) => facility.tags.includes("0-3歳OK"), "大型遊具・0〜3歳OK"),
        rule((facility) => facility.rain_friendly === "◎", "大型遊具・雨でも快適"),
      ];
    }
    if (kind.recommendedTag) {
      return [rule(() => true, "このテーマで選べる")];
    }
  }

  return [
    rule((facility) => facility.rain_friendly === "◎", "雨でも快適"),
    rule((facility) => facility.tags.includes("0-3歳OK"), "0〜3歳OK"),
    rule((facility) => facility.is_free, "無料で遊べる"),
    rule(
      (facility) => Boolean(facility.signature_experiences?.length),
      getExistingExperienceReason,
    ),
  ];
}

function rule(
  matches: PickRule["matches"],
  reason: string | PickRule["reason"],
): PickRule {
  return {
    matches,
    reason: typeof reason === "string" ? () => reason : reason,
  };
}

function getExistingExperienceReason(facility: Facility): string {
  const text =
    facility.signature_experiences?.find(Boolean) ??
    facility.things_to_do?.find(Boolean) ??
    `${facility.category}の候補`;
  return text.length <= 32 ? text : `${text.slice(0, 31).trimEnd()}…`;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}

export function buildPrefectureMunicipalityHref(
  prefectureId: PrefectureId,
  municipality: string,
): string {
  return buildFacilitiesHref({
    prefectures: prefectureId,
    q: municipality,
  });
}
