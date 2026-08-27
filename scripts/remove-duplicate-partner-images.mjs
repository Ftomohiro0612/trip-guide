#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { readFile, unlink, writeFile } from "node:fs/promises";
import { resolve, sep } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const FACILITIES_PATH = resolve(ROOT, "data/facilities_data.json");
const AUDIT_PATH = resolve(
  ROOT,
  "docs/audits/facility-image-coverage-partner-2026-08-27.json",
);
const IMAGE_ROOT = resolve(ROOT, "public/images/facilities");
const MANAGED_SOURCES = new Set([
  "asoview-official-partner",
  "rakuten-travel-experiences-official-partner",
]);

const audit = JSON.parse(await readFile(AUDIT_PATH, "utf8"));
if (!/^[0-9a-f]{40}$/.test(audit.baseline_commit ?? "")) {
  throw new Error("Audit is missing a valid baseline_commit");
}
const [facilityDocument, baseDocument] = await Promise.all([
  readFile(FACILITIES_PATH, "utf8").then(JSON.parse),
  Promise.resolve(
    JSON.parse(
      execFileSync(
        "git",
        ["show", `${audit.baseline_commit}:data/facilities_data.json`],
        {
          cwd: ROOT,
          encoding: "utf8",
          maxBuffer: 64 * 1024 * 1024,
        },
      ),
    ),
  ),
]);

const acceptedResults = audit.results.filter(
  (result) => result.disposition === "accepted" && result.accepted,
);
const bySourceHash = new Map();
for (const result of acceptedResults) {
  const hash = result.accepted.source_image_sha256;
  const bucket = bySourceHash.get(hash) ?? [];
  bucket.push(result);
  bySourceHash.set(hash, bucket);
}
const duplicateGroups = [...bySourceHash.entries()]
  .filter(([, results]) => results.length > 1)
  .sort((left, right) => right[1].length - left[1].length);

const facilityById = new Map(
  facilityDocument.facilities.map((facility) => [facility.id, facility]),
);
const baseById = new Map(
  baseDocument.facilities.map((facility) => [facility.id, facility]),
);
let removedCount = 0;
for (const [hash, results] of duplicateGroups) {
  for (const result of results) {
    const facility = facilityById.get(result.facility_id);
    const baseFacility = baseById.get(result.facility_id);
    if (!facility || !baseFacility) {
      throw new Error(`Missing canonical facility ${result.facility_id}`);
    }
    if (!MANAGED_SOURCES.has(facility.image_source)) {
      throw new Error(
        `Refusing to remove unmanaged image for ${facility.slug}: ${facility.image_source}`,
      );
    }
    const expectedPublicPath = `/images/facilities/${facility.slug}.webp`;
    if (facility.image !== expectedPublicPath) {
      throw new Error(
        `Unexpected managed image path for ${facility.slug}: ${facility.image}`,
      );
    }
    const imagePath = resolve(ROOT, "public", expectedPublicPath.slice(1));
    if (!imagePath.startsWith(`${IMAGE_ROOT}${sep}`)) {
      throw new Error(`Resolved image path escaped image root: ${imagePath}`);
    }
    await unlink(imagePath);
    restoreField(facility, baseFacility, "image");
    restoreField(facility, baseFacility, "image_attribution");
    restoreField(facility, baseFacility, "image_source");
    result.retracted = {
      ...result.accepted,
      reason:
        "Identical source image was supplied for multiple canonical facilities; removed to prevent branch/series image reuse.",
      duplicate_source_image_sha256: hash,
      duplicate_facility_ids: results.map((entry) => entry.facility_id),
    };
    result.accepted = null;
    result.disposition = "rejected_shared_across_facilities";
    removedCount += 1;
  }
}

const finalImageCount = facilityDocument.facilities.filter(hasImage).length;
audit.deduplication = {
  checked_at: new Date().toISOString(),
  policy:
    "Every exact duplicate source image shared by multiple canonical facilities was removed from all facilities in that group.",
  duplicate_hash_group_count: duplicateGroups.length,
  removed_facility_count: removedCount,
  groups: duplicateGroups.map(([hash, results]) => ({
    source_image_sha256: hash,
    facility_ids: results.map((result) => result.facility_id),
    facility_names: results.map((result) => result.facility_name),
  })),
};
audit.coverage.accepted_count -= removedCount;
audit.coverage.final_image_count = finalImageCount;
audit.coverage.final_zero_image_count =
  facilityDocument.facilities.length - finalImageCount;
audit.coverage.final_coverage_percent = Number(
  ((finalImageCount / facilityDocument.facilities.length) * 100).toFixed(2),
);

await writeFile(
  FACILITIES_PATH,
  `${JSON.stringify(facilityDocument, null, 2).replace(/\n/g, "\r\n")}\r\n`,
  "utf8",
);
await writeFile(AUDIT_PATH, `${JSON.stringify(audit, null, 2)}\n`, "utf8");

console.log(
  JSON.stringify(
    {
      duplicate_hash_group_count: duplicateGroups.length,
      removed_facility_count: removedCount,
      final_image_count: finalImageCount,
      final_zero_image_count: audit.coverage.final_zero_image_count,
      final_coverage_percent: audit.coverage.final_coverage_percent,
    },
    null,
    2,
  ),
);

function restoreField(facility, baseFacility, key) {
  if (Object.hasOwn(baseFacility, key)) facility[key] = baseFacility[key];
  else delete facility[key];
}

function hasImage(facility) {
  return Boolean(
    (typeof facility.image === "string" && facility.image.trim()) ||
      (Array.isArray(facility.images) && facility.images.some(Boolean)),
  );
}
