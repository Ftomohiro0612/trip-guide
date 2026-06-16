export type Coordinate = readonly [number, number];
export type NearbyTravelMinutes = 30 | 60 | 90;

const EARTH_RADIUS_KM = 6371;
const NEARBY_DISTANCE_CUTOFF_KM: Record<NearbyTravelMinutes, number> = {
  30: 10,
  60: 30,
  90: 45,
};

function toRadians(degrees: number) {
  return (degrees * Math.PI) / 180;
}

export function haversineDistanceKm(from: Coordinate, to: Coordinate) {
  const [fromLat, fromLng] = from;
  const [toLat, toLng] = to;
  const deltaLat = toRadians(toLat - fromLat);
  const deltaLng = toRadians(toLng - fromLng);
  const lat1 = toRadians(fromLat);
  const lat2 = toRadians(toLat);

  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c;
}

export function driveTimeEstimateLabel(distanceKm: number) {
  if (distanceKm <= 5) return "車で約10〜20分目安";
  if (distanceKm <= 10) return "車で約20〜35分目安";
  if (distanceKm <= 18) return "車で約30〜45分目安";
  if (distanceKm <= 30) return "車で約45分〜1時間目安";
  if (distanceKm <= 45) return "車で約1〜1.5時間目安";
  if (distanceKm <= 70) return "車で約1.5〜2時間目安";
  if (distanceKm <= 100) return "車で約2〜3時間目安";
  return "車で約3時間以上目安";
}

export function nearbyDistanceCutoffKm(minutes: NearbyTravelMinutes) {
  return NEARBY_DISTANCE_CUTOFF_KM[minutes];
}
