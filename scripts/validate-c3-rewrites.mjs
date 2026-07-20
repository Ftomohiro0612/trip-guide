import fs from "node:fs";
import { execFileSync } from "node:child_process";

const baseHead = "27a179528cce5edca6030408e2f590f310798054";
const manifest = JSON.parse(fs.readFileSync(".codex/facility-content-c3-manifest-2026-07-20.json", "utf8"));
const currentDocument = JSON.parse(fs.readFileSync("data/facilities_data.json", "utf8"));
const baseDocument = JSON.parse(execFileSync("git", ["show", `${baseHead}:data/facilities_data.json`], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }));
const current = currentDocument.facilities ?? currentDocument;
const base = baseDocument.facilities ?? baseDocument;
const currentById = new Map(current.map((facility) => [Number(facility.id), facility]));
const baseById = new Map(base.map((facility) => [Number(facility.id), facility]));
const targetIds = new Set(manifest.entries.map((entry) => Number(entry.id)));
const appliedThrough = Number(manifest.rewrite?.applied_through ?? 0);
const errors = [];
const warnings = [];
const forbidden = [
  /確かめたい代表的な見どころ/u,
  /体験の軸にして/u,
  /自分の目や手、体を使いながら/u,
  /きょうだいで訪れる場合/u,
  /ならではの展示や体験/u,
  /見る・動く・考える/u,
  /最新案内を確かめます/u,
  /当日案内を確かめます/u,
  /案内を確認します/u,
  /こととき/u,
  /楽しむことを楽しむこと/u,
  /観光情報公式サイトです/u,
  /「[^」]+」の情報は「[^」]+」で/u,
];

const normalize = (value) => String(value ?? "").normalize("NFKC").replace(/\s+/gu, " ").trim();
const sentenceList = (value) => normalize(value).split(/(?<=[。！？])/u).map((sentence) => sentence.trim()).filter(Boolean);
const charLength = (value) => [...String(value ?? "")].length;
const paragraphs = (value) => String(value ?? "").split(/\n\s*\n/u).filter((part) => part.trim());
const structural = (entry) => normalize(entry.new_description)
  .replaceAll(normalize(entry.name), "施設")
  .replace(/[0-9０-９]+/gu, "#")
  .replace(/[「」『』【】()（）・,、。！？!?:：\s]/gu, "");
const grams = (value, size = 6) => new Set(Array.from({ length: Math.max(0, value.length - size + 1) }, (_, index) => value.slice(index, index + size)));
const jaccard = (left, right) => {
  const a = grams(left); const b = grams(right);
  if (!a.size || !b.size) return 0;
  let intersection = 0;
  for (const value of a) if (b.has(value)) intersection += 1;
  return intersection / (a.size + b.size - intersection);
};

if (manifest.entries.length !== 200) errors.push(`manifest entries: ${manifest.entries.length} (expected 200)`);
if (targetIds.size !== 200) errors.push(`unique target IDs: ${targetIds.size} (expected 200)`);

const descriptionCounts = new Map();
const sentenceOwners = new Map();
const normalizedTemplateOwners = new Map();
const introOwners = new Map();
const endingOwners = new Map();
const sentenceDistribution = {};
const paragraphDistribution = {};
const lengths = [];

for (const entry of manifest.entries) {
  const description = String(entry.new_description ?? "").trim();
  const length = charLength(description);
  const sentences = sentenceList(description);
  const paragraphCount = paragraphs(description).length;
  lengths.push(length);
  sentenceDistribution[sentences.length] = (sentenceDistribution[sentences.length] ?? 0) + 1;
  paragraphDistribution[paragraphCount] = (paragraphDistribution[paragraphCount] ?? 0) + 1;
  if (length < 150 || length > 450) errors.push(`ID ${entry.id}: length ${length}`);
  if (sentences.length < 3 || sentences.length > 6) errors.push(`ID ${entry.id}: sentence count ${sentences.length}`);
  if (paragraphCount < 1 || paragraphCount > 3) errors.push(`ID ${entry.id}: paragraph count ${paragraphCount}`);
  const nameCount = normalize(description).split(normalize(entry.name)).length - 1;
  if (nameCount > 2) errors.push(`ID ${entry.id}: facility name repeated ${nameCount} times`);
  for (const pattern of forbidden) if (pattern.test(description)) errors.push(`ID ${entry.id}: forbidden ${pattern}`);
  const key = normalize(description);
  (descriptionCounts.get(key) ?? descriptionCounts.set(key, []).get(key)).push(entry.id);
  for (const sentence of sentences) {
    if (charLength(sentence) < 24) continue;
    const actualSentence = normalize(sentence);
    const normalizedSentence = actualSentence.replaceAll(normalize(entry.name), "施設");
    (sentenceOwners.get(actualSentence) ?? sentenceOwners.set(actualSentence, []).get(actualSentence)).push(entry.id);
    (normalizedTemplateOwners.get(normalizedSentence) ?? normalizedTemplateOwners.set(normalizedSentence, []).get(normalizedSentence)).push(entry.id);
  }
  const intro = normalize(description).replaceAll(normalize(entry.name), "施設").slice(0, 42);
  const ending = normalize(sentences.at(-1)).replaceAll(normalize(entry.name), "施設");
  (introOwners.get(intro) ?? introOwners.set(intro, []).get(intro)).push(entry.id);
  (endingOwners.get(ending) ?? endingOwners.set(ending, []).get(ending)).push(entry.id);
  if (!entry.official_source?.url) errors.push(`ID ${entry.id}: official source URL missing`);
}

