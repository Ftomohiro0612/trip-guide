import type { Coordinate } from "@/lib/distance";

export type LocationStatus = "idle" | "locating" | "ready" | "error";

export const NEARBY_FILTER_STORAGE_KEY = "facilities:nearbyFilter";
export const CURRENT_LOCATION_STORAGE_KEY = "mapview:currentLocation";
export const CURRENT_LOCATION_EVENT_NAME = "mapview:currentLocation";

export type NearbyFilterSnapshot = {
  enabled: boolean;
  lat: number;
  lng: number;
};

export function locationErrorMessage(error: GeolocationPositionError) {
  if (error.code === 1) {
    return "位置情報の利用が許可されませんでした。通常の一覧を表示しています。ブラウザ設定から許可すると利用できます。";
  }
  if (error.code === 2) {
    return "端末またはブラウザの位置情報がオフのため取得できませんでした。通常の一覧を表示しています。";
  }
  if (error.code === 3) {
    return "現在地の取得がタイムアウトしました。通常の一覧を表示しています。";
  }
  return "現在地を取得できませんでした。通常の一覧を表示しています。";
}

function isValidCoordinate(lat: unknown, lng: unknown): boolean {
  return (
    typeof lat === "number" &&
    typeof lng === "number" &&
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}

export function readPersistedNearbyFilter(): NearbyFilterSnapshot | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.sessionStorage.getItem(NEARBY_FILTER_STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<NearbyFilterSnapshot>;
    const { enabled, lat, lng } = parsed;
    if (
      enabled !== true ||
      !isValidCoordinate(lat, lng) ||
      typeof lat !== "number" ||
      typeof lng !== "number"
    ) {
      return null;
    }

    return { enabled: true, lat, lng };
  } catch {
    return null;
  }
}

export function persistNearbyFilter(snapshot: NearbyFilterSnapshot) {
  try {
    window.sessionStorage.setItem(
      NEARBY_FILTER_STORAGE_KEY,
      JSON.stringify(snapshot),
    );
  } catch {
    // The nearby filter still works for the current render.
  }
}

export function clearPersistedNearbyFilter() {
  try {
    window.sessionStorage.removeItem(NEARBY_FILTER_STORAGE_KEY);
  } catch {
    // Ignore storage failures and fall back to in-memory state.
  }
}

export function persistMapCurrentLocation(position: Coordinate) {
  try {
    window.sessionStorage.setItem(
      CURRENT_LOCATION_STORAGE_KEY,
      JSON.stringify(position),
    );
  } catch {
    // The map can still update through the in-page event below.
  }

  window.dispatchEvent(
    new CustomEvent(CURRENT_LOCATION_EVENT_NAME, { detail: position }),
  );
}
