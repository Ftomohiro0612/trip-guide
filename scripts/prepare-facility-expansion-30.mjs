import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import assert from "node:assert/strict";
import sharp from "sharp";

const ROOT = resolve(import.meta.dirname, "..");
const CHECK_DATE = "2026-07-19";
const SNAPSHOT_PATH = resolve(ROOT, ".codex", "_facility_expansion_30_candidates.json");

const PREFECTURES = {
  toyama: {
    id: "toyama",
    name: "富山県",
    host: "www.info-toyama.com",
    bbox: [36.25, 36.99, 136.75, 137.8],
    pages: Array.from(
      { length: 32 },
      (_, index) =>
        `https://www.info-toyama.com/attractions?st=acs&vw=tile&page=${index + 1}`,
    ),
    sourceNote:
      "公益社団法人とやま観光推進機構公式「とやま観光ナビ」の個別ページで施設名、正式所在地、施設内容、料金案内（掲載がある場合）、公式地図座標を確認。座標は同公式ページ掲載点を採用し、富山県bbox内および住所との県一致を検査。",
  },
  fukui: {
    id: "fukui",
    name: "福井県",
    host: "www.fuku-e.com",
    bbox: [35.32, 36.33, 135.42, 136.83],
    pages: Array.from(
      { length: 39 },
      (_, index) =>
        `https://www.fuku-e.com/spot/index_${index + 1}_2____0____.html`,
    ),
    sourceNote:
      "公益社団法人福井県観光連盟公式「ふくいドットコム」の個別ページで施設名、正式所在地、施設内容、料金案内（掲載がある場合）、公式地図座標を確認。座標は同公式ページ掲載点を採用し、福井県bbox内および住所との県一致を検査。",
  },
  gifu: {
    id: "gifu",
    name: "岐阜県",
    host: "www.kankou-gifu.jp",
    bbox: [35.08, 36.47, 136.27, 137.66],
    pages: Array.from(
      { length: 67 },
      (_, index) =>
        `https://www.kankou-gifu.jp/spot/index_${index + 1}_2____0__.html`,
    ),
    sourceNote:
      "一般社団法人岐阜県観光連盟公式「岐阜の旅ガイド」の個別ページで施設名、正式所在地、施設内容、料金案内（掲載がある場合）、公式地図座標を確認。座標は同公式ページ掲載点を採用し、岐阜県bbox内および住所との県一致を検査。",
  },
  mie: {
    id: "mie",
    name: "三重県",
    host: "www.kankomie.or.jp",
    bbox: [33.66, 35.26, 135.85, 136.99],
    pages: Array.from(
      { length: 145 },
      (_, index) => `https://www.kankomie.or.jp/spot/index?page=${index + 1}`,
    ),
    sourceNote:
      "公益社団法人三重県観光連盟公式「観光三重」の個別ページで施設名、正式所在地、施設内容、料金案内（掲載がある場合）、公式地図座標を確認。座標は同公式ページ掲載点を採用し、三重県bbox内および住所との県一致を検査。",
  },
};

const STRONG_FAMILY =
  /子ども|子供|こども|キッズ|ファミリー|親子|家族|遊具|ボールプール|児童|幼児|小学生|ふれあい|体験|アスレチック|冒険|恐竜|化石|科学|実験|工作|クラフト|収穫|摘み取り|釣り|川遊び|水遊び|雪遊び/gi;
const FAMILY_FACILITY =
  /公園|博物館|科学館|水族館|動物園|遊園地|テーマパーク|ミュージアム|資料館|記念館|学習館|展示館|美術館|工房|農園|果樹園|牧場|キャンプ|スキー|スノー|プール|海水浴|海浜|アスレチック|ロープウェイ|ゴンドラ|クルーズ|遊覧|自然館|ビジターセンター|植物園|昆虫|生きもの|鉄道|列車|電車|宇宙|プラネタリウム|展望台|鍾乳洞|洞窟|渓谷|滝|森林|フィールド|サイクリング|カヤック|SUP|ラフティング|ボート|陶芸|ガラス|木工|染め|忍者|ダム|砂防|発電所/gi;
const NEGATIVE =
  /ホテル|旅館|民宿|宿泊施設|レストラン|カフェ|食堂|居酒屋|ラーメン|寿司|売店|土産|ショッピング|神社|寺院|仏閣|墓|霊場|祭り|花火|大会|イベント|スタンプラリー|婚礼|結婚式|ゴルフ|スナック|バー|ワイナリー|酒蔵|酒造|醸造|市場|直売所|道の駅/gi;
const CLOSED_OR_TEMPORARY =
  /閉館|閉園|閉鎖|廃止|営業終了|営業を終了|休館中|休園中|休業中|期間限定営業|イベント|スタンプラリー|開催！|開催中|募集！|2026年|2026\/|2026（/;
const SELECT_ALLOW =
  /子ども|子供|こども|キッズ|ファミリー|家族|遊具|公園|博物館|科学館|水族館|動物園|遊園地|テーマパーク|ミュージアム|資料館|記念館|学習館|展示館|美術館|工房|農園|果樹園|牧場|キャンプ|スキー|プール|海水浴|海浜|アスレチック|ロープウェイ|ゴンドラ|クルーズ|遊覧|自然館|ビジターセンター|植物園|昆虫|鉄道|列車|電車|ダム|洞窟|渓谷|滝|森林|サイクリング|カヤック|SUP|ラフティング|ボート|陶芸|ガラス|木工|染め|忍者|フィッシング|釣り|体験|恐竜|化石|展望|スポーツ|水上ライン|水遊び|海岸|ビーチ|広場|防災|漁業|工場/;
