import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";

const root = process.cwd();
const base = readJson("data/events_data.json");
const summer = readJson("data/summer_events_2026.json");
const summerLocations = readJson("data/summer_event_locations_2026.json");
const summerLocationResearch = readJson(
  "data/summer_event_location_research_2026.json",
);
const facilities = readJson("data/facilities_data.json");
const summerPageSource = fs.readFileSync(
  path.join(root, "app/events/summer/page.tsx"),
  "utf8",
);
const summerMapSource = fs.readFileSync(
  path.join(root, "components/SummerEventMap.tsx"),
  "utf8",
);
const datePattern = /^\d{4}-\d{2}-\d{2}$/u;
const urlPattern = /^https?:\/\/\S+$/u;
const today = readToday(process.argv);
const isFreezeCheck = process.argv.includes("--freeze");
const errors = [];
const warnings = [];
const eventTypes = new Set([
  "fireworks",
  "summer_festival",
  "summer_tradition",
  "night_outing",
]);
const baseById = new Map(base.events.map((event) => [event.id, event]));
const newById = new Map(summer.events.map((event) => [event.id, event]));
const classificationsById = new Map(
  summer.existing_event_classifications.map((item) => [item.id, item]),
);
const requiredPrimaryHosts = new Map([
  ["evt-summer-2026-tokyo-007", "kagurazaka.in"],
  ["evt-summer-2026-tokyo-011", "tomiokahachimangu.or.jp"],
  ["evt-summer-2026-kanagawa-008", "pacifico.co.jp"],
]);

checkCount("metadata.new_event_count", summer.metadata.new_event_count, summer.events.length);
checkCount(
  "metadata.existing_event_count",
  summer.metadata.existing_event_count,
  summer.existing_event_classifications.length,
);
checkCount(
  "metadata.candidate_count",
  summer.metadata.candidate_count,
  summer.events.length + summer.existing_event_classifications.length,
);

checkUniqueIds(base.events, "events_data.json");
checkUniqueIds(summer.events, "summer_events_2026.json events");
checkUniqueIds(
  summer.existing_event_classifications,
  "summer_events_2026.json existing classifications",
);

for (const event of summer.events) {
  if (baseById.has(event.id)) error(event.id, "new event ID collides with base data");
  validateHubEvent(event, event.id);
}

for (const classification of summer.existing_event_classifications) {
  const baseEvent = baseById.get(classification.id);
  if (!baseEvent) error(classification.id, "classification references a missing base event");
  if (!eventTypes.has(classification.event_type)) {
    error(classification.id, `invalid event_type: ${classification.event_type}`);
  }
  validateFeatureHubs(classification, classification.id);
  validateOccurrenceDates(
    classification.occurrence_dates,
    baseEvent?.start_date,
    baseEvent?.end_date,
    classification.id,
  );
  if (classification.official_url) {
    validateSourceFields(classification, classification.id);
  }
}

for (const excludedId of summer.metadata.excluded_existing_event_ids) {
  if (!baseById.has(excludedId)) error(excludedId, "excluded ID is missing from base data");
  if (classificationsById.has(excludedId)) {
    error(excludedId, "excluded event must not also have a hub classification");
  }
}

for (const heroId of summer.metadata.hero_event_ids) {
  const event = mergedEvent(heroId);
  if (!event) {
    error(heroId, "hero candidate is missing from the adopted hub population");
    continue;
  }
  if (!isMainType(event.event_type)) {
    error(heroId, "hero candidate must be fireworks or summer_festival");
  }
}

if (new Set(summer.metadata.hero_event_ids).size !== summer.metadata.hero_event_ids.length) {
  errors.push("metadata.hero_event_ids contains duplicates");
}
if (summer.metadata.hero_event_ids.length !== 12) {
  errors.push(`metadata.hero_event_ids expected 12, received ${summer.metadata.hero_event_ids.length}`);
}

const adoptedEvents = [
  ...summer.events,
  ...summer.existing_event_classifications.map((classification) =>
    mergedEvent(classification.id),
  ),
].filter(Boolean);
for (const event of adoptedEvents) {
  validateSourceFields(event, event.id);
  validateFreeAndReservation(event, event.id);
  if (
    event.facility_id === null &&
    (typeof event.venue_name !== "string" || event.venue_name.trim() === "")
  ) {
    error(event.id, "facility_id=null requires a non-empty venue_name");
  }
  if (isFreezeCheck && event.end_date < today) {
    error(event.id, `freeze population contains an ended event (${event.end_date})`);
  }
  if (
    isFreezeCheck &&
    ["cancelled", "canceled", "postponed"].includes(event.status)
  ) {
    error(event.id, `freeze population contains status=${event.status}`);
  }
}

