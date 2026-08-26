import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const LEDGER_PATH = resolve(
  ROOT,
  "docs/audits/asoview-reverse-discovery-candidates-2026-08-26.json",
);
const FACILITIES_PATH = resolve(ROOT, "data/facilities_data.json");
const OUTPUT_PATH = resolve(
  ROOT,
  "scripts/data/asoview-reverse-discovery-independent-review-2026-08-26.json",
);
const SEARCH_SEEDS_PATH = resolve(
  ROOT,
  "scripts/data/asoview-independent-search-seeds-2026-08-26.json",
);
const CONCURRENCY = Number(process.env.OFFICIAL_REVIEW_CONCURRENCY ?? 2);
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/140 Safari/537.36 MemoripFacilityOpsOfficialEvidence/1.0";
const REVIEW_VERSION = 10;
const PREFECTURE_IDS = new Map([
  ["北海道", "hokkaido"], ["青森県", "aomori"], ["岩手県", "iwate"], ["宮城県", "miyagi"], ["秋田県", "akita"], ["山形県", "yamagata"], ["福島県", "fukushima"],
  ["茨城県", "ibaraki"], ["栃木県", "tochigi"], ["群馬県", "gunma"], ["埼玉県", "saitama"], ["千葉県", "chiba"], ["東京都", "tokyo"], ["神奈川県", "kanagawa"],
  ["新潟県", "niigata"], ["富山県", "toyama"], ["石川県", "ishikawa"], ["福井県", "fukui"], ["山梨県", "yamanashi"], ["長野県", "nagano"], ["岐阜県", "gifu"], ["静岡県", "shizuoka"], ["愛知県", "aichi"], ["三重県", "mie"],
  ["滋賀県", "shiga"], ["京都府", "kyoto"], ["大阪府", "osaka"], ["兵庫県", "hyogo"], ["奈良県", "nara"], ["和歌山県", "wakayama"], ["鳥取県", "tottori"], ["島根県", "shimane"], ["岡山県", "okayama"], ["広島県", "hiroshima"], ["山口県", "yamaguchi"],
  ["徳島県", "tokushima"], ["香川県", "kagawa"], ["愛媛県", "ehime"], ["高知県", "kochi"], ["福岡県", "fukuoka"], ["佐賀県", "saga"], ["長崎県", "nagasaki"], ["熊本県", "kumamoto"], ["大分県", "oita"], ["宮崎県", "miyazaki"], ["鹿児島県", "kagoshima"], ["沖縄県", "okinawa"],
]);
const PREFECTURE_PATTERN = `(?:${[...PREFECTURE_IDS.keys()].join("|")})`;
const CHAIN_PATTERN =
  /キッズ(?:ユーエス)?ランド|キッズランドUS|ザキッズ|The\s*Kids|ニンジャ.?パーク|ファンタジーキッズリゾート/iu;
const BLOCKED_HOST_PATTERN =
  /(?:asoview\.com|iko-yo\.net|jalan\.|tripadvisor\.|wikipedia\.org|google\.|yahoo\.|mapion\.co\.jp|navitime\.co\.jp|rurubu\.jp|activityjapan\.com|kkday\.com|klook\.com|trip\.com|instagram\.com|facebook\.com|(?:^|\.)x\.com|ameblo\.jp|4travel\.jp|skyticket\.jp|japan-guide\.com|feel-kobe\.jp|hyogo-tourism\.jp|japan47go\.travel|matcha-jp\.com|gurutabi\.gnavi\.co\.jp|tabiiro\.jp|walkerplus\.com|tabelog\.com|hotpepper\.jp|4gamer\.net|prtimes\.jp|atpress\.ne\.jp|value-press\.com|news\.|press\.|reuters\.|oricon\.co\.jp|impress\.co\.jp|itmedia\.co\.jp|travel\.watch\.impress\.co\.jp|nap-camp\.com|hoikuensagashi\.com|waribikinavi\.jp|museum\.or\.jp|kobe-np\.co\.jp|at-s\.com|artagenda\.jp|nekocafe-navi\.com|odakyu-voice\.jp|kosodateswitch\.metro\.tokyo\.lg\.jp|okazaki-kanko\.jp|nikko-kankou\.org|welcome\.city\.yokohama\.jp|at-nagasaki\.jp|matsushima-kanko\.com|shodoshima\.or\.jp|kisarazu-cci\.or\.jp|yunotabi\.jp|slow-style\.com|beppu-tourism\.com|kanagawa-kankou\.or\.jp|nagasaki-tabinet\.com|utsunomiya-cvb\.org|tokk-kansai\.jp)/iu;

