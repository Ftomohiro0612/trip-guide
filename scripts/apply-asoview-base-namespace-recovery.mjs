#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const PATHS = {
  coverage: resolve(
    ROOT,
    "docs/audits/asoview-base-namespace-coverage-2026-08-28.json",
  ),
  facilityOps: resolve(
    ROOT,
    "docs/audits/asoview-base-namespace-facilityops-2026-08-28.json",
  ),
  offers: resolve(
    ROOT,
    "docs/audits/asoview-base-namespace-offers-2026-08-28.json",
  ),
  additions: resolve(
    ROOT,
    "scripts/data/asoview-base-namespace-additions-2026-08-28.json",
  ),
  facilities: resolve(ROOT, "data/facilities_data.json"),
  ledger: resolve(
    ROOT,
    "docs/audits/asoview-reverse-discovery-candidates-2026-08-26.json",
  ),
  rakutenLedger: resolve(
    ROOT,
    "docs/audits/rakuten-facility-discovery-candidates-2026-08-26.json",
  ),
  asoviewActions: resolve(ROOT, "data/asoview_facility_actions.json"),
  rakutenActions: resolve(ROOT, "data/rakuten_facility_actions.json"),
};

const [coverage, facilityOps, offersAudit, additionsData, facilityData, ledger, rakutenLedger, asoviewActions, rakutenActions] =
  await Promise.all([
    readJson(PATHS.coverage),
    readJson(PATHS.facilityOps),
    readJson(PATHS.offers),
    readJson(PATHS.additions),
    readJson(PATHS.facilities),
    readJson(PATHS.ledger),
    readJson(PATHS.rakutenLedger),
    readJson(PATHS.asoviewActions),
    readJson(PATHS.rakutenActions),
  ]);

if (!coverage.coverage.scan_complete) {
  throw new Error("refusing apply from an incomplete base namespace scan");
}
if (
  facilityOps.coverage.pending_count !== 0 ||
  facilityOps.coverage.completed_count !== facilityOps.coverage.target_count
) {
  throw new Error("refusing apply from an incomplete FacilityOps review");
}
if (
  facilityData.facilities.length !== 5_237 &&
  asoviewActions.coverage.base_namespace_recovery_audited_at === "2026-08-28"
) {
  rollbackPreviousBaseNamespaceApply();
}
if (facilityData.facilities.length !== 5_237) {
  throw new Error(
    `unexpected canon baseline: ${facilityData.facilities.length}`,
  );
}

normalizeRecoveredExistingCanon(facilityData.facilities);

const reviewByIdentity = new Map(
  facilityOps.reviews.map((review) => [
    normalizeIdentity(review.asoview_identity),
    review,
  ]),
);
const addReviews = facilityOps.reviews.filter(
  (review) => review.final_status === "ADD",
);
const additionByIdentity = new Map(
  additionsData.additions.map((addition) => [
    normalizeIdentity(addition.asoview_identity),
    addition,
  ]),
);
if (
  additionsData.count !== addReviews.length ||
  additionsData.additions.length !== addReviews.length ||
  additionByIdentity.size !== addReviews.length
) {
  throw new Error("curated additions do not match all FacilityOps ADD reviews");
}
for (const review of addReviews) {
  if (!additionByIdentity.has(normalizeIdentity(review.asoview_identity))) {
    throw new Error(`missing curated ADD: ${review.asoview_identity}`);
  }
  for (const condition of ["identity", "address", "current_operation"]) {
    const evidence = review.evidence?.[condition];
    if (!evidence?.satisfied || !evidence.url || /asoview\.com/iu.test(evidence.url)) {
      throw new Error(
        `ADD lacks official ${condition} evidence: ${review.asoview_identity}`,
      );
    }
  }
}

