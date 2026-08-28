#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const REVIEW_PATH = resolve(
  ROOT,
  "docs/audits/asoview-base-namespace-facilityops-2026-08-28.json",
);
const OUTPUT_PATH = resolve(
  ROOT,
  "scripts/data/asoview-base-namespace-addition-curation-2026-08-28.json",
);
const ADDRESS_OVERRIDES = {
  "大川美術館": {
    address_override: "群馬県桐生市小曽根町3-69",
    additional_source_urls: ["https://okawamuseum.jp/contact.php"],
  },
  "岐阜県美術館": {
    address_override: "岐阜県岐阜市宇佐4-1-22",
    additional_source_urls: ["https://kenbi.pref.gifu.lg.jp/visitor/access/"],
  },
  "仙台市歴史民俗資料館": {
    address_override: "宮城県仙台市宮城野区五輪一丁目3-7（榴岡公園内）",
    additional_source_urls: ["https://www.sendai-rekimin.jp/"],
  },
  "石神の丘美術館": {
    address_override: "岩手県岩手郡岩手町大字五日市10-121-21",
    additional_source_urls: ["https://ishigami-iwate.jp/aboutus/overview"],
  },
  "吉野公園": {
    address_override: "鹿児島県鹿児島市吉野町7955番地",
    additional_source_urls: ["https://yoshinopark.jp/about/%E5%90%89%E9%87%8E%E5%85%AC%E5%9C%92%E3%81%AB%E3%81%A4%E3%81%84%E3%81%A6"],
  },
};
const CONTENT_OVERRIDES = {
  "丸山フルーツ農園": {
    unique_selling_point:
      "さくらんぼ狩りや桃狩りを楽しめる山梨市の観光果樹園です。",
    description:
      "作物ごとに収穫する畑が分かれ、さくらんぼと桃の収穫体験に加えて、桃やぶどうの直売も行っています。",
    category: "味覚狩り",
    category_id: "fruit-picking",
    indoor_outdoor: "屋外",
    rain_friendly: "×",
    tags: ["屋外", "季節営業"],
    signature_experiences: ["さくらんぼを収穫する", "桃を収穫する"],
    experience_tags: ["採れる", "食べる"],
    recommended_for_tags: ["nature", "food"],
  },
  "小野まるよし農園": {
    unique_selling_point:
      "さくらんぼ、桃、ぶどうの収穫を楽しめる南アルプス市の観光農園です。",
    description:
      "扇状地の果樹畑で複数の果物を育て、作物の旬に合わせて収穫体験を実施しています。有機肥料を取り入れた栽培も特徴です。",
    category: "味覚狩り",
    category_id: "fruit-picking",
    indoor_outdoor: "屋外",
    rain_friendly: "×",
    tags: ["屋外", "季節営業"],
    signature_experiences: ["さくらんぼを収穫する", "桃やぶどうを収穫する"],
    experience_tags: ["採れる", "食べる"],
    recommended_for_tags: ["nature", "food"],
  },
  "赤ずきんちゃんのおもしろ農園": {
    unique_selling_point:
      "いちご摘みを中心に、季節の作物の収穫を体験できる観光農園です。",
    description:
      "いちご、メロン、スイカ、ブルーベリー、さつまいもを育て、作物ごとの収穫体験を用意しています。園内にはカフェやバーベキュー設備もあります。",
    category: "味覚狩り",
    category_id: "fruit-picking",
    indoor_outdoor: "屋内外両方",
    rain_friendly: "△",
    tags: ["季節営業", "収穫体験"],
    signature_experiences: ["いちごを摘む", "季節の果物やさつまいもを収穫する", "園内でバーベキューを楽しむ"],
    experience_tags: ["採れる", "食べる"],
    recommended_for_tags: ["nature", "food"],
  },
  "中井観光農園": {
    unique_selling_point:
      "りんご畑と自家栽培果実の加工品に触れられる余市町の観光農園です。",
    description:
      "千本を超えるりんごの木を育て、樹上で完熟させた果実からシードル、ジュース、ジャムを製造しています。果樹栽培と観光農園、直売を一体で営む施設です。",
    category: "味覚狩り",
    category_id: "fruit-picking",
    indoor_outdoor: "屋外",
    rain_friendly: "×",
    tags: ["屋外", "果樹園"],
    signature_experiences: ["りんご畑を訪れる", "自家栽培果実の加工品に触れる"],
    experience_tags: ["見る", "食べる"],
    recommended_for_tags: ["nature", "food"],
  },
  "十里木ランド": {
    unique_selling_point:
      "秋川渓谷の河原で、バーベキューと川遊びを楽しめる屋外レジャー施設です。",
    description:
      "河原のバーベキュー区画を利用でき、食材セットや道具のレンタルにも対応しています。春から秋に営業し、冬季は休園する季節型の常設施設です。",
    category: "公園・自然",
    category_id: "nature-park",
    indoor_outdoor: "屋外",
    rain_friendly: "×",
    tags: ["屋外", "季節営業", "水遊び"],
    signature_experiences: ["河原でバーベキューを楽しむ", "秋川で水遊びをする"],
    experience_tags: ["自然", "食べる", "遊ぶ"],
    summer_water_play: "○",
    recommended_for_tags: ["water_play", "nature", "food"],
  },
};

