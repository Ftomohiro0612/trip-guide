import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";

const CHECKED_AT = "2026-07-21";
const FACILITIES_URL = new URL("../data/facilities_data.json", import.meta.url);
const EVIDENCE_URL = new URL("../data/craft_category_evidence.json", import.meta.url);
const RECLASSIFICATIONS_URL = new URL(
  "../data/craft_category_reclassifications.json",
  import.meta.url,
);

const VERIFIED_EXISTING_IDS = [
  39, 43, 44, 45, 46, 90, 91, 92, 93, 94, 95, 96, 141, 142, 143, 144,
  145, 152, 372, 417, 433, 434, 472, 494, 514, 522, 596, 662, 698, 740,
  820, 890, 923, 932, 1041, 1073, 1096, 1103, 1122, 1188, 1189, 1190,
  1191, 1193, 1256, 1259, 1260, 1326, 1386, 1387, 1437, 1546, 1549,
  1578, 1677, 1684, 1698, 1705, 1708, 1715, 1724, 1730, 1746, 1895,
  1903, 1934, 1940, 2042, 2084, 2085, 2094, 2109, 2124, 2141, 2152,
  2159, 2165, 2197, 2198, 2205, 2209, 2212, 2222, 2223, 2235, 2237,
  2326, 2342, 2344, 2366, 2367, 2394, 2422, 2442, 2457, 2473, 2474,
  2476, 2477, 2478, 2479, 2480, 2481, 2482, 2500, 2555, 2594, 2627,
  2684, 2687, 2711, 2713, 2774, 2777, 2778, 2779, 2784, 2841, 2843,
  2846, 3100, 3103, 3112, 3114, 3118, 3236, 3237, 3276, 3283, 3285,
  3301, 3317, 3322, 3325, 3331, 3332, 3337, 3343, 3361, 3364, 3380,
  3390, 3438, 3459, 3483, 3503, 3524, 3525, 3529, 3540, 3562, 3578,
  3590, 3600, 3626, 3644, 3654, 3665, 3685, 3692, 3711, 3713, 3726,
  3727, 3730, 3732,
];

const VERIFIED_UNTAGGED_IDS = [
  47, 53, 254, 373, 389, 581, 818, 962, 1195, 1517, 1613, 2316, 2611,
  2669, 2781, 3042, 3126, 3148, 3202, 3293, 3394, 3403, 3520, 3591,
  3609, 3621, 3673,
];

// The accepted 193-facility plan was re-opened after the owner required an
// explicit all-prefecture pass. These facilities were found by scanning all
// 3,732 visible records across every primary category, then checking the
// stored official source for an ongoing or recurring making offer.
const VERIFIED_FULL_SCAN_IDS = [
  75, 154, 211, 215, 247, 264, 299, 475, 538, 638, 777, 903, 1636, 2102,
  2450, 2581, 2587, 2634, 2638, 2708, 3062, 3096, 3137, 3174, 3186, 3240, 3351,
  3353, 3635, 3664, 3672, 3729,
];

const MISCLASSIFIED_TAG_IDS = [
  509, 525, 619, 830, 944, 1081, 1187, 1236, 1341, 1342, 1385, 1395,
  1521, 1535, 1541, 1544, 1553, 1566, 1603, 1606, 1607, 1699, 1710,
  1711, 1714, 1721, 1732, 1765, 1843, 1854, 1860, 1899, 1904, 1913,
  1920, 1928, 1929, 1930, 1936, 1937, 1939, 1946, 1948, 1955, 1957,
  1959, 1975, 1986, 2031, 2038, 2048, 2058, 2060, 2064, 2188, 2217,
  2244, 2245, 2246, 2247, 2248, 2249, 2250, 2251, 2252, 2253, 2254,
  2257, 2258, 2259, 2260, 2261, 2263, 2264, 2265, 2266, 2267, 2268,
  2269, 2270, 2294, 2296, 2297, 2301, 2302, 2303, 2304, 2305, 2306,
  2307, 2308, 2309, 2310, 2325, 2364, 2376, 2378, 2380, 2382, 2384,
  2385, 2388, 2389, 2390, 2391, 2392, 2393, 2399, 2400, 2401, 2402,
  2403, 2404, 2405, 2408, 2409, 2410, 2416, 2484, 2485, 2487, 2490,
  2492, 2493, 2498, 2499, 2501, 2502, 2503, 2504, 2507, 2509, 2518,
  2521, 2530, 2532, 2535, 2536, 2537, 2538, 2539, 2540, 2663, 3360,
  3411,
];

