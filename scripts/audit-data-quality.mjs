import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = resolve(__dirname, "..");
const DATA_PATH = resolve(ROOT_DIR, "data", "facilities_data.json");
const REPORT_DIR = resolve(ROOT_DIR, ".codex");

const PREFS = [
  "北海道",
  "青森県",
  "岩手県",
  "宮城県",
  "秋田県",
  "山形県",
  "福島県",
  "茨城県",
  "栃木県",
  "群馬県",
  "埼玉県",
  "千葉県",
  "東京都",
  "神奈川県",
  "新潟県",
  "富山県",
  "石川県",
  "福井県",
  "山梨県",
  "長野県",
  "岐阜県",
  "静岡県",
  "愛知県",
  "三重県",
  "滋賀県",
  "京都府",
  "大阪府",
  "兵庫県",
  "奈良県",
  "和歌山県",
  "鳥取県",
  "島根県",
  "岡山県",
  "広島県",
  "山口県",
  "徳島県",
  "香川県",
  "愛媛県",
  "高知県",
  "福岡県",
  "佐賀県",
  "長崎県",
  "熊本県",
  "大分県",
  "宮崎県",
  "鹿児島県",
  "沖縄県",
];

const FAKE_ADDRESS_PATTERNS = ["各エリア", "都内", "アクセス", "近郊", "周辺"];

const CORE_TAGS = {
  aquarium: ["animal", "exhibition"],
  zoo: ["animal", "animal_contact", "animal_feed"],
  farm: ["animal_contact", "animal_feed", "food", "experience"],
  "science-museum": ["science", "exhibition"],
  "art-museum": ["exhibition"],
  museum: ["exhibition", "experience"],
  experience: ["experience", "craft"],
  "indoor-play": ["playground", "character", "craft", "vehicle"],
  "indoor-theme-park": ["character", "experience", "playground"],
  "nature-park": ["nature", "wide_space", "running"],
  park: ["playground", "wide_space", "running", "nature"],
  "water-park": ["water_play", "pool"],
  athletic: ["athletic", "playground", "running"],
  camping: ["nature", "wide_space"],
  viewpoint: ["nature", "wide_space"],
  scenic: ["nature"],
};

const SUSPICIOUS_SOLO_TAGS = {
  aquarium: ["playground"],
  zoo: ["playground"],
  "science-museum": ["playground"],
  experience: ["playground"],
  "indoor-theme-park": ["playground"],
  museum: ["playground"],
};

function extractPrefFromAddress(address) {
  if (!address) return null;
  for (const p of PREFS) {
    if (address.includes(p)) return p;
  }
  return null;
}

function normalizeTags(tags) {
  return Array.isArray(tags) ? tags.filter((tag) => typeof tag === "string") : [];
}

function createIssue(facility, issueType, reason) {
  return {
    id: facility.id,
    name: facility.name,
    prefecture: facility.prefecture,
    address: facility.address,
    category_id: facility.category_id,
    recommended_for_tags: normalizeTags(facility.recommended_for_tags),
    description: facility.description ?? null,
    issue_type: issueType,
    needs_web_check: true,
    web_check_reason: reason,
    web_check_status: "pending",
    web_check_result: null,
    web_checked_sources: [],
    needs_human_review: false,
    human_review_reason: null,
  };
}

function checkPrefectureMismatch(facility) {
  const address = facility.address ?? "";
  const fakePattern = FAKE_ADDRESS_PATTERNS.find((pattern) =>
    address.includes(pattern),
  );

  if (fakePattern) {
    return createIssue(
      facility,
      "prefecture_mismatch",
      `address内に '${fakePattern}' パターンあり（架空アドレスの可能性）`,
    );
  }

  const addrPref = extractPrefFromAddress(address);
  const pref = facility.prefecture ?? null;

  if (addrPref === null) {
    return createIssue(
      facility,
      "prefecture_mismatch",
      "住所に都道府県名が含まれておらず prefecture の自動判定不可",
    );
  }

  if (addrPref !== pref) {
    return createIssue(
      facility,
      "prefecture_mismatch",
      `address内の都道府県(${addrPref})とprefecture(${pref})が不一致`,
    );
  }

  return null;
}

function checkTagCategoryMismatch(facility) {
  const category = facility.category_id;
  const coreTags = CORE_TAGS[category];

  if (!coreTags) {
    return null;
  }

  const tags = normalizeTags(facility.recommended_for_tags);
  const hasCoreTag = tags.some((tag) => coreTags.includes(tag));

  if (hasCoreTag) {
    return null;
  }

  const suspiciousTags = SUSPICIOUS_SOLO_TAGS[category] ?? [];
  const hasOnlySuspiciousTags =
    tags.length > 0 && tags.every((tag) => suspiciousTags.includes(tag));

  if (hasOnlySuspiciousTags) {
    return createIssue(
      facility,
      "tag_category_mismatch",
      `category(${category})に対してcoretags不在、suspicious tags(${tags.join(",")})のみ付与`,
    );
  }

  return createIssue(
    facility,
    "tag_category_mismatch",
    `category(${category})に対してcoretags(${coreTags.join(",")})が付与されていない`,
  );
}

function checkShortDescription(facility) {
  const descriptionLength = facility.description?.length ?? 0;

  if (!facility.description || descriptionLength < 80) {
    return createIssue(
      facility,
      "short_description",
      `description が ${descriptionLength}文字（80文字未満）`,
    );
  }

  return null;
}

async function writeJson(filename, value) {
  await writeFile(
    resolve(REPORT_DIR, filename),
    `${JSON.stringify(value, null, 2)}\n`,
    "utf-8",
  );
}

function generatedDate() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

async function main() {
  const raw = await readFile(DATA_PATH, "utf-8");
  const json = JSON.parse(raw);
  const facilities = Array.isArray(json) ? json : json.facilities;

  if (!Array.isArray(facilities)) {
    throw new Error("facilities_data.json に facilities 配列が見つかりません");
  }

  const categories = [...new Set(facilities.map((f) => f.category_id).filter(Boolean))].sort();
  console.log("category_id list:");
  for (const category of categories) {
    console.log(`- ${category}`);
  }

  const prefectureMismatchFacilities = facilities
    .map(checkPrefectureMismatch)
    .filter(Boolean);
  const tagCategoryMismatchFacilities = facilities
    .map(checkTagCategoryMismatch)
    .filter(Boolean);
  const shortDescriptionFacilities = facilities
    .map(checkShortDescription)
    .filter(Boolean);

  const report = {
    generated_at: generatedDate(),
    total_facilities: facilities.length,
    prefecture_mismatch_count: prefectureMismatchFacilities.length,
    tag_category_mismatch_count: tagCategoryMismatchFacilities.length,
    short_description_count: shortDescriptionFacilities.length,
    total_needs_web_check:
      prefectureMismatchFacilities.length +
      tagCategoryMismatchFacilities.length +
      shortDescriptionFacilities.length,
    total_needs_human_review: 0,
  };

  await mkdir(REPORT_DIR, { recursive: true });
  await writeJson("facility_data_quality_report.json", report);
  await writeJson("prefecture_mismatch_facilities.json", prefectureMismatchFacilities);
  await writeJson("tag_category_mismatch_facilities.json", tagCategoryMismatchFacilities);
  await writeJson("short_description_facilities.json", shortDescriptionFacilities);

  console.log(JSON.stringify(report, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
