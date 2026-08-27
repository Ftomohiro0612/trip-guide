#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { resolve, sep } from "node:path";
import sharp from "sharp";

const root = resolve(import.meta.dirname, "..");
const dataPath = resolve(root, "data/facilities_data.json");
const auditPath = resolve(root, "docs/audits/facility-image-coverage-wikipedia-2026-08-27.json");
const blacklistPath = resolve(root, "data/wiki-image-blacklist.json");
const imageRoot = resolve(root, "public/images/facilities");
const imageFields = new Set(["image", "image_attribution", "image_source"]);
const acceptedLicense = /^(?:CC0(?: 1\.0)?|CC BY(?:-SA)?(?: [1-9]\.\d)?|Public domain|パブリック・ドメイン)$/iu;
const errors = [];

const [document, audit, blacklist] = await Promise.all([
  readFile(dataPath, "utf8").then(JSON.parse),
  readFile(auditPath, "utf8").then(JSON.parse),
  readFile(blacklistPath, "utf8").then(JSON.parse),
]);
if (!/^[0-9a-f]{40}$/u.test(audit.baseline_commit ?? "")) fail("audit is missing a valid baseline_commit");
const baseline = JSON.parse(execFileSync("git", ["show", `${audit.baseline_commit}:data/facilities_data.json`], {
  cwd: root,
  encoding: "utf8",
  maxBuffer: 64 * 1024 * 1024,
}));
const currentById = new Map(document.facilities.map((facility) => [facility.id, facility]));
const resultsById = new Map();
for (const result of audit.results) {
  if (resultsById.has(result.facility_id)) fail(`duplicate audit result: ${result.facility_id}`);
  resultsById.set(result.facility_id, result);
}
const acceptedResults = audit.results.filter((result) => result.disposition === "accepted" && result.accepted);
const acceptedIds = new Set(acceptedResults.map((result) => result.facility_id));
const baselineTargets = baseline.facilities.filter((facility) => !hasImage(facility));
const rejectedBlacklistIds = new Set(blacklist.rejected ?? []);

if (document.facilities.length !== baseline.facilities.length) fail("facility canon count changed");
if (audit.status !== "completed" || !audit.completed_at) fail("audit is not completed");
if (audit.results.length !== baselineTargets.length) fail("audit does not cover every baseline image-missing facility");
if (audit.coverage.error_count !== 0 || audit.results.some((result) => result.disposition === "error")) fail("audit contains errors");

for (const baselineFacility of baseline.facilities) {
  const current = currentById.get(baselineFacility.id);
  if (!current) {
    fail(`facility removed: ${baselineFacility.id}`);
    continue;
  }
  if (JSON.stringify(withoutImageFields(current)) !== JSON.stringify(withoutImageFields(baselineFacility))) {
    fail(`non-image fields changed: ${baselineFacility.id} ${baselineFacility.name}`);
  }
  if (hasImage(baselineFacility)) {
    for (const field of imageFields) {
      if (JSON.stringify(current[field]) !== JSON.stringify(baselineFacility[field])) {
        fail(`existing image field changed: ${baselineFacility.id} ${field}`);
      }
    }
    continue;
  }
  const result = resultsById.get(baselineFacility.id);
  if (!result) {
    fail(`missing audit result: ${baselineFacility.id}`);
    continue;
  }
  if (result.disposition === "accepted") {
    if (!hasImage(current)) fail(`accepted facility is missing its image: ${baselineFacility.id}`);
  } else if (hasImage(current)) {
    fail(`rejected/unmatched facility received an image: ${baselineFacility.id}`);
  }
  if (result.disposition.startsWith("rejected_") && !rejectedBlacklistIds.has(baselineFacility.id)) {
    fail(`rejected facility missing from blacklist: ${baselineFacility.id}`);
  }
}

