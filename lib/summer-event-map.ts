export interface SummerMapLocatable {
  eventId: string;
  latitude: number;
  longitude: number;
}

export type SummerMapDisplayed<T extends SummerMapLocatable> = T & {
  displayLatitude: number;
  displayLongitude: number;
};

export function spreadNearbySummerEventMarkers<T extends SummerMapLocatable>(
  points: readonly T[],
  nearbyMeters = 85,
): SummerMapDisplayed<T>[] {
  const pending = [...points].sort((a, b) => a.eventId.localeCompare(b.eventId));
  const groups: T[][] = [];

  while (pending.length > 0) {
    const seed = pending.shift();
    if (!seed) break;

    const group = [seed];
    for (let index = pending.length - 1; index >= 0; index -= 1) {
      if (
        group.some(
          (candidate) => distanceMeters(candidate, pending[index]) <= nearbyMeters,
        )
      ) {
        group.push(pending[index]);
        pending.splice(index, 1);
      }
    }
    groups.push(group.sort((a, b) => a.eventId.localeCompare(b.eventId)));
  }

  return groups.flatMap((group) => {
    if (group.length === 1) {
      const point = group[0];
      return [
        {
          ...point,
          displayLatitude: point.latitude,
          displayLongitude: point.longitude,
        },
      ];
    }

    const radius = 0.00045;
    return group.map((point, index) => {
      const angle = (index / group.length) * Math.PI * 2;
      return {
        ...point,
        displayLatitude: point.latitude + Math.sin(angle) * radius,
        displayLongitude: point.longitude + Math.cos(angle) * radius,
      };
    });
  });
}

function distanceMeters(
  a: Pick<SummerMapLocatable, "latitude" | "longitude">,
  b: Pick<SummerMapLocatable, "latitude" | "longitude">,
): number {
  const earthRadiusMeters = 6_371_000;
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const latitudeDelta = toRadians(b.latitude - a.latitude);
  const longitudeDelta = toRadians(b.longitude - a.longitude);
  const latitudeA = toRadians(a.latitude);
  const latitudeB = toRadians(b.latitude);
  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(latitudeA) *
      Math.cos(latitudeB) *
      Math.sin(longitudeDelta / 2) ** 2;

  return 2 * earthRadiusMeters * Math.asin(Math.sqrt(haversine));
}
