"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef } from "react";
import {
  CircleMarker,
  MapContainer,
  Popup,
  TileLayer,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { familyRevisitLabels, fatigueLabels } from "@/lib/visit-labels";
import type { FamilyMapPlace } from "@/lib/visited-places";

type RenderedFamilyMapPlace = FamilyMapPlace & {
  markerLatitude: number;
  markerLongitude: number;
};

const DEFAULT_CENTER: [number, number] = [35.8, 138.5];
const DEFAULT_ZOOM = 8;
const SINGLE_MARKER_ZOOM = 12;

function formatVisitedOn(value: string | null): string {
  return value ? value.replaceAll("-", "/") : "日付未設定";
}

function markerFillColor(kind: FamilyMapPlace["kind"]): string {
  if (kind === "wishlist") return "#ec4899";
  if (kind === "both") return "#8b5cf6";
  return "#0ea5e9";
}

function offsetOverlappingMarkers(places: FamilyMapPlace[]): RenderedFamilyMapPlace[] {
  const groups = new Map<string, FamilyMapPlace[]>();

  for (const place of places) {
    const key = `${place.latitude.toFixed(6)},${place.longitude.toFixed(6)}`;
    const list = groups.get(key) ?? [];
    list.push(place);
    groups.set(key, list);
  }

  const rendered: RenderedFamilyMapPlace[] = [];
  for (const list of groups.values()) {
    if (list.length === 1) {
      const place = list[0];
      rendered.push({
        ...place,
        markerLatitude: place.latitude,
        markerLongitude: place.longitude,
      });
      continue;
    }

    const radius = 0.0004;
    list.forEach((place, index) => {
      const angle = (index / list.length) * Math.PI * 2;
      rendered.push({
        ...place,
        markerLatitude: place.latitude + Math.sin(angle) * radius,
        markerLongitude: place.longitude + Math.cos(angle) * radius,
      });
    });
  }

  return rendered;
}

export default function VisitedPlacesMap({ places }: { places: FamilyMapPlace[] }) {
  const renderedPlaces = useMemo(() => offsetOverlappingMarkers(places), [places]);
  const initialCenter: [number, number] =
    places.length === 1
      ? [places[0].latitude, places[0].longitude]
      : DEFAULT_CENTER;
  const initialZoom = places.length === 1 ? SINGLE_MARKER_ZOOM : DEFAULT_ZOOM;

  return (
    <MapContainer
      center={initialCenter}
      zoom={initialZoom}
      scrollWheelZoom={false}
      className="h-full w-full"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <InvalidateSizeOnMount />
      <FitBounds points={places} />
      {renderedPlaces.map((place) => (
        <CircleMarker
          key={place.slug}
          center={[place.markerLatitude, place.markerLongitude]}
          radius={8}
          pathOptions={{
            color: "#ffffff",
            weight: 2,
            fillColor: markerFillColor(place.kind),
            fillOpacity: 0.92,
          }}
        >
          <Popup>
            <PlacePopup place={place} />
          </Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}

function PlacePopup({ place }: { place: FamilyMapPlace }) {
  if (place.kind === "wishlist") {
    return (
      <div className="min-w-[180px] max-w-[220px] space-y-1">
        <p className="text-sm font-bold leading-snug text-slate-900">
          {place.name}
        </p>
        <p className="text-xs text-slate-600">行きたいリストに追加済み</p>
        <Link
          href={`/facilities/${place.slug}`}
          className="mt-1.5 inline-block text-xs font-bold text-brand hover:underline"
        >
          施設ページを見る →
        </Link>
      </div>
    );
  }

  const visited = place.visited;
  if (!visited) return null;

  return (
    <div className="min-w-[180px] max-w-[220px] space-y-1">
      <p className="text-sm font-bold leading-snug text-slate-900">
        {place.name}
      </p>
      {place.kind === "both" && (
        <p className="text-xs font-medium text-violet-700">
          行ったことあり · 行きたいリストにも追加済み
        </p>
      )}
      <p className="text-xs text-slate-600">訪問{visited.visitCount}回</p>
      <p className="text-xs text-slate-500">
        最終訪問日: {formatVisitedOn(visited.lastVisited)}
      </p>
      {visited.latestRevisit && familyRevisitLabels[visited.latestRevisit] && (
        <p className="text-xs text-slate-600">
          また行きたい: {familyRevisitLabels[visited.latestRevisit]}
        </p>
      )}
      {visited.latestFatigue && fatigueLabels[visited.latestFatigue] && (
        <p className="text-xs text-slate-600">
          疲れ: {fatigueLabels[visited.latestFatigue]}
        </p>
      )}
      <Link
        href={`/mypage/visits/facility/${place.slug}`}
        className="mt-1.5 inline-block text-xs font-bold text-brand hover:underline"
      >
        この場所の記録を見る →
      </Link>
    </div>
  );
}

function InvalidateSizeOnMount() {
  const map = useMap();

  useEffect(() => {
    const timeout = window.setTimeout(() => map.invalidateSize(), 0);
    return () => window.clearTimeout(timeout);
  }, [map]);

  return null;
}

function FitBounds({ points }: { points: FamilyMapPlace[] }) {
  const map = useMap();
  const didFit = useRef(false);

  useEffect(() => {
    if (didFit.current || points.length === 0) return;
    didFit.current = true;

    if (points.length === 1) {
      map.setView([points[0].latitude, points[0].longitude], SINGLE_MARKER_ZOOM);
      return;
    }

    const bounds = L.latLngBounds(
      points.map((point) => [point.latitude, point.longitude] as [number, number]),
    );
    map.fitBounds(bounds, { padding: [32, 32], maxZoom: 12, animate: false });
  }, [map, points]);

  return null;
}
