#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const REVIEW_PATH = resolve(
  ROOT,
  "docs/audits/asoview-base-namespace-facilityops-2026-08-28.json",
);
const CURATION_PATH = resolve(
  ROOT,
  "scripts/data/asoview-base-namespace-addition-curation-2026-08-28.json",
);
const OUTPUT_PATH = resolve(
  ROOT,
  "scripts/data/asoview-base-namespace-additions-2026-08-28.json",
);

const [reviewData, curationData] = await Promise.all([
  readFile(REVIEW_PATH, "utf8").then(JSON.parse),
  readFile(CURATION_PATH, "utf8").then(JSON.parse),
]);
if (reviewData.coverage.pending_count !== 0) {
  throw new Error("refusing to build additions from incomplete FacilityOps review");
}

const addReviews = reviewData.reviews.filter(
  (review) => review.final_status === "ADD",
);
const curationByIdentity = new Map(
  curationData.items.map((item) => [item.asoview_identity, item]),
);
if (
  curationData.items.length !== addReviews.length ||
  curationByIdentity.size !== addReviews.length
) {
  throw new Error(
    `curation mismatch: reviews=${addReviews.length} curation=${curationData.items.length}`,
  );
}

const additions = addReviews.map((review) => {
  const curation = curationByIdentity.get(review.asoview_identity);
  if (!curation) throw new Error(`missing curation: ${review.asoview_identity}`);
  validateReview(review);
  validateCuration(curation);
  const sourceUrls = [
    review.evidence.identity.url,
    review.evidence.address.url,
    review.evidence.current_operation.url,
    ...(curation.additional_source_urls ?? []),
  ].filter((url, index, urls) => url && urls.indexOf(url) === index);
  const facility = {
    name: curation.name,
    prefecture: review.facility.prefecture,
    prefecture_id: prefectureId(review.facility.prefecture),
    category: curation.category,
    category_id: curation.category_id,
    address: cleanAddress(curation.address_override ?? review.facility.address),
    indoor_outdoor: curation.indoor_outdoor,
    rain_friendly: curation.rain_friendly,
    is_free: curation.is_free,
    fee_type: curation.is_free ? "無料" : "有料",
    adult_fee: curation.adult_fee,
    child_fee: curation.child_fee,
    child_use_status: review.evidence.child_use.satisfied
      ? "confirmed"
      : "not_confirmed",
    child_use_notes: curation.child_use_notes,
    description: curation.description,
    target_age: curation.target_age,
    url: curation.official_url ?? review.evidence.identity.url,
    tags: curation.tags,
    latitude: review.facility.latitude,
    longitude: review.facility.longitude,
    geocode_source: review.facility.geocode_source,
    image: null,
    image_attribution: null,
    image_source: null,
    signature_experiences: curation.signature_experiences,
    unique_selling_point: curation.unique_selling_point,
    experience_tags: curation.experience_tags,
    summer_water_play: curation.summer_water_play,
    recommended_for_tags: curation.recommended_for_tags,
    things_to_do: curation.signature_experiences,
    source_urls: sourceUrls.join(", "),
    source_checked_at: "2026-08-28",
    data_quality_status: "confirmed",
    source_notes:
      "Asoviewは発見経路としてのみ使用。施設・運営主体の公式サイトまたは行政一次情報で独立identity、所在地、現行営業、施設構成を確認し、FacilityOps基準で登録。",
  };
  return { asoview_identity: review.asoview_identity, facility };
});

const output = {
  schema_version: 1,
  checked_at: "2026-08-28",
  source_facilityops:
    "docs/audits/asoview-base-namespace-facilityops-2026-08-28.json",
  content_contract: {
    hero_summary:
      "one or two sentences stating what the facility is and its primary experience",
    description:
      "specific detailed experience, composition, characteristics, and seasonality without repeating structured fields",
  },
  count: additions.length,
  additions,
};
await writeFile(OUTPUT_PATH, `${JSON.stringify(output, null, 2)}\n`, "utf8");
console.log(`wrote ${additions.length} curated additions to ${OUTPUT_PATH}`);