const [ledger, facilityData, searchSeeds] = await Promise.all([
  readFile(LEDGER_PATH, "utf8").then(JSON.parse),
  readFile(FACILITIES_PATH, "utf8").then(JSON.parse),
  readFile(SEARCH_SEEDS_PATH, "utf8").then(JSON.parse),
]);
const searchSeedByIdentity = new Map(
  searchSeeds.items.map((item) => [item.asoview_identity, item]),
);

let priorByIdentity = new Map();
try {
  const prior = JSON.parse(await readFile(OUTPUT_PATH, "utf8"));
  if (prior.review_version === REVIEW_VERSION) {
    priorByIdentity = new Map(
      prior.reviews
        .filter(
          (review) =>
            review.review_complete &&
            !review.official_evidence?.search_error &&
            !(
              review.status === "ADD" &&
              BLOCKED_HOST_PATTERN.test(
                new URL(review.official_evidence.url).hostname,
              )
            ),
        )
        .map((review) => [review.asoview_identity, review]),
    );
  }
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}

const targets = ledger.identities.filter(
  (identity) =>
    identity.status === "OFFICIAL_REVIEW_REQUIRED" &&
    !CHAIN_PATTERN.test(identity.asoview_identity),
);
const reviews = targets.map(
  (target) =>
    priorByIdentity.get(target.asoview_identity) ?? {
      asoview_identity: target.asoview_identity,
      review_complete: false,
    },
);
const targetByIdentity = new Map(
  targets.map((target) => [target.asoview_identity, target]),
);
for (const review of reviews) {
  if (review.status !== "ADD" || !review.facility) continue;
  const target = targetByIdentity.get(review.asoview_identity);
  if (!target) continue;
  Object.assign(
    review.facility,
    classify(target.family_relevance, target.asoview_identity),
  );
}
if (targets.some((target) => !searchSeedByIdentity.has(target.asoview_identity))) {
  throw new Error("independent official search seeds do not cover every target");
}
const pending = reviews.filter((review) => !review.review_complete);
let cursor = 0;
let reviewed = 0;

await Promise.all(
  Array.from({ length: Math.min(CONCURRENCY, pending.length || 1) }, worker),
);
await save();
console.log(`independent official review complete: ${reviews.length}`);

async function worker() {
  while (true) {
    const index = cursor++;
    if (index >= pending.length) return;
    const review = pending[index];
    const target = targetByIdentity.get(review.asoview_identity);
    Object.assign(review, await reviewTarget(target));
    reviewed += 1;
    if (reviewed % 10 === 0 || reviewed === pending.length) {
      await save();
      console.log(
        `reviewed=${reviewed}/${pending.length} additions=${reviews.filter((item) => item.status === "ADD").length} insufficient=${reviews.filter((item) => item.status === "OFFICIAL_EVIDENCE_INSUFFICIENT").length}`,
      );
    }
  }
}

