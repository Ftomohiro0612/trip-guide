import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = resolve(__dirname, "..");
const FACILITIES_PATH = resolve(ROOT_DIR, "data", "facilities_data.json");
const EVENTS_PATH = resolve(ROOT_DIR, "data", "events_data.json");
const REPORT_DIR = resolve(ROOT_DIR, ".codex");
const AUDIT_JSON_PATH = resolve(REPORT_DIR, "facility_quality_audit.json");
const AUDIT_SUMMARY_PATH = resolve(REPORT_DIR, "facility_quality_audit_summary.md");

const SCORING = {
  severity_points: { high: 10, medium: 4, low: 2, info: 0 },
  boosts: { has_event: 0.5, has_image: 0.1, popular_category: 0.2 },
  formula:
    "priority_score = sum(issue severity points: high=10, medium=4, low=2, info=0) * (1 + has_event*0.5 + has_image*0.1 + popular_category*0.2)",
};

const HIGH_SEVERITY_THINGS_PREFS = new Set([
  "tochigi",
  "niigata",
  "chiba",
  "saitama",
  "kanagawa",
]);

const FIVE_PREF_ORDER = ["tochigi", "niigata", "chiba", "saitama", "kanagawa"];
const POPULAR_CATEGORIES = new Set([
  "aquarium",
  "zoo",
  "science-museum",
  "indoor-play",
  "theme-park",
]);

const TEMPLATE_PHRASES = [
  "体験を軸に",
  "導線を選べます",
  "滞在時間に余裕を持ち",
  "代表的な親子向け施設として",
  "魅力満載",
  "満喫",
  "してみてはいかが",
  "五感で楽しむ",
  "大人も子どもも楽しめる",
];

const CATEGORY_WORDS = [
  "水族館",
  "動物園",
  "科学館",
  "博物館",
  "美術館",
  "公園",
  "遊園地",
  "テーマパーク",
  "屋内",
  "屋外",
  "体験",
  "クラフト",
  "工場",
  "見学",
  "温泉",
  "プール",
  "スキー",
  "果物狩り",
  "キャンプ",
  "展望",
  "景勝",
  "自然",
  "牧場",
  "農園",
];

const ACTIVITY_WORDS = [
  "遊べる",
  "遊ぶ",
  "体験",
  "見られる",
  "見れる",
  "見る",
  "乗れる",
  "乗る",
  "触れ",
  "作れ",
  "作る",
  "学べ",
  "学ぶ",
  "泳げ",
  "泳ぐ",
  "滑れ",
  "滑る",
  "観察",
  "挑戦",
  "走り回",
  "過ごす",
  "楽しむ",
  "楽しめる",
  "ふれあ",
  "展示",
  "ショー",
  "アトラクション",
];

const AGE_WORDS = [
  "歳",
  "才",
  "小学生",
  "未就学",
  "幼児",
  "乳幼児",
  "赤ちゃん",
  "中学生",
  "年齢",
];

const PARENT_WORDS = [
  "雨",
  "天気",
  "屋外",
  "屋内",
  "晴",
  "滞在",
  "半日",
  "1日",
  "一日",
  "ベビーカー",
  "駐車",
  "季節",
  "夏",
  "冬",
  "春",
  "秋",
  "予約",
  "注意",
  "組み合わせ",
  "回遊",
  "休憩",
];

const STRONG_WATER_KEYWORDS = [
  "海水浴",
  "ビーチ",
  "川遊び",
  "磯遊び",
  "沢遊び",
  "渓谷",
  "じゃぶじゃぶ",
  "水遊び",
];
const NATURE_WATER_KEYWORDS = ["海", "川", "湖", "滝", "沢", "磯", "ダム"];
const INDOOR_SAFETY_EXEMPTION_KEYWORDS = ["海水浴", "川遊び", "磯遊び", "沢遊び", "潮干狩り"];

const SAFETY_WORDS = [
  "注意",
  "安全",
  "監視",
  "増水",
  "遊泳",
  "ライフジャケット",
  "流れ",
  "深み",
  "足元",
  "柵",
  "係員",
  "天候",
  "海況",
];

