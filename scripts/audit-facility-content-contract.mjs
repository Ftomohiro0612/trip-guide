#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const facilityData = JSON.parse(
  await readFile(new URL("data/facilities_data.json", root), "utf8"),
);
const outputArg = process.argv.indexOf("--output");
const outputPath =
  outputArg >= 0 ? process.argv[outputArg + 1] : null;

if (outputArg >= 0 && !outputPath) {
  throw new Error("--output requires a path");
}

const issues = [];
for (const facility of facilityData.facilities) {
  const summary = text(facility.unique_selling_point);
  const description = text(facility.description);
  const summaryLength = characters(summary);
  const summarySentenceCount = sentences(summary).length;
  const firstDescriptionSentence = sentences(description)[0] ?? "";

  if (!summary) addIssue(facility, "SUMMARY_MISSING");
  if (summaryLength > 120) {
    addIssue(facility, "SUMMARY_TOO_LONG", { summary_length: summaryLength });
  }
  if (summarySentenceCount > 2) {
    addIssue(facility, "SUMMARY_TOO_MANY_SENTENCES", {
      summary_sentence_count: summarySentenceCount,
    });
  }
  if (hasStructuredOrPolicyFiller(summary)) {
    addIssue(facility, "SUMMARY_STRUCTURED_OR_POLICY_FILLER");
  }

  const normalizedSummary = normalize(summary, facility.name);
  const normalizedDescription = normalize(description, facility.name);
  if (
    normalizedSummary.length >= 8 &&
    normalizedDescription.includes(normalizedSummary)
  ) {
    addIssue(facility, "SUMMARY_REPEATED_IN_DESCRIPTION");
  } else if (
    normalizedSummary.length >= 8 &&
    normalize(firstDescriptionSentence, facility.name).length >= 8 &&
    diceSimilarity(
      normalizedSummary,
      normalize(firstDescriptionSentence, facility.name),
    ) >= 0.5
  ) {
    addIssue(facility, "SUMMARY_NEAR_DUPLICATE_DESCRIPTION_LEAD");
  }

  if (hasStructuredOrPolicyFiller(description)) {
    addIssue(facility, "DESCRIPTION_STRUCTURED_OR_POLICY_FILLER");
  }
  if (containsRepeatedStructuredValue(facility, description)) {
    addIssue(facility, "DESCRIPTION_REPEATS_STRUCTURED_VALUE");
  }
}

const countsByCode = Object.fromEntries(
  [...new Set(issues.map((issue) => issue.code))]
    .sort()
    .map((code) => [code, issues.filter((issue) => issue.code === code).length]),
);
const facilityIdsWithIssues = [...new Set(issues.map((issue) => issue.facility_id))];
const report = {
  schema_version: 1,
  audited_at: new Date().toISOString().slice(0, 10),
  contract: {
    summary:
      "Hero copy is a short one-to-two-sentence statement of what the facility is and its primary experience.",
    description:
      "About copy adds facility-specific experiences, composition, characteristics, or seasonality without repeating the summary or structured UI.",
    summary_max_characters: 120,
    summary_max_sentences: 2,
    near_duplicate_lead_dice_threshold: 0.5,
  },
  coverage: {
    facility_count: facilityData.facilities.length,
    facilities_with_issues: facilityIdsWithIssues.length,
    issue_count: issues.length,
    counts_by_code: countsByCode,
  },
  issues,
};

const payload = `${JSON.stringify(report, null, 2)}\n`;
if (outputPath) {
  await writeFile(new URL(outputPath, root), payload, "utf8");
}

console.log(
  JSON.stringify(
    {
      facility_count: report.coverage.facility_count,
      facilities_with_issues: report.coverage.facilities_with_issues,
      issue_count: report.coverage.issue_count,
      counts_by_code: report.coverage.counts_by_code,
      output: outputPath,
    },
    null,
    2,
  ),
);

if (!outputPath && issues.length > 0) process.exitCode = 1;

function addIssue(facility, code, details = {}) {
  issues.push({
    facility_id: facility.id,
    facility_slug: facility.slug,
    facility_name: facility.name,
    code,
    ...details,
  });
}

function text(value) {
  return typeof value === "string" ? value.replace(/\r\n/g, "\n").trim() : "";
}

function characters(value) {
  return [...value].length;
}

function sentences(value) {
  return value
    .split(/(?<=[。！？!?])/u)
    .map((part) => part.trim())
    .filter(Boolean);
}

function normalize(value, facilityName = "") {
  return text(value)
    .normalize("NFKC")
    .toLocaleLowerCase("ja")
    .replaceAll(text(facilityName).normalize("NFKC").toLocaleLowerCase("ja"), "")
    .replace(/^[^、。]{0,40}は[、,]?/u, "")
    .replace(/[\s\p{P}\p{S}]/gu, "");
}

function grams(value) {
  const result = new Set();
  for (let index = 0; index < value.length - 2; index += 1) {
    result.add(value.slice(index, index + 3));
  }
  return result;
}

function diceSimilarity(left, right) {
  const leftGrams = grams(left);
  const rightGrams = grams(right);
  if (leftGrams.size + rightGrams.size === 0) return 0;
  let intersection = 0;
  for (const value of leftGrams) {
    if (rightGrams.has(value)) intersection += 1;
  }
  return (2 * intersection) / (leftGrams.size + rightGrams.size);
}

function hasStructuredOrPolicyFiller(value) {
  return [
    /公式(?:一次情報|情報|掲載|サイト|ホームページ|HP|案内).{0,55}(?:確認|確かめ|記録)/u,
    /(?:対象年齢|年齢・身長).{0,30}(?:料金|営業時間|営業日|予約).{0,55}(?:確認|確かめ)/u,
    /(?:営業日|開館日)、料金、予約.{0,55}公式サイトで確認/u,
    /(?:対象年齢|所要時間).{0,30}(?:異なります|異なる)/u,
    /家族は.{0,45}(?:予約|開催内容|受け取り方法).{0,45}確認/u,
    /親子の興味と滞在時間に合わせた過ごし方ができます/u,
    /親子で体験・観察・遊びを組み合わせやすく/u,
    /短時間のおでかけにも組み込みやすいスポット/u,
    /子ども利用条件は(?:確認できないためunknown|公式情報に基づいて記録)/u,
    /みえ安心おもてなし施設認証制度/u,
    /九州観光・大分観光にピッタリな情報が満載/u,
    /福岡県・博多、北九州・小倉からのアクセスも便利/u,
    /\*{20,}/u,
  ].some((pattern) => pattern.test(value));
}

function containsRepeatedStructuredValue(facility, description) {
  const values = [
    facility.address,
    facility.adult_fee,
    facility.child_fee,
    facility.target_age,
  ]
    .map(text)
    .filter((value) => characters(value) >= 12);
  return values.some((value) => description.includes(value));
}
