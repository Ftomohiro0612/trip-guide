import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const APPLY = process.argv.includes("--apply");
const paths = {
  priorAudit: resolve(ROOT, "docs/audits/asoview-reverse-discovery-second-pass-final-2026-08-27.json"),
  curation: resolve(ROOT, "scripts/data/asoview-child-use-policy-curation-2026-08-27.json"),
  audit: resolve(ROOT, "docs/audits/asoview-child-use-policy-rejudgment-2026-08-27.json"),
  additions: resolve(ROOT, "scripts/data/asoview-child-use-policy-additions-2026-08-27.json"),
  facilities: resolve(ROOT, "data/facilities_data.json"),
  ledger: resolve(ROOT, "docs/audits/asoview-reverse-discovery-candidates-2026-08-26.json"),
  asoviewActions: resolve(ROOT, "data/asoview_facility_actions.json"),
  rakutenActions: resolve(ROOT, "data/rakuten_facility_actions.json"),
  report: resolve(ROOT, "docs/audits/asoview-child-use-policy-rejudgment-2026-08-27.md"),
};

const [priorAudit, curation, facilityData, ledger, asoviewActions, rakutenActions] =
  await Promise.all([
    readJson(paths.priorAudit),
    readJson(paths.curation),
    readJson(paths.facilities),
    readJson(paths.ledger),
    readJson(paths.asoviewActions),
    readJson(paths.rakutenActions),
  ]);

const targets = priorAudit.reviews.filter(
  (review) => review.final_status === "OFFICIAL_EVIDENCE_INSUFFICIENT",
);
if (targets.length !== 538) throw new Error(`expected 538 targets, got ${targets.length}`);

const childOnly = targets.filter(
  (review) =>
    review.final_missing_conditions.length === 1 &&
    review.final_missing_conditions[0] === "child_use",
);
if (childOnly.length !== 30) throw new Error(`expected 30 child-only targets, got ${childOnly.length}`);
if (Object.keys(curation.decisions).length !== childOnly.length) {
  throw new Error("curation must resolve every child-only target exactly once");
}
for (const review of childOnly) {
  if (!curation.decisions[review.asoview_identity]) {
    throw new Error(`missing child-only curation: ${review.asoview_identity}`);
  }
}

const reviews = targets.map((review) => rejudge(review, curation.decisions[review.asoview_identity]));
const statusCounts = countBy(reviews, (review) => review.final_status);
const insufficiencyCounts = countBy(
  reviews.filter((review) => review.final_status === "OFFICIAL_EVIDENCE_INSUFFICIENT"),
  (review) => review.final_insufficiency_code,
);
if (
  statusCounts.ADD !== 21 ||
  statusCounts.NOT_ELIGIBLE !== 7 ||
  statusCounts.OFFICIAL_EVIDENCE_INSUFFICIENT !== 510
) {
  throw new Error(`unexpected rejudgment counts: ${JSON.stringify(statusCounts)}`);
}

const additions = [];
for (const review of reviews.filter((entry) => entry.final_status === "ADD")) {
  additions.push(await prepareAddition(review, facilityData));
}

const audit = {
  schema_version: 1,
  checked_at: "2026-08-27",
  policy: {
    required_for_canon: ["identity", "address", "current_operation", "facility_ops_eligibility"],
    child_use: "optional_metadata_official_or_unknown_no_inference",
    fail_closed: ["identity", "address", "current_operation", "facility_ops_eligibility"],
  },
  source_audit: "docs/audits/asoview-reverse-discovery-second-pass-final-2026-08-27.json",
  coverage: {
    target_count: 538,
    completed_count: reviews.length,
    child_only_priority_count: childOnly.length,
    final_status_counts: statusCounts,
    final_insufficiency_counts: insufficiencyCounts,
    child_use_metadata_counts: countBy(reviews, (review) => review.child_use_metadata.status),
    canon_before: facilityData.facilities.length,
    canon_after: facilityData.facilities.length + additions.length,
  },
  reviews,
};
const additionsArtifact = {
  schema_version: 1,
  generated_at: new Date().toISOString(),
  checked_at: "2026-08-27",
  source_audit: "docs/audits/asoview-child-use-policy-rejudgment-2026-08-27.json",
  count: additions.length,
  additions,
};