for (const [text, ids] of descriptionCounts) if (ids.length > 1) errors.push(`exact duplicate ${ids.join(",")}: ${text.slice(0, 40)}`);
for (const [text, ids] of sentenceOwners) if (ids.length > 1) warnings.push(`sentence duplicate ${ids.join(",")}: ${text.slice(0, 60)}`);
for (const [text, ids] of normalizedTemplateOwners) if (ids.length > 1) warnings.push(`normalized sentence structure ${ids.join(",")}: ${text.slice(0, 60)}`);
for (const [text, ids] of introOwners) if (ids.length > 1) warnings.push(`same intro ${ids.join(",")}: ${text}`);
for (const [text, ids] of endingOwners) if (ids.length > 1) warnings.push(`same ending ${ids.join(",")}: ${text.slice(0, 60)}`);

let maximumSimilarity = { score: 0, ids: [] };
const similarPairs = [];
for (let left = 0; left < manifest.entries.length; left += 1) {
  for (let right = left + 1; right < manifest.entries.length; right += 1) {
    const score = jaccard(structural(manifest.entries[left]), structural(manifest.entries[right]));
    if (score > maximumSimilarity.score) maximumSimilarity = { score, ids: [manifest.entries[left].id, manifest.entries[right].id] };
    if (score >= 0.72) similarPairs.push({ ids: [manifest.entries[left].id, manifest.entries[right].id], score });
  }
}
if (similarPairs.some((pair) => pair.score >= 0.84)) errors.push(`structural similarity >= 0.84: ${JSON.stringify(similarPairs.filter((pair) => pair.score >= 0.84).slice(0, 10))}`);

let changedFacilities = 0;
for (const facility of current) {
  const before = baseById.get(Number(facility.id));
  if (!before) { errors.push(`new facility ID ${facility.id}`); continue; }
  if (JSON.stringify(facility) === JSON.stringify(before)) continue;
  changedFacilities += 1;
  const keys = new Set([...Object.keys(before), ...Object.keys(facility)]);
  const changedKeys = [...keys].filter((key) => JSON.stringify(before[key]) !== JSON.stringify(facility[key]));
  const entry = manifest.entries.find((item) => Number(item.id) === Number(facility.id));
  if (!targetIds.has(Number(facility.id)) || Number(entry?.position) > appliedThrough || changedKeys.join(",") !== "description") {
    errors.push(`scope violation ID ${facility.id}: ${changedKeys.join(",")}`);
  }
}
if (changedFacilities !== appliedThrough) errors.push(`changed facilities ${changedFacilities} (expected ${appliedThrough})`);

const allUnder100 = current.filter((facility) => charLength(facility.description) < 100).length;
const summary = {
  status: errors.length ? "FAIL" : "PASS",
  applied_through: appliedThrough,
  targets: manifest.entries.length,
  changed_facilities: changedFacilities,
  official_sources_resolved: manifest.rewrite?.official_source_resolved,
  quality_issues: manifest.rewrite?.quality_issue_count,
  length: { total: lengths.reduce((sum, value) => sum + value, 0), average: Number((lengths.reduce((sum, value) => sum + value, 0) / lengths.length).toFixed(2)), min: Math.min(...lengths), max: Math.max(...lengths) },
  sentences: sentenceDistribution,
  paragraphs: paragraphDistribution,
  all_facilities_under_100: allUnder100,
  exact_duplicates: [...descriptionCounts.values()].filter((ids) => ids.length > 1).length,
  repeated_sentences: [...sentenceOwners.values()].filter((ids) => ids.length > 1).length,
  normalized_repeated_sentence_structures: [...normalizedTemplateOwners.values()].filter((ids) => ids.length > 1).length,
  repeated_intros: [...introOwners.values()].filter((ids) => ids.length > 1).length,
  repeated_endings: [...endingOwners.values()].filter((ids) => ids.length > 1).length,
  maximum_structural_similarity: maximumSimilarity,
  structural_pairs_at_or_above_0_72: similarPairs.length,
  warnings: warnings.slice(0, 20),
  errors: errors.slice(0, 50),
};
console.log(JSON.stringify(summary, null, 2));
if (errors.length) process.exitCode = 1;
