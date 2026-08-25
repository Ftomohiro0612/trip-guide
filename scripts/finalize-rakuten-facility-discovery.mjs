#!/usr/bin/env node

import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const paths = {
  additions: resolve(root, "scripts/data/rakuten-facility-discovery-additions-2026-08-26.json"),
  inventory: resolve(root, "tmp/rakuten-facility-identity-inventory-2026-08-26.json"),
  preaudit: resolve(root, "tmp/rakuten-facility-discovery-preaudit-2026-08-25.json"),
  catalog: resolve(root, "tmp/rakuten-japan-catalog-2026-08-25.json"),
  facilities: resolve(root, "data/facilities_data.json"),
  actions: resolve(root, "data/rakuten_facility_actions.json"),
  finalInventory: resolve(root, "docs/audits/rakuten-facility-discovery-candidates-2026-08-26.json"),
  report: resolve(root, "docs/audits/rakuten-facility-discovery-audit-2026-08-26.md"),
};

const TEMPORARY_PATTERN =
  /(?:20\d{2}|令和\d+年|期間限定|季節限定|特別展|企画展|巡回展|花火|祭(?:り|典)?|フェス|マルシェ|大会|ライブ|コンサート|公演|試合|観戦|イルミネーション|ライトアップ|展覧会|ミュージカル)/iu;
const SERVICE_PATTERN =
  /(?:ツアー|ガイド(?:付き)?|街歩き|人力車|観光タクシー|ハイヤー|送迎|バス旅|バスツアー|クルーズ|遊覧船|フェリー|レンタカー|レンタル|着物|浴衣|Wi-?Fi|SIMカード|荷物預かり|レストラン|ディナー|ランチ|飲み放題|食べ歩き|料理教室|写真撮影|フォトプラン|マッサージ|エステ|宿泊|パラセーリング|ダイビング|シュノーケリング|シュノーケル|SUP|サップ|カヌー|カヤック|ラフティング|キャニオニング|パラグライダー|サーフィン|ウェイクボード|ジェットスキー|スノーシュー|トレッキング|ハイキング|登山|釣り船|船釣り|バナナボート|フライボード|ホエールウォッチング|資格認定|講習)/iu;
const DIRECT_ADMISSION_PATTERN =
  /(?:Eチケット|eチケット|入場(?:券|チケット|予約)|入館(?:券|チケット|予約)|前売券|フリーパス|パスポート)/u;

