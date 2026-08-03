import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  filterByPrefectureIds,
  getPrefectureSelectorState,
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

test("selector state distinguishes nationwide, single, and detailed areas", () => {
  assert.deepEqual(getPrefectureSelectorState(null, []), {
    isNationwide: true,
    detailedCount: 0,
    hasDetailedSelection: false,
  });
  assert.deepEqual(getPrefectureSelectorState("shizuoka", ["yamanashi"]), {
    isNationwide: false,
    detailedCount: 0,
    hasDetailedSelection: false,
  });
  assert.deepEqual(
    getPrefectureSelectorState(null, ["shizuoka", "yamanashi"]),
    {
      isNationwide: false,
      detailedCount: 2,
      hasDetailedSelection: true,
    },
  );
  assert.equal(
    getPrefectureSelectorState(null, ["shizuoka", "shizuoka"])
      .detailedCount,
    1,
  );
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
  assert.equal(
    filterByPrefectureIds(visibleFacilities, []).length,
    visibleFacilities.length,
  );
});

test("representative category and recommended-tag views stay in one prefecture", () => {
  const categoryIds = ["theme-park", "park", "indoor-play"];
  const recommendedTags = ["playground", "water_play"];

  for (const prefectureId of ["chiba", "tokyo"]) {
    for (const categoryId of categoryIds) {
      const categoryFacilities = visibleFacilities.filter(
        (facility) => facility.category_id === categoryId,
      );
      const results = filterByPrefectureIds(categoryFacilities, [prefectureId]);
      assert(results.length > 0, `${prefectureId}/${categoryId} needs fixtures`);
      assert(
        results.every((facility) => facility.prefecture_id === prefectureId),
        `${prefectureId}/${categoryId} leaked another prefecture`,
      );
    }

    for (const recommendedTag of recommendedTags) {
      const tagFacilities = visibleFacilities.filter((facility) =>
        (facility.recommended_for_tags ?? []).includes(recommendedTag),
      );
      const results = filterByPrefectureIds(tagFacilities, [prefectureId]);
      assert(
        results.length > 0,
        `${prefectureId}/${recommendedTag} needs fixtures`,
      );
      assert(
        results.every((facility) => facility.prefecture_id === prefectureId),
        `${prefectureId}/${recommendedTag} leaked another prefecture`,
      );
    }
  }
});

test("category and theme routes share the canonical area selector", () => {
  const categorySource = readFileSync(
    new URL("app/category/[id]/page.tsx", root),
    "utf8",
  );
  const facilitiesSource = readFileSync(
    new URL("app/facilities/page.tsx", root),
    "utf8",
  );
  const tagSource = readFileSync(
    new URL("app/tag/[slug]/page.tsx", root),
    "utf8",
  );

  for (const source of [categorySource, facilitiesSource, tagSource]) {
    assert(source.includes('import PrefectureSelector from "@/components/PrefectureSelector"'));
    assert(source.includes("selectedId={selectedPrefectureId}"));
  }

  assert(
    categorySource.indexOf("<PrefectureSelector") <
      categorySource.indexOf("<MapViewClient"),
    "category selector must render before its map",
  );
  assert(categorySource.includes("facilities={result.mapFacilities}"));
  assert(categorySource.includes("getFacilitiesForCategoryPage("));
  assert(!categorySource.includes("storageKey={`category:"));
  assert(categorySource.includes("data-prefecture-section={section.id}"));
  assert(tagSource.includes("data-prefecture-section={p.id}"));
  assert(facilitiesSource.includes("disableEmpty={recommendedTag !== null}"));
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

test("facility identity remains globally unique at the current published boundary", () => {
  assert.equal(data.metadata.total_facilities, data.facilities.length);
  assert.equal(
    visibleFacilities.length,
    data.facilities.filter(
      ({ data_quality_status }) => data_quality_status !== "exclude_candidate",
    ).length,
  );
  assert.equal(
    new Set(data.facilities.map(({ id }) => id)).size,
    data.facilities.length,
  );
  assert.equal(
    new Set(data.facilities.map(({ slug }) => slug)).size,
    data.facilities.length,
  );
});