const SELECT_EXCLUDE =
  /閉館|閉店|閉園|休園|休館|通行止め|ホテル|旅館|民宿|宿$|レストラン|カフェ|飯店|観光協会|株式会社|会社$|試飲|祭|紅葉|桜\/?|の桜|ツツジ|花物語|水物語|光物語|開催|募集|記念碑|神社|寺$|お寺|仏壇|温泉郷$|ゲストハウス|海の家|ワンコ|ドッグ|ゴルフ|ボウル|事務所|駅停留場|観光案内所|情報交差点|フェアフィールド|グランピング|Lodge|BEACH HOUSE|Beach Club|キャンプスタイルの宿|スターバックス|旅籠|温泉村|団体様向け/;

const MANUAL_EXCLUDES = {
  toyama: new Set([
    "藍染め屋 aiya",
    "雷鳥沢キャンプ場",
    "立山山岳スキー",
    "剱沢キャンプ場",
    "祖母谷キャンプ場",
    "北陸電力 有峰ダム",
    "本宮砂防えん堤",
    "渚泊魚津丸（STAY at WHARF UOZUMARU）",
    "たいらマウンテンスクール",
    "バレル富山",
    "ショウワノート",
    "サイクリングターミナル",
    "ハンノキ滝",
    "モンベル立山ベースキャンプ ビジターセンター",
    "小牧ダム",
    "水道つつじ公園",
    "長寿が滝",
    "富山県立イタイイタイ病資料館",
    "墓ノ木自然公園",
  ]),
  fukui: new Set([
    "華やかな舞妓・芸妓さんに変身プラン",
    "ぐらばあ亭",
    "【火縄銃（エアガン）射撃体験付き】森に潜む城・神宮寺城 戦国ガイドツアー",
    "ゆけむり温泉ゆ～遊",
    "佐野温泉 福の湯",
    "ブルーライト ヨコヤマ",
    "結びのチャイム(西山公園)",
    "紫式部公園 藤の回廊",
    "冠山",
    "ふるさと交流センター きらめき",
    "吉崎御坊 蓮如上人記念館",
    "桝谷ダム",
    "小池公園",
    "福井県立芦原青年の家",
    "柳の滝",
  ]),
  gifu: new Set([
    "焚火屋",
    "コテージ石楠花",
    "森林レンタルサービスforenta 子ノ原高原キャンプエリア",
    "森林レンタルサービスforenta 東白川キャンプエリア",
    "飛騨市図書館",
    "加子母森林組合モクモクセンター",
    "奥矢作レクリエーションセンター",
    "山楠公園",
    "人道の丘公園",
    "天生県立自然公園",
    "東光寺公園",
    "北山公園 鮎崎城址公園",
  ]),
  mie: new Set([
    "大伸丸渡船",
    "家族だんらんを楽しむ器店「他抜きだんらん亭」",
    "阿曽浦 親子大橋",
    "上野運動公園競技場",
    "kiond縁日",
    "TASO BEACH HOUSE",
    "名古屋文化学園 尾高キンダーハイム",
    "伊賀のかくれ宿 赤目温泉 隠れの湯 対泉閣",
    "鈴鹿サーキットホテル",
    "戸田家",
    "牛の背",
    "市木のいぶき【県指定天然記念物】",
    "STUDIO 672（VISON）",
    "LIFE＆HOTEL UMIMORI",
    "irokuma kids",
    "【まちかど博物館】フリーギャラリー",
    "【まちかど博物館】我楽多瓢箪工房",
    "【まちかど博物館】古き道具の館 生活工房かめだや",
    "伊勢かぐらばリゾート 千の杜「流水プール」",
    "河内不動の滝",
    "古和浦不動の滝",
    "村山不動の滝（朝日滝）",
    "鳥羽竜発見現場",
  ]),
};

const MANUAL_INCLUDES = {
  toyama: new Set([
    "桜町JOMONパーク",
    "屋内多目的施設わくわくドーム",
    "庄川峡遊覧船",
    "忍者ハットリくん列車",
    "富岩運河環水公園",
    "富山県空港スポーツ緑地 インクルーシブひろば",
    "氷見市海浜植物園シーサイドパーク",
    "五箇山和紙漉き体験館",
  ]),
  fukui: new Set([
    "きのこの森",
    "セーレンプラネット",
    "越前和紙の里 パピルス館",
    "御食国若狭おばま食文化館",
    "敦賀鉄道資料館(旧敦賀港駅舎 )",
    "福井県園芸体験施設 園芸LABOの丘",
    "福井県海浜自然センター",
    "福井総合植物園プラントピア",
  ]),
  gifu: new Set([
    "岐阜公園",
    "小屋垣内農園（権太農園）いちご狩り",
    "森の文化博物館",
    "枡工房ますや",
    "鷲ヶ岳アルプスアドベンチャー",
    "フェザーミュージアム",
    "木曽三川公園センター【海津市】",
  ]),
  mie: new Set([
    "いなべ公園",
    "伊賀流忍者体験施設「万川集海」",
    "亀山里山公園「みちくさ」",
    "霞ヶ浦緑地公園",
    "四季の森ふれあい広場",
    "川越緑地公園",
    "体験学習 味の素株式会社 東海工場",
    "和具サンシャインビーチ",
    "おえかき水族館＿鳥羽水族館店",
    "西藤原駅前公園",
  ]),
};

