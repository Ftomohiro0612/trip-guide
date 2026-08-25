#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const GENERIC_NAMES = new Set([
  "公園",
  "自然公園",
  "動物園",
  "水族館",
  "博物館",
  "美術館",
  "科学館",
  "資料館",
  "記念館",
  "農園",
  "果樹園",
  "牧場",
  "遊園地",
  "スキー場",
  "展望台",
  "ロープウェイ",
]);

const TEMPORARY_PATTERN =
  /(?:20\d{2}|令和\d+年|期間限定|季節限定|特別展|企画展|巡回展|花火|祭(?:り|典)?|フェス|マルシェ|大会|ライブ|コンサート|公演|試合|観戦|イルミネーション|ライトアップ|海開き)/iu;
const NON_FACILITY_PATTERN =
  /(?:ツアー|ガイド(?:付き)?|街歩き|まち歩き|散策|人力車|観光タクシー|ハイヤー|貸切|送迎|空港送迎|バス旅|バスツアー|日帰りバス|クルーズ|遊覧船|レンタカー|レンタル(?:着物|浴衣|自転車|バイク|用品|Wi-?Fi)?|着物レンタル|浴衣レンタル|Wi-?Fi|SIMカード|荷物預かり|レストラン|ディナー|ランチ|アフタヌーンティー|居酒屋|飲み放題|食べ歩き|料理教室|オンライン体験|写真撮影|フォトプラン|マッサージ|エステ|宿泊プラン)/iu;
const ACTIVITY_ONLY_PATTERN =
  /(?:ダイビング|シュノーケリング|SUP|サップ|カヌー|カヤック|ラフティング|キャニオニング|パラグライダー|サーフィン|ウェイクボード|ジェットスキー|スノーシュー|トレッキング|ハイキング|登山|釣り船|船釣り|バナナボート|フライボード|セグウェイ|公道カート)/iu;
const DIRECT_ADMISSION_PATTERN =
  /(?:Eチケット|eチケット|入場(?:券|チケット|予約)|入館(?:券|チケット|予約)|前売券|フリーパス|パスポート)/u;
const FACILITY_SIGNAL_PATTERN =
  /(?:テーマパーク|遊園地|動物園|水族館|博物館|美術館|科学館|資料館|記念館|ミュージアム|パーク|ランド|ガーデン|牧場|農園|果樹園|工房|体験館|遊び場|あそび場|アスレチック|キッズ|展望台|タワー|ロープウェイ|ケーブルカー|鉄道|モノレール|ゴンドラ|スキー場|迷路|植物園|庭園|鍾乳洞|洞窟|水族博物館)/iu;
const FAMILY_SIGNAL_PATTERN =
  /(?:子供|子ども|こども|親子|家族|ファミリー|幼児|小学生|[3-9]歳|３歳|４歳|５歳|６歳)/u;

function parseArgs(argv) {
  const args = {
    catalog: "tmp/rakuten-japan-catalog-2026-08-25.json",
    facilities: "data/facilities_data.json",
    output: "tmp/rakuten-facility-discovery-preaudit-2026-08-25.json",
  };
  for (let index = 0; index < argv.length; index += 1) {
    const key = argv[index];
    if (key === "--catalog") args.catalog = argv[++index];
    else if (key === "--facilities") args.facilities = argv[++index];
    else if (key === "--output") args.output = argv[++index];
    else throw new Error(`Unknown argument: ${key}`);
  }
  return args;
}

