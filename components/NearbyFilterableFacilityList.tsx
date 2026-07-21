"use client";

import { useEffect, useMemo, useState } from "react";
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
import {
  type Coordinate,
  type NearbyTravelMinutes,
} from "@/lib/distance";
import type { Facility } from "@/types/facility";

interface Props {
  facilities: Facility[];
  page: FacilityPageSummary;
  nearbyDataHref: string;
}

type LocationStatus = "idle" | "locating" | "ready" | "error";

const RANGE_OPTIONS: NearbyTravelMinutes[] = [30, 60, 90];
const NEARBY_FILTER_STORAGE_KEY = "facilities:nearbyFilter";
const CURRENT_LOCATION_STORAGE_KEY = "mapview:currentLocation";
const CURRENT_LOCATION_EVENT_NAME = "mapview:currentLocation";

type NearbyFilterSnapshot = {
  enabled: boolean;
  minutes: NearbyTravelMinutes;
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

function isNearbyTravelMinutes(value: unknown): value is NearbyTravelMinutes {
  return (
    typeof value === "number" &&
    RANGE_OPTIONS.includes(value as NearbyTravelMinutes)
  );
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
    const { enabled, minutes, lat, lng } = parsed;
    if (
      enabled !== true ||
      !isNearbyTravelMinutes(minutes) ||
      !isValidCoordinate(lat, lng) ||
      typeof lat !== "number" ||
      typeof lng !== "number"
    ) {
      return null;
    }

    return { enabled: true, minutes, lat, lng };
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
  const [nearbyEnabled, setNearbyEnabled] = useState(false);
  const [rangeMinutes, setRangeMinutes] =
    useState<NearbyTravelMinutes>(60);
  const [currentLocation, setCurrentLocation] = useState<Coordinate | null>(
    null,
  );
  const [nearbyCandidateResult, setNearbyCandidateResult] = useState<{
    href: string;
    facilities: Facility[];
  } | null>(null);
  const [status, setStatus] = useState<LocationStatus>("idle");
  const [notice, setNotice] = useState<string | null>(null);
  const showingNearby = nearbyEnabled && currentLocation !== null;
  const nearbyCandidates =
    nearbyCandidateResult?.href === nearbyDataHref
      ? nearbyCandidateResult.facilities
      : null;
  const loadingCandidates = showingNearby && nearbyCandidates === null;

  useEffect(() => {
    const snapshot = readPersistedNearbyFilter();
    if (!snapshot) return;

    const timeout = window.setTimeout(() => {
      setRangeMinutes(snapshot.minutes);
      setCurrentLocation([snapshot.lat, snapshot.lng]);
      setNearbyEnabled(true);
      setStatus("ready");
    }, 0);

    return () => window.clearTimeout(timeout);
  }, []);

  useEffect(() => {
    if (!showingNearby || !currentLocation) return;
    persistNearbyFilter({
      enabled: true,
      minutes: rangeMinutes,
      lat: currentLocation[0],
      lng: currentLocation[1],
    });
  }, [currentLocation, rangeMinutes, showingNearby]);

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
        setNearbyEnabled(false);
        setCurrentLocation(null);
        clearPersistedNearbyFilter();
        setStatus("error");
        setNotice(
          "近い順の候補を読み込めませんでした。通常の一覧を表示しています。",
        );
      }
    }

    void loadCandidates();
    return () => controller.abort();
  }, [nearbyDataHref, showingNearby]);

  const nearbyFacilities = useMemo(() => {
    if (!showingNearby || !currentLocation || !nearbyCandidates) return [];
    return getNearbyFacilities(
      nearbyCandidates,
      currentLocation,
      rangeMinutes,
    );
  }, [
    currentLocation,
    nearbyCandidates,
    rangeMinutes,
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

  function navigateToFirstPage() {
    const params = resetFacilityPage(new URLSearchParams(searchParams));
    router.push(buildFacilityPageHref(pathname, params, 1), {
      scroll: false,
    });
  }

  function updateRangeMinutes(minutes: NearbyTravelMinutes) {
    if (minutes === rangeMinutes) return;
    setRangeMinutes(minutes);
    if (showingNearby) navigateToFirstPage();
  }

  function requestCurrentLocation() {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setNearbyEnabled(false);
      setCurrentLocation(null);
      clearPersistedNearbyFilter();
      setStatus("error");
      setNotice(
        "このブラウザでは位置情報を取得できません。通常の一覧を表示しています。",
      );
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
        setNearbyEnabled(true);
        persistNearbyFilter({
          enabled: true,
          minutes: rangeMinutes,
          lat: nextLocation[0],
          lng: nextLocation[1],
        });
        persistMapCurrentLocation(nextLocation);
        setStatus("ready");
        setNotice(null);
        navigateToFirstPage();
      },
      (error) => {
        setNearbyEnabled(false);
        setCurrentLocation(null);
        clearPersistedNearbyFilter();
        setStatus("error");
        setNotice(locationErrorMessage(error));
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 },
    );
  }

  function clearNearbyFilter() {
    setNearbyEnabled(false);
    setCurrentLocation(null);
    setNearbyCandidateResult(null);
    clearPersistedNearbyFilter();
    setStatus("idle");
    setNotice(null);
    navigateToFirstPage();
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
        <FacilityPaginationSummary page={effectivePage} />
      </div>

      <section
        aria-label="現在地から近い施設の絞り込み"
        className="mb-4 rounded-xl border border-sky-100 bg-sky-50/70 px-3 py-3 sm:px-4"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={requestCurrentLocation}
              disabled={status === "locating"}
              className="rounded-full bg-blue-600 px-3 py-2 text-sm font-bold text-white shadow-sm transition-colors hover:bg-blue-700 disabled:cursor-wait disabled:opacity-60"
            >
              {status === "locating"
                ? "📍 現在地を取得中..."
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

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500">時間</span>
            <div className="flex rounded-full border border-slate-200 bg-white p-1">
              {RANGE_OPTIONS.map((minutes) => {
                const selected = rangeMinutes === minutes;
                return (
                  <button
                    key={minutes}
                    type="button"
                    onClick={() => updateRangeMinutes(minutes)}
                    className={
                      "min-w-14 rounded-full px-2.5 py-1.5 text-xs font-bold transition-colors " +
                      (selected
                        ? "bg-blue-600 text-white"
                        : "text-slate-600 hover:bg-slate-100")
                    }
                    aria-pressed={selected}
                  >
                    {minutes}分
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {showingNearby ? (
          <div className="mt-3 text-sm text-slate-700">
            <p className="font-bold text-slate-900">
              📍現在地から約{rangeMinutes}分以内（目安）:{" "}
              {loadingCandidates ? "候補を確認中…" : nearbyFacilities.length + "件"}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              車での所要時間は直線距離からの概算です。経路APIによる実際の移動時間ではありません。
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

      {!loadingCandidates && displayedFacilities.length > 0 && (
        <ResponsiveResultsMap facilities={displayedFacilities} />
      )}

      {loadingCandidates && showingNearby ? (
        <div className="rounded-2xl border border-slate-200 bg-white py-16 text-center">
          <p className="font-medium text-slate-700">近い施設を探しています…</p>
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
            {showingNearby
              ? "この条件では" +
                rangeMinutes +
                "分以内に施設が見つかりません。"
              : "条件に合う施設が見つかりませんでした"}
          </p>
          <p className="mt-1 text-sm text-slate-500">
            {showingNearby
              ? "時間を広げる、または絞り込みを外すと、近くの施設が見つかりやすくなります。"
              : "条件を絞り込みすぎていないか、ご確認ください。"}
          </p>
        </div>
      )}

      {!loadingCandidates && (
        <FacilityPaginationControls page={effectivePage} />
      )}
    </section>
  );
}
