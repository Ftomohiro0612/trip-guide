import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const online = process.argv.includes("--online");
const CHECK_DATE = "2026-08-03";

const TARGETS = {
  hokkaido: {
    name: "北海道",
    bbox: [41.2, 45.7, 139.1, 146.3],
    regions: {
      "札幌・道央": ["札幌市", "千歳市", "北広島市", "岩見沢市", "苫小牧市", "留寿都村", "洞爺湖町", "白老町", "登別市", "平取町"],
      "函館・道南": ["函館市"],
      "旭川・道北": ["旭川市", "東川町", "占冠村", "稚内市", "剣淵町", "北竜町"],
      "オホーツク": ["網走市", "紋別市"],
      "十勝": ["帯広市", "芽室町"],
      "釧路・根室": ["釧路市", "標津町", "羅臼町"],
    },
  },
  aomori: {
    name: "青森県",
    bbox: [40.2, 41.6, 139.4, 141.7],
    regions: {
      "青森": ["青森市"],
      "弘前・西北": ["弘前市", "西目屋村", "五所川原市", "鶴田町", "つがる市", "黒石市"],
      "八戸・三八": ["八戸市"],
      "上北": ["三沢市", "十和田市", "東北町"],
      "下北": ["むつ市"],
    },
  },
  iwate: {
    name: "岩手県",
    bbox: [38.7, 40.5, 140.6, 142.1],
    sourceDate: "2026-08-04",
    regions: {
      "盛岡・県央": ["盛岡市", "雫石町", "八幡平市"],
      "花巻・北上・遠野": ["花巻市", "北上市", "遠野市"],
      "平泉・県南": ["奥州市", "一関市", "平泉町"],
      "三陸沿岸": ["宮古市", "山田町", "釜石市", "大船渡市", "陸前高田市", "岩泉町"],
      "県北": ["久慈市", "一戸町"],
    },
  },
  akita: { name: "秋田県", bbox: [38.8, 40.6, 139.6, 141.1] },
  yamagata: {
    name: "山形県",
    bbox: [37.7, 39.3, 139.5, 140.7],
    regions: {
      "村山": ["山形市", "上山市", "東根市", "天童市", "寒河江市", "河北町", "村山市"],
      "最上": ["新庄市", "最上郡"],
      "庄内": ["鶴岡市", "酒田市"],
      "置賜": ["長井市", "西置賜郡", "東置賜郡"],
    },
  },
};

const data = JSON.parse(await readFile(resolve(ROOT, "data/facilities_data.json"), "utf8"));
const activeTargets = Object.entries(TARGETS).filter(([id]) =>
  data.facilities.some((facility) => facility.prefecture_id === id),
);

assert(activeTargets.length > 0, "Lane A facilities are not present");
assert.equal(data.metadata.total_facilities, data.facilities.length, "metadata total mismatch");
assert.equal(
  data.metadata.site_description,
  `全国${data.metadata.prefectures.length}都道府県の子供向け遊び場検索サイト`,
  "site description prefecture count mismatch",
);

const unique = (values, label) => {
  assert.equal(new Set(values).size, values.length, `${label} contains duplicates`);
};

unique(data.facilities.map((facility) => facility.id), "facility IDs");
unique(data.facilities.map((facility) => facility.slug), "facility slugs");