await Promise.all([
  writeJson(paths.audit, audit),
  writeJson(paths.additions, additionsArtifact),
  writeFile(paths.report, buildReport(audit), "utf8"),
]);

if (APPLY) {
  applyCanon({ audit, additions, facilityData, ledger, asoviewActions, rakutenActions });
  await Promise.all([
    writeJson(paths.facilities, facilityData),
    writeJson(paths.ledger, ledger),
    writeJson(paths.asoviewActions, asoviewActions),
    writeJson(paths.rakutenActions, rakutenActions),
  ]);
}

console.log(JSON.stringify({ apply: APPLY, ...audit.coverage }, null, 2));

function rejudge(review, decision) {
  const childEvidence = review.evidence?.child_use;
  const childUseMetadata = {
    status: childEvidence?.satisfied ? "confirmed" : "unknown",
    source_url: childEvidence?.satisfied ? childEvidence.url : null,
    notes: childEvidence?.satisfied
      ? childEvidence.excerpt
      : "公式一次情報で子ども料金・年齢・同伴条件を確認できずunknown。推測はしていない。",
  };
  const base = {
    asoview_identity: review.asoview_identity,
    previous_status: review.final_status,
    previous_insufficiency_code: review.final_insufficiency_code,
    previous_missing_conditions: review.final_missing_conditions,
    evidence: review.evidence,
    child_use_metadata: childUseMetadata,
    review_complete: true,
  };

  if (decision) {
    if (decision.child_use_status) childUseMetadata.status = decision.child_use_status;
    if (decision.child_use_notes) childUseMetadata.notes = decision.child_use_notes;
    if (decision.status === "ADD") {
      const evidence = normalizeAddEvidence(review.evidence, decision);
      for (const condition of ["identity", "address", "current_operation"]) {
        if (!evidence[condition]?.satisfied || !evidence[condition].url) {
          throw new Error(`ADD lacks ${condition}: ${review.asoview_identity}`);
        }
      }
      return {
        ...base,
        final_status: "ADD",
        final_missing_conditions: [],
        final_insufficiency_code: null,
        reason: "Child-use evidence is not a canon gate; required official evidence and FacilityOps eligibility are confirmed.",
        evidence,
        facility_ops_eligibility: {
          satisfied: true,
          basis: decision.eligibility_basis,
        },
        canonical_name: decision.canonical_name ?? cleanName(review.asoview_identity),
        canonical_address: decision.address ?? cleanAddress(evidence.address.value),
        official_url: decision.official_url ?? chooseOfficialUrl(evidence),
      };
    }
    if (decision.status === "NOT_ELIGIBLE") {
      return {
        ...base,
        final_status: "NOT_ELIGIBLE",
        final_missing_conditions: [],
        final_insufficiency_code: null,
        reason: decision.reason,
        facility_ops_eligibility: { satisfied: false, basis: decision.reason },
      };
    }
    const missing = decision.missing_conditions;
    return {
      ...base,
      final_status: "OFFICIAL_EVIDENCE_INSUFFICIENT",
      final_missing_conditions: missing,
      final_insufficiency_code: insufficiencyCode(missing),
      reason: decision.reason,
      facility_ops_eligibility: { satisfied: null, basis: "Required official evidence is unresolved." },
    };
  }

  const missing = review.final_missing_conditions.filter((condition) => condition !== "child_use");
  if (missing.length === 0) throw new Error(`unreviewed child-only target: ${review.asoview_identity}`);
  return {
    ...base,
    final_status: "OFFICIAL_EVIDENCE_INSUFFICIENT",
    final_missing_conditions: missing,
    final_insufficiency_code: insufficiencyCode(missing),
    reason: `Required official evidence remains insufficient: ${missing.join(", ")}`,
    facility_ops_eligibility: { satisfied: null, basis: "Required official evidence is unresolved." },
  };
}