const ID_STARTS = {
  toyama: 3271,
  fukui: 3391,
  gifu: 3511,
  mie: 3631,
};

const CATEGORY_NAMES = {
  "theme-park": "遊園地・テーマパーク",
  zoo: "動物園",
  aquarium: "水族館",
  park: "公園(大型遊具)",
  "indoor-play": "屋内遊び場",
  "science-museum": "科学館",
  museum: "博物館",
  craft: "クラフト体験",
  "fruit-picking": "味覚狩り",
  "hot-spring-pool": "温泉プール",
  athletic: "アスレチック",
  "art-museum": "美術館・体験",
  ski: "スキー場・雪遊び",
  experience: "体験",
  "nature-park": "公園・自然",
  viewpoint: "展望台",
  scenic: "自然・絶景",
  "game-center": "ゲームセンター",
};

const CATEGORY_OVERRIDES = {
  "NIJIWO TUKURU tufting studio": "craft",
  "Nomichi Port Yashiro": "experience",
  "SUP Village Yashiro": "experience",
  "きのこの森": "park",
  "きときとファーム": "fruit-picking",
  "おおかみこどもの花の家（映画「おおかみこどもの雨と雪」舞台モデル 聖地）": "museum",
  "したてやさん・ラポージェ": "craft",
  "ひるが海上釣堀": "experience",
  "ますのすし手作り体験（ますのすしミュージアム）": "experience",
  "みどりと自然の村「太陽広場」": "park",
  "アクアパーク（黒部浄化センター内）": "park",
  "アソビックスあさひ": "game-center",
  "アトリエ・トミカ": "craft",
  "シーパーク丹生": "experience",
  "トリムパークかなづ": "park",
  "サイエンスワールド": "science-museum",
  "一乗滝小次郎の里ファミリーパーク": "park",
  "五箇山和紙漉き体験館": "craft",
  "八ヶ峰家族旅行村": "nature-park",
  "六呂師高原キャンプ場「SORA to DAICHI」": "nature-park",
  "勝山自然塾": "experience",
  "下呂温泉合掌村": "museum",
  "奥越高原牧場": "nature-park",
  "中部山岳国立公園奥飛騨ビジターセンター": "museum",
  "三重県民の森": "nature-park",
  "富山市ファミリーパーク": "zoo",
  "富山県海浜自然センター": "science-museum",
  "御食国若狭おばま食文化館": "museum",
  "恐竜の森": "theme-park",
  "月夜谷ふれあいの里": "nature-park",
  "新庄渓流の里": "nature-park",
  "桜町JOMONパーク": "park",
  "松幸農産これから村": "fruit-picking",
  "水島": "nature-park",
  "津沢あんどんふれあい会館": "museum",
  "牧歌の里": "zoo",
  "石田フィッシャリーナ つり桟橋": "experience",
  "福井県総合グリーンセンター": "nature-park",
  "福井総合植物園プラントピア": "nature-park",
  "立山山麓家族旅行村": "nature-park",
  "研究栽培農園 鈴鹿の森庭園（赤塚植物園）": "nature-park",
  "細工かまぼこづくり体験（梅かまミュージアム U-mei館）": "experience",
  "芝政ワールドオートキャンプ場": "nature-park",
  "若狭たかはま エルどらんど": "science-museum",
  "落合の郷": "nature-park",
  "赤川焼（越山房）": "craft",
  "越前水仙の里公園": "park",
  "錫のアクセサリー体験（大寺幸八郎商店 茶房ギャラリーおおてら）": "craft",
  "楠中央緑地": "park",
  "五桂池": "nature-park",
  "かぶとの森テラス": "nature-park",
  "マリーナ河芸": "experience",
  "山県市香り会館": "museum",
  "東濃牧場": "nature-park",
  "のほほんパークひだおさか（飛騨小坂ふれあいの森）": "park",
  "八滝ウッディランド": "nature-park",
  "かさはら潮見の森": "nature-park",
  "四季の森ふれあい広場": "park",
  "宇賀渓諸瀑": "nature-park",
  "竜吟峡": "nature-park",
  "黒部市尾の沼体験交流施設とちの湯": "hot-spring-pool",
  "ナビゲートシアター＆小物手作り体験（入善町）": "craft",
};

function decodeHtml(value = "") {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&ldquo;|&rdquo;/g, '"')
    .replace(/&times;/g, "×")
    .replace(/&rarr;/g, "→")
    .replace(/&rArr;/g, "⇒")
    .replace(/&copy;/g, "©")
    .replace(/&deg;/g, "°")
    .replace(/&hellip;/g, "…")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#x([\da-f]+);/gi, (_, hex) => String.fromCodePoint(Number.parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, number) => String.fromCodePoint(Number(number)));
}

function toText(value = "") {
  return decodeHtml(
    value.replace(/<br\s*\/?>/gi, " ").replace(/<[^>]+>/g, " "),
  )
    .replace(/\s+/g, " ")
    .trim();
}

function normalize(value = "") {
  return value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\s　・･（）()「」『』【】\[\]‐‑‒–—―ー－-]/g, "");
}

