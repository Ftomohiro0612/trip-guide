#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const TEMPORARY_PATTERN =
  /(?:20\d{2}|令和\d+年|期間限定|季節限定|特別展|企画展|巡回展|花火|祭(?:り|典)?|フェス|マルシェ|大会|ライブ|コンサート|公演|試合|観戦|イルミネーション|ライトアップ|海開き|展覧会)/iu;
const NOT_ELIGIBLE_PATTERN =
  /(?:ツアー|ガイド(?:付き)?|街歩き|まち歩き|人力車|観光タクシー|ハイヤー|送迎|バス旅|バスツアー|日帰りバス|クルーズ|遊覧船|フェリー|レンタカー|レンタル|着物|浴衣|Wi-?Fi|SIMカード|荷物預かり|レストラン|ディナー|ランチ|アフタヌーンティー|居酒屋|飲み放題|食べ歩き|料理教室|オンライン体験|写真撮影|フォトプラン|マッサージ|エステ|宿泊|パラセーリング|ダイビング|シュノーケリング|SUP|サップ|カヌー|カヤック|ラフティング|キャニオニング|パラグライダー|サーフィン|ウェイクボード|ジェットスキー|スノーシュー|トレッキング|ハイキング|登山|釣り船|船釣り|バナナボート|フライボード|セグウェイ|公道カート)/iu;
const DIRECT_ADMISSION_PATTERN =
  /(?:Eチケット|eチケット|入場(?:券|チケット|予約)|入館(?:券|チケット|予約)|前売券|フリーパス|パスポート)/u;

function parseArgs(argv) {
  const args = {
    details: "tmp/rakuten-facility-candidate-details-2026-08-25.json",
    preaudit: "tmp/rakuten-facility-discovery-preaudit-2026-08-25.json",
    facilities: "data/facilities_data.json",
    output: "tmp/rakuten-facility-identity-inventory-2026-08-26.json",
  };
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === "--details") args.details = argv[++index];
    else if (argv[index] === "--preaudit") args.preaudit = argv[++index];
    else if (argv[index] === "--facilities") args.facilities = argv[++index];
    else if (argv[index] === "--output") args.output = argv[++index];
    else throw new Error(`Unknown argument: ${argv[index]}`);
  }
  return args;
}

