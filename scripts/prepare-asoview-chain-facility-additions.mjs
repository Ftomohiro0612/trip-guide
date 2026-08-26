import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const LEDGER_PATH = resolve(
  ROOT,
  "docs/audits/asoview-reverse-discovery-candidates-2026-08-26.json",
);
const OUTPUT_PATH = resolve(
  ROOT,
  "scripts/data/asoview-reverse-discovery-chain-additions-2026-08-26.json",
);
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/140 Safari/537.36 MemoripFacilityOpsOfficialEvidence/1.0";

const CHAINS = [
  {
    id: "kidslandus",
    identity: /キッズ(?:ユーエス)?ランド|キッズランドUS|キッズランドＵＳ/iu,
    root: "https://kidslandus.com/",
    link: /^https:\/\/kidslandus\.com\/shop\/[a-z0-9-]+\/$/u,
    category: "屋内遊び場",
    category_id: "indoor-play",
    target_age: "0歳～小学生と家族",
    adult_fee: "有料（店舗別料金）",
    child_fee: "0歳無料・1歳以上有料（店舗別料金）",
  },
  {
    id: "thekids",
    identity: /(?:ザキッズ|The\s*Kids)/iu,
    root: "https://thekids.co.jp/",
    link: /^https:\/\/thekids\.co\.jp\/shop\/[a-z0-9-]+\/$/u,
    category: "屋内遊び場",
    category_id: "indoor-play",
    target_age: "0歳～小学生と家族",
    adult_fee: "有料（店舗別料金）",
    child_fee: "0歳から利用可・有料（店舗別料金）",
  },
  {
    id: "ninjapark",
    identity: /ニンジャ.?パーク/iu,
    root: "https://ninjapark.net/",
    link: /^https:\/\/ninjapark\.net\/[a-z0-9-]+\/$/u,
    category: "屋内遊び場",
    category_id: "indoor-play",
    target_age: "幼児～小学生と家族",
    adult_fee: "有料（店舗別料金）",
    child_fee: "子ども有料（店舗別料金・利用条件あり）",
  },
  {
    id: "fantasykidsresort",
    identity: /ファンタジーキッズリゾート/iu,
    root: "https://fantasyresort.jp/",
    link: /^https:\/\/fantasyresort\.jp\/[a-z0-9-]+\/$/u,
    category: "屋内遊び場",
    category_id: "indoor-play",
    target_age: "0歳～小学生と家族",
    adult_fee: "有料（店舗別料金）",
    child_fee: "0歳無料・1歳以上有料（店舗別料金）",
  },
];