function normalizeAddress(address, prefectureName) {
  const municipalityDuplicate = new RegExp(
    `^(${prefectureName})([^\\s]{1,8}[市町村])\\2`,
  );
  return address.replace(municipalityDuplicate, "$1$2").replace(/\s+/g, " ").trim();
}

function scoreCandidate({ name, description = "" }) {
  const value = `${name} ${description}`;
  let score = (value.match(STRONG_FAMILY) ?? []).length * 5;
  score += (value.match(FAMILY_FACILITY) ?? []).length * 3;
  score -= (value.match(NEGATIVE) ?? []).length * 6;
  if (/子ども|子供|こども|キッズ|ファミリー|親子|家族/.test(value)) score += 10;
  if (
    /公園|博物館|科学館|水族館|動物園|遊園地|テーマパーク|体験|工房|農園|牧場|キャンプ|スキー|プール|海水浴|アスレチック/.test(
      name,
    )
  ) {
    score += 8;
  }
  if (CLOSED_OR_TEMPORARY.test(name)) score -= 50;
  return score;
}

async function fetchText(url) {
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: {
          "User-Agent": "Memorip facility research/2026 (+https://trip-guide.net)",
        },
        redirect: "follow",
        signal: AbortSignal.timeout(30_000),
      });
      if (!response.ok) throw new Error(`${response.status} ${url}`);
      return await response.text();
    } catch (error) {
      lastError = error;
      await new Promise((resolveDelay) => setTimeout(resolveDelay, attempt * 500));
    }
  }
  throw lastError;
}

async function mapLimit(items, concurrency, callback) {
  const output = new Array(items.length);
  let index = 0;
  await Promise.all(
    Array.from({ length: concurrency }, async () => {
      while (index < items.length) {
        const currentIndex = index;
        index += 1;
        output[currentIndex] = await callback(items[currentIndex], currentIndex);
      }
    }),
  );
  return output;
}

function parseListing(html, prefectureId) {
  const rows = [];
  if (prefectureId === "toyama") {
    for (const match of html.matchAll(
      /<li class="o-digest--tile__item">[\s\S]*?<a[^>]*href="(?:https:\/\/www\.info-toyama\.com)?(\/attractions\/\d+)"[\s\S]*?<\/li>/gi,
    )) {
      const block = match[0];
      const name = toText(block.match(/<h2[^>]*>([\s\S]*?)<\/h2>/i)?.[1]);
      const description = toText(
        block.match(/<p[^>]*description[^>]*>([\s\S]*?)<\/p>/i)?.[1],
      );
      if (name) rows.push({ url: `https://www.info-toyama.com${match[1]}`, name, description });
    }
  } else if (prefectureId === "mie") {
    for (const match of html.matchAll(
      /<div class="col-12 col-md-4 mb-5">[\s\S]*?<a[^>]*href="(\/spot\/\d+)"[\s\S]*?<\/a><\/div>/gi,
    )) {
      const block = match[0];
      const paragraphs = [...block.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)].map((item) =>
        toText(item[1]),
      );
      const name = paragraphs.find((value) => value.length > 0 && value.length < 100) ?? "";
      const description =
        paragraphs.find((value) => value !== name && value.length > 20) ?? "";
      if (name) rows.push({ url: `https://www.kankomie.or.jp${match[1]}`, name, description });
    }
  } else {
    const host = prefectureId === "fukui" ? "www.fuku-e.com" : "www.kankou-gifu.jp";
    for (const match of html.matchAll(
      /<dl class="[^"]*">[\s\S]*?<a[^>]*href="(detail_\d+\.html)"[\s\S]*?<\/dl>/gi,
    )) {
      const block = match[0];
      const name = toText(block.match(/<dt[^>]*>([\s\S]*?)<\/dt>/i)?.[1]);
      const descriptions = [...block.matchAll(/<dd[^>]*>([\s\S]*?)<\/dd>/gi)].map(
        (item) => toText(item[1]),
      );
      const description = descriptions.find((value) => value.length > 25) ?? "";
      if (name) rows.push({ url: `https://${host}/spot/${match[1]}`, name, description });
    }
  }
  return rows;
}

function metaContent(html, name) {
  const patterns = [
    new RegExp(`<meta\\s+name=["']${name}["']\\s+content=["']([^"']*)["']`, "i"),
    new RegExp(`<meta\\s+content=["']([^"']*)["']\\s+name=["']${name}["']`, "i"),
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match) return toText(match[1]);
  }
  return "";
}

function definitionValue(html, label) {
  const pattern = new RegExp(
    `<dt[^>]*>\\s*${label}\\s*<\\/dt>\\s*<dd[^>]*>([\\s\\S]*?)<\\/dd>`,
    "i",
  );
  return toText(html.match(pattern)?.[1]);
}

function tableValue(html, label) {
  const pattern = new RegExp(
    `<th[^>]*>\\s*${label}\\s*<\\/th>\\s*<td[^>]*>([\\s\\S]*?)<\\/td>`,
    "i",
  );
  return toText(html.match(pattern)?.[1]);
}

function divGridValue(html, label) {
  const pattern = new RegExp(
    `<div[^>]*>\\s*${label}\\s*<\\/div>\\s*<div[^>]*>([\\s\\S]*?)<\\/div>`,
    "i",
  );
  return toText(html.match(pattern)?.[1]);
}

