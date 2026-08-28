#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const dataUrl = new URL("data/facilities_data.json", root);
const facilityData = JSON.parse(await readFile(dataUrl, "utf8"));
const reportUrl = new URL(
  "docs/audits/facility-content-contract-normalization-2026-08-28.json",
  root,
);
let priorChanges = [];
try {
  priorChanges = JSON.parse(await readFile(reportUrl, "utf8")).changes ?? [];
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}

const manualSummaries = new Map([
  [
    3392,
    "大型遊具・ボールプール・工房体験を屋内で行き来できる、子どもと家族のための体験施設です。",
  ],
  [
    3481,
    "星空保護区の高原景観を味わいながら泊まれる、六呂師高原のキャンプ場です。",
  ],
  [
    3485,
    "越前大野城や雲海、山岳をモチーフにした12の大型遊具で体を動かせる屋内遊び場です。",
  ],
  [
    3549,
    "メガジップや空中アスレチックを、年齢に合わせて楽しめる里山の屋外アクティビティ施設です。",
  ],
  [
    6229,
    "白い砂浜と青い海で夏の海水浴を楽しめる、長門市の季節営業ビーチです。",
  ],
  [
    6556,
    "氷ノ山の自然を展示と野外活動、創作体験で学べる自然系博物館です。",
  ],
  [
    141,
    "富士山を望む環境で、複数のものづくりメニューから選べるクラフト施設です。",
  ],
  [
    2192,
    "慶長遣欧使節の航海とサン・ファン・バウティスタ号を展示で学べる博物館です。",
  ],
  [
    3653,
    "口径81cmの反射望遠鏡で太陽や月、惑星、星雲を観望できる天文科学館です。",
  ],
  [
    3380,
    "入善町の四季を映像で知り、ジャンボ西瓜や町のキャラクターを題材に小物を作れる体験施設です。",
  ],
]);

const changes = [];
for (const facility of facilityData.facilities) {
  const previousSummary = text(facility.unique_selling_point);
  const previousDescription = text(facility.description);
  const summary = buildSummary(facility, previousSummary, previousDescription);
  const description = buildDescription(facility, previousDescription, summary);

  if (summary !== previousSummary || description !== previousDescription) {
    changes.push({
      facility_id: facility.id,
      facility_slug: facility.slug,
      facility_name: facility.name,
      summary_changed: summary !== previousSummary,
      description_changed: description !== previousDescription,
      summary_before: previousSummary,
      summary_after: summary,
      description_before: previousDescription,
      description_after: description,
    });
    facility.unique_selling_point = summary;
    facility.description = description;
  }
}

await writeFile(dataUrl, `${JSON.stringify(facilityData, null, 2)}\n`, "utf8");
const mergedChanges = mergeChanges(priorChanges, changes);
await writeFile(
  reportUrl,
  `${JSON.stringify(
    {
      schema_version: 1,
      normalized_at: "2026-08-28",
      source_baseline:
        "docs/audits/facility-content-contract-baseline-2026-08-28.json",
      contract: {
        hero_summary_field: "unique_selling_point",
        summary_max_characters: 120,
        summary_max_sentences: 2,
        description_may_be_empty_when_no_distinct_verified_detail_remains: true,
      },
      coverage: {
        facility_count: facilityData.facilities.length,
        changed_facility_count: mergedChanges.length,
        summary_changed_count: mergedChanges.filter((change) => change.summary_changed)
          .length,
        description_changed_count: mergedChanges.filter(
          (change) => change.description_changed,
        ).length,
      },
      changes: mergedChanges,
    },
    null,
    2,
  )}\n`,
  "utf8",
);

console.log(
  JSON.stringify(
    {
      facility_count: facilityData.facilities.length,
      changed_facility_count: changes.length,
      summary_changed_count: changes.filter((change) => change.summary_changed)
        .length,
      description_changed_count: changes.filter(
        (change) => change.description_changed,
      ).length,
    },
    null,
    2,
  ),
);

