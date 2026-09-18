import "server-only";

import { eventsData as eventsJson } from "@memorip/runtime-canon";
import { getVisibleEvents, type EventItem } from "@/lib/events";
import { visibleFacilities } from "@/lib/facilities";
import {
  REGIONS,
  getRegionIdByPrefectureId,
  type RegionDefinition,
  type RegionId,
} from "@/lib/regions";
import type { Facility, PrefectureId } from "@/types/facility";

export const SILVER_WEEK_START = "2026-09-19";
export const SILVER_WEEK_END = "2026-09-23";

const FACILITY_PICK_LIMIT = 4;
const EVENT_PICK_LIMIT = 4;
const sourceEvents = (eventsJson as { events: EventItem[] }).events;
const visibleEventIds = new Set(
  getVisibleEvents(SILVER_WEEK_START).map((event) => event.id),
);
const FULL_DAY_CATEGORIES = new Map<string, number>([
  ["遊園地・テーマパーク", 120],
  ["動物園", 105],
  ["水族館", 105],
  ["屋内テーマパーク", 95],
  ["温泉プール", 85],
  ["スキー場・雪遊び", 70],
]);
const FULL_DAY_KEYWORDS = [
  "一日",
  "1日",
  "１日",
  "丸1日",
  "丸１日",
  "半日",
  "終日",
  "たっぷり遊べる",
] as const;
const GENERIC_COMMERCIAL_VENUE_PATTERN =
  /イオンモール|ショッピングモール|ららぽーと|アウトレット/u;

export interface SilverWeekFacilityPick {
  facility: Facility;
  reason: string;
}

export interface SilverWeekEventPick {
  event: EventItem;
  reason: string;
}

export interface SilverWeekCandidateCounts {
  rainy: number;
  events: number;
  allDay: number;
  budget: number;
}

export interface SilverWeekRegionCollection {
  region: RegionDefinition;
  rainy: SilverWeekFacilityPick[];
  events: SilverWeekEventPick[];
  allDay: SilverWeekFacilityPick[];
  budget: SilverWeekFacilityPick[];
  candidateCounts: SilverWeekCandidateCounts;
}

const facilitiesByRegion = groupFacilitiesByRegion();
const eventsByRegion = groupEventsByRegion();
const collectionsByRegion = new Map<RegionId, SilverWeekRegionCollection>(
  REGIONS.map((region) => [region.id, buildRegionCollection(region)]),
);

export const availableSilverWeekRegions = REGIONS.filter((region) => {
  const counts = collectionsByRegion.get(region.id)?.candidateCounts;
  if (!counts) return false;
  return Object.values(counts).filter((count) => count < 2).length < 2;
});

export function getSilverWeekRegionCollection(
  regionId: RegionId,
): SilverWeekRegionCollection | undefined {
  if (!availableSilverWeekRegions.some((region) => region.id === regionId)) {
    return undefined;
  }
  return collectionsByRegion.get(regionId);
}

function buildRegionCollection(
  region: RegionDefinition,
): SilverWeekRegionCollection {
  const regionFacilities = facilitiesByRegion.get(region.id) ?? [];
  const regionEvents = eventsByRegion.get(region.id) ?? [];
  const rainyCandidates = regionFacilities.filter(
    (facility) => facility.rain_friendly === "◎",
  );
  const allDayCandidates = regionFacilities.filter(isFullDayCandidate);
  const budgetCandidates = regionFacilities.filter(
    (facility) => facility.is_free || facility.tags.includes("無料"),
  );

  return {
    region,
    rainy: selectDiverseFacilities(
      rainyCandidates,
      scoreRainyFacility,
      FACILITY_PICK_LIMIT,
    ).map((facility) => ({
      facility,
      reason: buildRainyReason(facility),
    })),
    events: selectDiverseEvents(
      regionEvents,
      scoreHolidayEvent,
      EVENT_PICK_LIMIT,
    ).map((event) => ({ event, reason: buildEventReason(event) })),
    allDay: selectDiverseFacilities(
      allDayCandidates,
      scoreFullDayFacility,
      FACILITY_PICK_LIMIT,
    ).map((facility) => ({
      facility,
      reason: buildFullDayReason(facility),
    })),
    budget: selectDiverseFacilities(
      budgetCandidates,
      scoreBudgetFacility,
      FACILITY_PICK_LIMIT,
    ).map((facility) => ({
      facility,
      reason: buildBudgetReason(facility),
    })),
    candidateCounts: {
      rainy: rainyCandidates.length,
      events: regionEvents.length,
      allDay: allDayCandidates.length,
      budget: budgetCandidates.length,
    },
  };
}

