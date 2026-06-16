"use client";

import { useMemo, useState } from "react";
import FacilityCard from "@/components/FacilityCard";
import {
  driveTimeEstimateLabel,
  haversineDistanceKm,
  nearbyDistanceCutoffKm,
  type Coordinate,
  type NearbyTravelMinutes,
} from "@/lib/distance";
import type { Facility } from "@/types/facility";

interface Props {
  facilities: Facility[];
}

type LocationStatus = "idle" | "locating" | "ready" | "error";

type PlacedFacility = Facility & {
  latitude: number;
  longitude: number;
};

type NearbyFacility = {
  facility: PlacedFacility;
  distanceKm: number;
  proximityLabel: string;
};

const RANGE_OPTIONS: NearbyTravelMinutes[] = [30, 60, 90];

function hasCoords(facility: Facility): facility is PlacedFacility {
  return (
    typeof facility.latitude === "number" &&
    typeof facility.longitude === "number" &&
    Number.isFinite(facility.latitude) &&
    Number.isFinite(facility.longitude)
  );
}

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

export default function NearbyFilterableFacilityList({ facilities }: Props) {
  const [nearbyEnabled, setNearbyEnabled] = useState(false);
  const [rangeMinutes, setRangeMinutes] =
    useState<NearbyTravelMinutes>(60);
  const [currentLocation, setCurrentLocation] = useState<Coordinate | null>(
    null,
  );
  const [status, setStatus] = useState<LocationStatus>("idle");
  const [notice, setNotice] = useState<string | null>(null);

  const nearbyFacilities = useMemo<NearbyFacility[]>(() => {
    if (!nearbyEnabled || !currentLocation) return [];

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
  }, [currentLocation, facilities, nearbyEnabled, rangeMinutes]);

  const showingNearby = nearbyEnabled && currentLocation !== null;

  function requestCurrentLocation() {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setNearbyEnabled(false);
      setCurrentLocation(null);
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
        setCurrentLocation([
          position.coords.latitude,
          position.coords.longitude,
        ]);
        setNearbyEnabled(true);
        setStatus("ready");
        setNotice(null);
      },
      (error) => {
        setNearbyEnabled(false);
        setCurrentLocation(null);
        setStatus("error");
        setNotice(locationErrorMessage(error));
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 },
    );
  }

  function clearNearbyFilter() {
    setNearbyEnabled(false);
    setCurrentLocation(null);
    setStatus("idle");
    setNotice(null);
  }

  return (
    <>
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
                : "📍現在地から近い施設を探す"}
            </button>
            {showingNearby && (
              <button
                type="button"
                onClick={clearNearbyFilter}
                className="rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50"
              >
                近い施設を解除
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
                    onClick={() => setRangeMinutes(minutes)}
                    className={`min-w-14 rounded-full px-2.5 py-1.5 text-xs font-bold transition-colors ${
                      selected
                        ? "bg-blue-600 text-white"
                        : "text-slate-600 hover:bg-slate-100"
                    }`}
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
              {nearbyFacilities.length}件
            </p>
            <p className="mt-1 text-xs text-slate-500">
              車での所要時間は直線距離からの概算です。経路APIによる実際の移動時間ではありません。
            </p>
          </div>
        ) : (
          <p className="mt-3 text-xs text-slate-500">
            位置情報はこの画面内だけで距離計算に使います。保存・URL反映・サーバー送信はしません。
          </p>
        )}

        {notice && (
          <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
            {notice}
          </p>
        )}
      </section>

      {showingNearby ? (
        nearbyFacilities.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {nearbyFacilities.map(({ facility, proximityLabel }) => (
              <FacilityCard
                key={facility.id}
                facility={facility}
                proximityLabel={proximityLabel}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-200 bg-white py-16 text-center">
            <p className="text-slate-700 font-medium">
              現在地から約{rangeMinutes}分以内（目安）の施設は見つかりませんでした
            </p>
            <p className="mt-1 text-sm text-slate-500">
              時間を広げるか、近い施設フィルタを解除して通常の一覧をご確認ください。
            </p>
          </div>
        )
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {facilities.map((facility) => (
            <FacilityCard key={facility.id} facility={facility} />
          ))}
        </div>
      )}
    </>
  );
}
