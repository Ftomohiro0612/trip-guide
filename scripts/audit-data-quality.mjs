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

const TARGET_PREFECTURES = new Set([
  "静岡県",
  "長野県",
  "山梨県",
  "東京都",
  "茨城県",
  "栃木県",
  "群馬県",
  "大阪府",
  "兵庫県",
  "京都府",
  "愛知県",
  "福岡県",
  "広島県",
  "埼玉県",
  "新潟県",
  "千葉県",
  "神奈川県",
  "宮城県",
  "香川県",
  "熊本県",
  "富山県",
  "福井県",
  "岐阜県",
  "三重県",
]);

const PREFECTURE_ID_BY_PREFECTURE = {
  静岡県: "shizuoka",
  長野県: "nagano",
  山梨県: "yamanashi",
  東京都: "tokyo",
  茨城県: "ibaraki",
  栃木県: "tochigi",
  群馬県: "gunma",
  大阪府: "osaka",
  兵庫県: "hyogo",
  京都府: "kyoto",
  愛知県: "aichi",
  福岡県: "fukuoka",
  広島県: "hiroshima",
  埼玉県: "saitama",
  新潟県: "niigata",
  千葉県: "chiba",
  神奈川県: "kanagawa",
  宮城県: "miyagi",
  香川県: "kagawa",
  熊本県: "kumamoto",
  岡山県: "okayama",
  石川県: "ishikawa",
  大分県: "oita",
  福島県: "fukushima",
  愛媛県: "ehime",
  長崎県: "nagasaki",
  富山県: "toyama",
  福井県: "fukui",
  岐阜県: "gifu",
  三重県: "mie",
};

const NAME_MEMO_TOKENS = ["→", "参考", "除外", "要確認", "TODO", "(削除"];

const FAKE_ADDRESS_PATTERNS = ["各エリア", "都内", "アクセス", "近郊", "周辺"];
const ADDRESS_DETAIL_PATTERN = /[0-9０-９]|丁目|番地|番|号|地内|[-‐‑‒–—―−ー－]/;

const PREFECTURE_BBOXES = {
  茨城県: [{ minLat: 35.7, maxLat: 36.95, minLng: 139.6, maxLng: 140.95 }],
  栃木県: [{ minLat: 36.1, maxLat: 37.2, minLng: 139.2, maxLng: 140.3 }],
  群馬県: [{ minLat: 35.9, maxLat: 37.1, minLng: 138.3, maxLng: 139.8 }],
  大阪府: [{ minLat: 34.25, maxLat: 35.1, minLng: 135.05, maxLng: 135.8 }],
  兵庫県: [{ minLat: 34.15, maxLat: 35.7, minLng: 134.2, maxLng: 135.5 }],
  京都府: [{ minLat: 34.7, maxLat: 35.8, minLng: 134.8, maxLng: 136.1 }],
  愛知県: [{ minLat: 34.55, maxLat: 35.45, minLng: 136.65, maxLng: 137.85 }],
  福岡県: [{ minLat: 33.0, maxLat: 34.05, minLng: 130.0, maxLng: 131.1 }],
  広島県: [{ minLat: 34.0, maxLat: 35.15, minLng: 132.0, maxLng: 133.55 }],
  埼玉県: [{ minLat: 35.7, maxLat: 36.3, minLng: 138.7, maxLng: 139.95 }],
  千葉県: [{ minLat: 34.8, maxLat: 36.15, minLng: 139.65, maxLng: 140.95 }],
  東京都: [
    { minLat: 35.4, maxLat: 35.95, minLng: 138.9, maxLng: 139.95 },
    { minLat: 24, maxLat: 35.7, minLng: 138.9, maxLng: 142.3 },
  ],
  神奈川県: [{ minLat: 35.1, maxLat: 35.7, minLng: 138.9, maxLng: 139.8 }],
  山梨県: [{ minLat: 35.1, maxLat: 35.95, minLng: 138.15, maxLng: 139.2 }],
  長野県: [{ minLat: 35.1, maxLat: 37.05, minLng: 137.55, maxLng: 138.85 }],
  新潟県: [{ minLat: 36.7, maxLat: 38.6, minLng: 137.6, maxLng: 139.9 }],
  静岡県: [{ minLat: 34.5, maxLat: 35.7, minLng: 137.4, maxLng: 139.2 }],
  宮城県: [{ minLat: 37.75, maxLat: 39.05, minLng: 140.2, maxLng: 141.75 }],
  香川県: [{ minLat: 33.95, maxLat: 34.65, minLng: 133.4, maxLng: 134.5 }],
  熊本県: [{ minLat: 32.0, maxLat: 33.35, minLng: 129.9, maxLng: 131.45 }],
  岡山県: [{ minLat: 34.25, maxLat: 35.35, minLng: 133.25, maxLng: 134.55 }],
  石川県: [{ minLat: 36.05, maxLat: 37.95, minLng: 136.15, maxLng: 137.4 }],
  大分県: [{ minLat: 32.65, maxLat: 33.75, minLng: 130.75, maxLng: 132.15 }],
  福島県: [{ minLat: 36.7, maxLat: 38.0, minLng: 139.1, maxLng: 141.1 }],
  愛媛県: [{ minLat: 32.85, maxLat: 34.35, minLng: 131.9, maxLng: 133.75 }],
  長崎県: [{ minLat: 31.8, maxLat: 34.8, minLng: 128.0, maxLng: 130.4 }],
  富山県: [{ minLat: 36.25, maxLat: 36.99, minLng: 136.75, maxLng: 137.8 }],
  福井県: [{ minLat: 35.32, maxLat: 36.33, minLng: 135.42, maxLng: 136.83 }],
  岐阜県: [{ minLat: 35.08, maxLat: 36.47, minLng: 136.27, maxLng: 137.66 }],
  三重県: [{ minLat: 33.66, maxLat: 35.26, minLng: 135.85, maxLng: 136.99 }],
};