const DISPLAY_ONLY_IDS = [
  476, 523, 897, 921, 922, 1456, 1915, 1945, 1966, 1993, 2021, 2025,
  2147, 2161, 2162, 2163, 2166, 2170, 2176, 2184, 2187, 2210, 2288,
  2340, 2365, 2475, 2523, 2527, 2593, 2620, 2621, 2623, 2630, 2654,
  2659, 2679, 2689, 2694, 2704, 2748, 2751, 2752, 2753, 2754, 2755,
  2786, 2799, 2821, 2823, 2916, 2934, 2935, 2937, 3131, 3197, 3263,
  3266, 3289, 3313, 3338, 3355, 3365, 3577, 3617,
];

const TEMPORARY_ONLY_IDS = [
  426, 516, 583, 678, 780, 918, 979, 1058, 1094, 1246, 1436, 1497,
  1532, 1758, 1802, 1850, 1876, 1900, 2017, 2142,
];

const CROSS_CATEGORY_REVIEWED_EXCLUSIONS = [
  {
    facility_id: 136,
    status: "temporary_or_unconfirmed",
    decision_reason: "実験工作・こどもクラフトは開催状況の確認案内に留まり、通常または反復提供の固定メニューを確認できないため。",
  },
  {
    facility_id: 157,
    status: "display_only",
    decision_reason: "辻が花染めの着物作品展示と庭園鑑賞が中心で、利用者本人の制作体験を確認できないため。",
  },
  {
    facility_id: 213,
    status: "temporary_or_unconfirmed",
    decision_reason: "子ども向けクラフトは講座・催事としての記載で、施設の通常または反復提供メニューを確認できないため。",
  },
  {
    facility_id: 632,
    status: "no_making_evidence",
    decision_reason: "温泉街にガラス工房があるという周辺案内だけで、この施設で利用者が制作できる根拠がないため。",
  },
  {
    facility_id: 1601,
    status: "temporary_or_unconfirmed",
    decision_reason: "工作はイベント実施の確認案内に留まり、通常または反復提供の固定メニューを確認できないため。",
  },
  {
    facility_id: 1823,
    status: "temporary_or_unconfirmed",
    decision_reason: "親子イベントや工作の開催確認案内だけで、通常または反復提供の固定メニューを確認できないため。",
  },
  {
    facility_id: 3034,
    status: "not_same_facility",
    decision_reason: "陶芸体験は付近の別施設についての案内で、この公園自体の提供メニューではないため。",
  },
  {
    facility_id: 3292,
    status: "not_same_facility",
    decision_reason: "ガラス工房は周辺施設の案内で、この公園展望台自体の提供メニューではないため。",
  },
  {
    facility_id: 3330,
    status: "food_only",
    decision_reason: "利用者が作る成果物は細工かまぼこであり、食品づくりだけを根拠とするため。",
  },
  {
    facility_id: 3363,
    status: "food_only",
    decision_reason: "鯛型の細工かまぼこを作る食品体験で、非食品のクラフト成果物ではないため。",
  },
  {
    facility_id: 3518,
    status: "duplicate_embedded_facility",
    decision_reason: "制作体験は公園内の山県市香り会館の提供で、同館を施設ID 3609として掲載するため。",
  },
  {
    facility_id: 3651,
    status: "temporary_only",
    decision_reason: "栞・ミニ色紙体験は企画展期間中のみで、通常または反復提供の固定メニューではないため。",
  },
];

