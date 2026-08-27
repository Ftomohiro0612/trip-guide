import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const PATHS = {
  facilities: resolve(ROOT, "data/facilities_data.json"),
  rakutenActions: resolve(ROOT, "data/rakuten_facility_actions.json"),
  asoviewActions: resolve(ROOT, "data/asoview_facility_actions.json"),
  ledger: resolve(
    ROOT,
    "docs/audits/asoview-reverse-discovery-candidates-2026-08-26.json",
  ),
  finalAudit: resolve(
    ROOT,
    "docs/audits/asoview-reverse-discovery-second-pass-final-2026-08-27.json",
  ),
  additions: resolve(
    ROOT,
    "scripts/data/asoview-second-pass-additions-2026-08-27.json",
  ),
  report: resolve(
    ROOT,
    "docs/audits/asoview-reverse-discovery-audit-2026-08-26.md",
  ),
};

const [facilityData, rakutenActions, asoviewActions, ledger, finalAudit, additionsData] =
  await Promise.all([
    readFile(PATHS.facilities, "utf8").then(JSON.parse),
    readFile(PATHS.rakutenActions, "utf8").then(JSON.parse),
    readFile(PATHS.asoviewActions, "utf8").then(JSON.parse),
    readFile(PATHS.ledger, "utf8").then(JSON.parse),
    readFile(PATHS.finalAudit, "utf8").then(JSON.parse),
    readFile(PATHS.additions, "utf8").then(JSON.parse),
  ]);

const beforeCanonCount = facilityData.facilities.length;
if (beforeCanonCount !== 5051) {
  throw new Error(`unexpected canon baseline: ${beforeCanonCount}`);
}
if (
  finalAudit.coverage.target_count !== 741 ||
  finalAudit.coverage.completed_count !== 741 ||
  finalAudit.reviews.length !== 741
) {
  throw new Error("second-pass audit does not cover exactly 741 candidates");
}
if (additionsData.count !== finalAudit.coverage.final_status_counts.ADD) {
  throw new Error("second-pass ADD input count mismatch");
}

const ledgerByIdentity = new Map(
  ledger.identities.map((entry) => [entry.asoview_identity, entry]),
);
const additionsByIdentity = new Map(
  additionsData.additions.map((entry) => [entry.asoview_identity, entry]),
);
if (additionsByIdentity.size !== additionsData.additions.length) {
  throw new Error("duplicate second-pass ADD identity");
}

for (const review of finalAudit.reviews) {
  const identity = ledgerByIdentity.get(review.asoview_identity);
  if (!identity) throw new Error(`ledger identity missing: ${review.asoview_identity}`);
  if (identity.status !== "OFFICIAL_EVIDENCE_INSUFFICIENT") {
    throw new Error(`second pass target changed before apply: ${review.asoview_identity}`);
  }
  identity.status = review.final_status;
  identity.reason = review.reason;
  identity.second_pass_review = {
    audit_ref:
      "docs/audits/asoview-reverse-discovery-second-pass-final-2026-08-27.json",
    checked_at: finalAudit.checked_at,
    initial_insufficiency_code: review.initial_insufficiency_code,
    initial_missing_conditions: review.initial_missing_conditions,
    final_status: review.final_status,
    final_insufficiency_code: review.final_insufficiency_code || null,
    final_missing_conditions: review.final_missing_conditions ?? [],
    inspected_page_count: review.inspected_page_count,
    official_hosts: review.official_hosts,
    manual_audit: review.manual_audit ?? null,
  };
  if (review.final_status === "DUPLICATE") {
    identity.resolved_canon_match = review.duplicate_match;
  }
  if (review.final_status === "NOT_ELIGIBLE") {
    identity.not_eligible_basis = review.not_eligible_basis;
  }
}

const existingNames = new Set(
  facilityData.facilities.map((facility) => normalize(facility.name)),
);
const newNames = new Set();
for (const addition of additionsData.additions) {
  validateAddition(addition);
  const normalizedName = normalize(addition.name);
  if (existingNames.has(normalizedName) || newNames.has(normalizedName)) {
    throw new Error(`duplicate facility ADD name: ${addition.name}`);
  }
  newNames.add(normalizedName);
}

