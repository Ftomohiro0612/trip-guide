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
import FacilityClosureBadge from "@/components/FacilityClosureBadge";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import CategoryIcon from "@/components/CategoryIcon";
import styles from "./MapView.module.css";
import type { Facility, PrefectureId } from "@/types/facility";
import { driveTimeEstimateLabel, haversineDistanceKm } from "@/lib/distance";
import { formatBBoxParam, parseBBoxParam } from "@/lib/geo-bounds";

interface Props {
  facilities: MapFacility[];
  height?: number;
  userStatus?: UserStatusMap;
  storageKey?: string;
  enableAreaSearch?: boolean;
}

export type MapFacility = Pick<
  Facility,
  | "id"
  | "slug"
  | "name"
  | "image"
  | "prefecture"
  | "prefecture_id"
  | "category"
  | "category_id"
  | "latitude"
  | "longitude"
  | "is_free"
  | "rain_friendly"
  | "target_age"
  | "things_to_do"
  | "closure_status"
>;

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
  nara: "#f97316",
  hokkaido: "#2563eb",
  aomori: "#16a34a",
  iwate: "#0f766e",
  akita: "#0369a1",
  yamagata: "#db2777",
  okinawa: "#06b6d4",
  shiga: "#0d9488",
  wakayama: "#db2777",
  yamaguchi: "#e11d48",
  tottori: "#f97316",
  shimane: "#a855f7",
  kagoshima: "#dc2626",
  kochi: "#0284c7",
  miyazaki: "#16a34a",
  saga: "#db2777",
  tokushima: "#7c3aed",
};

const DEFAULT_CENTER: [number, number] = [35.8, 138.5];
const DEFAULT_ZOOM = 8;

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

    return {
      center: parsed.center,
      zoom: parsed.zoom,
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

interface PlacedFacility extends MapFacility {
  latitude: number;
  longitude: number;
}

function hasCoords(f: MapFacility): f is PlacedFacility {
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
  storageKey,
  enableAreaSearch = false,
}: Props) {
  const placed = useMemo(() => facilities.filter(hasCoords), [facilities]);
  const searchParams = useSearchParams();
  const area = enableAreaSearch ? parseBBoxParam(searchParams.get("bbox")) : null;
  const [initialArea] = useState(() => area);
  const [initialState] = useState(() => readPersistedState(storageKey));

  const [currentLocation, setCurrentLocation] =
    useState<CurrentLocationState | null>(() => readPersistedCurrentLocation());
  const [locationNotice, setLocationNotice] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);
  const savedSnapshot = useRef<PersistedMapViewState>({
    center: initialState?.center ?? DEFAULT_CENTER,
    zoom: initialState?.zoom ?? DEFAULT_ZOOM,
  });

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

  const visible = placed;

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
        <p className="w-full text-[11px] font-medium text-slate-500 bg-white/90 backdrop-blur rounded-full px-2.5 py-1 shadow-sm border border-white/80 sm:max-w-max">
          {LOCATION_GUIDE_TEXT}
        </p>
      </div>

      <div className={`relative overflow-hidden ${styles.mapViewport}`}>
        {locationNotice && (
          <div className="absolute z-[1000] bottom-14 left-3 right-3 sm:left-auto sm:max-w-xs bg-white/95 backdrop-blur px-3 py-2 rounded-xl shadow-sm border border-slate-200 text-xs font-medium text-slate-700">
            {locationNotice}
          </div>
        )}

        <div className="absolute z-[650] bottom-3 left-3 bg-white/95 backdrop-blur px-3 py-1.5 rounded-full shadow-sm text-xs font-medium text-slate-700">
          {visible.length} 施設を表示中
        </div>

        <MapContainer
          bounds={initialArea ? [
            [initialArea.south, initialArea.west],
            [initialArea.north, initialArea.east],
          ] : undefined}
          boundsOptions={{ maxZoom: 16 }}
          center={initialArea ? undefined : initialState?.center ?? DEFAULT_CENTER}
          zoom={initialState?.zoom ?? DEFAULT_ZOOM}
          scrollWheelZoom
          style={{ height, width: "100%" }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <FitBoundsOnChange
            points={placed}
            fitMode={
              area ? "never" : storageKey
                ? (initialState ? "never" : "initial-only")
                : "always"
            }
          />
          {enableAreaSearch && <AreaSearchControl facilities={facilities} />}
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
              currentLocation={currentLocation?.position ?? null}
            />
          ))}
        </MapContainer>
      </div>
    </div>
  );
}