function normalize(value) {
  return String(value ?? "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/(?:株式会社|有限会社|一般社団法人|公益財団法人|公益社団法人|合同会社)/gu, "")
    .replace(/(?:co\.?[, ]*ltd\.?|inc\.?|日本|japan)/giu, "")
    .replace(/[\s\p{P}\p{S}]/gu, "");
}

function japaneseName(value) {
  return String(value ?? "").split(/\s*[/／]\s*/u)[0].trim();
}

function prefectureKey(value) {
  const text = String(value ?? "");
  if (["北海道", "東京", "京都", "大阪"].includes(text)) return text;
  return text.replace(/県$/u, "").replace(/[都府]$/u, "");
}

function canonAliases(name) {
  const aliases = new Set([
    name,
    name.replace(/[（(].*?[）)]/gu, ""),
    name.replace(/^(?:北海道|東京都|京都府|大阪府|.{2,3}県)/u, ""),
  ]);
  return [...aliases].map(normalize).filter((alias) => alias.length >= 4);
}

function bigrams(value, alreadyNormalized = false) {
  const normalized = alreadyNormalized ? value : normalize(value);
  if (normalized.length < 2) return [];
  return Array.from({ length: normalized.length - 1 }, (_, index) => normalized.slice(index, index + 2));
}

function diceCoefficient(left, right, alreadyNormalized = false) {
  const leftPairs = bigrams(left, alreadyNormalized);
  const rightPairs = bigrams(right, alreadyNormalized);
  if (leftPairs.length === 0 || rightPairs.length === 0) return 0;
  const remaining = new Map();
  for (const pair of rightPairs) remaining.set(pair, (remaining.get(pair) ?? 0) + 1);
  let intersection = 0;
  for (const pair of leftPairs) {
    const count = remaining.get(pair) ?? 0;
    if (count > 0) {
      intersection += 1;
      remaining.set(pair, count - 1);
    }
  }
  return (2 * intersection) / (leftPairs.length + rightPairs.length);
}

function stableKey(name, address, prefectures, product) {
  const normalizedName = normalize(name);
  const normalizedAddress = normalize(address);
  if (normalizedAddress) return `${normalizedName}|${normalizedAddress}`;
  return `${normalizedName}|${prefectures.join("/")}|${normalize(product.title)}`;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const [detailData, preaudit, facilityData] = await Promise.all([
    readFile(resolve(args.details), "utf8").then(JSON.parse),
    readFile(resolve(args.preaudit), "utf8").then(JSON.parse),
    readFile(resolve(args.facilities), "utf8").then(JSON.parse),
  ]);
  if (detailData.detail_product_count !== preaudit.candidate_count) {
    throw new Error(
      `Candidate detail coverage is incomplete: ${detailData.detail_product_count}/${preaudit.candidate_count}`,
    );
  }

  const canonByPrefecture = new Map();
  const canonFacilities = [];
  for (const facility of facilityData.facilities) {
    const key = prefectureKey(facility.prefecture);
    const entries = canonByPrefecture.get(key) ?? [];
    entries.push({
      id: facility.id,
      slug: facility.slug,
      name: facility.name,
      aliases: canonAliases(facility.name),
      address: normalize(facility.address),
    });
    canonFacilities.push({
      id: facility.id,
      slug: facility.slug,
      name: facility.name,
      prefecture: facility.prefecture,
      normalized_name: normalize(facility.name),
    });
    canonByPrefecture.set(key, entries);
  }

  const identityMap = new Map();
  for (const product of detailData.products) {
    const prefectures = [...new Set([
      ...(product.prefectures ?? []),
      ...(product.destinations ?? [])
        .filter((destination) => destination.level === 3)
        .map((destination) => prefectureKey(destination.value)),
    ])].filter(Boolean);
    const optionIdentities = (product.options ?? [])
      .map((option) => ({
        name: japaneseName(option.supplier_name || option.host_name),
        address: option.venue_address,
        meeting_point: option.meeting_point,
      }))
      .filter((identity) => identity.name);
    const uniqueOptions = [...new Map(
      optionIdentities.map((identity) => [
        `${normalize(identity.name)}|${normalize(identity.address)}|${normalize(identity.meeting_point)}`,
        identity,
      ]),
    ).values()];
    const identities = uniqueOptions.length > 0
      ? uniqueOptions
      : [{ name: product.title, address: null, meeting_point: null }];

    for (const identity of identities) {
      const key = stableKey(identity.name, identity.address, prefectures, product);
      const row = identityMap.get(key) ?? {
        candidate_id: `rakuten-${createHash("sha256").update(key).digest("hex").slice(0, 12)}`,
        extracted_identity: identity.name,
        venue_address: identity.address,
        meeting_points: [],
        prefectures,
        product_ids: [],
        product_urls: [],
        product_titles: [],
        detail_fetch_errors: [],
      };
      if (identity.meeting_point && !row.meeting_points.includes(identity.meeting_point)) {
        row.meeting_points.push(identity.meeting_point);
      }
      if (!row.product_ids.includes(product.product_id)) {
        row.product_ids.push(product.product_id);
        row.product_urls.push(product.product_url);
        row.product_titles.push(product.title);
      }
      if (product.detail_fetch_error) {
        row.detail_fetch_errors.push({
          product_id: product.product_id,
          status: product.detail_fetch_status,
          error: product.detail_fetch_error,
        });
      }
      identityMap.set(key, row);
    }
  }

  const identities = [...identityMap.values()].map((identity) => {
    const searchTexts = [identity.extracted_identity, ...identity.product_titles].map(normalize);
    const canonMatches = identity.prefectures
      .flatMap((prefecture) => canonByPrefecture.get(prefecture) ?? [])
      .filter((facility) => {
        const nameMatch = facility.aliases.some((alias) =>
          searchTexts.some((text) => text.includes(alias) || (text.length >= 4 && alias.includes(text))),
        );
        const addressMatch = identity.venue_address && facility.address &&
          (normalize(identity.venue_address).includes(facility.address) ||
            facility.address.includes(normalize(identity.venue_address)));
        return nameMatch || addressMatch;
      })
      .map(({ id, slug, name }) => ({ id, slug, name }));

    const combinedTitles = identity.product_titles.join(" / ");
    const normalizedIdentity = normalize(identity.extracted_identity);
    const fuzzyCanonMatches = canonFacilities
      .map((facility) => ({
        ...facility,
        score: diceCoefficient(normalizedIdentity, facility.normalized_name, true),
      }))
      .filter((facility) => facility.score >= 0.45)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map((facility) => ({
        id: facility.id,
        slug: facility.slug,
        name: facility.name,
        prefecture: facility.prefecture,
        score: Number(facility.score.toFixed(3)),
      }));
    let status;
    let reason;
    if (canonMatches.length > 0) {
      status = "DUPLICATE";
      reason = "facility identity matches the existing canon in the same prefecture";
    } else if (TEMPORARY_PATTERN.test(combinedTitles)) {
      status = "NOT_ELIGIBLE";
      reason = "temporary exhibition, event, or seasonal product is not a facility identity";
    } else if (NOT_ELIGIBLE_PATTERN.test(combinedTitles) && !DIRECT_ADMISSION_PATTERN.test(combinedTitles)) {
      status = "NOT_ELIGIBLE";
      reason = "tour, meeting point, rental, transport, food, or activity-only product";
    } else if (identity.detail_fetch_errors.length > 0 || !identity.extracted_identity) {
      status = "EVIDENCE_INSUFFICIENT";
      reason = "Rakuten detail identity evidence could not be retrieved";
    } else {
      status = "REVIEW_REQUIRED";
      reason = "unlisted fixed-venue identity requires FacilityOps eligibility and official-source review";
    }
    return {
      ...identity,
      status,
      reason,
      canon_matches: canonMatches,
      fuzzy_canon_matches: fuzzyCanonMatches,
    };
  });

  identities.sort((a, b) =>
    (a.prefectures[0] ?? "").localeCompare(b.prefectures[0] ?? "", "ja") ||
    a.extracted_identity.localeCompare(b.extracted_identity, "ja"),
  );
  const statusCounts = Object.fromEntries(
    [...new Set(identities.map((identity) => identity.status))]
      .sort()
      .map((status) => [status, identities.filter((identity) => identity.status === status).length]),
  );
  const result = {
    schema_version: 1,
    generated_at: new Date().toISOString(),
    coverage: {
      rakuten_japan_product_count: preaudit.catalog_coverage.fetched_product_count,
      title_duplicate_product_count: preaudit.summary.DUPLICATE,
      title_not_eligible_product_count: preaudit.summary.NOT_ELIGIBLE,
      no_facility_identity_product_count: preaudit.summary.NO_FACILITY_IDENTITY,
      detailed_candidate_product_count: preaudit.candidate_count,
      extracted_identity_count: identities.length,
      status_counts: statusCounts,
    },
    identities,
  };
  await writeFile(resolve(args.output), `${JSON.stringify(result, null, 2)}\n`, "utf8");
  console.log(JSON.stringify({ output: resolve(args.output), ...result.coverage }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
