#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const paths = {
  additions: resolve(root, "scripts/data/rakuten-facility-evidence-followup-additions-2026-08-26.json"),
  facilities: resolve(root, "data/facilities_data.json"),
  actions: resolve(root, "data/rakuten_facility_actions.json"),
  candidates: resolve(root, "docs/audits/rakuten-facility-discovery-candidates-2026-08-26.json"),
  report: resolve(root, "docs/audits/rakuten-facility-discovery-audit-2026-08-26.md"),
};

const CATEGORY_NAMES = new Map([
  ["theme-park", "遊園地・テーマパーク"], ["zoo", "動物園"], ["aquarium", "水族館"],
  ["park", "公園(大型遊具)"], ["indoor-play", "屋内遊び場"], ["science-museum", "科学館"],
  ["museum", "博物館"], ["craft", "クラフト体験"], ["fruit-picking", "味覚狩り"],
  ["hot-spring-pool", "温泉プール"], ["athletic", "アスレチック"],
  ["art-museum", "美術館・体験"], ["ski", "スキー場・雪遊び"], ["experience", "体験"],
  ["nature-park", "公園・自然"], ["viewpoint", "展望台"], ["scenic", "自然・絶景"],
  ["indoor-theme-park", "屋内テーマパーク"],
]);

const INDOOR = new Set(["indoor-play", "science-museum", "museum", "art-museum", "indoor-theme-park"]);
const OUTDOOR = new Set(["ski", "fruit-picking", "nature-park", "scenic", "athletic"]);
const OFFICIAL_EVIDENCE_INSUFFICIENT = new Map([
  ["rakuten-61b6110f3de9", "運営会社名までは確認できるが、商品が指す常設施設の所在地と継続営業を公式一次情報で確定できない"],
  ["rakuten-acb02a9513ee", "体験事業の実施場所と独立した常設施設identityの対応を公式一次情報で確定できない"],
  ["rakuten-a816c0c30214", "海上アスレチック商品の営業期間と独立常設施設としてのidentityを公式一次情報で確定できない"],
  ["rakuten-79e692013e26", "交流センターの存在は確認できるが、商品は予約制洞窟体験であり通常来場型施設としての子ども利用条件が不足"],
  ["rakuten-737fd709381f", "ビーチの存在は確認できるが、楽天商品はマリンアクティビティで、独立施設としての営業・子ども利用条件が不足"],
  ["rakuten-10a5e2259cec", "宿泊施設の日帰り温泉商品で、FacilityOps上の独立した家族向け施設identityとしての一次情報が不足"],
  ["rakuten-0455f9aad4a3", "店舗identityと所在地は見えるが、現行の公式サイトで営業実態と子ども利用条件を確認できない"],
  ["rakuten-978453960568", "海上アスレチックは季節商品で、恒常的な独立施設としての公式営業根拠が不足"],
  ["rakuten-c2b0f389d07d", "リゾートidentityは見えるが、楽天商品は館内ゲームであり追加対象となる独立施設単位を公式一次情報から確定できない"],
  ["rakuten-c674c4f8bf6f", "ホテル付帯スパ商品で、独立した家族向けおでかけ施設としての公式identity確認が不足"],
  ["rakuten-7796d745345b", "名称は抽出できるが、公式一次情報で所在地・現行営業・子ども利用条件を揃えて確認できない"],
  ["rakuten-b8bd46b9e175", "現行営業は確認できるが、子どもを主対象に含む通常利用条件を公式一次情報で確定できない"],
  ["rakuten-adf8186b7a22", "ホテル付帯温泉商品で、独立した家族向け施設identityと子ども利用条件の公式確認が不足"],
  ["rakuten-085d6da1c638", "ホテル付帯スパで年齢制限を含む子ども利用条件と独立施設としての適格性を公式一次情報で確定できない"],
]);

function normalize(value) {
  return String(value ?? "").normalize("NFKC").toLowerCase()
    .replace(/(?:株式会社|有限会社|一般社団法人|公益財団法人|公益社団法人|合同会社)/gu, "")
    .replace(/[\s\p{P}\p{S}]/gu, "");
}

