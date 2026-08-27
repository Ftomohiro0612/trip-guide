import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const FINAL_PATH = resolve(
  ROOT,
  "docs/audits/asoview-reverse-discovery-second-pass-final-2026-08-27.json",
);
const FACILITIES_PATH = resolve(ROOT, "data/facilities_data.json");
const OUTPUT_PATH = resolve(
  ROOT,
  "scripts/data/asoview-second-pass-additions-2026-08-27.json",
);

const [audit, facilityData] = await Promise.all([
  readFile(FINAL_PATH, "utf8").then(JSON.parse),
  readFile(FACILITIES_PATH, "utf8").then(JSON.parse),
]);

const prefectureIds = new Map(
  facilityData.metadata.prefectures.map((entry) => [entry.name, entry.id]),
);
const additions = [];
for (const review of audit.reviews.filter((entry) => entry.final_status === "ADD")) {
  const evidence = review.evidence;
  const address = cleanAddress(evidence.address.value);
  const prefecture = [...prefectureIds.keys()].find((name) => address.includes(name)) ?? "";
  const prefectureId = prefectureIds.get(prefecture);
  if (!prefectureId) throw new Error(`unknown prefecture: ${review.asoview_identity}`);

  const coordinates =
    review.facility &&
    Number.isFinite(review.facility.latitude) &&
    Number.isFinite(review.facility.longitude)
      ? {
          latitude: review.facility.latitude,
          longitude: review.facility.longitude,
          source: review.facility.geocode_source,
        }
      : await geocode(address);
  const classification = classify(review.asoview_identity);
  additions.push({
    asoview_identity: review.asoview_identity,
    name: cleanName(review.asoview_identity),
    prefecture,
    prefecture_id: prefectureId,
    category: classification.category,
    category_id: classification.categoryId,
    address,
    latitude: coordinates.latitude,
    longitude: coordinates.longitude,
    geocode_source: coordinates.source,
    url: chooseOfficialUrl(evidence),
    adult_fee: "有料（公式料金・利用案内を確認）",
    child_fee: "公式の子ども料金・年齢・同伴条件あり",
    target_age: "子どもと家族（公式の年齢・同伴条件を確認）",
    summary: classification.summary,
    experiences: classification.experiences,
    indoor_outdoor: classification.indoorOutdoor,
    rain_friendly: classification.indoorOutdoor === "屋内" ? "◎" : "△",
    source_evidence: {
      identity: evidence.identity,
      address: evidence.address,
      current_operation: evidence.current_operation,
      child_use: evidence.child_use,
      checked_at: audit.checked_at,
    },
  });
}

if (additions.length !== audit.coverage.final_status_counts.ADD) {
  throw new Error("prepared ADD count does not match final audit");
}

await writeFile(
  OUTPUT_PATH,
  `${JSON.stringify(
    {
      schema_version: 1,
      generated_at: new Date().toISOString(),
      checked_at: audit.checked_at,
      source_audit:
        "docs/audits/asoview-reverse-discovery-second-pass-final-2026-08-27.json",
      count: additions.length,
      additions,
    },
    null,
    2,
  )}\n`,
  "utf8",
);

console.log(JSON.stringify({ additions: additions.length }, null, 2));

async function geocode(address) {
  const query = address.replace(/^〒\s*\d{3}-?\d{4}\s*/u, "");
  const response = await fetch(
    `https://msearch.gsi.go.jp/address-search/AddressSearch?q=${encodeURIComponent(query)}`,
    { headers: { "User-Agent": "Memorip-FacilityOps/1.0 (public primary-source audit)" } },
  );
  if (!response.ok) throw new Error(`GSI geocode failed (${response.status}): ${address}`);
  const rows = await response.json();
  const coordinates = rows?.[0]?.geometry?.coordinates;
  if (!Array.isArray(coordinates) || coordinates.length !== 2) {
    throw new Error(`GSI geocode unavailable: ${address}`);
  }
  return {
    longitude: Number(coordinates[0]),
    latitude: Number(coordinates[1]),
    source: "gsi_address_search",
  };
}

function chooseOfficialUrl(evidence) {
  const identity = new URL(evidence.identity.url);
  const current = new URL(evidence.current_operation.url);
  if (
    identity.hostname.replace(/^www\./u, "") ===
      current.hostname.replace(/^www\./u, "") &&
    current.pathname.length + current.search.length <
      identity.pathname.length + identity.search.length
  ) {
    return current.href;
  }
  return identity.href;
}

