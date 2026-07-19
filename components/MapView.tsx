"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Popup,
  useMap,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import type { LeafletEvent } from "leaflet";
import "leaflet/dist/leaflet.css";
import Link from "next/link";
import CategoryIcon from "@/components/CategoryIcon";
import type { Facility, PrefectureId } from "@/types/facility";
import { driveTimeEstimateLabel, haversineDistanceKm } from "@/lib/distance";

interface Props {
  facilities: Facility[];
  height?: number;
  userStatus?: UserStatusMap;
  storageKey?: string;
}

export type UserFacilityStatus = {
  visitCount: number;
  lastVisited: string | null;
  wishlisted: boolean;
};

export type UserStatusMap = Map<string, UserFacilityStatus>;

const PREF_COLORS: Record<PrefectureId, string> = {
  shizuoka: "#0ea5e9",
  nagano: "#10b981",
  yamanashi: "#a855f7",
  tokyo: "#f43f5e",
  tochigi: "#f59e0b",
  saitama: "#84cc16",
  niigata: "#6366f1",
  chiba: "#06b6d4",
  kanagawa: "#a855f7",
  ibaraki: "#0ea5e9",
  gunma: "#f97316",
  osaka: "#e11d48",
  hyogo: "#14b8a6",
  kyoto: "#b91c1c",
  aichi: "#16a34a",
  fukuoka: "#7c3aed",
  hiroshima: "#dc2626",
  miyagi: "#0891b2",
  kagawa: "#65a30d",
  kumamoto: "#be123c",
  okayama: "#7c3aed",
  ishikawa: "#0284c7",
  oita: "#ea580c",
  fukushima: "#16a34a",
  ehime: "#f59e0b",
  nagasaki: "#2563eb",
  toyama: "#0891b2",
  fukui: "#059669",
  gifu: "#15803d",
  mie: "#7c3aed",
};

const PREF_LABELS: Record<PrefectureId, string> = {
  shizuoka: "🗻 静岡",
  nagano: "🏔️ 長野",
  yamanashi: "🍇 山梨",
  tokyo: "🗼 東京",
  tochigi: "🍓 栃木",
  saitama: "🌻 埼玉",
  niigata: "🌾 新潟",
  chiba: "🥜 千葉",
  kanagawa: "🌊 神奈川",
  ibaraki: "🌊 茨城",
  gunma: "♨️ 群馬",
  osaka: "🏯 大阪",
  hyogo: "🌉 兵庫",
  kyoto: "⛩️ 京都",
  aichi: "🏮 愛知",
  fukuoka: "🍜 福岡",
  hiroshima: "🦪 広島",
  miyagi: "🌙 宮城",
  kagawa: "🫒 香川",
  kumamoto: "🏯 熊本",
  okayama: "🍑 岡山",
  ishikawa: "🪭 石川",
  oita: "♨️ 大分",
  fukushima: "🍑 福島",
  ehime: "🍊 愛媛",
  nagasaki: "⛵ 長崎",
  toyama: "🏔️ 富山",
  fukui: "🦖 福井",
  gifu: "🏞️ 岐阜",
  mie: "🥷 三重",
};

const DEFAULT_CENTER: [number, number] = [35.8, 138.5];
const DEFAULT_ZOOM = 8;
const DEFAULT_PREFS: Record<PrefectureId, boolean> = {
  shizuoka: true,
  nagano: true,
  yamanashi: true,
  tokyo: true,
  tochigi: true,
  saitama: true,
  niigata: true,
  chiba: true,
  kanagawa: true,
  ibaraki: true,
  gunma: true,
  osaka: true,
  hyogo: true,
  kyoto: true,
  aichi: true,
  fukuoka: true,
  hiroshima: true,
  miyagi: true,
  kagawa: true,
  kumamoto: true,
  okayama: true,
  ishikawa: true,
  oita: true,
  fukushima: true,
  ehime: true,
  nagasaki: true,
  toyama: true,
  fukui: true,
  gifu: true,
  mie: true,
};

const LOCATION_GUIDE_TEXT =
  "「📍 現在地」を押すと地図に現在地を表示します。現在地はサーバーに送信せず、このタブ内で一時的に利用します。";
const CURRENT_LOCATION_STORAGE_KEY = "mapview:currentLocation";
const CURRENT_LOCATION_EVENT_NAME = "mapview:currentLocation";

