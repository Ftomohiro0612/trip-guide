import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import test from "node:test";
import { formatBBoxParam, isWithinBBox, parseBBoxParam } from "../lib/geo-bounds.ts";
import { paginateFacilities } from "../lib/facility-pagination.ts";

// Match the application's @/ imports when running TypeScript with node --test.
const hooks = registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith("@/")) {
      return nextResolve(new URL(`../${specifier.slice(2)}.ts`, import.meta.url).href, context);
    }
    return nextResolve(specifier, context);
  },
});
const { applyFilters, parseFilterParams, buildQueryString, hasActiveFilters } =
  await import("../lib/filter.ts");
hooks.deregister();

test("bbox parser rejects malformed, non-finite and reversed bounds", () => {
  for (const raw of [undefined, null, {}, 123, [], "", "abc", "1,2,3", "1,2,3,4,5",
    "1,,3,4", "1,2,NaN,4", "1,2,Infinity,4", "3,2,1,4", "1,4,3,2"]) {
    assert.equal(parseBBoxParam(raw), null, String(raw));
  }
  assert.deepEqual(parseBBoxParam(["35,139,36,140", "abc"]), {
    south: 35, west: 139, north: 36, east: 140,
  });
  assert.deepEqual(parseBBoxParam("-100,-200,100,200"), {
    south: -90, west: -180, north: 90, east: 180,
  });
});

test("bbox formats five decimals, round-trips and includes boundary points", () => {
  const bbox = { south: 35.123456, west: 139, north: 36, east: 140 };
  assert.equal(formatBBoxParam(bbox), "35.12346,139.00000,36.00000,140.00000");
  assert.ok(isWithinBBox(36, 140, bbox));
  assert.ok(isWithinBBox(bbox.south, 139, bbox));
  assert.equal(isWithinBBox(36.0001, 140, bbox), false);
  const filters = parseFilterParams({ bbox: formatBBoxParam(bbox), fee: "free", sort: "name" });
  assert.ok(hasActiveFilters(filters));
  assert.ok(hasActiveFilters(parseFilterParams({ bbox: "35,139,36,140" })));
  assert.equal(hasActiveFilters(parseFilterParams({ bbox: "abc" })), false);
  assert.deepEqual(parseFilterParams(Object.fromEntries(new URLSearchParams(buildQueryString(filters)))), filters);
});

test("bbox intersects existing filters before sorting and 24-item pagination", () => {
  const sample = { name: "遊び場", prefecture_id: "tokyo", category_id: "park",
    indoor_outdoor: "屋外", rain_friendly: "◎", is_free: true, tags: ["小学生向け"],
    latitude: 35.5, longitude: 139.5 };
  const matching = Array.from({ length: 30 }, (_, id) => ({ ...sample, id, name: `遊び場${String(id).padStart(2, "0")}` }));
  const excluded = [
    { latitude: 34 }, { longitude: 141 }, { latitude: null }, { longitude: undefined },
    { latitude: NaN }, { longitude: Infinity }, { is_free: false },
    { rain_friendly: "×" }, { tags: [] }, { category_id: "zoo" }, { prefecture_id: "chiba" },
  ].map((patch, index) => ({ ...sample, id: 100 + index, ...patch }));
  const facilities = [...excluded, ...matching].reverse();
  const raw = { bbox: "35,139,36,140", fee: "free", rain: "◎", tags: "小学生向け", categories: "park", prefectures: "tokyo", sort: "name" };
  const results = applyFilters(facilities, parseFilterParams(raw));
  assert.deepEqual(results.map((f) => f.id), matching.map((f) => f.id));
  assert.equal(paginateFacilities(results, 1).items.length, 24);
  assert.deepEqual(paginateFacilities(results, 2).items.map((f) => f.id), [24, 25, 26, 27, 28, 29]);
  assert.deepEqual(applyFilters(facilities, parseFilterParams({ ...raw, bbox: "abc" })),
    applyFilters(facilities, parseFilterParams({ ...raw, bbox: undefined })));
  assert.equal(applyFilters(facilities, parseFilterParams({ bbox: "0,0,1,1" })).length, 0);
});