function normalizeAddEvidence(evidence, decision) {
  const normalized = structuredClone(evidence);
  if (decision.official_url) {
    normalized.identity = {
      ...normalized.identity,
      satisfied: true,
      url: decision.official_url,
      excerpt: normalized.identity.excerpt || decision.eligibility_basis,
    };
  }
  if (decision.address) {
    normalized.address = { ...normalized.address, satisfied: true, value: decision.address };
  }
  if (decision.current_operation_url) {
    normalized.current_operation = {
      ...normalized.current_operation,
      satisfied: true,
      url: decision.current_operation_url,
      excerpt: decision.eligibility_basis,
    };
  }
  normalized.identity.excerpt ||= decision.eligibility_basis;
  normalized.current_operation.excerpt ||= decision.eligibility_basis;
  return normalized;
}

async function prepareAddition(review, facilityData) {
  const address = review.canonical_address;
  const prefecture = facilityData.metadata.prefectures.find((entry) => address.includes(entry.name));
  if (!prefecture) throw new Error(`unknown prefecture: ${review.asoview_identity} / ${address}`);
  const coordinates = await geocode(address);
  const classification = classify(review.canonical_name);
  const fee = feeMetadata(review.canonical_name);
  return {
    asoview_identity: review.asoview_identity,
    name: review.canonical_name,
    prefecture: prefecture.name,
    prefecture_id: prefecture.id,
    category: classification.category,
    category_id: classification.categoryId,
    address,
    latitude: coordinates.latitude,
    longitude: coordinates.longitude,
    geocode_source: "gsi_address_search",
    url: review.official_url,
    ...fee,
    child_fee: review.child_use_metadata.status === "unknown" ? "unknown" : "公式情報あり",
    target_age: review.child_use_metadata.status === "unknown" ? "unknown" : "公式情報あり",
    child_use_status: review.child_use_metadata.status,
    child_use_notes: review.child_use_metadata.notes,
    summary: classification.summary,
    experiences: classification.experiences,
    indoor_outdoor: classification.indoorOutdoor,
    rain_friendly: classification.indoorOutdoor === "屋内" ? "◎" : "△",
    recommended_for_tags: classification.recommendedTags,
    source_evidence: {
      identity: review.evidence.identity,
      address: review.evidence.address,
      current_operation: review.evidence.current_operation,
      child_use: review.evidence.child_use,
      facility_ops_eligibility: review.facility_ops_eligibility,
      checked_at: "2026-08-27",
    },
  };
}