const canonicalEvents = [
  ...base.events.map((event) => ({
    ...event,
    ...classificationsById.get(event.id),
  })),
  ...summer.events,
];
for (const event of canonicalEvents) {
  validateRequiredReservationGate(event, event.id);
}
const canonicalReservationCounts = countReservations(canonicalEvents);
const summerReservationCounts = countReservations(adoptedEvents);

for (const [id, requiredHost] of requiredPrimaryHosts) {
  const event = adoptedEvents.find((candidate) => candidate.id === id);
  if (!event) continue;
  let actualHost = "";
  try {
    actualHost = new URL(event.official_url).hostname;
  } catch {
    // The shared source validator reports the invalid URL.
  }
  if (!(actualHost === requiredHost || actualHost.endsWith(`.${requiredHost}`))) {
    error(id, `official_url must use organizer/venue host ${requiredHost}`);
  }
}

const allowedCoordinatePrecisions = new Set([
  "exact_venue",
  "area_representative",
  "geocoded_venue",
  "hold",
]);
const locationEntries = Object.entries(
  summerLocations.locations_by_event_id ?? {},
);
const adoptedById = new Map(adoptedEvents.map((event) => [event.id, event]));
const facilityIds = new Set(facilities.facilities.map((facility) => facility.id));
let mappableLocationCount = 0;
let holdLocationCount = 0;
const nonHoldCoordinateMissingEventIds = new Set();
const mappedPrefectures = new Set();

checkCount(
  "summer location metadata.overlay_count",
  summerLocations.metadata?.overlay_count,
  locationEntries.length,
);
validateDate(
  summerLocations.metadata?.source_checked_at,
  "summer location metadata.source_checked_at",
);
if (
  datePattern.test(summerLocations.metadata?.source_checked_at ?? "") &&
  summerLocations.metadata.source_checked_at > today
) {
  errors.push("summer location metadata.source_checked_at must not be in the future");
}
const declaredPrecisions = summerLocations.metadata?.coordinate_precision_values;
if (
  !Array.isArray(declaredPrecisions) ||
  declaredPrecisions.length !== allowedCoordinatePrecisions.size ||
  declaredPrecisions.some((value) => !allowedCoordinatePrecisions.has(value))
) {
  errors.push(
    "summer location metadata.coordinate_precision_values must declare exact_venue, area_representative, geocoded_venue, and hold",
  );
}

for (const [eventId, location] of locationEntries) {
  const event = adoptedById.get(eventId);
  if (!event) {
    error(eventId, "location overlay references an event outside the adopted Summer Hub population");
    continue;
  }
  if (!allowedCoordinatePrecisions.has(location.coordinate_precision)) {
    error(eventId, `invalid coordinate_precision: ${location.coordinate_precision}`);
  }
  if (typeof location.map_label !== "string" || location.map_label.trim() === "") {
    error(eventId, "map_label must not be empty");
  }
  if (
    !Array.isArray(location.location_source_urls) ||
    location.location_source_urls.length === 0 ||
    location.location_source_urls.some((value) => !urlPattern.test(value))
  ) {
    error(eventId, "location_source_urls must contain valid source URLs");
  }
  if (
    typeof location.location_basis !== "string" ||
    location.location_basis.trim() === ""
  ) {
    error(eventId, "location_basis must not be empty");
  }
  if (
    typeof location.coordinate_reference !== "string" ||
    location.coordinate_reference.trim() === ""
  ) {
    error(eventId, "coordinate_reference must not be empty");
  }
  validateDate(location.source_checked_at, `${eventId}.location.source_checked_at`);
  if (
    datePattern.test(location.source_checked_at ?? "") &&
    location.source_checked_at > today
  ) {
    error(eventId, `location source_checked_at is in the future: ${location.source_checked_at}`);
  }

  if (location.coordinate_precision === "hold") {
    holdLocationCount += 1;
    if (location.latitude !== null || location.longitude !== null) {
      error(eventId, "hold locations must use latitude=null and longitude=null");
    }
    continue;
  }

  mappableLocationCount += 1;
  mappedPrefectures.add(event.prefecture);
  if (
    typeof location.latitude !== "number" ||
    !Number.isFinite(location.latitude) ||
    location.latitude < 20 ||
    location.latitude > 46
  ) {
    nonHoldCoordinateMissingEventIds.add(eventId);
    error(eventId, `latitude is outside the supported Japan bounds: ${location.latitude}`);
  }
  if (
    typeof location.longitude !== "number" ||
    !Number.isFinite(location.longitude) ||
    location.longitude < 122 ||
    location.longitude > 154
  ) {
    nonHoldCoordinateMissingEventIds.add(eventId);
    error(eventId, `longitude is outside the supported Japan bounds: ${location.longitude}`);
  }
  if (
    location.coordinate_precision === "area_representative" &&
    !/代表点/u.test(`${location.map_label} ${location.location_basis}`)
  ) {
    error(eventId, "area_representative must explicitly state that it is a representative point");
  }
  if (location.coordinate_precision === "geocoded_venue") {
    const facilityMatch = location.coordinate_reference.match(/facility-(\d+)$/u);
    if (!facilityMatch || Number(facilityMatch[1]) !== event.facility_id) {
      error(eventId, "geocoded_venue must reference the event's real facility_id");
    }
  }
}

