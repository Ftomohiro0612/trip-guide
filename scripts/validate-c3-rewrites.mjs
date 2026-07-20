import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

const expectedBase = "e2a8f8240568a8a83f09a1a3c9081d02f207339d";
const manifest = JSON.parse(readFileSync(".codex/facility-content-c3-manifest-2026-07-20.json", "utf8"));
const research = JSON.parse(readFileSync(".codex/facility-content-c3-official-research-2026-07-20.json", "utf8"));
const currentDocument = JSON.parse(readFileSync("data/facilities_data.json", "utf8"));
const baseDocument = JSON.parse(execFileSync("git", ["show", `${expectedBase}:data/facilities_data.json`], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }));
const sampleMarkdown = readFileSync(".codex/facility-content-c3-rewrite-samples-2026-07-20.md", "utf8").replace(/\r\n/g, "\n");

const current = currentDocument.facilities;
const base = baseDocument.facilities;
const currentById = new Map(current.map((facility) => [Number(facility.id), facility]));
const baseById = new Map(base.map((facility) => [Number(facility.id), facility]));
const entryById = new Map(manifest.entries.map((entry) => [Number(entry.id), entry]));
const targetIds = new Set(entryById.keys());
const researchById = new Map(research.results.map((entry) => [Number(entry.id), entry]));
const errors = [];
const sha256 = (value) => createHash("sha256").update(String(value), "utf8").digest("hex");
const length = (value) => [...String(value)].length;
const sentences = (value) => String(value).split(/[。！？]/u).map((part) => part.trim()).filter(Boolean);
const paragraphs = (value) => String(value).split(/\n\s*\n/u).map((part) => part.trim()).filter(Boolean);
const normalizeStructure = (value) => String(value).normalize("NFKC").replace(/[\s\p{P}\p{S}\d]/gu, "").toLowerCase();

if (manifest.base_commit !== expectedBase) errors.push(`base commit ${manifest.base_commit} != ${expectedBase}`);
if (manifest.entries.length !== 200) errors.push(`manifest count ${manifest.entries.length} != 200`);
if (targetIds.size !== 200) errors.push(`unique target count ${targetIds.size} != 200`);
if (research.target_count !== 200 || research.resolved_count !== 200 || research.issue_count !== 0) errors.push("research summary is not 200/200 resolved with zero issues");
if (researchById.size !== 200 || [...researchById.keys()].some((id) => !targetIds.has(id))) errors.push("research target IDs do not exactly match the manifest");
if (JSON.stringify(currentDocument.metadata) !== JSON.stringify(baseDocument.metadata)) errors.push("data metadata changed outside scope");
if (current.length !== base.length) errors.push(`facility count changed ${base.length} -> ${current.length}`);

const forbidden = [
  /確かめたい代表的な見どころ/u,
  /体験の軸にして/u,
  /自分の目や手、体を使いながら/u,
  /きょうだいで訪れる場合/u,
  /家族で無理のない/u,
  /代表的な展示・遊具・体験/u,
  /地域ならではの自然・文化/u,
  /観光情報公式サイトです/u,
  /情報を探すなら/u,
  /公式掲載の見どころ/u,
  /下現地/u,
  /楽しむことを楽しむこと/u,
  /特産品の特産品/u,
  /魅力が魅力/u,
];
const corruption = [/[�]/u, /(?:Ã|Â|â€|ï¿½)/u, /&(?:nbsp|amp|quot|lt|gt);/iu, /[\u0000-\u0008\u000B\u000C\u000E-\u001F]/u];
const bracketPairs = [["（", "）"], ["「", "」"], ["『", "』"], ["【", "】"]];

const descriptionOwners = new Map();
const sentenceOwners = new Map();
const introOwners = new Map();
const endingOwners = new Map();
const shingleOwners = new Map();
const lengthValues = [];
const sentenceDistribution = {};
const paragraphDistribution = {};
let descriptionHashMatches = 0;
let sourceResolved = 0;
let corruptionCount = 0;

