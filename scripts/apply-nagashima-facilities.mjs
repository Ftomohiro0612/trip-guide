#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const facilitiesUrl = new URL("data/facilities_data.json", root);
const facilityData = JSON.parse(await readFile(facilitiesUrl, "utf8"));

const additions = [
  {
    id: 7510,
    slug: "facility-7510",
    name: "ナガシマスパーランド",
    prefecture: "三重県",
    prefecture_id: "mie",
    category: "遊園地・テーマパーク",
    category_id: "theme-park",
    address: "三重県桑名市長島町浦安333",
    indoor_outdoor: "両方",
    rain_friendly: "△",
    is_free: false,
    fee_type: "有料",
    adult_fee: "入場券 大人1,800円（2026年8月公式料金）",
    child_fee: "小学生1,100円、幼児（2歳～）600円（入場券）",
    child_use_status: "confirmed",
    child_use_notes:
      "公式アトラクション案内で年齢・身長制限と保護者同伴条件を個別に掲載。",
    description:
      "白鯨、スチールドラゴン2000、アクロバットなどの大型コースターと、低速コースターやメリーゴーランド、約50種類の遊具を備えたキッズタウンを同じ園内で楽しめます。絶叫系、家族で乗れるアトラクション、自由に体を動かす遊びを子どもの年齢や興味に合わせて組み合わせられる構成です。",
    target_age: "1歳～大人（施設・アトラクション別に制限あり）",
    url: "https://www.nagashima-onsen.co.jp/spaland/",
    tags: ["有料", "屋内外両方", "0-3歳OK", "小学生向け"],
    latitude: 35.0306681,
    longitude: 136.7333357,
    geocode_source: "nominatim",
    image: null,
    image_attribution: null,
    image_source: null,
    signature_experiences: [
      "白鯨やスチールドラゴン2000などの大型コースターに乗る",
      "キッズタウンで低速コースターや遊具を楽しむ",
      "年齢・身長に合うアトラクションを家族で選ぶ",
    ],
    unique_selling_point:
      "大型コースターから幼児向けのキッズタウンまで、年齢に合う乗り物を選んで遊べる遊園地です。",
    experience_tags: ["コースター", "乗り物", "キッズタウン"],
    summer_water_play: "×",
    recommended_for_tags: ["playground", "slide", "vehicle", "experience"],
    things_to_do: [
      "白鯨やスチールドラゴン2000などの大型コースターに乗る",
      "キッズタウンで低速コースターや遊具を楽しむ",
      "年齢・身長に合うアトラクションを家族で選ぶ",
    ],
    source_urls:
      "https://www.nagashima-onsen.co.jp/spaland/fee/index.html, https://www.nagashima-onsen.co.jp/spaland/attraction/index.html, https://www.nagashima-onsen.co.jp/spaland/attraction/kidstown/index.html, https://www.nagashima-onsen.co.jp/spaland/attraction/limit.html, https://www.nagashima-onsen.co.jp/spaland/wp-content/uploads/sites/7/2019/04/gudemap_ja.pdf",
    source_checked_at: "2026-08-28",
    data_quality_status: "confirmed",
    source_notes:
      "公式一次情報で独立した施設名、所在地、現行営業、常設遊園地としてのFacilityOps適格性を確認。名古屋アンパンマンこどもミュージアム＆パークとは名称・所在地・公式導線・体験構成が異なるためidentityを分離。座標は公式住所確認後にOpenStreetMap Nominatimの施設名完全一致点を採用。",
  },
  {
    id: 7511,
    slug: "facility-7511",
    name: "ジャンボ海水プール",
    prefecture: "三重県",
    prefecture_id: "mie",
    category: "温泉プール",
    category_id: "hot-spring-pool",
    address: "三重県桑名市長島町浦安333",
    indoor_outdoor: "屋外",
    rain_friendly: "×",
    is_free: false,
    fee_type: "有料",
    adult_fee: "遊園地入場＋プール 大人4,800円（2026年）",
    child_fee: "小学生3,300円、幼児（2歳～）2,000円（2026年）",
    child_use_status: "confirmed",
    child_use_notes:
      "公式料金・プール案内で幼児料金と年齢別エリア、スライダー別の利用条件を掲載。",
    description:
      "約75,000㎡の敷地に、波の出るサーフィンプール、流水プール、温泉プール、激流を下るアトラクションプールなどが広がります。スライダーは複数人で乗る大型タイプからキッズ向けまであり、屋根付きの「スパキッズ」には年齢に合わせて遊べる5つのエリアが設けられています。毎夏営業する常設施設で、2026年は7月11日から9月28日まで開場します。",
    target_age: "乳幼児～大人（プール・スライダー別に制限あり）",
    url: "https://www.nagashima-onsen.co.jp/pool/",
    tags: ["有料", "屋外", "季節限定", "0-3歳OK", "小学生向け"],
    latitude: 35.0292135,
    longitude: 136.728231,
    geocode_source: "nominatim",
    image: null,
    image_attribution: null,
    image_source: null,
    signature_experiences: [
      "サーフィンプールや流水プールで泳ぐ",
      "大型スライダーで滑る",
      "屋根付きのスパキッズで年齢に合う水遊びを選ぶ",
    ],
    unique_selling_point:
      "海水を使った多彩なプールと11種類のスライダーで、幼児から大人まで水遊びを楽しめる夏季営業のウォーターパークです。",
    experience_tags: ["プール", "ウォータースライダー", "キッズプール"],
    summer_water_play: "◎",
    recommended_for_tags: ["water_play", "pool", "slide", "experience"],
    things_to_do: [
      "サーフィンプールや流水プールで泳ぐ",
      "大型スライダーで滑る",
      "屋根付きのスパキッズで年齢に合う水遊びを選ぶ",
    ],
    source_urls:
      "https://www.nagashima-onsen.co.jp/pool/, https://www.nagashima-onsen.co.jp/pool/poolguide/index.html, https://www.nagashima-onsen.co.jp/pool/fee/index.html, https://www.nagashima-onsen.co.jp/pool/wp-content/uploads/sites/8/2026/06/pool-guide.pdf",
    source_checked_at: "2026-08-28",
    data_quality_status: "confirmed",
    source_notes:
      "公式一次情報で独立した施設名、所在地、2026年夏季の現行営業、毎夏営業する常設ウォーターパークとしてのFacilityOps適格性を確認。一時イベントではなくseasonal permanent facilityとして登録し、ナガシマスパーランドおよび名古屋アンパンマンこどもミュージアム＆パークとidentityを分離。座標は公式住所確認後にOpenStreetMap Nominatimの施設名完全一致点を採用。",
  },
];