checkCount(
  "summer location metadata.mappable_count",
  summerLocations.metadata?.mappable_count,
  mappableLocationCount,
);
checkCount(
  "summer location metadata.hold_count",
  summerLocations.metadata?.hold_count,
  holdLocationCount,
);
const missingLocationEventIds = adoptedEvents
  .filter((event) => !summerLocations.locations_by_event_id?.[event.id])
  .map((event) => event.id);
const coordinateMissingLocationCount = locationEntries.filter(
  ([, location]) =>
    typeof location.latitude !== "number" ||
    typeof location.longitude !== "number",
).length;
if (locationEntries.length !== adoptedEvents.length) {
  errors.push(
    `summer map location records=${locationEntries.length}; expected all ${adoptedEvents.length} adopted events`,
  );
}
if (mappableLocationCount + holdLocationCount !== adoptedEvents.length) {
  errors.push(
    `summer map mappable+hold=${mappableLocationCount + holdLocationCount}; expected ${adoptedEvents.length}`,
  );
}
if (missingLocationEventIds.length > 0) {
  errors.push(
    `summer map is missing ${missingLocationEventIds.length} event IDs: ${missingLocationEventIds.join(", ")}`,
  );
}
if ("pilot_target_range" in (summerLocations.metadata ?? {})) {
  errors.push("summer map metadata must not retain pilot_target_range");
}

const visibleAdoptedEvents = adoptedEvents.filter((event) =>
  isVisibleSummerHubEvent(event, today, facilityIds),
);
const visibleMappedEvents = visibleAdoptedEvents.filter((event) =>
  isMappableLocation(summerLocations.locations_by_event_id?.[event.id]),
);
const visibleHoldEvents = visibleAdoptedEvents.filter(
  (event) =>
    summerLocations.locations_by_event_id?.[event.id]?.coordinate_precision ===
    "hold",
);
const visibleMissingLocationEvents = visibleAdoptedEvents.filter(
  (event) => !summerLocations.locations_by_event_id?.[event.id],
);

validateSummerMapUiContract(summerPageSource, summerMapSource);
validateSummerLocationResearch(
  summerLocationResearch,
  summerLocations.locations_by_event_id ?? {},
  adoptedById,
);

const typeCounts = Object.fromEntries(
  [...eventTypes].map((type) => [
    type,
    adoptedEvents.filter((event) => event.event_type === type).length,
  ]),
);
const mainCount = typeCounts.fireworks + typeCounts.summer_festival;
const nightCount = typeCounts.night_outing;
const mainRatio = adoptedEvents.length === 0 ? 0 : mainCount / adoptedEvents.length;
const nightRatio = adoptedEvents.length === 0 ? 0 : nightCount / adoptedEvents.length;
const prefectureTypeCounts = Object.fromEntries(
  ["tokyo", "kanagawa", "chiba", "saitama"].map((prefecture) => [
    prefecture,
    {
      ...Object.fromEntries(
        [...eventTypes].map((type) => [
          type,
          adoptedEvents.filter(
            (event) =>
              event.prefecture === prefecture && event.event_type === type,
          ).length,
        ]),
      ),
      total: adoptedEvents.filter((event) => event.prefecture === prefecture)
        .length,
    },
  ]),
);
const nullFacilityCount = adoptedEvents.filter(
  (event) => event.facility_id === null,
).length;
const occurrenceDatesCount = adoptedEvents.filter(
  (event) =>
    Array.isArray(event.occurrence_dates) && event.occurrence_dates.length > 0,
).length;
const freeCount = adoptedEvents.filter((event) => event.is_free === true).length;
const noReservationCount = adoptedEvents.filter(
  (event) => event.reservation === "not_required",
).length;

if (mainRatio < 0.7) errors.push(`main-event ratio is ${(mainRatio * 100).toFixed(1)}%; expected >= 70%`);
if (nightRatio > 0.2) errors.push(`night-outing ratio is ${(nightRatio * 100).toFixed(1)}%; expected <= 20%`);

const maxEndDate = adoptedEvents
  .map((event) => event.end_date)
  .filter((value) => datePattern.test(value ?? ""))
  .sort()
  .at(-1);
