import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  buildFacilitiesHref,
  getMunicipalityParseCoverage,
  groupFacilitiesByMunicipality,
  isDecisionPickEligible,
  selectDecisionPicks,
} from "../lib/discovery-landings.ts";
import { selectSeasonalFacilities } from "../lib/seasonal-facilities.ts";
import {
  TAG_META,
  getTagFacilities,
  getTagFacilityFilterParams,
} from "../lib/tags.ts";

const data = JSON.parse(
  readFileSync(new URL("../data/facilities_data.json", import.meta.url), "utf8"),
);
const discoverable = data.facilities.filter(
  (facility) =>
    facility.data_quality_status !== "exclude_candidate" &&
    facility.closure_status !== "permanently_closed",
);

function category(id) {
  return discoverable.filter((facility) => facility.category_id === id);
}

function prefecture(id) {
  return discoverable.filter((facility) => facility.prefecture_id === id);
}

function theme(slug) {
  const meta = TAG_META.find((candidate) => candidate.slug === slug);
  assert(meta, `${slug} metadata missing`);
  return { meta, facilities: getTagFacilities(meta, discoverable) };
}

test("museum category picks use explicit rain, toddler, and free fields", () => {
  const picks = selectDecisionPicks(category("museum"), { type: "category" });
  assert.equal(picks.length, 3);
  assert(picks.every(({ facility }) => isDecisionPickEligible(facility)));
  assert(picks.some(({ facility }) => facility.rain_friendly === "◎"));
  assert(picks.some(({ facility }) => facility.tags.includes("0-3歳OK")));
  assert(picks.some(({ facility }) => facility.is_free));
});

test("fruit-picking October picks require an explicit period statement", () => {
  const picks = selectSeasonalFacilities(
    category("fruit-picking"),
    "2026-10-20",
    3,
    "prefecture",
  );
  assert(picks.length > 0);
  assert(picks.some(({ facility }) => facility.id === 50));
  assert(picks.every(({ reason }) => /10月|秋/u.test(reason)));
});

test("Tokyo and Akita municipality parsing is deterministic and reports coverage", () => {
  for (const [id, name] of [["tokyo", "東京都"], ["akita", "秋田県"]]) {
    const facilities = prefecture(id);
    const first = groupFacilitiesByMunicipality(facilities, name);
    const second = groupFacilitiesByMunicipality(facilities, name);
    assert.deepEqual(first, second);
    const coverage = getMunicipalityParseCoverage(facilities, name);
    assert(coverage.parsed > 0);
    assert.equal(
      coverage.parsed,
      first.reduce((total, group) => total + group.facilities.length, 0),
    );
  }
});

test("water-play, playground, and rainy-day themes use their exact fields", () => {
  const water = theme("water-play");
  const playground = theme("playground");
  const rainy = theme("rainy-day");
  assert(water.facilities.length > 0);
  assert(
    water.facilities.every((facility) =>
      facility.recommended_for_tags?.includes("water_play"),
    ),
  );
  assert(
    playground.facilities.every((facility) =>
      facility.recommended_for_tags?.includes("playground"),
    ),
  );
  assert(rainy.facilities.every((facility) => facility.rain_friendly === "◎"));

  const waterPicks = selectDecisionPicks(water.facilities, {
    type: "theme",
    slug: water.meta.slug,
    recommendedTag: water.meta.recommendedTag,
  });
  assert(waterPicks.every(({ facility }) => isDecisionPickEligible(facility)));
  assert(waterPicks.some(({ facility }) => facility.summer_water_play === "◎"));
});

test("landing CTA params are exact and match their target sets", () => {
  const categoryHref = buildFacilitiesHref({ categories: "museum" });
  const prefectureHref = buildFacilitiesHref({ prefectures: "tokyo" });
  assert.equal(categoryHref, "/facilities?categories=museum");
  assert.equal(prefectureHref, "/facilities?prefectures=tokyo");

  const expectations = new Map([
    ["rainy-day", "rain=%E2%97%8E"],
    ["free", "fee=free"],
    ["kids-0-3", "tags=0-3%E6%AD%B3OK"],
    ["elementary", "tags=%E5%B0%8F%E5%AD%A6%E7%94%9F%E5%90%91%E3%81%91"],
    ["water-play", "recommended_tag=water_play"],
    ["playground", "recommended_tag=playground"],
  ]);
  for (const [slug, expectedQuery] of expectations) {
    const { meta, facilities } = theme(slug);
    const href = buildFacilitiesHref(getTagFacilityFilterParams(meta));
    assert.equal(href, `/facilities?${expectedQuery}`);
    assert(facilities.length > 0, `${slug} must have a target set`);
  }
});
