#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { resolve, sep } from "node:path";
import sharp from "sharp";

const ROOT = resolve(import.meta.dirname, "..");
const DATA_PATH = resolve(ROOT, "data/facilities_data.json");
const AUDIT_PATH = resolve(ROOT, "docs/audits/facility-image-coverage-rights-safe-wave4-2026-08-28.json");
const IMAGE_ROOT = resolve(ROOT, "public/images/facilities");
const IMAGE_FIELDS = new Set(["image", "image_attribution", "image_source"]);
const ACCEPTED_LICENSE = /^(?:CC0(?: 1\.0)?|CC BY(?:-SA)?(?: [1-9]\.\d)?|Public domain|パブリック・ドメイン)$/iu;
const errors = [];

const current = JSON.parse(await readFile(DATA_PATH, "utf8"));
const audit = JSON.parse(await readFile(AUDIT_PATH, "utf8"));
if (!/^[0-9a-f]{40}$/u.test(audit.baseline_commit ?? "")) fail("audit is missing a valid baseline_commit");
const baseline = JSON.parse(execFileSync("git", ["show", `${audit.baseline_commit}:data/facilities_data.json`], {
  cwd: ROOT,
  encoding: "utf8",
  maxBuffer: 64 * 1024 * 1024,
}));
const baselineTargets = baseline.facilities.filter((facility) => !hasImage(facility));
const currentById = new Map(current.facilities.map((facility) => [facility.id, facility]));
const resultsById = new Map();
for (const result of audit.results) {
  if (resultsById.has(result.facility_id)) fail(`duplicate audit result: ${result.facility_id}`);
  resultsById.set(result.facility_id, result);
}
const accepted = audit.results.filter((result) => result.disposition === "accepted" && result.accepted);
const acceptedIds = new Set(accepted.map((result) => result.facility_id));

if (audit.status !== "completed" || !audit.completed_at) fail("audit is not completed");
if (current.facilities.length !== baseline.facilities.length) fail("facility canon count changed");
if (baselineTargets.length !== 3575) fail(`unexpected baseline target count: ${baselineTargets.length}`);
if (audit.results.length !== baselineTargets.length) fail("audit does not cover all 3,575 baseline image-missing facilities");
if (audit.results.some((result) => result.disposition === "error")) fail("audit contains error dispositions");

for (const baselineFacility of baseline.facilities) {
  const currentFacility = currentById.get(baselineFacility.id);
  if (!currentFacility) {
    fail(`facility removed: ${baselineFacility.id}`);
    continue;
  }
  if (JSON.stringify(withoutImageFields(currentFacility)) !== JSON.stringify(withoutImageFields(baselineFacility))) {
    fail(`non-image fields changed: ${baselineFacility.id} ${baselineFacility.name}`);
  }
  if (hasImage(baselineFacility)) {
    for (const field of IMAGE_FIELDS) {
      if (JSON.stringify(currentFacility[field]) !== JSON.stringify(baselineFacility[field])) {
        fail(`existing image field changed: ${baselineFacility.id} ${field}`);
      }
    }
    continue;
  }
  const result = resultsById.get(baselineFacility.id);
  if (!result) {
    fail(`missing audit result: ${baselineFacility.id}`);
  } else if (result.disposition === "accepted" && !hasImage(currentFacility)) {
    fail(`accepted facility is missing image: ${baselineFacility.id}`);
  } else if (result.disposition !== "accepted" && hasImage(currentFacility)) {
    fail(`non-accepted facility received image: ${baselineFacility.id}`);
  }
}