function groupFacilitiesByRegion(): Map<RegionId, Facility[]> {
  const grouped = new Map<RegionId, Facility[]>(
    REGIONS.map((region) => [region.id, []]),
  );

  for (const facility of visibleFacilities) {
    const regionId = getRegionIdByPrefectureId(facility.prefecture_id);
    grouped.get(regionId)?.push(facility);
  }

  return grouped;
}

function groupEventsByRegion(): Map<RegionId, EventItem[]> {
  const grouped = new Map<RegionId, EventItem[]>(
    REGIONS.map((region) => [region.id, []]),
  );

  for (const event of sourceEvents) {
    if (!isSilverWeekEvent(event)) continue;
    const regionId = getRegionIdByPrefectureId(
      event.prefecture as PrefectureId,
    );
    grouped.get(regionId)?.push(event);
  }

  return grouped;
}

function isSilverWeekEvent(event: EventItem): boolean {
  return (
    visibleEventIds.has(event.id) &&
    event.start_date !== null &&
    event.end_date !== null &&
    event.start_date <= SILVER_WEEK_END &&
    event.end_date >= SILVER_WEEK_START &&
    (event.status === "scheduled" || event.status === "ongoing")
  );
}

function isFullDayCandidate(facility: Facility): boolean {
  const searchableText = `${facility.description} ${facility.unique_selling_point ?? ""}`;
  return (
    FULL_DAY_CATEGORIES.has(facility.category) ||
    FULL_DAY_KEYWORDS.some((keyword) => searchableText.includes(keyword)) ||
    (facility.things_to_do?.length ?? 0) >= 5
  );
}

function scoreRainyFacility(facility: Facility): number {
  return (
    imageScore(facility) +
    (facility.indoor_outdoor === "屋内" ? 60 : 0) +
    (facility.tags.includes("完全屋内") ? 40 : 0) +
    Math.min(facility.things_to_do?.length ?? 0, 8) * 4 +
    (facility.unique_selling_point ? 15 : 0)
  );
}

function scoreFullDayFacility(facility: Facility): number {
  const searchableText = `${facility.description} ${facility.unique_selling_point ?? ""}`;
  return (
    imageScore(facility) +
    (FULL_DAY_CATEGORIES.get(facility.category) ?? 0) +
    Math.min(facility.things_to_do?.length ?? 0, 10) * 7 +
    (FULL_DAY_KEYWORDS.some((keyword) => searchableText.includes(keyword))
      ? 30
      : 0) +
    (facility.unique_selling_point ? 15 : 0)
  );
}

function scoreBudgetFacility(facility: Facility): number {
  return (
    imageScore(facility) +
    (facility.is_free ? 50 : 0) +
    Math.min(facility.things_to_do?.length ?? 0, 8) * 5 +
    (facility.unique_selling_point ? 15 : 0) -
    (GENERIC_COMMERCIAL_VENUE_PATTERN.test(facility.name) ? 50 : 0)
  );
}

function scoreHolidayEvent(event: EventItem): number {
  return (
    (event.image ? 500 : 0) +
    event.display_priority +
    (event.start_date && event.start_date >= SILVER_WEEK_START ? 60 : 0) +
    (event.end_date && event.end_date <= SILVER_WEEK_END ? 40 : 0) +
    (event.is_free ? 15 : 0) +
    (event.reservation === "not_required" ? 5 : 0)
  );
}