const NATURE_SAFETY_CATEGORIES = new Set(["nature-park", "scenic", "viewpoint"]);
const INDOOR_FIRST_CATEGORIES = new Set([
  "aquarium",
  "museum",
  "science-museum",
  "art-museum",
  "indoor-play",
  "indoor-theme-park",
  "game-center",
  "hotel",
]);
const OUTDOOR_WATER_PLAY_CATEGORIES = new Set([
  "athletic",
  "experience",
  "fruit-picking",
  "hot-spring-pool",
  "nature-park",
  "park",
  "scenic",
  "ski",
  "theme-park",
  "viewpoint",
  "zoo",
]);
const FACTORY_WORDS = ["工場", "見学", "ツアー"];
const SEASONAL_WORDS = ["プール", "花畑", "雪", "スキー", "いちご狩り", "潮干狩り"];
const SEASONAL_CATEGORIES = new Set(["hot-spring-pool", "ski", "fruit-picking"]);
const EXPERIENCE_CATEGORIES = new Set(["experience", "craft"]);
const INDOOR_PLAY_CATEGORIES = new Set(["indoor-play", "indoor-theme-park"]);

const ISSUE_ORDER = [
  "desc_under_100",
  "desc_under_150",
  "desc_no_proper_noun",
  "desc_elements_missing",
  "things_missing",
  "things_dup_signature",
  "things_broken_fragment",
  "things_generic",
  "template_phrase",
  "stale_price_in_desc",
  "stale_price_in_fee",
  "stale_hours",
  "stale_event_name",
  "stale_temporal",
  "safety_missing",
  "official_check_needed",
  "flagship_weak_desc",
];

const SEVERITY_ORDER = { high: 0, medium: 1, low: 2, info: 3 };

function text(value) {
  if (typeof value === "string") return value.trim();
  if (value == null) return "";
  return String(value).trim();
}

function textArray(value) {
  if (!Array.isArray(value)) return [];
  return value.filter((item) => typeof item === "string").map((item) => item.trim()).filter(Boolean);
}

function includesAny(value, keywords) {
  return keywords.some((keyword) => value.includes(keyword));
}

function extractPlaceNames(facility) {
  const address = text(facility.address);
  const matches = [...address.matchAll(/[一-龠ぁ-んァ-ヶー]+?(?:市|区|町|村|郡)/g)].map(
    (match) => match[0],
  );
  return [...new Set([facility.name, facility.prefecture, ...matches].map(text).filter(Boolean))];
}

function stripKnownNames(value, facility) {
  let stripped = text(value);
  for (const name of extractPlaceNames(facility).sort((a, b) => b.length - a.length)) {
    stripped = stripped.split(name).join("");
  }
  return stripped;
}

function hasSpecificProperNoun(value, facility) {
  const stripped = stripKnownNames(value, facility);
  return /「[^」]{2,}」/.test(stripped) || /[ァ-ヶー]{4,}/.test(stripped) || /[A-Za-z0-9][A-Za-z0-9・_\- ]+/.test(stripped);
}

function addIssue(issues, code, severity, detail = {}) {
  issues.push({ code, severity, detail });
}

function descLength(facility) {
  return text(facility.description).length;
}

function hasImage(facility) {
  return Boolean(text(facility.image));
}

function isLargePark(facility) {
  if (facility.category_id !== "park") return false;
  const combined = [facility.name, facility.category, facility.description, ...textArray(facility.tags)].join(" ");
  return /大型|広大|広い|総合公園|県立|国営|広場|芝生/.test(combined);
}

function popularCategory(facility) {
  if (POPULAR_CATEGORIES.has(facility.category_id) || isLargePark(facility)) {
    return facility.category_id;
  }
  return null;
}

function descriptionElementMissing(facility) {
  const description = text(facility.description);
  const address = text(facility.address);
  const what = includesAny(description, CATEGORY_WORDS) || includesAny(description, extractPlaceNames(facility)) || Boolean(address && includesAny(description, address.split(/[0-9０-９]/)[0] ? [address.split(/[0-9０-９]/)[0]] : []));
  const activity = includesAny(description, ACTIVITY_WORDS);
  const age = includesAny(description, AGE_WORDS);
  const parent = includesAny(description, PARENT_WORDS);
  return Object.entries({ what, activity, age, parent })
    .filter(([, present]) => !present)
    .map(([key]) => key);
}

