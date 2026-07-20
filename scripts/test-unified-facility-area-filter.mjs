import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  filterByPrefectureIds,
  resolvePrefectureId,
} from "../lib/facility-area-filter.ts";
import {
  buildTagFacilityFilterHref,
  getTagFacilities,
  getTagMetaBySlug,
} from "../lib/tags.ts";

const root = new URL("../", import.meta.url);
const data = JSON.parse(
  readFileSync(new URL("data/facilities_data.json", root), "utf8"),
);
const visibleFacilities = data.facilities.filter(
  (facility) => facility.data_quality_status !== "exclude_candidate",
);

test("single-prefecture resolution accepts canonical IDs and legacy names", () => {
  assert.equal(resolvePrefectureId("shizuoka", data.metadata.prefectures), "shizuoka");
  assert.equal(resolvePrefectureId("静岡県", data.metadata.prefectures), "shizuoka");
  assert.equal(resolvePrefectureId("unknown", data.metadata.prefectures), null);
});

test("single-prefecture filtering never leaks another prefecture", () => {
  for (const prefecture of data.metadata.prefectures) {
    const results = filterByPrefectureIds(visibleFacilities, [prefecture.id]);
    assert(results.length > 0, `${prefecture.name} must have visible facilities`);
    assert(
      results.every((facility) => facility.prefecture_id === prefecture.id),
      `${prefecture.name} leaked another prefecture`,
    );
  }
  assert.equal(filterByPrefectureIds(visibleFacilities, []).length, 3734);
});

test("rainy-day is derived only from rain_friendly=◎", () => {
  const meta = getTagMetaBySlug("rainy-day");
  assert(meta);
  const rainy = getTagFacilities(meta, visibleFacilities);
  assert(rainy.length > 0);
  assert(rainy.every((facility) => facility.rain_friendly === "◎"));
  assert(rainy.some((facility) => facility.prefecture_id === "shizuoka"));
  assert(rainy.some((facility) => facility.prefecture_id === "yamanashi"));

  const href = buildTagFacilityFilterHref(meta, "yamanashi");
  const url = new URL(href, "https://trip-guide.net");
  assert.equal(url.searchParams.get("prefecture"), "yamanashi");
  assert.equal(url.searchParams.get("rain"), "◎");
  assert.equal(url.searchParams.get("tags"), null);
});

test("legacy rain tags are absent from data, types, and link generation", () => {
  const legacyRainTag = ["雨の日", "OK"].join("");
  const alternateRainTag = ["雨でも", "遊べる"].join("");
  const sourceFiles = [
    "types/facility.ts",
    "lib/tags.ts",
    "app/tag/[slug]/page.tsx",
    "app/facilities/page.tsx",
  ].map((path) => readFileSync(new URL(path, root), "utf8"));

  const serializedData = JSON.stringify(data);
  assert(!serializedData.includes(`"${legacyRainTag}"`));
  assert(!serializedData.includes(`"${alternateRainTag}"`));
  assert(
    !sourceFiles.some((source) => source.includes(`tags=${legacyRainTag}`)),
  );
  assert(
    !sourceFiles.some((source) => source.includes(`tag: "${legacyRainTag}"`)),
  );
  assert(
    !sourceFiles.some((source) =>
      source.includes(`tag: "${alternateRainTag}"`),
    ),
  );
  assert.equal(getTagMetaBySlug("indoor-rainy"), undefined);
});

test("facility identity and published boundary stay unchanged", () => {
  assert.equal(data.facilities.length, 3740);
  assert.equal(visibleFacilities.length, 3734);
  assert.equal(new Set(data.facilities.map(({ id }) => id)).size, 3740);
  assert.equal(new Set(data.facilities.map(({ slug }) => slug)).size, 3740);
});
