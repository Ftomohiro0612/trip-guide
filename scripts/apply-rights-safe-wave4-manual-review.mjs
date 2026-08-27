import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { readFile, unlink, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const DATA_PATH = resolve(ROOT, "data/facilities_data.json");
const AUDIT_PATH = resolve(ROOT, "docs/audits/facility-image-coverage-rights-safe-wave4-2026-08-28.json");
const REVIEWED_AT = "2026-08-28";
const METHOD = "100% contact-sheet review followed by original-resolution inspection of ambiguous images";

const reviews = new Map([
  ...entries([177, 1404, 1519, 1793, 1871, 1962, 2103, 6661, 7071, 7493], "The image does not clearly depict the canonical facility or a useful representative visitor-facing scene."),
  ...entries([347, 351, 1357, 1373, 3053, 3248, 3340, 3355, 3907, 7506], "The image is dominated by a sign, marker, logo, or isolated installation rather than the facility."),
  ...entries([586, 1076, 1091, 1137, 1672, 2189, 2315, 2455, 3133, 6089, 6116], "The image shows only an animal, object, exhibit detail, or overly narrow interior fragment and is not representative enough for the facility main image."),
  ...entries([839, 2926], "The image depicts a temporary event or seasonal installation rather than a stable representative view of the facility."),
  ...entries([855, 876, 1145, 7417], "The image appears to depict an adjacent, parent/child, or overly specific subspace rather than the exact canonical facility as a whole."),
]);

const document = JSON.parse(await readFile(DATA_PATH, "utf8"));
const audit = JSON.parse(await readFile(AUDIT_PATH, "utf8"));
const baseline = JSON.parse(execFileSync("git", ["show", `${audit.baseline_commit}:data/facilities_data.json`], {
  cwd: ROOT,
  encoding: "utf8",
  maxBuffer: 64 * 1024 * 1024,
}));
const baselineById = new Map(baseline.facilities.map((facility) => [facility.id, facility]));
const facilityById = new Map(document.facilities.map((facility) => [facility.id, facility]));
const resultById = new Map(audit.results.map((result) => [result.facility_id, result]));

for (const [facilityId, reason] of reviews) {
  const facility = facilityById.get(facilityId);
  const baselineFacility = baselineById.get(facilityId);
  const result = resultById.get(facilityId);
  if (!facility || !baselineFacility || !result) throw new Error(`Missing manual-review subject: ${facilityId}`);
  if (result.disposition === "rejected_image_relevance_manual_review") continue;
  if (result.disposition !== "accepted" || !result.accepted) throw new Error(`Manual-review subject ${facilityId} is not accepted.`);
  const rejectedCandidate = result.accepted;
  const expectedOutput = `/images/facilities/${facility.slug}.webp`;
  if (rejectedCandidate.output_path !== expectedOutput || facility.image !== expectedOutput) {
    throw new Error(`Unexpected output path for manual-review subject ${facilityId}.`);
  }
  const absoluteOutput = resolve(ROOT, `public${expectedOutput}`);
  if (existsSync(absoluteOutput)) await unlink(absoluteOutput);
  restoreField(facility, baselineFacility, "image");
  restoreField(facility, baselineFacility, "image_attribution");
  restoreField(facility, baselineFacility, "image_source");
  result.disposition = "rejected_image_relevance_manual_review";
  result.accepted = null;
  result.reason = `Manual review: ${reason}`;
  result.manual_review = {
    reviewed_at: REVIEWED_AT,
    method: METHOD,
    rejected_candidate: rejectedCandidate,
  };
}

const results = audit.results;
const count = (disposition) => results.filter((result) => result.disposition === disposition).length;
const accepted = results.filter((result) => result.disposition === "accepted" && result.accepted);
const imageCount = document.facilities.filter(hasImage).length;
audit.coverage.processed_count = results.length;
audit.coverage.candidate_found_count = results.filter((result) => result.candidate_found === true).length;
audit.coverage.source_candidate_counts = { wikimedia_commons_direct_search: audit.coverage.candidate_found_count };
audit.coverage.rights_pass_count = results.filter((result) => result.rights_pass === true).length;
audit.coverage.identity_pass_count = results.filter((result) => result.strict_identity_match === true).length;
audit.coverage.relevance_pass_count = results.filter((result) => result.relevance_pass === true).length;
audit.coverage.rejection_counts = Object.fromEntries(
  [...new Set(results.map((result) => result.disposition))]
    .filter((disposition) => disposition.startsWith("rejected_"))
    .sort()
    .map((disposition) => [disposition, count(disposition)]),
);
audit.coverage.no_candidate_count = count("no_candidate");
audit.coverage.error_count = count("error");
audit.coverage.accepted_count = accepted.length;
audit.coverage.final_image_count = imageCount;
audit.coverage.final_zero_image_count = document.facilities.length - imageCount;
audit.coverage.final_coverage_percent = Number((imageCount / document.facilities.length * 100).toFixed(2));
audit.rights_summary = {
  complete_metadata_count: accepted.length,
  license_counts: Object.fromEntries(
    Object.entries(Object.groupBy(accepted, (result) => result.accepted.license)).map(([license, values]) => [license, values.length]),
  ),
};
audit.manual_image_review = {
  reviewed_at: REVIEWED_AT,
  method: METHOD,
  reviewed_count: accepted.length + reviews.size,
  rejected_count: reviews.size,
  retained_count: accepted.length,
  rejected_facility_ids: [...reviews.keys()].sort((left, right) => left - right),
  result: "Every retained image depicts the canonical facility, its principal grounds or space, or a stable representative visitor-facing experience.",
};

await writeFile(DATA_PATH, `${JSON.stringify(document, null, 2)}\n`, "utf8");
await writeFile(AUDIT_PATH, `${JSON.stringify(audit, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ manual_review: audit.manual_image_review, coverage: audit.coverage }, null, 2));

function entries(ids, reason) {
  return ids.map((id) => [id, reason]);
}

function hasImage(facility) {
  return Boolean((typeof facility.image === "string" && facility.image.trim()) || (Array.isArray(facility.images) && facility.images.some(Boolean)));
}

function restoreField(target, source, field) {
  if (Object.hasOwn(source, field)) target[field] = source[field];
  else delete target[field];
}