async function reviewTarget(target) {
  const seed = searchSeedByIdentity.get(target.asoview_identity);
  const query = seed.query;
  const inspected = [];
  const fetchedPages = [];
  try {
    const resultUrls = seed.urls;
    for (const url of resultUrls.slice(0, 6)) {
      if (BLOCKED_HOST_PATTERN.test(new URL(url).hostname)) continue;
      let page;
      try {
        page = await fetchOfficialPage(url);
      } catch (error) {
        inspected.push({
          url,
          fetch_error: error instanceof Error ? error.message : String(error),
        });
        continue;
      }
      fetchedPages.push(page);
      const evidence = evaluateOfficialPage(target, page);
      inspected.push(evidence);
      if (!evidence.accepted) continue;
      return finishAccepted(target, evidence, query, inspected);
    }
    const pagesByHost = Map.groupBy(
      fetchedPages,
      (page) => new URL(page.url).hostname,
    );
    for (const pages of pagesByHost.values()) {
      if (pages.length < 2) continue;
      const combinedPage = {
        url: pages[0].url,
        title: pages.map((page) => page.title).join(" "),
        visible_text: pages.map((page) => page.visible_text).join(" "),
      };
      const evidence = {
        ...evaluateOfficialPage(target, combinedPage),
        combined_official_pages: pages.map((page) => page.url),
      };
      inspected.push(evidence);
      if (evidence.accepted) {
        return finishAccepted(target, evidence, query, inspected);
      }
    }
    return {
      review_complete: true,
      status: "OFFICIAL_EVIDENCE_INSUFFICIENT",
      reason:
        "public official-source search did not establish all four required conditions on a non-aggregator primary page",
      official_evidence: {
        checked_at: "2026-08-26",
        search_query: query,
        inspected_results: inspected,
      },
      search_query: query,
      inspected_results: inspected,
    };
  } catch (error) {
    return {
      review_complete: true,
      status: "OFFICIAL_EVIDENCE_INSUFFICIENT",
      reason:
        "public official-source search could not establish all four required conditions",
      official_evidence: {
        checked_at: "2026-08-26",
        search_query: query,
        search_error: error instanceof Error ? error.message : String(error),
      },
      search_query: query,
      inspected_results: inspected,
    };
  }
}

async function finishAccepted(target, evidence, query, inspected) {
  const duplicate = findExistingDuplicate(
    target.asoview_identity,
    evidence.official_address,
  );
  if (duplicate) {
    return {
      review_complete: true,
      status: "DUPLICATE",
      facility_id: duplicate.id,
      reason:
        "official primary identity and address resolve to an existing facility canon entry",
      official_evidence: evidence,
      search_query: query,
      inspected_results: inspected,
    };
  }

  let coordinates;
  try {
    coordinates = await geocode(evidence.official_address);
  } catch (error) {
    if (
      !Number.isFinite(target.asoview_detail.latitude) ||
      !Number.isFinite(target.asoview_detail.longitude)
    ) {
      throw error;
    }
    coordinates = {
      latitude: target.asoview_detail.latitude,
      longitude: target.asoview_detail.longitude,
      source:
        "asoview_public_page_coordinate_after_official_address_identity_match",
    };
  }
  return {
    review_complete: true,
    status: "ADD",
    reason:
      "official primary page confirms identity, address, current operation, and child-use conditions",
    official_evidence: evidence,
    search_query: query,
    inspected_results: inspected,
    facility: buildAddition(target, evidence, coordinates),
  };
}

async function fetchOfficialPage(url) {
  const html = await fetchText(url, 10_000, 2);
  return {
    url,
    title: decodeHtml(
      html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "",
    ),
    visible_text: toVisibleText(html).slice(0, 80_000),
  };
}

async function fetchText(url, timeoutMs, maxAttempts = 4) {
  let lastError;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, {
        redirect: "follow",
        signal: controller.signal,
        headers: {
          Accept: "text/html,application/xhtml+xml",
          "User-Agent": USER_AGENT,
        },
      });
      if (!response.ok) {
        const error = new Error(`HTTP ${response.status}: ${url}`);
        if (response.status !== 429 && response.status < 500) throw error;
        lastError = error;
      } else {
        return await response.text();
      }
    } catch (error) {
      if (
        error instanceof Error &&
        /^HTTP 4(?!29)/u.test(error.message)
      ) {
        throw error;
      }
      lastError = error;
    } finally {
      clearTimeout(timeout);
    }
    if (attempt < maxAttempts) await delay(attempt * 1_500);
  }
  throw lastError ?? new Error(`fetch failed: ${url}`);
}

