import facilitiesJson from "@/data/facilities_data.json";
import type {
  CategoryMeta,
  Facility,
  FacilitiesData,
  PrefectureId,
  PrefectureMeta,
} from "@/types/facility";

const data = facilitiesJson as unknown as FacilitiesData;

export const facilities: Facility[] = data.facilities;
export const metadata = data.metadata;
export const prefectures: PrefectureMeta[] = data.metadata.prefectures;
export const categories: CategoryMeta[] = data.metadata.categories;

export function getFacilityBySlug(slug: string): Facility | undefined {
  return facilities.find((f) => f.slug === slug);
}

export function getAllSlugs(): string[] {
  return facilities.map((f) => f.slug);
}

export function getFacilitiesByPrefecture(prefId: PrefectureId): Facility[] {
  return facilities.filter((f) => f.prefecture_id === prefId);
}

export function getFacilitiesByCategory(categoryId: string): Facility[] {
  return facilities.filter((f) => f.category_id === categoryId);
}

export function getRelatedFacilities(facility: Facility, limit = 3): Facility[] {
  return facilities
    .filter(
      (f) =>
        f.id !== facility.id &&
        (f.category_id === facility.category_id ||
          f.prefecture_id === facility.prefecture_id),
    )
    .sort((a, b) => {
      const aSameCat = a.category_id === facility.category_id ? 1 : 0;
      const bSameCat = b.category_id === facility.category_id ? 1 : 0;
      const aSamePref = a.prefecture_id === facility.prefecture_id ? 1 : 0;
      const bSamePref = b.prefecture_id === facility.prefecture_id ? 1 : 0;
      return bSameCat * 2 + bSamePref - (aSameCat * 2 + aSamePref);
    })
    .slice(0, limit);
}

export function getPrefectureMeta(id: PrefectureId): PrefectureMeta | undefined {
  return prefectures.find((p) => p.id === id);
}

export function getCategoryMeta(id: string): CategoryMeta | undefined {
  return categories.find((c) => c.id === id);
}