let nextId = Math.max(...facilityData.facilities.map((facility) => facility.id)) + 1;
const addedFacilities = additionsData.additions.map((addition) =>
  buildFacility(addition, nextId++),
);
facilityData.facilities.push(...addedFacilities);
updateMetadata(facilityData, additionsData.additions);

const addedFacilityByIdentity = new Map(
  additionsData.additions.map((addition, index) => [
    addition.asoview_identity,
    addedFacilities[index],
  ]),
);
for (const review of finalAudit.reviews.filter((entry) => entry.final_status === "ADD")) {
  const identity = ledgerByIdentity.get(review.asoview_identity);
  const facility = addedFacilityByIdentity.get(review.asoview_identity);
  if (!identity || !facility) throw new Error(`ADD mapping missing: ${review.asoview_identity}`);
  identity.added_facility = {
    id: facility.id,
    slug: facility.slug,
    name: facility.name,
  };
}

const canonHash = createHash("sha256")
  .update(JSON.stringify(facilityData))
  .digest("hex");
for (const actions of [rakutenActions, asoviewActions]) {
  actions.coverage.audited_at = "2026-08-27";
  actions.coverage.facility_canon_count = facilityData.facilities.length;
  actions.coverage.facility_canon_sha256 = canonHash;
}
asoviewActions.coverage.reverse_discovery_add_count = ledger.identities.filter(
  (identity) => identity.status === "ADD",
).length;
asoviewActions.coverage.reverse_discovery_second_pass_count = 741;
asoviewActions.coverage.reverse_discovery_second_pass_add_count = addedFacilities.length;

const finalStatuses = [
  "ADD",
  "DUPLICATE",
  "NOT_ELIGIBLE",
  "ASOVIEW_DETAIL_UNAVAILABLE",
  "OFFICIAL_EVIDENCE_INSUFFICIENT",
];
ledger.schema_version = 3;
ledger.finalized_at = "2026-08-27";
ledger.coverage.status_counts = Object.fromEntries(
  finalStatuses.map((status) => [
    status,
    ledger.identities.filter((identity) => identity.status === status).length,
  ]),
);
ledger.coverage.facilities_added = ledger.coverage.status_counts.ADD;
ledger.coverage.second_pass_target_count = 741;
ledger.coverage.second_pass_initial_insufficiency_counts =
  finalAudit.coverage.initial_insufficiency_counts;
ledger.coverage.second_pass_final_status_counts =
  finalAudit.coverage.final_status_counts;
ledger.coverage.second_pass_final_insufficiency_counts =
  finalAudit.coverage.final_insufficiency_counts;
ledger.coverage.second_pass_facilities_added = addedFacilities.length;
ledger.coverage.canon_before_second_pass = beforeCanonCount;
ledger.coverage.final_facility_canon_count = facilityData.facilities.length;
ledger.coverage.final_facility_canon_sha256 = canonHash;

const report = buildReport({
  ledger,
  finalAudit,
  beforeCanonCount,
  afterCanonCount: facilityData.facilities.length,
  addedCount: addedFacilities.length,
});

await Promise.all([
  writeFile(PATHS.facilities, `${JSON.stringify(facilityData, null, 2)}\n`, "utf8"),
  writeFile(PATHS.rakutenActions, `${JSON.stringify(rakutenActions, null, 2)}\n`, "utf8"),
  writeFile(PATHS.asoviewActions, `${JSON.stringify(asoviewActions, null, 2)}\n`, "utf8"),
  writeFile(PATHS.ledger, `${JSON.stringify(ledger, null, 2)}\n`, "utf8"),
  writeFile(PATHS.report, report, "utf8"),
]);

console.log(
  JSON.stringify(
    {
      second_pass_reviewed: 741,
      facilities_added: addedFacilities.length,
      canon_before: beforeCanonCount,
      canon_after: facilityData.facilities.length,
      canon_sha256: canonHash,
      second_pass_status_counts: finalAudit.coverage.final_status_counts,
      ledger_status_counts: ledger.coverage.status_counts,
    },
    null,
    2,
  ),
);