const JAPAN_BBOX = {
  minLat: 20,
  maxLat: 46,
  minLng: 122,
  maxLng: 154,
};

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

const CHILD_KEYWORDS = [
  "子ども",
  "子供",
  "こども",
  "親子",
  "家族",
  "キッズ",
  "ファミリー",
  "幼児",
  "小学生",
];

const EXPERIENCE_KEYWORDS = [
  "遊べる",
  "遊び",
  "遊具",
  "体験",
  "楽しめる",
  "楽しむ",
  "ふれあえる",
  "触れ合える",
  "見られる",
  "見れる",
  "学べる",
  "乗れる",
  "作れる",
  "滑り台",
  "プール",
  "水遊び",
  "アスレチック",
  "工作",
  "クラフト",
  "観察",
  "展示",
  "ショー",
  "アトラクション",
  "収穫",
  "キャンプ",
  "自然",
  "動物",
  "餌やり",
  "えさやり",
  "ボールプール",
  "トランポリン",
  "迷路",
  "冒険",
  "散策",
  "芝生",
  "広場",
  "走り回",
  "泳げる",
  "温泉",
  "スキー",
  "雪遊び",
  "そり",
  "釣り",
  "乗馬",
  "ワークショップ",
  "手作り",
  "ものづくり",
  "レジャー",
];

const GENERIC_DESCRIPTION_PATTERNS = [
  "に立地",
  "に位置",
  "にある",
  "にあります",
  "所在地",
  "アクセス",
  "徒歩",
  "駅から",
  "駐車場",
  "営業時間",
  "営業",
  "定休日",
  "入園料",
  "入館料",
  "料金",
  "施設です",
  "スポットです",
  "併設",
  "隣接",
  "県内",
  "市内",
];

const ISSUE_ORDER = [
  "name_memo_pollution",
  "out_of_scope_prefecture",
  "url_na_or_empty",
  "prefecture_id_mismatch",
  "address_pref_mismatch",
  "prefecture_missing_in_address",
  "invalid_address",
  "invalid_coordinates",
  "coord_pref_mismatch",
  "tag_category_conflict",
  "missing_experience",
  "thin_description",
  "short_description",
];

const ISSUE_SEVERITIES = {
  name_memo_pollution: "high",
  out_of_scope_prefecture: "high",
  url_na_or_empty: "medium",
  prefecture_id_mismatch: "high",
  address_pref_mismatch: "high",
  prefecture_missing_in_address: "info",
  invalid_address: "high",
  invalid_coordinates: "high",
  coord_pref_mismatch: "high",
  tag_category_conflict: "medium",
  missing_experience: "medium",
  thin_description: "medium",
  short_description: "low",
};

