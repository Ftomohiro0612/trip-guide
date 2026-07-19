export const SUMMER_CROSSLINK_RULESET_VERSION = "summer-crosslink-v1";

export const EVENT_TO_FACILITY_INITIAL_LIMIT = 3;
export const EVENT_TO_FACILITY_MAX_LIMIT = 5;
export const EVENT_TO_FACILITY_PRIMARY_RADIUS_KM = 10;
export const EVENT_TO_FACILITY_EXTENDED_RADIUS_KM = 15;
export const FACILITY_TO_EVENT_MAX_LIMIT = 3;
export const FACILITY_TO_EVENT_RADIUS_KM = 15;
export const FACILITY_TO_EVENT_WINDOW_DAYS = 30;

export type CrosslinkDirection =
  | "event_to_facility"
  | "facility_to_event";

export type CrosslinkDistanceCalculator = (
  from: readonly [number, number],
  to: readonly [number, number],
) => number;

export interface CrosslinkFacilityInput {
  id: number;
  slug: string;
  name: string;
  category: string;
  latitude?: number | null;
  longitude?: number | null;
  recommended_for_tags?: readonly string[];
  rain_friendly: string;
  indoor_outdoor: string;
  data_quality_status?: string;
}

export interface CrosslinkEventInput {
  id: string;
  facility_id: number | null;
  title: string;
  event_type?: string;
  recommended_for_tags?: readonly string[];
  nextDate: string | null;
}

export interface CrosslinkLocationInput {
  latitude: number | null;
  longitude: number | null;
  coordinate_precision: string;
  coordinate_reference: string;
}

export interface EventFacilityRecommendation {
  facilityId: number;
  facilitySlug: string;
  facilityName: string;
  category: string;
  distanceKm: number;
  distanceBand: "within_10km" | "extended_10_to_15km";
  matchedTagCount: number;
  isRainOption: boolean;
}

export interface FacilityEventRecommendation {
  eventId: string;
  title: string;
  eventType: string | null;
  nextDate: string;
  distanceKm: number;
  distanceBand: "within_5km" | "within_10km" | "within_15km";
  matchedTagCount: number;
}

export interface SummerCrosslinkResult {
  rulesetVersion: typeof SUMMER_CROSSLINK_RULESET_VERSION;
  eventToFacilities: Record<string, EventFacilityRecommendation[]>;
  facilityToEvents: Record<string, FacilityEventRecommendation[]>;
  diagnostics: SummerCrosslinkDiagnostics;
}

export interface SummerCrosslinkDiagnostics {
  inputEventCount: number;
  mappableEventCount: number;
  holdEventCount: number;
  nullOrInvalidEventCoordinateCount: number;
  missingLocationCount: number;
  inputFacilityCount: number;
  publicFacilityCount: number;
  excludedFacilityCount: number;
  invalidFacilityCoordinateCount: number;
  eventToFacilityEventCount: number;
  eventToFacilityRecommendationCount: number;
  eventToFacilitySelfExclusionCount: number;
  facilityToEventFacilityCount: number;
  facilityToEventThreeCandidateCount: number;
  facilityToEventRecommendationCount: number;
  facilityToEventSelfExclusionCount: number;
}

interface SummerCrosslinkInput {
  events: readonly CrosslinkEventInput[];
  facilities: readonly CrosslinkFacilityInput[];
  locationsByEventId: Readonly<Record<string, CrosslinkLocationInput>>;
  today: string;
  calculateDistanceKm: CrosslinkDistanceCalculator;
}

interface RankedFacilityCandidate extends EventFacilityRecommendation {
  rankIndex: number;
}