const reviewData = JSON.parse(await readFile(REVIEW_PATH, "utf8"));
if (reviewData.coverage.pending_count !== 0) {
  throw new Error("refusing to curate an incomplete FacilityOps review");
}

const items = reviewData.reviews
  .filter((review) => review.final_status === "ADD")
  .map(curate);

await writeFile(
  OUTPUT_PATH,
  `${JSON.stringify(
    {
      schema_version: 1,
      generated_at: "2026-08-28",
      method:
        "Deterministic FacilityOps curation from independently verified identity and primary-source content signals; sparse records stay concise instead of receiving unsupported copy.",
      items,
    },
    null,
    2,
  )}\n`,
  "utf8",
);
console.log(`wrote ${items.length} FacilityOps content-contract curations`);

function curate(review) {
  const name = canonicalName(review.asoview_identity);
  const signals = unique(review.facility.content_signals ?? []);
  const profile = classify(name, signals, review.facility.family_relevance ?? []);
  const experiences = signals.length
    ? signals.map((signal) => `${signal}を楽しむ`)
    : [profile.primaryExperience];
  return {
    asoview_identity: review.asoview_identity,
    name,
    category: profile.category,
    category_id: profile.categoryId,
    indoor_outdoor: profile.indoorOutdoor,
    rain_friendly: profile.rainFriendly,
    is_free: false,
    adult_fee: "要確認",
    child_fee: "要確認",
    child_use_notes: review.evidence.child_use.satisfied
      ? "公式一次情報に子どもの利用条件あり"
      : "子どもの利用条件は未確認",
    description: description(profile, signals),
    target_age: review.evidence.child_use.satisfied ? "親子" : "要確認",
    official_url: review.evidence.identity.url,
    tags: profile.tags,
    signature_experiences: experiences,
    unique_selling_point: profile.summary,
    experience_tags: profile.experienceTags,
    summer_water_play: signals.includes("水遊び") || signals.includes("プール") ? "○" : "×",
    recommended_for_tags: profile.recommendedForTags,
    ...(CONTENT_OVERRIDES[review.asoview_identity] ?? {}),
    ...(ADDRESS_OVERRIDES[review.asoview_identity] ?? {}),
  };
}

