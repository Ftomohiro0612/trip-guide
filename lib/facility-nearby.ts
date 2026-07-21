import {
  driveTimeEstimateLabel,
  haversineDistanceKm,
  nearbyDistanceCutoffKm,
  type Coordinate,
  type NearbyTravelMinutes,
} from "@/lib/distance";
import type { Facility } from "@/types/facility";

export type NearbyFacilityResult = {
  facility: Facility & { latitude: number; longitude: number };
  distanceKm: number;
  proximityLabel: string;
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
  rangeMinutes: NearbyTravelMinutes,
): NearbyFacilityResult[] {
  const cutoffKm = nearbyDistanceCutoffKm(rangeMinutes);
  return facilities
    .filter(hasCoords)
    .map((facility) => {
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
    .filter((item) => item.distanceKm <= cutoffKm)
    .sort(
      (a, b) =>
        a.distanceKm - b.distanceKm || a.facility.id - b.facility.id,
    );
}