const expectedEndsAt = maxEndDate
  ? `${addDays(maxEndDate, 1)}T00:00:00+09:00`
  : null;
if (summer.metadata.ends_at !== expectedEndsAt) {
  errors.push(
    `metadata.ends_at=${summer.metadata.ends_at}; expected ${expectedEndsAt} from final adopted end date ${maxEndDate}`,
  );
}
if (Number.isNaN(Date.parse(summer.metadata.starts_at))) {
  errors.push("metadata.starts_at must be an offset-aware ISO 8601 timestamp");
}
if (Number.isNaN(Date.parse(summer.metadata.ends_at))) {
  errors.push("metadata.ends_at must be an offset-aware ISO 8601 timestamp");
}

const freshnessRows = adoptedEvents.map((event) => {
  const age = daysBetween(event.source_checked_at, today);
  const isHero = summer.metadata.hero_event_ids.includes(event.id);
  const nextOccurrence = getNextOccurrenceDate(event, today);
  const daysUntilNext = nextOccurrence
    ? daysBetween(today, nextOccurrence)
    : null;
  const firstOccurrence = getFirstOccurrenceDate(event);
  const daysUntilFirst = firstOccurrence
    ? daysBetween(today, firstOccurrence)
    : null;
  const isEnded = event.end_date < today;
  const isWeatherSensitive = isMainType(event.event_type);
  const maxAge = summer.metadata.freshness_days_hub;
  const preStartReviewOpensAt = firstOccurrence
    ? addDays(firstOccurrence, -7)
    : null;
  const preStartReviewDueAt = firstOccurrence
    ? addDays(firstOccurrence, -5)
    : null;
  const hasPreStartReview = Boolean(
    preStartReviewOpensAt &&
      firstOccurrence &&
      event.source_checked_at >= preStartReviewOpensAt &&
      event.source_checked_at <= firstOccurrence,
  );
  const isPreStartReviewDue = Boolean(
    !isEnded &&
      daysUntilFirst !== null &&
      daysUntilFirst > 0 &&
      daysUntilFirst <= 5 &&
      !hasPreStartReview,
  );
  if (age === null) {
    error(event.id, `invalid source_checked_at: ${event.source_checked_at}`);
  } else if (age < 0) {
    error(event.id, `source_checked_at is in the future: ${event.source_checked_at}`);
  } else if (!isEnded && age > maxAge) {
    warnings.push(
      `${event.id}: source confirmation is ${age} days old; monthly review target is ${maxAge} days`,
    );
  }
  if (isPreStartReviewDue) {
    warnings.push(
      `${event.id}: pre-start source review is due around ${preStartReviewDueAt}; confirm once before the first occurrence ${firstOccurrence}`,
    );
  }
  const cadenceDueAt = isEnded
    ? null
    : addDays(event.source_checked_at, maxAge);
  const pendingPreStartDueAt =
    !isEnded &&
    daysUntilFirst !== null &&
    daysUntilFirst > 0 &&
    !hasPreStartReview
      ? preStartReviewDueAt
      : null;
  const dueAt = [cadenceDueAt, pendingPreStartDueAt]
    .filter(Boolean)
    .sort()[0];
  return {
    id: event.id,
    title: event.title,
    source_checked_at: event.source_checked_at,
    age_days: age,
    first_occurrence: firstOccurrence,
    days_until_first: daysUntilFirst,
    next_occurrence: nextOccurrence,
    days_until_next: daysUntilNext,
    due_at: dueAt,
    cadence_days: maxAge,
    hero: isHero,
    pre_start_review_due_at: preStartReviewDueAt,
    pre_start_review_completed: hasPreStartReview,
    weather_sensitive: isWeatherSensitive,
    review_tier: isEnded
      ? "ended-hidden"
      : isPreStartReviewDue
        ? "prestart-5d-due"
        : hasPreStartReview && daysUntilFirst !== null && daysUntilFirst >= 0
          ? "prestart-reviewed"
          : "monthly-30d",
  };
});

const nextReviewAt = freshnessRows
  .map((row) => row.due_at)
  .filter(Boolean)
  .sort()[0];
