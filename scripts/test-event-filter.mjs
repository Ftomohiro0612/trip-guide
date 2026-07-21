import assert from "node:assert/strict";
import test from "node:test";
import {
  eventMatchesDateRange,
  filterEventViews,
  getDateOnlyInTimeZone,
  getEventDateFilterError,
  getEventDatePresetRange,
  paginateEventViews,
} from "../lib/event-filter.ts";

test("date range includes both boundaries for single and continuous events", () => {
  assert.equal(
    eventMatchesDateRange(
      event({ start_date: "2026-07-25", end_date: "2026-07-25" }),
      { startDate: "2026-07-25", endDate: "2026-07-25" },
    ),
    true,
  );
  assert.equal(
    eventMatchesDateRange(
      event({ start_date: "2026-07-20", end_date: "2026-07-25" }),
      { startDate: "2026-07-25", endDate: "2026-07-31" },
    ),
    true,
  );
  assert.equal(
    eventMatchesDateRange(
      event({ start_date: "2026-08-01", end_date: "2026-08-05" }),
      { startDate: "2026-07-25", endDate: "2026-07-31" },
    ),
    false,
  );
});

test("occurrence dates use actual dates instead of a continuous span", () => {
  const nonContinuous = event({
    start_date: "2026-07-01",
    end_date: "2026-07-31",
    occurrence_dates: ["2026-07-05", "2026-07-26"],
  });
  assert.equal(
    eventMatchesDateRange(nonContinuous, {
      startDate: "2026-07-10",
      endDate: "2026-07-20",
    }),
    false,
  );
  assert.equal(
    eventMatchesDateRange(nonContinuous, {
      startDate: "2026-07-26",
      endDate: "2026-07-26",
    }),
    true,
  );
});

test("start-only and end-only ranges work for occurrences and event periods", () => {
  assert.equal(
    eventMatchesDateRange(
      event({ occurrence_dates: ["2026-07-10", "2026-08-10"] }),
      { startDate: "2026-08-01", endDate: "" },
    ),
    true,
  );
  assert.equal(
    eventMatchesDateRange(
      event({ start_date: "2026-08-10", end_date: "2026-08-20" }),
      { startDate: "", endDate: "2026-08-10" },
    ),
    true,
  );
  assert.equal(
    eventMatchesDateRange(
      event({ start_date: "2026-08-11", end_date: "2026-08-20" }),
      { startDate: "", endDate: "2026-08-10" },
    ),
    false,
  );
});

test("invalid reversed range reports an error and returns no results", () => {
  const range = { startDate: "2026-08-10", endDate: "2026-08-01" };
  assert.equal(
    getEventDateFilterError(range, null),
    "開始日は終了日以前の日付を指定してください。",
  );
  assert.deepEqual(
    filterEventViews([view("one")], selection({ dateRange: range })),
    [],
  );
});

test("weekend and month presets resolve as exclusive inclusive ranges", () => {
  assert.deepEqual(getEventDatePresetRange("weekend", "2026-07-21"), {
    startDate: "2026-07-25",
    endDate: "2026-07-26",
  });
  assert.deepEqual(getEventDatePresetRange("month", "2026-07-21"), {
    startDate: "2026-07-01",
    endDate: "2026-07-31",
  });
});

test("normal nationwide events resolve weekend from click-time Asia/Tokyo date and keep AND filters", () => {
  const clickDate = getDateOnlyInTimeZone(
    new Date("2026-07-27T15:00:00.000Z"),
    "Asia/Tokyo",
  );
  assert.equal(clickDate, "2026-07-28");
  assert.deepEqual(getEventDatePresetRange("weekend", clickDate), {
    startDate: "2026-08-01",
    endDate: "2026-08-02",
  });

  const views = [
    view("nationwide-match", {
      prefecture: "tokyo",
      event_type: "fireworks",
      reservation: "required",
      is_free: true,
      occurrence_dates: ["2026-08-01"],
    }),
    view("wrong-prefecture", {
      prefecture: "chiba",
      event_type: "fireworks",
      reservation: "required",
      is_free: true,
      occurrence_dates: ["2026-08-01"],
    }),
    view("wrong-reservation", {
      prefecture: "tokyo",
      event_type: "fireworks",
      reservation: "not_required",
      is_free: true,
      occurrence_dates: ["2026-08-01"],
    }),
    view("wrong-date", {
      prefecture: "tokyo",
      event_type: "fireworks",
      reservation: "required",
      is_free: true,
      occurrence_dates: ["2026-08-03"],
    }),
  ];

  const filtered = filterEventViews(
    views,
    selection({
      eventTypes: ["fireworks"],
      prefectures: ["tokyo"],
      quickFilters: ["free"],
      datePreset: "weekend",
      referenceDate: clickDate,
      reservation: "required",
    }),
  );
  assert.deepEqual(
    filtered.map((item) => item.event.id),
    ["nationwide-match"],
  );
});

