import type { Facility } from "@/types/facility";

export type MapFacility = Pick<
  Facility,
  | "id"
  | "slug"
  | "name"
  | "prefecture_id"
  | "category_id"
  | "latitude"
  | "longitude"
  | "closure_status"
> &
  Partial<
    Pick<
      Facility,
      | "image"
      | "is_free"
      | "rain_friendly"
      | "target_age"
      | "things_to_do"
    >
  >;

export function toMapFacilities(
  facilities: readonly Facility[],
): MapFacility[] {
  return facilities.map((facility) => ({
    id: facility.id,
    slug: facility.slug,
    name: facility.name,
    prefecture_id: facility.prefecture_id,
    category_id: facility.category_id,
    latitude: facility.latitude,
    longitude: facility.longitude,
    closure_status: facility.closure_status,
  }));
}