function applyCanon({ audit, additions, facilityData, ledger, asoviewActions, rakutenActions }) {
  const before = facilityData.facilities.length;
  if (before !== 5208) throw new Error(`unexpected canon baseline: ${before}`);
  const existingNames = new Set(facilityData.facilities.map((facility) => normalize(facility.name)));
  let nextId = Math.max(...facilityData.facilities.map((facility) => facility.id)) + 1;
  const addedByIdentity = new Map();
  for (const addition of additions) {
    if (existingNames.has(normalize(addition.name))) throw new Error(`duplicate canon name: ${addition.name}`);
    const facility = buildFacility(addition, nextId++);
    facilityData.facilities.push(facility);
    existingNames.add(normalize(addition.name));
    addedByIdentity.set(addition.asoview_identity, facility);
    facilityData.metadata.prefectures.find((entry) => entry.id === addition.prefecture_id).count += 1;
    facilityData.metadata.categories.find((entry) => entry.id === addition.category_id).count += 1;
  }
  facilityData.metadata.total_facilities = facilityData.facilities.length;

  const ledgerByIdentity = new Map(ledger.identities.map((entry) => [entry.asoview_identity, entry]));
  for (const review of audit.reviews) {
    const entry = ledgerByIdentity.get(review.asoview_identity);
    if (!entry) throw new Error(`ledger identity missing: ${review.asoview_identity}`);
    entry.status = review.final_status;
    entry.reason = review.reason;
    entry.child_use_policy_rejudgment = {
      audit_ref: "docs/audits/asoview-child-use-policy-rejudgment-2026-08-27.json",
      checked_at: "2026-08-27",
      previous_missing_conditions: review.previous_missing_conditions,
      required_missing_conditions: review.final_missing_conditions,
      final_status: review.final_status,
      child_use_metadata: review.child_use_metadata,
    };
    if (review.final_status === "ADD") {
      const facility = addedByIdentity.get(review.asoview_identity);
      entry.added_facility = { id: facility.id, slug: facility.slug, name: facility.name };
    }
    if (review.final_status === "NOT_ELIGIBLE") {
      entry.not_eligible_basis = { category: "facility_ops_ineligible", detail: review.reason };
    }
  }

  const hash = createHash("sha256").update(JSON.stringify(facilityData)).digest("hex");
  for (const actions of [asoviewActions, rakutenActions]) {
    actions.coverage.audited_at = "2026-08-27";
    actions.coverage.facility_canon_count = facilityData.facilities.length;
    actions.coverage.facility_canon_sha256 = hash;
  }
  asoviewActions.coverage.reverse_discovery_add_count += additions.length;
  asoviewActions.coverage.reverse_discovery_child_use_policy_rejudgment_count = 538;
  asoviewActions.coverage.reverse_discovery_child_use_policy_add_count = additions.length;

  ledger.schema_version = 4;
  ledger.finalized_at = "2026-08-27";
  const statuses = ["ADD", "DUPLICATE", "NOT_ELIGIBLE", "ASOVIEW_DETAIL_UNAVAILABLE", "OFFICIAL_EVIDENCE_INSUFFICIENT"];
  ledger.coverage.status_counts = Object.fromEntries(
    statuses.map((status) => [status, ledger.identities.filter((entry) => entry.status === status).length]),
  );
  ledger.coverage.facilities_added = ledger.coverage.status_counts.ADD;
  ledger.coverage.child_use_policy_rejudgment_target_count = 538;
  ledger.coverage.child_use_policy_rejudgment_status_counts = audit.coverage.final_status_counts;
  ledger.coverage.child_use_policy_rejudgment_insufficiency_counts = audit.coverage.final_insufficiency_counts;
  ledger.coverage.child_use_policy_rejudgment_facilities_added = additions.length;
  ledger.coverage.canon_before_child_use_policy_rejudgment = before;
  ledger.coverage.final_facility_canon_count = facilityData.facilities.length;
  ledger.coverage.final_facility_canon_sha256 = hash;
}

function buildFacility(addition, id) {
  const sourceUrls = [...new Set([
    addition.source_evidence.identity.url,
    addition.source_evidence.address.url,
    addition.source_evidence.current_operation.url,
    addition.source_evidence.child_use?.satisfied ? addition.source_evidence.child_use.url : null,
  ].filter(Boolean))].join(", ");
  return {
    id,
    slug: `facility-${id}`,
    name: addition.name,
    prefecture: addition.prefecture,
    prefecture_id: addition.prefecture_id,
    category: addition.category,
    category_id: addition.category_id,
    address: addition.address,
    indoor_outdoor: addition.indoor_outdoor,
    rain_friendly: addition.rain_friendly,
    is_free: addition.is_free,
    fee_type: addition.fee_type,
    adult_fee: addition.adult_fee,
    child_fee: addition.child_fee,
    child_use_status: addition.child_use_status,
    child_use_notes: addition.child_use_notes,
    description: `${addition.name}は、${addition.summary} 公式一次情報で施設identity、所在地、現行営業を確認しています。子ども利用条件は確認できないためunknownです。`,
    target_age: addition.target_age,
    url: addition.url,
    tags: [addition.fee_type, addition.indoor_outdoor === "屋内" ? "完全屋内" : addition.indoor_outdoor === "両方" ? "屋内外両方" : "屋外"],
    latitude: addition.latitude,
    longitude: addition.longitude,
    geocode_source: addition.geocode_source,
    signature_experiences: addition.experiences,
    unique_selling_point: addition.summary,
    experience_tags: addition.experiences,
    summer_water_play: "×",
    recommended_for_tags: addition.recommended_for_tags,
    things_to_do: addition.experiences,
    source_urls: sourceUrls,
    source_checked_at: "2026-08-27",
    data_quality_status: "confirmed",
    source_notes: "公式一次情報でexact identity、所在地、現行営業、FacilityOps適格性を確認。child-use metadataは公式根拠を確認できずunknown（推測なし）。座標は国土地理院住所検索。",
    image: null,
    image_attribution: null,
    image_source: null,
  };
}

