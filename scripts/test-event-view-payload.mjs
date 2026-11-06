import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { packEventViews, unpackEventViews } from "../lib/event-view-payload.ts";
import { refreshEventViewsForDate } from "../lib/event-dates.ts";
import { filterEventViews } from "../lib/event-filter.ts";

const events = JSON.parse(readFileSync(new URL("../data/events_data.json", import.meta.url))).events;
const views = events.map((event) => ({
  event,
  facilityName: event.facility_id === null ? null : "施設名",
  facilitySlug: event.facility_id === null ? null : `facility-${event.facility_id}`,
  venueName: event.venue_name ?? "施設名",
  prefectureLabel: event.prefecture,
  discoveryType: "workshop_experience",
  isThisWeekend: false,
  isThisMonth: false,
}));

const serverOnlyFields = new Set([
  "source_urls", "source_notes", "image", "display_priority", "feature_hubs", "organizer",
]);

test("event payload round-trips every client field without changing canonical data", () => {
  const original = JSON.stringify(views);
  const packed = packEventViews(views);
  const restored = unpackEventViews(structuredClone(packed));
  assert.equal(restored.length, views.length);
  for (let index = 0; index < views.length; index++) {
    const { event, ...viewFields } = views[index];
    const { event: restoredEvent, ...restoredViewFields } = restored[index];
    assert.deepEqual(restoredViewFields, viewFields);
    for (const [field, value] of Object.entries(event)) {
      if (serverOnlyFields.has(field)) assert.equal(field in restoredEvent, false);
      else assert.deepEqual(restoredEvent[field], value, `${event.id}.${field}`);
    }
  }
  assert.equal(JSON.stringify(views), original);
  assert.equal(unpackEventViews(views), views);
  assert.ok(Buffer.byteLength(JSON.stringify(packed)) < Buffer.byteLength(original) * 0.65);
});

test("packed views preserve date refresh, filter membership and order across access dates", () => {
  const restored = unpackEventViews(packEventViews(views));
  for (const today of ["2026-11-06", "2026-11-07", "2026-12-01"]) {
    const before = refreshEventViewsForDate(views, today, 30);
    const after = refreshEventViewsForDate(restored, today, 30);
    assert.deepEqual(
      after.map(({ event, isThisWeekend, isThisMonth }) => [event.id, isThisWeekend, isThisMonth]),
      before.map(({ event, isThisWeekend, isThisMonth }) => [event.id, isThisWeekend, isThisMonth]),
    );
    const base = { eventTypes: [], prefectures: [], quickFilters: [], recommendedTags: [] };
    for (const selection of [base, { ...base, keyword: "体験" },
      { ...base, quickFilters: ["free", "indoor"] },
      { ...base, datePreset: "weekend", referenceDate: today },
      { ...base, reservation: "required" },
      { ...base, prefectures: ["tokyo"] }]) {
      assert.deepEqual(
        filterEventViews(after, selection).map(({ event }) => event.id),
        filterEventViews(before, selection).map(({ event }) => event.id),
      );
    }
  }
});
