import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { haversineDistanceKm } from "../lib/distance.ts";
import {
  EVENT_TO_FACILITY_MAX_LIMIT,
  FACILITY_TO_EVENT_MAX_LIMIT,
  SUMMER_CROSSLINK_RULESET_VERSION,
  buildCrosslinkClickAnalyticsPayload,
  buildCrosslinkViewAnalyticsPayload,
  deriveSummerCrosslinks,
  extractReferencedFacilityIds,
  selectEventsForFacility,
  selectFacilitiesForEvent,
} from "../lib/event-facility-crosslinks.ts";

const TODAY = "2026-07-19";
const SNAPSHOT_TODAY = "2026-07-20";
const encodedDistance = (from, to) =>
  Math.hypot(to[0] - from[0], to[1] - from[1]);

test("event recommendations stay within 10km when three primary candidates exist", () => {
  const recommendations = selectFacilitiesForEvent(
    eventFixture(),
    locationFixture(0),
    [
      facilityFixture(3, 3),
      facilityFixture(1, 1),
      facilityFixture(2, 2),
      facilityFixture(4, 11, { recommended_for_tags: ["experience"] }),
    ],
    encodedDistance,
  );

  assert.deepEqual(
    recommendations.map(({ facilityId }) => facilityId),
    [1, 2, 3],
  );
  assert.equal(
    recommendations.every(({ distanceKm }) => distanceKm <= 10),
    true,
  );
});

test("event recommendations extend to 15km only when fewer than three are within 10km", () => {
  const recommendations = selectFacilitiesForEvent(
    eventFixture(),
    locationFixture(0),
    [
      facilityFixture(1, 2),
      facilityFixture(2, 8),
      facilityFixture(3, 11),
      facilityFixture(4, 14),
      facilityFixture(5, 16),
    ],
    encodedDistance,
  );

  assert.deepEqual(
    recommendations.map(({ facilityId }) => facilityId),
    [1, 2, 3, 4],
  );
  assert.equal(recommendations.some(({ facilityId }) => facilityId === 5), false);
  assert.equal(
    recommendations.find(({ facilityId }) => facilityId === 3)?.distanceBand,
    "extended_10_to_15km",
  );
});

test("event recommendations exclude non-public, invalid, and venue facilities", () => {
  const recommendations = selectFacilitiesForEvent(
    eventFixture({ facility_id: 1 }),
    locationFixture(0, {
      coordinate_reference: "data/facilities_data.json#facility-2",
    }),
    [
      facilityFixture(1, 1),
      facilityFixture(2, 2),
      facilityFixture(3, 3, { data_quality_status: "exclude_candidate" }),
      facilityFixture(4, 4, { latitude: null }),
      facilityFixture(5, 5),
    ],
    encodedDistance,
  );

  assert.deepEqual(
    recommendations.map(({ facilityId }) => facilityId),
    [5],
  );
  assert.deepEqual(
    extractReferencedFacilityIds(
      "facility_id=9 / data/facilities_data.json#facility-2 / facility_id:9",
    ),
    [2, 9],
  );
});

test("event ranking uses tag matches, distance, then facility ID", () => {
  const recommendations = selectFacilitiesForEvent(
    eventFixture({ recommended_for_tags: ["experience", "nature"] }),
    locationFixture(0),
    [
      facilityFixture(9, 4, { recommended_for_tags: ["experience"] }),
      facilityFixture(7, 6, {
        recommended_for_tags: ["experience", "nature"],
      }),
      facilityFixture(4, 4, { recommended_for_tags: ["experience"] }),
      facilityFixture(3, 4, { recommended_for_tags: ["experience"] }),
    ],
    encodedDistance,
  );

  assert.deepEqual(
    recommendations.map(({ facilityId }) => facilityId),
    [7, 3, 4, 9],
  );
});

