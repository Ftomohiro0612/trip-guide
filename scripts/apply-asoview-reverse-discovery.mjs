import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const PATHS = {
  facilities: resolve(ROOT, "data/facilities_data.json"),
  rakutenActions: resolve(ROOT, "data/rakuten_facility_actions.json"),
  ledger: resolve(
    ROOT,
    "docs/audits/asoview-reverse-discovery-candidates-2026-08-26.json",
  ),
  chain: resolve(
    ROOT,
    "scripts/data/asoview-reverse-discovery-chain-additions-2026-08-26.json",
  ),
  independent: resolve(
    ROOT,
    "scripts/data/asoview-reverse-discovery-independent-review-2026-08-26.json",
  ),
  report: resolve(
    ROOT,
    "docs/audits/asoview-reverse-discovery-audit-2026-08-26.md",
  ),
};

const [facilityData, rakutenActions, ledger, chainReview, independentReview] =
  await Promise.all([
    readFile(PATHS.facilities, "utf8").then(JSON.parse),
    readFile(PATHS.rakutenActions, "utf8").then(JSON.parse),
    readFile(PATHS.ledger, "utf8").then(JSON.parse),
    readFile(PATHS.chain, "utf8").then(JSON.parse),
    readFile(PATHS.independent, "utf8").then(JSON.parse),
  ]);

const chainEvidenceByIdentity = new Map(
  chainReview.evidence
    .filter((entry) => entry.asoview_identity)
    .map((entry) => [entry.asoview_identity, entry]),
);
const chainAdditionByIdentity = new Map(
  chainReview.additions.map((entry) => [entry.asoview_identity, entry]),
);
const independentByIdentity = new Map(
  independentReview.reviews.map((entry) => [entry.asoview_identity, entry]),
);

if (independentByIdentity.size !== independentReview.reviews.length) {
  throw new Error("duplicate independent reverse discovery review identity");
}

const additions = [];
for (const identity of ledger.identities) {
  if (identity.status !== "OFFICIAL_REVIEW_REQUIRED") continue;

  const chainEvidence = chainEvidenceByIdentity.get(identity.asoview_identity);
  const independent = independentByIdentity.get(identity.asoview_identity);
  if (chainEvidence && independent) {
    throw new Error(`duplicate official review source: ${identity.asoview_identity}`);
  }
  if (chainEvidence?.status === "OFFICIAL_EVIDENCE_CONFIRMED") {
    const addition = chainAdditionByIdentity.get(identity.asoview_identity);
    if (!addition) throw new Error(`missing chain ADD: ${identity.asoview_identity}`);
    identity.status = "ADD";
    identity.reason =
      "official operator store page confirms identity, address, current operation, and child-use conditions";
    identity.official_evidence = addition.source_evidence;
    additions.push(addition);
    continue;
  }
  if (chainEvidence) {
    identity.status = "OFFICIAL_EVIDENCE_INSUFFICIENT";
    identity.reason =
      "official operator evidence did not establish every required identity, location, current-operation, and child-use condition";
    identity.official_evidence = chainEvidence;
    continue;
  }
  if (!independent) {
    throw new Error(`unreviewed reverse discovery identity: ${identity.asoview_identity}`);
  }
  if (
    ![
      "ADD",
      "DUPLICATE",
      "NOT_ELIGIBLE",
      "OFFICIAL_EVIDENCE_INSUFFICIENT",
    ].includes(independent.status)
  ) {
    throw new Error(`invalid independent status: ${identity.asoview_identity}`);
  }
  identity.status = independent.status;
  identity.reason = independent.reason;
  identity.official_evidence = independent.official_evidence;
  if (independent.status === "ADD") {
    if (!independent.facility) {
      throw new Error(`independent ADD lacks facility: ${identity.asoview_identity}`);
    }
    additions.push({
      asoview_identity: identity.asoview_identity,
      ...independent.facility,
    });
  }
  if (independent.status === "DUPLICATE") {
    const facility = facilityData.facilities.find(
      (candidate) => candidate.id === independent.facility_id,
    );
    if (!facility) {
      throw new Error(`independent DUPLICATE target missing: ${identity.asoview_identity}`);
    }
    identity.resolved_canon_match = {
      facility_id: facility.id,
      facility_slug: facility.slug,
      facility_name: facility.name,
    };
  }
}

