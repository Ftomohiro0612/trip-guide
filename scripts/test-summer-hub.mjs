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
  getSummerEventAnchorId,
  selectSummerHeroEventsByType,
} from "../lib/summer-event-hub.ts";
import { spreadNearbySummerEventMarkers } from "../lib/summer-event-map.ts";
import {
  getSummerEventIdFromHash,
  getSummerEventPageForHash,
  getSummerEventTypePage,
} from "../lib/summer-event-pagination.ts";
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
const baseSource = JSON.parse(
  readFileSync(new URL("../data/events_data.json", import.meta.url), "utf8"),
);
const summerLocationsSource = JSON.parse(
  readFileSync(
    new URL("../data/summer_event_locations_2026.json", import.meta.url),
    "utf8",
  ),
);
const summerPageSource = readFileSync(
  new URL("../app/events/summer/page.tsx", import.meta.url),
  "utf8",
);
const summerExplorerSource = readFileSync(
  new URL("../components/SummerEventExplorer.tsx", import.meta.url),
  "utf8",
);

const CURRENT_SUMMER_MILESTONE = Object.freeze({
  newEventCount: 484,
  candidateCount: 500,
  overlayCount: 427,
  mappableCount: 22,
  holdCount: 405,
});
const PAGINATION_TEST_DATE = "2026-07-19";
const SUMMER_EVENT_TYPE_ORDER = [
  "fireworks",
  "summer_festival",
  "summer_tradition",
  "night_outing",
];

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

test("Hero events map to stable and unique detail-card anchors", () => {
  const heroIds = summerSource.metadata.hero_event_ids;
  const anchors = heroIds.map(getSummerEventAnchorId);

  assert.equal(new Set(anchors).size, heroIds.length);
  assert.deepEqual(
    anchors,
    heroIds.map((eventId) => `summer-event-${eventId}`),
  );
  assert.equal(
    anchors.every((anchor) => /^summer-event-[a-z0-9-]+$/u.test(anchor)),
    true,
  );
});

test("Summer Hero title stays fixed when supported prefectures grow", () => {
  const titleMatch = summerPageSource.match(
    /const SUMMER_HERO_TITLE = "([^"]+)";/u,
  );

  assert.equal(titleMatch?.[1], "全国の夏祭り・花火大会2026");
  assert.equal(titleMatch?.[1].length <= 20, true);
  assert.match(
    summerPageSource,
    /<h1[^>]*>\s*\{SUMMER_HERO_TITLE\}\s*<\/h1>/su,
  );
  assert.match(
    summerPageSource,
    /全国\{prefectureCount\}都道府県・\{visibleEvents\.length\}件を掲載/u,
  );
});

test("Summer map pilot builds 22 mappable points across all seven prefectures", () => {
  const baseById = new Map(baseSource.events.map((event) => [event.id, event]));
  const adoptedById = new Map([
    ...summerSource.events,
    ...summerSource.existing_event_classifications.map((classification) => ({
      ...baseById.get(classification.id),
      ...classification,
    })),
  ].map((event) => [event.id, event]));
  const mappableEntries = Object.entries(
    summerLocationsSource.locations_by_event_id,
  ).filter(([, location]) => location.coordinate_precision !== "hold");

  assert.equal(mappableEntries.length, 22);
  assert.deepEqual(
    [
      ...new Set(
        mappableEntries.map(([eventId]) => adoptedById.get(eventId).prefecture),
      ),
    ].sort(),
    [
      "chiba",
      "kanagawa",
      "nagano",
      "saitama",
      "shizuoka",
      "tokyo",
      "yamanashi",
    ],
  );
  assert.equal(
    mappableEntries.every(
      ([eventId]) =>
        adoptedById.has(eventId) &&
        /^summer-event-[a-z0-9-]+$/u.test(getSummerEventAnchorId(eventId)),
    ),
    true,
  );
});

test("Summer map overlay keeps coordinates separate and excludes hold rows", () => {
  const entries = Object.entries(summerLocationsSource.locations_by_event_id);
  const holds = entries.filter(
    ([, location]) => location.coordinate_precision === "hold",
  );

  assert.equal(entries.length, CURRENT_SUMMER_MILESTONE.overlayCount);
  assert.equal(holds.length, CURRENT_SUMMER_MILESTONE.holdCount);
  assert.equal(
    holds.every(
      ([, location]) =>
        location.latitude === null && location.longitude === null,
    ),
    true,
  );
  assert.equal(
    entries.every(([, location]) => !("facility_id" in location)),
    true,
  );
  assert.equal(
    summerSource.events.every(
      (event) => !("latitude" in event) && !("longitude" in event),
    ),
    true,
  );
});

