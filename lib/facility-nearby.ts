import {
  driveTimeEstimateLabel,
  haversineDistanceKm,
  type Coordinate,
} from "@/lib/distance";
import type { Facility } from "@/types/facility";

export type NearbyFacilityResult = {
  facility: Facility;
  distanceKm: number;
  proximityLabel?: string;
};

function hasCoords(
  facility: Facility,
): facility is Facility & { latitude: number; longitude: number } {
  return (
    typeof facility.latitude === "number" &&
    typeof facility.longitude === "number" &&
    Number.isFinite(facility.latitude) &&
    Number.isFinite(facility.longitude)
  );
}

export function getNearbyFacilities(
  facilities: readonly Facility[],
  currentLocation: Coordinate,
): NearbyFacilityResult[] {
  return facilities
    .map((facility) => {
      if (!hasCoords(facility)) {
        return {
          facility,
          distanceKm: Number.POSITIVE_INFINITY,
          proximityLabel: undefined,
        };
      }
      const distanceKm = haversineDistanceKm(currentLocation, [
        facility.latitude,
        facility.longitude,
      ]);
      return {
        facility,
        distanceKm,
        proximityLabel: driveTimeEstimateLabel(distanceKm),
      };
    })
    .sort(
      (a, b) =>
        a.distanceKm - b.distanceKm || a.facility.id - b.facility.id,
    );
}
