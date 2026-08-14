"use client";

import { useMemo, useRef, useState } from "react";
import FacilityCard from "@/components/FacilityCard";
import { FACILITIES_PER_PAGE } from "@/lib/facility-pagination";
import {
  driveTimeEstimateLabel,
  haversineDistanceKm,
  type Coordinate,
} from "@/lib/distance";
import type { Facility } from "@/types/facility";

type SortMode = "recommended" | "nearby";
type LocationStatus = "idle" | "locating" | "ready" | "error";

interface Props {
  facilities: Facility[];
}

interface FacilityWithDistance {
  facility: Facility;
  distanceKm: number | null;
}

function recommendationScore(facility: Facility) {
  return (
    (facility.rain_friendly === "◎" ? 2 : 0) +
    (facility.is_free ? 1 : 0)
  );
}

function hasValidCoordinates(
  facility: Facility,
): facility is Facility & { latitude: number; longitude: number } {
  const { latitude, longitude } = facility;
  return (
    typeof latitude === "number" &&
    typeof longitude === "number" &&
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180
  );
}

function locationErrorMessage(error: GeolocationPositionError) {
  if (error.code === 1) {
    return "位置情報の利用が許可されませんでした。おすすめ順の一覧を表示しています。ブラウザ設定から許可すると利用できます。";
  }
  if (error.code === 2) {
    return "端末またはブラウザの位置情報がオフのため取得できませんでした。おすすめ順の一覧を表示しています。";
  }
  if (error.code === 3) {
    return "現在地の取得がタイムアウトしました。おすすめ順の一覧を表示しています。";
  }
  return "現在地を取得できませんでした。おすすめ順の一覧を表示しています。";
}

