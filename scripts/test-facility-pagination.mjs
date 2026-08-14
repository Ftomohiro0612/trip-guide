import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  FACILITIES_PER_PAGE,
  buildFacilityPageHref,
  groupFacilityPageByPrefecture,
  orderFacilitiesByPrefecture,
  paginateFacilities,
  parseFacilityPage,
  resetFacilityPage,
} from "../lib/facility-pagination.ts";

const data = JSON.parse(
  await readFile(new URL("../data/facilities_data.json", import.meta.url)),
);
const craftEvidence = JSON.parse(
  await readFile(
    new URL("../data/craft_category_evidence.json", import.meta.url),
  ),
);
const categoryPageSource = await readFile(
  new URL("../app/category/[id]/page.tsx", import.meta.url),
  "utf8",
);
const categoryAccessorSource = await readFile(
  new URL("../lib/category-page-facilities.ts", import.meta.url),
  "utf8",
);
const nearbyListSource = await readFile(
  new URL("../components/NearbyFilterableFacilityList.tsx", import.meta.url),
  "utf8",
);
const nearbyOrderSource = await readFile(
  new URL("../lib/facility-nearby.ts", import.meta.url),
  "utf8",
);
const sortSelectSource = await readFile(
  new URL("../components/SortSelect.tsx", import.meta.url),
  "utf8",
);
const filterSource = await readFile(
  new URL("../lib/filter.ts", import.meta.url),
  "utf8",
);
const pageDataRouteSource = await readFile(
  new URL("../app/api/facilities/page-data/route.ts", import.meta.url),
  "utf8",
);
const responsiveMapSource = await readFile(
  new URL("../components/ResponsiveResultsMap.tsx", import.meta.url),
  "utf8",
);
const tagPageSource = await readFile(
  new URL("../app/tag/[slug]/page.tsx", import.meta.url),
  "utf8",
);
const facilities = data.facilities.filter(
  (facility) => facility.data_quality_status !== "exclude_candidate",
);
const prefectures = data.metadata.prefectures;

function assertCompletePagination(items) {
  const collected = [];
  const totalPages = Math.max(
    1,
    Math.ceil(items.length / FACILITIES_PER_PAGE),
  );

  for (let pageNumber = 1; pageNumber <= totalPages; pageNumber++) {
    const page = paginateFacilities(items, pageNumber);
    assert.ok(page.items.length <= FACILITIES_PER_PAGE);
    if (pageNumber < totalPages) {
      assert.equal(page.items.length, FACILITIES_PER_PAGE);
    }
    collected.push(...page.items.map((item) => item.id));
  }

  assert.equal(collected.length, items.length);
  assert.equal(new Set(collected).size, items.length);
  assert.deepEqual(collected, items.map((item) => item.id));
}

function assertGroupedPageContract(items, pageNumber) {
  const page = paginateFacilities(items, pageNumber);
  const sections = groupFacilityPageByPrefecture(
    page.items,
    prefectures,
    items[page.startIndex - 1]?.prefecture_id,
  );
  const groupedIds = sections.flatMap((section) =>
    section.items.map((item) => item.id),
  );
  const expectedContinuation =
    page.startIndex > 0 &&
    items[page.startIndex - 1]?.prefecture_id ===
      page.items[0]?.prefecture_id;

  assert.deepEqual(groupedIds, page.items.map((item) => item.id));
  assert.equal(new Set(groupedIds).size, page.items.length);
  assert.equal(
    sections[0]?.currentPageContinuesPrefecture ?? false,
    expectedContinuation,
  );
  assert.ok(
    sections.slice(1).every(
      (section) => !section.currentPageContinuesPrefecture,
    ),
  );

  return { page, sections, expectedContinuation };
}

