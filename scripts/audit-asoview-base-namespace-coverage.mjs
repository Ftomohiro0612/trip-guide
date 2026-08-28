#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const CATALOG = resolve(
  ROOT,
  ".codex/research/asoview-base-namespace-2026-08-28.jsonl",
);
const MANIFEST = resolve(
  ROOT,
  ".codex/research/asoview-base-namespace-manifest-2026-08-28.json",
);
const PRIOR_INVENTORY = resolve(
  ROOT,
  "docs/audits/asoview-facility-candidates-2026-08-26.json",
);
const FACILITIES = resolve(ROOT, "data/facilities_data.json");
const OUTPUT = resolve(
  ROOT,
  "docs/audits/asoview-base-namespace-coverage-2026-08-28.json",
);
const allowIncomplete = process.argv.includes("--allow-incomplete");
const TEMPORARY_PATTERN =
  /(?:20\d{2}|令和\d+年|第[\d０-９]+回|期間限定|特別展|企画展|巡回展|展覧会|展(?:\d|\s|[（(～〜―「『」』）)]|$)|XRジャーニー|花火|祭(?:り|典)?|フェス|マルシェ|大会|ライブ|コンサート|公演|ショー|試合|観戦|運動会|イルミネーション|ポップアップ|夏休み|冬休み|ハロウィン|クリスマス|コラボ|会場|in\s|＠|@)/iu;
const SERVICE_PATTERN =
  /(?:株式会社$|アウトレットパーク|ショッピングモール|ららぽーと|ホテル|レストラン|ダイニング|宿泊|ツアー|レンタル|バスセット|電車セット|乗車券|連絡協議会|研究会|プログラム|プロジェクト|CARステイ|BBQパーク|\s×\s)/iu;
const ACTIVITY_SERVICE_PATTERN =
  /(?:ツアー|ガイド|ダイビング|シュノーケ|SUP|サップ|カヌー|カヤック|ラフティング|パラグライダー|サーフィン|釣り|レンタル|スクール|アドベンチャーズ|サービス|サポート|クルーズ|ホエールウォッチング)/iu;
const FIXED_VENUE_PATTERN =
  /(?:水族館|動物園|遊園地|テーマパーク|ミュージアム|博物館|科学館|美術館|資料館|記念館|パーク|公園|ランド|牧場|農園|果樹園|いちご園|アスレチック|クライミングジム|ボルダリングジム|トランポリン|工房|陶芸|展望|タワー|スキー場|フォレストアドベンチャー|乗馬クラブ|プレイ(?:パーク|ランド))/iu;
const CLOSED_PATTERN = /^【終了】|閉館|閉園|閉店|営業終了|施設廃止/u;

const [catalogRaw, manifest, priorInventory, facilityData] = await Promise.all([
  readFile(CATALOG, "utf8"),
  readFile(MANIFEST, "utf8").then(JSON.parse),
  readFile(PRIOR_INVENTORY, "utf8").then(JSON.parse),
  readFile(FACILITIES, "utf8").then(JSON.parse),
]);

const latestTerminalById = new Map();
for (const line of catalogRaw.split("\n")) {
  if (!line) continue;
  try {
    const record = JSON.parse(line);
    if (record.terminal) latestTerminalById.set(record.id, record);
  } catch {
    // A partially written final line is not a completed namespace result.
  }
}
const offSitemapResults = [...latestTerminalById.values()].filter(
  (record) => !record.in_base_sitemap,
);
const scanComplete =
  offSitemapResults.length === manifest.off_sitemap_scan_target_id_count;
if (!scanComplete && !allowIncomplete) {
  throw new Error(
    `namespace scan incomplete: expected_off_sitemap=${manifest.off_sitemap_scan_target_id_count} terminal_off_sitemap=${offSitemapResults.length}`,
  );
}

const publicPages = offSitemapResults.filter((record) => record.public_page);
const identities = new Map();
for (const page of publicPages) {
  const identity = extractProviderIdentity(page.title);
  const normalizedIdentity = normalizeIdentity(identity);
  if (normalizedIdentity.length < 3) continue;
  const entry = identities.get(normalizedIdentity) ?? {
    asoview_identity: identity,
    normalized_identity: normalizedIdentity,
    pages: [],
  };
  entry.pages.push(page);
  identities.set(normalizedIdentity, entry);
}

const priorIdentities = new Set(
  priorInventory.reverse_discovery_prefilter.map(
    (identity) => identity.normalized_identity,
  ),
);
const canon = facilityData.facilities.map((facility) => ({
  facility,
  normalized: normalizeIdentity(facility.name),
}));