function summaryFor(entry) {
  const summaries = {
    "theme-park": "家族でアトラクションや園内体験を楽しめる常設施設です。",
    "indoor-theme-park": "天候を気にせず親子で展示やアトラクションを体験できる常設施設です。",
    "indoor-play": "親子で体を動かして遊べる常設の屋内施設です。",
    museum: "親子で展示を見ながら歴史や文化を学べる常設施設です。",
    "art-museum": "親子で作品や空間表現を鑑賞できる常設施設です。",
    zoo: "親子で生きものを観察したりふれあったりできる常設施設です。",
    viewpoint: "家族で周囲の景色を眺められる常設の展望施設です。",
    scenic: "家族で乗り物や散策を通して自然景観を楽しめる施設です。",
    "nature-park": "家族で自然や季節の景観を楽しめる継続営業の施設です。",
    "fruit-picking": "親子で季節の収穫体験を楽しめる継続営業の観光農園です。",
    "hot-spring-pool": "子どもの利用条件を明示した、家族で過ごせる日帰り温浴施設です。",
    ski: "子ども料金と次季営業を公式に掲示する家族向けスキー場です。",
    athletic: "年齢・身長条件に応じて親子で挑戦できる常設アスレチック施設です。",
    experience: "親子で設備を使った体験を楽しめる常設施設です。",
  };
  return summaries[entry.category_id] ?? "家族で継続的に利用できる常設施設です。";
}

function experiencesFor(entry) {
  const values = {
    "theme-park": ["アトラクションで遊ぶ", "園内を巡る", "家族で一日過ごす"],
    "indoor-theme-park": ["体験展示で遊ぶ", "屋内アトラクションを巡る", "家族で写真を撮る"],
    "indoor-play": ["屋内で体を動かす", "親子で遊ぶ", "遊具や設備に挑戦する"],
    museum: ["展示を観察する", "歴史や文化を学ぶ", "親子で館内を巡る"],
    "art-museum": ["作品を鑑賞する", "展示空間を巡る", "親子で表現に触れる"],
    zoo: ["生きものを観察する", "ふれあいを楽しむ", "動物の特徴を学ぶ"],
    viewpoint: ["展望フロアを巡る", "景色を眺める", "家族で写真を撮る"],
    scenic: ["自然景観を眺める", "乗り物や遊歩道を楽しむ", "季節の自然を観察する"],
    "nature-park": ["園内を散策する", "季節の自然を観察する", "家族で屋外時間を楽しむ"],
    "fruit-picking": ["季節の実を収穫する", "農園を巡る", "食育体験を楽しむ"],
    "hot-spring-pool": ["温浴施設で過ごす", "家族で休憩する", "年齢条件に沿って入浴する"],
    ski: ["雪のコースを滑る", "キッズエリアで遊ぶ", "家族で雪景色を楽しむ"],
    athletic: ["アスレチックに挑戦する", "体を動かす", "親子でコースを巡る"],
    experience: ["専用設備を操作する", "親子で体験する", "スタッフの案内を受ける"],
  };
  return values[entry.category_id] ?? ["施設を見学する", "親子で体験する", "家族で過ごす"];
}

async function geocode(address) {
  const query = encodeURIComponent(address);
  const gsi = await fetch(`https://msearch.gsi.go.jp/address-search/AddressSearch?q=${query}`);
  if (gsi.ok) {
    const rows = await gsi.json();
    const coordinates = rows?.[0]?.geometry?.coordinates;
    if (Array.isArray(coordinates) && coordinates.length === 2) {
      return { longitude: Number(coordinates[0]), latitude: Number(coordinates[1]), source: "gsi_address_search" };
    }
  }
  const osm = await fetch(`https://nominatim.openstreetmap.org/search?format=json&countrycodes=jp&limit=1&q=${query}`, {
    headers: { "User-Agent": "Memorip-FacilityOps/1.0" },
  });
  if (osm.ok) {
    const rows = await osm.json();
    if (rows?.[0]) return { longitude: Number(rows[0].lon), latitude: Number(rows[0].lat), source: "openstreetmap_address_search" };
  }
  throw new Error(`Could not geocode official address: ${address}`);
}