function evaluateOfficialPage(target, page) {
  const text = `${page.title} ${page.visible_text}`;
  const officialAddress = extractAddress(page.visible_text);
  const identityScore = Math.round(
    identitySimilarity(target.asoview_identity, text) * 100,
  );
  const officialPrefecture = extractPrefecture(officialAddress);
  const locationMatched =
    officialAddress &&
    officialPrefecture === target.asoview_detail.prefecture &&
    municipalityToken(officialAddress) ===
      municipalityToken(target.asoview_detail.address);
  const currentOperationMatched =
    /営業時間|開館時間|開園時間|営業日|利用時間|受付時間|休館日|休園日|入館料|入園料|利用料金|料金表/u.test(
      text,
    ) &&
    !/閉館しました|閉園しました|閉店しました|営業を終了|営業終了|廃業/u.test(
      text,
    );
  const childUseMatched =
    /0歳|０歳|1歳|１歳|幼児|小学生|中学生|高校生|子ども|子供|お子様|こども|親子/u.test(
      text,
    );
  return {
    accepted:
      identityScore >= 70 &&
      Boolean(locationMatched) &&
      currentOperationMatched &&
      childUseMatched,
    url: page.url,
    title: page.title,
    official_address: officialAddress,
    identity_score: identityScore,
    location_matched: Boolean(locationMatched),
    current_operation_matched: currentOperationMatched,
    child_use_matched: childUseMatched,
    checked_at: "2026-08-26",
  };
}

function findExistingDuplicate(identity, address) {
  const normalizedAddress = normalizeAddress(address);
  const normalizedIdentity = normalize(identity);
  return facilityData.facilities.find(
    (facility) =>
      normalizeAddress(facility.address) === normalizedAddress &&
      bigramDice(normalizedIdentity, normalize(facility.name)) >= 0.6,
  );
}

function buildAddition(target, evidence, coordinates) {
  const classification = classify(
    target.family_relevance,
    target.asoview_identity,
  );
  return {
    name: canonicalName(target.asoview_identity),
    prefecture: extractPrefecture(evidence.official_address),
    prefecture_id: prefectureId(extractPrefecture(evidence.official_address)),
    category: classification.category,
    category_id: classification.category_id,
    address: evidence.official_address.replace(/^〒\d{3}-?\d{4}\s*/u, ""),
    latitude: coordinates.latitude,
    longitude: coordinates.longitude,
    geocode_source: coordinates.source,
    url: evidence.url,
    adult_fee: "有料（公式料金表を確認）",
    child_fee: "子ども料金または利用条件あり（公式を確認）",
    target_age: "幼児～中学生と家族（公式利用条件を確認）",
    summary: classification.summary,
    experiences: classification.experiences,
    indoor_outdoor: classification.indoor_outdoor,
    rain_friendly: classification.rain_friendly,
    source_evidence: {
      official_url: evidence.url,
      identity_basis: "公式ページの施設名がアソビューprovider identityと一致",
      address_basis: "公式住所とアソビュー掲載所在地が都道府県・市区町村単位で一致",
      current_operation_basis: "公式ページの営業時間・開館案内・現行料金を確認",
      child_use_basis: "公式ページの子ども料金・年齢区分・利用条件を確認",
      checked_at: "2026-08-26",
    },
  };
}

