#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { resolve, sep } from "node:path";
import sharp from "sharp";

const ROOT = resolve(import.meta.dirname, "..");
const FACILITIES_PATH = resolve(ROOT, "data/facilities_data.json");
const AUDIT_PATH = resolve(
  ROOT,
  "docs/audits/facility-image-coverage-partner-2026-08-27.json",
);
const IMAGE_ROOT = resolve(ROOT, "public/images/facilities");
const IMAGE_FIELDS = new Set(["image", "image_attribution", "image_source"]);
const MANAGED_SOURCES = new Set([
  "asoview-official-partner",
  "rakuten-travel-experiences-official-partner",
]);
const errors = [];

const audit = JSON.parse(await readFile(AUDIT_PATH, "utf8"));
if (!/^[0-9a-f]{40}$/.test(audit.baseline_commit ?? "")) {
  errors.push("audit is missing a valid baseline_commit");
}
const [currentDocument, baseDocument] = await Promise.all([
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

if (currentDocument.facilities.length !== baseDocument.facilities.length) {
  errors.push("facility count changed");
}
const currentById = new Map(
  currentDocument.facilities.map((facility) => [facility.id, facility]),
);
const baseById = new Map(
  baseDocument.facilities.map((facility) => [facility.id, facility]),
);
const acceptedResults = audit.results.filter(
  (result) => result.disposition === "accepted" && result.accepted,
);
const acceptedById = new Map(
  acceptedResults.map((result) => [result.facility_id, result]),
);
const outputHashes = new Map();
const sourceHashes = new Map();
const sourceCounts = {};

for (const [id, baseFacility] of baseById) {
  const current = currentById.get(id);
  if (!current) {
    errors.push(`facility removed: ${id}`);
    continue;
  }
  if (stableJson(withoutImageFields(current)) !== stableJson(withoutImageFields(baseFacility))) {
    errors.push(`non-image fields changed: ${id} ${baseFacility.name}`);
  }

  const baseHasImage = hasImage(baseFacility);
  const currentHasImage = hasImage(current);
  if (baseHasImage) {
    for (const key of IMAGE_FIELDS) {
      if (stableJson(current[key]) !== stableJson(baseFacility[key])) {
        errors.push(`existing image metadata changed: ${id} ${key}`);
      }
    }
    continue;
  }
  const accepted = acceptedById.get(id);
  if (!accepted) {
    if (currentHasImage) errors.push(`un-audited new image: ${id}`);
    continue;
  }
  if (!currentHasImage) {
    errors.push(`accepted facility has no image: ${id}`);
    continue;
  }
  if (!MANAGED_SOURCES.has(current.image_source)) {
    errors.push(`invalid image_source: ${id} ${current.image_source}`);
  }
  sourceCounts[current.image_source] = (sourceCounts[current.image_source] ?? 0) + 1;
  const expectedPath = `/images/facilities/${current.slug}.webp`;
  if (current.image !== expectedPath) {
    errors.push(`unexpected image path: ${id} ${current.image}`);
  }
  if (
    typeof current.image_attribution !== "string" ||
    !current.image_attribution.includes('rel="noopener noreferrer"') ||
    !current.image_attribution.includes('target="_blank"')
  ) {
    errors.push(`missing safe attribution: ${id}`);
  }
  const imagePath = resolve(ROOT, "public", current.image.replace(/^\//u, ""));
  if (!imagePath.startsWith(`${IMAGE_ROOT}${sep}`) || !existsSync(imagePath)) {
    errors.push(`missing or escaped image file: ${id} ${imagePath}`);
    continue;
  }
  const buffer = await readFile(imagePath);
  const metadata = await sharp(buffer).metadata();
  if (metadata.format !== "webp" || metadata.width !== 1200 || metadata.height !== 800) {
    errors.push(
      `unexpected image encoding/dimensions: ${id} ${metadata.format} ${metadata.width}x${metadata.height}`,
    );
  }
  addHash(outputHashes, createHash("sha256").update(buffer).digest("hex"), id);
  addHash(sourceHashes, accepted.accepted.source_image_sha256, id);
}

for (const [hash, ids] of sourceHashes) {
  if (ids.length > 1) errors.push(`duplicate source image hash ${hash}: ${ids.join(",")}`);
}
for (const [hash, ids] of outputHashes) {
  if (ids.length > 1) errors.push(`duplicate output image hash ${hash}: ${ids.join(",")}`);
}

const currentImageCount = currentDocument.facilities.filter(hasImage).length;
const baseImageCount = baseDocument.facilities.filter(hasImage).length;
if (acceptedResults.length !== audit.coverage.accepted_count) {
  errors.push("audit accepted_count mismatch");
}
if (currentImageCount !== audit.coverage.final_image_count) {
  errors.push("audit final_image_count mismatch");
}
if (baseImageCount !== audit.coverage.baseline_image_count) {
  errors.push("audit baseline_image_count mismatch");
}
if (currentImageCount - baseImageCount !== acceptedResults.length) {
  errors.push("coverage delta does not equal accepted facility count");
}

const summary = {
  facility_canon_count: currentDocument.facilities.length,
  baseline_image_count: baseImageCount,
  accepted_new_image_count: acceptedResults.length,
  final_image_count: currentImageCount,
  final_zero_image_count: currentDocument.facilities.length - currentImageCount,
  final_coverage_percent: Number(
    ((currentImageCount / currentDocument.facilities.length) * 100).toFixed(2),
  ),
  source_counts: sourceCounts,
  duplicate_source_hash_groups: [...sourceHashes.values()].filter(
    (ids) => ids.length > 1,
  ).length,
  duplicate_output_hash_groups: [...outputHashes.values()].filter(
    (ids) => ids.length > 1,
  ).length,
  non_image_field_change_count: errors.filter((error) =>
    error.startsWith("non-image fields changed"),
  ).length,
  error_count: errors.length,
};
console.log(JSON.stringify(summary, null, 2));
if (errors.length > 0) {
  for (const error of errors) console.error(`ERROR ${error}`);
  process.exitCode = 1;
}

function hasImage(facility) {
  return Boolean(
    (typeof facility.image === "string" && facility.image.trim()) ||
      (Array.isArray(facility.images) && facility.images.some(Boolean)),
  );
}

function withoutImageFields(facility) {
  return Object.fromEntries(
    Object.entries(facility).filter(([key]) => !IMAGE_FIELDS.has(key)),
  );
}

function stableJson(value) {
  return JSON.stringify(value);
}

function addHash(map, hash, id) {
  const ids = map.get(hash) ?? [];
  ids.push(id);
  map.set(hash, ids);
}