const identityRows = [...identities.values()]
  .map((identity) => {
    const familySignals = familyRelevance(identity);
    const priorLedgerReached = priorIdentities.has(identity.normalized_identity);
    const canonMatches = canon
      .filter(
        ({ normalized }) =>
          normalized === identity.normalized_identity ||
          (normalized.length >= 5 &&
            (normalized.includes(identity.normalized_identity) ||
              identity.normalized_identity.includes(normalized))),
      )
      .map(({ facility, normalized }) => ({
        facility_id: facility.id,
        facility_slug: facility.slug,
        facility_name: facility.name,
        prefecture: facility.prefecture,
        basis:
          normalized === identity.normalized_identity
            ? "normalized_exact"
            : "normalized_contains",
      }));
    const exactCanonMatch = canonMatches.find(
      (match) => match.basis === "normalized_exact",
    );
    const preliminaryFacilityOps = classifyPreliminaryFacilityOps(
      identity.asoview_identity,
      exactCanonMatch,
    );
    return {
      asoview_identity: identity.asoview_identity,
      normalized_identity: identity.normalized_identity,
      family_relevance: familySignals,
      prior_ledger_reached: priorLedgerReached,
      coverage_disposition: priorLedgerReached
        ? "PRIOR_LEDGER_REACHED"
        : familySignals.length > 0
          ? preliminaryFacilityOps.status
          : "NO_FAMILY_FACILITY_SIGNAL",
      preliminary_facilityops_reason:
        familySignals.length > 0 && !priorLedgerReached
          ? preliminaryFacilityOps.reason
          : undefined,
      sitemap_page_count: identity.pages.filter((page) => page.in_base_sitemap)
        .length,
      off_sitemap_page_count: identity.pages.filter(
        (page) => !page.in_base_sitemap,
      ).length,
      asoview_pages: identity.pages.map((page) => ({
        id: page.id,
        url: page.canonical_url || page.url,
        in_base_sitemap: page.in_base_sitemap,
        title: page.title,
        description: page.description,
        robots: page.robots,
        fetched_at: page.fetched_at,
      })),
      canon_matches: canonMatches,
    };
  })
  .sort((left, right) =>
    left.asoview_identity.localeCompare(right.asoview_identity, "ja"),
  );

const facilityOpsReview = identityRows.filter(
  (identity) =>
    identity.coverage_disposition === "OFFICIAL_REVIEW_REQUIRED",
);
const recoveredFamilyCandidates = identityRows.filter(
  (identity) =>
    !identity.prior_ledger_reached && identity.family_relevance.length > 0,
);
const nagashima = identityRows.find(
  (identity) => identity.normalized_identity === normalizeIdentity("ナガシマスパーランド"),
);
if (
  scanComplete &&
  (!nagashima ||
    nagashima.coverage_disposition !== "DUPLICATE" ||
    !nagashima.canon_matches.some((match) => match.facility_id === 7510))
) {
  throw new Error("base/155456 coverage regression: Nagashima miss was not recovered");
}

const output = {
  schema_version: 1,
  audited_at: "2026-08-28",
  cause:
    "The prior reverse-discovery universe was limited to three Asoview sitemaps. Public, indexable base pages omitted from sitemap_3_base never reached identity extraction, family relevance, or FacilityOps adjudication.",
  source_manifest: manifest,
  prior_ledger: {
    path: "docs/audits/asoview-facility-candidates-2026-08-26.json",
    prefilter_identity_count:
      priorInventory.reconciliation.reverse_discovery_prefilter_identity_count,
  },
  coverage: {
    scan_complete: scanComplete,
    namespace_id_count: manifest.namespace_id_count,
    sitemap_covered_id_count: manifest.sitemap_covered_id_count,
    off_sitemap_scan_target_id_count:
      manifest.off_sitemap_scan_target_id_count,
    off_sitemap_terminal_result_count: offSitemapResults.length,
    public_base_page_off_sitemap_count: publicPages.length,
    extracted_identity_count: identityRows.length,
    prior_ledger_reached_identity_count: identityRows.filter(
      (identity) => identity.prior_ledger_reached,
    ).length,
    newly_recovered_identity_count: identityRows.filter(
      (identity) => !identity.prior_ledger_reached,
    ).length,
    facilityops_review_required_count: facilityOpsReview.length,
    recovered_family_candidate_count: recoveredFamilyCandidates.length,
    preliminary_duplicate_count: recoveredFamilyCandidates.filter(
      (identity) => identity.coverage_disposition === "DUPLICATE",
    ).length,
    preliminary_not_eligible_count: recoveredFamilyCandidates.filter(
      (identity) => identity.coverage_disposition === "NOT_ELIGIBLE",
    ).length,
    no_family_facility_signal_count: identityRows.filter(
      (identity) =>
        identity.coverage_disposition === "NO_FAMILY_FACILITY_SIGNAL",
    ).length,
  },
  recovered_family_candidates: recoveredFamilyCandidates,
  facilityops_review_candidates: facilityOpsReview,
  identities: identityRows,
};

