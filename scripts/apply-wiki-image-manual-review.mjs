import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { readFile, unlink, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const dataPath = resolve(root, "data/facilities_data.json");
const blacklistPath = resolve(root, "data/wiki-image-blacklist.json");
const auditPath = resolve(root, "docs/audits/facility-image-coverage-wikipedia-2026-08-27.json");
const reviews = new Map([
  [1544, "Manual contact-sheet review: the image is only the railway logo and does not depict the facility."],
  [2106, "Manual contact-sheet review: the image depicts only a collection object and does not adequately depict the museum."],
  [2765, "Manual contact-sheet review: the image is dominated by an entrance map/sign and road, not the park itself."],
  [2795, "Manual contact-sheet review: the image is only the facility sign and does not depict the zoo."],
  [3053, "Manual contact-sheet review: the image is only entrance signage and does not depict the park."],
]);

const document = JSON.parse(await readFile(dataPath, "utf8"));
const blacklist = JSON.parse(await readFile(blacklistPath, "utf8"));
const audit = JSON.parse(await readFile(auditPath, "utf8"));
const baseline = JSON.parse(execFileSync("git", ["show", `${audit.baseline_commit}:data/facilities_data.json`], {
  cwd: root,
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
  if (!facility || !baselineFacility || !result) throw new Error(`Missing review subject: ${facilityId}`);
  if (result.disposition === "rejected_image_relevance_manual_review") continue;
  if (result.disposition !== "accepted") throw new Error(`Review subject ${facilityId} is not accepted.`);
  const rejectedCandidate = result.accepted;
  const expectedOutput = `/images/facilities/${facility.slug}.webp`;
  if (rejectedCandidate.output_path !== expectedOutput || facility.image !== expectedOutput) {
    throw new Error(`Unexpected output path for review subject ${facilityId}.`);
  }
  const absoluteOutput = resolve(root, `public${expectedOutput}`);
  if (existsSync(absoluteOutput)) await unlink(absoluteOutput);
  restoreField(facility, baselineFacility, "image");
  restoreField(facility, baselineFacility, "image_attribution");
  restoreField(facility, baselineFacility, "image_source");
  result.disposition = "rejected_image_relevance_manual_review";
  result.accepted = null;
  result.reason = reason;
  result.manual_review = {
    reviewed_at: "2026-08-27",
    method: "100% contact-sheet review followed by original-resolution inspection",
    rejected_candidate: rejectedCandidate,
  };
}

for (const result of audit.results) {
  if (result.disposition !== "accepted" || !result.accepted) continue;
  if (typeof result.accepted.license_url === "string") {
    result.accepted.license_url = result.accepted.license_url.replace(/^http:/u, "https:");
  } else if (/^(?:Public domain|パブリック・ドメイン)$/iu.test(result.accepted.license)) {
    result.accepted.license_url = "https://commons.wikimedia.org/wiki/Commons:Licensing#Public_domain";
  }
}

const rejectedIds = new Set(blacklist.rejected ?? []);
const entries = new Map((blacklist.entries ?? []).map((entry) => [entry.facility_id, entry]));
for (const [facilityId, reason] of reviews) {
  rejectedIds.add(facilityId);
  entries.set(facilityId, {
    facility_id: facilityId,
    facility_name: facilityById.get(facilityId).name,
    disposition: "rejected_image_relevance_manual_review",
    reason,
    recorded_at: "2026-08-27",
    audit_path: "docs/audits/facility-image-coverage-wikipedia-2026-08-27.json",
  });
}
blacklist.rejected = [...rejectedIds].sort((left, right) => left - right);
blacklist.entries = [...entries.values()].sort((left, right) => left.facility_id - right.facility_id);

const results = audit.results;
const count = (disposition) => results.filter((result) => result.disposition === disposition).length;
const imageCount = document.facilities.filter((facility) => typeof facility.image === "string" && facility.image.trim()).length;
audit.coverage.processed_count = results.length;
audit.coverage.candidate_found_count = results.filter((result) => result.candidate_found === true).length;
audit.coverage.strict_match_pass_count = results.filter((result) => result.strict_identity_match === true).length;
audit.coverage.rejection_counts = Object.fromEntries(
  [...new Set(results.map((result) => result.disposition))]
    .filter((disposition) => disposition.startsWith("rejected_"))
    .sort()
    .map((disposition) => [disposition, count(disposition)]),
);
audit.coverage.error_count = count("error");
audit.coverage.accepted_count = count("accepted");
audit.coverage.final_image_count = imageCount;
audit.coverage.final_zero_image_count = document.facilities.length - imageCount;
audit.coverage.final_coverage_percent = Number((imageCount / document.facilities.length * 100).toFixed(2));
audit.manual_image_review = {
  reviewed_at: "2026-08-27",
  reviewed_count: count("accepted") + reviews.size,
  rejected_count: reviews.size,
  rejected_facility_ids: [...reviews.keys()],
  result: "All retained images depict the canonical facility, its grounds, its principal natural subject, or a representative visitor-facing exhibit or installation.",
};

await writeFile(dataPath, `${JSON.stringify(document, null, 2)}\n`, "utf8");
await writeFile(blacklistPath, `${JSON.stringify(blacklist, null, 2)}\n`, "utf8");
await writeFile(auditPath, `${JSON.stringify(audit, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ manualRejected: [...reviews.keys()], coverage: audit.coverage }, null, 2));

function restoreField(target, source, field) {
  if (Object.hasOwn(source, field)) target[field] = source[field];
  else delete target[field];
}