function checkDescriptionIssues(facility, issues) {
  const description = text(facility.description);
  const length = description.length;

  if (length < 100) {
    addIssue(issues, "desc_under_100", "medium", { desc_length: length });
  } else if (length < 150) {
    addIssue(issues, "desc_under_150", "low", { desc_length: length });
  }

  if (!hasSpecificProperNoun(description, facility)) {
    addIssue(issues, "desc_no_proper_noun", "medium", {
      heuristic: "施設名・都道府県名・市区町村名を除いた説明文に、括弧付き語・4文字以上のカタカナ・英数字名称が見つからない",
    });
  }

  const elementsMissing = descriptionElementMissing(facility);
  if (elementsMissing.length > 0) {
    addIssue(issues, "desc_elements_missing", "medium", {
      elements_missing: elementsMissing,
    });
  }
}

function arraysMatch(a, b) {
  const left = textArray(a);
  const right = textArray(b);
  return left.length > 0 && left.length === right.length && left.every((item, index) => item === right[index]);
}

function normalizeThingEnding(item) {
  return text(item)
    .replace(/[。．.!！?？\s]+$/g, "")
    .replace(/(?:（[^（）]*）|\([^()]*\))$/g, "")
    .replace(/[。．.!！?？\s]+$/g, "");
}

function isVerbLikeThing(item) {
  return /[うくぐすつぬぶむる]$/.test(normalizeThingEnding(item));
}

function checkThingsIssues(facility, issues) {
  const things = textArray(facility.things_to_do);

  if (things.length === 0) {
    addIssue(
      issues,
      "things_missing",
      HIGH_SEVERITY_THINGS_PREFS.has(facility.prefecture_id) ? "high" : "medium",
      { prefecture_id: facility.prefecture_id },
    );
    return;
  }

  if (arraysMatch(things, facility.signature_experiences)) {
    addIssue(issues, "things_dup_signature", "info", {
      count: things.length,
    });
  }

  const brokenItems = things.filter((item) => !isVerbLikeThing(item));
  if (brokenItems.length > 0) {
    addIssue(issues, "things_broken_fragment", "medium", {
      items: brokenItems,
    });
  }

  if (!hasSpecificProperNoun(things.join(" "), facility)) {
    addIssue(issues, "things_generic", "low", {
      heuristic: "things_to_do 全項目を連結しても施設固有の名詞が見つからない",
    });
  }
}

function detectTemplatePhrases(facility) {
  const fields = [
    ["description", text(facility.description)],
    ["unique_selling_point", text(facility.unique_selling_point)],
    ...textArray(facility.things_to_do).map((value, index) => [`things_to_do[${index}]`, value]),
    ...textArray(facility.signature_experiences).map((value, index) => [
      `signature_experiences[${index}]`,
      value,
    ]),
  ];

  const hits = [];
  for (const [field, value] of fields) {
    for (const phrase of TEMPLATE_PHRASES) {
      if (value.includes(phrase)) hits.push({ field, phrase });
    }
  }
  return hits;
}

function checkTemplateIssues(facility, issues) {
  const hits = detectTemplatePhrases(facility);
  if (hits.length > 0) {
    addIssue(issues, "template_phrase", "medium", { hits });
  }
}

function checkStaleIssues(facility, issues) {
  const description = text(facility.description);
  const descPrices = description.match(/[0-9０-９,，]{2,6}円/g) ?? [];
  if (descPrices.length > 0) {
    addIssue(issues, "stale_price_in_desc", "medium", { matches: [...new Set(descPrices)] });
  }

  const feeHits = ["adult_fee", "child_fee"]
    .map((field) => ({ field, value: text(facility[field]) }))
    .filter(({ value }) => /[0-9０-９,，]{2,6}円/.test(value));
  if (feeHits.length > 0) {
    addIssue(issues, "stale_price_in_fee", "info", { fields: feeHits });
  }

  const hourMatches = description.match(/(?:午前|午後)?\s*[0-2０-２]?[0-9０-９]\s*(?:時|:|：)/g) ?? [];
  if (hourMatches.length > 0) {
    addIssue(issues, "stale_hours", "medium", { matches: [...new Set(hourMatches.map((m) => m.trim()))] });
  }

  const eventMatches = description.match(/(?:毎年[^。]{0,20}(?:祭|フェス|イベント)|(?:祭|フェス|イベント)「|「[^」]{0,30}(?:祭|フェス|イベント)[^」]{0,30}」)/g) ?? [];
  if (eventMatches.length > 0) {
    addIssue(issues, "stale_event_name", "low", { matches: [...new Set(eventMatches)] });
  }

  const temporalMatches = description.match(/今年|現在|最近|期間限定/g) ?? [];
  if (temporalMatches.length > 0) {
    addIssue(issues, "stale_temporal", "medium", { matches: [...new Set(temporalMatches)] });
  }
}