function cleanName(value) {
  return String(value).replace(/\s+/gu, " ").trim();
}

function cleanAddress(value) {
  return String(value)
    .normalize("NFKC")
    .replace(/^日本、/u, "")
    .replace(/^〒\s*\d{3}-?\d{4}\s*/u, "")
    .replace(/\s+/gu, " ")
    .trim();
}

function classify(name) {
  const rules = [
    [/スキー|スノー|ウィンター|雪/u, "スキー場・雪遊び", "ski", "雪遊びやウィンタースポーツを家族で楽しめる常設施設です。", ["雪遊びを楽しむ", "ウィンタースポーツを体験する", "家族で景色を楽しむ"], "屋外"],
    [/水族館/u, "水族館", "aquarium", "水生生物の展示や観察を親子で楽しめる施設です。", ["水生生物を観察する", "展示から学ぶ", "親子で館内を巡る"], "屋内"],
    [/クマ牧場|動物園/u, "動物園", "zoo", "動物の観察やふれあいを親子で楽しめる施設です。", ["動物を観察する", "生態を学ぶ", "親子で園内を巡る"], "両方"],
    [/美術館|アートミュージアム|ドールミュージアム/u, "美術館・体験", "art-museum", "作品鑑賞や文化体験を親子で楽しめる施設です。", ["作品を鑑賞する", "文化に触れる", "親子で展示を巡る"], "屋内"],
    [/博物館|ミュージアム|忍者館|HAKKOパーク|ガラスパーク/u, "博物館", "museum", "展示や体験を通して親子で学べる常設施設です。", ["展示を見学する", "テーマについて学ぶ", "親子で館内を巡る"], "屋内"],
    [/いちご|苺|果樹|果園|農園|フルーツ|オレンジパーク|ファーム/u, "味覚狩り", "fruit-picking", "旬の味覚狩りや収穫体験を親子で楽しめる農園です。", ["収穫を体験する", "旬の味覚を楽しむ", "農園で親子時間を過ごす"], "屋外"],
    [/クライミング|ボルダリング|フォレストアドベンチャー|アドベンチャー|トランポリン|ニンジャ☆パーク|アーチェリー/u, "アスレチック", "athletic", "身体を動かすアクティビティを親子で楽しめる施設です。", ["アクティビティに挑戦する", "身体を動かす", "親子で達成感を味わう"], "両方"],
    [/キッズランド|キッズリゾート|あそびば|らくがキッズ|JUMPIN/u, "屋内遊び場", "indoor-play", "天候を気にせず親子で遊べる屋内施設です。", ["屋内遊具で遊ぶ", "身体を動かす", "親子で過ごす"], "屋内"],
    [/温泉|健康ランド|湯～トピア|竹取の湯|ユーランド/u, "温泉プール", "hot-spring-pool", "入浴や館内設備を家族で利用できる施設です。", ["温浴施設を利用する", "館内で休憩する", "家族で過ごす"], "屋内"],
    [/公園|パーク|キャンプ場|ビーチ|BBQ広場/u, "公園・自然", "nature-park", "自然の中で遊びや体験を親子で楽しめる施設です。", ["自然の中で遊ぶ", "屋外体験を楽しむ", "親子で景色を楽しむ"], "屋外"],
    [/陶芸|硝子|ガラス工房|工房|作陶/u, "クラフト体験", "craft", "ものづくりやクラフト体験を親子で楽しめる施設です。", ["作品づくりを体験する", "素材に触れる", "完成品を持ち帰る"], "屋内"],
    [/プール|水あそび/u, "温泉プール", "hot-spring-pool", "水遊びを親子で楽しめる施設です。", ["水遊びを楽しむ", "プールで身体を動かす", "親子で過ごす"], "屋外"],
  ];
  const match = rules.find(([pattern]) => pattern.test(name));
  if (match) {
    const [, category, categoryId, summary, experiences, indoorOutdoor] = match;
    return { category, categoryId, summary, experiences, indoorOutdoor };
  }
  return {
    category: "体験",
    categoryId: "experience",
    summary: "施設ならではの体験を親子で楽しめる継続営業施設です。",
    experiences: ["施設を見学する", "体験に参加する", "親子で過ごす"],
    indoorOutdoor: "両方",
  };
}