function classify(name, signals, family) {
  const explicitTypePattern = /水族館|動物園|牧場|遊園地|テーマパーク|美術館|科学館|プラネタリウム|博物館|資料館|記念館|ミュージアム|いちご|苺|果樹|果物狩り|スキー|スノー|ゲレンデ|温泉|プール|ウォーターパーク|アスレチック|クライミング|ボルダリング|トランポリン|カート|テニス|フットサル|ゴルフ|スポーツ|展望|タワー|工房|陶芸|クラフト|ワークショップ|カラオケ|ゲーム|アミューズメント|キッズ|プレイランド|キャンプ|森林|自然|公園|パーク|遊具|芝生/u;
  // When the identity itself states the facility type, do not let unrelated
  // navigation/footer text collected from a large official site override it.
  const value = explicitTypePattern.test(name)
    ? name
    : `${name} ${signals.join(" ")} ${family.join(" ")}`;
  if (/水族館/u.test(value)) return profile("水族館", "aquarium", "屋内", "◎", "水生生物の展示を見ながら、生態や環境について学べる水族館です。", "水生生物の展示を観察する", ["完全屋内"], ["見る", "学ぶ"], ["animal", "exhibition"]);
  if (/動物園|牧場/u.test(value)) return profile("動物園", "zoo", "屋内外両方", "△", "動物を観察し、施設ごとの飼育展示やふれあいを楽しめる施設です。", "動物を観察する", ["屋内外"], ["見る", "触れる"], ["animal", "nature"]);
  if (/遊園地|テーマパーク|乗りもの/u.test(value)) return profile("遊園地・テーマパーク", "theme-park", "屋外", "×", "乗りものやアトラクションを中心に遊べるレジャー施設です。", "アトラクションで遊ぶ", ["屋外"], ["乗れる", "動く"], ["vehicle", "playground"]);
  if (/美術館|アート/u.test(value)) return profile("美術館・体験", "art-museum", "屋内", "◎", "作品やコレクションを鑑賞し、表現や背景に触れられる美術館です。", "作品を鑑賞する", ["完全屋内"], ["見る", "学ぶ"], ["exhibition"]);
  if (/科学館|プラネタリウム/u.test(value)) return profile("科学館", "science-museum", "屋内", "◎", "科学の展示を見て、現象や仕組みを学べる科学館です。", "科学展示を観察する", ["完全屋内"], ["見る", "学ぶ"], ["science", "exhibition"]);
  if (/博物館|資料館|記念館|ミュージアム/u.test(value)) return profile("博物館", "museum", "屋内", "◎", "テーマに沿った資料や展示を通して、その背景を学べる文化施設です。", "資料や展示を見て学ぶ", ["完全屋内"], ["見る", "学ぶ"], ["exhibition"]);
  if (/いちご|苺|果樹|果物狩り|いちご狩り/u.test(value)) return profile("味覚狩り", "fruit-picking", "屋外", "×", "旬の果物を自分で収穫する体験を楽しめる観光農園です。", "旬の果物を収穫する", ["屋外", "季節営業"], ["採れる", "食べる"], ["nature", "food"]);
  if (/スキー|スノー|ゲレンデ|雪遊び/u.test(value)) return profile("スキー場・雪遊び", "ski", "屋外", "×", "雪上でスキーや雪遊びを楽しめる季節型の屋外施設です。", "雪上で体を動かす", ["屋外", "冬季営業"], ["滑る", "動く"], ["nature", "wide_space"]);
  if (/温泉|プール|ウォーターパーク/u.test(value)) return profile("温泉プール", "hot-spring-pool", "屋内外両方", "○", "水に入って泳いだり、施設ごとの浴槽や水遊び設備を楽しめる施設です。", "プールや浴槽で過ごす", ["水遊び"], ["泳ぐ", "くつろぐ"], ["pool", "water_play"]);
  if (/アスレチック|クライミング|ボルダリング|トランポリン|カート|テニス|フットサル|ゴルフ|スポーツ/u.test(value)) return profile("アスレチック", "athletic", "屋内外両方", "△", "体を動かしてコースや運動設備に挑戦できるアクティビティ施設です。", "運動設備に挑戦する", ["体を動かす"], ["動く", "挑戦する"], ["playground", "wide_space"]);
  if (/展望|タワー|眺望/u.test(value)) return profile("展望台", "viewpoint", "屋内外両方", "△", "高所や見晴らしのよい場所から周囲の景色を眺められる展望施設です。", "展望地点から景色を見る", ["眺望"], ["絶景", "見る"], ["nature", "wide_space"]);
  if (/クラフト|工房|陶芸|ワークショップ|制作体験/u.test(value)) return profile("クラフト体験", "craft", "屋内", "◎", "素材や道具に触れながら、自分の手でものづくりを体験できる施設です。", "ものづくりを体験する", ["完全屋内"], ["作れる", "学ぶ"], ["craft", "experience"]);
  if (/キッズ|屋内|プレイランド|ゲームセンター|カラオケ/u.test(value)) return profile("屋内遊び場", "indoor-play", "屋内", "◎", "天候を気にせず、館内の遊びや設備を楽しめる屋内施設です。", "屋内の遊びを楽しむ", ["完全屋内"], ["動く", "遊ぶ"], ["playground", "experience"]);
  if (/キャンプ|森林|自然|散策/u.test(value)) return profile("公園・自然", "nature-park", "屋外", "×", "自然の中で散策や外遊びを楽しめる屋外施設です。", "自然の中で過ごす", ["屋外"], ["自然", "歩く"], ["nature", "wide_space"]);
  if (/公園|パーク|遊具|芝生/u.test(value)) return profile(signals.some((signal) => /遊具|アスレチック/u.test(signal)) ? "公園(大型遊具)" : "公園・自然", signals.some((signal) => /遊具|アスレチック/u.test(signal)) ? "park" : "nature-park", "屋外", "×", "園内で外遊びや散策を楽しめる常設の公園です。", "園内で外遊びや散策をする", ["屋外"], ["動く", "歩く"], ["playground", "wide_space"]);
  if (/農園|ファーム/u.test(name)) return profile("体験", "experience", "屋外", "×", "農園を訪れ、現地で提供される体験に参加できる施設です。", "農園で現地体験に参加する", ["屋外"], ["体験する"], ["nature", "experience"]);
  if (/釣り|フィッシュ/u.test(name)) return profile("体験", "experience", "屋外", "×", "水辺で釣りを体験できる屋外施設です。", "釣りを体験する", ["屋外"], ["体験する"], ["water_play", "nature"]);
  return profile("体験", "experience", "屋内外両方", "△", `${name}で提供される現地体験に参加できる常設施設です。`, "現地体験に参加する", ["体験"], ["体験する"], ["experience"]);
}

