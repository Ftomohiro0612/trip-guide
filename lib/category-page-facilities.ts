import craftEvidenceJson from "@/data/craft_category_evidence.json";
import { prefectures, visibleFacilities } from "@/lib/facilities";
import {
  FACILITIES_PER_PAGE,
  paginateFacilities,
  type FacilityPage,
} from "@/lib/facility-pagination";
import type { Facility, PrefectureId } from "@/types/facility";

export const CRAFT_TYPE_OPTIONS = [
  { id: "art", label: "工作・アート" },
  { id: "pottery", label: "陶芸" },
  { id: "glass", label: "ガラス" },
  { id: "wood", label: "木工" },
  { id: "textile", label: "染め・織り" },
  { id: "paper-print", label: "紙・印刷" },
  { id: "accessories", label: "アクセサリー・小物" },
  { id: "traditional", label: "伝統工芸" },
] as const;

export type CraftTypeId = (typeof CRAFT_TYPE_OPTIONS)[number]["id"];
export type CraftTypeLabel = (typeof CRAFT_TYPE_OPTIONS)[number]["label"];

interface CraftEvidence {
  facility_id: number;
  status: "verified";
  offering: "ongoing" | "recurring";
  source_urls: string[];
  source_checked_at: string;
  decision_reason: string;
  craft_types: CraftTypeLabel[];
}

interface CategoryPageFacilitiesInput {
  categoryId: string;
  prefectureId?: string | null;
  craftTypeId?: string | null;
  page?: unknown;
  pageSize?: number;
}

export interface CategoryPageFacilityResult {
  categoryId: string;
  baseFacilities: Facility[];
  filteredFacilities: Facility[];
  orderedFacilities: Facility[];
  page: FacilityPage<Facility>;
  mapFacilities: Facility[];
  jsonLdFacilities: Facility[];
  selectedPrefectureId: PrefectureId | null;
  selectedCraftTypeId: CraftTypeId | null;
  prefectureCounts: Map<PrefectureId, number>;
  craftTypeCounts: Map<CraftTypeId, number>;
}

const craftEvidence = craftEvidenceJson.records as CraftEvidence[];
const evidenceByFacilityId = new Map(
  craftEvidence.map((evidence) => [evidence.facility_id, evidence]),
);
const craftTypeById = new Map(
  CRAFT_TYPE_OPTIONS.map((option) => [option.id, option.label]),
);
const craftTypeIdByLabel = new Map(
  CRAFT_TYPE_OPTIONS.map((option) => [option.label, option.id]),
);
const prefectureOrder = new Map(
  prefectures.map((prefecture, index) => [prefecture.id, index]),
);

export function getVerifiedCraftEvidence(
  facilityId: number,
): CraftEvidence | undefined {
  const evidence = evidenceByFacilityId.get(facilityId);
  if (
    evidence?.status !== "verified" ||
    !["ongoing", "recurring"].includes(evidence.offering)
  ) {
    return undefined;
  }
  return evidence;
}

export function getCraftTypesForFacility(
  facilityId: number,
): CraftTypeLabel[] {
  return getVerifiedCraftEvidence(facilityId)?.craft_types ?? [];
}

function resolvePrefectureId(value?: string | null): PrefectureId | null {
  return (
    prefectures.find((prefecture) => prefecture.id === value)?.id ?? null
  );
}

function resolveCraftTypeId(value?: string | null): CraftTypeId | null {
  return craftTypeById.has(value as CraftTypeId)
    ? (value as CraftTypeId)
    : null;
}

function ordinaryOrder(facilities: readonly Facility[]): Facility[] {
  return [...facilities].sort(
    (left, right) =>
      (prefectureOrder.get(left.prefecture_id) ?? Number.MAX_SAFE_INTEGER) -
        (prefectureOrder.get(right.prefecture_id) ?? Number.MAX_SAFE_INTEGER) ||
      left.id - right.id,
  );
}

export function orderCraftFacilitiesDiversely(
  facilities: readonly Facility[],
): Facility[] {
  const queues = CRAFT_TYPE_OPTIONS.map(({ label }) => ({
    label,
    facilities: facilities
      .filter(
        (facility) => getCraftTypesForFacility(facility.id)[0] === label,
      )
      .sort((left, right) => left.id - right.id),
  }));
  const ordered: Facility[] = [];
  let remaining = facilities.length;

  while (remaining > 0) {
    for (const queue of queues) {
      const facility = queue.facilities.shift();
      if (!facility) continue;
      ordered.push(facility);
      remaining -= 1;
    }
  }

  return ordered;
}

export function getFacilitiesForCategoryPage({
  categoryId,
  prefectureId,
  craftTypeId,
  page,
  pageSize = FACILITIES_PER_PAGE,
}: CategoryPageFacilitiesInput): CategoryPageFacilityResult {
  const selectedPrefectureId = resolvePrefectureId(prefectureId);
  const selectedCraftTypeId =
    categoryId === "craft" ? resolveCraftTypeId(craftTypeId) : null;
  const baseFacilities =
    categoryId === "craft"
      ? visibleFacilities.filter((facility) =>
          Boolean(getVerifiedCraftEvidence(facility.id)),
        )
      : visibleFacilities.filter(
          (facility) => facility.category_id === categoryId,
        );
  const craftTypeLabel = selectedCraftTypeId
    ? craftTypeById.get(selectedCraftTypeId)
    : null;
  const afterCraftType = craftTypeLabel
    ? baseFacilities.filter((facility) =>
        getCraftTypesForFacility(facility.id).includes(craftTypeLabel),
      )
    : baseFacilities;
  const filteredFacilities = selectedPrefectureId
    ? afterCraftType.filter(
        (facility) => facility.prefecture_id === selectedPrefectureId,
      )
    : afterCraftType;
  const shouldDiversify =
    categoryId === "craft" &&
    !selectedPrefectureId &&
    !selectedCraftTypeId;
  const orderedFacilities = shouldDiversify
    ? orderCraftFacilitiesDiversely(filteredFacilities)
    : ordinaryOrder(filteredFacilities);
  const facilityPage = paginateFacilities(orderedFacilities, page, pageSize);
  const prefectureCounts = new Map(
    prefectures.map((prefecture) => [
      prefecture.id,
      afterCraftType.filter(
        (facility) => facility.prefecture_id === prefecture.id,
      ).length,
    ]),
  );
  const facilitiesForTypeCounts = selectedPrefectureId
    ? baseFacilities.filter(
        (facility) => facility.prefecture_id === selectedPrefectureId,
      )
    : baseFacilities;
  const craftTypeCounts = new Map(
    CRAFT_TYPE_OPTIONS.map(({ id, label }) => [
      id,
      facilitiesForTypeCounts.filter((facility) =>
        getCraftTypesForFacility(facility.id).includes(label),
      ).length,
    ]),
  );

  return {
    categoryId,
    baseFacilities,
    filteredFacilities,
    orderedFacilities,
    page: facilityPage,
    mapFacilities: facilityPage.items,
    jsonLdFacilities: facilityPage.items,
    selectedPrefectureId,
    selectedCraftTypeId,
    prefectureCounts,
    craftTypeCounts,
  };
}

export function craftTypeIdForLabel(
  label: CraftTypeLabel,
): CraftTypeId {
  return craftTypeIdByLabel.get(label)!;
}