function extractCoordinates(html) {
  const patterns = [
    /[?&](?:q|destination)=(-?\d{2}\.\d+),(-?\d{3}\.\d+)/i,
    /q=(-?\d{2}\.\d+),(-?\d{3}\.\d+)&(?:amp;)?zoom/i,
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match) return { latitude: Number(match[1]), longitude: Number(match[2]) };
  }
  return { latitude: null, longitude: null };
}

function parseDetail(html, url, spec) {
  const title = toText(html.match(/<title>([\s\S]*?)<\/title>/i)?.[1]);
  const name = title.split(/[｜|]/)[0].trim();
  let description = metaContent(html, "description")
    .replace(/\s*[|｜]\s*[^|｜]+$/, "")
    .trim();
  if (description.length > 500) description = description.slice(0, 500).trim();

  let address;
  let fee;
  if (spec.id === "toyama") {
    address = tableValue(html, "住所");
    fee = tableValue(html, "料金");
  } else if (spec.id === "mie") {
    address = divGridValue(html, "住所");
    fee =
      divGridValue(html, "料金") ||
      divGridValue(html, "入場料") ||
      divGridValue(html, "利用料金");
  } else {
    address = definitionValue(html, "住所");
    fee = definitionValue(html, "料金");
  }

  address = address.replace(/^〒[\d-]+\s*/, "").trim();
  if (address && !address.startsWith(spec.name)) address = `${spec.name}${address}`;
  const coordinates = extractCoordinates(html);
  const [minLat, maxLat, minLng, maxLng] = spec.bbox;
  const coordinateInBounds =
    Number.isFinite(coordinates.latitude) &&
    Number.isFinite(coordinates.longitude) &&
    coordinates.latitude >= minLat &&
    coordinates.latitude <= maxLat &&
    coordinates.longitude >= minLng &&
    coordinates.longitude <= maxLng;

  return {
    name,
    description,
    address,
    fee,
    ...coordinates,
    coordinateInBounds,
    url,
    source_checked_at: CHECK_DATE,
    source_notes: spec.sourceNote,
    score: scoreCandidate({ name, description }),
  };
}

async function collect() {
  const snapshot = {
    generated_at: new Date().toISOString(),
    source_checked_at: CHECK_DATE,
    prefectures: {},
  };

  for (const spec of Object.values(PREFECTURES)) {
    console.log(`${spec.name}: listing ${spec.pages.length} pages`);
    const pages = await mapLimit(spec.pages, 10, fetchText);
    const listingRows = pages.flatMap((html) => parseListing(html, spec.id));
    const uniqueRows = [
      ...new Map(listingRows.map((row) => [row.url, row])).values(),
    ]
      .map((row) => ({ ...row, score: scoreCandidate(row) }))
      .filter((row) => !CLOSED_OR_TEMPORARY.test(row.name))
      .sort((left, right) => right.score - left.score || left.name.localeCompare(right.name, "ja"));

    const detailTargets = uniqueRows.slice(0, 320);
    console.log(`${spec.name}: detail ${detailTargets.length}/${uniqueRows.length}`);
    const details = await mapLimit(detailTargets, 8, async (row) => {
      const html = await fetchText(row.url);
      return parseDetail(html, row.url, spec);
    });

    const valid = details
      .filter(
        (row) =>
          row.name &&
          row.description.length >= 25 &&
          row.address.startsWith(spec.name) &&
          row.coordinateInBounds &&
          !CLOSED_OR_TEMPORARY.test(`${row.name} ${row.description}`),
      )
      .sort((left, right) => right.score - left.score || left.name.localeCompare(right.name, "ja"));

    snapshot.prefectures[spec.id] = {
      listing_count: uniqueRows.length,
      detail_checked: details.length,
      valid_count: valid.length,
      candidates: valid,
    };
    console.log(`${spec.name}: valid ${valid.length}`);
  }

  await writeFile(SNAPSHOT_PATH, `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");
  console.log(`wrote ${SNAPSHOT_PATH}`);
}

async function summarize() {
  const snapshot = JSON.parse(await readFile(SNAPSHOT_PATH, "utf8"));
  for (const [prefectureId, data] of Object.entries(snapshot.prefectures)) {
    console.log(`\n## ${prefectureId} ${data.valid_count}`);
    data.candidates.slice(0, 180).forEach((row, index) => {
      console.log(
        `${String(index + 1).padStart(3)} ${String(row.score).padStart(3)} ${row.name} | ${row.address}`,
      );
    });
  }
}

function selectRows(snapshot, prefectureId) {
  const data = snapshot.prefectures[prefectureId];
  assert(data, `${prefectureId}: candidate snapshot missing`);
  const eligible = data.candidates
    .filter((row) => SELECT_ALLOW.test(`${row.name} ${row.description}`))
    .filter((row) => !SELECT_EXCLUDE.test(row.name))
    .filter((row) => !MANUAL_EXCLUDES[prefectureId].has(row.name));
  const manualNames = MANUAL_INCLUDES[prefectureId];
  const pinned = [];
  const pinnedNames = new Set();
  for (const row of data.candidates) {
    if (
      !manualNames.has(row.name) ||
      MANUAL_EXCLUDES[prefectureId].has(row.name) ||
      pinnedNames.has(row.name)
    ) continue;
    pinned.push(row);
    pinnedNames.add(row.name);
  }
  assert.deepEqual(pinnedNames, manualNames, `${prefectureId}: a required facility is missing`);
  const rows = [
    ...eligible.filter((row) => !manualNames.has(row.name)).slice(0, 120 - pinned.length),
    ...pinned,
  ];
  assert.equal(rows.length, 120, `${prefectureId}: expected 120 selected rows`);
  return rows;
}

