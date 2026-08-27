import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const RAW_PATH = resolve(
  ROOT,
  "docs/audits/asoview-reverse-discovery-second-pass-2026-08-27.json",
);
const CURATION_PATH = resolve(
  ROOT,
  "scripts/data/asoview-second-pass-curation-2026-08-27.json",
);
const OUTPUT_PATH = resolve(
  ROOT,
  "docs/audits/asoview-reverse-discovery-second-pass-final-2026-08-27.json",
);

const [raw, curation] = await Promise.all([
  readFile(RAW_PATH, "utf8").then(JSON.parse),
  readFile(CURATION_PATH, "utf8").then(JSON.parse),
]);

if (raw.coverage?.target_count !== 741 || raw.coverage?.completed_count !== 741) {
  throw new Error("raw second-pass audit is not complete for all 741 candidates");
}
if (raw.reviews.some((review) => review.processing_error)) {
  throw new Error("raw second-pass audit still contains processing errors");
}

const reviews = structuredClone(raw.reviews);
const reviewByIdentity = new Map(
  reviews.map((review) => [review.asoview_identity, review]),
);
const seenOverrides = new Set();

for (const override of curation.overrides) {
  if (seenOverrides.has(override.asoview_identity)) {
    throw new Error(`duplicate curation override: ${override.asoview_identity}`);
  }
  seenOverrides.add(override.asoview_identity);
  const review = reviewByIdentity.get(override.asoview_identity);
  if (!review) {
    throw new Error(`curation target not found: ${override.asoview_identity}`);
  }

  for (const [condition, evidenceOverride] of Object.entries(
    override.evidence_overrides ?? {},
  )) {
    if (!["identity", "address", "current_operation", "child_use"].includes(condition)) {
      throw new Error(`invalid evidence condition ${condition} for ${override.asoview_identity}`);
    }
    review.evidence ??= {};
    review.evidence[condition] = {
      ...(review.evidence[condition] ?? {}),
      ...evidenceOverride,
      satisfied: true,
      source_type: evidenceOverride.source_type ?? "facility_or_operator_official",
    };
  }

  review.final_status = override.final_status;
  review.reason = override.reason;
  review.final_missing_conditions = override.missing_conditions ?? [];
  review.final_insufficiency_code = override.insufficiency_code ?? "";
  delete review.not_eligible_basis;
  delete review.duplicate_match;

  if (override.final_status === "NOT_ELIGIBLE") {
    review.not_eligible_basis = override.not_eligible_basis;
  } else if (override.final_status === "DUPLICATE") {
    review.duplicate_match = override.duplicate_match;
  }
  review.manual_audit = {
    checked_at: curation.checked_at,
    policy: "FacilityOps existing four-condition standard; fail closed",
    basis: override.audit_basis,
  };
}

const allowedStatuses = new Set([
  "ADD",
  "DUPLICATE",
  "NOT_ELIGIBLE",
  "OFFICIAL_EVIDENCE_INSUFFICIENT",
]);
for (const review of reviews) {
  if (review.final_status === "DUPLICATE" && !review.duplicate_match && review.duplicate) {
    review.duplicate_match = review.duplicate;
  }
  if (!review.review_complete || !allowedStatuses.has(review.final_status)) {
    throw new Error(`invalid final review state: ${review.asoview_identity}`);
  }
  if (review.final_status === "ADD") {
    for (const condition of ["identity", "address", "current_operation", "child_use"]) {
      const evidence = review.evidence?.[condition];
      const hasTraceableEvidence =
        condition === "address"
          ? Boolean(evidence?.value)
          : condition === "identity"
            ? Boolean(evidence?.excerpt || evidence?.title || evidence?.official_name)
            : Boolean(evidence?.excerpt);
      if (!evidence?.satisfied || !evidence.url || !hasTraceableEvidence) {
        throw new Error(`ADD lacks ${condition} evidence: ${review.asoview_identity}`);
      }
      if (/asoview\.com/iu.test(evidence.url)) {
        throw new Error(`ADD uses Asoview as canon evidence: ${review.asoview_identity}`);
      }
    }
    if (!review.evidence.address.value) {
      throw new Error(`ADD lacks official address value: ${review.asoview_identity}`);
    }
  }
  if (
    review.final_status === "OFFICIAL_EVIDENCE_INSUFFICIENT" &&
    (!review.final_insufficiency_code || !review.final_missing_conditions?.length)
  ) {
    throw new Error(`insufficient review lacks exact missing reason: ${review.asoview_identity}`);
  }
  if (review.final_status === "DUPLICATE" && !review.duplicate_match?.facility_id) {
    throw new Error(`duplicate lacks canon target: ${review.asoview_identity}`);
  }
  if (review.final_status === "NOT_ELIGIBLE" && !review.not_eligible_basis?.category) {
    throw new Error(`not-eligible review lacks basis: ${review.asoview_identity}`);
  }
}

const finalStatusCounts = countBy(reviews, "final_status");
const finalInsufficiencyCounts = countBy(
  reviews.filter((review) => review.final_status === "OFFICIAL_EVIDENCE_INSUFFICIENT"),
  "final_insufficiency_code",
);
const output = {
  schema_version: 1,
  generated_at: new Date().toISOString(),
  checked_at: curation.checked_at,
  source_raw_audit: "docs/audits/asoview-reverse-discovery-second-pass-2026-08-27.json",
  curation_source: "scripts/data/asoview-second-pass-curation-2026-08-27.json",
  policy: raw.policy,
  coverage: {
    ...raw.coverage,
    final_status_counts: finalStatusCounts,
    final_insufficiency_counts: finalInsufficiencyCounts,
    manual_override_count: curation.overrides.length,
  },
  reviews,
};

await writeFile(OUTPUT_PATH, `${JSON.stringify(output, null, 2)}\n`, "utf8");
console.log(JSON.stringify(output.coverage, null, 2));

function countBy(items, key) {
  return Object.fromEntries(
    [...Map.groupBy(items, (item) => item[key] ?? "UNKNOWN")]
      .map(([value, grouped]) => [value, grouped.length])
      .sort(([left], [right]) => left.localeCompare(right)),
  );
}