const existingNames = new Set(
  facilityData.facilities.map((facility) => normalizeIdentity(facility.name)),
);
let nextId = Math.max(...facilityData.facilities.map((facility) => facility.id)) + 1;
const addedFacilityByIdentity = new Map();
for (const addition of additionsData.additions) {
  validateCuratedAddition(addition);
  const name = normalizeIdentity(addition.facility.name);
  if (existingNames.has(name)) {
    throw new Error(`duplicate canon ADD name: ${addition.facility.name}`);
  }
  existingNames.add(name);
  const facility = {
    id: nextId,
    slug: `facility-${nextId}`,
    ...addition.facility,
  };
  nextId += 1;
  facilityData.facilities.push(facility);
  addedFacilityByIdentity.set(normalizeIdentity(addition.asoview_identity), facility);
  const prefecture = facilityData.metadata.prefectures.find(
    (entry) => entry.id === facility.prefecture_id,
  );
  const category = facilityData.metadata.categories.find(
    (entry) => entry.id === facility.category_id,
  );
  if (!prefecture || !category) {
    throw new Error(`metadata mapping missing: ${facility.name}`);
  }
  prefecture.count += 1;
  category.count += 1;
}
facilityData.metadata.total_facilities = facilityData.facilities.length;

const recoveredCandidateByIdentity = new Map(
  coverage.recovered_family_candidates.map((candidate) => [
    normalizeIdentity(candidate.asoview_identity),
    candidate,
  ]),
);
const existingAsoviewFacilitySlugs = new Set(
  asoviewActions.offers.map((offer) => offer.facility_slug),
);
const existingAsoviewUrls = new Set(
  asoviewActions.offers.map((offer) => offer.url),
);
let asoviewActionsAdded = 0;
for (const offerReview of offersAudit.reviews) {
  const product = offerReview.valid_individual_products?.[0];
  if (!product) continue;
  const normalizedIdentity = normalizeIdentity(offerReview.asoview_identity);
  const facilityOpsReview = reviewByIdentity.get(normalizedIdentity);
  let facility = addedFacilityByIdentity.get(normalizedIdentity);
  if (!facility && facilityOpsReview?.final_status === "DUPLICATE") {
    facility = facilityData.facilities.find(
      (item) => item.id === facilityOpsReview.duplicate?.facility_id,
    );
  }
  if (!facility) {
    const recoveredCandidate = recoveredCandidateByIdentity.get(normalizedIdentity);
    const canonMatch = recoveredCandidate?.canon_matches?.find(
      (match) => match.basis === "normalized_exact",
    );
    facility = facilityData.facilities.find((item) => item.id === canonMatch?.facility_id);
  }
  if (!facility) {
    throw new Error(`valid Asoview product has no resolved facility: ${offerReview.asoview_identity}`);
  }
  const url = product.canonical_url;
  if (existingAsoviewFacilitySlugs.has(facility.slug) || existingAsoviewUrls.has(url)) {
    continue;
  }
  asoviewActions.offers.push({
    facility_id: facility.id,
    facility_slug: facility.slug,
    facility_name: facility.name,
    action_type: product.kind,
    label:
      product.kind === "ticket"
        ? "アソビューでお得にチケットを探す"
        : "アソビューで体験を予約する",
    url,
    verified_at: "2026-08-28",
    display_through: "2026-09-27",
    verification: {
      asoview_title: product.title,
      same_facility_basis: `${offerReview.asoview_identity}の回収provider pageから直接リンクされた個別商品で、FacilityOps確定identityと対応`,
      availability_basis:
        "公開中の個別商品ページ、canonical URL、購入または予約案内を確認。期間限定・複数施設bundle・ふるさと納税商品は除外。",
    },
  });
  existingAsoviewFacilitySlugs.add(facility.slug);
  existingAsoviewUrls.add(url);
  asoviewActionsAdded += 1;
}
asoviewActions.offers.sort((left, right) => left.facility_id - right.facility_id);

