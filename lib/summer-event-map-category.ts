import type { SummerEventType } from "@/lib/events";

export interface SummerEventMapCategoryStyle {
  eventType: SummerEventType;
  label: string;
  color: string;
}

export const SUMMER_EVENT_MAP_CATEGORY_STYLES = [
  { eventType: "fireworks", label: "花火", color: "#e11d48" },
  { eventType: "summer_festival", label: "夏祭り", color: "#d97706" },
  { eventType: "summer_tradition", label: "伝統行事", color: "#7c3aed" },
  { eventType: "night_outing", label: "夜のおでかけ", color: "#0369a1" },
] as const satisfies readonly SummerEventMapCategoryStyle[];

export const SUMMER_EVENT_MAP_CATEGORY_BY_TYPE = Object.fromEntries(
  SUMMER_EVENT_MAP_CATEGORY_STYLES.map((style) => [style.eventType, style]),
) as Record<SummerEventType, SummerEventMapCategoryStyle>;