const summary = {
  today,
  base_events: base.events.length,
  new_events: summer.events.length,
  existing_classifications: summer.existing_event_classifications.length,
  adopted_candidates: adoptedEvents.length,
  type_counts: typeCounts,
  prefecture_type_counts: prefectureTypeCounts,
  main_ratio_percent: Number((mainRatio * 100).toFixed(1)),
  night_ratio_percent: Number((nightRatio * 100).toFixed(1)),
  null_facility_events: nullFacilityCount,
  occurrence_dates_events: occurrenceDatesCount,
  free_filter_events: freeCount,
  canonical_reservation_counts: canonicalReservationCounts,
  summer_reservation_counts: summerReservationCounts,
  no_reservation_filter_events: noReservationCount,
  hero_pool: summer.metadata.hero_event_ids.length,
  summer_map_overlay_events: locationEntries.length,
  summer_map_mappable_events: mappableLocationCount,
  summer_map_hold_events: holdLocationCount,
  summer_map_coordinate_missing_events: coordinateMissingLocationCount,
  summer_map_non_hold_coordinate_missing_events:
    nonHoldCoordinateMissingEventIds.size,
  summer_map_missing_location_records: missingLocationEventIds.length,
  summer_map_visible_events: visibleAdoptedEvents.length,
  summer_map_visible_mappable_events: visibleMappedEvents.length,
  summer_map_visible_hold_events: visibleHoldEvents.length,
  summer_map_visible_missing_location_records:
    visibleMissingLocationEvents.length,
  summer_map_prefectures: [...mappedPrefectures].sort(),
  max_end_date: maxEndDate,
  ends_at: summer.metadata.ends_at,
  next_source_review_due: nextReviewAt,
  freeze_check: isFreezeCheck,
  warnings: warnings.length,
  errors: errors.length,
};

if (process.argv.includes("--json")) {
  console.log(JSON.stringify({ summary, freshness: freshnessRows, errors, warnings }, null, 2));
} else {
  console.log("Summer Events validation");
  console.log(JSON.stringify(summary, null, 2));
  if (warnings.length > 0) {
    console.warn("Warnings:");
    for (const warning of warnings) console.warn(`- ${warning}`);
  }
  if (errors.length > 0) {
    console.error("Errors:");
    for (const item of errors) console.error(`- ${item}`);
  }
}

if (errors.length > 0) process.exitCode = 1;

function validateHubEvent(event, label) {
  if (event.facility_id !== null) error(label, "new street event must use facility_id=null");
  if (typeof event.venue_name !== "string" || event.venue_name.trim() === "") {
    error(label, "facility_id=null requires a non-empty venue_name");
  }
  if (!eventTypes.has(event.event_type)) error(label, `invalid event_type: ${event.event_type}`);
  validateFeatureHubs(event, label);
  validateDate(event.start_date, `${label}.start_date`);
  validateDate(event.end_date, `${label}.end_date`);
  if (event.end_date < event.start_date) error(label, "end_date is before start_date");
  validateOccurrenceDates(
    event.occurrence_dates,
    event.start_date,
    event.end_date,
    label,
  );
  validateSourceFields(event, label);
  validateFreeAndReservation(event, label);
}

function validateFeatureHubs(event, label) {
  if (!Array.isArray(event.feature_hubs) || event.feature_hubs.length !== 1) {
    error(label, "feature_hubs must contain exactly summer-2026");
    return;
  }
  if (event.feature_hubs[0] !== summer.metadata.hub_id) {
    error(label, `unexpected feature hub: ${event.feature_hubs.join(",")}`);
  }
}

function validateSourceFields(event, label) {
  if (!urlPattern.test(event.official_url ?? "")) error(label, "official_url is invalid");
  if (!Array.isArray(event.source_urls) || event.source_urls.length === 0) {
    error(label, "source_urls must not be empty");
  } else if (event.source_urls[0] !== event.official_url) {
    error(label, "official_url must be the first source_urls entry");
  }
  validateDate(event.source_checked_at, `${label}.source_checked_at`);
}

function validateFreeAndReservation(event, label) {
  if (event.is_free === true && !String(event.price_label ?? "").includes("無料")) {
    error(label, "is_free=true requires price_label to state the free viewing method");
  }
  if (
    event.is_free === true &&
    String(event.price_label ?? "").includes("有料席") &&
    !/(沿道|一般|観覧|入場).*無料|無料.*(沿道|一般|観覧|入場)/u.test(
      event.price_label,
    )
  ) {
    error(label, "paid-seat coexistence requires an explicit free general-viewing method");
  }
  if (
    event.reservation === "not_required" &&
    !/(予約不要|自由参加|予約[^。]*なし)/u.test(
      String(event.reservation_label ?? ""),
    )
  ) {
    error(
      label,
      "reservation=not_required requires a label that explicitly states no reservation or free participation",
    );
  }
}

function validateRequiredReservationGate(event, label) {
  if (event.reservation !== "required") return;
  if (String(event.reservation_label ?? "").trim() === "") {
    error(label, "reservation=required requires a non-empty reservation_label");
  }
  if (!urlPattern.test(String(event.official_url ?? "").trim())) {
    error(label, "reservation=required requires a valid official_url");
  }
}