type CurrentLocationSource = "locate" | "restore";
type CurrentLocationState = {
  position: [number, number];
  source: CurrentLocationSource;
};

type PersistedMapViewState = {
  center: [number, number];
  zoom: number;
  activePrefs: Record<PrefectureId, boolean>;
  showRain: boolean;
  showFree: boolean;
};

function persistenceKey(storageKey: string) {
  return `mapview:${storageKey}`;
}

function validCenter(value: unknown): value is [number, number] {
  return (
    Array.isArray(value) &&
    value.length === 2 &&
    typeof value[0] === "number" &&
    typeof value[1] === "number" &&
    Number.isFinite(value[0]) &&
    Number.isFinite(value[1]) &&
    value[0] >= -90 &&
    value[0] <= 90 &&
    value[1] >= -180 &&
    value[1] <= 180
  );
}

function readPersistedState(storageKey?: string): PersistedMapViewState | null {
  if (!storageKey || typeof window === "undefined") return null;

  try {
    const raw = window.sessionStorage.getItem(persistenceKey(storageKey));
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<PersistedMapViewState>;
    if (
      !validCenter(parsed.center) ||
      typeof parsed.zoom !== "number" ||
      !Number.isFinite(parsed.zoom)
    ) {
      return null;
    }

    const savedPrefs =
      typeof parsed.activePrefs === "object" && parsed.activePrefs !== null
        ? (parsed.activePrefs as Partial<Record<PrefectureId, unknown>>)
        : {};
    const activePrefs = { ...DEFAULT_PREFS };
    for (const id of Object.keys(DEFAULT_PREFS) as PrefectureId[]) {
      if (typeof savedPrefs[id] === "boolean") {
        activePrefs[id] = savedPrefs[id];
      }
    }

    return {
      center: parsed.center,
      zoom: parsed.zoom,
      activePrefs,
      showRain: parsed.showRain === true,
      showFree: parsed.showFree === true,
    };
  } catch {
    return null;
  }
}

function readPersistedCurrentLocation(): CurrentLocationState | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.sessionStorage.getItem(CURRENT_LOCATION_STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (!validCenter(parsed)) return null;

    return { position: parsed, source: "restore" };
  } catch {
    return null;
  }
}

function persistCurrentLocation(position: [number, number]) {
  if (typeof window === "undefined") return;

  try {
    window.sessionStorage.setItem(
      CURRENT_LOCATION_STORAGE_KEY,
      JSON.stringify(position),
    );
  } catch {
    // sessionStorage may be unavailable or full; current location should still display.
  }
}

interface PlacedFacility extends Facility {
  latitude: number;
  longitude: number;
}

function hasCoords(f: Facility): f is PlacedFacility {
  return (
    typeof f.latitude === "number" &&
    typeof f.longitude === "number" &&
    Number.isFinite(f.latitude) &&
    Number.isFinite(f.longitude)
  );
}