function description(profileValue, signals) {
  const features = relevantSignals(profileValue.categoryId, signals).slice(0, 5);
  const composition = features.length
    ? `${joinJapanese(features)}を組み合わせて楽しめます。`
    : fallbackDescription(profileValue.categoryId);
  if (profileValue.categoryId === "fruit-picking") {
    return `${composition} 作物の生育に合わせて収穫内容が変わる、毎年繰り返し利用できる季節型の施設です。`;
  }
  if (profileValue.categoryId === "ski") {
    return `${composition} 積雪期を中心に毎年営業する季節型の施設です。`;
  }
  return composition;
}

function relevantSignals(categoryId, signals) {
  const patterns = {
    aquarium: /生きもの観察|常設展示|体験展示/u,
    zoo: /動物とのふれあい|生きもの観察|乗りもの/u,
    "theme-park": /乗りもの|大型遊具|遊具|水遊び/u,
    "art-museum": /常設展示|企画展示|収蔵作品|ワークショップ/u,
    "science-museum": /常設展示|企画展示|体験展示|ワークショップ|プラネタリウム/u,
    museum: /常設展示|企画展示|収蔵作品|体験展示|ワークショップ/u,
    "fruit-picking": /いちご狩り|果物狩り|食べ放題/u,
    ski: /雪遊び|スキー・スノーボード/u,
    "hot-spring-pool": /温泉|プール|水遊び/u,
    athletic: /大型遊具|遊具|アスレチック|トランポリン|クライミング|乗りもの/u,
    viewpoint: /展望|散策/u,
    craft: /ワークショップ|体験展示/u,
    "indoor-play": /大型遊具|遊具|トランポリン|クライミング|ワークショップ/u,
    "nature-park": /大型遊具|遊具|芝生広場|アスレチック|水遊び|生きもの観察|展望|キャンプ|バーベキュー|散策/u,
    park: /大型遊具|遊具|芝生広場|アスレチック|水遊び|生きもの観察|展望|キャンプ|バーベキュー|散策/u,
    experience: /ワークショップ|動物とのふれあい|いちご狩り|果物狩り|釣り|キャンプ/u,
  };
  const pattern = patterns[categoryId];
  return pattern ? signals.filter((signal) => pattern.test(signal)) : [];
}