function countReservations(events) {
  const counts = { required: 0, not_required: 0, unknown: 0 };
  for (const event of events) {
    if (event.reservation in counts) counts[event.reservation] += 1;
  }
  return counts;
}

function validateOccurrenceDates(values, startDate, endDate, label) {
  if (values === undefined) return;
  if (!Array.isArray(values) || values.length === 0) {
    error(label, "occurrence_dates must be a non-empty array when present");
    return;
  }
  const sorted = [...values].sort();
  if (values.some((value, index) => value !== sorted[index])) {
    error(label, "occurrence_dates must be sorted ascending");
  }
  if (new Set(values).size !== values.length) {
    error(label, "occurrence_dates must not contain duplicates");
  }
  for (const value of values) {
    validateDate(value, `${label}.occurrence_dates`);
    if (startDate && value < startDate) error(label, `${value} is before start_date`);
    if (endDate && value > endDate) error(label, `${value} is after end_date`);
  }
}

function mergedEvent(id) {
  const newEvent = newById.get(id);
  if (newEvent) return newEvent;
  const baseEvent = baseById.get(id);
  const classification = classificationsById.get(id);
  if (!baseEvent || !classification) return null;
  return { ...baseEvent, ...classification };
}

function isMainType(value) {
  return value === "fireworks" || value === "summer_festival";
}

function isVisibleSummerHubEvent(event, referenceDate, validFacilityIds) {
  const checkedAgeDays = daysBetween(event.source_checked_at, referenceDate);
  const status = event.status ?? "scheduled";
  const hasValidVenue =
    event.facility_id === null && Boolean(event.venue_name?.trim());
  const hasValidFacility =
    event.facility_id !== null && validFacilityIds.has(event.facility_id);
  const hasRemainingOccurrence =
    !event.occurrence_dates ||
    getNextOccurrenceDate(event, referenceDate) !== null;

  return (
    ["scheduled", "ongoing"].includes(status) &&
    (event.end_date === null || event.end_date >= referenceDate) &&
    checkedAgeDays !== null &&
    checkedAgeDays >= 0 &&
    checkedAgeDays <= summer.metadata.freshness_days_hub &&
    urlPattern.test(event.official_url.trim()) &&
    (hasValidFacility || hasValidVenue) &&
    hasRemainingOccurrence
  );
}

function isMappableLocation(location) {
  return (
    location?.coordinate_precision !== "hold" &&
    typeof location?.latitude === "number" &&
    Number.isFinite(location.latitude) &&
    typeof location?.longitude === "number" &&
    Number.isFinite(location.longitude)
  );
}