const ledgerNormalized = new Set(
  ledger.identities.map((identity) => identity.normalized_identity),
);
for (const candidate of coverage.recovered_family_candidates) {
  if (candidate.prior_ledger_reached) continue;
  if (ledgerNormalized.has(candidate.normalized_identity)) {
    throw new Error(`recovered identity already exists in ledger: ${candidate.asoview_identity}`);
  }
  const review = reviewByIdentity.get(
    normalizeIdentity(candidate.asoview_identity),
  );
  const resolution = resolveCandidate(candidate, review);
  const ledgerEntry = {
    asoview_identity: candidate.asoview_identity,
    normalized_identity: candidate.normalized_identity,
    family_relevance: candidate.family_relevance,
    status: resolution.status,
    reason: resolution.reason,
    asoview_pages: candidate.asoview_pages.map((page) => ({
      kind: "base",
      url: page.url,
      title: page.title,
      description: page.description,
      in_base_sitemap: false,
    })),
    canon_matches: candidate.canon_matches,
    coverage_recovery: {
      coverage_audit_ref:
        "docs/audits/asoview-base-namespace-coverage-2026-08-28.json",
      facilityops_audit_ref:
        "docs/audits/asoview-base-namespace-facilityops-2026-08-28.json",
      checked_at: "2026-08-28",
      cause: "OFF_SITEMAP_BASE_PAGE_NOT_INGESTED",
      preliminary_disposition: candidate.coverage_disposition,
      final_status: resolution.status,
      official_hosts: review?.official_hosts ?? [],
      inspected_page_count: review?.inspected_page_count ?? 0,
      final_missing_conditions: review?.final_missing_conditions ?? [],
      evidence: review?.evidence ?? null,
    },
  };
  if (resolution.status === "DUPLICATE") {
    ledgerEntry.resolved_canon_match = resolution.duplicate;
  }
  if (resolution.status === "NOT_ELIGIBLE") {
    ledgerEntry.not_eligible_basis = resolution.notEligibleBasis;
  }
  if (resolution.status === "ADD") {
    const facility = addedFacilityByIdentity.get(
      normalizeIdentity(candidate.asoview_identity),
    );
    if (!facility) throw new Error(`ADD facility mapping missing: ${candidate.asoview_identity}`);
    ledgerEntry.added_facility = {
      id: facility.id,
      slug: facility.slug,
      name: facility.name,
    };
  }
  ledger.identities.push(ledgerEntry);
  ledgerNormalized.add(candidate.normalized_identity);
}

const finalStatuses = [
  "ADD",
  "DUPLICATE",
  "NOT_ELIGIBLE",
  "ASOVIEW_DETAIL_UNAVAILABLE",
  "OFFICIAL_EVIDENCE_INSUFFICIENT",
];
const statusCounts = Object.fromEntries(
  finalStatuses.map((status) => [
    status,
    ledger.identities.filter((identity) => identity.status === status).length,
  ]),
);

const canonHash = createHash("sha256")
  .update(JSON.stringify(facilityData))
  .digest("hex");
for (const actions of [asoviewActions, rakutenActions]) {
  actions.coverage.audited_at = "2026-08-28";
  actions.coverage.facility_canon_count = facilityData.facilities.length;
  actions.coverage.facility_canon_sha256 = canonHash;
}

const newlyRecoveredNoFamily = coverage.identities.filter(
  (identity) =>
    !identity.prior_ledger_reached &&
    identity.coverage_disposition === "NO_FAMILY_FACILITY_SIGNAL",
).length;
asoviewActions.coverage.reverse_discovery_prefilter_identity_count +=
  coverage.coverage.newly_recovered_identity_count;
asoviewActions.coverage.reverse_discovery_no_family_signal_count +=
  newlyRecoveredNoFamily;
asoviewActions.coverage.reverse_discovery_identity_count = ledger.identities.length;
asoviewActions.coverage.reverse_discovery_add_count = statusCounts.ADD;
Object.assign(asoviewActions.coverage, {
  base_namespace_recovery_audited_at: "2026-08-28",
  base_namespace_min_id: coverage.source_manifest.namespace_min_id,
  base_namespace_max_id: coverage.source_manifest.namespace_max_id,
  base_namespace_off_sitemap_scan_count:
    coverage.coverage.off_sitemap_scan_target_id_count,
  base_namespace_public_off_sitemap_page_count:
    coverage.coverage.public_base_page_off_sitemap_count,
  base_namespace_new_identity_count:
    coverage.coverage.newly_recovered_identity_count,
  base_namespace_recovered_family_candidate_count:
    coverage.coverage.recovered_family_candidate_count,
  base_namespace_facilityops_review_count:
    facilityOps.coverage.target_count,
  base_namespace_facilityops_add_count: addReviews.length,
  base_namespace_linked_product_count:
    offersAudit.coverage.linked_unique_product_count,
  base_namespace_valid_individual_product_count:
    offersAudit.coverage.valid_individual_product_count,
  base_namespace_action_add_count: asoviewActionsAdded,
});