function findPrefectureMatches(address) {
  if (!address) return [];

  const matches = PREFS.map((prefecture) => ({
    prefecture,
    index: address.indexOf(prefecture),
  }))
    .filter((match) => match.index >= 0)
    .sort((a, b) => a.index - b.index || b.prefecture.length - a.prefecture.length);

  const nonOverlappingMatches = [];
  for (const match of matches) {
    const start = match.index;
    const end = start + match.prefecture.length;
    const overlapsPrevious = nonOverlappingMatches.some((previous) => {
      const previousStart = previous.index;
      const previousEnd = previousStart + previous.prefecture.length;
      return start < previousEnd && end > previousStart;
    });

    if (!overlapsPrevious) {
      nonOverlappingMatches.push(match);
    }
  }

  return nonOverlappingMatches;
}

function extractPrefFromAddress(address) {
  return findPrefectureMatches(address)[0]?.prefecture ?? null;
}

function isTargetPrefecture(prefecture) {
  return TARGET_PREFECTURES.has(prefecture);
}

function normalizeTags(tags) {
  return Array.isArray(tags) ? tags.filter((tag) => typeof tag === "string") : [];
}

function createIssue(
  facility,
  issueType,
  reason,
  { severity = "medium", needsWebCheck = true } = {},
) {
  return {
    id: facility.id,
    name: facility.name,
    prefecture: facility.prefecture,
    address: facility.address,
    latitude: facility.latitude ?? null,
    longitude: facility.longitude ?? null,
    category_id: facility.category_id,
    recommended_for_tags: normalizeTags(facility.recommended_for_tags),
    description: facility.description ?? null,
    issue_type: issueType,
    severity,
    needs_web_check: needsWebCheck,
    web_check_reason: reason,
    web_check_status: "pending",
    web_check_result: null,
    web_checked_sources: [],
    needs_human_review: false,
    human_review_reason: null,
  };
}

function checkNameMemoPollution(facility) {
  const name = typeof facility.name === "string" ? facility.name : "";
  const matchedToken = NAME_MEMO_TOKENS.find((token) => name.includes(token));

  if (!matchedToken) {
    return null;
  }

  return createIssue(
    facility,
    "name_memo_pollution",
    `name にメモ混入トークン '${matchedToken}' を含む`,
    { severity: "high", needsWebCheck: false },
  );
}

function checkOutOfScopePrefecture(facility) {
  const pref = typeof facility.prefecture === "string" ? facility.prefecture : "";
  const addressPrefs = findPrefectureMatches(facility.address ?? "");
  const outOfScopeAddressPrefs = addressPrefs
    .map((match) => match.prefecture)
    .filter((prefecture) => !isTargetPrefecture(prefecture));

  const reasons = [];
  if (!isTargetPrefecture(pref)) {
    reasons.push(`prefecture(${pref || "未入力"})が対象県外`);
  }

  if (outOfScopeAddressPrefs.length > 0) {
    reasons.push(
      `address内に対象県外の都道府県(${[...new Set(outOfScopeAddressPrefs)].join(",")})を含む`,
    );
  }

  if (reasons.length === 0) {
    return null;
  }

  return createIssue(facility, "out_of_scope_prefecture", reasons.join("; "), {
    severity: "high",
  });
}

function checkUrlNaOrEmpty(facility) {
  const url = typeof facility.url === "string" ? facility.url.trim() : "";

  if (!url) {
    return createIssue(facility, "url_na_or_empty", "url が未入力", {
      severity: "medium",
    });
  }

  if (url.toUpperCase() === "N/A") {
    return createIssue(facility, "url_na_or_empty", 'url が "N/A"', {
      severity: "medium",
    });
  }

  if (!/^https?:\/\//i.test(url)) {
    return createIssue(
      facility,
      "url_na_or_empty",
      "url が http(s):// で始まらない",
      { severity: "medium" },
    );
  }

  return null;
}

function checkPrefectureIdMismatch(facility) {
  const expectedPrefectureId = PREFECTURE_ID_BY_PREFECTURE[facility.prefecture];

  if (!expectedPrefectureId) {
    return null;
  }

  const actualPrefectureId =
    typeof facility.prefecture_id === "string" ? facility.prefecture_id.trim() : "";

  if (actualPrefectureId === expectedPrefectureId) {
    return null;
  }

  return createIssue(
    facility,
    "prefecture_id_mismatch",
    `prefecture(${facility.prefecture})の prefecture_id は ${expectedPrefectureId} が期待値、実値は ${actualPrefectureId || "未入力"}`,
    { severity: "high", needsWebCheck: false },
  );
}