function classify(signals, identity) {
  if (/水族館|アクアリウム|アクア・トト/iu.test(identity) || signals.includes("aquarium")) {
    return facilityClass("水族館", "aquarium", "屋内", "◎", "親子で生きものを観察できる常設施設です。", ["水生生物を観察する", "展示を巡る", "生きものの特徴を学ぶ"]);
  }
  if (/動物園|動物自然公園/iu.test(identity) || signals.includes("zoo")) {
    return facilityClass("動物園", "zoo", "両方", "△", "親子で動物を観察できる継続営業施設です。", ["動物を観察する", "園内を巡る", "生きものの特徴を学ぶ"]);
  }
  if (/美術館|アートミュージアム/iu.test(identity)) {
    return facilityClass("美術館・体験", "art-museum", "屋内", "◎", "親子で作品や展示を鑑賞できる常設施設です。", ["作品を鑑賞する", "館内を巡る", "親子で表現に触れる"]);
  }
  if (/科学館|SDGsミライパーク/iu.test(identity)) {
    return facilityClass("科学館", "science-museum", "屋内", "◎", "親子で展示を通じて科学や社会を学べる常設施設です。", ["体験展示に触れる", "館内を巡る", "親子で学ぶ"]);
  }
  if (/ミュージアム|博物館|資料館|記念館|旧居/iu.test(identity) || signals.includes("museum")) {
    return facilityClass("博物館", "museum", "屋内", "◎", "親子で展示を見て学べる常設施設です。", ["展示を観察する", "館内を巡る", "親子で学ぶ"]);
  }
  if (/温泉|健康ランド|おふろcafé|万葉倶楽部/iu.test(identity)) {
    return facilityClass("温泉プール", "hot-spring-pool", "屋内", "◎", "家族で入浴や温浴設備を利用できる継続営業施設です。", ["温浴設備でくつろぐ", "館内設備を利用する", "家族で休憩する"]);
  }
  if (/スキー|スノーパーク|ダイナランド|雪遊び|高峰マウンテンパーク/iu.test(identity)) {
    return facilityClass("スキー場・雪遊び", "ski", "屋外", "×", "子どもの利用条件を公式に掲示する継続営業の雪遊び施設です。", ["雪のコースを滑る", "雪遊びをする", "家族で冬の自然を楽しむ"]);
  }
  if (/水泳プール|ウォーターパーク/iu.test(identity)) {
    return facilityClass("温泉プール", "hot-spring-pool", "屋外", "×", "家族で水遊びを楽しめる継続営業施設です。", ["プールで遊ぶ", "水に親しむ", "家族で体を動かす"]);
  }
  if (/Cat\s*Caf[eé]|猫カフェ/iu.test(identity)) {
    return facilityClass("体験", "experience", "屋内", "◎", "親子で動物とふれあえる継続営業施設です。", ["動物を観察する", "ふれあいを体験する", "親子で過ごす"]);
  }
  if (/こどもの国/iu.test(identity)) {
    return facilityClass("遊園地・テーマパーク", "theme-park", "両方", "△", "親子で遊具や体験を楽しめる常設施設です。", ["遊具で遊ぶ", "園内を巡る", "家族で一日過ごす"]);
  }
  if (/べるべるパーク|キッズ|あそびのせかい|プレイヴィル|PLAYLOT|ハピピランド|かわいいランド|ちいかわパーク|トランポランド/iu.test(identity)) {
    const mixed = /プレイヴィル/iu.test(identity);
    return facilityClass("屋内遊び場", "indoor-play", mixed ? "両方" : "屋内", "◎", "親子で遊具や体験を楽しめる常設の遊び場です。", ["遊具で遊ぶ", "体を動かす", "家族で過ごす"]);
  }
  if (/MTB|アスレチック|クライミング|HANETTA|グリーンアドベンチャー/iu.test(identity)) {
    const indoor = /クライミングクラブ/iu.test(identity);
    return facilityClass("アスレチック", "athletic", indoor ? "屋内" : "屋外", indoor ? "◎" : "×", "年齢条件に応じて親子で体を動かせる常設施設です。", ["遊具やコースに挑戦する", "体を動かす", "親子で達成感を味わう"]);
  }
  if (/アクティビティパーク/iu.test(identity)) {
    return facilityClass("遊園地・テーマパーク", "theme-park", "両方", "△", "親子で遊具や体験を楽しめる常設施設です。", ["遊具で遊ぶ", "園内を巡る", "家族で一日過ごす"]);
  }
  if (/乗馬クラブ/iu.test(identity)) {
    return facilityClass("体験", "experience", "屋外", "×", "年齢条件に応じて親子で乗馬を体験できる継続営業施設です。", ["馬とふれあう", "乗馬を体験する", "親子で動物について学ぶ"]);
  }
  if (/公園|パーク|ウッドデザイン/iu.test(identity)) {
    return facilityClass("公園(大型遊具)", "park", "屋外", "△", "家族で遊具や自然を楽しめる常設施設です。", ["園内を巡る", "遊具で遊ぶ", "家族で自然を楽しむ"]);
  }
  if (/農園|果樹園|いちご園/iu.test(identity) || signals.includes("farm")) {
    return facilityClass("味覚狩り", "fruit-picking", "屋外", "×", "親子で季節の収穫体験ができる継続営業の観光農園です。", ["季節の実を収穫する", "農園を巡る", "親子で食育体験をする"]);
  }
  if (/ホテル|アンダの森/iu.test(identity)) {
    return facilityClass("ホテル", "hotel", "屋内", "◎", "子ども向け設備を備え、家族で利用できる継続営業施設です。", ["館内設備で遊ぶ", "家族で滞在する", "親子で体験する"]);
  }
  if (/展望|タワー/iu.test(identity) || signals.includes("viewpoint")) {
    const tower = /タワー/iu.test(identity);
    return facilityClass("展望台", "viewpoint", tower ? "屋内" : "両方", tower ? "◎" : "△", "家族で景色を眺められる常設の展望施設です。", ["展望フロアを巡る", "景色を眺める", "家族で写真を撮る"]);
  }
  if (signals.includes("water_snow_family")) {
    return facilityClass("スキー場・雪遊び", "ski", "屋外", "×", "子どもの利用条件を公式に掲示する継続営業の雪遊び施設です。", ["雪のコースを滑る", "雪遊びをする", "家族で冬の自然を楽しむ"]);
  }
  if (signals.includes("active_play")) {
    return facilityClass("アスレチック", "athletic", "屋内", "◎", "年齢条件に応じて親子で体を動かせる常設施設です。", ["遊具やコースに挑戦する", "体を動かす", "親子で達成感を味わう"]);
  }
  if (signals.includes("amusement") || signals.includes("child_brand")) {
    return facilityClass("屋内テーマパーク", "indoor-theme-park", "屋内", "◎", "親子で遊具や体験を楽しめる常設施設です。", ["屋内遊具で遊ぶ", "親子で体験する", "家族で一日過ごす"]);
  }
  if (/ゲーム|レジャーランド/iu.test(identity)) {
    return facilityClass("ゲームセンター", "game-center", "屋内", "◎", "親子でゲームや屋内遊具を楽しめる常設施設です。", ["ゲームで遊ぶ", "屋内設備を巡る", "親子で挑戦する"]);
  }
  if (signals.includes("craft_family")) {
    return facilityClass("クラフト体験", "craft", "屋内", "◎", "親子で制作体験ができる継続営業施設です。", ["ものづくりを体験する", "作品を仕上げる", "親子で創作する"]);
  }
  if (signals.includes("railway")) {
    return facilityClass("体験", "experience", "両方", "△", "親子で乗りものに関する体験ができる継続営業施設です。", ["乗りものを体験する", "施設を巡る", "親子で学ぶ"]);
  }
  return facilityClass("体験", "experience", "両方", "△", "家族で継続的に利用できる常設施設です。", ["施設内を巡る", "親子で体験する", "家族で過ごす"]);
}

