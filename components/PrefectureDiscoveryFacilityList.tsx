"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import FacilityCard from "@/components/FacilityCard";
import {
  clearPersistedNearbyFilter,
  locationErrorMessage,
  persistMapCurrentLocation,
  persistNearbyFilter,
  readPersistedNearbyFilter,
  type LocationStatus,
} from "@/lib/current-location-session";
import { getNearbyFacilities } from "@/lib/facility-nearby";
import { RECOMMENDED_FOR_TAG_META } from "@/lib/recommended-tags";
import type { Coordinate } from "@/lib/distance";
import type { Facility, RecommendedForTag } from "@/types/facility";

interface Props {
  facilities: Facility[];
  prefectureName: string;
}

type SortMode = "recommend" | "name" | "nearby";

const INITIAL_VISIBLE_COUNT = 24;
const RECOMMENDED_TAGS = Object.keys(
  RECOMMENDED_FOR_TAG_META,
) as RecommendedForTag[];

export default function PrefectureDiscoveryFacilityList({
  facilities,
  prefectureName,
}: Props) {
  const [selectedTags, setSelectedTags] = useState<RecommendedForTag[]>([]);
  const [sortMode, setSortMode] = useState<SortMode>("recommend");
  const [currentLocation, setCurrentLocation] = useState<Coordinate | null>(
    null,
  );
  const [locationStatus, setLocationStatus] =
    useState<LocationStatus>("idle");
  const [locationNotice, setLocationNotice] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE_COUNT);

  useEffect(() => {
    const snapshot = readPersistedNearbyFilter();
    const timeout = window.setTimeout(() => {
      if (snapshot) {
        setCurrentLocation([snapshot.lat, snapshot.lng]);
        setLocationStatus("ready");
      }
    }, 0);

    return () => window.clearTimeout(timeout);
  }, []);

  const tagCounts = useMemo(() => {
    return new Map(
      RECOMMENDED_TAGS.map((tag) => [
        tag,
        facilities.filter((facility) =>
          facility.recommended_for_tags?.includes(tag),
        ).length,
      ]),
    );
  }, [facilities]);

  const filteredFacilities = useMemo(() => {
    if (selectedTags.length === 0) return facilities;
    return facilities.filter((facility) =>
      selectedTags.some((tag) =>
        facility.recommended_for_tags?.includes(tag),
      ),
    );
  }, [facilities, selectedTags]);

  const nearbyResults = useMemo(() => {
    if (sortMode !== "nearby" || !currentLocation) return [];
    return getNearbyFacilities(filteredFacilities, currentLocation);
  }, [currentLocation, filteredFacilities, sortMode]);

  const sortedFacilities = useMemo(() => {
    if (sortMode === "nearby" && currentLocation) {
      return nearbyResults.map((result) => result.facility);
    }
    if (sortMode === "name") {
      return filteredFacilities
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name, "ja"));
    }
    return filteredFacilities;
  }, [currentLocation, filteredFacilities, nearbyResults, sortMode]);

  const proximityLabels = useMemo(
    () =>
      new Map(
        nearbyResults.map((result) => [
          result.facility.id,
          result.proximityLabel,
        ]),
      ),
    [nearbyResults],
  );

  const requestCurrentLocation = useCallback(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setCurrentLocation(null);
      clearPersistedNearbyFilter();
      setSortMode("recommend");
      setLocationStatus("error");
      setLocationNotice(
        "近い順には現在地が必要です。このブラウザでは位置情報を取得できないため、おすすめ順を表示しています。",
      );
      return;
    }

    setLocationStatus("locating");
    setLocationNotice(null);
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
        setLocationStatus("ready");
        setLocationNotice(null);
        setSortMode("nearby");
        setVisibleCount(INITIAL_VISIBLE_COUNT);
      },
      (error) => {
        setCurrentLocation(null);
        clearPersistedNearbyFilter();
        setSortMode("recommend");
        setLocationStatus("error");
        setLocationNotice(
          `近い順には現在地が必要です。${locationErrorMessage(error)}`,
        );
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 },
    );
  }, []);

  function toggleTag(tag: RecommendedForTag) {
    setSelectedTags((current) =>
      current.includes(tag)
        ? current.filter((item) => item !== tag)
        : [...current, tag],
    );
    setVisibleCount(INITIAL_VISIBLE_COUNT);
  }

  function handleSortChange(nextSort: SortMode) {
    setVisibleCount(INITIAL_VISIBLE_COUNT);
    if (nextSort === "nearby") {
      if (currentLocation) {
        setSortMode("nearby");
        setLocationNotice(null);
      } else {
        requestCurrentLocation();
      }
      return;
    }
    setSortMode(nextSort);
  }

  const displayedFacilities = sortedFacilities.slice(0, visibleCount);
  const showingNearby = sortMode === "nearby" && currentLocation !== null;

  return (
    <section aria-labelledby="prefecture-discovery-heading">
      <div className="mb-4 rounded-2xl border border-sky-100 bg-sky-50/70 p-3 sm:p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold text-sky-700">この県内で探し切る</p>
            <h2
              id="prefecture-discovery-heading"
              className="mt-0.5 text-xl font-bold text-slate-900"
            >
              {prefectureName}の施設を絞り込む
            </h2>
          </div>
          {selectedTags.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setSelectedTags([]);
                setVisibleCount(INITIAL_VISIBLE_COUNT);
              }}
              className="min-h-10 shrink-0 rounded-full border border-slate-200 bg-white px-3 text-xs font-bold text-slate-600"
            >
              条件をクリア
            </button>
          )}
        </div>

        <details className="group mt-3 rounded-xl border border-sky-100 bg-white">
          <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-2 px-3 py-2 text-sm font-bold text-slate-800 [&::-webkit-details-marker]:hidden">
            <span>
              🎯 遊び目的で絞り込む
              {selectedTags.length > 0 && (
                <span className="ml-2 rounded-full bg-sky-100 px-2 py-0.5 text-xs text-sky-700">
                  {selectedTags.length}個選択中
                </span>
              )}
            </span>
            <span className="text-slate-400 group-open:rotate-180" aria-hidden>
              ▼
            </span>
          </summary>
          <div className="border-t border-sky-100 px-3 py-3">
            <p className="mb-2 text-xs text-slate-500">
              複数選べます。選んだ遊びのどれかに合う施設を表示します。
            </p>
            <div className="flex flex-wrap gap-2">
              {RECOMMENDED_TAGS.map((tag) => {
                const meta = RECOMMENDED_FOR_TAG_META[tag];
                const selected = selectedTags.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => toggleTag(tag)}
                    className={`min-h-10 rounded-full border px-3 py-2 text-sm font-bold transition-colors ${
                      selected
                        ? "border-sky-600 bg-sky-600 text-white"
                        : "border-slate-200 bg-white text-slate-700 hover:border-sky-300 hover:bg-sky-50"
                    }`}
                  >
                    <span aria-hidden>{meta.icon}</span> {meta.label}
                    <span className={selected ? "text-white/80" : "text-slate-400"}>
                      {" "}({tagCounts.get(tag) ?? 0})
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </details>

        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
          <label className="flex min-h-11 items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm">
            <span className="text-slate-500">並び替え</span>
            <select
              value={sortMode}
              onChange={(event) =>
                handleSortChange(event.target.value as SortMode)
              }
              disabled={locationStatus === "locating"}
              className="min-h-10 bg-white font-bold text-slate-800 outline-none"
            >
              <option value="recommend">おすすめ順</option>
              <option value="name">名前順</option>
              <option value="nearby">現在地から近い順</option>
            </select>
          </label>
          <button
            type="button"
            onClick={requestCurrentLocation}
            disabled={locationStatus === "locating"}
            aria-pressed={showingNearby}
            className="min-h-11 rounded-xl bg-blue-600 px-4 text-sm font-bold text-white shadow-sm transition-colors hover:bg-blue-700 disabled:cursor-wait disabled:opacity-60"
          >
            {locationStatus === "locating"
              ? "📍 現在地を取得中…"
              : showingNearby
                ? "✓ 現在地から近い順"
                : "📍 現在地から近い順にする"}
          </button>
        </div>

        <p className="mt-2 text-xs text-slate-500">
          現在地はサーバーに送信せず、アカウントやURLにも保存しません。このタブ内だけで一時利用します。
        </p>
        {locationNotice && (
          <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
            {locationNotice}
          </p>
        )}
      </div>

      <div className="mb-4" aria-live="polite">
        <p className="font-bold text-slate-900">
          {filteredFacilities.length} 件の施設が該当
        </p>
        <p className="mt-1 text-xs text-slate-500">
          {showingNearby
            ? "直線距離で近い順に表示しています。車の所要時間は目安です。"
            : `全 ${facilities.length} 施設から表示しています。`}
        </p>
      </div>

      {displayedFacilities.length > 0 ? (
        <>
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
          {visibleCount < sortedFacilities.length && (
            <button
              type="button"
              onClick={() => setVisibleCount((count) => count + 24)}
              className="mx-auto mt-6 block min-h-11 rounded-full border border-sky-200 bg-white px-6 text-sm font-bold text-sky-700 hover:bg-sky-50"
            >
              さらに見る（残り {sortedFacilities.length - visibleCount} 件）
            </button>
          )}
        </>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white py-16 text-center">
          <p className="mb-2 text-4xl" aria-hidden>
            😢
          </p>
          <p className="font-medium text-slate-700">
            条件に合う施設が見つかりませんでした
          </p>
          <p className="mt-1 text-sm text-slate-500">
            遊び目的を減らすか、条件をクリアしてもう一度お試しください。
          </p>
        </div>
      )}
    </section>
  );
}