export default function MapView({
  facilities,
  height = 520,
  userStatus,
  storageKey,
}: Props) {
  const placed = useMemo(() => facilities.filter(hasCoords), [facilities]);
  const [initialState] = useState(() => readPersistedState(storageKey));

  const [activePrefs, setActivePrefs] = useState<Record<PrefectureId, boolean>>(
    () => initialState?.activePrefs ?? { ...DEFAULT_PREFS },
  );
  const [showRain, setShowRain] = useState(() => initialState?.showRain ?? false);
  const [showFree, setShowFree] = useState(() => initialState?.showFree ?? false);
  const [currentLocation, setCurrentLocation] =
    useState<CurrentLocationState | null>(() => readPersistedCurrentLocation());
  const [locationNotice, setLocationNotice] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);
  const savedSnapshot = useRef<PersistedMapViewState>({
    center: initialState?.center ?? DEFAULT_CENTER,
    zoom: initialState?.zoom ?? DEFAULT_ZOOM,
    activePrefs,
    showRain,
    showFree,
  });
  const shouldPersist = Boolean(storageKey);

  const persistState = useCallback(
    (patch: Partial<PersistedMapViewState>) => {
      if (!storageKey || typeof window === "undefined") return;

      const next = { ...savedSnapshot.current, ...patch };
      savedSnapshot.current = next;

      try {
        window.sessionStorage.setItem(
          persistenceKey(storageKey),
          JSON.stringify(next),
        );
      } catch {
        // sessionStorage may be unavailable or full; the map should continue working.
      }
    },
    [storageKey],
  );

  useEffect(() => {
    if (!shouldPersist) return;
    persistState({ activePrefs, showRain, showFree });
  }, [activePrefs, persistState, shouldPersist, showFree, showRain]);

  useEffect(() => {
    if (!locationNotice) return;

    const timeout = window.setTimeout(() => setLocationNotice(null), 5000);
    return () => window.clearTimeout(timeout);
  }, [locationNotice]);

  useEffect(() => {
    function handleCurrentLocationEvent(event: Event) {
      const { detail } = event as CustomEvent<unknown>;
      if (!validCenter(detail)) return;

      setCurrentLocation({ position: detail, source: "locate" });
    }

    window.addEventListener(
      CURRENT_LOCATION_EVENT_NAME,
      handleCurrentLocationEvent,
    );
    return () =>
      window.removeEventListener(
        CURRENT_LOCATION_EVENT_NAME,
        handleCurrentLocationEvent,
      );
  }, []);

  const visible = useMemo(() => {
    return placed.filter((f) => {
      if (!activePrefs[f.prefecture_id]) return false;
      if (showRain && f.rain_friendly === "×") return false;
      if (showFree && !f.is_free) return false;
      return true;
    });
  }, [placed, activePrefs, showRain, showFree]);

  // Spread overlapping markers in a small circle so each is clickable
  // (e.g. キポキポ + 恩賜林庭園 at identical coords would otherwise stack
  // and only the top one is visible). The offset is ~30-40m, smaller than
  // street-level zoom resolution.
  const rendered = useMemo(() => {
    const groups = new Map<string, PlacedFacility[]>();
    for (const f of visible) {
      const key = `${f.latitude.toFixed(6)},${f.longitude.toFixed(6)}`;
      const list = groups.get(key) ?? [];
      list.push(f);
      groups.set(key, list);
    }
    const out: PlacedFacility[] = [];
    for (const list of groups.values()) {
      if (list.length === 1) {
        out.push(list[0]);
        continue;
      }
      const radius = 0.0004; // ~40m
      list.forEach((f, i) => {
        const angle = (i / list.length) * Math.PI * 2;
        out.push({
          ...f,
          latitude: f.latitude + Math.sin(angle) * radius,
          longitude: f.longitude + Math.cos(angle) * radius,
        });
      });
    }
    return out;
  }, [visible]);

  const handleLocate = () => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setLocationNotice("位置情報を取得できませんでした（ブラウザの許可が必要です）");
      return;
    }

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocating(false);
        setLocationNotice(null);
        const nextPosition: [number, number] = [
          position.coords.latitude,
          position.coords.longitude,
        ];
        persistCurrentLocation(nextPosition);
        setCurrentLocation({ position: nextPosition, source: "locate" });
      },
      () => {
        setLocating(false);
        setLocationNotice("位置情報を取得できませんでした（ブラウザの許可が必要です）");
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 },
    );
  };

  return (
    <div className="rounded-2xl overflow-hidden border border-slate-200 shadow-sm bg-white">
      <div className="flex flex-wrap gap-2 p-3 bg-slate-50/80 border-b border-slate-100">
        <button
          type="button"
          onClick={handleLocate}
          disabled={locating}
          className="text-xs font-bold px-2.5 py-1.5 rounded-full shadow-sm border transition-colors bg-blue-600 text-white border-blue-600 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-wait"
        >
          {locating ? "📍 取得中..." : "📍 現在地"}
        </button>
        {(Object.keys(PREF_LABELS) as PrefectureId[]).map((id) => (
          <button
            key={id}
            type="button"
            onClick={() =>
              setActivePrefs((s) => ({ ...s, [id]: !s[id] }))
            }
            className={`text-xs font-bold px-2.5 py-1.5 rounded-full shadow-sm border transition-all ${
              activePrefs[id]
                ? "bg-white text-slate-900 border-white"
                : "bg-white/60 text-slate-400 border-white/60 line-through"
            }`}
            style={
              activePrefs[id]
                ? { boxShadow: `0 0 0 2px ${PREF_COLORS[id]}` }
                : undefined
            }
          >
            <span
              className="inline-block w-2 h-2 rounded-full mr-1.5 align-middle"
              style={{ backgroundColor: PREF_COLORS[id] }}
            />
            {PREF_LABELS[id]}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setShowRain((v) => !v)}
          className={`text-xs font-bold px-2.5 py-1.5 rounded-full shadow-sm border transition-colors ${
            showRain
              ? "bg-sky-500 text-white border-sky-500"
              : "bg-white text-slate-700 border-slate-200 hover:border-sky-400"
          }`}
        >
          ☂️ 雨でも遊べる
        </button>
        <button
          type="button"
          onClick={() => setShowFree((v) => !v)}
          className={`text-xs font-bold px-2.5 py-1.5 rounded-full shadow-sm border transition-colors ${
            showFree
              ? "bg-emerald-500 text-white border-emerald-500"
              : "bg-white text-slate-700 border-slate-200 hover:border-emerald-400"
          }`}
        >
          🆓 無料のみ
        </button>
        <p className="w-full text-[11px] font-medium text-slate-500 bg-white/90 backdrop-blur rounded-full px-2.5 py-1 shadow-sm border border-white/80 sm:max-w-max">
          {LOCATION_GUIDE_TEXT}
        </p>
      </div>

      <div className="relative overflow-hidden">
        {locationNotice && (
          <div className="absolute z-[1000] bottom-14 left-3 right-3 sm:left-auto sm:max-w-xs bg-white/95 backdrop-blur px-3 py-2 rounded-xl shadow-sm border border-slate-200 text-xs font-medium text-slate-700">
            {locationNotice}
          </div>
        )}

        <div className="absolute z-[650] bottom-3 left-3 bg-white/95 backdrop-blur px-3 py-1.5 rounded-full shadow-sm text-xs font-medium text-slate-700">
          {visible.length} 施設を表示中
        </div>

        <MapContainer
          center={initialState?.center ?? DEFAULT_CENTER}
          zoom={initialState?.zoom ?? DEFAULT_ZOOM}
          scrollWheelZoom
          style={{ height, width: "100%" }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <FitBoundsOnChange
            points={visible}
            fitMode={
              storageKey ? (initialState ? "never" : "initial-only") : "always"
            }
          />
          {storageKey && (
            <PersistMapPosition
              onChange={persistState}
              ignoredCenter={
                currentLocation?.source === "locate"
                  ? currentLocation.position
                  : null
              }
            />
          )}
          {currentLocation && (
            <CurrentLocationMarker
              position={currentLocation.position}
              source={currentLocation.source}
            />
          )}
          {rendered.map((f) => (
            <FacilityMarker
              key={f.id}
              facility={f}
              color={PREF_COLORS[f.prefecture_id]}
              status={userStatus?.get(f.slug)}
              currentLocation={currentLocation?.position ?? null}
            />
          ))}
        </MapContainer>
      </div>
    </div>
  );
}

function FitBoundsOnChange({
  points,
  fitMode,
}: {
  points: PlacedFacility[];
  fitMode: "always" | "initial-only" | "never";
}) {
  const map = useMap();
  const didInitialFit = useRef(false);

  useEffect(() => {
    if (fitMode === "never") return;
    if (fitMode === "initial-only" && didInitialFit.current) return;
    if (points.length < 2) return;

    didInitialFit.current = true;
    const bounds = L.latLngBounds(
      points.map((p) => [p.latitude, p.longitude] as [number, number]),
    );
    map.flyToBounds(bounds, { padding: [40, 40], duration: 0.6, maxZoom: 11 });
  }, [fitMode, points, map]);
  return null;
}

function PersistMapPosition({
  onChange,
  ignoredCenter,
}: {
  onChange: (patch: Partial<PersistedMapViewState>) => void;
  ignoredCenter: [number, number] | null;
}) {
  const saveMapView = useCallback(
    (event: LeafletEvent) => {
      const map = event.target as L.Map;
      const center = map.getCenter();
      if (
        ignoredCenter &&
        Math.abs(center.lat - ignoredCenter[0]) < 0.000001 &&
        Math.abs(center.lng - ignoredCenter[1]) < 0.000001
      ) {
        return;
      }

      onChange({
        center: [center.lat, center.lng],
        zoom: map.getZoom(),
      });
    },
    [ignoredCenter, onChange],
  );

  useMapEvents({
    moveend: saveMapView,
    zoomend: saveMapView,
  });

  return null;
}

function CurrentLocationMarker({
  position,
  source,
}: {
  position: [number, number];
  source: CurrentLocationSource;
}) {
  const map = useMap();

  useEffect(() => {
    if (source !== "locate") return;
    map.setView(position, 13);
  }, [map, position, source]);

  return (
    <>
      <CircleMarker
        center={position}
        radius={18}
        pathOptions={{
          color: "#2563eb",
          weight: 2,
          fillColor: "#60a5fa",
          fillOpacity: 0.18,
        }}
      />
      <CircleMarker
        center={position}
        radius={6}
        pathOptions={{
          color: "#ffffff",
          weight: 2,
          fillColor: "#2563eb",
          fillOpacity: 1,
        }}
      >
        <Popup>現在地</Popup>
      </CircleMarker>
    </>
  );
}

function FacilityMarker({
  facility,
  color,
  status,
  currentLocation,
}: {
  facility: PlacedFacility;
  color: string;
  status?: UserFacilityStatus;
  currentLocation: [number, number] | null;
}) {
  const highlighted =
    facility.rain_friendly === "◎" || facility.is_free;
  const driveEstimate = currentLocation
    ? driveTimeEstimateLabel(
        haversineDistanceKm(currentLocation, [
          facility.latitude,
          facility.longitude,
        ]),
      )
    : null;
  const thingsToDo = Array.isArray(facility.things_to_do)
    ? facility.things_to_do
        .filter((item) => item.trim().length > 0)
        .slice(0, 3)
    : [];

  return (
    <CircleMarker
      center={[facility.latitude, facility.longitude]}
      radius={highlighted ? 8 : 6}
      pathOptions={{
        color: "#ffffff",
        weight: 2,
        fillColor: color,
        fillOpacity: 0.9,
      }}
    >
      <Popup>
        <div className="min-w-[200px] max-w-[240px]">
          <p className="text-xs text-slate-500 mb-1">
            {facility.prefecture} · {facility.category}
          </p>
          <p className="font-bold text-slate-900 text-sm leading-tight mb-2">
            <CategoryIcon
              categoryId={facility.category_id}
              width={16}
              height={16}
              className="mr-1 inline h-4 w-4 align-[-2px]"
            />
            {facility.name}
          </p>
          <div className="flex flex-wrap gap-1 mb-2">
            {facility.is_free && (
              <span className="text-[10px] font-bold bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded">
                🆓 無料
              </span>
            )}
            <span className="text-[10px] font-bold bg-sky-100 text-sky-700 px-1.5 py-0.5 rounded">
              ☂️ {facility.rain_friendly}
            </span>
            <span className="text-[10px] font-bold bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded">
              👶 {facility.target_age}
            </span>
          </div>
          {(status?.visitCount ?? 0) > 0 && (
            <div className="text-[10px] bg-green-50 text-green-700 px-1.5 py-0.5 rounded font-medium mb-1">
              ✅ 行ったことあり {status?.visitCount}回
              {status?.lastVisited ? ` (${status.lastVisited})` : ""}
            </div>
          )}
          {status?.wishlisted && (
            <div className="text-[10px] bg-pink-50 text-pink-600 px-1.5 py-0.5 rounded font-medium mb-1">
              ⭐ 行きたい登録済み
            </div>
          )}
          {driveEstimate && (
            <p className="text-[11px] font-bold text-slate-700 bg-blue-50 px-2 py-1 rounded mb-2 truncate">
              🚗 現在地から {driveEstimate}
            </p>
          )}
          {thingsToDo.length > 0 && (
            <div className="mb-2">
              <p className="text-[10px] font-bold text-slate-500 mb-1">
                この施設でできそうなこと
              </p>
              <ul className="space-y-0.5">
                {thingsToDo.map((item) => (
                  <li
                    key={item}
                    className="text-[11px] leading-snug text-slate-700 truncate"
                    title={item}
                  >
                    ・{item}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <Link
            href={`/facilities/${facility.slug}`}
            className="inline-block w-full text-center bg-brand hover:bg-brand-dark text-white text-xs font-bold px-2 py-1.5 rounded transition-colors"
          >
            詳細を見る →
          </Link>
        </div>
      </Popup>
    </CircleMarker>
  );
}