export function deriveSummerCrosslinks({
  events,
  facilities,
  locationsByEventId,
  today,
  calculateDistanceKm,
}: SummerCrosslinkInput): SummerCrosslinkResult {
  const publicFacilities = facilities.filter(isPublicFacility);
  const validFacilities = publicFacilities.filter(hasValidCoordinates);
  const mappableEvents = events.flatMap((event) => {
    const location = locationsByEventId[event.id];
    return isMappableLocation(location) ? [{ event, location }] : [];
  });
  const eventToFacilities: Record<string, EventFacilityRecommendation[]> = {};
  let eventToFacilitySelfExclusionCount = 0;

  for (const { event, location } of mappableEvents) {
    const venueFacilityIds = getVenueFacilityIds(event, location);
    eventToFacilitySelfExclusionCount += validFacilities.filter((facility) =>
      venueFacilityIds.has(facility.id),
    ).length;
    const recommendations = selectFacilitiesForEvent(
      event,
      location,
      validFacilities,
      calculateDistanceKm,
    );
    if (recommendations.length > 0) {
      eventToFacilities[event.id] = recommendations;
    }
  }

  const facilityToEvents: Record<string, FacilityEventRecommendation[]> = {};
  let facilityToEventSelfExclusionCount = 0;
  for (const facility of validFacilities) {
    facilityToEventSelfExclusionCount += mappableEvents.filter(
      ({ event, location }) =>
        getVenueFacilityIds(event, location).has(facility.id),
    ).length;
    const recommendations = selectEventsForFacility(
      facility,
      mappableEvents,
      today,
      calculateDistanceKm,
    );
    if (recommendations.length > 0) {
      facilityToEvents[String(facility.id)] = recommendations;
    }
  }

  const locationExclusions = countLocationExclusions(events, locationsByEventId);
  const facilityToEventLists = Object.values(facilityToEvents);

  return {
    rulesetVersion: SUMMER_CROSSLINK_RULESET_VERSION,
    eventToFacilities,
    facilityToEvents,
    diagnostics: {
      inputEventCount: events.length,
      mappableEventCount: mappableEvents.length,
      ...locationExclusions,
      inputFacilityCount: facilities.length,
      publicFacilityCount: publicFacilities.length,
      excludedFacilityCount: facilities.length - publicFacilities.length,
      invalidFacilityCoordinateCount:
        publicFacilities.length - validFacilities.length,
      eventToFacilityEventCount: Object.keys(eventToFacilities).length,
      eventToFacilityRecommendationCount: sumRecommendationCount(
        Object.values(eventToFacilities),
      ),
      eventToFacilitySelfExclusionCount,
      facilityToEventFacilityCount: facilityToEventLists.length,
      facilityToEventThreeCandidateCount: facilityToEventLists.filter(
        (recommendations) =>
          recommendations.length === FACILITY_TO_EVENT_MAX_LIMIT,
      ).length,
      facilityToEventRecommendationCount: sumRecommendationCount(
        facilityToEventLists,
      ),
      facilityToEventSelfExclusionCount,
    },
  };
}

export function selectFacilitiesForEvent(
  event: CrosslinkEventInput,
  location: CrosslinkLocationInput,
  facilities: readonly CrosslinkFacilityInput[],
  calculateDistanceKm: CrosslinkDistanceCalculator,
): EventFacilityRecommendation[] {
  if (!isMappableLocation(location)) return [];
  const venueFacilityIds = getVenueFacilityIds(event, location);
  const eventCoordinate = [location.latitude, location.longitude] as const;
  const candidates = facilities
    .filter(isPublicFacility)
    .filter(hasValidCoordinates)
    .filter((facility) => !venueFacilityIds.has(facility.id))
    .flatMap((facility) => {
      const distanceKm = calculateDistanceKm(eventCoordinate, [
        facility.latitude,
        facility.longitude,
      ]);
      if (
        !Number.isFinite(distanceKm) ||
        distanceKm < 0 ||
        distanceKm > EVENT_TO_FACILITY_EXTENDED_RADIUS_KM
      ) {
        return [];
      }
      return [
        {
          facilityId: facility.id,
          facilitySlug: facility.slug,
          facilityName: facility.name,
          category: facility.category,
          distanceKm,
          distanceBand:
            distanceKm <= EVENT_TO_FACILITY_PRIMARY_RADIUS_KM
              ? ("within_10km" as const)
              : ("extended_10_to_15km" as const),
          matchedTagCount: countMatchingTags(
            event.recommended_for_tags,
            facility.recommended_for_tags,
          ),
          isRainOption: isRainFacility(facility),
        },
      ];
    });
  const primaryCandidates = candidates.filter(
    (candidate) =>
      candidate.distanceKm <= EVENT_TO_FACILITY_PRIMARY_RADIUS_KM,
  );
  const rangeCandidates =
    primaryCandidates.length >= EVENT_TO_FACILITY_INITIAL_LIMIT
      ? primaryCandidates
      : candidates;
  const ranked = rangeCandidates
    .sort(compareFacilityCandidates)
    .map((candidate, rankIndex) => ({ ...candidate, rankIndex }));

  return ensureRainOptionInInitialResults(ranked)
    .slice(0, EVENT_TO_FACILITY_MAX_LIMIT)
    .map(
      ({
        facilityId,
        facilitySlug,
        facilityName,
        category,
        distanceKm,
        distanceBand,
        matchedTagCount,
        isRainOption,
      }) => ({
        facilityId,
        facilitySlug,
        facilityName,
        category,
        distanceKm,
        distanceBand,
        matchedTagCount,
        isRainOption,
      }),
    );
}

