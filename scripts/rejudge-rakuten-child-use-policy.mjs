import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const APPLY = process.argv.includes("--apply");
const paths = {
  curation: resolve(ROOT, "scripts/data/rakuten-child-use-policy-curation-2026-08-27.json"),
  audit: resolve(ROOT, "docs/audits/rakuten-child-use-policy-rejudgment-2026-08-27.json"),
  report: resolve(ROOT, "docs/audits/rakuten-child-use-policy-rejudgment-2026-08-27.md"),
  additions: resolve(ROOT, "scripts/data/rakuten-child-use-policy-additions-2026-08-27.json"),
  ledger: resolve(ROOT, "docs/audits/rakuten-facility-discovery-candidates-2026-08-26.json"),
  asoviewLedger: resolve(ROOT, "docs/audits/asoview-reverse-discovery-candidates-2026-08-26.json"),
  facilities: resolve(ROOT, "data/facilities_data.json"),
  rakutenActions: resolve(ROOT, "data/rakuten_facility_actions.json"),
  asoviewActions: resolve(ROOT, "data/asoview_facility_actions.json"),
};

const [curation, ledger, asoviewLedger, facilityData, rakutenActions, asoviewActions] =
  await Promise.all([
    readJson(paths.curation),
    readJson(paths.ledger),
    readJson(paths.asoviewLedger),
    readJson(paths.facilities),
    readJson(paths.rakutenActions),
    readJson(paths.asoviewActions),
  ]);

const targets = ledger.identities.filter((entry) => entry.status === "OFFICIAL_EVIDENCE_INSUFFICIENT");
if (targets.length !== 14) throw new Error(`expected 14 targets, got ${targets.length}`);
if (Object.keys(curation.decisions).length !== 14) throw new Error("curation must contain 14 decisions");
for (const target of targets) {
  if (!curation.decisions[target.candidate_id]) throw new Error(`missing decision: ${target.candidate_id}`);
}

const reviews = targets.map((target) => buildReview(target, curation.decisions[target.candidate_id]));
const oldInsufficiencyCounts = countBy(reviews, (review) => review.previous_insufficiency_category);
const finalStatusCounts = countBy(reviews, (review) => review.final_status);
const finalInsufficiencyCounts = countBy(
  reviews.filter((review) => review.final_status === "OFFICIAL_EVIDENCE_INSUFFICIENT"),
  (review) => review.final_insufficiency_code,
);
const childUseMetadataCounts = countBy(reviews, (review) => review.child_use_metadata.status);

assertCounts(oldInsufficiencyCounts, {
  ADDRESS_INSUFFICIENT: 0,
  CHILD_USE_ONLY: 2,
  CURRENT_OPERATION_INSUFFICIENT: 1,
  IDENTITY_INSUFFICIENT: 4,
  MULTIPLE_EVIDENCE_INSUFFICIENT: 7,
});
assertCounts(finalStatusCounts, {
  ADD: 6,
  NOT_ELIGIBLE: 5,
  OFFICIAL_EVIDENCE_INSUFFICIENT: 3,
});
assertCounts(finalInsufficiencyCounts, {
  IDENTITY_INSUFFICIENT: 3,
});
assertCounts(childUseMetadataCounts, {
  confirmed: 7,
  not_allowed: 1,
  restricted: 2,
  unknown: 4,
});

const additions = reviews
  .filter((review) => review.final_status === "ADD")
  .map((review) => ({
    candidate_id: review.candidate_id,
    product_url: review.product_urls[0],
    product_title: review.product_titles[0],
    child_use_status: review.child_use_metadata.status,
    child_use_notes: review.child_use_metadata.notes,
    source_evidence: review.evidence,
    facility_ops_eligibility: review.facility_ops_eligibility,
    ...curation.decisions[review.candidate_id].facility,
  }));

