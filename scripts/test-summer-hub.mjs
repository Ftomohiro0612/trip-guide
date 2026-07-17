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

  assert.equal(entries.length, 130);
  assert.equal(holds.length, 108);
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

test("generic event type filters match the frozen candidate counts", () => {
  const classifications = [
    ...summerSource.events,
    ...summerSource.existing_event_classifications,
  ];
  const views = classifications.map((event) =>
    filterFixture(event.id, event.event_type),
  );
  const expectedCounts = {
    fireworks: 93,
    summer_festival: 89,
    summer_tradition: 15,
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

test("all twenty-eight approved prefectures can be selected independently", () => {
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

test("93 fireworks and 89 festivals paginate to their expected final pages", () => {
  const views = [
    ...Array.from({ length: 93 }, (_, index) =>
      filterFixture(`fireworks-${index + 1}`, "fireworks"),
    ),
    ...Array.from({ length: 89 }, (_, index) =>
      filterFixture(`festival-${index + 1}`, "summer_festival"),
    ),
  ];

  for (const [eventType, finalPage, finalPageLength] of [
    ["fireworks", 5, 13],
    ["summer_festival", 5, 9],
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

test("Yamanashi regional wave keeps the accepted schema and source boundaries", () => {
  const expectedIds = Array.from(
    { length: 10 },
    (_, index) => `evt-summer-2026-yamanashi-${String(index + 1).padStart(3, "0")}`,
  );
  const yamanashi = summerSource.events.filter(
    (event) => event.prefecture === "yamanashi",
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
      (event) => event.prefecture === prefecture,
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
          event.source_checked_at === "2026-07-17" &&
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
    ibaraki: { total: 4, fireworks: 3, summer_festival: 1 },
    tochigi: { total: 4, fireworks: 3, summer_festival: 1 },
    gunma: { total: 5, fireworks: 1, summer_festival: 4 },
    niigata: { total: 5, fireworks: 3, summer_festival: 2 },
  };

  for (const [prefecture, expected] of Object.entries(expectedByPrefecture)) {
    const regional = summerSource.events.filter(
      (event) => event.prefecture === prefecture,
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
    kyoto: { total: 4, fireworks: 0, summer_festival: 3, summer_tradition: 1 },
    osaka: { total: 5, fireworks: 1, summer_festival: 4, summer_tradition: 0 },
    hyogo: { total: 5, fireworks: 2, summer_festival: 3, summer_tradition: 0 },
  };

  for (const [prefecture, expected] of Object.entries(expectedByPrefecture)) {
    const regional = summerSource.events.filter(
      (event) => event.prefecture === prefecture,
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
          event.source_checked_at === "2026-07-17" &&
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
    const regional = summerSource.events.filter(
      (event) => event.prefecture === prefecture,
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
          event.source_checked_at === "2026-07-17" &&
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
    kumamoto: { total: 4, fireworks: 2, summer_festival: 1, summer_tradition: 1 },
    nagasaki: { total: 4, fireworks: 2, summer_festival: 1, summer_tradition: 1 },
    oita: { total: 4, fireworks: 1, summer_festival: 2, summer_tradition: 1 },
    kagoshima: { total: 4, fireworks: 3, summer_festival: 1, summer_tradition: 0 },
  };

  for (const [prefecture, expected] of Object.entries(expectedByPrefecture)) {
    const regional = summerSource.events.filter(
      (event) => event.prefecture === prefecture,
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

  assert.equal(summerSource.metadata.new_event_count, 187);
  assert.equal(summerSource.metadata.candidate_count, 203);

  for (const [prefecture, expected] of Object.entries(expectedByPrefecture)) {
    const regional = summerSource.events.filter(
      (event) => event.prefecture === prefecture,
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