ledger.schema_version = Math.max(4, Number(ledger.schema_version ?? 1));
ledger.finalized_at = "2026-08-28";
ledger.coverage.identity_count = ledger.identities.length;
ledger.coverage.status_counts = statusCounts;
ledger.coverage.facilities_added = statusCounts.ADD;
ledger.coverage.final_facility_canon_count = facilityData.facilities.length;
ledger.coverage.final_facility_canon_sha256 = canonHash;
rakutenLedger.coverage.final_facility_canon_count = facilityData.facilities.length;
rakutenLedger.coverage.final_facility_canon_sha256 = canonHash;
Object.assign(ledger.coverage, {
  base_namespace_recovery_scan_complete: true,
  base_namespace_recovery_new_identity_count:
    coverage.coverage.newly_recovered_identity_count,
  base_namespace_recovery_family_candidate_count:
    coverage.coverage.recovered_family_candidate_count,
  base_namespace_recovery_facilityops_review_count:
    facilityOps.coverage.target_count,
  base_namespace_recovery_status_counts:
    facilityOps.coverage.final_status_counts,
  base_namespace_recovery_facilities_added: addReviews.length,
  canon_before_base_namespace_recovery: 5_237,
});

await Promise.all([
  writeJson(PATHS.facilities, facilityData),
  writeJson(PATHS.ledger, ledger),
  writeJson(PATHS.rakutenLedger, rakutenLedger),
  writeJson(PATHS.asoviewActions, asoviewActions),
  writeJson(PATHS.rakutenActions, rakutenActions),
]);

console.log(
  JSON.stringify(
    {
      recovered_family_candidates:
        coverage.coverage.recovered_family_candidate_count,
      facilityops_reviewed: facilityOps.coverage.target_count,
      facilities_added: addReviews.length,
      canon_before: 5_237,
      canon_after: facilityData.facilities.length,
      canon_sha256: canonHash,
      ledger_status_counts: statusCounts,
    },
    null,
    2,
  ),
);

function resolveCandidate(candidate, review) {
  if (candidate.coverage_disposition === "DUPLICATE") {
    const duplicate = candidate.canon_matches.find(
      (match) => match.basis === "normalized_exact",
    );
    if (!duplicate) throw new Error(`exact duplicate target missing: ${candidate.asoview_identity}`);
    return {
      status: "DUPLICATE",
      reason: candidate.preliminary_facilityops_reason,
      duplicate,
    };
  }
  if (candidate.coverage_disposition === "NOT_ELIGIBLE") {
    return {
      status: "NOT_ELIGIBLE",
      reason: candidate.preliminary_facilityops_reason,
      notEligibleBasis: {
        category: "PRELIMINARY_EXPLICIT_INELIGIBILITY",
        reason: candidate.preliminary_facilityops_reason,
      },
    };
  }
  if (!review?.review_complete) {
    throw new Error(`FacilityOps review missing: ${candidate.asoview_identity}`);
  }
  return {
    status: review.final_status,
    reason: review.reason,
    duplicate: review.duplicate ?? null,
    notEligibleBasis: review.not_eligible_basis ?? null,
  };
}

function validateCuratedAddition(addition) {
  const facility = addition.facility;
  for (const field of [
    "name",
    "prefecture",
    "prefecture_id",
    "category",
    "category_id",
    "address",
    "description",
    "unique_selling_point",
    "url",
    "source_urls",
  ]) {
    if (!facility?.[field]) {
      throw new Error(`curated ADD missing ${field}: ${addition.asoview_identity}`);
    }
  }
  if (!Number.isFinite(facility.latitude) || !Number.isFinite(facility.longitude)) {
    throw new Error(`curated ADD coordinates missing: ${addition.asoview_identity}`);
  }
  if (!Array.isArray(facility.signature_experiences) || facility.signature_experiences.length < 1) {
    throw new Error(`curated ADD experiences missing: ${addition.asoview_identity}`);
  }
  if (/asoview\.com/iu.test(facility.url)) {
    throw new Error(`Asoview used as canon source: ${addition.asoview_identity}`);
  }
}