async function geocode(address) {
  const response = await fetch(`https://msearch.gsi.go.jp/address-search/AddressSearch?q=${encodeURIComponent(address)}`, {
    headers: { "User-Agent": "Memorip-FacilityOps/1.0 (official evidence policy rejudgment)" },
  });
  if (!response.ok) throw new Error(`GSI geocode failed ${response.status}: ${address}`);
  const rows = await response.json();
  const [longitude, latitude] = rows?.[0]?.geometry?.coordinates ?? [];
  if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) throw new Error(`GSI geocode unavailable: ${address}`);
  if (latitude < 24 || latitude > 46 || longitude < 122 || longitude > 154) throw new Error(`GSI coordinates outside Japan: ${address}`);
  return { latitude, longitude };
}

function classify(name) {
  const rules = [
    [/ハピピランド/u, "屋内遊び場", "indoor-play", "屋内遊具やゲームを利用できる常設施設です。", ["屋内で遊ぶ", "身体を動かす", "ゲームを楽しむ"], "屋内", ["playground", "athletic"]],
    [/ウミガメ/u, "水族館", "aquarium", "ウミガメの展示・観察と資料見学ができる常設施設です。", ["ウミガメを観察", "資料展示を見学", "保護活動を学ぶ"], "両方", ["animal", "exhibition", "science"]],
    [/美術館/u, "美術館・体験", "art-museum", "作品展示を鑑賞できる常設美術館です。", ["作品を鑑賞", "工芸技法を知る", "展示室を巡る"], "屋内", ["exhibition", "craft"]],
    [/記念館|旧庁舎/u, "博物館", "museum", "地域の歴史や文化に触れられる常設施設です。", ["展示を見学", "歴史を知る", "建物を巡る"], "屋内", ["exhibition", "science"]],
    [/農園|果樹園|ストロベリー/u, "味覚狩り", "fruit-picking", "季節の収穫体験を継続して提供する観光農園です。", ["収穫を体験", "旬の作物を知る", "農園を訪ねる"], "屋外", ["experience", "nature", "food"]],
    [/牧場/u, "体験", "experience", "牧場見学や体験を提供する常設施設です。", ["牧場を見学", "動物とふれあう", "自然の中で過ごす"], "屋外", ["animal", "animal_contact", "nature"]],
    [/ムラサキパーク/u, "アスレチック", "athletic", "スケートボードやBMXを利用できる常設パークです。", ["スケートパークを利用", "BMXを体験", "用具をレンタル"], "両方", ["athletic", "experience"]],
    [/工房|窯翔庵/u, "クラフト体験", "craft", "予約してものづくりを体験できる常設工房です。", ["作品づくりを体験", "道具を使う", "完成品を受け取る"], "屋内", ["craft", "experience"]],
    [/公園/u, "公園・自然", "nature-park", "園内見学や自然体験ができる常設公園です。", ["園内を散策", "自然を観察", "施設を見学"], "屋外", ["nature", "wide_space"]],
    [/フィッシング|乗馬/u, "体験", "experience", "予約・受付を通じてアクティビティを利用できる常設施設です。", ["アクティビティを体験", "道具や設備を利用", "屋外で過ごす"], "屋外", ["experience", "nature"]],
    [/KAERU Adventure/u, "公園・自然", "nature-park", "固定拠点でキャンプとアウトドア体験を提供する常設施設です。", ["キャンプを楽しむ", "カヤックを体験", "自然の中で過ごす"], "屋外", ["experience", "nature"]],
  ];
  const match = rules.find(([pattern]) => pattern.test(name));
  if (!match) throw new Error(`classification missing: ${name}`);
  const [, category, categoryId, summary, experiences, indoorOutdoor, recommendedTags] = match;
  return { category, categoryId, summary, experiences, indoorOutdoor, recommendedTags };
}