export default function PrefectureFacilityList({ facilities }: Props) {
  const [sortMode, setSortMode] = useState<SortMode>("recommended");
  const [currentLocation, setCurrentLocation] = useState<Coordinate | null>(
    null,
  );
  const [locationStatus, setLocationStatus] =
    useState<LocationStatus>("idle");
  const [notice, setNotice] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const locationRequestId = useRef(0);

  const recommendedFacilities = useMemo(
    () =>
      facilities.slice().sort(
        (a, b) =>
          recommendationScore(b) - recommendationScore(a) || a.id - b.id,
      ),
    [facilities],
  );

  const nearbyFacilities = useMemo<FacilityWithDistance[]>(() => {
    if (!currentLocation) return [];

    return facilities
      .map((facility) => ({
        facility,
        distanceKm: hasValidCoordinates(facility)
          ? haversineDistanceKm(currentLocation, [
              facility.latitude,
              facility.longitude,
            ])
          : null,
      }))
      .sort((a, b) => {
        if (a.distanceKm === null && b.distanceKm === null) {
          return a.facility.id - b.facility.id;
        }
        if (a.distanceKm === null) return 1;
        if (b.distanceKm === null) return -1;
        return (
          a.distanceKm - b.distanceKm || a.facility.id - b.facility.id
        );
      });
  }, [currentLocation, facilities]);

  // Sort the complete prefecture list first. Pagination slices only this
  // already-sorted array, so ordering remains correct across page boundaries.
  const sortedFacilities = useMemo<FacilityWithDistance[]>(
    () =>
      sortMode === "nearby" && currentLocation
        ? nearbyFacilities
        : recommendedFacilities.map((facility) => ({
            facility,
            distanceKm: null,
          })),
    [currentLocation, nearbyFacilities, recommendedFacilities, sortMode],
  );

  const totalItems = sortedFacilities.length;
  const totalPages = Math.max(
    1,
    Math.ceil(totalItems / FACILITIES_PER_PAGE),
  );
  const startIndex = (currentPage - 1) * FACILITIES_PER_PAGE;
  const pageItems = sortedFacilities.slice(
    startIndex,
    startIndex + FACILITIES_PER_PAGE,
  );
  const rangeStart = totalItems === 0 ? 0 : startIndex + 1;
  const rangeEnd = startIndex + pageItems.length;

  function showRecommended() {
    locationRequestId.current += 1;
    setSortMode("recommended");
    setCurrentLocation(null);
    setLocationStatus("idle");
    setNotice(null);
    setCurrentPage(1);
  }

  function fallBackToRecommended(message: string) {
    setSortMode("recommended");
    setCurrentLocation(null);
    setLocationStatus("error");
    setNotice(message);
    setCurrentPage(1);
  }

  function requestCurrentLocation() {
    const requestId = locationRequestId.current + 1;
    locationRequestId.current = requestId;

    if (typeof navigator === "undefined" || !navigator.geolocation) {
      fallBackToRecommended(
        "近い順には現在地が必要です。このブラウザでは位置情報を取得できないため、おすすめ順の一覧を表示しています。",
      );
      return;
    }

    setLocationStatus("locating");
    setNotice(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (locationRequestId.current !== requestId) return;

        const nextLocation: Coordinate = [
          position.coords.latitude,
          position.coords.longitude,
        ];
        if (
          !Number.isFinite(nextLocation[0]) ||
          !Number.isFinite(nextLocation[1]) ||
          nextLocation[0] < -90 ||
          nextLocation[0] > 90 ||
          nextLocation[1] < -180 ||
          nextLocation[1] > 180
        ) {
          fallBackToRecommended(
            "現在地を取得できませんでした。おすすめ順の一覧を表示しています。",
          );
          return;
        }

        setCurrentLocation(nextLocation);
        setSortMode("nearby");
        setLocationStatus("ready");
        setNotice(null);
        setCurrentPage(1);
      },
      (error) => {
        if (locationRequestId.current !== requestId) return;
        fallBackToRecommended(
          `近い順には現在地が必要です。${locationErrorMessage(error)}`,
        );
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 },
    );
  }

  function goToPage(nextPage: number) {
    const safePage = Math.min(Math.max(nextPage, 1), totalPages);
    setCurrentPage(safePage);
    window.requestAnimationFrame(() => {
      const heading = document.getElementById(
        "prefecture-facilities-heading",
      );
      heading?.scrollIntoView({ behavior: "smooth", block: "start" });
      heading?.focus({ preventScroll: true });
    });
  }

  return (
    <>
      <p className="mb-4 text-sm text-slate-500" aria-live="polite">
        {sortMode === "nearby"
          ? "現在地から近い順（全施設を並べ替え後、24件ずつ表示）"
          : "おすすめ順（雨対応・無料施設を優先）"}
      </p>

      <section
        aria-label="施設の並び順"
        className="mb-4 rounded-xl border border-sky-100 bg-sky-50/70 px-3 py-3 sm:px-4"
      >
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={showRecommended}
            aria-pressed={sortMode === "recommended"}
            className={`rounded-full border px-3 py-2 text-sm font-bold transition-colors ${
              sortMode === "recommended"
                ? "border-brand bg-brand text-white"
                : "border-slate-200 bg-white text-slate-700 hover:border-brand hover:text-brand"
            }`}
          >
            おすすめ順
          </button>
          <button
            type="button"
            onClick={requestCurrentLocation}
            disabled={locationStatus === "locating"}
            aria-pressed={sortMode === "nearby"}
            className="rounded-full bg-blue-600 px-3 py-2 text-sm font-bold text-white shadow-sm transition-colors hover:bg-blue-700 disabled:cursor-wait disabled:opacity-60"
          >
            {locationStatus === "locating"
              ? "📍 現在地を取得中..."
              : sortMode === "nearby"
                ? "✓ 現在地から近い順"
                : "📍現在地から近い順に並べる"}
          </button>
        </div>

        {sortMode === "nearby" ? (
          <div className="mt-3 text-sm text-slate-700">
            <p className="font-bold text-slate-900">
              ✓ 現在地から近い順: 全{totalItems}件
            </p>
            <p className="mt-1 text-xs text-slate-500">
              この都道府県の全施設を直線距離で並べ、その後24件ずつ表示しています。所要時間は概算です。
            </p>
          </div>
        ) : (
          <p className="mt-3 text-xs text-slate-500">
            現在地はサーバーに送信せず、アカウントにも保存せず、URLにも表示しません。このページを開いている間だけ並び替えに利用します。
          </p>
        )}

        {notice && (
          <p
            role="alert"
            className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800"
          >
            {notice}
          </p>
        )}
      </section>

      <div
        className="flex flex-col gap-1 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between"
        aria-live="polite"
        aria-atomic="true"
      >
        <p className="font-semibold text-slate-800">
          {totalItems === 0
            ? "0施設"
            : `${totalItems}施設中${rangeStart}〜${rangeEnd}施設を表示`}
        </p>
        <p className="font-bold text-slate-700">
          {currentPage} / {totalPages}ページ
        </p>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {pageItems.map(({ facility, distanceKm }) => (
          <FacilityCard
            key={facility.id}
            facility={facility}
            proximityLabel={
              distanceKm === null
                ? undefined
                : driveTimeEstimateLabel(distanceKm)
            }
          />
        ))}
      </div>

      {totalPages > 1 && (
        <nav
          aria-label="施設一覧のページ"
          className="mt-6 flex flex-wrap items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white p-2 sm:p-3"
        >
          <button
            type="button"
            disabled={currentPage === 1}
            onClick={() => goToPage(currentPage - 1)}
            className="inline-flex min-h-11 items-center justify-center rounded-md border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700 transition-colors hover:border-brand hover:text-brand disabled:cursor-not-allowed disabled:opacity-40"
          >
            前へ
          </button>
          {Array.from({ length: totalPages }, (_, index) => index + 1).map(
            (pageNumber) => (
              <button
                key={pageNumber}
                type="button"
                onClick={() => goToPage(pageNumber)}
                aria-current={
                  pageNumber === currentPage ? "page" : undefined
                }
                aria-label={`${pageNumber}ページ目`}
                className={`inline-flex min-h-11 min-w-11 items-center justify-center rounded-md border px-2 py-2 text-sm font-bold transition-colors ${
                  pageNumber === currentPage
                    ? "border-brand bg-brand text-white"
                    : "border-slate-200 text-slate-700 hover:border-brand hover:text-brand"
                }`}
              >
                {pageNumber}
              </button>
            ),
          )}
          <button
            type="button"
            disabled={currentPage === totalPages}
            onClick={() => goToPage(currentPage + 1)}
            className="inline-flex min-h-11 items-center justify-center rounded-md border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700 transition-colors hover:border-brand hover:text-brand disabled:cursor-not-allowed disabled:opacity-40"
          >
            次へ
          </button>
        </nav>
      )}
    </>
  );
}
