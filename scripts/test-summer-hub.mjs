import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  EVENT_PAGE_SIZE,
  filterEventViews,
  paginateEventViews,
} from "../lib/event-filter.ts";
import {
  buildSummerEventListJsonLd,
  selectSummerHeroEventsByType,
} from "../lib/summer-event-hub.ts";
import { isFeatureHubActive } from "../lib/feature-hub-runtime.ts";

const TEST_DATES = [
  "2026-07-15",
  "2026-07-27",
  "2026-08-17",
  "2026-09-01",
];

const summerSource = JSON.parse(
  readFileSync(
    new URL("../data/summer_events_2026.json", import.meta.url),
    "utf8",
  ),
);

function fixture(
  id,
  eventType,
  displayPriority,
  endDate = "2026-09-27",
) {
  return {
    id,
    event_type: eventType,
    start_date: "2026-07-01",
    end_date: endDate,
    display_priority: displayPriority,
  };
}

test("Hero selection independently keeps four fireworks and four festivals across dates", () => {
  const fireworks = Array.from({ length: 14 }, (_, index) =>
    fixture(`fireworks-${index + 1}`, "fireworks", 200 - index),
  );
  const festivals = Array.from({ length: 6 }, (_, index) =>
    fixture(`festival-${index + 1}`, "summer_festival", 100 - index),
  );
  const events = [...fireworks, ...festivals];
  const heroIds = events.map((event) => event.id);

  for (const today of TEST_DATES) {
    const selectedFireworks = selectSummerHeroEventsByType(
      events,
      heroIds,
      "fireworks",
      today,
      4,
    );
    const selectedFestivals = selectSummerHeroEventsByType(
      events,
      heroIds,
      "summer_festival",
      today,
      4,
    );

    assert.equal(selectedFireworks.length, 4, today);
    assert.equal(selectedFestivals.length, 4, today);
    assert.ok(
      selectedFireworks.every((event) => event.event_type === "fireworks"),
      today,
    );
    assert.ok(
      selectedFestivals.every(
        (event) => event.event_type === "summer_festival",
      ),
      today,
    );
  }
});

test("Hero selection falls back within each category as approved events end", () => {
  const endingDates = [
    "2026-07-20",
    "2026-07-26",
    "2026-08-16",
    "2026-08-31",
    "2026-09-05",
    "2026-09-27",
  ];
  const makeTypeEvents = (type) => [
    ...endingDates.map((endDate, index) =>
      fixture(`${type}-hero-${index + 1}`, type, 100 - index, endDate),
    ),
    fixture(`${type}-fallback-1`, type, 50),
    fixture(`${type}-fallback-2`, type, 40),
  ];
  const fireworks = makeTypeEvents("fireworks");
  const festivals = makeTypeEvents("summer_festival");
  const events = [...fireworks, ...festivals];
  const heroIds = events
    .filter((event) => event.id.includes("-hero-"))
    .map((event) => event.id);
  const expectedSuffixes = new Map([
    ["2026-07-15", ["hero-1", "hero-2", "hero-3", "hero-4"]],
    ["2026-07-27", ["hero-3", "hero-4", "hero-5", "hero-6"]],
    ["2026-08-17", ["hero-4", "hero-5", "hero-6", "fallback-1"]],
    ["2026-09-01", ["hero-5", "hero-6", "fallback-1", "fallback-2"]],
  ]);

  for (const today of TEST_DATES) {
    for (const type of ["fireworks", "summer_festival"]) {
      const selected = selectSummerHeroEventsByType(
        events,
        heroIds,
        type,
        today,
        4,
      );
      assert.deepEqual(
        selected.map((event) => event.id),
        expectedSuffixes.get(today).map((suffix) => `${type}-${suffix}`),
        `${type} on ${today}`,
      );
    }
  }
});

test("Hero selection does not fill a short category from the other category", () => {
  const events = [
    ...Array.from({ length: 8 }, (_, index) =>
      fixture(`fireworks-${index + 1}`, "fireworks", 100 - index),
    ),
    fixture("festival-1", "summer_festival", 90),
    fixture("festival-2", "summer_festival", 80),
  ];
  const heroIds = events.map((event) => event.id);

  const selectedFestivals = selectSummerHeroEventsByType(
    events,
    heroIds,
    "summer_festival",
    "2026-09-01",
    4,
  );

  assert.deepEqual(
    selectedFestivals.map((event) => event.id),
    ["festival-1", "festival-2"],
  );
});