const sourceSha1s = new Map();
const sourceSha256s = new Map();
const allExactHashes = new Map();
const allVisualHashes = new Map();
for (const facility of document.facilities.filter(hasImage)) {
  const imagePath = resolve(root, "public", facility.image.replace(/^\//u, ""));
  if (!imagePath.startsWith(`${imageRoot}${sep}`) || !existsSync(imagePath)) {
    fail(`missing or escaped image file: ${facility.id} ${imagePath}`);
    continue;
  }
  const buffer = await readFile(imagePath);
  const exactHash = sha256(buffer);
  const visualHash = await fingerprint(buffer);
  addHash(allExactHashes, exactHash, facility.id);
  addHash(allVisualHashes, visualHash, facility.id);
  if (!acceptedIds.has(facility.id)) continue;
  const result = resultsById.get(facility.id);
  const accepted = result.accepted;
  const metadata = await sharp(buffer).metadata();
  const expectedPath = `/images/facilities/${facility.slug}.webp`;
  if (facility.image !== expectedPath || accepted.output_path !== expectedPath) fail(`unexpected image path: ${facility.id}`);
  if (facility.image_source !== "manual") fail(`unexpected Wikipedia image_source: ${facility.id}`);
  if (metadata.format !== "webp" || metadata.width !== 1200 || metadata.height !== 800) {
    fail(`unexpected output encoding/dimensions: ${facility.id} ${metadata.format} ${metadata.width}x${metadata.height}`);
  }
  if (accepted.output_sha256 !== exactHash) fail(`output SHA-256 mismatch: ${facility.id}`);
  if (accepted.visual_fingerprint_sha256 !== visualHash) fail(`visual fingerprint mismatch: ${facility.id}`);
  if (!accepted.source_image_sha1 || !accepted.source_image_sha256) fail(`missing source hash: ${facility.id}`);
  addHash(sourceSha1s, accepted.source_image_sha1, facility.id);
  addHash(sourceSha256s, accepted.source_image_sha256, facility.id);
  if (!accepted.article_url?.startsWith("https://ja.wikipedia.org/wiki/")) fail(`invalid article URL: ${facility.id}`);
  if (!/https:\/\/(?:commons\.wikimedia\.org\/wiki\/File:|ja\.wikipedia\.org\/wiki\/%E3%83%95%E3%82%A1%E3%82%A4%E3%83%AB:)/u.test(accepted.source_file_page ?? "")) {
    fail(`invalid Wikimedia source page: ${facility.id}`);
  }
  if (!accepted.original_image_url?.startsWith("https://upload.wikimedia.org/")) fail(`invalid original image URL: ${facility.id}`);
  if (!accepted.author?.trim() || !accepted.license?.trim() || !accepted.license_url?.startsWith("https://")) {
    fail(`incomplete rights metadata: ${facility.id}`);
  } else if (!acceptedLicense.test(accepted.license)) {
    fail(`unapproved license: ${facility.id} ${accepted.license}`);
  }
  const attribution = facility.image_attribution ?? "";
  for (const required of [accepted.article_url, accepted.source_file_page, accepted.author, accepted.license, 'rel="noopener noreferrer"', 'target="_blank"']) {
    if (!attribution.includes(required)) fail(`incomplete attribution for ${facility.id}: ${required}`);
  }
}

for (const [kind, hashes] of [["source SHA-1", sourceSha1s], ["source SHA-256", sourceSha256s]]) {
  for (const [hash, ids] of hashes) if (ids.length > 1) fail(`duplicate ${kind} ${hash}: ${ids.join(",")}`);
}
const exactGroups = duplicateGroups(allExactHashes);
const visualGroups = duplicateGroups(allVisualHashes);
const newExactGroups = exactGroups.filter((group) => group.ids.some((id) => acceptedIds.has(id)));
const newVisualGroups = visualGroups.filter((group) => group.ids.some((id) => acceptedIds.has(id)));
for (const group of newExactGroups) fail(`new exact duplicate ${group.hash}: ${group.ids.join(",")}`);
for (const group of newVisualGroups) fail(`new visual duplicate ${group.hash}: ${group.ids.join(",")}`);

const recomputed = {
  processed_count: audit.results.length,
  candidate_found_count: audit.results.filter((result) => result.candidate_found === true).length,
  strict_match_pass_count: audit.results.filter((result) => result.strict_identity_match === true).length,
  error_count: audit.results.filter((result) => result.disposition === "error").length,
  accepted_count: acceptedResults.length,
  final_image_count: document.facilities.filter(hasImage).length,
};
for (const [field, value] of Object.entries(recomputed)) {
  if (audit.coverage[field] !== value) fail(`audit coverage mismatch: ${field}`);
}
if (audit.manual_image_review?.reviewed_count !== 641 || audit.manual_image_review?.rejected_count !== 5) {
  fail("manual image review summary mismatch");
}

const summary = {
  facility_canon_count: document.facilities.length,
  target_zero_image_count: baselineTargets.length,
  processed_count: recomputed.processed_count,
  candidate_found_count: recomputed.candidate_found_count,
  strict_match_pass_count: recomputed.strict_match_pass_count,
  accepted_new_image_count: acceptedResults.length,
  manual_reviewed_image_count: audit.manual_image_review?.reviewed_count ?? 0,
  manual_review_rejected_count: audit.manual_image_review?.rejected_count ?? 0,
  baseline_image_count: baseline.facilities.filter(hasImage).length,
  final_image_count: recomputed.final_image_count,
  final_zero_image_count: document.facilities.length - recomputed.final_image_count,
  final_coverage_percent: Number((recomputed.final_image_count / document.facilities.length * 100).toFixed(2)),
  attribution_complete_count: acceptedResults.length,
  accepted_license_counts: Object.fromEntries(
    Object.entries(Object.groupBy(acceptedResults, (result) => result.accepted.license)).map(([license, values]) => [license, values.length]),
  ),
  preexisting_exact_duplicate_groups: exactGroups.length,
  preexisting_visual_duplicate_groups: visualGroups.length,
  new_exact_duplicate_groups: newExactGroups.length,
  new_visual_duplicate_groups: newVisualGroups.length,
  new_source_sha1_duplicate_groups: duplicateGroups(sourceSha1s).length,
  new_source_sha256_duplicate_groups: duplicateGroups(sourceSha256s).length,
  non_image_field_change_count: errors.filter((error) => error.startsWith("non-image fields changed")).length,
  existing_image_change_count: errors.filter((error) => error.startsWith("existing image field changed")).length,
  error_count: errors.length,
};
console.log(JSON.stringify(summary, null, 2));
if (errors.length > 0) {
  for (const error of errors) console.error(`ERROR ${error}`);
  process.exitCode = 1;
}

function hasImage(facility) {
  return Boolean(typeof facility.image === "string" && facility.image.trim());
}

function withoutImageFields(facility) {
  return Object.fromEntries(Object.entries(facility).filter(([field]) => !imageFields.has(field)));
}

function addHash(map, hash, id) {
  const ids = map.get(hash) ?? [];
  ids.push(id);
  map.set(hash, ids);
}

function duplicateGroups(map) {
  return [...map.entries()].filter(([, ids]) => ids.length > 1).map(([hash, ids]) => ({ hash, ids }));
}

async function fingerprint(buffer) {
  const pixels = await sharp(buffer, { failOn: "none", animated: false }).rotate().resize(32, 32, { fit: "fill" }).grayscale().raw().toBuffer();
  return sha256(pixels);
}

function sha256(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

function fail(message) {
  errors.push(message);
}