function distanceKm(origin, facility) {
  const toRadians = (degrees) => (degrees * Math.PI) / 180;
  const [lat1, lon1] = origin;
  const lat2 = facility.latitude;
  const lon2 = facility.longitude;
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

test("facility pagination uses 24 items on first, middle, and final pages", () => {
  const first = paginateFacilities(facilities, 1);
  const middle = paginateFacilities(facilities, 2);
  const finalPageNumber = Math.ceil(
    facilities.length / FACILITIES_PER_PAGE,
  );
  const final = paginateFacilities(facilities, finalPageNumber);

  assert.equal(first.items.length, 24);
  assert.equal(first.rangeStart, 1);
  assert.equal(first.rangeEnd, 24);
  assert.equal(middle.items.length, 24);
  assert.equal(middle.rangeStart, 25);
  assert.ok(final.items.length > 0 && final.items.length <= 24);
  assert.equal(final.rangeEnd, facilities.length);
  assertCompletePagination(facilities);
});

test("rainy-day and free tag results have no duplicates or omissions", () => {
  const rainy = facilities.filter(
    (facility) => facility.rain_friendly === "◎",
  );
  const free = facilities.filter((facility) =>
    facility.tags.includes("無料"),
  );

  assert.ok(rainy.length > 24);
  assert.ok(free.length > 24);
  assertCompletePagination(orderFacilitiesByPrefecture(rainy, prefectures));
  assertCompletePagination(orderFacilitiesByPrefecture(free, prefectures));
});

test("representative category is paginated globally before prefecture grouping", () => {
  const categoryCounts = new Map();
  for (const facility of facilities) {
    categoryCounts.set(
      facility.category_id,
      (categoryCounts.get(facility.category_id) ?? 0) + 1,
    );
  }
  const [categoryId] = [...categoryCounts.entries()].sort(
    (a, b) => b[1] - a[1],
  )[0];
  const categoryFacilities = orderFacilitiesByPrefecture(
    facilities.filter((facility) => facility.category_id === categoryId),
    prefectures,
  );
  const page = paginateFacilities(categoryFacilities, 2);
  const sections = groupFacilityPageByPrefecture(
    page.items,
    prefectures,
    categoryFacilities[page.startIndex - 1]?.prefecture_id,
  );

  assert.equal(
    sections.reduce((sum, section) => sum + section.items.length, 0),
    page.items.length,
  );
  assert.ok(sections.every((section) => section.items.length > 0));
  assert.deepEqual(
    new Set(sections.flatMap((section) => section.items.map((item) => item.id))),
    new Set(page.items.map((item) => item.id)),
  );
  if (
    categoryFacilities[page.startIndex - 1]?.prefecture_id ===
    page.items[0]?.prefecture_id
  ) {
    assert.equal(sections[0].currentPageContinuesPrefecture, true);
  }
  assertCompletePagination(categoryFacilities);
});

test("category continuation labels preserve park, craft type, and prefecture contracts", () => {
  const park = orderFacilitiesByPrefecture(
    facilities.filter((facility) => facility.category_id === "park"),
    prefectures,
  );
  const parkPage2 = assertGroupedPageContract(park, 2);
  assert.equal(parkPage2.expectedContinuation, true);

  const tokyoPark = park.filter(
    (facility) => facility.prefecture_id === "tokyo",
  );
  assert.ok(tokyoPark.length > FACILITIES_PER_PAGE);
  const tokyoParkPage2 = assertGroupedPageContract(tokyoPark, 2);
  assert.equal(tokyoParkPage2.expectedContinuation, true);
  assert.equal(tokyoParkPage2.sections.length, 1);

  const craftFacilitiesForType = (craftType) => {
    const ids = new Set(
      craftEvidence.records
        .filter(
          (record) =>
            record.status === "verified" &&
            ["ongoing", "recurring"].includes(record.offering) &&
            record.craft_types.includes(craftType),
        )
        .map((record) => record.facility_id),
    );
    return orderFacilitiesByPrefecture(
      facilities.filter((facility) => ids.has(facility.id)),
      prefectures,
    );
  };

  const pottery = craftFacilitiesForType("陶芸");
  const potteryPage2 = assertGroupedPageContract(pottery, 2);
  assert.equal(potteryPage2.expectedContinuation, true);

  const glass = craftFacilitiesForType("ガラス");
  const glassPage2 = assertGroupedPageContract(glass, 2);
  assert.equal(glassPage2.expectedContinuation, false);

  for (const collection of [park, tokyoPark, pottery, glass]) {
    assertCompletePagination(collection);
  }
});

test("category page reuses one grouping contract and keeps diversified craft nationwide", () => {
  assert.match(
    categoryPageSource,
    /showDiversifiedNationwideGrid[\s\S]*id: "nationwide"/,
  );
  assert.match(
    categoryPageSource,
    /id: "nationwide"[\s\S]*currentPageContinuesPrefecture: false/,
  );
  assert.match(
    categoryPageSource,
    /groupFacilityPageByPrefecture\([\s\S]*result\.orderedFacilities\[result\.page\.startIndex - 1\]/,
  );
  assert.match(categoryPageSource, /\{section\.name\}の続き/);
  assert.equal(
    (categoryPageSource.match(/groupFacilityPageByPrefecture\(/g) ?? [])
      .length,
    1,
  );
  assert.match(
    categoryAccessorSource,
    /mapFacilities: facilityPage\.items,[\s\S]*jsonLdFacilities: facilityPage\.items/,
  );
});

test("facility and tag maps render the current page slice before cards and pagination", () => {
  const nearbyMapIndex = nearbyListSource.indexOf(
    "<ResponsiveResultsMap facilities={displayedFacilities}",
  );
  const nearbyCardsIndex = nearbyListSource.indexOf("data-facility-card-grid");
  const nearbyPaginationIndex = nearbyListSource.indexOf(
    "<FacilityPaginationControls page={effectivePage}",
  );
  assert.ok(nearbyMapIndex > -1);
  assert.ok(nearbyMapIndex < nearbyCardsIndex);
  assert.ok(nearbyMapIndex < nearbyPaginationIndex);
  assert.equal(
    nearbyListSource.match(
      /<ResponsiveResultsMap facilities=\{displayedFacilities\}/gu,
    )?.length,
    1,
  );

  const tagMapIndex = tagPageSource.indexOf(
    "<ResponsiveResultsMap facilities={facilityPage.items}",
  );
  const tagCardsIndex = tagPageSource.indexOf(
    "{byPref.map((p) =>",
  );
  const tagPaginationIndex = tagPageSource.indexOf(
    "<FacilityPaginationControls page={facilityPage}",
  );
  assert.ok(tagMapIndex > -1);
  assert.ok(tagMapIndex < tagCardsIndex);
  assert.ok(tagMapIndex < tagPaginationIndex);
  assert.equal(
    tagPageSource.match(
      /<ResponsiveResultsMap facilities=\{facilityPage\.items\}/gu,
    )?.length,
    1,
  );

  assert.match(
    responsiveMapSource,
    /heading = "このページの施設を地図で見る"/u,
  );
  assert.match(responsiveMapSource, /useState\(false\)/u);
  assert.match(responsiveMapSource, /\(isDesktop \|\| mobileOpen\)/u);
});

test("nearby map reuses the client-only page slice without sending coordinates", () => {
  assert.match(
    nearbyListSource,
    /fetch\(nearbyDataHref,[\s\S]*signal: controller\.signal/u,
  );
  assert.doesNotMatch(
    nearbyListSource,
    /fetch\([^)]*(?:currentLocation|latitude|longitude|\blat\b|\blng\b)/u,
  );
  assert.match(
    nearbyListSource,
    /const displayedFacilities = showingNearby[\s\S]*nearbyPage\.items\.map\(\(item\) => item\.facility\)[\s\S]*: facilities/u,
  );
  assert.match(
    nearbyListSource,
    /<ResponsiveResultsMap facilities=\{displayedFacilities\}/u,
  );
});

test("prefecture and recommended_tag combinations paginate after filtering", () => {
  const recommended = facilities.filter((facility) =>
    (facility.recommended_for_tags ?? []).includes("water_play"),
  );
  const counts = new Map();
  for (const facility of recommended) {
    counts.set(
      facility.prefecture_id,
      (counts.get(facility.prefecture_id) ?? 0) + 1,
    );
  }
  const [prefectureId] = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
  const combined = recommended.filter(
    (facility) => facility.prefecture_id === prefectureId,
  );

  assert.ok(combined.length > 0);
  assertCompletePagination(combined);
});

test("nearby ordering sorts the complete matching collection before pagination", () => {
  const tokyoStation = [35.681236, 139.767125];
  const distanceOrdered = facilities
    .filter(
      (facility) =>
        Number.isFinite(facility.latitude) &&
        Number.isFinite(facility.longitude),
    )
    .map((facility) => ({
      ...facility,
      distance: distanceKm(tokyoStation, facility),
    }))
    .sort((a, b) => a.distance - b.distance || a.id - b.id);

  assert.equal(distanceOrdered.length, facilities.length);
  assertCompletePagination(distanceOrdered);
  const first = paginateFacilities(distanceOrdered, 1);
  const second = paginateFacilities(distanceOrdered, 2);
  assert.ok(
    first.items.every(
      (item, index) =>
        index === 0 || first.items[index - 1].distance <= item.distance,
    ),
  );
  assert.ok(first.items.at(-1).distance <= second.items[0].distance);
  assert.doesNotMatch(nearbyOrderSource, /nearbyDistanceCutoffKm|distanceKm\s*<=/u);
  assert.match(
    nearbyListSource,
    /getNearbyFacilities\(nearbyCandidates, currentLocation\)[\s\S]*paginateFacilities\(nearbyFacilities,/u,
  );
  assert.match(pageDataRouteSource, /searchParams\.delete\("page"\)/u);
  assert.match(pageDataRouteSource, /\{ facilities: results \}/u);
});

test("distance ordering preserves prefecture, category, and rainy-day matches", () => {
  const tokyoStation = [35.681236, 139.767125];
  const matchingCollections = [
    facilities.filter((facility) => facility.prefecture_id === "chiba"),
    facilities.filter((facility) => facility.prefecture_id === "saitama"),
    facilities.filter((facility) => facility.category_id === "zoo"),
    facilities.filter((facility) => facility.rain_friendly === "◎"),
    facilities.filter(
      (facility) =>
        facility.prefecture_id === "chiba" && facility.category_id === "zoo",
    ),
    facilities.filter(
      (facility) =>
        facility.prefecture_id === "saitama" && facility.rain_friendly === "◎",
    ),
  ];

  for (const matching of matchingCollections) {
    assert.ok(matching.length > 0);
    const ordered = matching
      .map((facility) => ({
        ...facility,
        distance: distanceKm(tokyoStation, facility),
      }))
      .sort((a, b) => a.distance - b.distance || a.id - b.id);
    assert.deepEqual(
      new Set(ordered.map((facility) => facility.id)),
      new Set(matching.map((facility) => facility.id)),
    );
    assertCompletePagination(ordered);
  }
});

test("nearby sort is explicit and never falls back while labeled as nearby", () => {
  assert.match(sortSelectSource, /value: "nearby", label: "近い順"/u);
  assert.match(filterSource, /sortValue === "nearby"/u);
  assert.match(nearbyListSource, /searchParams\.get\("sort"\) === "nearby"/u);
  assert.match(nearbyListSource, /aria-pressed=\{showingNearby\}/u);
  assert.match(nearbyListSource, /現在地から近い順/u);
  assert.match(nearbyListSource, /近い順には現在地が必要/u);
  assert.match(
    nearbyListSource,
    /params\.delete\("sort"\)[\s\S]*router\.replace/u,
  );
});

test("page parsing, query preservation, and condition reset are stable", () => {
  assert.equal(parseFacilityPage(undefined), 1);
  assert.equal(parseFacilityPage("0"), 1);
  assert.equal(parseFacilityPage("-4"), 1);
  assert.equal(parseFacilityPage("2.5"), 1);
  assert.equal(parseFacilityPage("3"), 3);

  const reset = resetFacilityPage(
    new URLSearchParams(
      "prefecture=tokyo&sort=name&recommended_tag=water_play&page=9",
    ),
  );
  assert.equal(reset.get("page"), "1");
  assert.equal(reset.get("prefecture"), "tokyo");
  assert.equal(reset.get("sort"), "name");
  assert.equal(reset.get("recommended_tag"), "water_play");

  const href = buildFacilityPageHref("/facilities", reset, 2);
  const url = new URL(href, "https://example.test");
  assert.equal(url.searchParams.get("page"), "2");
  assert.equal(url.searchParams.get("prefecture"), "tokyo");
  assert.equal(url.searchParams.get("sort"), "name");
  assert.equal(url.searchParams.get("recommended_tag"), "water_play");
});