function buildSummary(facility, previousSummary, previousDescription) {
  const manual = manualSummaries.get(facility.id);
  if (manual) return manual;

  const candidates = [previousSummary, previousDescription]
    .flatMap(sentences)
    .map(cleanSummarySentence)
    .filter(Boolean)
    .filter((candidate) => !hasStructuredOrPolicyFiller(candidate));
  const selected = candidates[0] ?? "";
  if (characters(selected) <= 120) return selected;

  const clauses = selected
    .split(/(?<=[、，])/u)
    .map((part) => part.trim())
    .filter(Boolean);
  let shortened = "";
  for (const clause of clauses) {
    if (characters(shortened + clause) > 110) break;
    shortened += clause;
    if (characters(shortened) >= 45) break;
  }
  return shortened.replace(/[、，]$/u, "").trim();
}

function cleanSummarySentence(value) {
  return text(value)
    .replace(/(?:・|、)?星(?:評価)?\s*\d(?:\.\d+)?(?:の人気スポット|トップクラス)?/gu, "")
    .replace(/(?:・|、)?口コミ高評価/gu, "")
    .replace(/(?:・|、)?最高評価/gu, "")
    .replace(/\s+/gu, " ")
    .replace(/\s+([。！？!?])/gu, "$1")
    .trim();
}

function buildDescription(facility, previousDescription, summary) {
  const structuredValues = [
    facility.address,
    facility.adult_fee,
    facility.child_fee,
    facility.target_age,
  ]
    .map(text)
    .filter((value) => characters(value) >= 12);

  return sentences(previousDescription)
    .map(cleanDescriptionSentence)
    .filter(Boolean)
    .filter((sentence) => !hasStructuredOrPolicyFiller(sentence))
    .filter(
      (sentence) =>
        !structuredValues.some((structuredValue) =>
          sentence.includes(structuredValue),
        ),
    )
    .filter(
      (sentence) =>
        !isSummaryDuplicate(sentence, summary, facility.name),
    )
    .join("")
    .replace(/。。+/gu, "。")
    .trim();
}

function cleanDescriptionSentence(value) {
  return text(value)
    .replace(/(?:、|。)?星(?:評価)?\s*\d(?:\.\d+)?(?:の人気スポット|トップクラス|と高評価)?/gu, "")
    .replace(/(?:、|。)?\d[\d,]*件のレビュー/gu, "")
    .replace(/(?:、|。)?いこーよ(?:満足度|注目度)No\.1/giu, "")
    .replace(/^[。．、，\s]+/u, "")
    .replace(/\s+/gu, " ")
    .trim();
}

function isSummaryDuplicate(sentence, summary, facilityName) {
  const normalizedSummary = normalize(summary, facilityName);
  const normalizedSentence = normalize(sentence, facilityName);
  if (normalizedSummary.length < 8 || normalizedSentence.length < 8) return false;
  if (
    normalizedSummary.includes(normalizedSentence) ||
    normalizedSentence.includes(normalizedSummary)
  ) {
    return true;
  }
  return diceSimilarity(normalizedSummary, normalizedSentence) >= 0.5;
}

function text(value) {
  return typeof value === "string" ? value.replace(/\r\n/g, "\n").trim() : "";
}

function characters(value) {
  return [...value].length;
}

function sentences(value) {
  return text(value)
    .split(/(?<=[。！？!?])|\n+/u)
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

function mergeChanges(previous, current) {
  const merged = new Map(previous.map((change) => [change.facility_id, change]));
  for (const change of current) {
    const prior = merged.get(change.facility_id);
    if (!prior) {
      merged.set(change.facility_id, change);
      continue;
    }
    merged.set(change.facility_id, {
      ...prior,
      summary_changed: prior.summary_changed || change.summary_changed,
      description_changed:
        prior.description_changed || change.description_changed,
      summary_after: change.summary_after,
      description_after: change.description_after,
    });
  }
  return [...merged.values()].sort(
    (left, right) => left.facility_id - right.facility_id,
  );
}