const canonBefore = facilityData.facilities.length;
if (canonBefore !== 5229) throw new Error(`unexpected canon baseline: ${canonBefore}`);
const audit = {
  schema_version: 1,
  checked_at: "2026-08-27",
  policy: {
    required_for_canon: ["identity", "address", "current_operation", "facility_ops_eligibility"],
    child_use: "optional_metadata_official_or_unknown_no_inference",
    statuses: ["confirmed", "unknown", "restricted", "not_allowed"],
    fail_closed: ["identity", "address", "current_operation", "facility_ops_eligibility"],
  },
  scope: {
    source_status: "OFFICIAL_EVIDENCE_INSUFFICIENT",
    target_count: 14,
    excluded_statuses: ["RAKUTEN_DETAIL_UNAVAILABLE", "DUPLICATE", "NOT_ELIGIBLE", "ADD"],
  },
  coverage: {
    target_count: 14,
    completed_count: reviews.length,
    previous_insufficiency_counts: oldInsufficiencyCounts,
    final_status_counts: finalStatusCounts,
    final_insufficiency_counts: finalInsufficiencyCounts,
    child_use_metadata_counts: childUseMetadataCounts,
    added_child_use_unknown_count: additions.filter((entry) => entry.child_use_status === "unknown").length,
    canon_before: canonBefore,
    canon_after: canonBefore + additions.length,
  },
  reviews,
};
const additionsArtifact = {
  schema_version: 1,
  generated_at: new Date().toISOString(),
  checked_at: "2026-08-27",
  source_audit: "docs/audits/rakuten-child-use-policy-rejudgment-2026-08-27.json",
  count: additions.length,
  additions,
};

await Promise.all([
  writeJson(paths.audit, audit),
  writeJson(paths.additions, additionsArtifact),
  writeFile(paths.report, buildReport(audit), "utf8"),
]);

if (APPLY) {
  applyCanon({ audit, additions, facilityData, ledger, asoviewLedger, rakutenActions, asoviewActions });
  await Promise.all([
    writeJson(paths.facilities, facilityData),
    writeJson(paths.ledger, ledger),
    writeJson(paths.asoviewLedger, asoviewLedger),
    writeJson(paths.rakutenActions, rakutenActions),
    writeJson(paths.asoviewActions, asoviewActions),
  ]);
}

console.log(JSON.stringify({ apply: APPLY, ...audit.coverage }, null, 2));

function buildReview(target, decision) {
  if (!decision.final_status) throw new Error(`decision status missing: ${target.candidate_id}`);
  const finalMissing = decision.final_status === "OFFICIAL_EVIDENCE_INSUFFICIENT"
    ? decision.final_missing_conditions
    : [];
  if (finalMissing?.includes("child_use")) throw new Error(`child_use cannot remain required: ${target.candidate_id}`);
  if (decision.final_status === "ADD") {
    for (const condition of ["identity", "address", "current_operation"]) {
      if (!decision.evidence[condition]?.satisfied || !decision.evidence[condition].url) {
        throw new Error(`ADD lacks ${condition}: ${target.candidate_id}`);
      }
    }
    if (decision.facility_ops_eligibility?.satisfied !== true || !decision.facility) {
      throw new Error(`ADD lacks FacilityOps evidence: ${target.candidate_id}`);
    }
  }
  return {
    candidate_id: target.candidate_id,
    extracted_identity: target.extracted_identity,
    product_ids: target.product_ids,
    product_urls: target.product_urls,
    product_titles: target.product_titles,
    previous_status: target.status,
    previous_reason: target.reason,
    previous_insufficiency_category: decision.previous_insufficiency_category,
    previous_missing_conditions: decision.previous_missing_conditions,
    evidence: decision.evidence,
    child_use_metadata: decision.child_use_metadata,
    facility_ops_eligibility: decision.facility_ops_eligibility,
    final_status: decision.final_status,
    final_missing_conditions: finalMissing,
    final_insufficiency_code: finalMissing?.length ? insufficiencyCode(finalMissing) : null,
    reason: decision.reason,
    review_complete: true,
  };
}