async function main() {
const ledger = JSON.parse(await readFile(LEDGER_PATH, "utf8"));
const reviewRequired = ledger.identities.filter(
  (identity) => identity.status === "OFFICIAL_REVIEW_REQUIRED",
);
const additions = [];
const evidence = [];

for (const chain of CHAINS) {
  const candidates = reviewRequired.filter((candidate) =>
    chain.identity.test(candidate.asoview_identity),
  );
  if (candidates.length === 0) continue;

  const rootHtml = await fetchHtml(chain.root);
  const extractedLinks = [...extractLinks(rootHtml, chain.root)];
  const officialLinks = extractedLinks.filter((url) =>
    chain.link.test(url),
  );
  console.log(
    `chain=${chain.id} candidates=${candidates.length} official_pages=${officialLinks.length}`,
  );
  const pages = [];
  for (const url of officialLinks) {
    await delay(250);
    try {
      const html = await fetchHtml(url);
      const visibleText = toVisibleText(html);
      const title = decodeHtml(
        html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "",
      );
      const heading = toVisibleText(
        html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[0] ?? "",
      );
      pages.push({
        url,
        title,
        visibleText,
        normalized: normalizeStoreIdentity(`${title} ${heading}`),
      });
    } catch (error) {
      evidence.push({
        chain: chain.id,
        official_url: url,
        status: "OFFICIAL_PAGE_UNAVAILABLE",
        reason: error instanceof Error ? error.message : String(error),
      });
    }
  }

  for (const candidate of candidates) {
    const target = normalizeStoreIdentity(candidate.asoview_identity);
    const ranked = pages
      .map((page) => ({
        ...page,
        score: storeMatchScore(target, page.normalized),
      }))
      .sort((left, right) => right.score - left.score);
    const match = ranked[0];
    const officialAddress = extractAddress(match?.visibleText ?? "");
    const prefecture = extractPrefecture(officialAddress);
    const asoviewAddress = candidate.asoview_detail.address;
    const locationMatched =
      prefecture &&
      prefecture === candidate.asoview_detail.prefecture &&
      municipalityToken(officialAddress) === municipalityToken(asoviewAddress);
    const currentOperationMatched = /営業時間|営業日|最終受付/u.test(
      match?.visibleText ?? "",
    );
    const childUseMatched = /0歳|１歳|1歳|子ども|子供|お子様|小学生|親子/u.test(
      `${rootHtml} ${match?.visibleText ?? ""}`,
    );
    const accepted =
      match?.score >= 0.72 &&
      officialAddress &&
      locationMatched &&
      currentOperationMatched &&
      childUseMatched;

    const record = {
      asoview_identity: candidate.asoview_identity,
      chain: chain.id,
      status: accepted ? "OFFICIAL_EVIDENCE_CONFIRMED" : "OFFICIAL_EVIDENCE_INSUFFICIENT",
      official_url: match?.url ?? "",
      official_title: match?.title ?? "",
      official_address: officialAddress,
      asoview_address: asoviewAddress,
      identity_score: match?.score ?? 0,
      location_matched: Boolean(locationMatched),
      current_operation_matched: currentOperationMatched,
      child_use_matched: childUseMatched,
    };
    evidence.push(record);
    if (!accepted) continue;

    const coordinates = await geocode(officialAddress);
    additions.push({
      asoview_identity: candidate.asoview_identity,
      name: canonicalFacilityName(candidate.asoview_identity),
      prefecture,
      prefecture_id: PREFECTURE_IDS.get(prefecture),
      category: chain.category,
      category_id: chain.category_id,
      address: officialAddress.replace(/^〒\d{3}-?\d{4}\s*/u, ""),
      latitude: coordinates.latitude,
      longitude: coordinates.longitude,
      geocode_source: coordinates.source,
      url: match.url,
      adult_fee: chain.adult_fee,
      child_fee: chain.child_fee,
      target_age: chain.target_age,
      summary:
        "運営公式の現行店舗ページで営業を確認できる、親子向けの常設屋内遊び場です。",
      experiences: [
        "屋内遊具で体を動かす",
        "親子で遊ぶ",
        "天候を気にせず過ごす",
      ],
      source_evidence: {
        official_store_url: match.url,
        official_chain_url: chain.root,
        identity_basis: "公式店舗名とアソビュー施設identityが一致",
        address_basis: "公式店舗ページの住所とアソビュー掲載所在地が市区町村単位で一致",
        current_operation_basis: "公式現行店舗一覧への掲載と店舗ページの営業時間を確認",
        child_use_basis: "運営公式の利用案内で子どもの対象年齢または利用料金を確認",
        checked_at: "2026-08-26",
      },
    });
  }
}

if (additions.some((addition) => !addition.prefecture_id)) {
  throw new Error(
    `unknown prefecture in official chain additions: ${additions
      .filter((addition) => !addition.prefecture_id)
      .map((addition) => `${addition.name} => ${addition.prefecture} / ${addition.address}`)
      .join(" | ")}`,
  );
}
if (new Set(additions.map((addition) => normalize(addition.name))).size !== additions.length) {
  throw new Error("duplicate official chain addition name");
}

await writeFile(
  OUTPUT_PATH,
  `${JSON.stringify(
    {
      schema_version: 1,
      generated_at: new Date().toISOString(),
      additions,
      evidence,
    },
    null,
    2,
  )}\n`,
  "utf8",
);
console.log(
  `official chain review=${evidence.length} additions=${additions.length} -> ${OUTPUT_PATH}`,
);
}