await writeFile(OUTPUT, `${JSON.stringify(output, null, 2)}\n`, "utf8");
console.log(JSON.stringify(output.coverage, null, 2));
console.log(`wrote ${OUTPUT}`);

function extractProviderIdentity(title) {
  return String(title ?? "")
    .replace(/^【[^】]*(?:割引|OFF)[^】]*】\s*/iu, "")
    .replace(/【アソビュー！?】$/u, "")
    .replace(/のネット予約・口コミ・クーポン情報\s*-\s*アソビュー！?$/u, "")
    .replace(/の前売りチケット・割引情報\s*-\s*アソビュー！?$/u, "")
    .replace(/のリフト券$/u, "")
    .replace(/\s*[|｜]\s*(?:ネット予約なら|割引チケット・クーポンなら)?アソビュー！?$/u, "")
    .trim();
}

function normalizeIdentity(value) {
  return String(value ?? "")
    .normalize("NFKC")
    .toLocaleLowerCase("ja")
    .replace(/&(?:amp|quot|#39);/gu, "")
    .replace(/[\s\u3000・･·\/／\\|｜:：,，.。\-‐‑–—―_()（）\[\]【】「」『』!！?？'"`®™]/gu, "")
    .replace(/アソビュー!?$/u, "")
    .trim();
}

function familyRelevance(identity) {
  const identityText = identity.asoview_identity;
  const pageText = identity.pages
    .map((page) => `${page.title} ${page.description}`)
    .join(" ");
  const familyAudience = /0歳|１歳|1歳|幼児|小学生|親子|ファミリー|お子様/u.test(
    `${identityText} ${pageText}`,
  );
  const signals = [
    ["aquarium", /水族館/u],
    ["zoo", /動物園|サファリ|アニマル/u],
    ["amusement", /遊園地|テーマパーク|レジャーランド/u],
    ["child_brand", /キッズ|こども|子ども|子供|ジュニア/u],
    ["museum", /ミュージアム|博物館|科学館|美術館|資料館|記念館/u],
    ["railway", /鉄道/u],
    ["park", /パーク|公園|(?<!ポー)(?<!グ)(?<!ラ・ラ・)ランド/u],
    ["farm", /牧場|農園|果樹園|いちご/u],
    [
      "active_play",
      /アスレチック|ボルダリング|クライミング|トランポリン|プレイ(?:パーク|ランド)|アドベンチャー|忍者/u,
    ],
    ["viewpoint", /展望|タワー/u],
  ];
  const matches = signals
    .filter(([, pattern]) => pattern.test(identityText))
    .map(([label]) => label);
  if (familyAudience && /プール|スキー|スノー/u.test(identityText)) {
    matches.push("water_snow_family");
  }
  if (
    familyAudience &&
    /工房|陶芸|ガラス|とんぼ玉|ものづくり/u.test(identityText)
  ) {
    matches.push("craft_family");
  }
  if (
    familyAudience &&
    /ふれあい|猫カフェ|ねこカフェ|ドッグカフェ/u.test(identityText)
  ) {
    matches.push("animal_contact_family");
  }
  return matches;
}

function classifyPreliminaryFacilityOps(identity, exactCanonMatch) {
  if (exactCanonMatch) {
    return {
      status: "DUPLICATE",
      reason: `normalized exact identity resolves to current canon facility ${exactCanonMatch.facility_id}`,
    };
  }
  if (CLOSED_PATTERN.test(identity)) {
    return {
      status: "NOT_ELIGIBLE",
      reason: "Asoview identity explicitly marks the facility as closed or ended",
    };
  }
  if (TEMPORARY_PATTERN.test(identity)) {
    return {
      status: "NOT_ELIGIBLE",
      reason: "temporary exhibition, event, performance, or campaign identity is not a permanent facility",
    };
  }
  if (SERVICE_PATTERN.test(identity)) {
    return {
      status: "NOT_ELIGIBLE",
      reason: "hotel, restaurant, bundled service, program, or non-independent operating identity is not a FacilityOps facility",
    };
  }
  if (
    ACTIVITY_SERVICE_PATTERN.test(identity) &&
    !FIXED_VENUE_PATTERN.test(identity)
  ) {
    return {
      status: "NOT_ELIGIBLE",
      reason: "activity-only tour, guide, rental, or service identity does not establish an independent permanent facility",
    };
  }
  return {
    status: "OFFICIAL_REVIEW_REQUIRED",
    reason: "official primary identity, address, current operation, and permanent eligibility require FacilityOps review",
  };
}