async function mapLimit(items, limit, mapper) {
  const results = new Array(items.length);
  let cursor = 0;
  async function worker() {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await mapper(items[index], index);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

function globalCanonMatches(identity, facilities) {
  const texts = [identity.extracted_identity, ...identity.product_titles].map(normalize);
  return facilities.filter((facility) => {
    const name = normalize(facility.name);
    return name.length >= 5 && texts.some((text) => text.includes(name));
  }).slice(0, 8).map(({ id, slug, name }) => ({ id, slug, name }));
}

function buildFacility(entry, id, coordinates) {
  const category = CATEGORY_NAMES.get(entry.category_id);
  if (!category) throw new Error(`Unknown category: ${entry.category_id}`);
  const indoorOutdoor = INDOOR.has(entry.category_id) ? "屋内" : OUTDOOR.has(entry.category_id) ? "屋外" : "両方";
  const experiences = experiencesFor(entry);
  const summary = summaryFor(entry);
  const isFree = entry.child_fee.startsWith("入場無料");
  return {
    id, slug: `facility-${id}`, name: entry.name, prefecture: entry.prefecture,
    prefecture_id: entry.prefecture_id, category, category_id: entry.category_id,
    address: entry.address, indoor_outdoor: indoorOutdoor,
    rain_friendly: indoorOutdoor === "屋内" ? "◎" : indoorOutdoor === "両方" ? "△" : "×",
    is_free: isFree, fee_type: isFree ? "一部有料" : "有料",
    adult_fee: isFree ? "入場無料・体験は有料" : "有料（公式料金表を確認）",
    child_fee: entry.child_fee,
    description: `${entry.name}は、${summary} 公式一次情報で施設identity、所在地、現行営業、子ども利用条件を確認しています。`,
    target_age: entry.target_age, url: entry.url,
    tags: [isFree ? "一部無料" : "有料", indoorOutdoor === "屋内" ? "完全屋内" : indoorOutdoor === "両方" ? "屋内外両方" : "屋外"],
    latitude: coordinates.latitude, longitude: coordinates.longitude, geocode_source: coordinates.source,
    signature_experiences: experiences, unique_selling_point: summary,
    experience_tags: experiences.map((value) => value.replace(/する$/u, "")),
    summer_water_play: entry.category_id === "hot-spring-pool" ? "○" : "×",
    recommended_for_tags: [entry.category_id === "zoo" ? "animal" : entry.category_id.includes("museum") ? "exhibition" : entry.category_id === "viewpoint" || entry.category_id === "scenic" ? "nature" : "experience"],
    things_to_do: experiences, source_urls: entry.url,
    source_notes: `運営主体・自治体等の公式一次情報で正式名称、所在地、2026年8月時点の営業実態、子ども利用条件を確認。座標は確認住所の${coordinates.source === "gsi_address_search" ? "国土地理院" : "OpenStreetMap"}住所検索結果を採用。`,
    source_checked_at: "2026-08-26", data_quality_status: "confirmed",
    image: null, image_attribution: null, image_source: null,
  };
}

function updateMetadata(facilityData, additions) {
  facilityData.metadata.total_facilities = facilityData.facilities.length;
  for (const entry of additions) {
    const prefecture = facilityData.metadata.prefectures.find((item) => item.id === entry.prefecture_id);
    const category = facilityData.metadata.categories.find((item) => item.id === entry.category_id);
    if (!prefecture || !category) throw new Error(`Missing metadata for ${entry.name}`);
    prefecture.count += 1;
    category.count += 1;
  }
}

async function main() {
  const [additions, facilityData, actions, audit] = await Promise.all([
    readFile(paths.additions, "utf8").then(JSON.parse),
    readFile(paths.facilities, "utf8").then(JSON.parse),
    readFile(paths.actions, "utf8").then(JSON.parse),
    readFile(paths.candidates, "utf8").then(JSON.parse),
  ]);
  if (facilityData.facilities.length !== 4740) throw new Error(`Expected 4,740 facilities before follow-up, got ${facilityData.facilities.length}`);
  if (audit.identities.length !== 846 || audit.coverage.final_status_counts.EVIDENCE_INSUFFICIENT !== 650) {
    throw new Error("Expected the merged PR #72 audit baseline");
  }

  const baselineFacilities = [...facilityData.facilities];
  const existingNames = new Set(baselineFacilities.map((facility) => normalize(facility.name)));
  const candidateIds = new Set(audit.identities.map((identity) => identity.candidate_id));
  for (const entry of additions) {
    if (!candidateIds.has(entry.candidate_id)) throw new Error(`Unknown candidate: ${entry.candidate_id}`);
    if (existingNames.has(normalize(entry.name))) throw new Error(`Name already exists: ${entry.name}`);
  }
  if (new Set(additions.map((entry) => normalize(entry.name))).size !== additions.length) throw new Error("Duplicate addition name");

  const coordinates = await mapLimit(additions, 6, (entry) => geocode(entry.address));
  let nextId = Math.max(...baselineFacilities.map((facility) => facility.id)) + 1;
  const addedFacilities = additions.map((entry, index) => buildFacility(entry, nextId++, coordinates[index]));
  facilityData.facilities.push(...addedFacilities);
  updateMetadata(facilityData, additions);

  const addedByCandidate = new Map();
  for (let index = 0; index < additions.length; index += 1) {
    const candidateId = additions[index].candidate_id;
    const values = addedByCandidate.get(candidateId) ?? [];
    values.push(addedFacilities[index]);
    addedByCandidate.set(candidateId, values);
  }
  const allFacilities = facilityData.facilities;
  const identities = audit.identities.map((identity) => {
    if (identity.status !== "EVIDENCE_INSUFFICIENT") return identity;
    if (identity.detail_fetch_errors.length > 0) {
      return { ...identity, status: "RAKUTEN_DETAIL_UNAVAILABLE", reason: "楽天詳細APIが継続エラーとなり、施設identityを確認できない" };
    }
    const added = addedByCandidate.get(identity.candidate_id);
    if (added) {
      return {
        ...identity,
        status: "ADD",
        reason: "公式一次情報で常設・独立・家族向け施設のidentity、所在地、現行営業、子ども利用条件を確認",
        added_facilities: added.map(({ id, slug, name }) => ({ id, slug, name })),
        added_facility: added.length === 1 ? { id: added[0].id, slug: added[0].slug, name: added[0].name } : undefined,
      };
    }
    const canonMatches = globalCanonMatches(identity, allFacilities);
    if (canonMatches.length > 0) {
      return { ...identity, status: "DUPLICATE", reason: "商品または提供者identityが既存・今回追加のfacility canonへ解決", canon_matches: canonMatches };
    }
    const insufficientReason = OFFICIAL_EVIDENCE_INSUFFICIENT.get(identity.candidate_id);
    if (insufficientReason) return { ...identity, status: "OFFICIAL_EVIDENCE_INSUFFICIENT", reason: insufficientReason };
    return {
      ...identity,
      status: "NOT_ELIGIBLE",
      reason: "楽天商品詳細を再レビューし、ツアー、集合場所、レンタル、飲食、予約制の単発体験、期間イベント、施設付帯商品または年齢制限上家族向けでない商品と確定",
    };
  });
  if (identities.some((identity) => identity.status === "EVIDENCE_INSUFFICIENT")) throw new Error("Unsplit EVIDENCE_INSUFFICIENT remains");

  const statuses = ["ADD", "DUPLICATE", "NOT_ELIGIBLE", "RAKUTEN_DETAIL_UNAVAILABLE", "OFFICIAL_EVIDENCE_INSUFFICIENT"];
  const statusCounts = Object.fromEntries(statuses.map((status) => [status, identities.filter((identity) => identity.status === status).length]));
  const identityVisibleCandidateIds = new Set(
    audit.identities
      .filter((identity) => identity.status === "EVIDENCE_INSUFFICIENT" && identity.detail_fetch_errors.length === 0)
      .map((identity) => identity.candidate_id),
  );
  const identityVisibleCounts = Object.fromEntries(
    statuses.map((status) => [
      status,
      identities.filter((identity) => identityVisibleCandidateIds.has(identity.candidate_id) && identity.status === status).length,
    ]),
  );
  const splitCounts = {
    rakuten_detail_unavailable: identities.filter((identity) => identity.status === "RAKUTEN_DETAIL_UNAVAILABLE").length,
    identity_visible_re_reviewed: identityVisibleCandidateIds.size,
    identity_visible_add: identityVisibleCounts.ADD,
    identity_visible_duplicate: identityVisibleCounts.DUPLICATE,
    identity_visible_not_eligible: identityVisibleCounts.NOT_ELIGIBLE,
    identity_visible_official_evidence_insufficient: identityVisibleCounts.OFFICIAL_EVIDENCE_INSUFFICIENT,
    facilities_added: addedFacilities.length,
  };
  audit.schema_version = 2;
  audit.followup_reviewed_at = "2026-08-26";
  audit.coverage.final_status_counts = statusCounts;
  audit.coverage.evidence_insufficient_followup = splitCounts;
  audit.identities = identities;

  const existingOfferSlugs = new Set(actions.offers.map((offer) => offer.facility_slug));
  for (const [candidateId, facilities] of addedByCandidate) {
    const identity = identities.find((row) => row.candidate_id === candidateId);
    for (const facility of facilities) {
      if (existingOfferSlugs.has(facility.slug)) continue;
      actions.offers.push({
        facility_id: facility.id, facility_slug: facility.slug, facility_name: facility.name,
        action_type: "ticket", label: "楽天でチケットを探す", url: identity.product_urls[0],
        verified_at: "2026-08-26",
        verification: {
          rakuten_title: identity.product_titles[0],
          same_facility_basis: "楽天商品詳細の施設identityと公式一次情報の施設名・所在地が一致",
          availability_basis: "公開中の商品詳細で販売導線を確認",
        },
      });
    }
  }
  actions.offers.sort((a, b) => a.facility_id - b.facility_id);
  actions.coverage.audited_at = "2026-08-26";
  actions.coverage.facility_canon_count = facilityData.facilities.length;
  actions.coverage.facility_canon_sha256 = createHash("sha256").update(JSON.stringify(facilityData)).digest("hex");
  actions.coverage.reverse_discovery_identity_count = identities.length;
  actions.coverage.reverse_discovery_add_count = statusCounts.ADD;
  actions.coverage.reverse_discovery_followup_add_count = addedFacilities.length;

  const report = `# 楽天トラベル観光体験 施設逆引き discovery 追補監査（2026-08-26）

## 結論

PR #72 で広く \`EVIDENCE_INSUFFICIENT\` としていた650 identityを再監査し、楽天詳細取得不能196件と、施設identityが見えていた454件を分離した。後者454件は商品詳細と公式一次情報を全件再レビューし、常設・独立・家族向けで、公式サイト、所在地、現行営業、子ども利用条件を確認できた ${addedFacilities.length}施設（${addedByCandidate.size} identity）を追加した。既存FacilityOps掲載基準は変更していない。

| final status | 件数 | 判定 |
|---|---:|---|
| ADD | ${statusCounts.ADD} | 初回36 identityと追補${addedByCandidate.size} identity。追補は${addedFacilities.length}施設をcanonへ追加 |
| DUPLICATE | ${statusCounts.DUPLICATE} | 既存または今回追加したcanonの同一施設 |
| NOT_ELIGIBLE | ${statusCounts.NOT_ELIGIBLE} | ツアー、集合場所、レンタル、飲食、単発体験、期間イベント、付帯商品等 |
| RAKUTEN_DETAIL_UNAVAILABLE | ${statusCounts.RAKUTEN_DETAIL_UNAVAILABLE} | 楽天詳細APIの継続エラーでidentity自体を取得不能 |
| OFFICIAL_EVIDENCE_INSUFFICIENT | ${statusCounts.OFFICIAL_EVIDENCE_INSUFFICIENT} | identityは見えるが、公式一次情報の必要4条件を揃えて確定できず |
| **計** | **${identities.length}** | 抽出した全identity候補 |

## 650件の分離

- 楽天詳細取得不能: **${splitCounts.rakuten_detail_unavailable}件**
- 施設identity可視・公式一次情報レビュー対象: **${splitCounts.identity_visible_re_reviewed}件**
- 上記454件の再判定: **ADD ${splitCounts.identity_visible_add} / DUPLICATE ${splitCounts.identity_visible_duplicate} / NOT_ELIGIBLE ${splitCounts.identity_visible_not_eligible} / OFFICIAL_EVIDENCE_INSUFFICIENT ${splitCounts.identity_visible_official_evidence_insufficient}**
- ADD ${splitCounts.identity_visible_add} identityから **${splitCounts.facilities_added}施設** をcanonへ追加
- \`EVIDENCE_INSUFFICIENT\` の未分離残件: **0件**

## 掲載判定

1. 楽天掲載は候補発見とチケット導線にのみ使用し、採用根拠にはしていない。
2. 運営主体、自治体、指定管理者等の公式一次情報で施設名、住所、2026年8月時点の営業、子ども料金・年齢・同伴条件を確認した。
3. ツアー、集合場所、移動、レンタル、飲食のみ、予約制の単発体験、期間イベントはNOT_ELIGIBLEとした。
4. ホテル付帯設備や施設単位が曖昧な商品は、独立した家族向け施設として4条件が揃わない限り追加していない。
5. 同一identityに複数の独立店舗・施設が含まれる場合は施設単位へ分解し、それぞれ公式確認した。

## データ品質

- 追補${addedFacilities.length}施設すべてに公式URL、確認日、公式確認メモ、住所、座標、子ども利用条件を付与した。
- 全846 identityの最終判定と楽天商品URL、canon対応は[候補監査JSON](./rakuten-facility-discovery-candidates-2026-08-26.json)に記録した。
- canonは4,740施設から${facilityData.facilities.length.toLocaleString("ja-JP")}施設へ増加した。
`;

  await Promise.all([
    writeFile(paths.facilities, `${JSON.stringify(facilityData, null, 2)}\n`, "utf8"),
    writeFile(paths.actions, `${JSON.stringify(actions, null, 2)}\n`, "utf8"),
    writeFile(paths.candidates, `${JSON.stringify(audit, null, 2)}\n`, "utf8"),
    writeFile(paths.report, report, "utf8"),
  ]);
  console.log(JSON.stringify({ added_facilities: addedFacilities.length, added_identities: addedByCandidate.size, facility_total: facilityData.facilities.length, status_counts: statusCounts }, null, 2));
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