if (ledger.identities.some((identity) => identity.status === "OFFICIAL_REVIEW_REQUIRED")) {
  throw new Error("OFFICIAL_REVIEW_REQUIRED remains after final review");
}

const existingNames = new Set(
  facilityData.facilities.map((facility) => normalize(facility.name)),
);
const additionNames = new Set();
for (const addition of additions) {
  validateAddition(addition);
  const name = normalize(addition.name);
  if (existingNames.has(name) || additionNames.has(name)) {
    throw new Error(`duplicate facility ADD name: ${addition.name}`);
  }
  additionNames.add(name);
}

let nextId = Math.max(...facilityData.facilities.map((facility) => facility.id)) + 1;
const addedFacilities = additions.map((addition) =>
  buildFacility(addition, nextId++),
);
facilityData.facilities.push(...addedFacilities);
updateMetadata(facilityData, additions);

const addedFacilityByIdentity = new Map(
  additions.map((addition, index) => [
    addition.asoview_identity,
    addedFacilities[index],
  ]),
);
for (const identity of ledger.identities.filter(
  (candidate) => candidate.status === "ADD",
)) {
  const facility = addedFacilityByIdentity.get(identity.asoview_identity);
  if (!facility) throw new Error(`ADD facility missing: ${identity.asoview_identity}`);
  identity.added_facility = {
    id: facility.id,
    slug: facility.slug,
    name: facility.name,
  };
}

const canonHash = createHash("sha256")
  .update(JSON.stringify(facilityData))
  .digest("hex");
rakutenActions.coverage.facility_canon_count = facilityData.facilities.length;
rakutenActions.coverage.facility_canon_sha256 = canonHash;

const finalStatuses = [
  "ADD",
  "DUPLICATE",
  "NOT_ELIGIBLE",
  "ASOVIEW_DETAIL_UNAVAILABLE",
  "OFFICIAL_EVIDENCE_INSUFFICIENT",
];
ledger.schema_version = 2;
ledger.finalized_at = "2026-08-26";
ledger.coverage.status_counts = Object.fromEntries(
  finalStatuses.map((status) => [
    status,
    ledger.identities.filter((identity) => identity.status === status).length,
  ]),
);
ledger.coverage.facilities_added = addedFacilities.length;
ledger.coverage.final_facility_canon_count = facilityData.facilities.length;
ledger.coverage.final_facility_canon_sha256 = canonHash;

const report = `# アソビュー！施設逆引き discovery 監査（2026-08-26）

## 結論

アソビュー公開カタログのprovider identityを全件prefilterし、家族向け常設施設のsignalがある ${ledger.identities.length.toLocaleString("ja-JP")} identityを施設単位で再確認した。アソビュー掲載は候補発見にだけ使い、既存FacilityOps掲載基準は変更していない。運営主体・自治体等の公式一次情報で施設identity、所在地、現行営業、子どもの利用条件を確認できた ${addedFacilities.length.toLocaleString("ja-JP")}施設だけをcanonへ追加した。

| final status | 件数 | 判定 |
|---|---:|---|
| ADD | ${ledger.coverage.status_counts.ADD} | 公式一次情報の4条件を確認しcanonへ追加 |
| DUPLICATE | ${ledger.coverage.status_counts.DUPLICATE} | 既存canonの同一施設へ解決 |
| NOT_ELIGIBLE | ${ledger.coverage.status_counts.NOT_ELIGIBLE} | ツアー、集合場所、飲食、ホテル付帯、単発・期間イベント等 |
| ASOVIEW_DETAIL_UNAVAILABLE | ${ledger.coverage.status_counts.ASOVIEW_DETAIL_UNAVAILABLE} | 公開詳細を取得できず安全側に除外 |
| OFFICIAL_EVIDENCE_INSUFFICIENT | ${ledger.coverage.status_counts.OFFICIAL_EVIDENCE_INSUFFICIENT} | 公式一次情報の必要4条件が揃わず追加しない |
| **計** | **${ledger.identities.length}** | 家族向け施設signalを持つ全identity候補 |

## 掲載判定

1. アソビュー掲載、商品名、割引表記はcanon採用根拠にしていない。
2. 公式の現行店舗・施設ページで正式名称、住所、営業時間または現行営業案内、子ども料金・年齢・同伴条件を確認した。
3. 同一チェーンでも店舗ごとにidentityと住所を照合し、公式現行店舗一覧にない店舗は追加していない。
4. ツアー集合場所、レンタルのみ、飲食・宿泊のみ、単発・期間限定イベントはcanonへ追加していない。
5. 全identityの最終判定、アソビューURL、canon対応、公式根拠は[候補監査JSON](./asoview-reverse-discovery-candidates-2026-08-26.json)に記録した。

## セキュリティ

公開ページだけを未認証で確認した。ValueCommerce/アソビューのログイン、パスワード、Cookie、session、認証トークンは使用・保存していない。
`;