function validateSummerMapUiContract(pageSource, mapSource) {
  const requiredPagePatterns = [
    [
      /buildSummerEventMapPoints\(visibleEvents, today\)/u,
      "map points must use the same visibleEvents date population as the list",
    ],
    [
      /getSummerEventMapCoverage\(visibleEvents, mapPoints\)/u,
      "map UI counts must come from the shared coverage calculation",
    ],
    [
      /data-summer-map-listed-count=\{mapCoverage\.listedCount\}/u,
      "map UI must expose the calculated listed count",
    ],
    [
      /data-summer-map-mapped-count=\{mapCoverage\.mappedCount\}/u,
      "map UI must expose the calculated mapped count",
    ],
    [
      /data-summer-map-unmapped-count=\{mapCoverage\.unmappedCount\}/u,
      "map UI must expose the calculated unmapped count",
    ],
    [
      /<SummerEventExplorer\s+views=\{views\}/su,
      "unmapped events must remain in the full SummerEventExplorer list",
    ],
  ];
  for (const [pattern, message] of requiredPagePatterns) {
    if (!pattern.test(pageSource)) errors.push(`summer map UI contract: ${message}`);
  }
  if (/主要イベント|map pilot|パイロット/u.test(pageSource)) {
    errors.push("summer map UI must not describe coordinate coverage as major events or a pilot");
  }
  if (!/displayedPoints\.map\(\(point\)/u.test(mapSource)) {
    errors.push("summer map UI must render one marker per displayed map point");
  }
  if (!/\{points\.length\}件を表示中/u.test(mapSource)) {
    errors.push("summer map badge must use the same dynamic map-points count");
  }
  if (!/SUMMER_EVENT_MAP_CATEGORY_STYLES\.map/u.test(mapSource)) {
    errors.push("summer map UI must render its legend from the category color contract");
  }
}

function validateSummerLocationResearch(research, locationsByEventId, eventsById) {
  if (research.metadata?.production_baseline !== "f529a19c93593e883c9f35a20544d7f86dc8f276") {
    errors.push("summer location research must retain the accepted Production baseline");
  }
  if (research.metadata?.population_hold_count_at_start !== 454) {
    errors.push("summer location research must retain the 454-event starting population");
  }
  if (
    research.metadata?.no_guess_policy !== true ||
    research.metadata?.unsafe_locations_remain_hold !== true
  ) {
    errors.push("summer location research must enforce no-guess and unsafe-stays-hold policies");
  }

  const checkpoints = research.checkpoints;
  if (!Array.isArray(checkpoints) || checkpoints.length === 0) {
    errors.push("summer location research must contain at least one checkpoint");
    return;
  }

  let previousTarget = 0;
  for (const checkpoint of checkpoints) {
    if (
      !Number.isInteger(checkpoint.target) ||
      checkpoint.target <= previousTarget ||
      ![100, 200, 300, 400, 454].includes(checkpoint.target)
    ) {
      errors.push(`invalid summer location research checkpoint target: ${checkpoint.target}`);
    }
    previousTarget = checkpoint.target;
    validateDate(
      checkpoint.checked_at,
      `summer location checkpoint ${checkpoint.target}.checked_at`,
    );
    if (checkpoint.status !== "complete") {
      errors.push(`summer location checkpoint ${checkpoint.target} must be complete once committed`);
    }
    if (checkpoint.pm_random_sample_size !== 10) {
      errors.push(`summer location checkpoint ${checkpoint.target} must request a PM random sample of 10`);
    }

    const reviewed = checkpoint.reviewed_events;
    if (!Array.isArray(reviewed)) {
      errors.push(`summer location checkpoint ${checkpoint.target} reviewed_events must be an array`);
      continue;
    }
    checkCount(
      `summer location checkpoint ${checkpoint.target}.reviewed_count`,
      checkpoint.reviewed_count,
      reviewed.length,
    );
    checkCount(
      `summer location checkpoint ${checkpoint.target}.target`,
      checkpoint.target,
      reviewed.length,
    );
    const reviewedIds = reviewed.map((item) => item.event_id);
    if (new Set(reviewedIds).size !== reviewedIds.length) {
      errors.push(`summer location checkpoint ${checkpoint.target} contains duplicate event IDs`);
    }
    checkCount(
      `summer location checkpoint ${checkpoint.target}.mappable_count`,
      checkpoint.mappable_count,
      reviewed.filter((item) => item.outcome === "mappable").length,
    );
    checkCount(
      `summer location checkpoint ${checkpoint.target}.hold_count`,
      checkpoint.hold_count,
      reviewed.filter((item) => item.outcome === "hold").length,
    );

    for (const item of reviewed) {
      const location = locationsByEventId[item.event_id];
      if (!eventsById.has(item.event_id)) {
        error(item.event_id, "location research references an event outside the adopted population");
        continue;
      }
      if (!location) {
        error(item.event_id, "location research is missing its location overlay row");
        continue;
      }
      const expectedOutcome =
        location.coordinate_precision === "hold" ? "hold" : "mappable";
      if (
        item.outcome !== expectedOutcome ||
        item.coordinate_precision !== location.coordinate_precision ||
        item.latitude !== location.latitude ||
        item.longitude !== location.longitude
      ) {
        error(item.event_id, "location research outcome does not match the current overlay row");
      }
      if (location.source_checked_at < checkpoint.checked_at) {
        error(item.event_id, "location overlay predates its completed research checkpoint");
      }
      if (
        !Array.isArray(item.official_source_urls) ||
        item.official_source_urls.length === 0 ||
        item.official_source_urls.some((url) => !urlPattern.test(url))
      ) {
        error(item.event_id, "location research must retain valid official source URLs");
      }
      if (item.outcome === "hold" && (item.latitude !== null || item.longitude !== null)) {
        error(item.event_id, "researched hold must not contain coordinates");
      }
    }

    validatePmLocationReview(checkpoint, reviewed);
  }
}

function validatePmLocationReview(checkpoint, reviewed) {
  if (checkpoint.pm_review_status !== "pass") {
    errors.push(`summer location checkpoint ${checkpoint.target} PM review must pass`);
  }
  validateDate(
    checkpoint.pm_reviewed_at,
    `summer location checkpoint ${checkpoint.target}.pm_reviewed_at`,
  );
  if (checkpoint.pm_reviewer_role !== "PM") {
    errors.push(`summer location checkpoint ${checkpoint.target} reviewer role must be PM`);
  }

  const approvedPmSeeds = new Map([
    [100, "checkpoint100-pm-v1|89bffb5bfb1954e4dafbc9b5aaff6b78b910ddf0|"],
    [200, "checkpoint200-pm-v1|c30465c8d595e3ad22b67a6ec4ae6bb3201ae015|"],
  ]);
  const expectedSeed = approvedPmSeeds.get(checkpoint.target);
  if (!expectedSeed) {
    errors.push(
      `summer location checkpoint ${checkpoint.target} has no approved PM sample seed`,
    );
    return;
  }
  if (checkpoint.pm_sample_seed !== expectedSeed) {
    errors.push(`summer location checkpoint ${checkpoint.target} PM sample seed is not the approved deterministic seed`);
  }
  const strata = [
    ["exact_venue", 3],
    ["area_representative", 3],
    ["hold", 4],
  ];
  const expectedSample = strata
    .flatMap(([precision, count]) =>
      reviewed
        .filter((item) =>
          precision === "hold"
            ? item.outcome === "hold"
            : item.coordinate_precision === precision,
        )
        .map((item) => ({
          eventId: item.event_id,
          hash: createHash("sha256")
            .update(`${expectedSeed}${item.event_id}`)
            .digest("hex"),
        }))
        .sort((left, right) => left.hash.localeCompare(right.hash))
        .slice(0, count),
    )
    .sort((left, right) => left.hash.localeCompare(right.hash))
    .map((item) => item.eventId);
  if (
    !Array.isArray(checkpoint.pm_sample_ids) ||
    checkpoint.pm_sample_ids.length !== 10 ||
    JSON.stringify(checkpoint.pm_sample_ids) !== JSON.stringify(expectedSample)
  ) {
    errors.push(`summer location checkpoint ${checkpoint.target} PM sample must match deterministic SHA-256 extraction`);
  }

  const findings = checkpoint.pm_findings;
  if (!Array.isArray(findings) || findings.length !== 10) {
    errors.push(`summer location checkpoint ${checkpoint.target} must retain 10 PM findings`);
    return;
  }
  const findingsById = new Map(findings.map((finding) => [finding.event_id, finding]));
  for (const eventId of expectedSample) {
    const finding = findingsById.get(eventId);
    if (!finding || finding.status !== "pass") {
      error(eventId, "PM finding must exist and pass");
      continue;
    }
    for (const field of [
      "official_identity_verified",
      "coordinate_or_hold_state_verified",
      "precision_classification_verified",
      "representative_not_overstated",
      "hold_has_null_coordinates",
    ]) {
      if (finding[field] !== true) error(eventId, `PM finding ${field} must be true`);
    }
    if (typeof finding.notes !== "string" || finding.notes.trim() === "") {
      error(eventId, "PM finding must retain review notes");
    }
  }
}

function checkCount(label, expected, actual) {
  if (expected !== actual) errors.push(`${label}=${expected}; actual=${actual}`);
}

function checkUniqueIds(items, label) {
  const ids = items.map((item) => item.id);
  if (new Set(ids).size !== ids.length) errors.push(`${label} contains duplicate IDs`);
}

function validateDate(value, label) {
  if (!datePattern.test(value ?? "") || parseDate(value) === null) {
    errors.push(`${label} must be a real YYYY-MM-DD date; received ${value}`);
  }
}

function error(label, message) {
  errors.push(`${label}: ${message}`);
}

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));
}

