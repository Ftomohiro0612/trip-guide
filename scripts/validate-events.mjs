import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const base = readJson("data/events_data.json");
const summer = readJson("data/summer_events_2026.json");
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
  const daysUntil = nextOccurrence
    ? daysBetween(today, nextOccurrence)
    : null;
  const isUpcoming =
    daysUntil !== null && daysUntil >= 0 && daysUntil <= 7;
  const isWeatherSensitive = isMainType(event.event_type);
  const isImmediateWeatherCheck =
    isWeatherSensitive &&
    daysUntil !== null &&
    daysUntil >= 0 &&
    daysUntil <= 1;
  const maxAge = isImmediateWeatherCheck
    ? 1
    : isHero || isUpcoming
      ? summer.metadata.freshness_days_hero
      : summer.metadata.freshness_days_hub;
  if (age === null) {
    error(event.id, `invalid source_checked_at: ${event.source_checked_at}`);
  } else if (age < 0) {
    error(event.id, `source_checked_at is in the future: ${event.source_checked_at}`);
  } else if (age > maxAge) {
    error(
      event.id,
      `source confirmation is ${age} days old; maximum is ${maxAge}${isHero ? " for Hero candidates" : ""}`,
    );
  }
  const cadenceDueAt = addDays(event.source_checked_at, maxAge);
  const weatherDueAt =
    isWeatherSensitive && daysUntil !== null && daysUntil > 1
      ? addDays(nextOccurrence, -1)
      : null;
  const dueAt = [cadenceDueAt, weatherDueAt].filter(Boolean).sort()[0];
  return {
    id: event.id,
    title: event.title,
    source_checked_at: event.source_checked_at,
    age_days: age,
    next_occurrence: nextOccurrence,
    days_until_next: daysUntil,
    due_at: dueAt,
    cadence_days: maxAge,
    hero: isHero,
    upcoming_within_7_days: isUpcoming,
    weather_sensitive: isWeatherSensitive,
    review_tier: isImmediateWeatherCheck
      ? "weather-immediate"
      : isHero
        ? "hero-7d"
        : isUpcoming
          ? "upcoming-7d"
          : "hub-14d",
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
  no_reservation_filter_events: noReservationCount,
  hero_pool: summer.metadata.hero_event_ids.length,
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