test("normal prefecture events resolve month from click-time Asia/Tokyo date and keep AND filters", () => {
  const clickDate = getDateOnlyInTimeZone(
    new Date("2026-07-31T15:00:00.000Z"),
    "Asia/Tokyo",
  );
  assert.equal(clickDate, "2026-08-01");
  assert.deepEqual(getEventDatePresetRange("month", clickDate), {
    startDate: "2026-08-01",
    endDate: "2026-08-31",
  });

  const views = [
    view("prefecture-match", {
      event_type: "summer_festival",
      reservation: "not_required",
      is_free: true,
      occurrence_dates: ["2026-08-31"],
    }),
    view("wrong-type", {
      event_type: "fireworks",
      reservation: "not_required",
      is_free: true,
      occurrence_dates: ["2026-08-31"],
    }),
    view("wrong-free", {
      event_type: "summer_festival",
      reservation: "not_required",
      is_free: false,
      occurrence_dates: ["2026-08-31"],
    }),
    view("wrong-date", {
      event_type: "summer_festival",
      reservation: "not_required",
      is_free: true,
      occurrence_dates: ["2026-09-01"],
    }),
  ];

  const filtered = filterEventViews(
    views,
    selection({
      eventTypes: ["summer_festival"],
      quickFilters: ["free"],
      datePreset: "month",
      referenceDate: clickDate,
      reservation: "not_required",
    }),
    false,
  );
  assert.deepEqual(
    filtered.map((item) => item.event.id),
    ["prefecture-match"],
  );
});

test("reservation is single-value exact matching and unselected includes unknown", () => {
  const views = [
    view("required", { reservation: "required" }),
    view("not-required", { reservation: "not_required" }),
    view("unknown", { reservation: "unknown" }),
  ];
  assert.equal(filterEventViews(views, selection()).length, 3);
  assert.deepEqual(
    filterEventViews(views, selection({ reservation: "required" })).map(
      (item) => item.event.id,
    ),
    ["required"],
  );
  assert.deepEqual(
    filterEventViews(views, selection({ reservation: "not_required" })).map(
      (item) => item.event.id,
    ),
    ["not-required"],
  );
});

test("type and prefecture are OR within groups while all groups combine with AND", () => {
  const views = [
    view("match-a", {
      prefecture: "tokyo",
      event_type: "fireworks",
      reservation: "required",
      is_free: true,
      occurrence_dates: ["2026-07-25"],
    }),
    view("match-b", {
      prefecture: "chiba",
      event_type: "summer_festival",
      reservation: "required",
      is_free: true,
      occurrence_dates: ["2026-07-26"],
    }),
    view("wrong-reservation", {
      prefecture: "tokyo",
      event_type: "fireworks",
      reservation: "not_required",
      is_free: true,
      occurrence_dates: ["2026-07-25"],
    }),
    view("wrong-date", {
      prefecture: "chiba",
      event_type: "summer_festival",
      reservation: "required",
      is_free: true,
      occurrence_dates: ["2026-08-02"],
    }),
  ];
  const filtered = filterEventViews(
    views,
    selection({
      eventTypes: ["fireworks", "summer_festival"],
      prefectures: ["tokyo", "chiba"],
      quickFilters: ["free"],
      reservation: "required",
      dateRange: { startDate: "2026-07-25", endDate: "2026-07-26" },
    }),
  );
  assert.deepEqual(
    filtered.map((item) => item.event.id),
    ["match-a", "match-b"],
  );
  assert.equal(paginateEventViews(filtered, 99).currentPage, 1);
});

function event(overrides = {}) {
  return {
    start_date: null,
    end_date: null,
    ...overrides,
  };
}

function view(id, overrides = {}) {
  return {
    event: {
      id,
      prefecture: "tokyo",
      event_type: "fireworks",
      recommended_for_tags: [],
      is_indoor: false,
      is_free: false,
      reservation: "unknown",
      start_date: "2026-07-25",
      end_date: "2026-07-25",
      ...overrides,
    },
    isThisWeekend: false,
    isThisMonth: false,
  };
}

function selection(overrides = {}) {
  return {
    eventTypes: [],
    prefectures: [],
    quickFilters: [],
    recommendedTags: [],
    dateRange: { startDate: "", endDate: "" },
    datePreset: null,
    referenceDate: "2026-07-21",
    reservation: null,
    ...overrides,
  };
}