await Promise.all([
  writeFile(
    PATHS.facilities,
    `${JSON.stringify(facilityData, null, 2)}\n`,
    "utf8",
  ),
  writeFile(
    PATHS.rakutenActions,
    `${JSON.stringify(rakutenActions, null, 2)}\n`,
    "utf8",
  ),
  writeFile(PATHS.ledger, `${JSON.stringify(ledger, null, 2)}\n`, "utf8"),
  writeFile(PATHS.report, report, "utf8"),
]);

console.log(
  JSON.stringify(
    {
      facilities_added: addedFacilities.length,
      facility_total: facilityData.facilities.length,
      canon_sha256: canonHash,
      status_counts: ledger.coverage.status_counts,
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
  if (officialUrl.protocol !== "https:" || officialUrl.hostname.endsWith("asoview.com")) {
    throw new Error(`ADD source is not independent official HTTPS: ${addition.name}`);
  }
  if (!addition.source_evidence?.checked_at) {
    throw new Error(`ADD official evidence missing: ${addition.name}`);
  }
}

function buildFacility(addition, id) {
  const experiences = addition.experiences;
  const indoorOutdoor = addition.indoor_outdoor ?? "屋内";
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
    rain_friendly:
      addition.rain_friendly ?? (indoorOutdoor === "屋内" ? "◎" : "△"),
    is_free: false,
    fee_type: "有料",
    adult_fee: addition.adult_fee,
    child_fee: addition.child_fee,
    description: `${addition.name}は、${addition.summary} 公式一次情報で施設identity、所在地、現行営業、子ども利用条件を確認しています。`,
    target_age: addition.target_age,
    url: addition.url,
    tags: [
      "有料",
      indoorOutdoor === "屋内"
        ? "完全屋内"
        : indoorOutdoor === "両方"
          ? "屋内外両方"
          : "屋外",
    ],
    latitude: addition.latitude,
    longitude: addition.longitude,
    geocode_source: addition.geocode_source ?? "gsi_address_search",
    signature_experiences: experiences,
    unique_selling_point: addition.summary,
    experience_tags: experiences.map((value) => value.replace(/する$/u, "")),
    summer_water_play: "×",
    recommended_for_tags: ["athletic", "experience"],
    things_to_do: experiences,
    source_urls: addition.url,
    source_notes:
      addition.geocode_source === "gsi_address_search"
        ? "運営主体等の公式一次情報で正式名称、所在地、2026年8月時点の営業、子ども利用条件を確認。座標は国土地理院住所検索を採用。"
        : "運営主体等の公式一次情報で正式名称、所在地、2026年8月時点の営業、子ども利用条件を確認。座標は公式住所と一致したアソビュー公開施設ページの地図座標を補助値として採用。",
    source_checked_at: "2026-08-26",
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
      (item) => item.id === addition.prefecture_id,
    );
    const category = facilities.metadata.categories.find(
      (item) => item.id === addition.category_id,
    );
    if (!prefecture || !category) {
      throw new Error(`ADD metadata missing: ${addition.name}`);
    }
    prefecture.count += 1;
    category.count += 1;
  }
}

function normalize(value) {
  return String(value ?? "")
    .normalize("NFKC")
    .toLocaleLowerCase("ja")
    .replace(/[\s\p{P}\p{S}]/gu, "");
}

function normalizeAddress(value) {
  return normalize(String(value ?? "").replace(/〒\d{3}-?\d{4}/gu, ""));
}