function readToday(argv) {
  const value = argv.find((arg) => arg.startsWith("--today="))?.split("=", 2)[1];
  if (value) {
    if (!datePattern.test(value) || parseDate(value) === null) {
      throw new Error(`Invalid --today value: ${value}`);
    }
    return value;
  }
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const pick = (type) => parts.find((part) => part.type === type)?.value ?? "";
  return `${pick("year")}-${pick("month")}-${pick("day")}`;
}

function parseDate(value) {
  if (!datePattern.test(value ?? "")) return null;
  const [year, month, day] = value.split("-").map(Number);
  const ms = Date.UTC(year, month - 1, day);
  const parsed = new Date(ms);
  return parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day
    ? ms
    : null;
}

function daysBetween(from, to) {
  const fromMs = parseDate(from);
  const toMs = parseDate(to);
  if (fromMs === null || toMs === null) return null;
  return Math.floor((toMs - fromMs) / 86_400_000);
}

function addDays(value, days) {
  const ms = parseDate(value);
  if (ms === null) return null;
  return new Date(ms + days * 86_400_000).toISOString().slice(0, 10);
}

function getNextOccurrenceDate(event, referenceDate) {
  if (
    Array.isArray(event.occurrence_dates) &&
    event.occurrence_dates.length > 0
  ) {
    return event.occurrence_dates.find((date) => date >= referenceDate) ?? null;
  }
  if (event.end_date < referenceDate) return null;
  return event.start_date <= referenceDate ? referenceDate : event.start_date;
}

function getFirstOccurrenceDate(event) {
  if (
    Array.isArray(event.occurrence_dates) &&
    event.occurrence_dates.length > 0
  ) {
    return [...event.occurrence_dates].sort()[0] ?? null;
  }
  return event.start_date;
}