function applyCanon({ audit, additions, facilityData, ledger, asoviewLedger, rakutenActions, asoviewActions }) {
  const existingNames = new Set(facilityData.facilities.map((facility) => normalize(facility.name)));
  const addedByCandidate = new Map();
  let nextId = Math.max(...facilityData.facilities.map((facility) => facility.id)) + 1;
  for (const addition of additions) {
    if (existingNames.has(normalize(addition.name))) throw new Error(`duplicate canon name: ${addition.name}`);
    const facility = buildFacility(addition, nextId++);
    facilityData.facilities.push(facility);
    existingNames.add(normalize(addition.name));
    addedByCandidate.set(addition.candidate_id, facility);
    facilityData.metadata.prefectures.find((entry) => entry.id === addition.prefecture_id).count += 1;
    facilityData.metadata.categories.find((entry) => entry.id === addition.category_id).count += 1;
  }
  facilityData.metadata.total_facilities = facilityData.facilities.length;

  const reviewsById = new Map(audit.reviews.map((review) => [review.candidate_id, review]));
  for (const entry of ledger.identities) {
    const review = reviewsById.get(entry.candidate_id);
    if (!review) continue;
    entry.status = review.final_status;
    entry.reason = review.reason;
    entry.child_use_policy_rejudgment = {
      audit_ref: "docs/audits/rakuten-child-use-policy-rejudgment-2026-08-27.json",
      checked_at: "2026-08-27",
      previous_insufficiency_category: review.previous_insufficiency_category,
      previous_missing_conditions: review.previous_missing_conditions,
      required_missing_conditions: review.final_missing_conditions,
      child_use_metadata: review.child_use_metadata,
      final_status: review.final_status,
    };
    const facility = addedByCandidate.get(entry.candidate_id);
    if (facility) entry.added_facility = { id: facility.id, slug: facility.slug, name: facility.name };
    if (review.final_status === "NOT_ELIGIBLE") {
      entry.not_eligible_basis = { category: "facility_ops_ineligible", detail: review.reason };
    }
  }

  const statuses = ["ADD", "DUPLICATE", "NOT_ELIGIBLE", "RAKUTEN_DETAIL_UNAVAILABLE", "OFFICIAL_EVIDENCE_INSUFFICIENT"];
  ledger.schema_version = 3;
  ledger.followup_reviewed_at = "2026-08-27";
  ledger.coverage.final_status_counts = Object.fromEntries(
    statuses.map((status) => [status, ledger.identities.filter((entry) => entry.status === status).length]),
  );
  ledger.coverage.evidence_insufficient_followup = {
    ...ledger.coverage.evidence_insufficient_followup,
    identity_visible_add: 92,
    identity_visible_not_eligible: 352,
    identity_visible_official_evidence_insufficient: 3,
    facilities_added: 93,
  };
  ledger.coverage.child_use_policy_rejudgment_target_count = 14;
  ledger.coverage.child_use_policy_rejudgment_status_counts = audit.coverage.final_status_counts;
  ledger.coverage.child_use_policy_previous_insufficiency_counts = audit.coverage.previous_insufficiency_counts;
  ledger.coverage.child_use_policy_final_insufficiency_counts = audit.coverage.final_insufficiency_counts;
  ledger.coverage.child_use_policy_unknown_count = audit.coverage.child_use_metadata_counts.unknown;
  ledger.coverage.child_use_policy_facilities_added = additions.length;
  ledger.coverage.canon_before_child_use_policy_rejudgment = audit.coverage.canon_before;

  const hash = createHash("sha256").update(JSON.stringify(facilityData)).digest("hex");
  for (const actions of [rakutenActions, asoviewActions]) {
    actions.coverage.audited_at = "2026-08-27";
    actions.coverage.facility_canon_count = facilityData.facilities.length;
    actions.coverage.facility_canon_sha256 = hash;
  }
  rakutenActions.coverage.reverse_discovery_add_count += additions.length;
  rakutenActions.coverage.reverse_discovery_followup_add_count += additions.length;
  rakutenActions.coverage.reverse_discovery_child_use_policy_rejudgment_count = 14;
  rakutenActions.coverage.reverse_discovery_child_use_policy_add_count = additions.length;
  const offerSlugs = new Set(rakutenActions.offers.map((offer) => offer.facility_slug));
  for (const addition of additions) {
    const facility = addedByCandidate.get(addition.candidate_id);
    if (offerSlugs.has(facility.slug)) throw new Error(`duplicate Rakuten offer: ${facility.slug}`);
    rakutenActions.offers.push({
      facility_id: facility.id,
      facility_slug: facility.slug,
      facility_name: facility.name,
      action_type: addition.category_id === "art-museum" || addition.category_id === "hot-spring-pool" ? "ticket" : "experience",
      label: addition.category_id === "art-museum" || addition.category_id === "hot-spring-pool" ? "楽天でチケットを見る" : "楽天で体験予約を見る",
      url: addition.product_url,
      verified_at: "2026-08-27",
      verification: {
        rakuten_title: addition.product_title,
        same_facility_basis: "楽天商品詳細の施設identityと公式一次情報の施設名・所在地が一致",
        availability_basis: "公開中の商品詳細で販売導線を確認",
      },
    });
  }
  rakutenActions.offers.sort((a, b) => a.facility_id - b.facility_id);

  ledger.coverage.final_facility_canon_count = facilityData.facilities.length;
  ledger.coverage.final_facility_canon_sha256 = hash;
  asoviewLedger.coverage.final_facility_canon_count = facilityData.facilities.length;
  asoviewLedger.coverage.final_facility_canon_sha256 = hash;
}