export function selectEventsForFacility(
  facility: CrosslinkFacilityInput,
  mappableEvents: readonly {
    event: CrosslinkEventInput;
    location: CrosslinkLocationInput;
  }[],
  today: string,
  calculateDistanceKm: CrosslinkDistanceCalculator,
): FacilityEventRecommendation[] {
  if (!isPublicFacility(facility) || !hasValidCoordinates(facility)) return [];
  const facilityCoordinate = [facility.latitude, facility.longitude] as const;

  return mappableEvents
    .flatMap(({ event, location }) => {
      if (!isMappableLocation(location)) return [];
      if (getVenueFacilityIds(event, location).has(facility.id)) return [];
      if (!isDateWithinDays(event.nextDate, today, FACILITY_TO_EVENT_WINDOW_DAYS)) {
        return [];
      }
      const distanceKm = calculateDistanceKm(facilityCoordinate, [
        location.latitude,
        location.longitude,
      ]);
      if (
        !Number.isFinite(distanceKm) ||
        distanceKm < 0 ||
        distanceKm > FACILITY_TO_EVENT_RADIUS_KM
      ) {
        return [];
      }
      return [
        {
          eventId: event.id,
          title: event.title,
          eventType: event.event_type ?? null,
          nextDate: event.nextDate as string,
          distanceKm,
          distanceBand: getEventDistanceBand(distanceKm),
          matchedTagCount: countMatchingTags(
            facility.recommended_for_tags,
            event.recommended_for_tags,
          ),
        },
      ];
    })
    .sort(compareEventCandidates)
    .slice(0, FACILITY_TO_EVENT_MAX_LIMIT);
}