function imageScore(facility: Facility): number {
  return facility.image ? 500 : 0;
}

function selectDiverseFacilities(
  candidates: readonly Facility[],
  score: (facility: Facility) => number,
  limit: number,
): Facility[] {
  return selectDiverse(
    candidates,
    score,
    (facility) => facility.prefecture_id,
    (facility) => `${facility.id}`,
    limit,
  );
}

function selectDiverseEvents(
  candidates: readonly EventItem[],
  score: (event: EventItem) => number,
  limit: number,
): EventItem[] {
  return selectDiverse(
    candidates,
    score,
    (event) => event.prefecture,
    (event) => event.id,
    limit,
  );
}

function selectDiverse<T>(
  candidates: readonly T[],
  score: (item: T) => number,
  group: (item: T) => string,
  stableKey: (item: T) => string,
  limit: number,
): T[] {
  const ordered = [...candidates].sort(
    (left, right) =>
      score(right) - score(left) ||
      stableKey(left).localeCompare(stableKey(right), "ja"),
  );
  const selected: T[] = [];
  const selectedKeys = new Set<string>();
  const usedGroups = new Set<string>();

  for (const item of ordered) {
    const itemGroup = group(item);
    if (usedGroups.has(itemGroup)) continue;
    selected.push(item);
    selectedKeys.add(stableKey(item));
    usedGroups.add(itemGroup);
    if (selected.length === limit) return selected;
  }

  for (const item of ordered) {
    if (selectedKeys.has(stableKey(item))) continue;
    selected.push(item);
    if (selected.length === limit) break;
  }

  return selected;
}

function buildRainyReason(facility: Facility): string {
  const fact = getFacilityFact(facility);
  const indoorFact =
    facility.indoor_outdoor === "屋内" || facility.tags.includes("完全屋内")
      ? "屋内"
      : facility.category;
  return `この連休の雨対応「◎」の${indoorFact}施設。見どころは「${fact}」です。`;
}

function buildFullDayReason(facility: Facility): string {
  const thingsCount = facility.things_to_do?.length ?? 0;
  const fact = getFacilityFact(facility);

  if (thingsCount >= 5) {
    return `${facility.category}で、遊び方を${thingsCount}種類掲載。「${fact}」などを選べます。`;
  }

  if (thingsCount <= 1) {
    return `データ上の施設分類は「${facility.category}」。紹介の見どころは「${fact}」です。`;
  }

  return `${facility.category}として掲載。「${fact}」など複数の見どころがあります。`;
}

function buildBudgetReason(facility: Facility): string {
  const freeFact = facility.is_free ? "料金区分が無料" : "「無料」タグ付き";
  return `この連休に、${freeFact}の${facility.category}。「${getFacilityFact(facility)}」を楽しめます。`;
}

function buildEventReason(event: EventItem): string {
  if (!event.start_date || !event.end_date) return "";
  const start = formatMonthDay(event.start_date);
  const end = formatMonthDay(event.end_date);
  const eventFact = compactText(
    event.summary,
    event.start_date === event.end_date ? 22 : 18,
  );

  if (event.start_date === event.end_date) {
    return `開催日は${start}。内容は「${eventFact}」です。`;
  }

  return `開催期間は${start}〜${end}。内容は「${eventFact}」です。`;
}

function getFacilityFact(facility: Facility): string {
  const source =
    facility.things_to_do?.[0] ??
    facility.unique_selling_point ??
    facility.description;
  return compactText(source, 16);
}

function compactText(value: string, maxLength: number): string {
  const normalized = value.replace(/\s+/gu, " ").replace(/[。．、,]+$/gu, "").trim();
  return normalized.length > maxLength
    ? `${normalized.slice(0, maxLength)}…`
    : normalized;
}

function formatMonthDay(date: string): string {
  const [, month, day] = date.split("-").map(Number);
  return `${month}月${day}日`;
}