test("non-contiguous occurrence dates become separate Event entries", () => {
  const jsonLd = buildSummerEventListJsonLd([
    {
      id: "event-discrete",
      title: "指定日開催の花火",
      start_date: "2026-07-18",
      end_date: "2026-08-22",
      occurrence_dates: ["2026-07-18", "2026-08-08", "2026-08-22"],
      official_url: "https://example.com/discrete",
      venue_name: "実在する花火会場",
      prefecture_label: "東京都",
    },
  ]);

  assert.equal(jsonLd.numberOfItems, 3);
  assert.deepEqual(
    jsonLd.itemListElement.map((entry) => [
      entry.item.startDate,
      entry.item.endDate,
    ]),
    [
      ["2026-07-18", "2026-07-18"],
      ["2026-08-08", "2026-08-08"],
      ["2026-08-22", "2026-08-22"],
    ],
  );
  assert.equal(
    jsonLd.itemListElement[0].item.location.name,
    "実在する花火会場",
  );
  assert.equal(JSON.stringify(jsonLd).includes("公式会場"), false);
});

test("continuous events retain their true start and end dates", () => {
  const jsonLd = buildSummerEventListJsonLd([
    {
      id: "event-continuous",
      title: "連続開催の夏祭り",
      start_date: "2026-07-10",
      end_date: "2026-08-11",
      official_url: "https://example.com/continuous",
      venue_name: "実在する祭り会場",
      prefecture_label: "東京都",
    },
  ]);

  assert.equal(jsonLd.numberOfItems, 1);
  assert.equal(jsonLd.itemListElement[0].item.startDate, "2026-07-10");
  assert.equal(jsonLd.itemListElement[0].item.endDate, "2026-08-11");
});

test("feature hub hard-stops exactly at endsAt", () => {
  const config = {
    id: "summer-2026",
    startsAt: "2026-07-14T00:00:00+09:00",
    endsAt: "2026-09-28T00:00:00+09:00",
  };

  assert.equal(
    isFeatureHubActive(config, new Date("2026-07-14T00:00:00+09:00")),
    true,
  );
  assert.equal(
    isFeatureHubActive(config, new Date("2026-09-27T23:59:59.999+09:00")),
    true,
  );
  assert.equal(
    isFeatureHubActive(config, new Date("2026-09-28T00:00:00+09:00")),
    false,
  );
});

test("generic event type filters match the frozen candidate counts", () => {
  const classifications = [
    ...summerSource.events,
    ...summerSource.existing_event_classifications,
  ];
  const views = classifications.map((event) =>
    filterFixture(event.id, event.event_type),
  );
  const expectedCounts = {
    fireworks: 35,
    summer_festival: 35,
    summer_tradition: 5,
    night_outing: 6,
  };

  for (const [eventType, expected] of Object.entries(expectedCounts)) {
    assert.equal(
      filterEventViews(views, emptySelection({ eventTypes: [eventType] }))
        .length,
      expected,
      eventType,
    );
  }
});

test("generic event types are OR while filter groups combine with AND", () => {
  const views = [
    filterFixture("legacy", undefined, {
      prefecture: "tokyo",
      recommended_for_tags: ["animals"],
    }),
    filterFixture("fireworks-match", "fireworks", {
      prefecture: "tokyo",
      recommended_for_tags: ["water_play", "playground"],
      is_free: true,
      reservation: "not_required",
    }),
    filterFixture("fireworks-other-area", "fireworks", {
      prefecture: "chiba",
      recommended_for_tags: ["water_play"],
      is_free: true,
      reservation: "not_required",
    }),
    filterFixture("festival-match", "summer_festival", {
      prefecture: "tokyo",
      recommended_for_tags: ["water_play"],
      is_free: true,
      reservation: "not_required",
    }),
  ];

  assert.deepEqual(
    filterEventViews(
      views,
      emptySelection({ eventTypes: ["fireworks", "summer_festival"] }),
    ).map((view) => view.event.id),
    ["fireworks-match", "fireworks-other-area", "festival-match"],
  );
  assert.deepEqual(
    filterEventViews(
      views,
      emptySelection({
        eventTypes: ["fireworks"],
        prefectures: ["tokyo"],
        quickFilters: ["free", "noReservation"],
        recommendedTags: ["water_play"],
      }),
    ).map((view) => view.event.id),
    ["fireworks-match"],
  );
});

test("unclassified legacy events remain only when no event type is selected", () => {
  const views = [
    filterFixture("legacy"),
    filterFixture("fireworks", "fireworks"),
  ];

  assert.equal(filterEventViews(views, emptySelection()).length, 2);
  assert.deepEqual(
    filterEventViews(
      views,
      emptySelection({ eventTypes: ["fireworks"] }),
    ).map((view) => view.event.id),
    ["fireworks"],
  );
});