assert.equal(facilityData.facilities.length, 5235);
assert.equal(facilityData.metadata.total_facilities, 5235);
for (const addition of additions) {
  assert.ok(!facilityData.facilities.some(({ id }) => id === addition.id));
  assert.ok(!facilityData.facilities.some(({ slug }) => slug === addition.slug));
  assert.ok(!facilityData.facilities.some(({ name }) => name === addition.name));
}

facilityData.facilities.push(...additions);
facilityData.metadata.total_facilities += additions.length;
incrementMetadataCount(facilityData.metadata.prefectures, "mie", 2);
incrementMetadataCount(facilityData.metadata.categories, "theme-park", 1);
incrementMetadataCount(facilityData.metadata.categories, "hot-spring-pool", 1);

assert.equal(facilityData.facilities.length, 5237);
assert.equal(facilityData.metadata.total_facilities, 5237);
assert.equal(
  facilityData.metadata.prefectures.reduce((sum, item) => sum + item.count, 0),
  5237,
);
assert.equal(
  facilityData.metadata.categories.reduce((sum, item) => sum + item.count, 0),
  5237,
);

await writeFile(facilitiesUrl, `${JSON.stringify(facilityData, null, 2)}\n`, "utf8");

const canonHash = createHash("sha256")
  .update(JSON.stringify(facilityData))
  .digest("hex");

for (const relativePath of [
  "data/rakuten_facility_actions.json",
  "data/asoview_facility_actions.json",
]) {
  const url = new URL(relativePath, root);
  const data = JSON.parse(await readFile(url, "utf8"));
  data.coverage.facility_canon_count = 5237;
  data.coverage.facility_canon_sha256 = canonHash;
  await writeFile(url, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

for (const relativePath of [
  "docs/audits/rakuten-facility-discovery-candidates-2026-08-26.json",
  "docs/audits/asoview-reverse-discovery-candidates-2026-08-26.json",
]) {
  const url = new URL(relativePath, root);
  const data = JSON.parse(await readFile(url, "utf8"));
  data.coverage.final_facility_canon_count = 5237;
  data.coverage.final_facility_canon_sha256 = canonHash;
  await writeFile(url, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

console.log(JSON.stringify({ added: additions.map(({ id, name }) => ({ id, name })), canon_count: 5237, canon_sha256: canonHash }, null, 2));

function incrementMetadataCount(items, id, amount) {
  const item = items.find((candidate) => candidate.id === id);
  assert.ok(item, `metadata entry not found: ${id}`);
  item.count += amount;
}