function validateAddition(addition) {
  for (const field of [
    "asoview_identity",
    "name",
    "prefecture",
    "prefecture_id",
    "category",
    "category_id",
    "address",
    "url",
    "adult_fee",
    "child_fee",
    "target_age",
    "summary",
  ]) {
    if (!addition[field]) throw new Error(`ADD missing ${field}: ${addition.name}`);
  }
  if (!Number.isFinite(addition.latitude) || !Number.isFinite(addition.longitude)) {
    throw new Error(`ADD coordinates missing: ${addition.name}`);
  }
  if (!Array.isArray(addition.experiences) || addition.experiences.length < 3) {
    throw new Error(`ADD experiences missing: ${addition.name}`);
  }
  const officialUrl = new URL(addition.url);
  if (!/^https?:$/u.test(officialUrl.protocol) || /asoview\.com$/iu.test(officialUrl.hostname)) {
    throw new Error(`ADD source is not independent official page: ${addition.name}`);
  }
  for (const condition of ["identity", "address", "current_operation", "child_use"]) {
    const evidence = addition.source_evidence?.[condition];
    if (!evidence?.satisfied || !evidence.url || /asoview\.com/iu.test(evidence.url)) {
      throw new Error(`ADD official ${condition} evidence missing: ${addition.name}`);
    }
  }
}

function buildFacility(addition, id) {
  const indoorOutdoor = addition.indoor_outdoor ?? "両方";
  return {
    id,
    slug: `facility-${id}`,
    name: addition.name,
    prefecture: addition.prefecture,
    prefecture_id: addition.prefecture_id,
    category: addition.category,
    category_id: addition.category_id,
    address: addition.address,
    indoor_outdoor: indoorOutdoor,
    rain_friendly: addition.rain_friendly ?? (indoorOutdoor === "屋内" ? "◎" : "△"),
    is_free: false,
    fee_type: "有料",
    adult_fee: addition.adult_fee,
    child_fee: addition.child_fee,
    description: `${addition.name}は、${addition.summary} 公式一次情報で施設identity、所在地、現行営業、子ども利用条件を確認しています。`,
    target_age: addition.target_age,
    url: addition.url,
    tags: ["有料", indoorOutdoor === "屋内" ? "完全屋内" : indoorOutdoor === "両方" ? "屋内外両方" : "屋外"],
    latitude: addition.latitude,
    longitude: addition.longitude,
    geocode_source: addition.geocode_source,
    signature_experiences: addition.experiences,
    unique_selling_point: addition.summary,
    experience_tags: addition.experiences.map((value) => value.replace(/する$/u, "")),
    summer_water_play: /水族館|プール|水あそび|ビーチ/iu.test(addition.name) ? "○" : "×",
    recommended_for_tags: recommendedTagsFor(addition.category_id),
    things_to_do: addition.experiences,
    source_urls: addition.url,
    source_notes: "運営主体・自治体等の公式一次情報で正式名称、所在地、2026年8月時点の現行営業、子ども料金・年齢・同伴条件を確認。座標は国土地理院住所検索を採用。",
    source_checked_at: "2026-08-27",
    data_quality_status: "confirmed",
    image: null,
    image_attribution: null,
    image_source: null,
  };
}

function updateMetadata(facilities, additions) {
  facilities.metadata.total_facilities = facilities.facilities.length;
  for (const addition of additions) {
    const prefecture = facilities.metadata.prefectures.find(
      (entry) => entry.id === addition.prefecture_id,
    );
    const category = facilities.metadata.categories.find(
      (entry) => entry.id === addition.category_id,
    );
    if (!prefecture || !category) throw new Error(`metadata missing: ${addition.name}`);
    prefecture.count += 1;
    category.count += 1;
  }
}

