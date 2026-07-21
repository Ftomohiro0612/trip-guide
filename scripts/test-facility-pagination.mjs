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

test("nearby ordering is paginated only after distance filtering and sorting", () => {
  const tokyoStation = [35.681236, 139.767125];
  const nearby = facilities
    .filter(
      (facility) =>
        Number.isFinite(facility.latitude) &&
        Number.isFinite(facility.longitude),
    )
    .map((facility) => ({
      ...facility,
      distance: distanceKm(tokyoStation, facility),
    }))
    .filter((facility) => facility.distance <= 80)
    .sort((a, b) => a.distance - b.distance || a.id - b.id);

  assert.ok(nearby.length > 24);
  assertCompletePagination(nearby);
  const first = paginateFacilities(nearby, 1);
  assert.ok(
    first.items.every(
      (item, index) =>
        index === 0 || first.items[index - 1].distance <= item.distance,
    ),
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