export function extractReferencedFacilityIds(reference: string): number[] {
  const ids = new Set<number>();
  for (const pattern of [
    /(?:^|[#/])facility-(\d+)(?:$|[^\d])/giu,
    /facility[_-]?id\s*(?:=|:|#|\/|-)?\s*(\d+)/giu,
  ]) {
    for (const match of reference.matchAll(pattern)) {
      const value = Number(match[1]);
      if (Number.isSafeInteger(value) && value > 0) ids.add(value);
    }
  }
  return [...ids].sort((a, b) => a - b);
}

export function formatStraightLineDistance(distanceKm: number): string {
  const rounded =
    distanceKm < 10
      ? distanceKm.toFixed(1)
      : Math.round(distanceKm).toString();
  return `直線約${rounded}km`;
}

function getVenueFacilityIds(
  event: CrosslinkEventInput,
  location: CrosslinkLocationInput,
): Set<number> {
  const ids = new Set(extractReferencedFacilityIds(location.coordinate_reference));
  if (
    event.facility_id !== null &&
    Number.isSafeInteger(event.facility_id) &&
    event.facility_id > 0
  ) {
    ids.add(event.facility_id);
  }
  return ids;
}

function isPublicFacility(facility: CrosslinkFacilityInput): boolean {
  return facility.data_quality_status !== "exclude_candidate";
}

function hasValidCoordinates(
  item: CrosslinkFacilityInput,
): item is CrosslinkFacilityInput & { latitude: number; longitude: number } {
  return isValidCoordinate(item.latitude, item.longitude);
}

function isMappableLocation(
  location: CrosslinkLocationInput | undefined,
): location is CrosslinkLocationInput & {
  latitude: number;
  longitude: number;
} {
  return (
    location !== undefined &&
    location.coordinate_precision !== "hold" &&
    isValidCoordinate(location.latitude, location.longitude)
  );
}

function isValidCoordinate(
  latitude: number | null | undefined,
  longitude: number | null | undefined,
): latitude is number {
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

function isRainFacility(facility: CrosslinkFacilityInput): boolean {
  return facility.rain_friendly === "◎" || facility.indoor_outdoor === "屋内";
}

function countMatchingTags(
  left: readonly string[] | undefined,
  right: readonly string[] | undefined,
): number {
  const rightTags = new Set(right ?? []);
  return new Set(left ?? []).size === 0
    ? 0
    : [...new Set(left)].filter((tag) => rightTags.has(tag)).length;
}

function compareFacilityCandidates(
  a: EventFacilityRecommendation,
  b: EventFacilityRecommendation,
): number {
  return (
    facilityDistanceBandRank(a.distanceBand) -
      facilityDistanceBandRank(b.distanceBand) ||
    b.matchedTagCount - a.matchedTagCount ||
    a.distanceKm - b.distanceKm ||
    a.facilityId - b.facilityId
  );
}

function compareEventCandidates(
  a: FacilityEventRecommendation,
  b: FacilityEventRecommendation,
): number {
  return (
    eventDistanceBandRank(a.distanceBand) -
      eventDistanceBandRank(b.distanceBand) ||
    a.nextDate.localeCompare(b.nextDate) ||
    b.matchedTagCount - a.matchedTagCount ||
    a.distanceKm - b.distanceKm ||
    a.eventId.localeCompare(b.eventId)
  );
}

function ensureRainOptionInInitialResults(
  ranked: readonly RankedFacilityCandidate[],
): RankedFacilityCandidate[] {
  const initial = ranked.slice(0, EVENT_TO_FACILITY_INITIAL_LIMIT);
  if (
    initial.length < EVENT_TO_FACILITY_INITIAL_LIMIT ||
    initial.some((candidate) => candidate.isRainOption)
  ) {
    return [...ranked];
  }
  const rainCandidate = ranked.find((candidate) => candidate.isRainOption);
  if (!rainCandidate) return [...ranked];

  const promoted = [initial[0], initial[1], rainCandidate];
  const promotedIds = new Set(promoted.map((candidate) => candidate.facilityId));
  return [
    ...promoted,
    ...ranked.filter((candidate) => !promotedIds.has(candidate.facilityId)),
  ];
}

function getEventDistanceBand(
  distanceKm: number,
): FacilityEventRecommendation["distanceBand"] {
  if (distanceKm <= 5) return "within_5km";
  if (distanceKm <= 10) return "within_10km";
  return "within_15km";
}

function facilityDistanceBandRank(
  band: EventFacilityRecommendation["distanceBand"],
): number {
  return band === "within_10km" ? 0 : 1;
}

function eventDistanceBandRank(
  band: FacilityEventRecommendation["distanceBand"],
): number {
  if (band === "within_5km") return 0;
  if (band === "within_10km") return 1;
  return 2;
}

function isDateWithinDays(
  date: string | null,
  today: string,
  maximumDays: number,
): boolean {
  const dateMs = parseDateOnly(date);
  const todayMs = parseDateOnly(today);
  if (dateMs === null || todayMs === null) return false;
  const days = Math.floor((dateMs - todayMs) / 86_400_000);
  return days >= 0 && days <= maximumDays;
}

function parseDateOnly(value: string | null): number | null {
  if (value === null || !/^\d{4}-\d{2}-\d{2}$/u.test(value)) return null;
  const [year, month, day] = value.split("-").map(Number);
  const timestamp = Date.UTC(year, month - 1, day);
  const normalized = new Date(timestamp).toISOString().slice(0, 10);
  return normalized === value ? timestamp : null;
}

function countLocationExclusions(
  events: readonly CrosslinkEventInput[],
  locationsByEventId: Readonly<Record<string, CrosslinkLocationInput>>,
) {
  let holdEventCount = 0;
  let nullOrInvalidEventCoordinateCount = 0;
  let missingLocationCount = 0;
  for (const event of events) {
    const location = locationsByEventId[event.id];
    if (!location) {
      missingLocationCount += 1;
    } else if (location.coordinate_precision === "hold") {
      holdEventCount += 1;
    } else if (!isValidCoordinate(location.latitude, location.longitude)) {
      nullOrInvalidEventCoordinateCount += 1;
    }
  }
  return {
    holdEventCount,
    nullOrInvalidEventCoordinateCount,
    missingLocationCount,
  };
}

function sumRecommendationCount<T>(lists: readonly (readonly T[])[]): number {
  return lists.reduce((sum, recommendations) => sum + recommendations.length, 0);
}