test("Nearby Summer map markers are spread without moving isolated markers", () => {
  const nearbyA = mapPointFixture("near-a", 35.7, 139.7);
  const nearbyB = mapPointFixture("near-b", 35.7001, 139.7001);
  const isolated = mapPointFixture("isolated", 35.9, 139.9);
  const displayed = spreadNearbySummerEventMarkers([
    nearbyA,
    nearbyB,
    isolated,
  ]);
  const byId = new Map(displayed.map((point) => [point.eventId, point]));

  assert.notDeepEqual(
    [byId.get("near-a").displayLatitude, byId.get("near-a").displayLongitude],
    [nearbyA.latitude, nearbyA.longitude],
  );
  assert.notDeepEqual(
    [byId.get("near-b").displayLatitude, byId.get("near-b").displayLongitude],
    [nearbyB.latitude, nearbyB.longitude],
  );
  assert.deepEqual(
    [
      byId.get("isolated").displayLatitude,
      byId.get("isolated").displayLongitude,
    ],
    [isolated.latitude, isolated.longitude],
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

test("generic event type filters match the current candidate counts", () => {
  const classifications = [
    ...summerSource.events,
    ...summerSource.existing_event_classifications,
  ];
  const views = classifications.map((event) =>
    filterFixture(event.id, event.event_type),
  );
  const expectedCounts = {
    fireworks: 201,
    summer_festival: 205,
    summer_tradition: 86,
    night_outing: 8,
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

test("all 47 prefectures can be selected independently", () => {
  const prefectures = [
    "tokyo",
    "kanagawa",
    "chiba",
    "saitama",
    "yamanashi",
    "shizuoka",
    "nagano",
    "ibaraki",
    "tochigi",
    "gunma",
    "niigata",
    "aichi",
    "kyoto",
    "osaka",
    "hyogo",
    "hiroshima",
    "fukuoka",
    "okayama",
    "kagawa",
    "kumamoto",
    "nagasaki",
    "oita",
    "kagoshima",
    "saga",
    "miyazaki",
    "ehime",
    "tokushima",
    "kochi",
    "hokkaido",
    "aomori",
    "akita",
    "miyagi",
    "iwate",
    "yamagata",
    "fukushima",
    "mie",
    "gifu",
    "toyama",
    "ishikawa",
    "fukui",
    "shiga",
    "nara",
    "wakayama",
    "tottori",
    "shimane",
    "yamaguchi",
    "okinawa",
  ];
  const views = prefectures.map((prefecture) =>
    filterFixture(`${prefecture}-event`, "summer_festival", { prefecture }),
  );

  for (const prefecture of prefectures) {
    assert.deepEqual(
      filterEventViews(
        views,
        emptySelection({ prefectures: [prefecture] }),
      ).map((view) => view.event.id),
      [`${prefecture}-event`],
      prefecture,
    );
  }
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

test("163 fireworks and 144 festivals paginate to their expected final pages", () => {
  const views = [
    ...Array.from({ length: 163 }, (_, index) =>
      filterFixture(`fireworks-${index + 1}`, "fireworks"),
    ),
    ...Array.from({ length: 144 }, (_, index) =>
      filterFixture(`festival-${index + 1}`, "summer_festival"),
    ),
  ];

  for (const [eventType, finalPage, finalPageLength] of [
    ["fireworks", 9, 3],
    ["summer_festival", 8, 4],
  ]) {
    const filtered = filterEventViews(
      views,
      emptySelection({ eventTypes: [eventType] }),
    );
    const first = paginateEventViews(filtered, 1);
    const final = paginateEventViews(filtered, finalPage);

    assert.equal(first.items.length, 20, eventType);
    assert.equal(final.items.length, finalPageLength, eventType);
    assert.equal(final.totalPages, finalPage, eventType);
    assert.equal(final.hasNextPage, false, eventType);
  }
});

test("Summer Hub fixed-date list paginates all types together in groups of 20", () => {
  const visibleViews = getFixedDateVisibleSummerViews(PAGINATION_TEST_DATE);
  const orderedViews = orderSummerViewsByType(visibleViews);
  const first = paginateEventViews(orderedViews, 1);
  const second = paginateEventViews(orderedViews, 2);
  const final = paginateEventViews(orderedViews, 25);

  assert.equal(visibleViews.length, 496);
  assert.equal(EVENT_PAGE_SIZE, 20);
  assert.deepEqual(
    {
      firstCount: first.items.length,
      secondCount: second.items.length,
      finalCount: final.items.length,
      totalPages: first.totalPages,
      firstPrevious: first.hasPreviousPage,
      firstNext: first.hasNextPage,
      finalPrevious: final.hasPreviousPage,
      finalNext: final.hasNextPage,
      firstRange: `${first.startNumber}〜${first.endNumber}件を表示 / 全${first.totalItems}件`,
      finalRange: `${final.startNumber}〜${final.endNumber}件を表示 / 全${final.totalItems}件`,
    },
    {
      firstCount: 20,
      secondCount: 20,
      finalCount: 16,
      totalPages: 25,
      firstPrevious: false,
      firstNext: true,
      finalPrevious: true,
      finalNext: false,
      firstRange: "1〜20件を表示 / 全496件",
      finalRange: "481〜496件を表示 / 全496件",
    },
  );
  assert.equal(
    Array.from({ length: first.totalPages }, (_, index) =>
      paginateEventViews(orderedViews, index + 1),
    ).every((candidatePage) => candidatePage.items.length <= EVENT_PAGE_SIZE),
    true,
  );
  assert.deepEqual(getTypesOnPage(first.items), ["fireworks"]);
  assert.deepEqual(getTypesOnPage(final.items), [
    "summer_tradition",
    "night_outing",
  ]);
  assert.deepEqual(
    getTypesOnPage(final.items).map((eventType) =>
      final.items.filter((view) => view.event.event_type === eventType).length,
    ),
    [8, 8],
  );
});

test("Summer Hub filters recalculate pages, clamp safely, and reset through every control", () => {
  const visibleViews = orderSummerViewsByType(
    getFixedDateVisibleSummerViews(PAGINATION_TEST_DATE),
  );
  const fireworks = visibleViews.filter(
    (view) => view.event.event_type === "fireworks",
  );
  const clamped = paginateEventViews(fireworks, 999);

  assert.equal(fireworks.length, 198);
  assert.equal(clamped.currentPage, 10);
  assert.equal(clamped.totalPages, 10);
  assert.equal(clamped.items.length, 18);
  assert.equal(clamped.hasNextPage, false);
  assert.equal(
    (summerExplorerSource.match(/setCurrentPage\(1\);/gu) ?? []).length >= 4,
    true,
  );
  assert.match(
    summerExplorerSource,
    /function clearFilters\(\) \{\s*setCurrentPage\(1\);\s*setSelectedTypes\(\[\]\);\s*setSelectedPrefectures\(\[\]\);\s*setSelectedQuickFilters\(\[\]\);/su,
  );
  assert.match(summerExplorerSource, /paginateEventViews\(orderedFilteredViews, currentPage\)/u);
  assert.match(summerExplorerSource, /disabled=\{!page\.hasPreviousPage\}/u);
  assert.match(summerExplorerSource, /disabled=\{!page\.hasNextPage\}/u);
  assert.match(summerExplorerSource, /\{page\.currentPage\} \/ \{page\.totalPages\}ページ/u);
  assert.match(summerExplorerSource, /page\.items\.filter\(/u);
});

test("Summer event anchors resolve later pages and ignore invalid hashes safely", () => {
  const orderedViews = orderSummerViewsByType(
    getFixedDateVisibleSummerViews(PAGINATION_TEST_DATE),
  );
  const pageTwoEvent = orderedViews[20].event.id;
  const pageThreeEvent = orderedViews[40].event.id;
  const heroPages = summerSource.metadata.hero_event_ids.map((eventId) =>
    getSummerEventPageForHash(
      orderedViews,
      `#${getSummerEventAnchorId(eventId)}`,
      EVENT_PAGE_SIZE,
    ),
  );
  const mapPages = Object.entries(
    summerLocationsSource.locations_by_event_id,
  )
    .filter(([, location]) => location.coordinate_precision !== "hold")
    .map(([eventId]) =>
      getSummerEventPageForHash(
        orderedViews,
        `#${getSummerEventAnchorId(eventId)}`,
        EVENT_PAGE_SIZE,
      ),
    );

  assert.equal(
    getSummerEventPageForHash(
      orderedViews,
      `#${getSummerEventAnchorId(pageTwoEvent)}`,
      EVENT_PAGE_SIZE,
    ),
    2,
  );
  assert.equal(
    getSummerEventPageForHash(
      orderedViews,
      `#${getSummerEventAnchorId(pageThreeEvent)}`,
      EVENT_PAGE_SIZE,
    ),
    3,
  );
  assert.equal(heroPages.some((pageNumber) => pageNumber === 1), true);
  assert.equal(heroPages.some((pageNumber) => pageNumber > 1), true);
  assert.equal(mapPages.some((pageNumber) => pageNumber > 1), true);
  assert.equal(
    getSummerEventTypePage(
      orderedViews,
      "summer_festival",
      EVENT_PAGE_SIZE,
    ),
    10,
  );
  assert.equal(getSummerEventIdFromHash("#summer-event-missing"), "missing");
  assert.equal(
    getSummerEventPageForHash(
      orderedViews,
      "#summer-event-missing",
      EVENT_PAGE_SIZE,
    ),
    null,
  );
  assert.equal(getSummerEventIdFromHash("#summer-event-%E0%A4%A"), null);
  assert.match(summerExplorerSource, /window\.addEventListener\("hashchange"/u);
  assert.match(summerExplorerSource, /setPendingFocusId\(target\.elementId\)/u);
  assert.match(summerExplorerSource, /focusAndScrollTo\(target\)/u);
});

test("Summer pagination only receives visible views and cannot revive excluded events", () => {
  const visibleViews = getFixedDateVisibleSummerViews(PAGINATION_TEST_DATE);
  const candidateEvents = getSummerCandidateEvents();
  const visibleIds = new Set(visibleViews.map((view) => view.event.id));
  const ended = candidateEvents.filter(
    (event) => event.end_date && event.end_date < PAGINATION_TEST_DATE,
  );

  assert.equal(candidateEvents.length, 500);
  assert.equal(ended.length, 4);
  assert.equal(ended.every((event) => !visibleIds.has(event.id)), true);
  assert.equal(
    visibleViews.every(
      (view) =>
        view.event.end_date >= PAGINATION_TEST_DATE &&
        daysBetween(view.event.source_checked_at, PAGINATION_TEST_DATE) <=
          summerSource.metadata.freshness_days_hub,
    ),
    true,
  );
  assert.match(
    summerPageSource,
    /const visibleEvents = getVisibleSummerHubEvents\(today\);\s*const views = visibleEvents\.map/u,
  );
  assert.match(summerPageSource, /<SummerEventExplorer\s+views=\{views\}/u);
  assert.doesNotMatch(summerExplorerSource, /summer_events_2026|events_data\.json/u);
});

test("Yamanashi regional wave keeps the accepted schema and source boundaries", () => {
  const expectedIds = Array.from(
    { length: 10 },
    (_, index) => `evt-summer-2026-yamanashi-${String(index + 1).padStart(3, "0")}`,
  );
  const yamanashi = expectedIds.map((eventId) =>
    summerSource.events.find((event) => event.id === eventId),
  );
  const counts = Object.fromEntries(
    ["fireworks", "summer_festival", "summer_tradition", "night_outing"].map(
      (eventType) => [
        eventType,
        yamanashi.filter((event) => event.event_type === eventType).length,
      ],
    ),
  );

  assert.deepEqual(
    yamanashi.map((event) => event.id).sort(),
    expectedIds,
  );
  assert.deepEqual(counts, {
    fireworks: 6,
    summer_festival: 2,
    summer_tradition: 2,
    night_outing: 0,
  });
  assert.equal(yamanashi.every((event) => event.facility_id === null), true);
  assert.equal(
    yamanashi.every(
      (event) =>
        event.source_checked_at === "2026-07-17" &&
        /^https:\/\//u.test(event.official_url),
    ),
    true,
  );

  const isawa = yamanashi.find(
    (event) => event.id === "evt-summer-2026-yamanashi-008",
  );
  assert.equal(isawa.is_free, true);
  assert.equal(isawa.reservation, "unknown");

  const cityFestival = yamanashi.find(
    (event) => event.id === "evt-summer-2026-yamanashi-010",
  );
  assert.equal(cityFestival.is_free, null);
  assert.equal(cityFestival.reservation, "unknown");
  assert.match(cityFestival.source_notes, /限定企画だけの条件/u);
  assert.equal(summerSource.metadata.hero_event_ids.length, 12);
});

test("Shizuoka and Nagano regional waves use only the accepted data model", () => {
  const expectedByPrefecture = {
    shizuoka: {
      ids: Array.from(
        { length: 9 },
        (_, index) => `evt-summer-2026-shizuoka-${String(index + 1).padStart(3, "0")}`,
      ),
      counts: { fireworks: 4, summer_festival: 5 },
    },
    nagano: {
      ids: Array.from(
        { length: 10 },
        (_, index) => `evt-summer-2026-nagano-${String(index + 1).padStart(3, "0")}`,
      ),
      counts: { fireworks: 5, summer_festival: 5 },
    },
  };

  for (const [prefecture, expected] of Object.entries(expectedByPrefecture)) {
    const regional = summerSource.events.filter(
      (event) =>
        event.prefecture === prefecture && expected.ids.includes(event.id),
    );
    assert.deepEqual(
      regional.map((event) => event.id).sort(),
      expected.ids,
      prefecture,
    );
    assert.deepEqual(
      {
        fireworks: regional.filter((event) => event.event_type === "fireworks").length,
        summer_festival: regional.filter(
          (event) => event.event_type === "summer_festival",
        ).length,
      },
      expected.counts,
      prefecture,
    );
    assert.equal(regional.every((event) => event.facility_id === null), true);
    assert.equal(
      regional.every(
        (event) =>
          event.source_checked_at >= "2026-07-17" &&
          event.feature_hubs.length === 1 &&
          event.feature_hubs[0] === "summer-2026",
      ),
      true,
    );
  }

  const numazu = summerSource.events.find(
    (event) => event.id === "evt-summer-2026-shizuoka-002",
  );
  assert.equal(numazu.is_free, null);
  assert.equal(numazu.reservation, "unknown");
  assert.match(numazu.source_notes, /観覧席券の条件を一般来場へ転用していない/u);

  const ueda = summerSource.events.find(
    (event) => event.id === "evt-summer-2026-nagano-001",
  );
  assert.equal(ueda.reservation, "unknown");
  assert.match(ueda.source_notes, /踊り参加の限定条件/u);
});

test("Ibaraki, Tochigi, Gunma, and Niigata regional batch uses only the accepted data model", () => {
  const expectedByPrefecture = {
    ibaraki: { total: 6, fireworks: 4, summer_festival: 2 },
    tochigi: { total: 6, fireworks: 3, summer_festival: 2 },
    gunma: { total: 5, fireworks: 1, summer_festival: 4 },
    niigata: { total: 5, fireworks: 3, summer_festival: 2 },
  };

  for (const [prefecture, expected] of Object.entries(expectedByPrefecture)) {
    const originalWaveId = new RegExp(
      `^evt-summer-2026-${prefecture}-00[1-${expected.total}]$`,
      "u",
    );
    const regional = summerSource.events.filter(
      (event) =>
        event.prefecture === prefecture && originalWaveId.test(event.id),
    );
    assert.equal(regional.length, expected.total, prefecture);
    assert.deepEqual(
      {
        fireworks: regional.filter((event) => event.event_type === "fireworks").length,
        summer_festival: regional.filter(
          (event) => event.event_type === "summer_festival",
        ).length,
      },
      {
        fireworks: expected.fireworks,
        summer_festival: expected.summer_festival,
      },
      prefecture,
    );
    assert.equal(
      regional.every(
        (event) =>
          event.facility_id === null &&
          event.source_checked_at === "2026-07-17" &&
          event.feature_hubs.length === 1 &&
          event.feature_hubs[0] === "summer-2026",
      ),
      true,
      prefecture,
    );
  }
});

test("Aichi, Kyoto, Osaka, and Hyogo regional batch uses only the accepted data model", () => {
  const expectedByPrefecture = {
    aichi: { total: 5, fireworks: 2, summer_festival: 3, summer_tradition: 0 },
    kyoto: { total: 6, fireworks: 0, summer_festival: 5, summer_tradition: 1 },
    osaka: { total: 5, fireworks: 1, summer_festival: 4, summer_tradition: 0 },
    hyogo: { total: 5, fireworks: 2, summer_festival: 3, summer_tradition: 0 },
  };

  for (const [prefecture, expected] of Object.entries(expectedByPrefecture)) {
    const originalWaveId = new RegExp(
      `^evt-summer-2026-${prefecture}-00[1-${expected.total}]$`,
      "u",
    );
    const regional = summerSource.events.filter(
      (event) =>
        event.prefecture === prefecture && originalWaveId.test(event.id),
    );
    assert.equal(regional.length, expected.total, prefecture);
    assert.deepEqual(
      {
        fireworks: regional.filter((event) => event.event_type === "fireworks").length,
        summer_festival: regional.filter(
          (event) => event.event_type === "summer_festival",
        ).length,
        summer_tradition: regional.filter(
          (event) => event.event_type === "summer_tradition",
        ).length,
      },
      {
        fireworks: expected.fireworks,
        summer_festival: expected.summer_festival,
        summer_tradition: expected.summer_tradition,
      },
      prefecture,
    );
    assert.equal(
      regional.every(
        (event) =>
          event.facility_id === null &&
          event.source_checked_at >= "2026-07-17" &&
          event.feature_hubs.length === 1 &&
          event.feature_hubs[0] === "summer-2026",
      ),
      true,
      prefecture,
    );
  }

  const sumiyoshi = summerSource.events.find(
    (event) => event.id === "evt-summer-2026-osaka-004",
  );
  assert.deepEqual(sumiyoshi.occurrence_dates, [
    "2026-07-20",
    "2026-07-26",
    "2026-07-30",
    "2026-07-31",
    "2026-08-01",
  ]);

  for (const eventId of [
    "evt-summer-2026-hyogo-001",
    "evt-summer-2026-hyogo-005",
  ]) {
    const event = summerSource.events.find((candidate) => candidate.id === eventId);
    assert.equal(event.is_free, false, eventId);
    assert.equal(event.reservation, "required", eventId);
  }

  const benten = summerSource.events.find(
    (event) => event.id === "evt-summer-2026-osaka-003",
  );
  assert.equal(benten.is_free, true);
  assert.equal(benten.reservation, "unknown");
});

test("Hiroshima, Fukuoka, Okayama, and Kagawa regional batch uses only the accepted data model", () => {
  const expectedByPrefecture = {
    hiroshima: { total: 5, fireworks: 3, summer_festival: 2 },
    fukuoka: { total: 5, fireworks: 2, summer_festival: 3 },
    okayama: { total: 5, fireworks: 3, summer_festival: 2 },
    kagawa: { total: 5, fireworks: 3, summer_festival: 2 },
  };

  for (const [prefecture, expected] of Object.entries(expectedByPrefecture)) {
    const originalWaveId = new RegExp(
      `^evt-summer-2026-${prefecture}-00[1-${expected.total}]$`,
      "u",
    );
    const regional = summerSource.events.filter(
      (event) =>
        event.prefecture === prefecture && originalWaveId.test(event.id),
    );
    assert.equal(regional.length, expected.total, prefecture);
    assert.deepEqual(
      {
        fireworks: regional.filter((event) => event.event_type === "fireworks")
          .length,
        summer_festival: regional.filter(
          (event) => event.event_type === "summer_festival",
        ).length,
      },
      {
        fireworks: expected.fireworks,
        summer_festival: expected.summer_festival,
      },
      prefecture,
    );
    assert.equal(
      regional.every(
        (event) =>
          event.facility_id === null &&
          event.source_checked_at >= "2026-07-17" &&
          event.feature_hubs.length === 1 &&
          event.feature_hubs[0] === "summer-2026",
      ),
      true,
      prefecture,
    );

    const overlays = regional.map(
      (event) => summerLocationsSource.locations_by_event_id[event.id],
    );
    assert.equal(
      overlays.every(
        (location) =>
          location?.coordinate_precision === "hold" &&
          location.latitude === null &&
          location.longitude === null,
      ),
      true,
      `${prefecture} overlays`,
    );
  }

  const innoshima = summerSource.events.find(
    (event) => event.id === "evt-summer-2026-hiroshima-005",
  );
  assert.deepEqual(innoshima.occurrence_dates, ["2026-08-30", "2026-09-20"]);

  for (const eventId of [
    "evt-summer-2026-fukuoka-001",
    "evt-summer-2026-fukuoka-003",
  ]) {
    const event = summerSource.events.find((candidate) => candidate.id === eventId);
    assert.equal(event.is_free, true, eventId);
    assert.equal(event.reservation, "unknown", eventId);
  }

  const sakaide = summerSource.events.find(
    (event) => event.id === "evt-summer-2026-kagawa-002",
  );
  assert.match(sakaide.source_notes, /海上花火大会のみ/u);

  const marugame = summerSource.events.find(
    (event) => event.id === "evt-summer-2026-kagawa-004",
  );
  assert.equal(marugame.is_free, null);
  assert.equal(marugame.reservation, "unknown");
});

test("Kumamoto, Nagasaki, Oita, and Kagoshima regional batch uses only the accepted data model", () => {
  const expectedByPrefecture = {
    kumamoto: { total: 6, fireworks: 2, summer_festival: 3, summer_tradition: 1 },
    nagasaki: { total: 6, fireworks: 3, summer_festival: 2, summer_tradition: 1 },
    oita: { total: 6, fireworks: 2, summer_festival: 2, summer_tradition: 2 },
    kagoshima: { total: 6, fireworks: 5, summer_festival: 1, summer_tradition: 0 },
  };

  for (const [prefecture, expected] of Object.entries(expectedByPrefecture)) {
    const originalWaveId = new RegExp(
      `^evt-summer-2026-${prefecture}-00[1-${expected.total}]$`,
    );
    const regional = summerSource.events.filter(
      (event) =>
        event.prefecture === prefecture && originalWaveId.test(event.id),
    );
    assert.equal(regional.length, expected.total, prefecture);
    assert.deepEqual(
      {
        fireworks: regional.filter((event) => event.event_type === "fireworks")
          .length,
        summer_festival: regional.filter(
          (event) => event.event_type === "summer_festival",
        ).length,
        summer_tradition: regional.filter(
          (event) => event.event_type === "summer_tradition",
        ).length,
      },
      {
        fireworks: expected.fireworks,
        summer_festival: expected.summer_festival,
        summer_tradition: expected.summer_tradition,
      },
      prefecture,
    );
    assert.equal(
      regional.every(
        (event) =>
          event.facility_id === null &&
          event.source_checked_at >= "2026-07-17" &&
          event.feature_hubs.length === 1 &&
          event.feature_hubs[0] === "summer-2026",
      ),
      true,
      prefecture,
    );

    const overlays = regional.map(
      (event) => summerLocationsSource.locations_by_event_id[event.id],
    );
    assert.equal(
      overlays.every(
        (location) =>
          location?.coordinate_precision === "hold" &&
          location.latitude === null &&
          location.longitude === null,
      ),
      true,
      `${prefecture} overlays`,
    );
  }

  const omura = summerSource.events.find(
    (event) => event.id === "evt-summer-2026-nagasaki-003",
  );
  assert.match(omura.source_notes, /過年度花火情報/u);

  for (const eventId of [
    "evt-summer-2026-kumamoto-002",
    "evt-summer-2026-kagoshima-003",
  ]) {
    const event = summerSource.events.find((candidate) => candidate.id === eventId);
    assert.equal(event.is_free, null, eventId);
    assert.equal(event.reservation, "unknown", eventId);
  }
});

test("Saga, Miyazaki, Ehime, Tokushima, and Kochi milestone batch uses only the accepted data model", () => {
  const expectedByPrefecture = {
    saga: { total: 4, fireworks: 3, summer_festival: 1, summer_tradition: 0 },
    miyazaki: { total: 4, fireworks: 1, summer_festival: 3, summer_tradition: 0 },
    ehime: { total: 4, fireworks: 2, summer_festival: 1, summer_tradition: 1 },
    tokushima: { total: 4, fireworks: 0, summer_festival: 2, summer_tradition: 2 },
    kochi: { total: 4, fireworks: 3, summer_festival: 0, summer_tradition: 1 },
  };

  for (const [prefecture, expected] of Object.entries(expectedByPrefecture)) {
    const originalWaveId = new RegExp(
      `^evt-summer-2026-${prefecture}-00[1-${expected.total}]$`,
      "u",
    );
    const regional = summerSource.events.filter(
      (event) =>
        event.prefecture === prefecture && originalWaveId.test(event.id),
    );
    assert.equal(regional.length, expected.total, prefecture);
    assert.deepEqual(
      {
        fireworks: regional.filter((event) => event.event_type === "fireworks")
          .length,
        summer_festival: regional.filter(
          (event) => event.event_type === "summer_festival",
        ).length,
        summer_tradition: regional.filter(
          (event) => event.event_type === "summer_tradition",
        ).length,
      },
      {
        fireworks: expected.fireworks,
        summer_festival: expected.summer_festival,
        summer_tradition: expected.summer_tradition,
      },
      prefecture,
    );
    assert.equal(
      regional.every(
        (event) =>
          event.facility_id === null &&
          event.source_checked_at >= "2026-07-17" &&
          event.source_urls.length > 0 &&
          event.feature_hubs.length === 1 &&
          event.feature_hubs[0] === "summer-2026",
      ),
      true,
      prefecture,
    );

    const overlays = regional.map(
      (event) => summerLocationsSource.locations_by_event_id[event.id],
    );
    assert.equal(
      overlays.every(
        (location) =>
          location?.coordinate_precision === "hold" &&
          location.latitude === null &&
          location.longitude === null,
      ),
      true,
      `${prefecture} overlays`,
    );
  }
});

test("Hokkaido, Aomori, Akita, and Miyagi expansion uses only the accepted data model", () => {
  const expectedByPrefecture = {
    hokkaido: { total: 4, fireworks: 0, summer_festival: 4, summer_tradition: 0 },
    aomori: { total: 4, fireworks: 0, summer_festival: 0, summer_tradition: 4 },
    akita: { total: 4, fireworks: 0, summer_festival: 0, summer_tradition: 4 },
    miyagi: { total: 4, fireworks: 1, summer_festival: 2, summer_tradition: 1 },
  };

  for (const [prefecture, expected] of Object.entries(expectedByPrefecture)) {
    const originalWaveId = new RegExp(
      `^evt-summer-2026-${prefecture}-00[1-${expected.total}]$`,
      "u",
    );
    const regional = summerSource.events.filter(
      (event) =>
        event.prefecture === prefecture && originalWaveId.test(event.id),
    );
    assert.equal(regional.length, expected.total, prefecture);
    assert.deepEqual(
      {
        fireworks: regional.filter((event) => event.event_type === "fireworks")
          .length,
        summer_festival: regional.filter(
          (event) => event.event_type === "summer_festival",
        ).length,
        summer_tradition: regional.filter(
          (event) => event.event_type === "summer_tradition",
        ).length,
      },
      {
        fireworks: expected.fireworks,
        summer_festival: expected.summer_festival,
        summer_tradition: expected.summer_tradition,
      },
      prefecture,
    );
    assert.equal(
      regional.every(
        (event) =>
          event.facility_id === null &&
          event.source_checked_at === "2026-07-17" &&
          event.source_urls.length > 0 &&
          event.feature_hubs.length === 1 &&
          event.feature_hubs[0] === "summer-2026",
      ),
      true,
      prefecture,
    );

    const overlays = regional.map(
      (event) => summerLocationsSource.locations_by_event_id[event.id],
    );
    assert.equal(
      overlays.every(
        (location) =>
          location?.coordinate_precision === "hold" &&
          location.latitude === null &&
          location.longitude === null,
      ),
      true,
      `${prefecture} overlays`,
    );
  }
});

test("Iwate, Yamagata, and Fukushima expansion completes the combined northern batch", () => {
  const expectedByPrefecture = {
    iwate: { total: 4, fireworks: 1, summer_festival: 1, summer_tradition: 2 },
    yamagata: { total: 4, fireworks: 2, summer_festival: 0, summer_tradition: 2 },
    fukushima: { total: 4, fireworks: 2, summer_festival: 1, summer_tradition: 1 },
  };

  assert.equal(summerSource.metadata.new_event_count, CURRENT_SUMMER_MILESTONE.newEventCount);
  assert.equal(summerSource.metadata.candidate_count, CURRENT_SUMMER_MILESTONE.candidateCount);

  for (const [prefecture, expected] of Object.entries(expectedByPrefecture)) {
    const originalWaveId = new RegExp(
      `^evt-summer-2026-${prefecture}-00[1-${expected.total}]$`,
      "u",
    );
    const regional = summerSource.events.filter(
      (event) =>
        event.prefecture === prefecture && originalWaveId.test(event.id),
    );
    assert.equal(regional.length, expected.total, prefecture);
    assert.deepEqual(
      {
        fireworks: regional.filter((event) => event.event_type === "fireworks")
          .length,
        summer_festival: regional.filter(
          (event) => event.event_type === "summer_festival",
        ).length,
        summer_tradition: regional.filter(
          (event) => event.event_type === "summer_tradition",
        ).length,
      },
      {
        fireworks: expected.fireworks,
        summer_festival: expected.summer_festival,
        summer_tradition: expected.summer_tradition,
      },
      prefecture,
    );
    assert.equal(
      regional.every(
        (event) =>
          event.facility_id === null &&
          event.source_checked_at === "2026-07-17" &&
          event.source_urls.length > 0 &&
          event.feature_hubs.length === 1 &&
          event.feature_hubs[0] === "summer-2026",
      ),
      true,
      prefecture,
    );

    const overlays = regional.map(
      (event) => summerLocationsSource.locations_by_event_id[event.id],
    );
    assert.equal(
      overlays.every(
        (location) =>
          location?.coordinate_precision === "hold" &&
          location.latitude === null &&
          location.longitude === null,
      ),
      true,
      `${prefecture} overlays`,
    );
  }
});

test("Mie, Gifu, Toyama, Ishikawa, and Fukui expansion uses only the accepted data model", () => {
  const expectedByPrefecture = {
    mie: { total: 4, fireworks: 4, summer_festival: 0, summer_tradition: 0 },
    gifu: { total: 4, fireworks: 3, summer_festival: 0, summer_tradition: 1 },
    toyama: { total: 4, fireworks: 1, summer_festival: 2, summer_tradition: 1 },
    ishikawa: { total: 4, fireworks: 2, summer_festival: 0, summer_tradition: 2 },
    fukui: { total: 4, fireworks: 4, summer_festival: 0, summer_tradition: 0 },
  };

  assert.equal(summerSource.metadata.new_event_count, CURRENT_SUMMER_MILESTONE.newEventCount);
  assert.equal(summerSource.metadata.candidate_count, CURRENT_SUMMER_MILESTONE.candidateCount);
  assert.equal(summerLocationsSource.metadata.overlay_count, CURRENT_SUMMER_MILESTONE.overlayCount);
  assert.equal(summerLocationsSource.metadata.mappable_count, CURRENT_SUMMER_MILESTONE.mappableCount);
  assert.equal(summerLocationsSource.metadata.hold_count, CURRENT_SUMMER_MILESTONE.holdCount);

  for (const [prefecture, expected] of Object.entries(expectedByPrefecture)) {
    const originalWaveId = new RegExp(
      `^evt-summer-2026-${prefecture}-00[1-${expected.total}]$`,
      "u",
    );
    const regional = summerSource.events.filter(
      (event) =>
        event.prefecture === prefecture && originalWaveId.test(event.id),
    );
    assert.equal(regional.length, expected.total, prefecture);
    assert.deepEqual(
      {
        fireworks: regional.filter((event) => event.event_type === "fireworks")
          .length,
        summer_festival: regional.filter(
          (event) => event.event_type === "summer_festival",
        ).length,
        summer_tradition: regional.filter(
          (event) => event.event_type === "summer_tradition",
        ).length,
      },
      {
        fireworks: expected.fireworks,
        summer_festival: expected.summer_festival,
        summer_tradition: expected.summer_tradition,
      },
      prefecture,
    );
    assert.equal(
      regional.every(
        (event) =>
          event.facility_id === null &&
          event.source_checked_at === "2026-07-17" &&
          event.source_urls.length > 0 &&
          event.feature_hubs.length === 1 &&
          event.feature_hubs[0] === "summer-2026",
      ),
      true,
      prefecture,
    );
    assert.match(summerExplorerSource, new RegExp(`id: "${prefecture}"`));

    const overlays = regional.map(
      (event) => summerLocationsSource.locations_by_event_id[event.id],
    );
    assert.equal(
      overlays.every(
        (location) =>
          location?.coordinate_precision === "hold" &&
          location.latitude === null &&
          location.longitude === null,
      ),
      true,
      `${prefecture} overlays`,
    );
  }

  const gujoOdori = summerSource.events.find(
    (event) => event.id === "evt-summer-2026-gifu-004",
  );
  const katayamazuFireworks = summerSource.events.find(
    (event) => event.id === "evt-summer-2026-ishikawa-003",
  );
  assert.equal(gujoOdori?.occurrence_dates?.length, 30);
  assert.equal(katayamazuFireworks?.occurrence_dates?.length, 30);
});

test("nationwide coverage wave reaches 300 accepted events across all 47 prefectures", () => {
  const expectedNewPrefectures = {
    shiga: { fireworks: 3, summer_festival: 1, summer_tradition: 1 },
    nara: { fireworks: 2, summer_festival: 2, summer_tradition: 1 },
    wakayama: { fireworks: 5, summer_festival: 0, summer_tradition: 0 },
    tottori: { fireworks: 1, summer_festival: 3, summer_tradition: 1 },
    shimane: { fireworks: 4, summer_festival: 0, summer_tradition: 1 },
    yamaguchi: { fireworks: 2, summer_festival: 1, summer_tradition: 2 },
    okinawa: { fireworks: 0, summer_festival: 4, summer_tradition: 1 },
  };
  const supplementIds = [
    "evt-summer-2026-ibaraki-005",
    "evt-summer-2026-ibaraki-006",
    "evt-summer-2026-tochigi-005",
    "evt-summer-2026-tochigi-006",
    "evt-summer-2026-kyoto-005",
    "evt-summer-2026-kyoto-006",
    "evt-summer-2026-kumamoto-005",
    "evt-summer-2026-kumamoto-006",
    "evt-summer-2026-nagasaki-005",
    "evt-summer-2026-nagasaki-006",
    "evt-summer-2026-oita-005",
    "evt-summer-2026-oita-006",
    "evt-summer-2026-kagoshima-005",
    "evt-summer-2026-kagoshima-006",
  ];
  const prefectures = new Set(
    summerSource.events.map((event) => event.prefecture),
  );

  assert.equal(summerSource.metadata.new_event_count, CURRENT_SUMMER_MILESTONE.newEventCount);
  assert.equal(summerSource.metadata.existing_event_count, 16);
  assert.equal(summerSource.metadata.candidate_count, CURRENT_SUMMER_MILESTONE.candidateCount);
  assert.equal(prefectures.size, 47);
  assert.equal(summerLocationsSource.metadata.overlay_count, CURRENT_SUMMER_MILESTONE.overlayCount);
  assert.equal(summerLocationsSource.metadata.mappable_count, CURRENT_SUMMER_MILESTONE.mappableCount);
  assert.equal(summerLocationsSource.metadata.hold_count, CURRENT_SUMMER_MILESTONE.holdCount);

  for (const [prefecture, expected] of Object.entries(
    expectedNewPrefectures,
  )) {
    const originalWaveId = new RegExp(
      `^evt-summer-2026-${prefecture}-00[1-5]$`,
      "u",
    );
    const regional = summerSource.events.filter(
      (event) =>
        event.prefecture === prefecture && originalWaveId.test(event.id),
    );
    assert.equal(regional.length, 5, prefecture);
    assert.deepEqual(
      {
        fireworks: regional.filter((event) => event.event_type === "fireworks")
          .length,
        summer_festival: regional.filter(
          (event) => event.event_type === "summer_festival",
        ).length,
        summer_tradition: regional.filter(
          (event) => event.event_type === "summer_tradition",
        ).length,
      },
      expected,
      prefecture,
    );
    assert.equal(
      regional.every(
        (event) =>
          event.facility_id === null &&
          event.source_checked_at === "2026-07-17" &&
          event.source_urls.length > 0 &&
          summerLocationsSource.locations_by_event_id[event.id]
            ?.coordinate_precision === "hold",
      ),
      true,
      prefecture,
    );
    assert.match(summerExplorerSource, new RegExp('id: "' + prefecture + '"'));
  }

  assert.equal(
    supplementIds.every(
      (eventId) =>
        summerSource.events.some((event) => event.id === eventId) &&
        summerLocationsSource.locations_by_event_id[eventId]
          ?.coordinate_precision === "hold",
    ),
    true,
  );
  assert.match(summerPageSource, /全国47都道府県/u);
});

test("high-demand regional gap wave adds only the 22 officially sourced rows", () => {
  const expectedByPrefecture = {
    tokyo: 2,
    hokkaido: 4,
    aichi: 3,
    osaka: 3,
    kyoto: 2,
    hyogo: 3,
    fukuoka: 3,
    okinawa: 2,
  };
  const expectedIds = [
    "evt-summer-2026-tokyo-023",
    "evt-summer-2026-tokyo-024",
    "evt-summer-2026-hokkaido-005",
    "evt-summer-2026-hokkaido-006",
    "evt-summer-2026-hokkaido-007",
    "evt-summer-2026-hokkaido-008",
    "evt-summer-2026-aichi-006",
    "evt-summer-2026-aichi-007",
    "evt-summer-2026-aichi-008",
    "evt-summer-2026-osaka-006",
    "evt-summer-2026-osaka-007",
    "evt-summer-2026-osaka-008",
    "evt-summer-2026-kyoto-007",
    "evt-summer-2026-kyoto-008",
    "evt-summer-2026-hyogo-006",
    "evt-summer-2026-hyogo-007",
    "evt-summer-2026-hyogo-008",
    "evt-summer-2026-fukuoka-006",
    "evt-summer-2026-fukuoka-007",
    "evt-summer-2026-fukuoka-008",
    "evt-summer-2026-okinawa-006",
    "evt-summer-2026-okinawa-007",
  ];
  const additions = expectedIds.map((eventId) =>
    summerSource.events.find((event) => event.id === eventId),
  );

  assert.equal(summerSource.metadata.new_event_count, CURRENT_SUMMER_MILESTONE.newEventCount);
  assert.equal(summerSource.metadata.existing_event_count, 16);
  assert.equal(summerSource.metadata.candidate_count, CURRENT_SUMMER_MILESTONE.candidateCount);
  assert.equal(summerLocationsSource.metadata.overlay_count, CURRENT_SUMMER_MILESTONE.overlayCount);
  assert.equal(summerLocationsSource.metadata.mappable_count, CURRENT_SUMMER_MILESTONE.mappableCount);
  assert.equal(summerLocationsSource.metadata.hold_count, CURRENT_SUMMER_MILESTONE.holdCount);
  assert.equal(additions.every(Boolean), true);
  assert.deepEqual(
    Object.fromEntries(
      Object.keys(expectedByPrefecture).map((prefecture) => [
        prefecture,
        additions.filter((event) => event.prefecture === prefecture).length,
      ]),
    ),
    expectedByPrefecture,
  );
  assert.deepEqual(
    {
      fireworks: additions.filter((event) => event.event_type === "fireworks")
        .length,
      summer_festival: additions.filter(
        (event) => event.event_type === "summer_festival",
      ).length,
      summer_tradition: additions.filter(
        (event) => event.event_type === "summer_tradition",
      ).length,
      night_outing: additions.filter(
        (event) => event.event_type === "night_outing",
      ).length,
    },
    {
      fireworks: 8,
      summer_festival: 9,
      summer_tradition: 4,
      night_outing: 1,
    },
  );
  assert.equal(
    additions.every(
      (event) =>
        event.facility_id === null &&
        event.source_checked_at === "2026-07-18" &&
        event.source_urls.length > 0 &&
        event.feature_hubs.length === 1 &&
        event.feature_hubs[0] === "summer-2026" &&
        summerLocationsSource.locations_by_event_id[event.id]
          ?.coordinate_precision === "hold",
    ),
    true,
  );
  assert.equal(
    summerSource.events.find(
      (event) => event.id === "evt-summer-2026-saitama-007",
    )?.source_checked_at,
    "2026-07-18",
  );
});

test("lightweight product analysis wave adds 16 demand-region events in the accepted model", () => {
  const expectedByPrefecture = {
    aichi: 2,
    osaka: 2,
    hyogo: 3,
    fukuoka: 4,
    okinawa: 2,
    hokkaido: 3,
  };
  const expectedIds = [
    "evt-summer-2026-aichi-009",
    "evt-summer-2026-aichi-010",
    "evt-summer-2026-osaka-009",
    "evt-summer-2026-osaka-010",
    "evt-summer-2026-hyogo-009",
    "evt-summer-2026-hyogo-010",
    "evt-summer-2026-hyogo-011",
    "evt-summer-2026-fukuoka-009",
    "evt-summer-2026-fukuoka-010",
    "evt-summer-2026-fukuoka-011",
    "evt-summer-2026-fukuoka-012",
    "evt-summer-2026-okinawa-008",
    "evt-summer-2026-okinawa-009",
    "evt-summer-2026-hokkaido-009",
    "evt-summer-2026-hokkaido-010",
    "evt-summer-2026-hokkaido-011",
  ];
  const additions = expectedIds.map((eventId) =>
    summerSource.events.find((event) => event.id === eventId),
  );

  assert.equal(summerSource.metadata.new_event_count, CURRENT_SUMMER_MILESTONE.newEventCount);
  assert.equal(summerSource.metadata.existing_event_count, 16);
  assert.equal(summerSource.metadata.candidate_count, CURRENT_SUMMER_MILESTONE.candidateCount);
  assert.equal(summerLocationsSource.metadata.overlay_count, CURRENT_SUMMER_MILESTONE.overlayCount);
  assert.equal(summerLocationsSource.metadata.mappable_count, CURRENT_SUMMER_MILESTONE.mappableCount);
  assert.equal(summerLocationsSource.metadata.hold_count, CURRENT_SUMMER_MILESTONE.holdCount);
  assert.equal(additions.every(Boolean), true);
  assert.deepEqual(
    Object.fromEntries(
      Object.keys(expectedByPrefecture).map((prefecture) => [
        prefecture,
        additions.filter((event) => event.prefecture === prefecture).length,
      ]),
    ),
    expectedByPrefecture,
  );
  assert.deepEqual(
    {
      fireworks: additions.filter((event) => event.event_type === "fireworks")
        .length,
      summer_festival: additions.filter(
        (event) => event.event_type === "summer_festival",
      ).length,
      summer_tradition: additions.filter(
        (event) => event.event_type === "summer_tradition",
      ).length,
      night_outing: additions.filter(
        (event) => event.event_type === "night_outing",
      ).length,
    },
    {
      fireworks: 6,
      summer_festival: 7,
      summer_tradition: 2,
      night_outing: 1,
    },
  );
  assert.equal(
    additions.every(
      (event) =>
        event.facility_id === null &&
        event.source_checked_at === "2026-07-18" &&
        event.source_urls.length > 0 &&
        event.feature_hubs.length === 1 &&
        event.feature_hubs[0] === "summer-2026" &&
        summerLocationsSource.locations_by_event_id[event.id]
          ?.coordinate_precision === "hold" &&
        summerLocationsSource.locations_by_event_id[event.id]?.latitude ===
          null &&
        summerLocationsSource.locations_by_event_id[event.id]?.longitude ===
          null,
    ),
    true,
  );
  assert.equal(
    summerSource.events.find(
      (event) => event.id === "evt-summer-2026-hyogo-010",
    )?.event_type,
    "summer_festival",
  );
  assert.match(
    summerSource.events.find(
      (event) => event.id === "evt-summer-2026-okinawa-009",
    )?.source_notes ?? "",
    /最終案内/u,
  );
});

test("350-event milestone wave adds only 12 sourced rows to the three selected four-event prefectures", () => {
  const expectedByPrefecture = {
    akita: 4,
    aomori: 4,
    mie: 4,
  };
  const expectedIds = Object.keys(expectedByPrefecture).flatMap((prefecture) =>
    Array.from(
      { length: 4 },
      (_, index) =>
        `evt-summer-2026-${prefecture}-${String(index + 5).padStart(3, "0")}`,
    ),
  );
  const additions = expectedIds.map((eventId) =>
    summerSource.events.find((event) => event.id === eventId),
  );

  assert.equal(summerSource.metadata.new_event_count, CURRENT_SUMMER_MILESTONE.newEventCount);
  assert.equal(summerSource.metadata.existing_event_count, 16);
  assert.equal(summerSource.metadata.candidate_count, CURRENT_SUMMER_MILESTONE.candidateCount);
  assert.equal(summerLocationsSource.metadata.overlay_count, CURRENT_SUMMER_MILESTONE.overlayCount);
  assert.equal(summerLocationsSource.metadata.mappable_count, CURRENT_SUMMER_MILESTONE.mappableCount);
  assert.equal(summerLocationsSource.metadata.hold_count, CURRENT_SUMMER_MILESTONE.holdCount);
  assert.equal(additions.every(Boolean), true);
  assert.deepEqual(
    Object.fromEntries(
      Object.keys(expectedByPrefecture).map((prefecture) => [
        prefecture,
        additions.filter((event) => event.prefecture === prefecture).length,
      ]),
    ),
    expectedByPrefecture,
  );
  assert.deepEqual(
    {
      fireworks: additions.filter((event) => event.event_type === "fireworks")
        .length,
      summer_festival: additions.filter(
        (event) => event.event_type === "summer_festival",
      ).length,
      summer_tradition: additions.filter(
        (event) => event.event_type === "summer_tradition",
      ).length,
      night_outing: additions.filter(
        (event) => event.event_type === "night_outing",
      ).length,
    },
    {
      fireworks: 9,
      summer_festival: 2,
      summer_tradition: 1,
      night_outing: 0,
    },
  );
  assert.equal(
    additions.every(
      (event) =>
        event.facility_id === null &&
        event.source_checked_at === "2026-07-18" &&
        event.source_urls.length > 0 &&
        event.source_urls.every((sourceUrl) => sourceUrl.startsWith("https://")) &&
        event.feature_hubs.length === 1 &&
        event.feature_hubs[0] === "summer-2026" &&
        event.start_date >= "2026-07-20" &&
        event.end_date <= "2026-09-27" &&
        summerLocationsSource.locations_by_event_id[event.id]
          ?.coordinate_precision === "hold" &&
        summerLocationsSource.locations_by_event_id[event.id]?.latitude ===
          null &&
        summerLocationsSource.locations_by_event_id[event.id]?.longitude ===
          null,
    ),
    true,
  );
  assert.equal(
    summerSource.events.filter((event) =>
      /^evt-summer-2026-akita-00[1-8]$/u.test(event.id),
    ).length,
    8,
  );
  assert.equal(
    summerSource.events.filter((event) =>
      /^evt-summer-2026-aomori-00[1-8]$/u.test(event.id),
    ).length,
    8,
  );
  assert.equal(
    summerSource.events.filter((event) =>
      /^evt-summer-2026-mie-00[1-8]$/u.test(event.id),
    ).length,
    8,
  );
});

test("post-350 normal L2 wave adds nine official low-density regional events", () => {
  const expectedByPrefecture = {
    miyagi: 2,
    fukui: 2,
    toyama: 2,
    iwate: 1,
    yamagata: 1,
    fukushima: 1,
  };
  const expectedIds = [
    "evt-summer-2026-miyagi-005",
    "evt-summer-2026-miyagi-006",
    "evt-summer-2026-fukui-005",
    "evt-summer-2026-fukui-006",
    "evt-summer-2026-toyama-005",
    "evt-summer-2026-toyama-006",
    "evt-summer-2026-iwate-005",
    "evt-summer-2026-yamagata-005",
    "evt-summer-2026-fukushima-005",
  ];
  const additions = expectedIds.map((eventId) =>
    summerSource.events.find((event) => event.id === eventId),
  );

  assert.equal(summerSource.metadata.new_event_count, CURRENT_SUMMER_MILESTONE.newEventCount);
  assert.equal(summerSource.metadata.existing_event_count, 16);
  assert.equal(summerSource.metadata.candidate_count, CURRENT_SUMMER_MILESTONE.candidateCount);
  assert.equal(summerLocationsSource.metadata.overlay_count, CURRENT_SUMMER_MILESTONE.overlayCount);
  assert.equal(summerLocationsSource.metadata.mappable_count, CURRENT_SUMMER_MILESTONE.mappableCount);
  assert.equal(summerLocationsSource.metadata.hold_count, CURRENT_SUMMER_MILESTONE.holdCount);
  assert.equal(additions.every(Boolean), true);
  assert.deepEqual(
    Object.fromEntries(
      Object.keys(expectedByPrefecture).map((prefecture) => [
        prefecture,
        additions.filter((event) => event.prefecture === prefecture).length,
      ]),
    ),
    expectedByPrefecture,
  );
  assert.deepEqual(
    {
      fireworks: additions.filter((event) => event.event_type === "fireworks")
        .length,
      summer_festival: additions.filter(
        (event) => event.event_type === "summer_festival",
      ).length,
      summer_tradition: additions.filter(
        (event) => event.event_type === "summer_tradition",
      ).length,
      night_outing: additions.filter(
        (event) => event.event_type === "night_outing",
      ).length,
    },
    {
      fireworks: 1,
      summer_festival: 2,
      summer_tradition: 6,
      night_outing: 0,
    },
  );
  assert.equal(
    additions.every(
      (event) =>
        event.facility_id === null &&
        event.source_checked_at === "2026-07-18" &&
        event.source_urls.length > 0 &&
        event.source_urls.every((sourceUrl) => sourceUrl.startsWith("https://")) &&
        event.feature_hubs.length === 1 &&
        event.feature_hubs[0] === "summer-2026" &&
        event.start_date >= "2026-07-19" &&
        event.end_date <= "2026-09-27" &&
        summerLocationsSource.locations_by_event_id[event.id]
          ?.coordinate_precision === "hold" &&
        summerLocationsSource.locations_by_event_id[event.id]?.latitude ===
          null &&
        summerLocationsSource.locations_by_event_id[event.id]?.longitude ===
          null,
    ),
    true,
  );
});

test("regional normal L2 continuation expands the shared branch to 375 official events", () => {
  const expectedByPrefecture = {
    ehime: 2,
    gifu: 2,
    ishikawa: 2,
    kochi: 2,
    miyazaki: 2,
    saga: 2,
    tokushima: 2,
    fukushima: 1,
    yamagata: 1,
  };
  const expectedIds = [
    "evt-summer-2026-ehime-005",
    "evt-summer-2026-ehime-006",
    "evt-summer-2026-gifu-005",
    "evt-summer-2026-gifu-006",
    "evt-summer-2026-ishikawa-005",
    "evt-summer-2026-ishikawa-006",
    "evt-summer-2026-kochi-005",
    "evt-summer-2026-kochi-006",
    "evt-summer-2026-miyazaki-005",
    "evt-summer-2026-miyazaki-006",
    "evt-summer-2026-saga-005",
    "evt-summer-2026-saga-006",
    "evt-summer-2026-tokushima-005",
    "evt-summer-2026-tokushima-006",
    "evt-summer-2026-fukushima-006",
    "evt-summer-2026-yamagata-006",
  ];
  const additions = expectedIds.map((eventId) =>
    summerSource.events.find((event) => event.id === eventId),
  );

  assert.equal(summerSource.metadata.new_event_count, CURRENT_SUMMER_MILESTONE.newEventCount);
  assert.equal(summerSource.metadata.existing_event_count, 16);
  assert.equal(summerSource.metadata.candidate_count, CURRENT_SUMMER_MILESTONE.candidateCount);
  assert.equal(summerLocationsSource.metadata.overlay_count, CURRENT_SUMMER_MILESTONE.overlayCount);
  assert.equal(summerLocationsSource.metadata.mappable_count, CURRENT_SUMMER_MILESTONE.mappableCount);
  assert.equal(summerLocationsSource.metadata.hold_count, CURRENT_SUMMER_MILESTONE.holdCount);
  assert.equal(additions.every(Boolean), true);
  assert.deepEqual(
    Object.fromEntries(
      Object.keys(expectedByPrefecture).map((prefecture) => [
        prefecture,
        additions.filter((event) => event.prefecture === prefecture).length,
      ]),
    ),
    expectedByPrefecture,
  );
  assert.deepEqual(
    {
      fireworks: additions.filter((event) => event.event_type === "fireworks")
        .length,
      summer_festival: additions.filter(
        (event) => event.event_type === "summer_festival",
      ).length,
      summer_tradition: additions.filter(
        (event) => event.event_type === "summer_tradition",
      ).length,
      night_outing: additions.filter(
        (event) => event.event_type === "night_outing",
      ).length,
    },
    {
      fireworks: 4,
      summer_festival: 7,
      summer_tradition: 5,
      night_outing: 0,
    },
  );
  assert.equal(
    additions.every(
      (event) =>
        event.facility_id === null &&
        event.venue_name.trim().length > 0 &&
        event.source_checked_at === "2026-07-18" &&
        event.source_urls.length > 0 &&
        event.source_urls.every((sourceUrl) => sourceUrl.startsWith("https://")) &&
        event.feature_hubs.length === 1 &&
        event.feature_hubs[0] === "summer-2026" &&
        event.start_date >= "2026-07-25" &&
        event.end_date <= "2026-08-22" &&
        summerLocationsSource.locations_by_event_id[event.id]
          ?.coordinate_precision === "hold" &&
        summerLocationsSource.locations_by_event_id[event.id]?.latitude ===
          null &&
        summerLocationsSource.locations_by_event_id[event.id]?.longitude ===
          null,
    ),
    true,
  );
});

test("national density expansion reaches the 425-event checkpoint with 50 hold rows", () => {
  const fourEventPrefectures = [
    "gunma",
    "hiroshima",
    "iwate",
    "kagawa",
    "nara",
    "niigata",
    "okayama",
    "shiga",
    "shimane",
    "tottori",
    "wakayama",
    "yamaguchi",
  ];
  const expectedIds = [
    ...fourEventPrefectures.flatMap((prefecture) =>
      Array.from(
        { length: 4 },
        (_, index) =>
          `evt-summer-2026-${prefecture}-${String(index + 6).padStart(3, "0")}`,
      ),
    ),
    "evt-summer-2026-ehime-007",
    "evt-summer-2026-fukui-007",
  ];
  const additions = expectedIds.map((eventId) =>
    summerSource.events.find((event) => event.id === eventId),
  );

  assert.equal(expectedIds.length, 50);
  assert.equal(new Set(expectedIds).size, 50);
  assert.equal(additions.every(Boolean), true);
  assert.equal(
    additions.every(
      (event) =>
        event.facility_id === null &&
        event.title.trim().length > 0 &&
        event.venue_name.trim().length > 0 &&
        event.source_checked_at === "2026-07-18" &&
        event.official_url.startsWith("https://") &&
        event.source_urls.length === 1 &&
        event.source_urls[0] === event.official_url &&
        event.feature_hubs.length === 1 &&
        event.feature_hubs[0] === "summer-2026" &&
        summerLocationsSource.locations_by_event_id[event.id]
          ?.coordinate_precision === "hold" &&
        summerLocationsSource.locations_by_event_id[event.id]?.latitude ===
          null &&
        summerLocationsSource.locations_by_event_id[event.id]?.longitude ===
          null,
    ),
    true,
  );
  assert.deepEqual(
    Object.fromEntries(
      fourEventPrefectures.map((prefecture) => [
        prefecture,
        summerSource.events.filter((event) => event.prefecture === prefecture)
          .length,
      ]),
    ),
    Object.fromEntries(fourEventPrefectures.map((prefecture) => [prefecture, 9])),
  );
  assert.equal(
    summerSource.events.filter(
      (event) =>
        event.prefecture === "ehime" &&
        /^evt-summer-2026-ehime-00[1-7]$/u.test(event.id),
    ).length,
    7,
  );
  assert.equal(
    summerSource.events.filter(
      (event) =>
        event.prefecture === "fukui" &&
        /^evt-summer-2026-fukui-00[1-7]$/u.test(event.id),
    ).length,
    7,
  );
  assert.deepEqual(
    Object.fromEntries(
      [
        "evt-summer-2026-niigata-009",
        "evt-summer-2026-shimane-007",
        "evt-summer-2026-tottori-009",
        "evt-summer-2026-wakayama-007",
      ].map((eventId) => [
        eventId,
        summerSource.events.find((event) => event.id === eventId)
          ?.occurrence_dates?.length,
      ]),
    ),
    {
      "evt-summer-2026-niigata-009": 4,
      "evt-summer-2026-shimane-007": 2,
      "evt-summer-2026-tottori-009": 20,
      "evt-summer-2026-wakayama-007": 7,
    },
  );
});

test("national density expansion reaches the 465-event checkpoint with 40 additional hold rows", () => {
  const threeEventPrefectures = [
    "fukushima",
    "gifu",
    "ibaraki",
    "ishikawa",
    "kagoshima",
    "kochi",
    "kumamoto",
    "miyagi",
    "miyazaki",
    "nagasaki",
    "oita",
    "saga",
  ];
  const expectedIds = [
    ...["ehime", "fukui"].flatMap((prefecture) =>
      [8, 9].map(
        (number) =>
          `evt-summer-2026-${prefecture}-${String(number).padStart(3, "0")}`,
      ),
    ),
    ...threeEventPrefectures.flatMap((prefecture) =>
      [7, 8, 9].map(
        (number) =>
          `evt-summer-2026-${prefecture}-${String(number).padStart(3, "0")}`,
      ),
    ),
  ];
  const additions = expectedIds.map((eventId) =>
    summerSource.events.find((event) => event.id === eventId),
  );

  assert.equal(expectedIds.length, 40);
  assert.equal(new Set(expectedIds).size, 40);
  assert.equal(additions.every(Boolean), true);
  assert.equal(
    additions.every(
      (event) =>
        event.facility_id === null &&
        event.title.trim().length > 0 &&
        event.venue_name.trim().length > 0 &&
        event.source_checked_at === "2026-07-18" &&
        event.official_url.startsWith("https://") &&
        event.source_urls.length >= 1 &&
        event.source_urls.every((sourceUrl) => sourceUrl.startsWith("https://")) &&
        event.feature_hubs.length === 1 &&
        event.feature_hubs[0] === "summer-2026" &&
        summerLocationsSource.locations_by_event_id[event.id]
          ?.coordinate_precision === "hold" &&
        summerLocationsSource.locations_by_event_id[event.id]?.latitude ===
          null &&
        summerLocationsSource.locations_by_event_id[event.id]?.longitude ===
          null,
    ),
    true,
  );
  assert.deepEqual(
    Object.fromEntries(
      [...threeEventPrefectures, "ehime", "fukui"].map((prefecture) => [
        prefecture,
        summerSource.events.filter((event) => event.prefecture === prefecture)
          .length,
      ]),
    ),
    Object.fromEntries(
      [...threeEventPrefectures, "ehime", "fukui"].map((prefecture) => [
        prefecture,
        9,
      ]),
    ),
  );
  assert.deepEqual(
    {
      fireworks: additions.filter((event) => event.event_type === "fireworks")
        .length,
      summer_festival: additions.filter(
        (event) => event.event_type === "summer_festival",
      ).length,
      summer_tradition: additions.filter(
        (event) => event.event_type === "summer_tradition",
      ).length,
    },
    { fireworks: 8, summer_festival: 26, summer_tradition: 6 },
  );
  assert.deepEqual(
    {
      candidateCount: summerSource.metadata.candidate_count,
      overlayCount: summerLocationsSource.metadata.overlay_count,
      mappableCount: summerLocationsSource.metadata.mappable_count,
      holdCount: summerLocationsSource.metadata.hold_count,
    },
    {
      candidateCount: CURRENT_SUMMER_MILESTONE.candidateCount,
      overlayCount: CURRENT_SUMMER_MILESTONE.overlayCount,
      mappableCount: CURRENT_SUMMER_MILESTONE.mappableCount,
      holdCount: CURRENT_SUMMER_MILESTONE.holdCount,
    },
  );
});

test("national density expansion reaches the 500-event milestone with 35 additional hold rows", () => {
  const expectedIds = [
    ...["tochigi", "tokushima", "toyama", "yamagata"].flatMap(
      (prefecture) =>
        [7, 8, 9].map(
          (number) =>
            `evt-summer-2026-${prefecture}-${String(number).padStart(3, "0")}`,
        ),
    ),
    ...["akita", "aomori", "kyoto", "mie"].flatMap((prefecture) =>
      [9, 10].map(
        (number) =>
          `evt-summer-2026-${prefecture}-${String(number).padStart(3, "0")}`,
      ),
    ),
    ...["okinawa", "shizuoka"].flatMap((prefecture) =>
      [10, 11].map(
        (number) =>
          `evt-summer-2026-${prefecture}-${String(number).padStart(3, "0")}`,
      ),
    ),
    "evt-summer-2026-aichi-011",
    "evt-summer-2026-nagano-011",
    "evt-summer-2026-osaka-011",
    "evt-summer-2026-yamanashi-011",
    "evt-summer-2026-hokkaido-012",
    "evt-summer-2026-hyogo-012",
    "evt-summer-2026-fukuoka-013",
    "evt-summer-2026-chiba-026",
    "evt-summer-2026-kanagawa-019",
    "evt-summer-2026-saitama-022",
    "evt-summer-2026-tokyo-025",
  ];
  const additions = expectedIds.map((eventId) =>
    summerSource.events.find((event) => event.id === eventId),
  );

  assert.equal(expectedIds.length, 35);
  assert.equal(new Set(expectedIds).size, 35);
  assert.equal(additions.every(Boolean), true);
  assert.equal(
    additions.every(
      (event) =>
        event.facility_id === null &&
        event.title.trim().length > 0 &&
        event.venue_name.trim().length > 0 &&
        event.source_checked_at === "2026-07-18" &&
        event.official_url.startsWith("https://") &&
        event.source_urls.length >= 1 &&
        event.source_urls.every((sourceUrl) => sourceUrl.startsWith("https://")) &&
        event.feature_hubs.length === 1 &&
        event.feature_hubs[0] === "summer-2026" &&
        summerLocationsSource.locations_by_event_id[event.id]
          ?.coordinate_precision === "hold" &&
        summerLocationsSource.locations_by_event_id[event.id]?.latitude ===
          null &&
        summerLocationsSource.locations_by_event_id[event.id]?.longitude ===
          null,
    ),
    true,
  );
  assert.deepEqual(
    Object.fromEntries(
      [
        "tochigi",
        "tokushima",
        "toyama",
        "yamagata",
        "akita",
        "aomori",
        "kyoto",
        "mie",
        "okinawa",
        "shizuoka",
        "aichi",
        "nagano",
        "osaka",
        "yamanashi",
        "hokkaido",
        "hyogo",
        "fukuoka",
        "chiba",
        "kanagawa",
        "saitama",
        "tokyo",
      ].map((prefecture) => [
        prefecture,
        summerSource.events.filter((event) => event.prefecture === prefecture)
          .length,
      ]),
    ),
    {
      tochigi: 9,
      tokushima: 9,
      toyama: 9,
      yamagata: 9,
      akita: 10,
      aomori: 10,
      kyoto: 10,
      mie: 10,
      okinawa: 11,
      shizuoka: 11,
      aichi: 11,
      nagano: 11,
      osaka: 11,
      yamanashi: 11,
      hokkaido: 12,
      hyogo: 12,
      fukuoka: 13,
      chiba: 17,
      kanagawa: 15,
      saitama: 20,
      tokyo: 19,
    },
  );
  assert.deepEqual(
    {
      fireworks: additions.filter((event) => event.event_type === "fireworks")
        .length,
      summer_festival: additions.filter(
        (event) => event.event_type === "summer_festival",
      ).length,
      summer_tradition: additions.filter(
        (event) => event.event_type === "summer_tradition",
      ).length,
    },
    { fireworks: 16, summer_festival: 10, summer_tradition: 9 },
  );
  assert.deepEqual(
    {
      yokote: summerSource.events.find(
        (event) => event.id === "evt-summer-2026-akita-010",
      )?.occurrence_dates?.length,
      toyohama: summerSource.events.find(
        (event) => event.id === "evt-summer-2026-aichi-011",
      )?.occurrence_dates?.length,
      suwa: summerSource.events.find(
        (event) => event.id === "evt-summer-2026-nagano-011",
      )?.occurrence_dates?.length,
    },
    { yokote: 3, toyohama: 2, suwa: 30 },
  );
  assert.deepEqual(
    {
      candidateCount: summerSource.metadata.candidate_count,
      overlayCount: summerLocationsSource.metadata.overlay_count,
      mappableCount: summerLocationsSource.metadata.mappable_count,
      holdCount: summerLocationsSource.metadata.hold_count,
    },
    {
      candidateCount: 500,
      overlayCount: 427,
      mappableCount: 22,
      holdCount: 405,
    },
  );
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

function getFixedDateVisibleSummerViews(today) {
  const visibleEvents = getSummerCandidateEvents()
    .filter((event) => {
      const checkedAge = daysBetween(event.source_checked_at, today);
      return (
        ["scheduled", "ongoing"].includes(event.status) &&
        (!event.end_date || event.end_date >= today) &&
        checkedAge >= 0 &&
        checkedAge <= summerSource.metadata.freshness_days_hub &&
        getNextSummerDate(event, today) !== null
      );
    })
    .sort((a, b) => {
      const nextA = getNextSummerDate(a, today);
      const nextB = getNextSummerDate(b, today);
      return (
        nextA.localeCompare(nextB) ||
        b.display_priority - a.display_priority ||
        a.id.localeCompare(b.id)
      );
    });

  return visibleEvents.map((event) => ({
    event,
    isThisWeekend: false,
    isThisMonth: false,
  }));
}

function getSummerCandidateEvents() {
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
    status: "scheduled",
    display_priority: heroIds.has(event.id) ? 90 : 80,
  }));
  return [...existing, ...added];
}

function getNextSummerDate(event, today) {
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

function orderSummerViewsByType(views) {
  return SUMMER_EVENT_TYPE_ORDER.flatMap((eventType) =>
    views.filter((view) => view.event.event_type === eventType),
  );
}

function getTypesOnPage(views) {
  return SUMMER_EVENT_TYPE_ORDER.filter((eventType) =>
    views.some((view) => view.event.event_type === eventType),
  );
}

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

function mapPointFixture(eventId, latitude, longitude) {
  return {
    eventId,
    title: eventId,
    prefecture: "tokyo",
    prefectureLabel: "東京都",
    nextDate: "2026-07-25",
    latitude,
    longitude,
    mapLabel: eventId,
    coordinatePrecision: "exact_venue",
    detailAnchor: getSummerEventAnchorId(eventId),
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