for (const entry of manifest.entries) {
  const id = Number(entry.id);
  const facility = currentById.get(id);
  const before = baseById.get(id);
  const source = researchById.get(id);
  if (!facility || !before) { errors.push(`ID ${id}: missing current/base facility`); continue; }
  if (entry.old_description !== before.description) errors.push(`ID ${id}: manifest old description differs from base`);
  if (entry.new_description !== facility.description) errors.push(`ID ${id}: manifest/Product description mismatch`);
  if (entry.old_sha256 !== sha256(entry.old_description)) errors.push(`ID ${id}: old hash mismatch`);
  if (entry.new_sha256 !== sha256(entry.new_description)) errors.push(`ID ${id}: manifest new hash mismatch`);
  if (sha256(facility.description) === entry.new_sha256) descriptionHashMatches += 1;

  const text = entry.new_description;
  const count = length(text);
  const sentenceCount = sentences(text).length;
  const paragraphCount = paragraphs(text).length;
  lengthValues.push(count);
  sentenceDistribution[sentenceCount] = (sentenceDistribution[sentenceCount] ?? 0) + 1;
  paragraphDistribution[paragraphCount] = (paragraphDistribution[paragraphCount] ?? 0) + 1;
  if (count < 45 || count > 450) errors.push(`ID ${id}: description length ${count} outside 45-450`);
  if (sentenceCount < 2 || sentenceCount > 8) errors.push(`ID ${id}: sentence count ${sentenceCount} outside 2-8`);
  for (const pattern of forbidden) if (pattern.test(text)) errors.push(`ID ${id}: prohibited generated/corrupt phrase ${pattern}`);
  for (const pattern of corruption) if (pattern.test(text)) { corruptionCount += 1; errors.push(`ID ${id}: character corruption ${pattern}`); }
  for (const [open, close] of bracketPairs) {
    const left = [...text].filter((character) => character === open).length;
    const right = [...text].filter((character) => character === close).length;
    if (left !== right) { corruptionCount += 1; errors.push(`ID ${id}: unbalanced ${open}${close} (${left}/${right})`); }
  }

  const official = entry.official_source;
  if (official?.resolved === true && /^https:\/\//u.test(official.url ?? "") && !/trip-guide\.net/iu.test(official.url) && /^[a-f0-9]{64}$/u.test(official.evidence_sha256 ?? "")) sourceResolved += 1;
  else errors.push(`ID ${id}: official source is not hard-resolved`);
  if (!source || source.resolved !== true || source.issue !== null || source.final_url !== official?.url || source.evidence_sha256 !== official?.evidence_sha256 || source.evidence_kind !== official?.evidence_kind) errors.push(`ID ${id}: research/manifest source evidence mismatch`);

  const normalizedDescription = text.normalize("NFKC").replace(/\s+/gu, " ").trim();
  (descriptionOwners.get(normalizedDescription) ?? descriptionOwners.set(normalizedDescription, []).get(normalizedDescription)).push(id);
  for (const sentence of sentences(text)) {
    if (length(sentence) < 12) continue;
    const normalizedSentence = sentence.normalize("NFKC").replace(/\s+/gu, " ").trim();
    (sentenceOwners.get(normalizedSentence) ?? sentenceOwners.set(normalizedSentence, []).get(normalizedSentence)).push(id);
  }
  const intro = normalizedDescription.replaceAll(entry.name.normalize("NFKC"), "施設").slice(0, 32);
  const ending = sentences(text).at(-1).normalize("NFKC").replaceAll(entry.name.normalize("NFKC"), "施設");
  (introOwners.get(intro) ?? introOwners.set(intro, []).get(intro)).push(id);
  (endingOwners.get(ending) ?? endingOwners.set(ending, []).get(ending)).push(id);
  const compact = normalizeStructure(text);
  const localShingles = new Set();
  for (let index = 0; index <= compact.length - 18; index += 1) localShingles.add(compact.slice(index, index + 18));
  for (const shingle of localShingles) (shingleOwners.get(shingle) ?? shingleOwners.set(shingle, []).get(shingle)).push(id);
}

const crossDuplicates = (map) => [...map.entries()].filter(([, ids]) => new Set(ids).size > 1);
const exactDuplicates = crossDuplicates(descriptionOwners);
const repeatedSentences = crossDuplicates(sentenceOwners);
const repeatedIntros = crossDuplicates(introOwners);
const repeatedEndings = crossDuplicates(endingOwners);
const repeatedShingles = crossDuplicates(shingleOwners);
if (exactDuplicates.length) errors.push(`exact duplicate descriptions: ${JSON.stringify(exactDuplicates.slice(0, 5))}`);
if (repeatedSentences.length) errors.push(`repeated sentences: ${JSON.stringify(repeatedSentences.slice(0, 5))}`);
if (repeatedIntros.length) errors.push(`repeated intros: ${JSON.stringify(repeatedIntros.slice(0, 5))}`);
if (repeatedEndings.length) errors.push(`repeated endings: ${JSON.stringify(repeatedEndings.slice(0, 5))}`);
if (repeatedShingles.length) errors.push(`repeated normalized 18-character structures: ${JSON.stringify(repeatedShingles.slice(0, 5))}`);

const grams = (value, size = 8) => {
  const result = new Set();
  for (let index = 0; index <= value.length - size; index += 1) result.add(value.slice(index, index + size));
  return result;
};
let maximumSimilarity = { score: 0, ids: [] };
for (let left = 0; left < manifest.entries.length; left += 1) {
  for (let right = left + 1; right < manifest.entries.length; right += 1) {
    const aEntry = manifest.entries[left]; const bEntry = manifest.entries[right];
    const a = grams(normalizeStructure(aEntry.new_description.replaceAll(aEntry.name, "")));
    const b = grams(normalizeStructure(bEntry.new_description.replaceAll(bEntry.name, "")));
    let intersection = 0; for (const value of a) if (b.has(value)) intersection += 1;
    const score = a.size || b.size ? intersection / (a.size + b.size - intersection) : 0;
    if (score > maximumSimilarity.score) maximumSimilarity = { score, ids: [aEntry.id, bEntry.id] };
  }
}
if (maximumSimilarity.score >= 0.2) errors.push(`maximum normalized structural similarity ${maximumSimilarity.score.toFixed(3)} >= 0.2`);

const changedIds = [];
for (const facility of current) {
  const before = baseById.get(Number(facility.id));
  if (!before) { errors.push(`new facility ${facility.id}`); continue; }
  if (JSON.stringify(facility) === JSON.stringify(before)) continue;
  changedIds.push(Number(facility.id));
  const keys = [...new Set([...Object.keys(before), ...Object.keys(facility)])].filter((key) => JSON.stringify(before[key]) !== JSON.stringify(facility[key]));
  if (keys.length !== 1 || keys[0] !== "description") errors.push(`ID ${facility.id}: out-of-scope fields ${keys.join(",")}`);
  if (!targetIds.has(Number(facility.id))) errors.push(`ID ${facility.id}: changed outside manifest`);
}
const missingChangedTargets = [...targetIds].filter((id) => !changedIds.includes(id));
if (changedIds.length !== 200 || missingChangedTargets.length) errors.push(`changed target set is not exact 200 (changed=${changedIds.length}, missing=${missingChangedTargets.join(",")})`);

const sampleMatches = [...sampleMarkdown.matchAll(/## Sample\s+\d+:\s+(.+?)（[^\n]*?ID\s*(\d+)[^\n]*?）[\s\S]*?### 修正文\n\n```text\n([\s\S]*?)\n```/g)];
let approvedSampleExactMatches = 0;
if (sampleMatches.length !== 10) errors.push(`approved sample parse ${sampleMatches.length}/10`);
for (const match of sampleMatches) {
  const id = Number(match[2]); const expected = match[3].trim(); const entry = entryById.get(id); const facility = currentById.get(id);
  if (entry?.new_description === expected && facility?.description === expected && entry?.new_sha256 === sha256(expected)) approvedSampleExactMatches += 1;
  else errors.push(`ID ${id}: approved sample is not byte-exact after LF normalization`);
}

if (descriptionHashMatches !== 200) errors.push(`description hash matches ${descriptionHashMatches}/200`);
if (sourceResolved !== 200) errors.push(`official sources resolved ${sourceResolved}/200`);
if (approvedSampleExactMatches !== 10) errors.push(`approved sample exact matches ${approvedSampleExactMatches}/10`);

const commonGeneratedStructures = exactDuplicates.length + repeatedSentences.length + repeatedIntros.length + repeatedEndings.length + repeatedShingles.length;
const summary = {
  status: errors.length ? "RED" : "GREEN",
  base_commit: manifest.base_commit,
  targets: manifest.entries.length,
  official_sources_resolved: `${sourceResolved}/200`,
  approved_samples_exact: `${approvedSampleExactMatches}/10`,
  description_hashes_match: `${descriptionHashMatches}/200`,
  character_corruption: corruptionCount,
  common_generated_structures: commonGeneratedStructures,
  out_of_scope_differences: errors.filter((error) => /out-of-scope|outside manifest|facility count|metadata changed/u.test(error)).length,
  changed_description_only_facilities: changedIds.length,
  length: { min: Math.min(...lengthValues), max: Math.max(...lengthValues), average: Number((lengthValues.reduce((sum, value) => sum + value, 0) / lengthValues.length).toFixed(2)) },
  sentences: sentenceDistribution,
  paragraphs: paragraphDistribution,
  maximum_normalized_8gram_jaccard: Number(maximumSimilarity.score.toFixed(4)),
  maximum_similarity_pair: maximumSimilarity.ids,
  errors: errors.slice(0, 100),
};
console.log(JSON.stringify(summary, null, 2));
if (errors.length) process.exitCode = 1;