const sourceSha1s = new Map();
const sourceSha256s = new Map();
const exactHashes = new Map();
const visualHashes = new Map();
for (const facility of current.facilities.filter(hasImage)) {
  const imagePath = resolve(ROOT, "public", String(facility.image).replace(/^\//u, ""));
  if (!imagePath.startsWith(`${IMAGE_ROOT}${sep}`) || !existsSync(imagePath)) {
    fail(`missing or escaped image: ${facility.id}`);
    continue;
  }
  const buffer = await readFile(imagePath);
  const exact = sha256(buffer);
  const visual = await fingerprint(buffer);
  addHash(exactHashes, exact, facility.id);
  addHash(visualHashes, visual, facility.id);
  if (!acceptedIds.has(facility.id)) continue;
  const result = resultsById.get(facility.id);
  const rights = result.accepted;
  const metadata = await sharp(buffer).metadata();
  if (facility.image !== `/images/facilities/${facility.slug}.webp`) fail(`unexpected output path: ${facility.id}`);
  if (facility.image_source !== "manual") fail(`unexpected image_source: ${facility.id}`);
  if (metadata.format !== "webp" || metadata.width !== 1200 || metadata.height !== 800) fail(`unexpected output dimensions: ${facility.id}`);
  if (rights.output_sha256 !== exact) fail(`output SHA-256 mismatch: ${facility.id}`);
  if (rights.visual_fingerprint_sha256 !== visual) fail(`visual fingerprint mismatch: ${facility.id}`);
  if (rights.source_platform !== "Wikimedia Commons" || rights.source_type !== "explicit_reuse_license") fail(`unexpected source classification: ${facility.id}`);
  if (!rights.source_url?.startsWith("https://commons.wikimedia.org/")) fail(`invalid source URL: ${facility.id}`);
  if (!rights.image_original_url?.startsWith("https://upload.wikimedia.org/")) fail(`invalid original URL: ${facility.id}`);
  if (!rights.source_owner?.trim() || !rights.author?.trim()) fail(`missing owner/author: ${facility.id}`);
  if (!ACCEPTED_LICENSE.test(rights.license ?? "")) fail(`unapproved license: ${facility.id}`);
  if (rights.commercial_use_allowed !== true || rights.modification_allowed !== true) fail(`commercial/modification gate failed: ${facility.id}`);
  if (typeof rights.attribution_requirement !== "boolean") fail(`missing attribution requirement: ${facility.id}`);
  if (!rights.terms_url?.startsWith("https://") || rights.checked_at !== "2026-08-28") fail(`missing terms/check date: ${facility.id}`);
  const attribution = facility.image_attribution ?? "";
  for (const value of [rights.source_url, rights.terms_url, rights.author, rights.license, 'rel="noopener noreferrer"', 'target="_blank"']) {
    if (!attribution.includes(value)) fail(`incomplete attribution ${facility.id}: ${value}`);
  }
  addHash(sourceSha1s, rights.source_image_sha1, facility.id);
  addHash(sourceSha256s, rights.source_image_sha256, facility.id);
}

for (const [kind, map] of [["source SHA-1", sourceSha1s], ["source SHA-256", sourceSha256s]]) {
  for (const [hash, ids] of map) if (ids.length > 1) fail(`duplicate ${kind} ${hash}: ${ids.join(",")}`);
}
for (const [kind, map] of [["output SHA-256", exactHashes], ["visual fingerprint", visualHashes]]) {
  for (const [hash, ids] of map) {
    if (ids.length > 1 && ids.some((id) => acceptedIds.has(id))) fail(`new duplicate ${kind} ${hash}: ${ids.join(",")}`);
  }
}

const finalImageCount = current.facilities.filter(hasImage).length;
const recomputed = {
  processed_count: audit.results.length,
  candidate_found_count: audit.results.filter((result) => result.candidate_found === true).length,
  rights_pass_count: audit.results.filter((result) => result.rights_pass === true).length,
  identity_pass_count: audit.results.filter((result) => result.strict_identity_match === true).length,
  relevance_pass_count: audit.results.filter((result) => result.relevance_pass === true).length,
  accepted_count: accepted.length,
  final_image_count: finalImageCount,
};
for (const [key, value] of Object.entries(recomputed)) if (audit.coverage[key] !== value) fail(`coverage mismatch: ${key}`);
if (audit.rights_summary?.complete_metadata_count !== accepted.length) fail("rights metadata completeness mismatch");

const summary = {
  facility_canon_count: current.facilities.length,
  target_zero_image_count: baselineTargets.length,
  processed_count: recomputed.processed_count,
  candidate_found_count: recomputed.candidate_found_count,
  source_candidate_counts: audit.coverage.source_candidate_counts,
  rights_pass_count: recomputed.rights_pass_count,
  identity_pass_count: recomputed.identity_pass_count,
  relevance_pass_count: recomputed.relevance_pass_count,
  accepted_new_image_count: accepted.length,
  rejection_counts: audit.coverage.rejection_counts,
  baseline_image_count: baseline.facilities.filter(hasImage).length,
  final_image_count: finalImageCount,
  final_zero_image_count: current.facilities.length - finalImageCount,
  final_coverage_percent: Number((finalImageCount / current.facilities.length * 100).toFixed(2)),
  attribution_license_complete_count: audit.rights_summary?.complete_metadata_count ?? 0,
  license_counts: audit.rights_summary?.license_counts ?? {},
  new_source_sha1_duplicate_groups: 0,
  new_source_sha256_duplicate_groups: 0,
  new_output_sha256_duplicate_groups: 0,
  new_visual_fingerprint_duplicate_groups: 0,
  existing_image_change_count: errors.filter((error) => error.startsWith("existing image field changed")).length,
  non_image_field_change_count: errors.filter((error) => error.startsWith("non-image fields changed")).length,
  error_count: errors.length,
};
console.log(JSON.stringify(summary, null, 2));
if (errors.length > 0) {
  for (const error of errors) console.error(`ERROR ${error}`);
  process.exitCode = 1;
}

function hasImage(facility) {
  return Boolean((typeof facility.image === "string" && facility.image.trim()) || (Array.isArray(facility.images) && facility.images.some(Boolean)));
}

function withoutImageFields(facility) {
  return Object.fromEntries(Object.entries(facility).filter(([key]) => !IMAGE_FIELDS.has(key)));
}

async function fingerprint(buffer) {
  const pixels = await sharp(buffer, { failOn: "none", animated: false }).rotate().resize(32, 32, { fit: "fill" }).grayscale().raw().toBuffer();
  return sha256(pixels);
}

function sha256(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

function addHash(map, hash, id) {
  const ids = map.get(hash) ?? [];
  ids.push(id);
  map.set(hash, ids);
}

function fail(message) {
  errors.push(message);
}