function checkSafetyIssues(facility, issues) {
  const description = text(facility.description);
  const nameAndTags = [facility.name, ...textArray(facility.tags)].map(text).join(" ");
  const strongSignalText = [facility.name, description, ...textArray(facility.tags)].map(text).join(" ");
  const indoorExempt = INDOOR_FIRST_CATEGORIES.has(facility.category_id);
  if (indoorExempt && !includesAny(description, INDOOR_SAFETY_EXEMPTION_KEYWORDS)) return;

  const matchedKeywords = [];
  const addMatchedKeyword = (keyword, rule) => {
    if (!matchedKeywords.some((match) => match.keyword === keyword && match.rule === rule)) {
      matchedKeywords.push({ keyword, rule });
    }
  };

  for (const keyword of STRONG_WATER_KEYWORDS) {
    if (strongSignalText.includes(keyword)) addMatchedKeyword(keyword, "strong_keyword");
  }

  const categoryTarget = NATURE_SAFETY_CATEGORIES.has(facility.category_id);
  if (["nature-park", "scenic"].includes(facility.category_id)) {
    for (const keyword of NATURE_WATER_KEYWORDS) {
      if (nameAndTags.includes(keyword)) addMatchedKeyword(keyword, "nature_category_water");
    }
  }

  const waterPlayValue = text(facility.summer_water_play);
  const waterPlayTarget =
    OUTDOOR_WATER_PLAY_CATEGORIES.has(facility.category_id) &&
    ["◎", "○", "あり"].some((value) => waterPlayValue.includes(value));
  const hasStrongSignal = matchedKeywords.some(
    (match) => match.rule === "strong_keyword" || match.rule === "nature_category_water",
  );
  if (!hasStrongSignal && categoryTarget) addMatchedKeyword(facility.category_id, "nature_category");
  if (!hasStrongSignal && waterPlayTarget) addMatchedKeyword(waterPlayValue, "water_play_only");

  const isTarget = hasStrongSignal || categoryTarget || waterPlayTarget;
  if (!isTarget) return;

  const safetyText = [facility.description, facility.source_notes].map(text).join(" ");
  if (includesAny(safetyText, SAFETY_WORDS)) return;

  addIssue(issues, "safety_missing", hasStrongSignal ? "high" : "medium", {
    matched_keywords: matchedKeywords,
    category_target: categoryTarget,
    summer_water_play: waterPlayValue || null,
  });
}

function createOfficialCheck(facility) {
  const combined = [
    facility.name,
    facility.description,
    ...textArray(facility.tags),
    ...textArray(facility.recommended_for_tags),
  ].join(" ");
  const checkTypes = new Set();

  if (includesAny(combined, FACTORY_WORDS)) {
    ["予約要否", "開催状況", "対象年齢下限"].forEach((value) => checkTypes.add(value));
  }
  if (EXPERIENCE_CATEGORIES.has(facility.category_id)) {
    ["予約要否", "対象年齢下限", "開催日"].forEach((value) => checkTypes.add(value));
  }
  if (INDOOR_PLAY_CATEGORIES.has(facility.category_id)) {
    ["予約要否", "料金体系", "年齢制限"].forEach((value) => checkTypes.add(value));
  }
  if (SEASONAL_CATEGORIES.has(facility.category_id) || includesAny(combined, SEASONAL_WORDS)) {
    ["営業期間", "今季開催"].forEach((value) => checkTypes.add(value));
  }

  if (checkTypes.size === 0) return null;

  return {
    check_types: [...checkTypes],
    reservation_likely: /完全予約|事前予約|要予約/.test(combined),
    already_mentions_reservation: combined.includes("予約"),
  };
}

function checkOfficialCheckNeeded(officialCheck, issues) {
  if (!officialCheck) return;
  addIssue(issues, "official_check_needed", "info", officialCheck);
}

function eventCountsByFacility(events) {
  const counts = new Map();
  for (const event of events) {
    const facilityId = String(event.facility_id ?? "");
    if (!facilityId) continue;
    counts.set(facilityId, (counts.get(facilityId) ?? 0) + 1);
  }
  return counts;
}