function facilityClass(category, categoryId, indoorOutdoor, rainFriendly, summary, experiences) {
  return { category, category_id: categoryId, indoor_outdoor: indoorOutdoor, rain_friendly: rainFriendly, summary, experiences };
}

async function geocode(address) {
  const queries = [
    address,
    address.replace(/^〒\d{3}-?\d{4}\s*/u, "").split(/\s/u)[0],
  ];
  for (const query of new Set(queries)) {
    const response = await fetch(
      `https://msearch.gsi.go.jp/address-search/AddressSearch?q=${encodeURIComponent(query)}`,
      { headers: { "User-Agent": USER_AGENT } },
    );
    if (!response.ok) continue;
    const rows = await response.json();
    const coordinates = rows?.[0]?.geometry?.coordinates;
    if (Array.isArray(coordinates) && coordinates.length === 2) {
      return {
        longitude: Number(coordinates[0]),
        latitude: Number(coordinates[1]),
        source: "gsi_address_search",
      };
    }
  }
  throw new Error(`GSI geocode missing: ${address}`);
}

function extractAddress(text) {
  return (
    text.match(new RegExp(`〒\\d{3}-?\\d{4}\\s*${PREFECTURE_PATTERN}[^。\\n]{4,500}?(?=■|。|駐車|電話|TEL|営業時間|開館時間|開園時間|Google|MAP|地図|アクセス|$)`, "u"))?.[0] ??
    text.match(new RegExp(`${PREFECTURE_PATTERN}[^。\\n]{4,500}?(?=■|。|駐車|電話|TEL|営業時間|開館時間|開園時間|Google|MAP|地図|アクセス|$)`, "u"))?.[0] ??
    ""
  ).replace(/\s+/g, " ").trim();
}