function classifyFacility(row) {
  const name = row.name;
  if (CATEGORY_OVERRIDES[name]) return CATEGORY_OVERRIDES[name];
  if (/芝政|ディノパーク|ワンダーランド|伊勢忍者キングダム|アンパンマン|サーキットパーク|ミラージュランド|遊園地|テーマパーク/.test(name)) return "theme-park";
  if (/動物園|クマ牧場|ふれあい牧場/.test(name)) return "zoo";
  if (/水族館|クラゲ|栽培漁業センター|森の水族館/.test(name)) return "aquarium";
  if (/こどもみらい館|こども家族館|こどもと森|木っずテラス|ごっこぱーく|わくわくドーム|天空パークOSORA|こどもの城|こども館/.test(name)) return "indoor-play";
  if (/科学館|天文科学館|宇宙科学館|プラネタリウム|防災館|エネルギー環境教育|原子力の科学|砂防学習|セーレンプラネット/.test(name)) return "science-museum";
  if (/美術館|芸術の森/.test(name)) return "art-museum";
  if (/博物館|資料館|記念館|ミュージアム|展示館|文化の森|歴史体験館|こども歴史文化館|友学館|大夢来館|自然ふれあい館/.test(name)) return "museum";
  if (/工房|陶芸|藍染|鋳物|組子|和紙|木彫|クラフト|伊勢型紙|かまぼこ|そば|ものづくり|縫製|タフティング|体験館/.test(name)) return "craft";
  if (/農園|果樹園|いちご|ぶどう|ブルーベリー|トマト収穫|味覚狩り/.test(name)) return "fruit-picking";
  if (/スキー|スノーパーク|スノーシュー|IOX-AROSA|ホワイトピア|ウイングヒルズ/.test(name)) return "ski";
  if (/プール|温水|温泉プール/.test(name)) return "hot-spring-pool";
  if (/アスレチック|PANZA|アドベンチャー|スポーツランド|キャニオニング/.test(name)) return "athletic";
  if (/遊具|わんぱく|冒険の森|おとぎの森公園|太閤山ランド|運動公園|インクルーシブ|児童公園|ファミリーランド|クロスランド|公園/.test(name)) return "park";
  if (/展望台|展望公園|ロープウェイ|ゴンドラ|黒部ダム/.test(name)) return "viewpoint";
  if (/体験|カヤック|SUP|ラフティング|釣り|フィッシング|遊覧|水上ライン|トロッコ|列車|電車|エキスプレス|クルーズ|乗馬/.test(name)) return "experience";
  if (/森林|キャンプ|海水浴|海浜|ビーチ|自然学校|青少年自然の家|湖|川|渓谷|滝|海岸|遊歩道/.test(name)) return "nature-park";
  return "scenic";
}

function indoorOutdoor(categoryId, row) {
  const text = `${row.name} ${row.description}`;
  if (/海水浴|キャンプ|スキー|公園|渓谷|滝|海岸|ビーチ|釣り桟橋/.test(text)) return "屋外";
  if (["indoor-play", "science-museum", "museum", "craft", "art-museum", "aquarium", "game-center"].includes(categoryId)) return "屋内";
  if (["theme-park", "zoo", "experience", "hot-spring-pool"].includes(categoryId)) return "両方";
  return "屋外";
}

function recommendedTags(categoryId, row) {
  const text = `${row.name} ${row.description}`;
  const byCategory = {
    "theme-park": ["playground", "vehicle", "experience"],
    zoo: ["animal", "animal_contact", "wide_space"],
    aquarium: ["animal", "exhibition", "experience"],
    park: ["playground", "running", "wide_space"],
    "indoor-play": ["playground", "running", "wide_space"],
    "science-museum": ["science", "exhibition", "experience"],
    museum: ["exhibition", "experience"],
    craft: ["craft", "experience"],
    "fruit-picking": ["experience", "food", "nature"],
    "hot-spring-pool": ["water_play", "pool"],
    athletic: ["athletic", "running", "wide_space"],
    "art-museum": ["exhibition", "craft"],
    ski: ["athletic", "slide", "nature"],
    experience: ["experience", "nature"],
    "nature-park": ["nature", "wide_space", "running"],
    viewpoint: ["nature", "wide_space"],
    scenic: ["nature", "wide_space"],
    "game-center": ["playground", "experience"],
  };
  const tags = [...byCategory[categoryId]];
  if (/恐竜|化石/.test(text)) tags.unshift("dinosaur");
  if (/水遊び|海水浴|川遊び|ビーチ/.test(text)) tags.unshift("water_play");
  if (/鉄道|列車|電車|トロッコ|乗り物/.test(text)) tags.unshift("vehicle");
  return [...new Set(tags)].slice(0, 4);
}