function checkAddressPrefMismatch(facility) {
  const addrPref = extractPrefFromAddress(facility.address ?? "");
  const pref = facility.prefecture ?? null;

  if (addrPref && pref && addrPref !== pref) {
    if (!isTargetPrefecture(addrPref) || !isTargetPrefecture(pref)) {
      return null;
    }

    return createIssue(
      facility,
      "address_pref_mismatch",
      `address内の都道府県(${addrPref})とprefecture(${pref})が不一致`,
      { severity: "high" },
    );
  }

  return null;
}

function checkPrefectureMissingInAddress(facility) {
  if (findPrefectureMatches(facility.address ?? "").length > 0) {
    return null;
  }

  return createIssue(
    facility,
    "prefecture_missing_in_address",
    "address に都道府県名が含まれていない",
    { severity: "info", needsWebCheck: false },
  );
}

function checkInvalidAddress(facility) {
  const address = typeof facility.address === "string" ? facility.address.trim() : "";

  if (!address) {
    return createIssue(facility, "invalid_address", "address が未入力", {
      severity: "high",
    });
  }

  const fakePattern = FAKE_ADDRESS_PATTERNS.find((pattern) =>
    address.includes(pattern),
  );

  if (fakePattern) {
    return createIssue(
      facility,
      "invalid_address",
      `address内に '${fakePattern}' パターンあり（架空アドレスの可能性）`,
      { severity: "high" },
    );
  }

  if (!ADDRESS_DETAIL_PATTERN.test(address)) {
    return createIssue(
      facility,
      "invalid_address",
      "address に数字・丁目・番・号・番地・ハイフンが含まれていない",
      { severity: "high" },
    );
  }

  return null;
}

function isNumber(value) {
  return typeof value === "number" && Number.isFinite(value);
}

function isWithinBbox(latitude, longitude, bbox) {
  return (
    latitude >= bbox.minLat &&
    latitude <= bbox.maxLat &&
    longitude >= bbox.minLng &&
    longitude <= bbox.maxLng
  );
}

function checkInvalidCoordinates(facility) {
  const latitude = facility.latitude;
  const longitude = facility.longitude;

  if (!isNumber(latitude) || !isNumber(longitude)) {
    return createIssue(
      facility,
      "invalid_coordinates",
      "latitude / longitude が数値ではない、または未入力",
      { severity: "high" },
    );
  }

  if (latitude === 0 || longitude === 0) {
    return createIssue(
      facility,
      "invalid_coordinates",
      "latitude / longitude が 0",
      { severity: "high" },
    );
  }

  if (!isWithinBbox(latitude, longitude, JAPAN_BBOX)) {
    return createIssue(
      facility,
      "invalid_coordinates",
      "latitude / longitude が日本国外の粗い範囲外",
      { severity: "high" },
    );
  }

  return null;
}

function checkCoordPrefMismatch(facility) {
  if (checkInvalidCoordinates(facility)) {
    return null;
  }

  const bboxes = PREFECTURE_BBOXES[facility.prefecture];
  if (!bboxes) {
    return null;
  }

  const inPrefecture = bboxes.some((bbox) =>
    isWithinBbox(facility.latitude, facility.longitude, bbox),
  );

  if (!inPrefecture) {
    return createIssue(
      facility,
      "coord_pref_mismatch",
      `latitude / longitude が ${facility.prefecture} の粗いbbox外`,
      { severity: "high" },
    );
  }

  return null;
}

function checkTagCategoryConflict(facility) {
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
      "tag_category_conflict",
      `category(${category})に対してcoretags不在、suspicious tags(${tags.join(",")})のみ付与`,
      { severity: "medium" },
    );
  }

  return createIssue(
    facility,
    "tag_category_conflict",
    `category(${category})に対してcoretags(${coreTags.join(",")})が付与されていない`,
    { severity: "medium" },
  );
}

function includesAny(text, keywords) {
  return keywords.some((keyword) => text.includes(keyword));
}