test("rain-ready candidate is deterministically promoted into the initial three", () => {
  const facilities = [
    facilityFixture(1, 1),
    facilityFixture(2, 2),
    facilityFixture(3, 3),
    facilityFixture(4, 4, { rain_friendly: "◎" }),
    facilityFixture(5, 5),
    facilityFixture(6, 6),
  ];
  const first = selectFacilitiesForEvent(
    eventFixture(),
    locationFixture(0),
    facilities,
    encodedDistance,
  );
  const second = selectFacilitiesForEvent(
    eventFixture(),
    locationFixture(0),
    [...facilities].reverse(),
    encodedDistance,
  );

  assert.deepEqual(
    first.map(({ facilityId }) => facilityId),
    [1, 2, 4, 3, 5],
  );
  assert.equal(first.slice(0, 3).some(({ isRainOption }) => isRainOption), true);
  assert.deepEqual(second, first);
  assert.equal(first.length, EVENT_TO_FACILITY_MAX_LIMIT);
});

test("hold and null-coordinate events never receive derived recommendations", () => {
  const result = deriveSummerCrosslinks({
    events: [
      eventFixture({ id: "valid" }),
      eventFixture({ id: "hold" }),
      eventFixture({ id: "null-coordinate" }),
      eventFixture({ id: "missing" }),
    ],
    facilities: [facilityFixture(1, 1)],
    locationsByEventId: {
      valid: locationFixture(0),
      hold: locationFixture(0, {
        coordinate_precision: "hold",
        latitude: null,
        longitude: null,
      }),
      "null-coordinate": locationFixture(0, { latitude: null }),
    },
    today: TODAY,
    calculateDistanceKm: encodedDistance,
  });

  assert.deepEqual(Object.keys(result.eventToFacilities), ["valid"]);
  assert.deepEqual(
    {
      mappable: result.diagnostics.mappableEventCount,
      hold: result.diagnostics.holdEventCount,
      nullCoordinate: result.diagnostics.nullOrInvalidEventCoordinateCount,
      missing: result.diagnostics.missingLocationCount,
    },
    { mappable: 1, hold: 1, nullCoordinate: 1, missing: 1 },
  );
});

test("facility recommendations enforce distance bands, 30 days, self exclusion, and limit", () => {
  const facility = facilityFixture(10, 0, {
    recommended_for_tags: ["experience"],
  });
  const mappableEvents = [
    eventWithLocation("same-facility", 1, "2026-07-20", {
      facility_id: 10,
    }),
    eventWithLocation("within-five", 4, "2026-08-18"),
    eventWithLocation("within-ten", 8, "2026-07-21"),
    eventWithLocation("within-fifteen", 12, "2026-07-20"),
    eventWithLocation("outside", 16, "2026-07-20"),
    eventWithLocation("too-late", 2, "2026-08-19"),
  ];
  const recommendations = selectEventsForFacility(
    facility,
    mappableEvents,
    TODAY,
    encodedDistance,
  );

  assert.deepEqual(
    recommendations.map(({ eventId }) => eventId),
    ["within-five", "within-ten", "within-fifteen"],
  );
  assert.deepEqual(
    recommendations.map(({ distanceBand }) => distanceBand),
    ["within_5km", "within_10km", "within_15km"],
  );
  assert.equal(recommendations.length, FACILITY_TO_EVENT_MAX_LIMIT);
});

test("facility event ranking uses date, tag matches, distance, then event ID", () => {
  const facility = facilityFixture(1, 0, {
    recommended_for_tags: ["experience", "nature"],
  });
  const mappableEvents = [
    eventWithLocation("event-z", 4, "2026-07-21", {
      recommended_for_tags: ["experience"],
    }),
    eventWithLocation("event-a", 4, "2026-07-21", {
      recommended_for_tags: ["experience"],
    }),
    eventWithLocation("event-near", 3, "2026-07-21", {
      recommended_for_tags: ["experience"],
    }),
    eventWithLocation("event-tag", 4.5, "2026-07-21", {
      recommended_for_tags: ["experience", "nature"],
    }),
    eventWithLocation("event-soon", 4.9, "2026-07-20"),
  ];
  const recommendations = selectEventsForFacility(
    facility,
    mappableEvents,
    TODAY,
    encodedDistance,
  );

  assert.deepEqual(
    recommendations.map(({ eventId }) => eventId),
    ["event-soon", "event-tag", "event-near"],
  );
  const idTies = selectEventsForFacility(
    facility,
    [
      eventWithLocation("event-z", 4, "2026-07-21"),
      eventWithLocation("event-a", 4, "2026-07-21"),
    ],
    TODAY,
    encodedDistance,
  );
  assert.deepEqual(
    idTies.map(({ eventId }) => eventId),
    ["event-a", "event-z"],
  );
});