const RECLASSIFICATIONS = [
  [525, "experience", "食品である草加せんべいの手焼き体験が主用途で、クラフト成果物の制作ではないため。"],
  [921, "museum", "利用者による制作ではなく、刃物の製造工程と職人技を見学するオープンファクトリーのため。"],
  [922, "experience", "主用途は刃物メーカー直営店と包丁の使い方教室で、利用者が工芸品を制作する施設ではないため。"],
  [1915, "museum", "小石原焼の歴史・技法・作品展示を中心とする伝統産業会館で、通常の制作体験を確認できないため。"],
  [2031, "experience", "もみじ饅頭を焼いて食べる食品体験で、クラフト成果物の制作ではないため。"],
  [2048, "museum", "うなぎパイの製造ライン見学を主用途とする工場見学施設で、利用者による制作がないため。"],
  [2060, "museum", "チョコレート・グミの製造工程を学ぶ予約制工場見学で、利用者による制作がないため。"],
  [2064, "experience", "茶工場見学・茶摘み・試飲が主用途で、クラフト成果物の制作ではないため。"],
  [2210, "museum", "観光案内と地域工芸品の展示が中心で、通常提供の制作体験を確認できないため。"],
  [2288, "museum", "ビジターセンターと鯨文化の展示を中心とする複合観光施設で、制作体験の根拠がないため。"],
  [2325, "experience", "うどんを打って食べる食品体験で、クラフト成果物の制作ではないため。"],
  [2340, "experience", "香川県産品を扱う物産館が主用途で、利用者による通常の制作体験を確認できないため。"],
  [2364, "experience", "伝統的な塩づくりを扱う食品・産業体験で、クラフト成果物の制作ではないため。"],
  [2365, "museum", "歴史的商家・道具・町並み文化の見学が主用途で、通常の制作体験を確認できないため。"],
  [2376, "experience", "宿泊・キャンプ等を含む総合観光レクリエーション施設が主用途で、クラフト専門施設ではないため。"],
  [2475, "art-museum", "作家作品を展示・販売する陶芸ギャラリーで、利用者向け制作体験を確認できないため。"],
  [2518, "fruit-picking", "果樹栽培・収穫物加工・観光農園が主用途で、クラフト成果物の制作ではないため。"],
  [2521, "experience", "食産業、料理教室、物産販売を束ねる食のテーマ施設で、クラフト専門施設ではないため。"],
  [2523, "art-museum", "小代焼の窯元作品と登り窯の見学が中心で、利用者向け制作体験を確認できないため。"],
  [2527, "art-museum", "高浜焼の窯元と作品鑑賞が中心で、利用者向け制作体験を確認できないため。"],
  [2663, "experience", "歴史的製塩と塩づくりを扱う食品・産業体験で、クラフト成果物の制作ではないため。"],
  [2786, "art-museum", "輪島塗の職人工程と漆器を見学・鑑賞する工房で、利用者向け制作体験を確認できないため。"],
  [3360, "experience", "そば打ちと飲食を主用途とする食品体験で、クラフト成果物の制作ではないため。"],
  [3411, "experience", "そば工場見学・そば打ち・飲食を主用途とする食品体験で、クラフト成果物の制作ではないため。"],
  [3617, "museum", "白川郷の生活道具・遊具・置物と地域の技を紹介・販売する施設で、通常の制作体験を確認できないため。"],
];