function calculatePriorityScore(issues, { hasEvent, hasFacilityImage, categoryIsPopular }) {
  const base = issues.reduce((sum, issue) => sum + (SCORING.severity_points[issue.severity] ?? 0), 0);
  const boost =
    1 +
    (hasEvent ? SCORING.boosts.has_event : 0) +
    (hasFacilityImage ? SCORING.boosts.has_image : 0) +
    (categoryIsPopular ? SCORING.boosts.popular_category : 0);
  return Number((base * boost).toFixed(1));
}

function auditFacility(facility, eventCount) {
  const issues = [];
  const length = descLength(facility);
  const hasEvent = eventCount > 0;
  const hasFacilityImage = hasImage(facility);
  const popularCategoryId = popularCategory(facility);

  checkDescriptionIssues(facility, issues);
  checkThingsIssues(facility, issues);
  checkTemplateIssues(facility, issues);
  checkStaleIssues(facility, issues);
  checkSafetyIssues(facility, issues);
  const officialCheck = createOfficialCheck(facility);
  checkOfficialCheckNeeded(officialCheck, issues);

  if (hasEvent && length < 100) {
    addIssue(issues, "flagship_weak_desc", "high", {
      event_count: eventCount,
      desc_length: length,
    });
  }

  const priorityScore = calculatePriorityScore(issues, {
    hasEvent,
    hasFacilityImage,
    categoryIsPopular: Boolean(popularCategoryId),
  });

  return {
    id: facility.id,
    name: facility.name,
    slug: facility.slug,
    prefecture_id: facility.prefecture_id,
    prefecture: facility.prefecture,
    category_id: facility.category_id,
    desc_length: length,
    has_event: hasEvent,
    event_count: eventCount,
    has_image: hasFacilityImage,
    popular_category: popularCategoryId,
    issues,
    official_check: officialCheck,
    priority_score: priorityScore,
  };
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

function summarizeGroup(facilities, key) {
  const groups = {};
  for (const facility of facilities) {
    const groupKey = facility[key] || "unknown";
    groups[groupKey] ??= {
      facilities: 0,
      issues: 0,
      by_code: {},
      total_desc_length: 0,
      avg_desc_length: 0,
      desc_under_100: 0,
      things_missing: 0,
    };
    const group = groups[groupKey];
    group.facilities += 1;
    group.issues += facility.issues.length;
    group.total_desc_length += facility.desc_length;
    if (facility.desc_length < 100) group.desc_under_100 += 1;
    for (const issue of facility.issues) {
      group.by_code[issue.code] = (group.by_code[issue.code] ?? 0) + 1;
      if (issue.code === "things_missing") group.things_missing += 1;
    }
  }

  return Object.fromEntries(
    Object.entries(groups)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([groupKey, group]) => {
        const { total_desc_length: _totalDescLength, ...rest } = group;
        return [
          groupKey,
          {
            ...rest,
            by_code: sortObjectByKey(rest.by_code),
            avg_desc_length: Number((group.total_desc_length / group.facilities).toFixed(1)),
          },
        ];
      }),
  );
}

function issueCodeCounts(facilities) {
  const allIssues = facilities.flatMap((facility) => facility.issues);
  return Object.fromEntries(ISSUE_ORDER.map((code) => [code, allIssues.filter((issue) => issue.code === code).length]));
}

function summaryFor(facilities) {
  const allIssues = facilities.flatMap((facility) => facility.issues);
  const bySeverity = { high: 0, medium: 0, low: 0, info: 0, ...countBy(allIssues, (issue) => issue.severity) };
  return {
    total_issues: allIssues.length,
    by_severity: bySeverity,
    by_issue_code: issueCodeCounts(facilities),
    by_prefecture: summarizeGroup(facilities, "prefecture_id"),
    by_category: summarizeGroup(facilities, "category_id"),
  };
}

function compactFacility(facility, selectionReason = null) {
  const value = {
    id: facility.id,
    name: facility.name,
    slug: facility.slug,
    prefecture_id: facility.prefecture_id,
    category_id: facility.category_id,
    priority_score: facility.priority_score,
    issue_codes: facility.issues.map((issue) => issue.code),
  };
  if (selectionReason) value.selection_reason = selectionReason;
  return value;
}

function appendSelectionReason(reasonsByFacility, facility, reason) {
  const reasons = reasonsByFacility.get(facility.id) ?? [];
  if (!reasons.includes(reason)) reasons.push(reason);
  reasonsByFacility.set(facility.id, reasons);
}

function hasIssue(facility, code) {
  return facility.issues.some((issue) => issue.code === code);
}

