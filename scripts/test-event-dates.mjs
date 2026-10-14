import assert from "node:assert/strict";
import test from "node:test";
import {
  getEventLastDate,
  getNextEventDate,
  getTokyoDateString,
  isEventCurrentOnDate,
  isEventDiscoverableOnDate,
  isThisMonth,
  isThisWeekend,
} from "../lib/event-dates.ts";

const baseEvent = {
  end_date: "2026-10-18",
  facility_id: 1,
  official_url: "https://example.com/event",
  source_checked_at: "2026-10-14",
  start_date: "2026-10-17",
  status: "scheduled",
};

test("Asia/Tokyo date does not depend on the runtime time zone", () => {
  assert.equal(
    getTokyoDateString(new Date("2026-10-14T14:59:59Z")),
    "2026-10-14",
  );
  assert.equal(
    getTokyoDateString(new Date("2026-10-14T15:00:00Z")),
    "2026-10-15",
  );
});

test("weekend means the coming weekend on weekdays and the current weekend on Saturday/Sunday", () => {
  for (const date of ["2026-10-14", "2026-10-17", "2026-10-18"]) {
    assert.equal(isThisWeekend(baseEvent, date), true, date);
  }
  assert.equal(isThisWeekend(baseEvent, "2026-10-19"), false);

  const nextWeekend = {
    ...baseEvent,
    start_date: "2026-10-24",
    end_date: "2026-10-25",
  };
  assert.equal(isThisWeekend(nextWeekend, "2026-10-19"), true);

  const endOfMonthWeekend = {
    ...baseEvent,
    start_date: "2026-10-31",
    end_date: "2026-11-01",
  };
  assert.equal(isThisWeekend(endOfMonthWeekend, "2026-10-26"), true);
});

test("occurrence events use the last occurrence for discovery and the next occurrence for labels", () => {
  const occurrenceEvent = {
    ...baseEvent,
    start_date: "2026-10-10",
    end_date: null,
    occurrence_dates: ["2026-10-17", "2026-10-26", "2026-10-24"],
  };
  assert.equal(getEventLastDate(occurrenceEvent), "2026-10-26");
  assert.equal(getNextEventDate(occurrenceEvent, "2026-10-14"), "2026-10-17");
  assert.equal(getNextEventDate(occurrenceEvent, "2026-10-18"), "2026-10-24");
  assert.equal(getNextEventDate(occurrenceEvent, "2026-10-26"), "2026-10-26");
  assert.equal(getNextEventDate(occurrenceEvent, "2026-10-27"), null);
  assert.equal(isEventCurrentOnDate(occurrenceEvent, "2026-10-26"), true);
  assert.equal(isEventCurrentOnDate(occurrenceEvent, "2026-10-27"), false);
});

test("multi-week events remain current through their end date and use today as the next date", () => {
  const multiWeekEvent = {
    ...baseEvent,
    start_date: "2026-10-10",
    end_date: "2026-10-26",
  };
  for (const date of [
    "2026-10-14",
    "2026-10-17",
    "2026-10-18",
    "2026-10-19",
    "2026-10-26",
  ]) {
    assert.equal(isEventCurrentOnDate(multiWeekEvent, date), true, date);
    assert.equal(getNextEventDate(multiWeekEvent, date), date, date);
    assert.equal(isThisMonth(multiWeekEvent, date), true, date);
  }
  assert.equal(isEventCurrentOnDate(multiWeekEvent, "2026-10-27"), false);
});

test("discovery filtering drops ended and stale events without changing the freshness window", () => {
  assert.equal(
    isEventDiscoverableOnDate(baseEvent, "2026-10-18", 21),
    true,
  );
  assert.equal(
    isEventDiscoverableOnDate(baseEvent, "2026-10-19", 21),
    false,
  );
  assert.equal(
    isEventDiscoverableOnDate(
      { ...baseEvent, end_date: "2026-11-30" },
      "2026-11-05",
      21,
    ),
    false,
  );
});