function experienceCopy(categoryId, name) {
  if (categoryId === "science-museum") {
    return [
      `${name}で科学や自然の展示を親子で見て回る`,
      "実験・観察・映像から仕組みを学ぶ",
      "投影や体験の日程を公式案内で確認する",
    ];
  }
  if (["museum", "art-museum"].includes(categoryId)) {
    return [
      `${name}で展示を親子で見て回る`,
      "展示資料から地域の自然・歴史・文化を学ぶ",
      "企画展示や体験日程を公式案内で確認する",
    ];
  }
  if (["craft", "fruit-picking", "experience"].includes(categoryId)) {
    return [
      `${name}で公式案内にある体験へ親子で参加する`,
      "地域ならではの自然・文化・ものづくりにふれる",
      "対象年齢・料金・予約条件を公式案内で確認する",
    ];
  }
  if (["zoo", "aquarium"].includes(categoryId)) {
    return [
      `${name}で動物や生きものを親子で観察する`,
      "展示やふれあい内容から生態を学ぶ",
      "公開時間・利用条件を公式案内で確認する",
    ];
  }
  return [
    `${name}で自然や遊びを親子で楽しむ`,
    "園内や周辺の見どころを歩いて季節の変化を見つける",
    "天候・安全情報・利用条件を公式案内で確認する",
  ];
}

function buildFacility(row, spec, id) {
  const categoryId = classifyFacility(row);
  const category = CATEGORY_NAMES[categoryId];
  assert(category, `${row.name}: category missing`);
  const indoor = indoorOutdoor(categoryId, row);
  const fee = decodeHtml(row.fee || "料金は公式案内を確認").slice(0, 500);
  const sourceText = `${fee} ${row.description}`;
  const free =
    /^(無料|入場無料|見学無料|観覧無料)/.test(fee) &&
    !/[0-9０-９][,，]?[0-9０-９]*円|有料|一部/.test(fee);
  const officialDescription = decodeHtml(row.description).replace(/\s+/g, " ").trim();
  const description = `${row.name}は、${officialDescription}。公式掲載の見どころや体験内容を親子で確かめ、対象年齢・料金・営業時間も公式案内で確認してください。`;
  const experiences = experienceCopy(categoryId, row.name);
  const waterPlay = /海水浴|プール|川遊び|水遊び|ビーチ|海浜/.test(sourceText) ? "◎" : "×";
  return {
    id,
    slug: `facility-${id}`,
    name: row.name,
    prefecture: spec.name,
    prefecture_id: spec.id,
    category,
    category_id: categoryId,
    address: normalizeAddress(decodeHtml(row.address), spec.name),
    indoor_outdoor: indoor,
    rain_friendly: indoor === "屋内" ? "◎" : indoor === "両方" ? "△" : "×",
    is_free: free,
    fee_type: free ? "無料" : "有料",
    adult_fee: free ? "無料" : fee,
    child_fee: free ? "無料" : fee,
    description,
    target_age:
      /幼児|小学生|子ども|子供|こども|キッズ|ファミリー|家族/.test(sourceText) ||
      ["theme-park", "park", "indoor-play"].includes(categoryId)
        ? "幼児〜小学生"
        : "全年齢",
    url: row.url,
    tags: [indoor === "屋内" ? "完全屋内" : indoor === "両方" ? "屋内外両方" : "屋外"],
    latitude: row.latitude,
    longitude: row.longitude,
    geocode_source: "manual",
    image: null,
    image_attribution: null,
    image_source: null,
    signature_experiences: experiences,
    unique_selling_point: officialDescription.slice(0, 500),
    experience_tags: experiences,
    summer_water_play: waterPlay,
    recommended_for_tags: recommendedTags(categoryId, row),
    things_to_do: experiences,
    source_urls: row.url,
    source_checked_at: CHECK_DATE,
    data_quality_status: "confirmed",
    source_notes: row.source_notes,
  };
}

function assertNoDuplicates(facilities) {
  const checks = [
    ["id", (row) => String(row.id)],
    ["slug", (row) => row.slug],
    ["name/address", (row) => `${normalize(row.name)}|${normalize(row.address)}`],
  ];
  for (const [label, key] of checks) {
    const seen = new Set();
    for (const facility of facilities) {
      const value = key(facility);
      assert(!seen.has(value), `${label} duplicate: ${value}`);
      seen.add(value);
    }
  }
}