test("analytics payloads expose only the approved non-personal contract", () => {
  const viewPayload = buildCrosslinkViewAnalyticsPayload(
    "event_to_facility",
    5,
  );
  const clickPayload = buildCrosslinkClickAnalyticsPayload(
    "facility_to_event",
    2,
  );

  assert.deepEqual(viewPayload, {
    direction: "event_to_facility",
    item_count: 5,
    ruleset_version: "summer-crosslink-v1",
  });
  assert.deepEqual(clickPayload, {
    direction: "facility_to_event",
    position: 2,
    ruleset_version: "summer-crosslink-v1",
  });
  assert.deepEqual(Object.keys(viewPayload).sort(), [
    "direction",
    "item_count",
    "ruleset_version",
  ]);
  assert.deepEqual(Object.keys(clickPayload).sort(), [
    "direction",
    "position",
    "ruleset_version",
  ]);
});

test("fixed 2026-07-20 canonical snapshot remains deterministic and clean", () => {
  const fixtures = loadCanonicalFixtures(SNAPSHOT_TODAY);
  const first = deriveSummerCrosslinks({
    ...fixtures,
    today: SNAPSHOT_TODAY,
    calculateDistanceKm: haversineDistanceKm,
  });
  const second = deriveSummerCrosslinks({
    ...fixtures,
    facilities: [...fixtures.facilities].reverse(),
    today: SNAPSHOT_TODAY,
    calculateDistanceKm: haversineDistanceKm,
  });
  const eventLists = Object.values(first.eventToFacilities);
  const facilityLists = Object.values(first.facilityToEvents);
  if (process.env.CROSSLINK_SNAPSHOT_REPORT === "1") {
    console.log(JSON.stringify(first.diagnostics));
  }

  assert.equal(first.rulesetVersion, SUMMER_CROSSLINK_RULESET_VERSION);
  assert.equal(fixtures.events.length, 479);
  assert.equal(first.diagnostics.mappableEventCount, 21);
  assert.equal(first.diagnostics.eventToFacilityEventCount, 21);
  assert.equal(eventLists.every((items) => items.length <= 5), true);
  assert.equal(facilityLists.every((items) => items.length <= 3), true);
  assert.equal(
    eventLists.flat().every(({ distanceKm }) => distanceKm <= 15),
    true,
  );
  assert.equal(
    facilityLists.flat().every(({ distanceKm }) => distanceKm <= 15),
    true,
  );
  assert.equal(
    facilityLists
      .flat()
      .every(({ nextDate }) => daysBetween(SNAPSHOT_TODAY, nextDate) <= 30),
    true,
  );
  assert.equal(hasVenueSelfMix(first, fixtures), false);
  assert.deepEqual(second, first);
  assert.deepEqual(
    {
      inputEventCount: first.diagnostics.inputEventCount,
      mappableEventCount: first.diagnostics.mappableEventCount,
      holdEventCount: first.diagnostics.holdEventCount,
      missingLocationCount: first.diagnostics.missingLocationCount,
      excludedFacilityCount: first.diagnostics.excludedFacilityCount,
      eventToFacilityEventCount:
        first.diagnostics.eventToFacilityEventCount,
      eventToFacilityRecommendationCount:
        first.diagnostics.eventToFacilityRecommendationCount,
      facilityToEventFacilityCount:
        first.diagnostics.facilityToEventFacilityCount,
      facilityToEventThreeCandidateCount:
        first.diagnostics.facilityToEventThreeCandidateCount,
      facilityToEventRecommendationCount:
        first.diagnostics.facilityToEventRecommendationCount,
    },
    {
      inputEventCount: 479,
      mappableEventCount: 21,
      holdEventCount: 388,
      missingLocationCount: 70,
      excludedFacilityCount: 8,
      eventToFacilityEventCount: 21,
      eventToFacilityRecommendationCount: 105,
      facilityToEventFacilityCount: 485,
      facilityToEventThreeCandidateCount: 186,
      facilityToEventRecommendationCount: 958,
    },
  );
});

function eventFixture(overrides = {}) {
  return {
    id: "event",
    facility_id: null,
    title: "夏イベント",
    event_type: "summer_festival",
    recommended_for_tags: ["experience"],
    nextDate: "2026-07-20",
    ...overrides,
  };
}

