"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import FacilityCard from "@/components/FacilityCard";
import {
  FacilityPaginationControls,
  FacilityPaginationSummary,
  type FacilityPageSummary,
} from "@/components/FacilityPagination";
import ResponsiveResultsMap from "@/components/ResponsiveResultsMap";
import {
  buildFacilityPageHref,
  paginateFacilities,
  resetFacilityPage,
} from "@/lib/facility-pagination";
import { getNearbyFacilities } from "@/lib/facility-nearby";
import { type Coordinate } from "@/lib/distance";
import type { Facility } from "@/types/facility";

interface Props {
  facilities: Facility[];
  page: FacilityPageSummary;
  nearbyDataHref: string;
}

type LocationStatus = "idle" | "locating" | "ready" | "error";

const NEARBY_FILTER_STORAGE_KEY = "facilities:nearbyFilter";
const CURRENT_LOCATION_STORAGE_KEY = "mapview:currentLocation";
const CURRENT_LOCATION_EVENT_NAME = "mapview:currentLocation";

type NearbyFilterSnapshot = {
  enabled: boolean;
  lat: number;
  lng: number;
};

function locationErrorMessage(error: GeolocationPositionError) {
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

function readPersistedNearbyFilter(): NearbyFilterSnapshot | null {
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

function persistNearbyFilter(snapshot: NearbyFilterSnapshot) {
  try {
    window.sessionStorage.setItem(
      NEARBY_FILTER_STORAGE_KEY,
      JSON.stringify(snapshot),
    );
  } catch {
    // The nearby filter still works for the current render.
  }
}

function clearPersistedNearbyFilter() {
  try {
    window.sessionStorage.removeItem(NEARBY_FILTER_STORAGE_KEY);
  } catch {
    // Ignore storage failures and fall back to in-memory state.
  }
}

function persistMapCurrentLocation(position: Coordinate) {
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

export default function NearbyFilterableFacilityList({
  facilities,
  page,
  nearbyDataHref,
}: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const nearbyRequested = searchParams.get("sort") === "nearby";
  const [currentLocation, setCurrentLocation] = useState<Coordinate | null>(
    null,
  );
  const [locationStateReady, setLocationStateReady] = useState(false);
  const [nearbyCandidateResult, setNearbyCandidateResult] = useState<{
    href: string;
    facilities: Facility[];
  } | null>(null);
  const [status, setStatus] = useState<LocationStatus>("idle");
  const [notice, setNotice] = useState<string | null>(null);
  const attemptedAutomaticLocation = useRef(false);
  const showingNearby = nearbyRequested && currentLocation !== null;
  const waitingForLocation = nearbyRequested && currentLocation === null;
  const nearbyCandidates =
    nearbyCandidateResult?.href === nearbyDataHref
      ? nearbyCandidateResult.facilities
      : null;
  const loadingCandidates = showingNearby && nearbyCandidates === null;

  useEffect(() => {
    const snapshot = readPersistedNearbyFilter();
    const timeout = window.setTimeout(() => {
      if (snapshot) {
        setCurrentLocation([snapshot.lat, snapshot.lng]);
        setStatus("ready");
      }
      setLocationStateReady(true);
    }, 0);

    return () => window.clearTimeout(timeout);
  }, []);

  useEffect(() => {
    if (!showingNearby || !currentLocation) return;
    persistNearbyFilter({
      enabled: true,
      lat: currentLocation[0],
      lng: currentLocation[1],
    });
  }, [currentLocation, showingNearby]);

  const navigateToNearbySort = useCallback(() => {
    const params = resetFacilityPage(new URLSearchParams(searchParams));
    params.set("sort", "nearby");
    router.push(buildFacilityPageHref(pathname, params, 1), {
      scroll: false,
    });
  }, [pathname, router, searchParams]);

  const navigateToDefaultSort = useCallback(() => {
    const params = resetFacilityPage(new URLSearchParams(searchParams));
    params.delete("sort");
    router.replace(buildFacilityPageHref(pathname, params, 1), {
      scroll: false,
    });
  }, [pathname, router, searchParams]);

  useEffect(() => {
    if (!showingNearby) return;

    const controller = new AbortController();

    async function loadCandidates() {
      try {
        const response = await fetch(nearbyDataHref, {
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("facility page data request failed");
        const payload = (await response.json()) as { facilities?: unknown };
        if (!Array.isArray(payload.facilities)) {
          throw new Error("facility page data response was invalid");
        }
        setNearbyCandidateResult({
          href: nearbyDataHref,
          facilities: payload.facilities as Facility[],
        });
      } catch (error) {
        if (controller.signal.aborted) return;
        console.error(error);
        setCurrentLocation(null);
        clearPersistedNearbyFilter();
        setStatus("error");
        setNotice(
          "近い順の候補を読み込めませんでした。通常の一覧を表示しています。",
        );
        navigateToDefaultSort();
      }
    }

    void loadCandidates();
    return () => controller.abort();
  }, [navigateToDefaultSort, nearbyDataHref, showingNearby]);

  const nearbyFacilities = useMemo(() => {
    if (!showingNearby || !currentLocation || !nearbyCandidates) return [];
    return getNearbyFacilities(nearbyCandidates, currentLocation);
  }, [
    currentLocation,
    nearbyCandidates,
    showingNearby,
  ]);

  const nearbyPage = useMemo(
    () => paginateFacilities(nearbyFacilities, searchParams.get("page")),
    [nearbyFacilities, searchParams],
  );
  const effectivePage = showingNearby ? nearbyPage : page;
  const displayedFacilities = showingNearby
    ? nearbyPage.items.map((item) => item.facility)
    : facilities;
  const proximityLabels = new Map(
    nearbyPage.items.map((item) => [
      item.facility.id,
      item.proximityLabel,
    ]),
  );

  const requestCurrentLocation = useCallback(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setCurrentLocation(null);
      clearPersistedNearbyFilter();
      setStatus("error");
      setNotice(
        "近い順には現在地が必要です。このブラウザでは位置情報を取得できないため、通常の一覧を表示しています。",
      );
      navigateToDefaultSort();
      return;
    }

    setStatus("locating");
    setNotice(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const nextLocation: Coordinate = [
          position.coords.latitude,
          position.coords.longitude,
        ];
        setCurrentLocation(nextLocation);
        persistNearbyFilter({
          enabled: true,
          lat: nextLocation[0],
          lng: nextLocation[1],
        });
        persistMapCurrentLocation(nextLocation);
        setStatus("ready");
        setNotice(null);
        navigateToNearbySort();
      },
      (error) => {
        setCurrentLocation(null);
        clearPersistedNearbyFilter();
        setStatus("error");
        setNotice(
          `近い順には現在地が必要です。${locationErrorMessage(error)}`,
        );
        navigateToDefaultSort();
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 },
    );
  }, [navigateToDefaultSort, navigateToNearbySort]);

  useEffect(() => {
    if (!nearbyRequested) {
      attemptedAutomaticLocation.current = false;
      return;
    }
    if (
      !locationStateReady ||
      currentLocation ||
      status !== "idle" ||
      attemptedAutomaticLocation.current
    ) {
      return;
    }

    attemptedAutomaticLocation.current = true;
    requestCurrentLocation();
  }, [
    currentLocation,
    locationStateReady,
    nearbyRequested,
    requestCurrentLocation,
    status,
  ]);

  function clearNearbyFilter() {
    setCurrentLocation(null);
    setNearbyCandidateResult(null);
    clearPersistedNearbyFilter();
    setStatus("idle");
    setNotice(null);
    navigateToDefaultSort();
  }

  return (
    <section aria-labelledby="facility-results-heading">
      <div className="mb-4">
        <h2
          id="facility-results-heading"
          tabIndex={-1}
          className="mb-2 scroll-mt-24 text-xl font-bold text-slate-900 outline-none"
        >
          施設一覧
        </h2>
        {!waitingForLocation && (
          <FacilityPaginationSummary page={effectivePage} />
        )}
      </div>

      <section
        aria-label="現在地から近い順の並び替え"
        className="mb-4 rounded-xl border border-sky-100 bg-sky-50/70 px-3 py-3 sm:px-4"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={requestCurrentLocation}
              disabled={status === "locating"}
              aria-pressed={showingNearby}
              className="rounded-full bg-blue-600 px-3 py-2 text-sm font-bold text-white shadow-sm transition-colors hover:bg-blue-700 disabled:cursor-wait disabled:opacity-60"
            >
              {status === "locating"
                ? "📍 現在地を取得中..."
                : showingNearby
                  ? "✓ 現在地から近い順"
                  : "📍現在地から近い順に並べる"}
            </button>
            {showingNearby && (
              <button
                type="button"
                onClick={clearNearbyFilter}
                className="rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50"
              >
                近い順を解除
              </button>
            )}
          </div>
        </div>

        {showingNearby ? (
          <div className="mt-3 text-sm text-slate-700">
            <p className="font-bold text-slate-900">
              ✓ 現在地から近い順:{" "}
              {loadingCandidates ? "全施設を並び替え中…" : `全${nearbyFacilities.length}件`}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              現在の絞り込み条件に一致する全施設を直線距離で並べ、その後24件ずつ表示しています。所要時間は概算です。
            </p>
          </div>
        ) : (
          <p className="mt-3 text-xs text-slate-500">
            現在地はサーバーに送信せず、アカウントにも保存せず、URLにも表示しません。このタブ内で一時的に利用し、タブを閉じると消えます。
          </p>
        )}

        {notice && (
          <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
            {notice}
          </p>
        )}
      </section>

      {!waitingForLocation &&
        !loadingCandidates &&
        displayedFacilities.length > 0 && (
          <ResponsiveResultsMap
            facilities={displayedFacilities}
            totalItems={effectivePage.totalItems}
          />
        )}

      {waitingForLocation ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 py-12 text-center">
          <p className="font-bold text-amber-900">
            近い順で並べるため、現在地を取得しています…
          </p>
          <p className="mt-2 text-sm text-amber-800">
            位置情報の利用を許可してください。取得できない場合は通常の並び順に戻ります。
          </p>
        </div>
      ) : loadingCandidates && showingNearby ? (
        <div className="rounded-2xl border border-slate-200 bg-white py-16 text-center">
          <p className="font-medium text-slate-700">全施設を近い順に並び替えています…</p>
        </div>
      ) : displayedFacilities.length > 0 ? (
        <div
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
          data-facility-card-grid
        >
          {displayedFacilities.map((facility) => (
            <FacilityCard
              key={facility.id}
              facility={facility}
              proximityLabel={proximityLabels.get(facility.id)}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white py-16 text-center">
          <p className="text-4xl mb-2" aria-hidden>
            😢
          </p>
          <p className="font-medium text-slate-700">
            条件に合う施設が見つかりませんでした
          </p>
          <p className="mt-1 text-sm text-slate-500">
            条件を絞り込みすぎていないか、ご確認ください。
          </p>
        </div>
      )}

      {!waitingForLocation && !loadingCandidates && (
        <FacilityPaginationControls page={effectivePage} />
      )}
    </section>
  );
}