function normalizeRecoveredExistingCanon(facilities) {
  const asouBayPark = facilities.find((facility) => facility.id === 3_185);
  if (!asouBayPark) throw new Error("existing Asou Bay Park canon entry missing");
  if (
    normalizeIdentity(asouBayPark.name) !==
      normalizeIdentity("あそうベイパーク(オートキャンプ場)") &&
    normalizeIdentity(asouBayPark.name) !== normalizeIdentity("あそうベイパーク")
  ) {
    throw new Error(`unexpected facility 3185 identity: ${asouBayPark.name}`);
  }
  Object.assign(asouBayPark, {
    name: "あそうベイパーク",
    description:
      "約56ヘクタールの園内に広い芝生、多目的広場、遊具、トリムコース、展望エリアなどが配置された自然公園です。四季の草花を眺めながら散策や外遊びができ、対州馬とのふれあいや乗馬など、対馬らしい自然と生き物に触れる体験も組み合わせられます。",
    unique_selling_point:
      "広い芝生や遊具で遊び、対州馬ともふれあえる対馬の自然公園です。",
    url: "https://asoubaypark.net/ja/",
    signature_experiences: [
      "広い芝生や遊具で体を動かす",
      "対州馬とのふれあいや乗馬を体験する",
      "園内の散策路や展望エリアを巡る",
    ],
    experience_tags: ["芝生広場", "遊具", "対州馬"],
    things_to_do: [
      "広い芝生や遊具で体を動かす",
      "対州馬とのふれあいや乗馬を体験する",
      "園内の散策路や展望エリアを巡る",
    ],
    source_urls:
      "https://asoubaypark.net/ja/, https://asoubaypark.net/ja/experience/horse-riding/",
    source_checked_at: "2026-08-28",
    source_notes:
      "公式サイトで施設名、所在地、現行営業、園内構成を再確認。既存canon entryは公園全体を説明していたため、名称から一用途を示す補足を外してAsoview identityと一致させた。施設identityや掲載範囲は変更していない。",
  });
}

function rollbackPreviousBaseNamespaceApply() {
  const priorNewIdentityCount = Number(
    asoviewActions.coverage.base_namespace_new_identity_count ?? 0,
  );
  const priorFamilyCandidateCount = Number(
    asoviewActions.coverage.base_namespace_recovered_family_candidate_count ?? 0,
  );
  const retainedFacilities = facilityData.facilities.filter(
    (facility) =>
      !(
        facility.source_checked_at === "2026-08-28" &&
        facility.source_notes?.startsWith("Asoviewは発見経路としてのみ使用。")
      ),
  );
  facilityData.facilities = retainedFacilities;
  facilityData.metadata.total_facilities = retainedFacilities.length;
  for (const prefecture of facilityData.metadata.prefectures) {
    prefecture.count = retainedFacilities.filter(
      (facility) => facility.prefecture_id === prefecture.id,
    ).length;
  }
  for (const category of facilityData.metadata.categories) {
    category.count = retainedFacilities.filter(
      (facility) => facility.category_id === category.id,
    ).length;
  }

  ledger.identities = ledger.identities.filter(
    (identity) =>
      identity.coverage_recovery?.cause !== "OFF_SITEMAP_BASE_PAGE_NOT_INGESTED",
  );
  asoviewActions.offers = asoviewActions.offers.filter(
    (offer) =>
      !offer.verification?.same_facility_basis?.includes("回収provider page"),
  );
  asoviewActions.coverage.reverse_discovery_prefilter_identity_count -=
    priorNewIdentityCount;
  asoviewActions.coverage.reverse_discovery_no_family_signal_count -=
    priorNewIdentityCount - priorFamilyCandidateCount;

  if (facilityData.facilities.length !== 5_237) {
    throw new Error(
      `base-namespace reapply rollback did not restore baseline: ${facilityData.facilities.length}`,
    );
  }
}

function normalizeIdentity(value) {
  return String(value ?? "")
    .normalize("NFKC")
    .toLocaleLowerCase("ja")
    .replace(/[\s\p{P}\p{S}]/gu, "");
}

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

async function writeJson(path, value) {
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}