function validateReview(review) {
  if (!review.facility) throw new Error(`ADD draft missing: ${review.asoview_identity}`);
  for (const condition of ["identity", "address", "current_operation"]) {
    const evidence = review.evidence?.[condition];
    if (!evidence?.satisfied || !evidence.url || /asoview\.com/iu.test(evidence.url)) {
      throw new Error(`invalid ${condition} evidence: ${review.asoview_identity}`);
    }
  }
}

function validateCuration(curation) {
  for (const field of [
    "name",
    "category",
    "category_id",
    "indoor_outdoor",
    "rain_friendly",
    "adult_fee",
    "child_fee",
    "child_use_notes",
    "description",
    "target_age",
    "unique_selling_point",
    "summer_water_play",
  ]) {
    if (curation[field] === undefined || curation[field] === "") {
      throw new Error(`curation missing ${field}: ${curation.asoview_identity}`);
    }
  }
  for (const field of [
    "tags",
    "signature_experiences",
    "experience_tags",
    "recommended_for_tags",
  ]) {
    if (!Array.isArray(curation[field]) || curation[field].length === 0) {
      throw new Error(`curation missing ${field}: ${curation.asoview_identity}`);
    }
  }
  // Do not manufacture extra experiences to satisfy a presentation quota.
  // The content contract explicitly prefers one supported experience over
  // padded copy when primary information is sparse.
  const summarySentenceCount =
    curation.unique_selling_point.split(/[。！？]/u).filter(Boolean).length;
  if (summarySentenceCount < 1 || summarySentenceCount > 2) {
    throw new Error(`hero summary must be 1-2 sentences: ${curation.asoview_identity}`);
  }
  if (
    normalizeText(curation.description) ===
    normalizeText(curation.unique_selling_point)
  ) {
    throw new Error(`summary/description duplicate: ${curation.asoview_identity}`);
  }
}

function normalizeText(value) {
  return String(value).normalize("NFKC").replace(/[\s\p{P}\p{S}]/gu, "");
}

function cleanAddress(value) {
  return String(value ?? "")
    .normalize("NFKC")
    .replace(/(?:〒\s*){2,}/gu, "〒")
    .replace(/〒\s*\d{3}-?\d{4}\s*/gu, "")
    // Some official access pages append route prose to the street address.
    // Keep the independently addressable facility location, not directions.
    .replace(/・(?:市内中心部|公共交通|バス|電車|お車)[\s\S]*$/u, "")
    .replace(/\s+/gu, " ")
    .trim();
}

function prefectureId(prefecture) {
  const ids = {
    北海道: "hokkaido", 青森県: "aomori", 岩手県: "iwate", 宮城県: "miyagi",
    秋田県: "akita", 山形県: "yamagata", 福島県: "fukushima", 茨城県: "ibaraki",
    栃木県: "tochigi", 群馬県: "gunma", 埼玉県: "saitama", 千葉県: "chiba",
    東京都: "tokyo", 神奈川県: "kanagawa", 新潟県: "niigata", 富山県: "toyama",
    石川県: "ishikawa", 福井県: "fukui", 山梨県: "yamanashi", 長野県: "nagano",
    岐阜県: "gifu", 静岡県: "shizuoka", 愛知県: "aichi", 三重県: "mie",
    滋賀県: "shiga", 京都府: "kyoto", 大阪府: "osaka", 兵庫県: "hyogo",
    奈良県: "nara", 和歌山県: "wakayama", 鳥取県: "tottori", 島根県: "shimane",
    岡山県: "okayama", 広島県: "hiroshima", 山口県: "yamaguchi", 徳島県: "tokushima",
    香川県: "kagawa", 愛媛県: "ehime", 高知県: "kochi", 福岡県: "fukuoka",
    佐賀県: "saga", 長崎県: "nagasaki", 熊本県: "kumamoto", 大分県: "oita",
    宮崎県: "miyazaki", 鹿児島県: "kagoshima", 沖縄県: "okinawa",
  };
  const id = ids[prefecture];
  if (!id) throw new Error(`unknown prefecture: ${prefecture}`);
  return id;
}