function buildFacility(addition, id) {
  const childKnown = addition.child_use_status !== "unknown";
  const sourceUrls = [...new Set([
    addition.source_evidence.identity.url,
    addition.source_evidence.address.url,
    addition.source_evidence.current_operation.url,
    addition.child_use_status !== "unknown" ? addition.child_use_notes && curation.decisions[addition.candidate_id].child_use_metadata.source_url : null,
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
    is_free: false,
    fee_type: addition.fee_type,
    adult_fee: addition.adult_fee,
    child_fee: addition.child_fee,
    child_use_status: addition.child_use_status,
    child_use_notes: addition.child_use_notes,
    description: `${addition.name}は、${addition.summary} 公式一次情報で施設identity、所在地、現行営業を確認しています。${childKnown ? "子ども利用条件は公式情報に基づいて記録しています。" : "子ども利用条件は確認できないためunknownです。"}`,
    target_age: addition.target_age,
    url: addition.url,
    tags: [addition.fee_type, addition.indoor_outdoor === "屋内" ? "完全屋内" : addition.indoor_outdoor === "両方" ? "屋内外両方" : "屋外"],
    latitude: addition.latitude,
    longitude: addition.longitude,
    geocode_source: "gsi_address_search",
    signature_experiences: addition.experiences,
    unique_selling_point: addition.summary,
    experience_tags: addition.experiences,
    summer_water_play: addition.category_id === "scenic" ? "◎" : "×",
    recommended_for_tags: addition.recommended_for_tags,
    things_to_do: addition.experiences,
    source_urls: sourceUrls,
    source_checked_at: "2026-08-27",
    data_quality_status: "confirmed",
    source_notes: `公式一次情報でexact identity、所在地、現行営業、FacilityOps適格性を確認。child-use metadataは${addition.child_use_status}として公式根拠またはunknownを記録（推測なし）。座標は国土地理院住所検索。`,
    image: null,
    image_attribution: null,
    image_source: null,
  };
}

function buildReport(audit) {
  const previous = audit.coverage.previous_insufficiency_counts;
  const statuses = audit.coverage.final_status_counts;
  const insuff = audit.coverage.final_insufficiency_counts;
  const child = audit.coverage.child_use_metadata_counts;
  return `# Rakuten Travel Experiences child-use policy再判定監査（2026-08-27）\n\n## 結論\n\nOwner policy changeをRakuten reverse discoveryへ適用し、従来\`OFFICIAL_EVIDENCE_INSUFFICIENT\`だった14件を全件再判定した。child-use evidenceは任意metadataとし、identity・所在地・現行営業・FacilityOps上の常設施設適格性は必須のまま維持した。\`RAKUTEN_DETAIL_UNAVAILABLE\` 196件、既確定のADD・DUPLICATE・NOT_ELIGIBLEは対象外。\n\n## 旧不足理由\n\n| 旧不足理由 | 件数 |\n|---|---:|\n| child-use情報だけ | ${previous.CHILD_USE_ONLY ?? 0} |\n| identity不足 | ${previous.IDENTITY_INSUFFICIENT ?? 0} |\n| address不足 | ${previous.ADDRESS_INSUFFICIENT ?? 0} |\n| current operation不足 | ${previous.CURRENT_OPERATION_INSUFFICIENT ?? 0} |\n| 複数条件不足 | ${previous.MULTIPLE_EVIDENCE_INSUFFICIENT ?? 0} |\n| **計** | **14** |\n\n## 最終判定\n\n| status | 件数 |\n|---|---:|\n| ADD | ${statuses.ADD} |\n| NOT_ELIGIBLE | ${statuses.NOT_ELIGIBLE} |\n| OFFICIAL_EVIDENCE_INSUFFICIENT | ${statuses.OFFICIAL_EVIDENCE_INSUFFICIENT} |\n| **計** | **14** |\n\n残存不足は \`IDENTITY_INSUFFICIENT\` ${insuff.IDENTITY_INSUFFICIENT ?? 0}件、\`CURRENT_OPERATION_INSUFFICIENT\` ${insuff.CURRENT_OPERATION_INSUFFICIENT ?? 0}件。child-use不足だけを理由に残した候補は0件。\n\n## Child-use metadata\n\n- confirmed: ${child.confirmed ?? 0}\n- unknown: ${child.unknown ?? 0}\n- restricted: ${child.restricted ?? 0}\n- not_allowed: ${child.not_allowed ?? 0}\n- ADD施設のunknown: ${audit.coverage.added_child_use_unknown_count}\n\n\`restricted\` / \`not_allowed\` は既存の家族向け推薦ガードに従う。\n\n## Canon\n\n- before: ${audit.coverage.canon_before}\n- added: ${statuses.ADD}\n- after: ${audit.coverage.canon_after}\n\nADD全件について、監査JSONにidentity・address・current_operationの公式一次根拠、FacilityOps適格性、child-use metadataを保持する。\n`;
}

function insufficiencyCode(missing) {
  if (missing.length > 1) return "MULTIPLE_EVIDENCE_INSUFFICIENT";
  return { identity: "IDENTITY_INSUFFICIENT", address: "ADDRESS_INSUFFICIENT", current_operation: "CURRENT_OPERATION_INSUFFICIENT" }[missing[0]];
}

function normalize(value) {
  return String(value).normalize("NFKC").toLocaleLowerCase("ja").replace(/[\s\p{P}\p{S}]/gu, "");
}

function countBy(rows, key) {
  const values = rows.map(key);
  return Object.fromEntries([...new Set(values)].sort().map((value) => [value, values.filter((item) => item === value).length]));
}

function assertCounts(actual, expected) {
  for (const [key, value] of Object.entries(expected)) {
    if ((actual[key] ?? 0) !== value) throw new Error(`unexpected count ${key}: ${actual[key] ?? 0}, expected ${value}`);
  }
}

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

async function writeJson(path, value) {
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}