function getIssue(facility, code) {
  return facility.issues.find((issue) => issue.code === code);
}

function sortByPriority(a, b) {
  return (
    b.priority_score - a.priority_score ||
    SEVERITY_ORDER[a.issues[0]?.severity ?? "info"] - SEVERITY_ORDER[b.issues[0]?.severity ?? "info"] ||
    Number(a.id) - Number(b.id)
  );
}

function createBatchCandidates(facilities) {
  const thingsByPrefecture = {};
  for (const pref of FIVE_PREF_ORDER) {
    const prefFacilities = facilities
      .filter((facility) => facility.prefecture_id === pref && hasIssue(facility, "things_missing"))
      .sort((a, b) => Number(a.id) - Number(b.id));
    thingsByPrefecture[pref] = {
      count: prefFacilities.length,
      facilities: prefFacilities.map((facility) => compactFacility(facility)),
    };
  }

  const templateCleanup = facilities.filter((facility) => hasIssue(facility, "template_phrase")).sort(sortByPriority);
  const stalePrice = facilities
    .filter(
      (facility) =>
        hasIssue(facility, "stale_price_in_desc") ||
        hasIssue(facility, "stale_hours") ||
        hasIssue(facility, "stale_temporal"),
    )
    .sort(sortByPriority);
  const safety = facilities.filter((facility) => hasIssue(facility, "safety_missing")).sort((a, b) => {
    const severityDiff =
      SEVERITY_ORDER[getIssue(a, "safety_missing")?.severity ?? "info"] -
      SEVERITY_ORDER[getIssue(b, "safety_missing")?.severity ?? "info"];
    return severityDiff || sortByPriority(a, b);
  });
  const flagship = facilities.filter((facility) => hasIssue(facility, "flagship_weak_desc")).sort(sortByPriority);

  const batch1Reasons = new Map();
  const isBatchEligible = (facility) => !HIGH_SEVERITY_THINGS_PREFS.has(facility.prefecture_id);
  for (const facility of templateCleanup.filter(isBatchEligible)) {
    appendSelectionReason(batch1Reasons, facility, "template_phrase cleanup");
  }
  for (const facility of stalePrice.filter(isBatchEligible)) {
    appendSelectionReason(batch1Reasons, facility, "stale wording cleanup");
  }

  const requiredBatch1Ids = new Set(batch1Reasons.keys());
  const flexibleCandidates = [
    ...safety
      .filter(
        (facility) =>
          isBatchEligible(facility) &&
          getIssue(facility, "safety_missing")?.severity === "high" &&
          !requiredBatch1Ids.has(facility.id),
      )
      .map((facility) => ({ facility, reason: "high severity safety note gap" })),
    ...flagship
      .filter((facility) => isBatchEligible(facility) && !requiredBatch1Ids.has(facility.id))
      .map((facility) => ({
        facility,
        reason: "event-backed flagship with weak description",
      })),
  ].sort((a, b) => sortByPriority(a.facility, b.facility));

  for (const { facility, reason } of flexibleCandidates) {
    if (batch1Reasons.size >= 50) break;
    appendSelectionReason(batch1Reasons, facility, reason);
  }

  for (const facility of safety.filter(
    (facility) =>
      isBatchEligible(facility) &&
      getIssue(facility, "safety_missing")?.severity === "high" &&
      batch1Reasons.has(facility.id),
  )) {
    appendSelectionReason(batch1Reasons, facility, "high severity safety note gap");
  }
  for (const facility of flagship.filter((facility) => isBatchEligible(facility) && batch1Reasons.has(facility.id))) {
    appendSelectionReason(batch1Reasons, facility, "event-backed flagship with weak description");
  }

  const batch1 = [...batch1Reasons.keys()]
    .map((id) => facilities.find((facility) => facility.id === id))
    .filter(Boolean)
    .sort(sortByPriority)
    .map((facility) => compactFacility(facility, batch1Reasons.get(facility.id).join(" / ")));
  const batch1Ids = new Set(batch1.map((facility) => facility.id));

  const batch2 = facilities
    .filter((facility) => isBatchEligible(facility) && !batch1Ids.has(facility.id) && facility.priority_score > 0)
    .sort(sortByPriority)
    .slice(0, 50)
    .map((facility) => compactFacility(facility));

  return {
    lane_things_5pref: {
      total: Object.values(thingsByPrefecture).reduce((sum, pref) => sum + pref.count, 0),
      by_prefecture: thingsByPrefecture,
    },
    lane_template_cleanup: templateCleanup.map((facility) => ({
      ...compactFacility(facility),
      template_hits: getIssue(facility, "template_phrase")?.detail?.hits ?? [],
    })),
    lane_stale_price: stalePrice.map((facility) => compactFacility(facility)),
    lane_safety: safety.map((facility) => ({
      ...compactFacility(facility),
      safety_detail: getIssue(facility, "safety_missing")?.detail ?? {},
      safety_severity: getIssue(facility, "safety_missing")?.severity ?? null,
    })),
    lane_flagship: flagship.map((facility) => compactFacility(facility)),
    batch1_proposal: batch1,
    batch2_proposal: batch2,
    batch_meta: {
      excluded_prefectures_from_batch1_and_batch2: FIVE_PREF_ORDER,
      exclusion_reason:
        "5県は県単位バッチ lane_things_5pref で things_to_do と description をまとめて改善する想定のため、batch1_proposal / batch2_proposal から除外。",
    },
  };
}

