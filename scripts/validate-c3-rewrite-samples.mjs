import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const samplePath = path.join(root, ".codex", "facility-content-c3-rewrite-samples-2026-07-20.md");
const manifestPath = path.join(root, ".codex", "facility-content-c3-manifest-2026-07-20.json");
const facilitiesPath = path.join(root, "data", "facilities_data.json");

const readJson = (file) => JSON.parse(fs.readFileSync(file, "utf8"));
const manifest = readJson(manifestPath);
const facilitiesDocument = readJson(facilitiesPath);
const facilities = Array.isArray(facilitiesDocument)
  ? facilitiesDocument
  : facilitiesDocument.facilities ?? facilitiesDocument.items ?? [];
const markdown = fs.readFileSync(samplePath, "utf8");

const prohibitedPatterns = [
  ["確かめたい代表的な見どころ", /確かめたい.{0,14}見どころ/u],
  ["自分の目や手、体を使い", /自分の(?:目|手|体).{0,14}使/u],
  ["きょうだいで訪れる場合", /きょうだいで訪れ/u],
  ["家族で無理のない", /家族で無理のない/u],
  ["家族のおでかけ先として", /家族のおでかけ先として/u],
  ["公式サイトで確認／確かめてください", /公式(?:サイト|ページ).{0,20}(?:確認|確かめ)(?:して|て)ください/u],
];

const extractCodeBlock = (section, heading) => {
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = section.match(new RegExp("### " + escaped + "[^\\n]*\\n\\n```text\\n([\\s\\S]*?)\\n```", "u"));
  return match?.[1] ?? null;
};

const normalize = (value) => value.replace(/\r\n/g, "\n").trim();
const charLength = (value) => [...value].length;
const sentenceList = (value) => value
  .split(/(?<=[。！？])/u)
  .map((sentence) => sentence.replace(/\s+/gu, " ").trim())
  .filter(Boolean);
const paragraphCount = (value) => value.split(/\n\s*\n/u).filter((part) => part.trim()).length;
const occurrences = (haystack, needle) => needle ? haystack.split(needle).length - 1 : 0;

const shingles = (value, size = 8) => {
  const normalized = value
    .normalize("NFKC")
    .replace(/[\s\p{P}\p{S}\d]/gu, "")
    .toLowerCase();
  const result = new Set();
  for (let index = 0; index <= normalized.length - size; index += 1) {
    result.add(normalized.slice(index, index + size));
  }
  return result;
};

const jaccard = (left, right) => {
  if (left.size === 0 && right.size === 0) return 1;
  let intersection = 0;
  for (const item of left) if (right.has(item)) intersection += 1;
  return intersection / (left.size + right.size - intersection);
};

