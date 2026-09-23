import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import test from "node:test";

// Use the same alias resolution as the application (see test-facility-bbox.mjs).
const hooks = registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith("@/")) {
      const path = specifier.slice(2);
      return nextResolve(new URL(`../${path}${/\.(mjs|ts)$/.test(path) ? "" : ".ts"}`, import.meta.url).href, context);
    }
    return nextResolve(specifier, context);
  },
});
const {
  visibleFacilities, discoverableFacilities,
  isFacilityVisible, isFacilityDiscoverable, getFacilityBySlug, getAllSlugs,
  getFacilitiesByPrefecture, getFacilitiesByCategory, getRelatedFacilities,
} = await import("../lib/facilities.ts");
const { getFacilityListResults } = await import("../lib/facility-list-results.ts");
const { toMapFacilities } = await import("../lib/map-facilities.ts");
const { GET } = await import("../app/api/facilities/search/route.ts");
hooks.deregister();

const temporary = getFacilityBySlug("facility-740");
const permanent = getFacilityBySlug("facility-2053");
const hasId = (rows, id) => rows.some((row) => row.id === id);

test("closure keeps detail routes and historical photo candidates resolvable", () => {
  for (const facility of [temporary, permanent]) {
    assert.ok(isFacilityVisible(facility));
    assert.ok(getAllSlugs().includes(facility.slug));
    assert.ok(visibleFacilities.includes(facility));
  }
  assert.equal(isFacilityVisible(undefined), false);
  assert.equal(isFacilityVisible({ ...temporary, data_quality_status: "exclude_candidate" }), false);
});

test("temporary closure stays discoverable; permanent closure leaves list, map and groups", () => {
  assert.equal(isFacilityDiscoverable(temporary), true);
  assert.equal(isFacilityDiscoverable(permanent), false);
  assert.equal(isFacilityDiscoverable(undefined), false);
  assert.equal(isFacilityDiscoverable({ ...temporary, data_quality_status: "exclude_candidate" }), false);
  const map = toMapFacilities(discoverableFacilities);
  assert.equal(map.find((facility) => facility.id === 740)?.closure_status, "temporarily_closed");
  for (const [facility, expected] of [[temporary, true], [permanent, false]]) {
    for (const rows of [discoverableFacilities, map, getFacilityListResults({}).results,
      getFacilityListResults({ q: facility.name }).results,
      getFacilitiesByPrefecture(facility.prefecture_id),
      getFacilitiesByCategory(facility.category_id)]) {
      assert.equal(hasId(rows, facility.id), expected);
    }
  }
});

test("search API retains temporary closure and excludes permanent closure", async () => {
  for (const [facility, expected] of [[temporary, true], [permanent, false]]) {
    const response = await GET(new Request(`http://localhost/api/facilities/search?q=${encodeURIComponent(facility.name)}`));
    assert.equal(response.status, 200);
    const { results } = await response.json();
    assert.equal(results.some((row) => row.slug === facility.slug), expected);
  }
});

test("all related lists exclude permanent closure and still link to temporary closure", () => {
  const inboundToTemporary = [];
  for (const facility of visibleFacilities) {
    const related = getRelatedFacilities(facility);
    assert.equal(hasId(related, 2053), false, facility.slug);
    if (hasId(related, 740)) inboundToTemporary.push(facility.slug);
  }
  assert.ok(inboundToTemporary.length > 0);
  console.log(`facility-740 related inbound sources: ${inboundToTemporary.join(", ")}`);
});
