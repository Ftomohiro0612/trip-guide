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
import type { VisitedPlaceFacility } from "@/lib/visited-places";

type RenderedVisitedFacility = VisitedPlaceFacility & {
  markerLatitude: number;
  markerLongitude: number;
};

const DEFAULT_CENTER: [number, number] = [35.8, 138.5];
const DEFAULT_ZOOM = 8;
const SINGLE_MARKER_ZOOM = 12;

function formatVisitedOn(value: string | null): string {
  return value ? value.replaceAll("-", "/") : "日付未設定";
}

function offsetOverlappingMarkers(
  facilities: VisitedPlaceFacility[],
): RenderedVisitedFacility[] {
  const groups = new Map<string, VisitedPlaceFacility[]>();

  for (const facility of facilities) {
    const key = `${facility.latitude.toFixed(6)},${facility.longitude.toFixed(6)}`;
    const list = groups.get(key) ?? [];
    list.push(facility);
    groups.set(key, list);
  }

  const rendered: RenderedVisitedFacility[] = [];
  for (const list of groups.values()) {
    if (list.length === 1) {
      const facility = list[0];
      rendered.push({
        ...facility,
        markerLatitude: facility.latitude,
        markerLongitude: facility.longitude,
      });
      continue;
    }

    const radius = 0.0004;
    list.forEach((facility, index) => {
      const angle = (index / list.length) * Math.PI * 2;
      rendered.push({
        ...facility,
        markerLatitude: facility.latitude + Math.sin(angle) * radius,
        markerLongitude: facility.longitude + Math.cos(angle) * radius,
      });
    });
  }

  return rendered;
}

export default function VisitedPlacesMap({
  visitedFacilities,
}: {
  visitedFacilities: VisitedPlaceFacility[];
}) {
  const renderedFacilities = useMemo(
    () => offsetOverlappingMarkers(visitedFacilities),
    [visitedFacilities],
  );
  const initialCenter: [number, number] =
    visitedFacilities.length === 1
      ? [visitedFacilities[0].latitude, visitedFacilities[0].longitude]
      : DEFAULT_CENTER;
  const initialZoom =
    visitedFacilities.length === 1 ? SINGLE_MARKER_ZOOM : DEFAULT_ZOOM;

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
      <FitBounds points={visitedFacilities} />
      {renderedFacilities.map((facility) => (
        <CircleMarker
          key={facility.slug}
          center={[facility.markerLatitude, facility.markerLongitude]}
          radius={8}
          pathOptions={{
            color: "#ffffff",
            weight: 2,
            fillColor: "#0ea5e9",
            fillOpacity: 0.92,
          }}
        >
          <Popup>
            <div className="min-w-[180px] max-w-[220px] space-y-1">
              <p className="text-sm font-bold leading-snug text-slate-900">
                {facility.name}
              </p>
              <p className="text-xs text-slate-600">
                訪問{facility.visitCount}回
              </p>
              <p className="text-xs text-slate-500">
                最終訪問日: {formatVisitedOn(facility.lastVisited)}
              </p>
              {facility.latestRevisit &&
                familyRevisitLabels[facility.latestRevisit] && (
                  <p className="text-xs text-slate-600">
                    また行きたい: {familyRevisitLabels[facility.latestRevisit]}
                  </p>
                )}
              {facility.latestFatigue && fatigueLabels[facility.latestFatigue] && (
                <p className="text-xs text-slate-600">
                  疲れ: {fatigueLabels[facility.latestFatigue]}
                </p>
              )}
              <Link
                href={`/mypage/visits/facility/${facility.slug}`}
                className="mt-1.5 inline-block text-xs font-bold text-brand hover:underline"
              >
                この場所の記録を見る →
              </Link>
            </div>
          </Popup>
        </CircleMarker>
      ))}
    </MapContainer>
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

function FitBounds({ points }: { points: VisitedPlaceFacility[] }) {
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