function feeMetadata(name) {
  const admissionFree = /ふじさん牧場|森のぞうがん美術館|東松山市農林公園|道の駅 紀宝町ウミガメ公園/u.test(name);
  return admissionFree
    ? { is_free: true, fee_type: "無料", adult_fee: "入場無料（体験・商品等は別料金の場合あり）" }
    : { is_free: false, fee_type: "有料", adult_fee: "公式料金は公式サイトで要確認" };
}

function insufficiencyCode(missing) {
  if (missing.length > 1) return "MULTIPLE_EVIDENCE_INSUFFICIENT";
  return {
    identity: "IDENTITY_INSUFFICIENT",
    address: "ADDRESS_INSUFFICIENT",
    current_operation: "CURRENT_OPERATION_INSUFFICIENT",
  }[missing[0]];
}

function chooseOfficialUrl(evidence) {
  return evidence.identity.url || evidence.current_operation.url;
}

function cleanName(value) {
  return String(value).replace(/\s+/gu, " ").trim();
}

function cleanAddress(value) {
  return String(value ?? "")
    .normalize("NFKC")
    .replace(/^日本、/u, "")
    .replace(/^〒\s*\d{3}-?\d{4}\s*/u, "")
    .replace(/\s+/gu, " ")
    .trim();
}

function normalize(value) {
  return cleanName(value).normalize("NFKC").toLocaleLowerCase("ja").replace(/[\s\p{P}\p{S}]/gu, "");
}

function countBy(rows, key) {
  return Object.fromEntries([...new Set(rows.map(key))].sort().map((value) => [value, rows.filter((row) => key(row) === value).length]));
}

function buildReport(audit) {
  const statuses = audit.coverage.final_status_counts;
  const insuff = audit.coverage.final_insufficiency_counts;
  return `# Asoview child-use policy再判定監査（2026-08-27）\n\n## 結論\n\nOwner policy changeに従い、second-pass後に残った538候補を全件再判定した。child-use evidenceはcanon掲載の必須条件から外し、公式情報がなければ\`unknown\`として記録する。identity・所在地・現行営業・FacilityOps上の常設施設適格性は引き続き必須で、いずれかが不足する候補はfail-closedとした。Asoview掲載自体は採用根拠に使用していない。\n\n## 最終判定\n\n| status | 件数 |\n|---|---:|\n| ADD | ${statuses.ADD} |\n| NOT_ELIGIBLE | ${statuses.NOT_ELIGIBLE} |\n| OFFICIAL_EVIDENCE_INSUFFICIENT | ${statuses.OFFICIAL_EVIDENCE_INSUFFICIENT} |\n| **計** | **538** |\n\n## 残存不足理由\n\n| 不足理由 | 件数 |\n|---|---:|\n| ADDRESS_INSUFFICIENT | ${insuff.ADDRESS_INSUFFICIENT ?? 0} |\n| CURRENT_OPERATION_INSUFFICIENT | ${insuff.CURRENT_OPERATION_INSUFFICIENT ?? 0} |\n| IDENTITY_INSUFFICIENT | ${insuff.IDENTITY_INSUFFICIENT ?? 0} |\n| MULTIPLE_EVIDENCE_INSUFFICIENT | ${insuff.MULTIPLE_EVIDENCE_INSUFFICIENT ?? 0} |\n| **計** | **${statuses.OFFICIAL_EVIDENCE_INSUFFICIENT}** |\n\n## Canon\n\n- before: ${audit.coverage.canon_before}\n- added: ${statuses.ADD}\n- after: ${audit.coverage.canon_after}\n\nADDは全件、監査JSONにidentity・address・current_operationの公式一次根拠とFacilityOps適格性根拠を保持する。child-use metadataは公式根拠がない場合\`unknown\`で、推測による子ども利用可の断定は行わない。\n`;
}

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

async function writeJson(path, value) {
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}