test("generic event pagination slices 562 items on first, second, and final pages", () => {
  const items = Array.from({ length: 562 }, (_, index) => index + 1);
  const first = paginateEventViews(items, 1);
  const second = paginateEventViews(items, 2);
  const final = paginateEventViews(items, 29);

  assert.equal(EVENT_PAGE_SIZE, 20);
  assert.deepEqual(
    {
      count: first.items.length,
      current: first.currentPage,
      start: first.startNumber,
      end: first.endNumber,
      pages: first.totalPages,
      previous: first.hasPreviousPage,
      next: first.hasNextPage,
    },
    {
      count: 20,
      current: 1,
      start: 1,
      end: 20,
      pages: 29,
      previous: false,
      next: true,
    },
  );
  assert.deepEqual(second.items, items.slice(20, 40));
  assert.deepEqual(
    [second.startNumber, second.endNumber, second.hasPreviousPage, second.hasNextPage],
    [21, 40, true, true],
  );
  assert.deepEqual(final.items, items.slice(560));
  assert.deepEqual(
    [final.startNumber, final.endNumber, final.hasPreviousPage, final.hasNextPage],
    [561, 562, true, false],
  );
  assert.equal(paginateEventViews(items, 999).currentPage, 29);
});

test("35 fireworks and 35 festivals paginate across two pages", () => {
  const views = [
    ...Array.from({ length: 35 }, (_, index) =>
      filterFixture(`fireworks-${index + 1}`, "fireworks"),
    ),
    ...Array.from({ length: 35 }, (_, index) =>
      filterFixture(`festival-${index + 1}`, "summer_festival"),
    ),
  ];

  for (const [eventType, finalPageLength] of [
    ["fireworks", 15],
    ["summer_festival", 15],
  ]) {
    const filtered = filterEventViews(
      views,
      emptySelection({ eventTypes: [eventType] }),
    );
    const first = paginateEventViews(filtered, 1);
    const second = paginateEventViews(filtered, 2);

    assert.equal(first.items.length, 20, eventType);
    assert.equal(second.items.length, finalPageLength, eventType);
    assert.equal(second.totalPages, 2, eventType);
    assert.equal(second.hasNextPage, false, eventType);
  }
});

test("combined prefecture, type, condition, and preference filters keep correct pages", () => {
  const matching = Array.from({ length: 43 }, (_, index) =>
    filterFixture(`match-${index + 1}`, "fireworks", {
      prefecture: "tokyo",
      recommended_for_tags: ["water_play"],
      is_free: true,
      reservation: "not_required",
    }),
  );
  const distractors = [
    filterFixture("wrong-type", "summer_festival", {
      prefecture: "tokyo",
      recommended_for_tags: ["water_play"],
      is_free: true,
      reservation: "not_required",
    }),
    filterFixture("wrong-prefecture", "fireworks", {
      prefecture: "chiba",
      recommended_for_tags: ["water_play"],
      is_free: true,
      reservation: "not_required",
    }),
    filterFixture("wrong-condition", "fireworks", {
      prefecture: "tokyo",
      recommended_for_tags: ["water_play"],
      is_free: false,
      reservation: "not_required",
    }),
    filterFixture("wrong-preference", "fireworks", {
      prefecture: "tokyo",
      recommended_for_tags: ["animals"],
      is_free: true,
      reservation: "not_required",
    }),
  ];
  const filtered = filterEventViews(
    [...matching, ...distractors],
    emptySelection({
      eventTypes: ["fireworks"],
      prefectures: ["tokyo"],
      quickFilters: ["free", "noReservation"],
      recommendedTags: ["water_play"],
    }),
  );
  const final = paginateEventViews(filtered, 3);

  assert.equal(filtered.length, 43);
  assert.equal(final.totalPages, 3);
  assert.equal(final.items.length, 3);
  assert.deepEqual([final.startNumber, final.endNumber], [41, 43]);
});

function filterFixture(id, eventType, overrides = {}) {
  return {
    event: {
      id,
      prefecture: "tokyo",
      event_type: eventType,
      recommended_for_tags: [],
      is_indoor: false,
      is_free: false,
      reservation: "unknown",
      ...overrides,
    },
    isThisWeekend: false,
    isThisMonth: false,
  };
}

function emptySelection(overrides = {}) {
  return {
    eventTypes: [],
    prefectures: [],
    quickFilters: [],
    recommendedTags: [],
    ...overrides,
  };
}