function buildReport({ ledger, finalAudit, beforeCanonCount, afterCanonCount, addedCount }) {
  const initial = finalAudit.coverage.initial_insufficiency_counts;
  const final = finalAudit.coverage.final_status_counts;
  const remaining = finalAudit.coverage.final_insufficiency_counts;
  const totals = ledger.coverage.status_counts;
  return `# アソビュー！施設逆引き discovery 監査（2026-08-27 second-pass）

## 結論

初回監査で \`OFFICIAL_EVIDENCE_INSUFFICIENT\` だった741施設候補を全件second-passした。アソビュー掲載は候補発見にだけ使用し、FacilityOpsの4条件（施設identity、所在地、現行営業、子ども利用条件）は変更していない。同一公式ドメインの施設ページ、店舗一覧、料金、FAQ、予約、利用案内、公式PDF、自治体ページまで再探索し、4条件が公式一次情報で揃った${addedCount}施設だけをcanonへ追加した。

## 741件の初回不足理由

| 不足理由 | 件数 |
|---|---:|
| IDENTITY_INSUFFICIENT | ${initial.IDENTITY_INSUFFICIENT ?? 0} |
| ADDRESS_INSUFFICIENT | ${initial.ADDRESS_INSUFFICIENT ?? 0} |
| CURRENT_OPERATION_INSUFFICIENT | ${initial.CURRENT_OPERATION_INSUFFICIENT ?? 0} |
| CHILD_USE_INSUFFICIENT | ${initial.CHILD_USE_INSUFFICIENT ?? 0} |
| MULTIPLE_EVIDENCE_INSUFFICIENT | ${initial.MULTIPLE_EVIDENCE_INSUFFICIENT ?? 0} |
| **計** | **741** |

## Second-pass最終判定

| final status | 件数 | 判定 |
|---|---:|---|
| ADD | ${final.ADD} | 公式一次情報の4条件を確認しcanonへ追加 |
| DUPLICATE | ${final.DUPLICATE} | 既存canonの同一施設へ解決 |
| NOT_ELIGIBLE | ${final.NOT_ELIGIBLE} | ツアー、集合場所、飲食・宿泊のみ、単発・期間イベント等 |
| OFFICIAL_EVIDENCE_INSUFFICIENT | ${final.OFFICIAL_EVIDENCE_INSUFFICIENT} | 4条件の一部が公式一次情報で揃わずfail-closed |
| **計** | **741** | 全件review complete |

残存${final.OFFICIAL_EVIDENCE_INSUFFICIENT}件の不足理由は、住所${remaining.ADDRESS_INSUFFICIENT ?? 0}件、現行営業${remaining.CURRENT_OPERATION_INSUFFICIENT ?? 0}件、子ども利用${remaining.CHILD_USE_INSUFFICIENT ?? 0}件、複数条件${remaining.MULTIPLE_EVIDENCE_INSUFFICIENT ?? 0}件。identity単独不足は0件である。

## Canon反映

- second-pass前: ${beforeCanonCount.toLocaleString("ja-JP")}施設
- second-pass追加: ${addedCount.toLocaleString("ja-JP")}施設
- second-pass後: ${afterCanonCount.toLocaleString("ja-JP")}施設
- discovery全体のADD: ${totals.ADD}施設
- discovery全体の最終内訳: ADD ${totals.ADD} / DUPLICATE ${totals.DUPLICATE} / NOT_ELIGIBLE ${totals.NOT_ELIGIBLE} / OFFICIAL_EVIDENCE_INSUFFICIENT ${totals.OFFICIAL_EVIDENCE_INSUFFICIENT}

## 証拠と掲載判定

1. ADD全施設について、identity・住所・現行営業・子ども料金／年齢／同伴条件の4証拠を公式URLと抜粋付きで記録した。
2. アソビュー、Google Maps、旅行・口コミ・まとめサイト、第三者SNS投稿はcanon採用根拠に使用していない。
3. 別店舗・類似名称・系列施設の住所や条件は流用せず、exact facilityで揃わない候補は不足理由付きで非採用とした。
4. 741件の最終判定は[second-pass最終監査JSON](./asoview-reverse-discovery-second-pass-final-2026-08-27.json)、全1,653件の統合結果は[候補監査JSON](./asoview-reverse-discovery-candidates-2026-08-26.json)に記録した。

## セキュリティ

公開ページだけを未認証で確認した。ValueCommerce/アソビューのログイン、パスワード、Cookie、session、認証トークンは使用・保存していない。
`;
}

function normalize(value) {
  return String(value ?? "")
    .normalize("NFKC")
    .toLocaleLowerCase("ja")
    .replace(/[\s\p{P}\p{S}]/gu, "");
}

function recommendedTagsFor(categoryId) {
  return {
    aquarium: ["animal", "exhibition"],
    zoo: ["animal", "animal_contact"],
    museum: ["exhibition", "experience"],
    "art-museum": ["exhibition", "craft"],
    "fruit-picking": ["food", "experience"],
    athletic: ["athletic", "experience"],
    "indoor-play": ["playground", "running"],
    "hot-spring-pool": ["pool", "water_play"],
    "nature-park": ["nature", "wide_space"],
    craft: ["craft", "experience"],
    ski: ["nature", "experience"],
    experience: ["experience"],
  }[categoryId] ?? ["experience"];
}
