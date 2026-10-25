import { facilitiesData as facilitiesJson } from "@memorip/runtime-canon";
import { createFacilityNextStopSelector } from "@/lib/facility-next-stops.mjs";
import {
  createFacilityPageLinkSelector,
  createRelatedFacilitySelector,
} from "@/lib/related-facilities.mjs";
import type {
  CategoryMeta,
  Facility,
  FacilitiesData,
  PrefectureId,
  PrefectureMeta,
} from "@/types/facility";

const data = facilitiesJson as unknown as FacilitiesData;

export const facilities: Facility[] = data.facilities;
export const visibleFacilities: Facility[] = facilities.filter(
  (f) => f.data_quality_status !== "exclude_candidate",
);
export const discoverableFacilities: Facility[] = visibleFacilities.filter(
  (f) => f.closure_status !== "permanently_closed",
);
export const metadata = data.metadata;
export const prefectures: PrefectureMeta[] = data.metadata.prefectures;
export const categories: CategoryMeta[] = data.metadata.categories;
const selectRelatedFacilities = createRelatedFacilitySelector(discoverableFacilities);
const selectFacilityPageLinks = createFacilityPageLinkSelector(visibleFacilities);
const selectFacilityNextStops = createFacilityNextStopSelector(
  discoverableFacilities,
);

export type FacilityNextStop = {
  facility: Facility;
  distanceKm: number;
  ranking: {
    distanceBand: number;
    ageFit: number;
    familyValue: number;
    complementaryCategory: boolean;
  };
  reasons: string[];
};

export type FacilityNextStops = {
  radiusKm: number;
  candidates: FacilityNextStop[];
};

export function isFacilityVisible(
  facility: Facility | undefined,
): facility is Facility {
  return (
    facility !== undefined &&
    facility.data_quality_status !== "exclude_candidate"
  );
}

export function isVisibleFacilitySlug(slug: string): boolean {
  return isFacilityVisible(getFacilityBySlug(slug));
}

export function isFacilityDiscoverable(
  facility: Facility | undefined,
): facility is Facility {
  return isFacilityVisible(facility) && facility.closure_status !== "permanently_closed";
}

let facilitiesBySlug: Map<string, Facility> | undefined;
export function getFacilityBySlug(slug: string): Facility | undefined {
  facilitiesBySlug ??= new Map(facilities.map((f) => [f.slug, f]));
  return facilitiesBySlug.get(slug);
}

export function getAllSlugs(): string[] {
  return visibleFacilities.map((f) => f.slug);
}

export function getFacilitiesByPrefecture(prefId: PrefectureId): Facility[] {
  return discoverableFacilities.filter((f) => f.prefecture_id === prefId);
}

export function getFacilitiesByCategory(categoryId: string): Facility[] {
  return discoverableFacilities.filter((f) => f.category_id === categoryId);
}

export function getRelatedFacilities(facility: Facility, limit = 3): Facility[] {
  return selectRelatedFacilities(facility, limit) as Facility[];
}

export function getFacilityPageLinks(
  facility: Facility,
  limit = 3,
): Facility[] {
  return selectFacilityPageLinks(facility, limit) as Facility[];
}

export function getFacilityNextStops(
  facility: Facility,
  limit = 4,
): FacilityNextStops {
  return selectFacilityNextStops(facility, limit) as FacilityNextStops;
}

export function getPrefectureMeta(id: PrefectureId): PrefectureMeta | undefined {
  return prefectures.find((p) => p.id === id);
}

export function getCategoryMeta(id: string): CategoryMeta | undefined {
  return categories.find((c) => c.id === id);
}