const sectionMatches = [...markdown.matchAll(/^## Sample (\d+): ([^\n]+?)（([^・]+)・ID (\d+)・([^）]+)）\n([\s\S]*?)(?=^## Sample \d+: |^## サンプル監査結果|(?![\s\S]))/gmu)];
const errors = [];

if (sectionMatches.length !== 10) {
  errors.push(`sample count must be 10, received ${sectionMatches.length}`);
}

const seenIds = new Set();
const seenTypes = new Set();
const revisedDescriptions = [];
const currentSentenceOwners = new Map();
const revisedSentenceOwners = new Map();
const metrics = [];

for (const match of sectionMatches) {
  const [, sampleNumber, name, prefecture, idText, type, section] = match;
  const id = Number(idText);
  const current = extractCodeBlock(section, "現C3文");
  const revised = extractCodeBlock(section, "修正文");
  const officialSection = section.match(/### 公式URL\n\n([\s\S]*?)(?=\n### )/u)?.[1] ?? "";
  const urls = [...officialSection.matchAll(/https:\/\/[^)>\s]+/gu)].map((urlMatch) => urlMatch[0]);
  const entry = manifest.entries.find((item) => Number(item.id) === id);
  const facility = facilities.find((item) => Number(item.id) === id);

  if (seenIds.has(id)) errors.push(`sample ${sampleNumber}: duplicate id ${id}`);
  seenIds.add(id);
  if (seenTypes.has(type)) errors.push(`sample ${sampleNumber}: duplicate type ${type}`);
  seenTypes.add(type);

  if (!entry) errors.push(`sample ${sampleNumber}: id ${id} is outside the C3 manifest`);
  if (!facility) errors.push(`sample ${sampleNumber}: id ${id} is absent from facilities data`);
  if (!current) errors.push(`sample ${sampleNumber}: current C3 text is missing`);
  if (!revised) errors.push(`sample ${sampleNumber}: revised text is missing`);
  if (entry && name !== entry.name) errors.push(`sample ${sampleNumber}: name does not match manifest`);
  if (entry && prefecture !== entry.prefecture) errors.push(`sample ${sampleNumber}: prefecture does not match manifest`);
  if (entry && current && normalize(current) !== normalize(entry.new_description)) {
    errors.push(`sample ${sampleNumber}: current C3 text does not match manifest for id ${id}`);
  }
  if (facility && current && normalize(current) !== normalize(facility.description)) {
    errors.push(`sample ${sampleNumber}: current C3 text does not match Product data for id ${id}`);
  }
  if (urls.length === 0) errors.push(`sample ${sampleNumber}: official URL is missing`);
  if (!/### 具体的に削除したテンプレート表現\n/u.test(section)) {
    errors.push(`sample ${sampleNumber}: deleted-template note is missing`);
  }
  if (!/### 施設固有情報\n/u.test(section)) {
    errors.push(`sample ${sampleNumber}: facility-specific facts are missing`);
  }
  if (!/### 本文へ固定しない変動事項\n/u.test(section)) {
    errors.push(`sample ${sampleNumber}: volatile-facts note is missing`);
  }

  if (!revised) continue;
  const length = charLength(revised);
  const sentences = sentenceList(revised);
  const paragraphs = paragraphCount(revised);
  const nameCount = occurrences(revised, name);
  const prohibitedHits = prohibitedPatterns.filter(([, pattern]) => pattern.test(revised)).map(([label]) => label);

  if (length < 150 || length > 450) errors.push(`sample ${sampleNumber}: revised length ${length} is outside 150-450`);
  if (sentences.length < 3 || sentences.length > 6) errors.push(`sample ${sampleNumber}: sentence count ${sentences.length} is outside 3-6`);
  if (paragraphs < 1 || paragraphs > 3) errors.push(`sample ${sampleNumber}: paragraph count ${paragraphs} is outside 1-3`);
  if (nameCount > 1) errors.push(`sample ${sampleNumber}: facility name is repeated ${nameCount} times`);
  if (prohibitedHits.length > 0) errors.push(`sample ${sampleNumber}: prohibited phrase/structure: ${prohibitedHits.join(", ")}`);

  for (const sentence of sentenceList(current ?? "")) {
    const owners = currentSentenceOwners.get(sentence) ?? [];
    owners.push(id);
    currentSentenceOwners.set(sentence, owners);
  }
  for (const sentence of sentences) {
    const owners = revisedSentenceOwners.get(sentence) ?? [];
    owners.push(id);
    revisedSentenceOwners.set(sentence, owners);
  }
  revisedDescriptions.push({ id, name, revised });
  metrics.push({ id, name, type, current_length: charLength(current ?? ""), revised_length: length, sentences: sentences.length, paragraphs, facility_name_occurrences: nameCount, official_urls: urls.length });
}

if (new Set(revisedDescriptions.map((item) => normalize(item.revised))).size !== revisedDescriptions.length) {
  errors.push("revised descriptions contain an exact duplicate");
}

const duplicatedRevisedSentences = [...revisedSentenceOwners.entries()].filter(([, owners]) => owners.length > 1);
if (duplicatedRevisedSentences.length > 0) {
  errors.push(`revised descriptions contain ${duplicatedRevisedSentences.length} duplicate sentences`);
}

const endingOwners = new Map();
for (const item of revisedDescriptions) {
  const ending = sentenceList(item.revised).at(-1);
  const owners = endingOwners.get(ending) ?? [];
  owners.push(item.id);
  endingOwners.set(ending, owners);
}
const duplicatedEndings = [...endingOwners.entries()].filter(([, owners]) => owners.length > 1);
if (duplicatedEndings.length > 0) errors.push(`revised descriptions contain ${duplicatedEndings.length} duplicate endings`);

let maxSimilarity = { score: 0, ids: [] };
for (let leftIndex = 0; leftIndex < revisedDescriptions.length; leftIndex += 1) {
  for (let rightIndex = leftIndex + 1; rightIndex < revisedDescriptions.length; rightIndex += 1) {
    const left = revisedDescriptions[leftIndex];
    const right = revisedDescriptions[rightIndex];
    const leftText = left.revised.replaceAll(left.name, "");
    const rightText = right.revised.replaceAll(right.name, "");
    const score = jaccard(shingles(leftText), shingles(rightText));
    if (score > maxSimilarity.score) maxSimilarity = { score, ids: [left.id, right.id] };
  }
}
if (maxSimilarity.score >= 0.28) {
  errors.push(`normalized structural similarity is too high: ${maxSimilarity.score.toFixed(3)} for ${maxSimilarity.ids.join("/")}`);
}

const paragraphDistribution = Object.fromEntries(
  [...new Set(metrics.map((item) => item.paragraphs))]
    .sort((left, right) => left - right)
    .map((count) => [String(count), metrics.filter((item) => item.paragraphs === count).length]),
);
if (Object.keys(paragraphDistribution).length < 2) {
  errors.push("all samples use the same paragraph count");
}

const currentDuplicateSentenceCount = [...currentSentenceOwners.values()].filter((owners) => owners.length > 1).length;
const currentProhibitedHits = Object.fromEntries(prohibitedPatterns.map(([label, pattern]) => [
  label,
  sectionMatches.filter((match) => pattern.test(extractCodeBlock(match[6], "現C3文") ?? "")).length,
]));

const report = {
  status: errors.length === 0 ? "GREEN" : "RED",
  samples: metrics,
  audits: {
    revised_exact_duplicate_descriptions: revisedDescriptions.length - new Set(revisedDescriptions.map((item) => normalize(item.revised))).size,
    revised_duplicate_sentences: duplicatedRevisedSentences.length,
    revised_duplicate_endings: duplicatedEndings.length,
    revised_max_normalized_8gram_jaccard: Number(maxSimilarity.score.toFixed(3)),
    revised_max_similarity_pair: maxSimilarity.ids,
    revised_paragraph_distribution: paragraphDistribution,
    current_c3_duplicate_sentences_in_sample: currentDuplicateSentenceCount,
    current_c3_prohibited_structure_hits: currentProhibitedHits,
  },
  errors,
};

console.log(JSON.stringify(report, null, 2));
if (errors.length > 0) process.exitCode = 1;
