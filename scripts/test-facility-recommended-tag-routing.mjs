import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  buildRecommendedTagPrefectureHref,
  buildRecommendedTagPrefectureOptions,
  filterFacilitiesByPrefectureNames,
  resolveRecommendedTagPrefecture,
} from "../lib/facility-recommended-filter.ts";

const data = JSON.parse(
  readFileSync(new URL("../data/facilities_data.json", import.meta.url), "utf8"),
);
const visibleFacilities = data.facilities.filter(
  (facility) => facility.data_quality_status !== "exclude_candidate",
);
const legacyOrder = [
  "東京都",
  "神奈川県",
  "千葉県",
  "埼玉県",
  "茨城県",
  "栃木県",
  "群馬県",
  "静岡県",
  "愛知県",
  "山梨県",
  "長野県",
  "新潟県",
  "大阪府",
  "兵庫県",
  "京都府",
  "福岡県",
  "広島県",
];
const prefectureOptions = buildRecommendedTagPrefectureOptions(
  data.metadata.prefectures,
  legacyOrder,
);

function verifyRecommendedTagRoute(prefecture, tag) {
  const selected = resolveRecommendedTagPrefecture(
    prefecture,
    prefectureOptions,
  );
  assert.equal(selected, prefecture, `${prefecture} must not fall back to 全国`);
  assert(prefectureOptions.includes(prefecture), `${prefecture} chip is missing`);

  const tagMatches = visibleFacilities.filter((facility) =>
    (facility.recommended_for_tags ?? []).includes(tag),
  );
  const results = filterFacilitiesByPrefectureNames(tagMatches, [selected]);
  assert(results.length > 0, `${prefecture}/${tag} needs at least one result`);
  assert(
    results.every((facility) => facility.prefecture === prefecture),
    `${prefecture}/${tag} leaked a facility from another prefecture`,
  );

  const href = buildRecommendedTagPrefectureHref(tag, prefecture);
  const reloaded = new URL(href, "https://trip-guide.net");
  assert.equal(reloaded.searchParams.get("recommended_tag"), tag);
  assert.equal(reloaded.searchParams.get("prefecture"), prefecture);
  assert.equal(
    resolveRecommendedTagPrefecture(
      reloaded.searchParams.get("prefecture") ?? "",
      prefectureOptions,
    ),
    prefecture,
    `${prefecture}/${tag} lost its selection after reload`,
  );
}

test("recommended-tag prefecture chips include every facility metadata prefecture", () => {
  assert.equal(prefectureOptions[0], "全国");
  assert.deepEqual(
    new Set(prefectureOptions.slice(1)),
    new Set(data.metadata.prefectures.map(({ name }) => name)),
  );
  assert.deepEqual(prefectureOptions.slice(1, 18), legacyOrder);
});

test("expanded prefectures retain recommended-tag filters across reload", async (t) => {
  const cases = [
    ["宮城県", "experience"],
    ["香川県", "exhibition"],
    ["熊本県", "nature"],
    ["岡山県", "nature"],
    ["石川県", "exhibition"],
    ["大分県", "experience"],
    ["福島県", "nature"],
    ["愛媛県", "nature"],
    ["長崎県", "exhibition"],
    ["富山県", "nature"],
    ["福井県", "dinosaur"],
    ["岐阜県", "nature"],
    ["三重県", "experience"],
    ["岩手県", "science"],
  ];
  for (const [prefecture, tag] of cases) {
    await t.test(`${prefecture} + ${tag}`, () => {
      verifyRecommendedTagRoute(prefecture, tag);
    });
  }
});

test("existing 17 prefectures keep the recommended-tag route behavior", () => {
  for (const prefecture of legacyOrder) {
    const facility = visibleFacilities.find(
      (candidate) =>
        candidate.prefecture === prefecture &&
        (candidate.recommended_for_tags ?? []).length > 0,
    );
    assert(facility, `${prefecture} needs a recommended-tag fixture`);
    verifyRecommendedTagRoute(prefecture, facility.recommended_for_tags[0]);
  }
});

test("facility metadata description matches its prefecture count", () => {
  assert.equal(
    data.metadata.site_description,
    `全国${data.metadata.prefectures.length}都道府県の子供向け遊び場検索サイト`,
  );
});