function escapeMarkdownCell(value) {
  return String(value ?? "")
    .replaceAll("\\", "\\\\")
    .replaceAll("|", "\\|")
    .replaceAll("\n", " ");
}

function markdownTable(headers, rows) {
  if (rows.length === 0) return "_該当なし_";
  return [
    `| ${headers.map(escapeMarkdownCell).join(" |")} |`,
    `| ${headers.map(() => "---").join(" |")} |`,
    ...rows.map((row) => `| ${row.map(escapeMarkdownCell).join(" |")} |`),
  ].join("\n");
}

function issueSummaryText(facility) {
  return facility.issues
    .filter((issue) => issue.severity !== "info")
    .slice(0, 4)
    .map((issue) => issue.code)
    .join(", ");
}

function topLaneRows(facilities) {
  return facilities.slice(0, 5).map((facility) => [
    facility.id,
    facility.name,
    facility.prefecture_id,
    facility.priority_score,
    issueSummaryText(facility),
  ]);
}

function batch2Trend(batch2) {
  const codeCounts = countBy(batch2.flatMap((facility) => facility.issue_codes), (code) => code);
  return Object.entries(codeCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([code, count]) => `${code}: ${count}`)
    .join(" / ");
}

function buildMarkdown(audit) {
  const { summary, batch_candidates: batchCandidates } = audit;
  const prefRows = Object.entries(summary.by_prefecture).map(([prefectureId, value]) => [
    prefectureId,
    value.facilities,
    value.avg_desc_length,
    value.desc_under_100,
    value.things_missing,
    value.issues,
  ]);
  const categoryRows = Object.entries(summary.by_category).map(([categoryId, value]) => [
    categoryId,
    value.facilities,
    value.avg_desc_length,
    value.desc_under_100,
    value.things_missing,
    value.issues,
  ]);
  const issueRows = Object.entries(summary.by_issue_code).map(([code, count]) => [code, count]);

  const batch1Rows = batchCandidates.batch1_proposal.map((facility) => [
    facility.id,
    facility.name,
    facility.prefecture_id,
    facility.priority_score,
    facility.selection_reason,
  ]);

  return [
    "# Facility Quality Audit Summary",
    "",
    `Generated: ${audit.meta.generated_at}`,
    "",
    "## 全体サマリ",
    "",
    `- 施設数: ${audit.meta.total_facilities}`,
    `- issue総数: ${summary.total_issues}`,
    `- severity内訳: high ${summary.by_severity.high} / medium ${summary.by_severity.medium} / low ${summary.by_severity.low} / info ${summary.by_severity.info}`,
    "",
    "## 県別テーブル",
    "",
    markdownTable(["prefecture", "施設数", "avg desc字数", "desc<100", "things未整備", "issue総数"], prefRows),
    "",
    "## カテゴリ別テーブル",
    "",
    markdownTable(["category", "施設数", "avg desc字数", "desc<100", "things未整備", "issue総数"], categoryRows),
    "",
    "## issue code 別件数",
    "",
    markdownTable(["issue code", "count"], issueRows),
    "",
    "## 改善レーン",
    "",
    `- things_to_do未整備5県: ${batchCandidates.lane_things_5pref.total}`,
    `- template cleanup: ${batchCandidates.lane_template_cleanup.length}`,
    `- stale price/hours/temporal: ${batchCandidates.lane_stale_price.length}`,
    `- safety: ${batchCandidates.lane_safety.length}`,
    `- flagship weak desc: ${batchCandidates.lane_flagship.length}`,
    "",
    "### template cleanup 代表例",
    "",
    markdownTable(["id", "名前", "県", "score", "主要issue"], topLaneRows(batchCandidates.lane_template_cleanup.map((item) => audit.facilities.find((facility) => facility.id === item.id)).filter(Boolean))),
    "",
    "### stale price/hours/temporal 代表例",
    "",
    markdownTable(["id", "名前", "県", "score", "主要issue"], topLaneRows(batchCandidates.lane_stale_price.map((item) => audit.facilities.find((facility) => facility.id === item.id)).filter(Boolean))),
    "",
    "### safety 代表例",
    "",
    markdownTable(["id", "名前", "県", "score", "主要issue"], topLaneRows(batchCandidates.lane_safety.map((item) => audit.facilities.find((facility) => facility.id === item.id)).filter(Boolean))),
    "",
    "### flagship 代表例",
    "",
    markdownTable(["id", "名前", "県", "score", "主要issue"], topLaneRows(batchCandidates.lane_flagship.map((item) => audit.facilities.find((facility) => facility.id === item.id)).filter(Boolean))),
    "",
    "## batch1_proposal",
    "",
    markdownTable(["id", "名前", "県", "score", "selection_reason"], batch1Rows),
    "",
    "## batch2_proposal",
    "",
    `- 件数: ${batchCandidates.batch2_proposal.length}`,
    `- 傾向: ${batch2Trend(batchCandidates.batch2_proposal) || "該当なし"}`,
    "",
    "## ヒューリスティック判定の注意",
    "",
    "- 4要素判定と固有名詞判定は機械推定です。最終判断はPM/人間レビューで行ってください。",
    "- この監査は公式確認ではなく、変わりやすい情報・安全注記・予約条件の確認候補を抽出するものです。",
    "",
  ].join("\n");
}