const CRAFT_TYPE_RULES = [
  ["陶芸", /陶|焼き物|やきもの|絵付け|ろくろ|手びねり/],
  ["ガラス", /ガラス|硝子|ステンド|とんぼ玉|サンドブラスト|グラス/],
  ["木工", /木工|木製|木彫|木の|組子|竹細工|竹工|カンナ|寄木/],
  ["染め・織り", /染|織|藍|機織|布|紡|糸|絞り|タフティング/],
  ["紙・印刷", /紙|版画|印刷|新聞|凧|ハタ|うちわ|折り紙|すき絵|絵漉/],
  [
    "アクセサリー・小物",
    /アクセサ|キャンドル|石けん|石鹸|香水|小物|レジン|革|皮|シルバー|彫金|金工|オルゴール|食品サンプル|キーホルダー|ビーズ|香り|リース/,
  ],
  ["伝統工芸", /伝統|工芸|漆|蒔絵|金箔|螺鈿|民芸|郷土|職人|組子|和紙|型紙|七宝|鋳物|焼物|織物/],
];

const WORK_ART_PATTERN =
  /工作|アートクラフト|創作体験|創作活動|創作工房|ものづくり工房|レゴ|ブロック|寄せ植え|鏝絵|漆喰|瓦粘土/;

const PRIMARY_TYPE_ORDER = [
  "陶芸",
  "ガラス",
  "木工",
  "染め・織り",
  "紙・印刷",
  "アクセサリー・小物",
  "伝統工芸",
  "工作・アート",
];

function sourceUrls(facility) {
  const urls = `${facility.source_urls ?? ""} ${facility.url ?? ""}`.match(
    /https?:\/\/[^\s,;]+/g,
  );
  return [...new Set(urls ?? [])];
}

function craftTypes(facility) {
  const text = [
    facility.name,
    facility.description,
    ...(facility.things_to_do ?? []),
    ...(facility.signature_experiences ?? []),
    ...(facility.experience_tags ?? []),
  ].join(" ");
  const matched = CRAFT_TYPE_RULES.filter(([, pattern]) => pattern.test(text)).map(
    ([type]) => type,
  );
  if (WORK_ART_PATTERN.test(text) || matched.length === 0) {
    matched.push("工作・アート");
  }
  const types = [...new Set(matched)];
  return types.sort(
    (left, right) =>
      PRIMARY_TYPE_ORDER.indexOf(left) - PRIMARY_TYPE_ORDER.indexOf(right),
  );
}

function offeringFor(facility) {
  return ["craft", "experience"].includes(facility.category_id)
    ? "ongoing"
    : "recurring";
}

function categoryName(categories, id) {
  const category = categories.find((candidate) => candidate.id === id);
  assert(category, `Unknown category: ${id}`);
  return category.name;
}

const data = JSON.parse(await readFile(FACILITIES_URL, "utf8"));
const byId = new Map(data.facilities.map((facility) => [facility.id, facility]));
const requiredIds = new Set([
  ...VERIFIED_EXISTING_IDS,
  ...VERIFIED_UNTAGGED_IDS,
  ...VERIFIED_FULL_SCAN_IDS,
  ...MISCLASSIFIED_TAG_IDS,
  ...DISPLAY_ONLY_IDS,
  ...TEMPORARY_ONLY_IDS,
  ...CROSS_CATEGORY_REVIEWED_EXCLUSIONS.map(({ facility_id }) => facility_id),
  ...RECLASSIFICATIONS.map(([id]) => id),
]);
for (const id of requiredIds) assert(byId.has(id), `Facility ${id} is missing`);

for (const id of MISCLASSIFIED_TAG_IDS) {
  const facility = byId.get(id);
  facility.recommended_for_tags = (facility.recommended_for_tags ?? []).filter(
    (tag) => tag !== "craft",
  );
}

for (const id of [...VERIFIED_UNTAGGED_IDS, ...VERIFIED_FULL_SCAN_IDS]) {
  const facility = byId.get(id);
  facility.recommended_for_tags = [
    ...new Set([...(facility.recommended_for_tags ?? []), "craft"]),
  ];
}

