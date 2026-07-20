import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";

const manifestPath = ".codex/facility-content-c3-manifest-2026-07-20.json";
const dataPath = "data/facilities_data.json";
const through = Number(process.argv.find((argument) => argument.startsWith("--through="))?.split("=")[1] ?? 200);
if (![0, 50, 100, 150, 200].includes(through)) throw new Error("--through must be 0, 50, 100, 150, or 200");

const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
const document = JSON.parse(readFileSync(dataPath, "utf8"));
const byId = new Map(document.facilities.map((facility) => [Number(facility.id), facility]));
const sha256 = (value) => createHash("sha256").update(String(value), "utf8").digest("hex");
if (manifest.entries.length !== 200 || new Set(manifest.entries.map((entry) => Number(entry.id))).size !== 200) {
  throw new Error("C3 manifest must contain exactly 200 unique curated entries");
}

for (const entry of manifest.entries) {
  const facility = byId.get(Number(entry.id));
  if (!facility) throw new Error(`Missing facility ID ${entry.id}`);
  if (sha256(entry.old_description) !== entry.old_sha256) throw new Error(`Old description hash mismatch for ID ${entry.id}`);
  if (sha256(entry.new_description) !== entry.new_sha256) throw new Error(`Curated description hash mismatch for ID ${entry.id}`);
  facility.description = Number(entry.position) <= through ? entry.new_description : entry.old_description;
}

writeFileSync(dataPath, `${JSON.stringify(document, null, 2)}\n`, "utf8");
console.log(`Applied ${through}/200 hash-locked C3 descriptions from the curated manifest.`);