function generatedDate() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

async function readJson(path, key) {
  const raw = await readFile(path, "utf-8");
  const json = JSON.parse(raw);
  const value = Array.isArray(json) ? json : json[key];
  if (!Array.isArray(value)) {
    throw new Error(`${path} に ${key} 配列が見つかりません`);
  }
  return value;
}

async function main() {
  const facilitiesInput = await readJson(FACILITIES_PATH, "facilities");
  const events = await readJson(EVENTS_PATH, "events");
  const eventCounts = eventCountsByFacility(events);
  const facilities = facilitiesInput.map((facility) =>
    auditFacility(facility, eventCounts.get(String(facility.id)) ?? 0),
  );

  const audit = {
    meta: {
      generated_at: generatedDate(),
      total_facilities: facilities.length,
      input_files: ["data/facilities_data.json", "data/events_data.json"],
      scoring: SCORING,
      heuristic_notice:
        "4要素判定、固有名詞判定、安全注記、予約・条件確認候補は機械推定です。公式確認やPM/人間レビューの代替ではありません。",
      deterministic_note:
        "ネットワークアクセスなし・入力JSONのみを読み取り、監査ロジックは決定的に実行します。",
      batch_recomposition_note:
        "batch1_proposal / batch2_proposal は things_to_do 未整備5県(tochigi/niigata/chiba/saitama/kanagawa)を除外し、5県は lane_things_5pref で県単位改善する想定です。",
    },
    summary: summaryFor(facilities),
    facilities,
    batch_candidates: createBatchCandidates(facilities),
  };

  await mkdir(REPORT_DIR, { recursive: true });
  await writeFile(AUDIT_JSON_PATH, `${JSON.stringify(audit, null, 2)}\n`, "utf-8");
  await writeFile(AUDIT_SUMMARY_PATH, buildMarkdown(audit), "utf-8");

  console.log(
    JSON.stringify(
      {
        total_facilities: audit.meta.total_facilities,
        total_issues: audit.summary.total_issues,
        by_severity: audit.summary.by_severity,
        five_pref_things_missing: Object.fromEntries(
          FIVE_PREF_ORDER.map((pref) => [
            pref,
            audit.batch_candidates.lane_things_5pref.by_prefecture[pref].count,
          ]),
        ),
        batch1_count: audit.batch_candidates.batch1_proposal.length,
        outputs: [
          ".codex/facility_quality_audit.json",
          ".codex/facility_quality_audit_summary.md",
        ],
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