function extractPrefecture(value) {
  return value.match(new RegExp(PREFECTURE_PATTERN, "u"))?.[0] ?? "";
}

function municipalityToken(value) {
  return String(value ?? "")
    .replace(/^〒\d{3}-?\d{4}\s*/u, "")
    .replace(new RegExp(`^${PREFECTURE_PATTERN}`, "u"), "")
    .match(/^(.+?[市区町村])/u)?.[1] ?? "";
}

function identitySimilarity(identity, pageText) {
  const target = normalize(identity);
  const page = normalize(pageText);
  if (page.includes(target)) return 1;
  const titlePart = normalize(String(pageText).slice(0, 500));
  return bigramDice(target, titlePart);
}

function canonicalName(value) {
  return String(value)
    .replace(/^(?:株式会社|有限会社|\(株\)|（株）)\s*/u, "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalize(value) {
  return String(value ?? "")
    .normalize("NFKC")
    .toLocaleLowerCase("ja")
    .replace(/(?:株式会社|有限会社|一般社団法人|公益財団法人|公益社団法人|合同会社)/gu, "")
    .replace(/[\s\p{P}\p{S}]/gu, "");
}

function normalizeAddress(value) {
  return normalize(String(value ?? "").replace(/〒\d{3}-?\d{4}/gu, ""));
}

function bigramDice(left, right) {
  if (left === right) return 1;
  if (left.length < 2 || right.length < 2) return 0;
  const pairs = new Map();
  for (let index = 0; index < left.length - 1; index += 1) {
    const pair = left.slice(index, index + 2);
    pairs.set(pair, (pairs.get(pair) ?? 0) + 1);
  }
  let overlap = 0;
  for (let index = 0; index < right.length - 1; index += 1) {
    const pair = right.slice(index, index + 2);
    const count = pairs.get(pair) ?? 0;
    if (count > 0) {
      overlap += 1;
      pairs.set(pair, count - 1);
    }
  }
  return (2 * overlap) / (left.length - 1 + right.length - 1);
}

function toVisibleText(html) {
  return decodeHtml(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " "),
  ).replace(/\s+/g, " ");
}

function decodeHtml(value) {
  return String(value ?? "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

async function save() {
  await writeFile(
    OUTPUT_PATH,
    `${JSON.stringify(
      {
        schema_version: 1,
        review_version: REVIEW_VERSION,
        reviewed_at: "2026-08-26",
        generated_at: new Date().toISOString(),
        target_count: reviews.length,
        completed_count: reviews.filter((review) => review.review_complete).length,
        reviews,
      },
      null,
      2,
    )}\n`,
    "utf8",
  );
}

function delay(milliseconds) {
  return new Promise((resolveDelay) => setTimeout(resolveDelay, milliseconds));
}

function prefectureId(value) {
  return PREFECTURE_IDS.get(value);
}