function looksLikeAdministrativeDescription(description) {
  const matchedPatternCount = GENERIC_DESCRIPTION_PATTERNS.filter((pattern) =>
    description.includes(pattern),
  ).length;

  return matchedPatternCount >= 2 || (matchedPatternCount >= 1 && description.length < 120);
}

function checkDescriptionQuality(facility) {
  const description =
    typeof facility.description === "string" ? facility.description.trim() : "";
  const descriptionLength = description.length;
  const hasChildKeyword = includesAny(description, CHILD_KEYWORDS);
  const hasExperienceKeyword = includesAny(description, EXPERIENCE_KEYWORDS);

  if (!hasChildKeyword && !hasExperienceKeyword) {
    return createIssue(
      facility,
      "missing_experience",
      "description に子ども向け体験への言及がない",
      { severity: "medium" },
    );
  }

  if (
    descriptionLength >= 60 &&
    !hasExperienceKeyword &&
    looksLikeAdministrativeDescription(description)
  ) {
    return createIssue(
      facility,
      "thin_description",
      "description が施設名・住所・営業情報中心で体験語彙が乏しい",
      { severity: "medium" },
    );
  }

  if (descriptionLength < 60) {
    return createIssue(
      facility,
      "short_description",
      `description が ${descriptionLength}文字（60文字未満）`,
      { severity: "low" },
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

function countBy(items, getKey) {
  return items.reduce((counts, item) => {
    const key = getKey(item);
    counts[key] = (counts[key] ?? 0) + 1;
    return counts;
  }, {});
}

function sortObjectByKey(value) {
  return Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)));
}

function escapeMarkdownCell(value) {
  return String(value ?? "")
    .replaceAll("\\", "\\\\")
    .replaceAll("|", "\\|")
    .replaceAll("\n", " ");
}

function markdownIssueTable(issues) {
  const rows = issues.slice(0, 10).map((issue) =>
    [
      issue.id,
      issue.name,
      issue.prefecture,
      issue.web_check_reason,
    ]
      .map(escapeMarkdownCell)
      .join(" | "),
  );

  if (rows.length === 0) {
    return "_該当なし_";
  }

  return [
    "| id | name | prefecture | reason |",
    "| --- | --- | --- | --- |",
    ...rows.map((row) => `| ${row} |`),
  ].join("\n");
}

function markdownSampleTable(issues) {
  const rows = issues.slice(0, 5).map((issue) =>
    [issue.id, issue.name, issue.web_check_reason].map(escapeMarkdownCell).join(" | "),
  );

  if (rows.length === 0) {
    return "_該当なし_";
  }

  return [
    "| id | name | reason |",
    "| --- | --- | --- |",
    ...rows.map((row) => `| ${row} |`),
  ].join("\n");
}

function createIssueSamples(issueGroups) {
  return Object.fromEntries(
    ISSUE_ORDER.map((issueType) => [
      issueType,
      (issueGroups[issueType] ?? []).slice(0, 5).map((issue) => ({
        id: issue.id,
        name: issue.name,
        reason: issue.web_check_reason,
      })),
    ]),
  );
}

function buildMarkdownReport(report, issueGroups) {
  const countRows = ISSUE_ORDER.map((issueType) => {
    const issues = issueGroups[issueType] ?? [];
    const severity = issues[0]?.severity ?? ISSUE_SEVERITIES[issueType] ?? "-";
    const needsWebCheckCount = issues.filter((issue) => issue.needs_web_check).length;

    return `| ${issueType} | ${severity} | ${issues.length} | ${needsWebCheckCount} |`;
  });

  const severityRows = ["high", "medium", "low", "info"].map(
    (severity) => `| ${severity} | ${report.severity_counts[severity] ?? 0} |`,
  );

  const warningBlock =
    report.warnings.length > 0
      ? report.warnings.map((warning) => `- ${warning}`).join("\n")
      : "_警告なし_";

  const topIssueSections = ISSUE_ORDER.map(
    (issueType) => `### ${issueType}\n\n${markdownIssueTable(issueGroups[issueType] ?? [])}`,
  ).join("\n\n");

  const sampleIssueTypes = ISSUE_ORDER.filter(
    (issueType) => (issueGroups[issueType] ?? []).length > 0,
  );
  const sampleSections =
    sampleIssueTypes.length > 0
      ? sampleIssueTypes
          .map(
            (issueType) =>
              `### ${issueType}\n\n${markdownSampleTable(issueGroups[issueType] ?? [])}`,
          )
          .join("\n\n")
      : "_該当なし_";

  return [
    "# Facility Data Quality Report",
    "",
    `Generated: ${report.generated_at}`,
    `Total facilities: ${report.total_facilities}`,
    `Total issues: ${report.total_issues}`,
    "",
    "## Category Counts",
    "",
    "| category | severity | count | needs_web_check |",
    "| --- | --- | ---: | ---: |",
    ...countRows,
    "",
    "## Severity Counts",
    "",
    "| severity | count |",
    "| --- | ---: |",
    ...severityRows,
    "",
    "## Warnings",
    "",
    warningBlock,
    "",
    "## Category Samples",
    "",
    sampleSections,
    "",
    "## Top 10 Issues",
    "",
    topIssueSections,
    "",
  ].join("\n");
}