function normalize(value) {
  return String(value ?? "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/(?:株式会社|有限会社|一般社団法人|公益財団法人|公益社団法人|合同会社)/gu, "")
    .replace(/[\s\p{P}\p{S}]/gu, "");
}

function sourceNote(entry) {
  const coordinateNote = entry.geocode_source === "official_access_map"
    ? "座標は公式アクセスマップ上の乗車駅位置を採用。"
    : "座標は国土地理院住所検索を採用。";
  return `運営公式で正式名称、所在地、現行の営業時間または運行、子どもを含む利用料金を確認。${coordinateNote}`;
}

function buildFacility(entry, id) {
  const indoorOutdoor = entry.indoor_outdoor ?? "屋内";
  const rainFriendly = entry.rain_friendly ?? "◎";
  const experienceTags = entry.experiences.map((value) => value.replace(/する$/u, ""));
  return {
    id,
    slug: `facility-${id}`,
    name: entry.name,
    prefecture: entry.prefecture,
    prefecture_id: entry.prefecture_id,
    category: entry.category,
    category_id: entry.category_id,
    address: entry.address,
    indoor_outdoor: indoorOutdoor,
    rain_friendly: rainFriendly,
    is_free: false,
    fee_type: "有料",
    adult_fee: entry.adult_fee,
    child_fee: entry.child_fee,
    description: `${entry.name}は、${entry.summary} 公式情報に基づき、所在地、営業実態、子どもを含む利用条件を確認しています。`,
    target_age: entry.target_age,
    url: entry.url,
    tags: ["有料", indoorOutdoor === "屋内" ? "完全屋内" : indoorOutdoor === "両方" ? "屋内外両方" : "屋外"],
    latitude: entry.latitude,
    longitude: entry.longitude,
    geocode_source: entry.geocode_source ?? "gsi_address_search",
    signature_experiences: entry.experiences,
    unique_selling_point: entry.summary,
    experience_tags: experienceTags,
    summer_water_play: entry.category_id === "hot-spring-pool" ? "○" : "×",
    recommended_for_tags: [
      entry.category_id === "aquarium" || entry.category_id === "zoo" ? "animal" :
        entry.category_id === "museum" ? "exhibition" :
          entry.category_id === "scenic" || entry.category_id === "viewpoint" ? "nature" : "athletic",
      "experience",
    ],
    things_to_do: entry.experiences,
    source_urls: entry.url,
    source_notes: sourceNote(entry),
    image: null,
    image_attribution: null,
    image_source: null,
    source_checked_at: "2026-08-26",
    data_quality_status: "confirmed",
  };
}

function updateMetadata(facilityData, additions) {
  facilityData.metadata.total_facilities = facilityData.facilities.length;
  for (const entry of additions) {
    const prefecture = facilityData.metadata.prefectures.find((item) => item.id === entry.prefecture_id);
    if (!prefecture) throw new Error(`Unknown prefecture metadata: ${entry.prefecture_id}`);
    prefecture.count += 1;
    const category = facilityData.metadata.categories.find((item) => item.id === entry.category_id);
    if (!category) throw new Error(`Unknown category metadata: ${entry.category_id}`);
    category.count += 1;
  }
}

function globalCanonMatches(identity, facilities) {
  const texts = [identity.extracted_identity, ...identity.product_titles].map(normalize);
  return facilities
    .filter((facility) => {
      const name = normalize(facility.name);
      return name.length >= 5 && texts.some((text) => text.includes(name));
    })
    .slice(0, 5)
    .map(({ id, slug, name }) => ({ id, slug, name }));
}

async function main() {
  const [additions, inventory, preaudit, catalog, facilityData, actions] = await Promise.all([
    readFile(paths.additions, "utf8").then(JSON.parse),
    readFile(paths.inventory, "utf8").then(JSON.parse),
    readFile(paths.preaudit, "utf8").then(JSON.parse),
    readFile(paths.catalog, "utf8").then(JSON.parse),
    readFile(paths.facilities, "utf8").then(JSON.parse),
    readFile(paths.actions, "utf8").then(JSON.parse),
  ]);

  if (catalog.coverage.fetched_product_count !== 17262 || catalog.coverage.unique_product_count !== 17262) {
    throw new Error("Rakuten Japan catalog coverage is not complete");
  }
  if (inventory.identities.length !== 846 || preaudit.candidate_count !== 1007) {
    throw new Error("Candidate extraction coverage changed unexpectedly");
  }

  const existingFacilities = [...facilityData.facilities];
  const existingNames = new Set(existingFacilities.map((facility) => normalize(facility.name)));
  const existingAddresses = new Map(existingFacilities.map((facility) => [normalize(facility.address), facility]));
  const additionByCandidate = new Map(additions.map((entry) => [entry.candidate_id, entry]));
  if (additionByCandidate.size !== additions.length) throw new Error("Duplicate ADD candidate id");
  for (const entry of additions) {
    if (existingNames.has(normalize(entry.name))) throw new Error(`ADD name already in canon: ${entry.name}`);
    const addressMatch = existingAddresses.get(normalize(entry.address));
    if (addressMatch) throw new Error(`ADD address already in canon: ${entry.name} -> ${addressMatch.name}`);
    if (!inventory.identities.some((identity) => identity.candidate_id === entry.candidate_id)) {
      throw new Error(`Unknown candidate id: ${entry.candidate_id}`);
    }
  }

  let nextId = Math.max(...existingFacilities.map((facility) => facility.id)) + 1;
  const addedFacilities = additions.map((entry) => buildFacility(entry, nextId++));
  facilityData.facilities.push(...addedFacilities);
  updateMetadata(facilityData, additions);
  await writeFile(paths.facilities, `${JSON.stringify(facilityData, null, 2)}\n`, "utf8");

  const facilityByCandidate = new Map(
    additions.map((entry, index) => [entry.candidate_id, addedFacilities[index]]),
  );
  const finalIdentities = inventory.identities.map((identity) => {
    const added = facilityByCandidate.get(identity.candidate_id);
    if (added) {
      return {
        ...identity,
        status: "ADD",
        reason: "FacilityOps eligibility and official primary identity, address, fees, and operating evidence confirmed",
        added_facility: { id: added.id, slug: added.slug, name: added.name },
      };
    }

    const combinedTitles = identity.product_titles.join(" / ");
    const canonMatches = [
      ...(identity.canon_matches ?? []),
      ...globalCanonMatches(identity, existingFacilities),
    ].filter((match, index, matches) => matches.findIndex((other) => other.id === match.id) === index);
    const manualDuplicate = identity.candidate_id === "rakuten-a738149d0c07"
      ? [{ id: 6015, slug: "facility-6015", name: "JUNGLIA OKINAWA" }]
      : [];
    const allCanonMatches = [...canonMatches, ...manualDuplicate];
    if (allCanonMatches.length > 0) {
      return {
        ...identity,
        status: "DUPLICATE",
        reason: "Rakuten identity or product title resolves to an existing facility canon entry",
        canon_matches: allCanonMatches,
      };
    }
    if (identity.status === "NOT_ELIGIBLE" || TEMPORARY_PATTERN.test(combinedTitles)) {
      return {
        ...identity,
        status: "NOT_ELIGIBLE",
        reason: "Temporary event, tour, meeting point, transport, food, rental, or activity-only product is not a facility canon addition",
      };
    }
    if (SERVICE_PATTERN.test(combinedTitles) && !DIRECT_ADMISSION_PATTERN.test(combinedTitles)) {
      return {
        ...identity,
        status: "NOT_ELIGIBLE",
        reason: "Tour, meeting point, transport, food, rental, or activity-only product is not a facility canon addition",
      };
    }
    return {
      ...identity,
      status: "EVIDENCE_INSUFFICIENT",
      reason: identity.detail_fetch_errors.length > 0
        ? "Rakuten detail identity evidence could not be retrieved"
        : "Official primary evidence sufficient to confirm an eligible standalone family facility was not established in this audit",
    };
  });

  const statusCounts = Object.fromEntries(
    ["ADD", "DUPLICATE", "NOT_ELIGIBLE", "EVIDENCE_INSUFFICIENT"]
      .map((status) => [status, finalIdentities.filter((identity) => identity.status === status).length]),
  );
  const catalogItemsSha256 = catalog.coverage.items_sha256 ?? createHash("sha256")
    .update(JSON.stringify(catalog.items))
    .digest("hex");
  const finalInventory = {
    schema_version: 1,
    audited_at: "2026-08-26",
    source: {
      endpoint: "https://experiences.travel.rakuten.co.jp/api/experiences/search",
      destination_id: 1,
      language: "ja",
      currency: "JPY",
      fetched_at: catalog.fetched_at ?? catalog.generated_at,
      product_count: 17262,
      page_count: catalog.coverage.page_count,
      items_sha256: catalogItemsSha256,
    },
    coverage: {
      rakuten_japan_product_count: 17262,
      product_level_duplicate_count: preaudit.summary.DUPLICATE,
      product_level_not_eligible_count: preaudit.summary.NOT_ELIGIBLE,
      product_level_no_facility_identity_count: preaudit.summary.NO_FACILITY_IDENTITY,
      detailed_candidate_product_count: preaudit.candidate_count,
      extracted_identity_count: finalIdentities.length,
      detail_fetch_error_identity_count: finalIdentities.filter((identity) => identity.detail_fetch_errors.length > 0).length,
      final_status_counts: statusCounts,
    },
    identities: finalIdentities,
  };
  await mkdir(dirname(paths.finalInventory), { recursive: true });
  await writeFile(paths.finalInventory, `${JSON.stringify(finalInventory, null, 2)}\n`, "utf8");

  const existingOfferSlugs = new Set(actions.offers.map((offer) => offer.facility_slug));
  for (const identity of finalIdentities.filter((row) => row.status === "ADD")) {
    const facility = addedFacilities.find((item) => item.id === identity.added_facility.id);
    if (existingOfferSlugs.has(facility.slug)) continue;
    actions.offers.push({
      facility_id: facility.id,
      facility_slug: facility.slug,
      facility_name: facility.name,
      action_type: "ticket",
      label: "楽天でチケットを探す",
      url: identity.product_urls[0],
      verified_at: "2026-08-26",
      verification: {
        rakuten_title: identity.product_titles[0],
        same_facility_basis: "楽天商品詳細の利用施設identityと公式一次情報の施設名・所在地が一致",
        availability_basis: "公開中の商品詳細で販売導線を確認",
      },
    });
  }
  actions.offers.sort((a, b) => a.facility_id - b.facility_id);
  actions.coverage.audited_at = "2026-08-26";
  actions.coverage.facility_canon_count = facilityData.facilities.length;
  actions.coverage.facility_canon_sha256 = createHash("sha256")
    .update(JSON.stringify(facilityData))
    .digest("hex");
  actions.coverage.reverse_discovery_identity_count = finalIdentities.length;
  actions.coverage.reverse_discovery_add_count = statusCounts.ADD;
  await writeFile(paths.actions, `${JSON.stringify(actions, null, 2)}\n`, "utf8");

  const report = `# 楽天トラベル観光体験 施設逆引き discovery 監査（2026-08-26）

## 結論

楽天トラベル観光体験の日本向け公開商品 ${finalInventory.source.product_count.toLocaleString("ja-JP")} 件を全件取得し、楽天商品から施設 identity を逆引きした。既存 facility canon の意味と FacilityOps 掲載基準は変更していない。公式一次情報で identity・所在地・現行営業・子どもを含む利用条件まで確認できた ${statusCounts.ADD} 施設を ADD とし、その他は DUPLICATE / NOT_ELIGIBLE / EVIDENCE_INSUFFICIENT に固定した。

| final status | 件数 | 判定 |
|---|---:|---|
| ADD | ${statusCounts.ADD} | 公式一次情報を確認し、通常 scope で canon と楽天導線へ追加 |
| DUPLICATE | ${statusCounts.DUPLICATE} | 既存 canon の同一施設または既存施設を指す商品 |
| NOT_ELIGIBLE | ${statusCounts.NOT_ELIGIBLE} | ツアー、集合場所、移動、レンタル、飲食、単発体験、期間イベント等 |
| EVIDENCE_INSUFFICIENT | ${statusCounts.EVIDENCE_INSUFFICIENT} | 独立した適格施設としての一次情報確認が不足 |
| **計** | **${finalIdentities.length}** | 抽出した全施設 identity 候補 |

## 全件カバレッジ

- 取得条件: destination=1 / language=ja / currency=JPY
- 公開商品: ${finalInventory.source.product_count.toLocaleString("ja-JP")} 件、${finalInventory.source.page_count} ページ
- 商品列 SHA-256: \`${finalInventory.source.items_sha256}\`
- 商品タイトル段階: 既存重複 ${preaudit.summary.DUPLICATE.toLocaleString("ja-JP")} 件、非適格 ${preaudit.summary.NOT_ELIGIBLE.toLocaleString("ja-JP")} 件、施設 identity なし ${preaudit.summary.NO_FACILITY_IDENTITY.toLocaleString("ja-JP")} 件
- 詳細確認対象: ${preaudit.candidate_count.toLocaleString("ja-JP")} 商品
- 抽出 identity: ${finalIdentities.length} 件（うち楽天詳細 API の継続エラー ${finalInventory.coverage.detail_fetch_error_identity_count} 件）
- 全候補の根拠・商品 URL・canon 照合結果: [候補監査 JSON](./rakuten-facility-discovery-candidates-2026-08-26.json)

## 判定ルール

1. 楽天掲載は候補発見にのみ使用し、ADD の採用根拠には使用しない。
2. 運営主体または自治体等の公式一次情報で正式名称、所在地、営業実態、料金・対象年齢を確認する。
3. ツアー、集合場所、レンタル、飲食のみ、移動商品、期間イベント、単発の教室・体験事業者は施設として追加しない。
4. 既存 canon の表記揺れ・親施設・英日表記に解決できるものは DUPLICATE とする。
5. 独立施設としての一次情報が揃わないものは推測で追加せず EVIDENCE_INSUFFICIENT とする。

## ADD のデータ品質

- ${statusCounts.ADD} 件すべてに公式 URL、確認日、公式確認メモ、確定住所、座標、料金、対象年齢、体験タグを付与した。
- 座標は原則として公式確認住所を国土地理院住所検索へ入力した結果を採用し、新穂高ロープウェイのみ公式アクセスマップの乗車駅位置を採用した。
- 各 ADD の楽天商品は、施設 identity と利用場所が一致する公開商品だけを直接導線として登録した。
`;
  await writeFile(paths.report, report, "utf8");

  console.log(JSON.stringify({
    added_facilities: addedFacilities.length,
    facility_total: facilityData.facilities.length,
    status_counts: statusCounts,
    offers: actions.offers.length,
    report: paths.report,
    inventory: paths.finalInventory,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