async function applySelected(prefectureIds, replaceExisting = false) {
  const snapshot = JSON.parse(await readFile(SNAPSHOT_PATH, "utf8"));
  const facilitiesPath = resolve(ROOT, "data", "facilities_data.json");
  const registryPath = resolve(ROOT, ".codex", "events-source-registry.json");
  const data = JSON.parse(await readFile(facilitiesPath, "utf8"));
  const registry = JSON.parse(await readFile(registryPath, "utf8"));
  if (replaceExisting) {
    for (const prefectureId of prefectureIds) {
      const removedRegistryCount = registry.facilities.filter((row) => row.prefecture === prefectureId).length;
      data.facilities = data.facilities.filter((facility) => facility.prefecture_id !== prefectureId);
      data.metadata.prefectures = data.metadata.prefectures.filter((prefecture) => prefecture.id !== prefectureId);
      registry.facilities = registry.facilities.filter((row) => row.prefecture !== prefectureId);
      registry.meta.prefectures = registry.meta.prefectures.filter((id) => id !== prefectureId);
      delete registry.meta.per_prefecture_count[prefectureId];
      registry.meta.tier_count.seasonal -= removedRegistryCount;
    }
  }
  const seenOfficialUrls = new Set(
    data.facilities.map((facility) => facility.url).filter(Boolean),
  );

  for (const prefectureId of prefectureIds) {
    const spec = PREFECTURES[prefectureId];
    assert(spec, `unknown prefecture: ${prefectureId}`);
    assert(
      !data.facilities.some((facility) => facility.prefecture_id === prefectureId),
      `${prefectureId}: already present`,
    );
    const selected = selectRows(snapshot, prefectureId);
    const facilities = selected.map((row, index) =>
      buildFacility(row, spec, ID_STARTS[prefectureId] + index),
    );
    for (const facility of facilities) {
      assert(!seenOfficialUrls.has(facility.url), `${facility.name}: official URL duplicate`);
      seenOfficialUrls.add(facility.url);
    }
    data.facilities.push(...facilities);
    data.metadata.prefectures.push({ id: prefectureId, name: spec.name, count: facilities.length });
    registry.facilities.push(
      ...facilities.map((facility) => ({
        facility_id: facility.id,
        name: facility.name,
        prefecture: prefectureId,
        event_source_type: "official_seasonal_page",
        patrol_tier: "seasonal",
        official_event_url: facility.url,
        official_event_url_secondary: null,
        last_checked_at: CHECK_DATE,
        note: `全国30都府県拡張L2 Wave。${spec.sourceNote}通常営業・常設展示はイベント化せず、公式の特別企画だけを採用。`,
      })),
    );
    registry.meta.prefectures.push(prefectureId);
    registry.meta.per_prefecture_count[prefectureId] = facilities.length;
    registry.meta.tier_count.seasonal += facilities.length;
  }

  data.metadata.total_facilities = data.facilities.length;
  data.metadata.site_description = `全国${data.metadata.prefectures.length}都府県の子供向け遊び場検索サイト`;
  for (const category of data.metadata.categories) {
    category.count = data.facilities.filter((facility) => facility.category_id === category.id).length;
  }
  registry.meta.total = registry.facilities.length;
  assertNoDuplicates(data.facilities);

  await writeFile(facilitiesPath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
  await writeFile(registryPath, `${JSON.stringify(registry, null, 2)}\n`, "utf8");
  console.log(
    JSON.stringify({
      applied: prefectureIds,
      totalFacilities: data.facilities.length,
      maxId: Math.max(...data.facilities.map((facility) => facility.id)),
      registryTotal: registry.facilities.length,
    }),
  );
}

function isExteriorBackground(red, green, blue) {
  return Math.min(red, green, blue) >= 232 && Math.max(red, green, blue) - Math.min(red, green, blue) <= 14;
}

async function convertPrefectureIcon(prefectureId) {
  assert(PREFECTURES[prefectureId], `unknown prefecture: ${prefectureId}`);
  const sourcePath = resolve(ROOT, ".codex", "prefecture_aicon", `${prefectureId}.png`);
  const outputPath = resolve(ROOT, "public", "images", "prefectures", `${prefectureId}.webp`);
  const { data, info } = await sharp(sourcePath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const pixelCount = info.width * info.height;
  const exterior = new Uint8Array(pixelCount);
  const queue = new Int32Array(pixelCount);
  let head = 0;
  let tail = 0;

  const enqueue = (index) => {
    if (exterior[index]) return;
    const offset = index * 4;
    if (!isExteriorBackground(data[offset], data[offset + 1], data[offset + 2])) return;
    exterior[index] = 1;
    queue[tail] = index;
    tail += 1;
  };

  for (let x = 0; x < info.width; x += 1) {
    enqueue(x);
    enqueue((info.height - 1) * info.width + x);
  }
  for (let y = 0; y < info.height; y += 1) {
    enqueue(y * info.width);
    enqueue(y * info.width + info.width - 1);
  }
  while (head < tail) {
    const index = queue[head];
    head += 1;
    const x = index % info.width;
    const y = Math.floor(index / info.width);
    if (x > 0) enqueue(index - 1);
    if (x + 1 < info.width) enqueue(index + 1);
    if (y > 0) enqueue(index - info.width);
    if (y + 1 < info.height) enqueue(index + info.width);
  }

  const alpha = Buffer.alloc(pixelCount, 255);
  for (let index = 0; index < pixelCount; index += 1) {
    if (exterior[index]) alpha[index] = 0;
  }
  const { data: softenedAlpha, info: alphaInfo } = await sharp(alpha, {
    raw: { width: info.width, height: info.height, channels: 1 },
  })
    .blur(0.6)
    .raw()
    .toBuffer({ resolveWithObject: true });
  for (let index = 0; index < pixelCount; index += 1) {
    data[index * 4 + 3] = softenedAlpha[index * alphaInfo.channels];
  }

  await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } })
    .resize(256, 256, { fit: "contain" })
    .webp({ quality: 90, alphaQuality: 100 })
    .toFile(outputPath);
  return { prefectureId, source: `${info.width}x${info.height}`, exteriorPixels: tail };
}

async function convertPrefectureIcons(prefectureIds) {
  const results = [];
  for (const prefectureId of prefectureIds) results.push(await convertPrefectureIcon(prefectureId));
  console.log(JSON.stringify({ convertedIcons: results }));
}

const command = process.argv[2] ?? "collect";
if (command === "collect") await collect();
else if (command === "summarize") await summarize();
else if (command === "apply") await applySelected(process.argv.slice(3));
else if (command === "replace") await applySelected(process.argv.slice(3), true);
else if (command === "icons") await convertPrefectureIcons(process.argv.slice(3));
else throw new Error(`unknown command: ${command}`);