// Listen independently of viewport persistence, including on /facilities.
function AreaSearchControl({
  facilities,
}: {
  facilities: MapFacility[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [searchState, setSearchState] = useState({ facilities, visible: false });
  const setShowSearch = useCallback((visible: boolean) => {
    setSearchState({ facilities, visible });
  }, [facilities]);
  const userMovement = useRef(false);
  const baseline = useRef<L.LatLngBounds | null>(null);

  const updateSearch = useCallback((event: LeafletEvent) => {
    const map = event.target as L.Map;
    const bounds = map.getBounds();
    if (userMovement.current) {
      const previous = baseline.current;
      setShowSearch(previous !== null && !bounds.equals(previous, 0.000001));
    } else {
      baseline.current = bounds;
    }
    if (event.type === "moveend") userMovement.current = false;
  }, [setShowSearch]);

  const map = useMapEvents({
    dragstart: () => { userMovement.current = true; },
    moveend: updateSearch,
    zoomend: updateSearch,
  });

  useEffect(() => {
    baseline.current = map.getBounds();
    userMovement.current = false;
    const container = map.getContainer();
    const markUserMovement = () => { userMovement.current = true; };
    const markPinch = (event: TouchEvent) => {
      if (event.touches.length === 2) markUserMovement();
    };
    const markZoomControl = (event: MouseEvent) => {
      if ((event.target as Element).closest(".leaflet-control-zoom")) {
        markUserMovement();
      }
    };
    const markKeyboard = (event: KeyboardEvent) => {
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "+", "-", "="].includes(event.key)) {
        markUserMovement();
      }
    };
    const resetMovement = () => {
      userMovement.current = false;
      baseline.current = map.getBounds();
      setShowSearch(false);
    };

    // Capture input before Leaflet starts a zoom. Programmatic moves explicitly
    // reset this flag, so auto-fit, geolocation and popup auto-pan cannot arm it.
    container.addEventListener("wheel", markUserMovement, { capture: true, passive: true });
    container.addEventListener("touchmove", markPinch, { capture: true, passive: true });
    container.addEventListener("dblclick", markUserMovement, true);
    container.addEventListener("click", markZoomControl, true);
    container.addEventListener("keydown", markKeyboard, true);
    map.on("areasearch:programmaticMove", resetMovement);
    map.on("autopanstart", resetMovement);
    return () => {
      container.removeEventListener("wheel", markUserMovement, true);
      container.removeEventListener("touchmove", markPinch, true);
      container.removeEventListener("dblclick", markUserMovement, true);
      container.removeEventListener("click", markZoomControl, true);
      container.removeEventListener("keydown", markKeyboard, true);
      map.off("areasearch:programmaticMove", resetMovement);
      map.off("autopanstart", resetMovement);
    };
  }, [map, setShowSearch]);

  if (searchState.facilities !== facilities || !searchState.visible) return null;
  return (
    <button
      type="button"
      className="absolute z-[700] top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-50"
      onClick={(event) => {
        event.stopPropagation();
        const bounds = map.getBounds();
        const params = new URLSearchParams(searchParams);
        params.set("bbox", formatBBoxParam({
          north: bounds.getNorth(),
          south: bounds.getSouth(),
          east: bounds.getEast(),
          west: bounds.getWest(),
        }));
        params.set("page", "1");
        baseline.current = bounds;
        userMovement.current = false;
        setShowSearch(false);
        router.push(pathname + "?" + params.toString(), { scroll: false });
      }}
    >
      このエリアを検索
    </button>
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
    if (points.length === 0) return;

    didInitialFit.current = true;
    map.fire("areasearch:programmaticMove");
    if (points.length === 1) {
      map.flyTo([points[0].latitude, points[0].longitude], 11, {
        duration: 0.6,
      });
      return;
    }
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
    map.fire("areasearch:programmaticMove");
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
  currentLocation,
}: {
  facility: PlacedFacility;
  color: string;
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
  const hasImage = !!facility.image;

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
      <Popup
        className={styles.popup}
        minWidth={0}
        maxWidth={240}
        autoPanPadding={[8, 8]}
        keepInView
      >
        <div className={styles.summary}>
          <p className="font-bold text-slate-900 text-sm leading-tight">
            <CategoryIcon
              categoryId={facility.category_id}
              width={16}
              height={16}
              className="mr-1 inline h-4 w-4 align-[-2px]"
            />
            {facility.name}
          </p>
          <FacilityClosureBadge status={facility.closure_status} compact />
          {hasImage && (
            <div className="relative h-[54px] w-24 max-w-full overflow-hidden rounded">
              <Image
                src={facility.image as string}
                alt={facility.name}
                fill
                sizes="96px"
                className="object-cover"
              />
            </div>
          )}
          {driveEstimate && (
            <p className="text-[11px] leading-snug font-bold text-slate-700 bg-blue-50 px-2 py-1 rounded">
              🚗 現在地から {driveEstimate}
            </p>
          )}
          <p className="text-[11px] leading-snug text-slate-700">
            対象年齢: {facility.target_age}
          </p>
          {thingsToDo.length > 0 && (
            <ul className="space-y-0.5" aria-label="この施設でできそうなこと">
              {thingsToDo.map((item) => (
                <li
                  key={item}
                  className="text-[11px] leading-snug text-slate-700"
                  title={item}
                >
                  ・{item}
                </li>
              ))}
            </ul>
          )}
          <Link
            href={`/facilities/${facility.slug}`}
            className={`${styles.details} inline-block w-full text-center bg-brand hover:bg-brand-dark text-white text-xs font-bold px-2 py-1.5 rounded transition-colors`}
          >
            詳細を見る →
          </Link>
        </div>
      </Popup>
    </CircleMarker>
  );
}