async function fetchHtml(url) {
  const response = await fetch(url, {
    redirect: "follow",
    headers: {
      Accept: "text/html,application/xhtml+xml",
      "User-Agent": USER_AGENT,
    },
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}: ${url}`);
  return response.text();
}

function extractLinks(html, base) {
  const links = new Set();
  for (const match of html.matchAll(/href=["']([^"'#]+)["']/gi)) {
    try {
      const url = new URL(decodeHtml(match[1]), base);
      url.search = "";
      url.hash = "";
      links.add(url.href);
    } catch {
      // Ignore non-URL href values.
    }
  }
  return links;
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

function extractAddress(text) {
  return (
    text.match(new RegExp(`〒\\d{3}-?\\d{4}\\s*${PREFECTURE_PATTERN}[^。\\n]{4,500}?(?=■|。|駐車|電話|TEL|営業時間|Google|MAP|地図|アクセス|$)`, "u"))?.[0] ??
    text.match(new RegExp(`${PREFECTURE_PATTERN}[^。\\n]{4,500}?(?=■|。|駐車|電話|TEL|営業時間|Google|MAP|地図|アクセス|$)`, "u"))?.[0] ??
    ""
  ).replace(/\s+/g, " ").trim();
}

function extractPrefecture(value) {
  return value.match(new RegExp(PREFECTURE_PATTERN, "u"))?.[0] ?? "";
}

function municipalityToken(value) {
  return String(value)
    .replace(/^〒\d{3}-?\d{4}\s*/u, "")
    .replace(new RegExp(`^${PREFECTURE_PATTERN}`, "u"), "")
    .match(/^(.+?[市区町村])/u)?.[1] ?? "";
}

function normalize(value) {
  return String(value ?? "")
    .normalize("NFKC")
    .toLocaleLowerCase("ja")
    .replace(/[\s\p{P}\p{S}]/gu, "");
}

function normalizeStoreIdentity(value) {
  return normalize(value)
    .replace(/(?:キッズユーエスランド|キッズランドus|thekids|ザキッズ)/gu, "")
    .replace(/ニンジャパーク|premiumschool/gu, "")
    .replace(/ファンタジーキッズリゾート/gu, "")
    .replace(/めっちゃ楽しい|室内遊園地|子供の室内遊び場|公式/gu, "")
    .replace(/店$/u, "");
}

function storeMatchScore(target, page) {
  if (!target || !page) return 0;
  if (page.includes(target) || target.includes(page.slice(0, Math.min(page.length, target.length)))) {
    return 1;
  }
  return bigramDice(target, page.slice(0, Math.max(target.length * 2, 40)));
}

function bigramDice(left, right) {
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

function canonicalFacilityName(value) {
  return value
    .replace(/^キッズユーエスランド/u, "キッズランドUS")
    .replace(/^The\s*Kids/iu, "ザキッズ")
    .replace(/\s+/g, " ")
    .trim();
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

function delay(milliseconds) {
  return new Promise((resolveDelay) => setTimeout(resolveDelay, milliseconds));
}

const PREFECTURE_IDS = new Map([
  ["北海道", "hokkaido"], ["青森県", "aomori"], ["岩手県", "iwate"], ["宮城県", "miyagi"], ["秋田県", "akita"], ["山形県", "yamagata"], ["福島県", "fukushima"],
  ["茨城県", "ibaraki"], ["栃木県", "tochigi"], ["群馬県", "gunma"], ["埼玉県", "saitama"], ["千葉県", "chiba"], ["東京都", "tokyo"], ["神奈川県", "kanagawa"],
  ["新潟県", "niigata"], ["富山県", "toyama"], ["石川県", "ishikawa"], ["福井県", "fukui"], ["山梨県", "yamanashi"], ["長野県", "nagano"],
  ["岐阜県", "gifu"], ["静岡県", "shizuoka"], ["愛知県", "aichi"], ["三重県", "mie"], ["滋賀県", "shiga"], ["京都府", "kyoto"], ["大阪府", "osaka"], ["兵庫県", "hyogo"], ["奈良県", "nara"], ["和歌山県", "wakayama"],
  ["鳥取県", "tottori"], ["島根県", "shimane"], ["岡山県", "okayama"], ["広島県", "hiroshima"], ["山口県", "yamaguchi"], ["徳島県", "tokushima"], ["香川県", "kagawa"], ["愛媛県", "ehime"], ["高知県", "kochi"],
  ["福岡県", "fukuoka"], ["佐賀県", "saga"], ["長崎県", "nagasaki"], ["熊本県", "kumamoto"], ["大分県", "oita"], ["宮崎県", "miyazaki"], ["鹿児島県", "kagoshima"], ["沖縄県", "okinawa"],
]);
const PREFECTURE_PATTERN = `(?:${[...PREFECTURE_IDS.keys()].join("|")})`;

await main();