function fallbackDescription(categoryId) {
  return {
    aquarium: "館内の水槽を順に巡りながら、種類ごとの姿や泳ぎ方の違いを観察できます。",
    zoo: "飼育エリアを巡りながら、動物ごとの姿や行動を間近に観察できます。",
    "theme-park": "園内の乗りものや遊びの中から、興味や過ごし方に合うものを選べます。",
    "art-museum": "展示室を巡りながら、作品ごとの表現やコレクションの構成を鑑賞できます。",
    "science-museum": "展示を順に見ながら、身近な現象と科学の仕組みを結び付けて学べます。",
    museum: "展示テーマごとに資料を巡り、その施設が扱う歴史や文化の背景をたどれます。",
    "fruit-picking": "園内で実った果物を見分け、自分の手で収穫する工程を体験できます。",
    ski: "ゲレンデで滑走や雪上の遊びを選び、雪のある屋外で体を動かせます。",
    "hot-spring-pool": "水に入って泳ぐ時間と、浴槽や休憩を挟む過ごし方を組み合わせられます。",
    athletic: "コースや運動設備を順に使い、全身を動かしながら課題に挑戦できます。",
    viewpoint: "展望地点まで移動し、方角によって変わる街並みや自然の広がりを眺められます。",
    craft: "素材を選び、道具を使って仕上げるまでのものづくりの工程を体験できます。",
    "indoor-play": "館内の遊びや設備から、その日の興味に合う過ごし方を選べます。",
    "nature-park": "園内や周辺の自然を歩き、景観を眺めながら外で過ごせます。",
    park: "園内を巡りながら、外遊びと散策を組み合わせて過ごせます。",
    experience: "施設が扱うテーマに沿って、現地で提供される体験に参加できます。",
  }[categoryId];
}

function profile(category, categoryId, indoorOutdoor, rainFriendly, summary, primaryExperience, tags, experienceTags, recommendedForTags) {
  return {
    category,
    categoryId,
    indoorOutdoor,
    rainFriendly,
    summary,
    primaryExperience,
    tags,
    experienceTags,
    recommendedForTags,
  };
}

function canonicalName(value) {
  return String(value ?? "")
    .normalize("NFKC")
    .replace(/^【[^】]+】\s*/u, "")
    .replace(/^[（(](?:株|有|公財|公社)[）)]\s*/u, "")
    .replace(/^(?:株式会社|有限会社|公益財団法人|公益社団法人)\s*/u, "")
    .replace(/\s+/gu, " ")
    .trim();
}

function joinJapanese(values) {
  if (values.length <= 1) return values[0] ?? "施設固有の体験";
  return `${values.slice(0, -1).join("、")}や${values.at(-1)}`;
}

function unique(values) {
  return [...new Set(values)];
}