function facilityFixture(id, encodedKm, overrides = {}) {
  return {
    id,
    slug: `facility-${id}`,
    name: `施設${id}`,
    category: "公園",
    latitude: 0,
    longitude: encodedKm,
    recommended_for_tags: [],
    rain_friendly: "×",
    indoor_outdoor: "屋外",
    data_quality_status: "confirmed",
    ...overrides,
  };
}

function locationFixture(encodedKm, overrides = {}) {
  return {
    latitude: 0,
    longitude: encodedKm,
    coordinate_precision: "exact_venue",
    coordinate_reference: "",
    ...overrides,
  };
}

function eventWithLocation(id, encodedKm, nextDate, overrides = {}) {
  return {
    event: eventFixture({ id, nextDate, ...overrides }),
    location: locationFixture(encodedKm),
  };
}

function loadCanonicalFixtures(today) {
  const facilitiesSource = readJson("../data/facilities_data.json");
  const baseSource = readJson("../data/events_data.json");
  const summerSource = readJson("../data/summer_events_2026.json");
  const locationsSource = readJson(
    "../data/summer_event_locations_2026.json",
  );
  const baseById = new Map(
    baseSource.events.map((event) => [event.id, event]),
  );
  const existing = summerSource.existing_event_classifications.map(
    (classification) => ({
      ...baseById.get(classification.id),
      ...classification,
    }),
  );
  const heroIds = new Set(summerSource.metadata.hero_event_ids);
  const added = summerSource.events.map((event) => ({
    ...event,
    recommended_for_tags: ["experience", "wide_space"],
    status: "scheduled",
    display_priority: heroIds.has(event.id) ? 90 : 80,
  }));
  const events = [...existing, ...added]
    .filter((event) => {
      const age = daysBetween(event.source_checked_at, today);
      return (
        ["scheduled", "ongoing"].includes(event.status) &&
        (!event.end_date || event.end_date >= today) &&
        age >= 0 &&
        age <= summerSource.metadata.freshness_days_hub &&
        nextEventDate(event, today) !== null
      );
    })
    .map((event) => ({
      id: event.id,
      facility_id: event.facility_id,
      title: event.title,
      event_type: event.event_type,
      recommended_for_tags: event.recommended_for_tags ?? [],
      nextDate: nextEventDate(event, today),
    }));

  return {
    events,
    facilities: facilitiesSource.facilities,
    locationsByEventId: locationsSource.locations_by_event_id,
  };
}

function hasVenueSelfMix(result, fixtures) {
  const eventById = new Map(fixtures.events.map((event) => [event.id, event]));
  for (const [eventId, recommendations] of Object.entries(
    result.eventToFacilities,
  )) {
    const event = eventById.get(eventId);
    const location = fixtures.locationsByEventId[eventId];
    const excluded = new Set([
      ...(event.facility_id ? [event.facility_id] : []),
      ...extractReferencedFacilityIds(location.coordinate_reference),
    ]);
    if (recommendations.some(({ facilityId }) => excluded.has(facilityId))) {
      return true;
    }
  }
  for (const [facilityId, recommendations] of Object.entries(
    result.facilityToEvents,
  )) {
    const numericFacilityId = Number(facilityId);
    for (const recommendation of recommendations) {
      const event = eventById.get(recommendation.eventId);
      const location = fixtures.locationsByEventId[recommendation.eventId];
      if (
        event.facility_id === numericFacilityId ||
        extractReferencedFacilityIds(location.coordinate_reference).includes(
          numericFacilityId,
        )
      ) {
        return true;
      }
    }
  }
  return false;
}

function nextEventDate(event, today) {
  if (event.occurrence_dates?.length > 0) {
    return event.occurrence_dates.find((date) => date >= today) ?? null;
  }
  if (!event.start_date) return null;
  const endDate = event.end_date ?? event.start_date;
  if (endDate < today) return null;
  return event.start_date <= today ? today : event.start_date;
}

function daysBetween(fromDate, toDate) {
  return Math.floor(
    (Date.parse(`${toDate}T00:00:00Z`) -
      Date.parse(`${fromDate}T00:00:00Z`)) /
      86_400_000,
  );
}

function readJson(relativePath) {
  return JSON.parse(
    readFileSync(new URL(relativePath, import.meta.url), "utf8"),
  );
}