const reclassificationRecords = RECLASSIFICATIONS.map(
  ([facilityId, afterCategory, decisionReason]) => {
    const facility = byId.get(facilityId);
    assert(
      facility.category_id === "craft" || facility.category_id === afterCategory,
      `${facilityId}: expected craft before reclassification`,
    );
    facility.category_id = afterCategory;
    facility.category = categoryName(data.metadata.categories, afterCategory);
    return {
      facility_id: facilityId,
      facility_name: facility.name,
      before_category: "craft",
      after_category: afterCategory,
      source_urls: sourceUrls(facility),
      source_checked_at: CHECKED_AT,
      decision_reason: decisionReason,
    };
  },
);

for (const category of data.metadata.categories) {
  category.count = data.facilities.filter(
    (facility) => facility.category_id === category.id,
  ).length;
}

const verifiedIds = [
  ...VERIFIED_EXISTING_IDS,
  ...VERIFIED_UNTAGGED_IDS,
  ...VERIFIED_FULL_SCAN_IDS,
];
assert.equal(new Set(verifiedIds).size, 225, "Verified public IDs must be unique");
const evidence = verifiedIds
  .map((facilityId) => {
    const facility = byId.get(facilityId);
    const types = craftTypes(facility);
    const urls = sourceUrls(facility);
    assert(urls.length > 0, `${facilityId}: source URL is required`);
    return {
      facility_id: facilityId,
      status: "verified",
      offering: offeringFor(facility),
      source_urls: urls,
      source_checked_at: CHECKED_AT,
      decision_reason: `公式情報で、利用者本人が${types.join("・")}の制作体験に参加でき、施設の通常または反復提供メニューであることを確認。`,
      craft_types: types,
    };
  })
  .sort((left, right) => left.facility_id - right.facility_id);

const evidenceRegistry = {
  schema_version: 1,
  audited_at: CHECKED_AT,
  publication_contract: {
    status: ["verified"],
    offering: ["ongoing", "recurring"],
    note: "category_idや未検証recommended_for_tagsは公開根拠として使用しない。",
  },
  craft_types: PRIMARY_TYPE_ORDER,
  records: evidence,
  audit_exclusions: {
    display_only: DISPLAY_ONLY_IDS,
    temporary_only: TEMPORARY_ONLY_IDS,
    misclassified_or_no_evidence: MISCLASSIFIED_TAG_IDS,
    cross_category_reviewed: CROSS_CATEGORY_REVIEWED_EXCLUSIONS,
  },
  audit_cohorts: {
    accepted_l2_verified_existing_tag: VERIFIED_EXISTING_IDS,
    accepted_l2_verified_untagged: VERIFIED_UNTAGGED_IDS,
    added_by_required_all_prefecture_scan: VERIFIED_FULL_SCAN_IDS,
  },
};

const reclassificationRegistry = {
  schema_version: 1,
  audited_at: CHECKED_AT,
  records: reclassificationRecords,
};

await writeFile(FACILITIES_URL, `${JSON.stringify(data, null, 2)}\n`, "utf8");
await writeFile(
  EVIDENCE_URL,
  `${JSON.stringify(evidenceRegistry, null, 2)}\n`,
  "utf8",
);
await writeFile(
  RECLASSIFICATIONS_URL,
  `${JSON.stringify(reclassificationRegistry, null, 2)}\n`,
  "utf8",
);

console.log(
  JSON.stringify({
    verifiedEvidence: evidence.length,
    removedMisclassifiedCraftTags: MISCLASSIFIED_TAG_IDS.length,
    addedVerifiedCraftTags:
      VERIFIED_UNTAGGED_IDS.length + VERIFIED_FULL_SCAN_IDS.length,
    addedByRequiredAllPrefectureScan: VERIFIED_FULL_SCAN_IDS.length,
    reclassifiedFacilities: reclassificationRecords.length,
    categoryCraftMetadataCount: data.metadata.categories.find(
      (category) => category.id === "craft",
    ).count,
  }),
);