const checkedUrls = [];
const summary = {};
for (const [id, spec] of activeTargets) {
  const facilities = data.facilities.filter((facility) => facility.prefecture_id === id);
  const meta = data.metadata.prefectures.find((prefecture) => prefecture.id === id);
  assert.equal(meta?.name, spec.name, `${id}: metadata name mismatch`);
  assert.equal(meta?.count, facilities.length, `${id}: metadata count mismatch`);
  assert(facilities.length >= 12, `${id}: representative facility group is too small`);
  unique(facilities.map((facility) => facility.name), `${id} names`);
  unique(facilities.map((facility) => facility.url), `${id} official URLs`);

  const indoorCount = facilities.filter((facility) => facility.indoor_outdoor === "屋内").length;
  const outdoorCount = facilities.filter((facility) => facility.indoor_outdoor !== "屋内").length;
  const categoryCount = new Set(facilities.map((facility) => facility.category_id)).size;
  assert(indoorCount >= 3, `${id}: insufficient indoor choices`);
  assert(outdoorCount >= 3, `${id}: insufficient outdoor choices`);
  assert(categoryCount >= 5, `${id}: insufficient category breadth`);

  if (spec.regions) {
    for (const [region, places] of Object.entries(spec.regions)) {
      assert(
        facilities.some((facility) => places.some((place) => facility.address.includes(place))),
        `${id}: missing ${region} coverage`,
      );
    }
  }

  const [minLat, maxLat, minLng, maxLng] = spec.bbox;
  for (const facility of facilities) {
    assert.equal(facility.prefecture, spec.name, `${facility.name}: prefecture mismatch`);
    assert(facility.address.startsWith(spec.name), `${facility.name}: address does not start with prefecture`);
    assert.equal(facility.slug, `facility-${facility.id}`, `${facility.name}: slug mismatch`);
    assert(["屋内", "屋外", "両方"].includes(facility.indoor_outdoor), `${facility.name}: invalid indoor/outdoor`);
    assert(["◎", "△", "×"].includes(facility.rain_friendly), `${facility.name}: invalid rain suitability`);
    assert(["無料", "有料"].includes(facility.fee_type), `${facility.name}: invalid fee type`);
    assert(typeof facility.adult_fee === "string" && facility.adult_fee, `${facility.name}: adult fee missing`);
    assert(typeof facility.child_fee === "string" && facility.child_fee, `${facility.name}: child fee missing`);
    assert(typeof facility.description === "string" && facility.description.length >= 90, `${facility.name}: description too short`);
    assert(typeof facility.target_age === "string" && facility.target_age, `${facility.name}: target age missing`);
    assert(Array.isArray(facility.signature_experiences) && facility.signature_experiences.length >= 3, `${facility.name}: signature experiences missing`);
    assert(Array.isArray(facility.recommended_for_tags) && facility.recommended_for_tags.length >= 2, `${facility.name}: recommendations missing`);
    assert(Array.isArray(facility.things_to_do) && facility.things_to_do.length >= 4, `${facility.name}: things_to_do missing`);
    assert(Number.isFinite(facility.latitude) && Number.isFinite(facility.longitude), `${facility.name}: coordinates missing`);
    assert(facility.latitude >= minLat && facility.latitude <= maxLat, `${facility.name}: latitude outside ${spec.name}`);
    assert(facility.longitude >= minLng && facility.longitude <= maxLng, `${facility.name}: longitude outside ${spec.name}`);
    assert.equal(facility.geocode_source, "manual", `${facility.name}: coordinate provenance mismatch`);
    assert.equal(facility.source_checked_at, spec.sourceDate ?? CHECK_DATE, `${facility.name}: source date mismatch`);
    assert.equal(facility.data_quality_status, "confirmed", `${facility.name}: source is not confirmed`);
    assert(facility.source_notes.includes("公式"), `${facility.name}: official-source note missing`);
    const url = new URL(facility.url);
    assert.equal(url.protocol, "https:", `${facility.name}: canonical URL is not HTTPS`);
    assert.equal(facility.source_urls.split(",")[0], facility.url, `${facility.name}: canonical source mismatch`);
    checkedUrls.push(facility.url);
  }

  summary[id] = {
    facilities: facilities.length,
    indoor: indoorCount,
    outdoorOrMixed: outdoorCount,
    categories: categoryCount,
  };
}

for (const prefecture of data.metadata.prefectures) {
  assert.equal(
    prefecture.count,
    data.facilities.filter((facility) => facility.prefecture_id === prefecture.id).length,
    `${prefecture.id}: global metadata count mismatch`,
  );
}
for (const category of data.metadata.categories) {
  assert.equal(
    category.count,
    data.facilities.filter((facility) => facility.category_id === category.id).length,
    `${category.id}: category count mismatch`,
  );
}

const onlineResults = [];
const onlineFailures = [];
if (online) {
  let cursor = 0;
  async function worker() {
    while (cursor < checkedUrls.length) {
      const url = checkedUrls[cursor++];
      try {
        const response = await fetch(url, {
          redirect: "follow",
          headers: { "User-Agent": "Mozilla/5.0 (compatible; Memorip source verifier; +https://trip-guide.net)" },
          signal: AbortSignal.timeout(30_000),
        });
        onlineResults.push({ url, status: response.status, finalUrl: response.url });
        if ([404, 410].includes(response.status)) onlineFailures.push(`${response.status} ${url}`);
      } catch (error) {
        onlineFailures.push(`${url}: ${error?.message ?? error}`);
      }
    }
  }
  await Promise.all(Array.from({ length: 6 }, () => worker()));
  assert.deepEqual(onlineFailures, [], `official URL failures:\n${onlineFailures.join("\n")}`);
}

console.log(JSON.stringify({ status: "PASS", prefectures: summary, officialUrlsChecked: onlineResults.length, onlineResults }, null, 2));