function createIssueGroups(facilities) {
  const issueGroups = Object.fromEntries(ISSUE_ORDER.map((issueType) => [issueType, []]));

  for (const facility of facilities) {
    const checks = [
      checkNameMemoPollution,
      checkOutOfScopePrefecture,
      checkUrlNaOrEmpty,
      checkPrefectureIdMismatch,
      checkAddressPrefMismatch,
      checkPrefectureMissingInAddress,
      checkInvalidAddress,
      checkInvalidCoordinates,
      checkCoordPrefMismatch,
      checkTagCategoryConflict,
    ];

    for (const check of checks) {
      const issue = check(facility);
      if (issue) {
        issueGroups[issue.issue_type].push(issue);
      }
    }

    const descriptionIssue = checkDescriptionQuality(facility);
    if (descriptionIssue) {
      issueGroups[descriptionIssue.issue_type].push(descriptionIssue);
    }
  }

  return issueGroups;
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

  const dataPrefectures = [
    ...new Set(facilities.map((facility) => facility.prefecture).filter(Boolean)),
  ].sort();
  const missingBboxPrefectures = dataPrefectures.filter(
    (prefecture) => !PREFECTURE_BBOXES[prefecture],
  );
  const warnings = missingBboxPrefectures.map(
    (prefecture) => `bbox 未定義の prefecture: ${prefecture}`,
  );

  console.log("prefecture list:");
  for (const prefecture of dataPrefectures) {
    console.log(`- ${prefecture}`);
  }

  for (const warning of warnings) {
    console.warn(`WARNING: ${warning}`);
  }

  const issueGroups = createIssueGroups(facilities);
  const allIssues = ISSUE_ORDER.flatMap((issueType) => issueGroups[issueType]);
  const categoryCounts = Object.fromEntries(
    ISSUE_ORDER.map((issueType) => [issueType, issueGroups[issueType].length]),
  );
  const categorySamples = createIssueSamples(issueGroups);
  const severityCounts = {
    high: 0,
    medium: 0,
    low: 0,
    info: 0,
    ...countBy(allIssues, (issue) => issue.severity),
  };

  const report = {
    generated_at: generatedDate(),
    total_facilities: facilities.length,
    prefectures: dataPrefectures,
    category_counts: categoryCounts,
    category_samples: categorySamples,
    severity_counts: severityCounts,
    ...Object.fromEntries(
      ISSUE_ORDER.map((issueType) => [`${issueType}_count`, categoryCounts[issueType]]),
    ),
    total_issues: allIssues.length,
    total_needs_web_check: allIssues.filter((issue) => issue.needs_web_check).length,
    total_needs_human_review: allIssues.filter((issue) => issue.needs_human_review).length,
    warnings,
  };

  await mkdir(REPORT_DIR, { recursive: true });
  await writeJson("facility_data_quality_report.json", report);
  await writeJson("facility_data_quality_issues.json", allIssues);
  for (const issueType of ISSUE_ORDER) {
    await writeJson(`${issueType}_facilities.json`, issueGroups[issueType]);
  }

  await writeFile(
    resolve(REPORT_DIR, "facility_data_quality_report.md"),
    buildMarkdownReport(report, issueGroups),
    "utf-8",
  );

  console.log("category counts:");
  for (const [issueType, count] of Object.entries(categoryCounts)) {
    console.log(`- ${issueType}: ${count}`);
  }
  console.log("severity counts:");
  console.log(JSON.stringify(sortObjectByKey(severityCounts), null, 2));
  console.log(JSON.stringify(report, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
