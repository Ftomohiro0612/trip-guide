import type { MapFacility } from "@/components/MapView";
import type { Facility } from "@/types/facility";

export function toMapFacilities(
  facilities: readonly Facility[],
): MapFacility[] {
  return facilities.map((facility) => ({
    id: facility.id,
    slug: facility.slug,
    name: facility.name,
    image: facility.image,
    prefecture: facility.prefecture,
    prefecture_id: facility.prefecture_id,
    category: facility.category,
    category_id: facility.category_id,
    latitude: facility.latitude,
    longitude: facility.longitude,
    is_free: facility.is_free,
    rain_friendly: facility.rain_friendly,
    target_age: facility.target_age,
    things_to_do: facility.things_to_do,
  }));
}