function normalize(value) {
  return String(value ?? "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/(?:株式会社|有限会社|一般社団法人|公益財団法人|公益社団法人|合同会社)/gu, "")
    .replace(/[\s\p{P}\p{S}]/gu, "");
}

function aliasesFor(name) {
  const aliases = new Set([name]);
  aliases.add(name.replace(/[（(].*?[）)]/gu, ""));
  aliases.add(name.replace(/^[^「『]+[「『](.+?)[」』].*$/u, "$1"));
  return [...aliases]
    .map(normalize)
    .filter((alias) => alias.length >= 3 && !GENERIC_NAMES.has(alias));
}

function prefectureKey(value) {
  const text = String(value ?? "");
  if (["北海道", "東京", "京都", "大阪"].includes(text)) return text;
  return text.replace(/県$/u, "").replace(/[都府]$/u, "");
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const [catalog, facilityData] = await Promise.all([
    readFile(resolve(args.catalog), "utf8").then(JSON.parse),
    readFile(resolve(args.facilities), "utf8").then(JSON.parse),
  ]);

  const canonByPrefecture = new Map();
  for (const facility of facilityData.facilities) {
    const key = prefectureKey(facility.prefecture);
    const entries = canonByPrefecture.get(key) ?? [];
    entries.push({
      id: facility.id,
      slug: facility.slug,
      name: facility.name,
      aliases: aliasesFor(facility.name),
    });
    canonByPrefecture.set(key, entries);
  }

  const rows = catalog.items.map((product) => {
    const titleNormalized = normalize(product.title);
    const prefectures = product.destinations
      .filter((destination) => destination.level === 3)
      .map((destination) => prefectureKey(destination.value));
    const exactMatches = prefectures
      .flatMap((prefecture) => canonByPrefecture.get(prefecture) ?? [])
      .filter((facility) => facility.aliases.some((alias) => titleNormalized.includes(alias)))
      .sort((a, b) => Math.max(...b.aliases.map((alias) => alias.length)) - Math.max(...a.aliases.map((alias) => alias.length)));

    let preliminaryStatus;
    let reason;
    if (exactMatches.length > 0) {
      preliminaryStatus = "DUPLICATE";
      reason = "same-prefecture canon name is contained in the product title";
    } else if (TEMPORARY_PATTERN.test(product.title)) {
      preliminaryStatus = "NOT_ELIGIBLE";
      reason = "temporary event or time-limited product";
    } else if (NON_FACILITY_PATTERN.test(product.title)) {
      preliminaryStatus = "NOT_ELIGIBLE";
      reason = "tour, transport, rental, food, lodging, or service product";
    } else if (ACTIVITY_ONLY_PATTERN.test(product.title) && !DIRECT_ADMISSION_PATTERN.test(product.title)) {
      preliminaryStatus = "NOT_ELIGIBLE";
      reason = "activity product without a fixed family outing facility identity";
    } else if (DIRECT_ADMISSION_PATTERN.test(product.title)) {
      preliminaryStatus = "FACILITY_IDENTITY_CANDIDATE";
      reason = "admission product requires identity extraction";
    } else if (FACILITY_SIGNAL_PATTERN.test(product.title)) {
      preliminaryStatus = "FACILITY_IDENTITY_CANDIDATE";
      reason = "fixed-facility or admission signal requires identity extraction";
    } else if (FAMILY_SIGNAL_PATTERN.test(product.title)) {
      preliminaryStatus = "FACILITY_IDENTITY_CANDIDATE";
      reason = "family-oriented product requires fixed-venue identity extraction";
    } else {
      preliminaryStatus = "NO_FACILITY_IDENTITY";
      reason = "no fixed-facility signal in the product title";
    }

    return {
      product_id: product.id,
      product_url: `https://experiences.travel.rakuten.co.jp/experiences/${product.id}`,
      title: product.title,
      prefectures,
      preliminary_status: preliminaryStatus,
      reason,
      canon_matches: exactMatches.slice(0, 3).map(({ id, slug, name }) => ({ id, slug, name })),
    };
  });

  const summary = Object.fromEntries(
    [...new Set(rows.map((row) => row.preliminary_status))]
      .sort()
      .map((status) => [status, rows.filter((row) => row.preliminary_status === status).length]),
  );
  const candidates = rows.filter((row) => row.preliminary_status === "FACILITY_IDENTITY_CANDIDATE");
  const result = {
    schema_version: 1,
    catalog_coverage: catalog.coverage,
    facility_canon_count: facilityData.facilities.length,
    summary,
    candidate_count: candidates.length,
    candidates,
    all_product_classifications: rows,
  };

  await writeFile(resolve(args.output), `${JSON.stringify(result, null, 2)}\n`, "utf8");
  console.log(JSON.stringify({ output: resolve(args.output), ...summary, candidate_count: candidates.length }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
