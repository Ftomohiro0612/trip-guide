import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

const markdown = readFileSync(".codex/facility-content-c3-rewrite-samples-2026-07-20.md", "utf8").replace(/\r\n/g, "\n");
const manifest = JSON.parse(readFileSync(".codex/facility-content-c3-manifest-2026-07-20.json", "utf8"));
const document = JSON.parse(readFileSync("data/facilities_data.json", "utf8"));
const entryById = new Map(manifest.entries.map((entry) => [Number(entry.id), entry]));
const facilityById = new Map(document.facilities.map((facility) => [Number(facility.id), facility]));
const sha256 = (value) => createHash("sha256").update(value, "utf8").digest("hex");
const matches = [...markdown.matchAll(/## Sample\s+(\d+):\s+(.+?)（([^・]+)・ID\s*(\d+)・([^）]+)）[\s\S]*?### 修正文\n\n```text\n([\s\S]*?)\n```/g)];
const errors = [];
const samples = [];
if (matches.length !== 10) errors.push(`sample count ${matches.length}/10`);
const ids = new Set();
for (const match of matches) {
  const [, sampleNumber, name, prefecture, idText, type, revisedBlock] = match;
  const id = Number(idText); const revised = revisedBlock.trim(); const entry = entryById.get(id); const facility = facilityById.get(id);
  if (ids.has(id)) errors.push(`sample ${sampleNumber}: duplicate ID ${id}`); ids.add(id);
  if (!entry || !facility) errors.push(`sample ${sampleNumber}: ID ${id} missing from manifest/Product`);
  if (entry?.name !== name || entry?.prefecture !== prefecture) errors.push(`sample ${sampleNumber}: identity mismatch for ID ${id}`);
  if (entry?.new_description !== revised) errors.push(`sample ${sampleNumber}: manifest text differs for ID ${id}`);
  if (facility?.description !== revised) errors.push(`sample ${sampleNumber}: Product text differs for ID ${id}`);
  if (entry?.new_sha256 !== sha256(revised)) errors.push(`sample ${sampleNumber}: hash differs for ID ${id}`);
  samples.push({ sample: Number(sampleNumber), id, name, prefecture, type, length: [...revised].length, sha256: sha256(revised), exact: entry?.new_description === revised && facility?.description === revised });
}
console.log(JSON.stringify({ status: errors.length ? "RED" : "GREEN", exact_matches: `${samples.filter((sample) => sample.exact).length}/10`, samples, errors }, null, 2));
if (errors.length) process.exitCode = 1;
