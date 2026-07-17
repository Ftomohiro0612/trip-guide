import locationOverlayJson from "@/data/summer_event_locations_2026.json";
import {
  getNextEventDate,
  type EventItem,
  type EventPrefecture,
} from "@/lib/events";
import { getSummerEventAnchorId } from "@/lib/summer-event-hub";

export type SummerEventCoordinatePrecision =
  | "exact_venue"
  | "area_representative"
  | "geocoded_venue"
  | "hold";

export interface SummerEventLocationOverlayEntry {
  latitude: number | null;
  longitude: number | null;
  map_label: string;
  location_source_urls: string[];
  coordinate_reference: string;
  location_basis: string;
  source_checked_at: string;
  coordinate_precision: SummerEventCoordinatePrecision;
}

interface SummerEventLocationOverlay {
  metadata: {
    schema_version: number;
    purpose: string;
    source_checked_at: string;
    overlay_count: number;
    mappable_count: number;
    hold_count: number;
    pilot_target_range: {
      minimum: number;
      maximum: number;
    };
    coordinate_precision_values: SummerEventCoordinatePrecision[];
  };
  locations_by_event_id: Record<string, SummerEventLocationOverlayEntry>;
}

export interface SummerEventMapPoint {
  eventId: string;
  title: string;
  prefecture: EventPrefecture;
  prefectureLabel: string;
  nextDate: string | null;
  latitude: number;
  longitude: number;
  mapLabel: string;
  coordinatePrecision: Exclude<SummerEventCoordinatePrecision, "hold">;
  detailAnchor: string;
}

const PREFECTURE_LABELS: Partial<Record<EventPrefecture, string>> = {
  tokyo: "東京都",
  kanagawa: "神奈川県",
  chiba: "千葉県",
  saitama: "埼玉県",
  yamanashi: "山梨県",
  shizuoka: "静岡県",
  nagano: "長野県",
  ibaraki: "茨城県",
  tochigi: "栃木県",
  gunma: "群馬県",
  niigata: "新潟県",
  aichi: "愛知県",
  kyoto: "京都府",
  osaka: "大阪府",
  hyogo: "兵庫県",
  hiroshima: "広島県",
  fukuoka: "福岡県",
  okayama: "岡山県",
  kagawa: "香川県",
  kumamoto: "熊本県",
  nagasaki: "長崎県",
  oita: "大分県",
  kagoshima: "鹿児島県",
};

const locationOverlay = locationOverlayJson as SummerEventLocationOverlay;

export const summerEventLocationOverlay = locationOverlay;

export function buildSummerEventMapPoints(
  events: readonly EventItem[],
  today: string,
): SummerEventMapPoint[] {
  const visibleById = new Map(events.map((event) => [event.id, event]));

  return Object.entries(locationOverlay.locations_by_event_id).flatMap(
    ([eventId, location]) => {
      const event = visibleById.get(eventId);
      if (
        !event ||
        location.coordinate_precision === "hold" ||
        typeof location.latitude !== "number" ||
        typeof location.longitude !== "number"
      ) {
        return [];
      }

      return [
        {
          eventId,
          title: event.title,
          prefecture: event.prefecture,
          prefectureLabel:
            PREFECTURE_LABELS[event.prefecture] ?? event.prefecture,
          nextDate: getNextEventDate(event, today),
          latitude: location.latitude,
          longitude: location.longitude,
          mapLabel: location.map_label,
          coordinatePrecision: location.coordinate_precision,
          detailAnchor: getSummerEventAnchorId(eventId),
        },
      ];
    },
  );
}
