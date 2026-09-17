import { categories, prefectures } from "@/lib/facilities";
import type { FilterParams } from "@/lib/filter";

/**
 * 「話して探す／文章で探す」用の決定的(ルールベース)自然文パーサー。
 *
 * 目的: 自然文(音声入力の書き起こしを含む)を、既存の施設検索フィルタ軸
 * (lib/filter.ts の FilterParams)へ写像する。LLM API・vector DB・外部ネット
 * ワーク呼び出しは一切使わない(Owner 2026-09-17 明示)。
 *
 * 出力は Partial<FilterParams> ではなく常に全フィールドを埋めた値を返す
 * (buildQueryString にそのまま渡せる形)。sort は呼び出し側の既定値に委ねる
 * ため含めない。
 */
export type NaturalLanguageQueryResult = Pick<
  FilterParams,
  "prefectures" | "categories" | "indoor" | "rain" | "fee" | "tags" | "q"
>;

const RAIN_KEYWORDS = ["雨", "雨天", "梅雨", "台風"];
const FEE_FREE_KEYWORDS = [
  "無料",
  "タダ",
  "ただ",
  "お金をかけずに",
  "お金かけずに",
  "0円",
  "０円",
];
const INFANT_KEYWORDS = ["赤ちゃん", "乳児", "ベビー"];
const ELEMENTARY_KEYWORDS = ["小学生"];
const INDOOR_KEYWORDS: Record<string, string> = { 屋内: "屋内", 屋外: "屋外" };

// 「〜の近く」「〜付近」「〜周辺」「〜あたり」のような地名+近接表現から、
// 地名トークンだけを取り出す。都道府県名に一致しない地名(例: 豊洲)は
// prefectures ではなく q(住所部分一致)へ渡すためのヒントとして使う。
const NEARBY_PATTERN = /([^\s、。・,\d][^\s、。・,]{0,9}?)(?:の?近く|付近|周辺|あたり)/;

// 都道府県名の末尾(都/道/府/県)を除いた短縮形でも一致させる。
function prefectureAliases(name: string): string[] {
  const short = name.replace(/[都道府県]$/, "");
  return short && short !== name ? [name, short] : [name];
}

// 年齢の数値表現(「3歳」「3才」「満3歳」等)を拾い、既存の構造化タグへ写像する。
// components/ChildAgeQuickFilter.tsx の ageToTag() と同じ区分(0-3 / 6-12)のみ
// 対応する。4〜5歳のような対応外の年齢は誤ったタグを付けないため無視する。
function ageToFacilityTag(age: number): string | null {
  if (age >= 0 && age <= 3) return "0-3歳OK";
  if (age >= 6 && age <= 12) return "小学生向け";
  return null;
}

function stripMatched(input: string, needle: string): string {
  return needle ? input.split(needle).join(" ") : input;
}

export function parseNaturalLanguageQuery(
  rawInput: string,
): NaturalLanguageQueryResult {
  const original = rawInput.trim();
  let working = original;

  const result: NaturalLanguageQueryResult = {
    prefectures: [],
    categories: [],
    indoor: [],
    rain: [],
    fee: "",
    tags: [],
    q: "",
  };

  // 1. 都道府県(フルネーム優先。誤マッチを避けるため長い名称から試す)
  const prefectureCandidates = prefectures
    .flatMap((p) => prefectureAliases(p.name).map((alias) => ({ id: p.id, alias })))
    .sort((a, b) => b.alias.length - a.alias.length);
  for (const candidate of prefectureCandidates) {
    if (candidate.alias.length < 2) continue; // 1文字の短縮形(例: 京)は誤検知が多いため除外
    if (working.includes(candidate.alias) && !result.prefectures.includes(candidate.id)) {
      result.prefectures.push(candidate.id);
      working = stripMatched(working, candidate.alias);
    }
  }

  // 2. カテゴリ(施設カテゴリ名の部分一致)
  const categoryCandidates = [...categories].sort(
    (a, b) => b.name.length - a.name.length,
  );
  for (const category of categoryCandidates) {
    if (category.name.length < 2) continue;
    if (working.includes(category.name) && !result.categories.includes(category.id)) {
      result.categories.push(category.id);
      working = stripMatched(working, category.name);
    }
  }

  // 3. 雨(既存の統一方針: 「雨でも遊べるか」の正本は rain_friendly=◎)
  for (const keyword of RAIN_KEYWORDS) {
    if (working.includes(keyword)) {
      if (!result.rain.includes("◎")) result.rain.push("◎");
      working = stripMatched(working, keyword);
    }
  }

  // 4. 料金(無料)
  for (const keyword of FEE_FREE_KEYWORDS) {
    if (working.includes(keyword)) {
      result.fee = "free";
      working = stripMatched(working, keyword);
    }
  }

  // 4-2. 屋内/屋外
  for (const [keyword, value] of Object.entries(INDOOR_KEYWORDS)) {
    if (working.includes(keyword)) {
      if (!result.indoor.includes(value)) result.indoor.push(value);
      working = stripMatched(working, keyword);
    }
  }

  // 5. 年齢 — 数値表現("3歳" "3才" "満3歳" 等)
  const ageMatches = working.matchAll(/(?:満\s*)?(\d{1,2})\s*[歳才]/g);
  for (const match of ageMatches) {
    const age = Number.parseInt(match[1], 10);
    const tag = Number.isFinite(age) ? ageToFacilityTag(age) : null;
    if (tag && !result.tags.includes(tag)) result.tags.push(tag);
    working = stripMatched(working, match[0]);
  }
  // 年齢 — 定性表現
  for (const keyword of INFANT_KEYWORDS) {
    if (working.includes(keyword)) {
      if (!result.tags.includes("0-3歳OK")) result.tags.push("0-3歳OK");
      working = stripMatched(working, keyword);
    }
  }
  for (const keyword of ELEMENTARY_KEYWORDS) {
    if (working.includes(keyword)) {
      if (!result.tags.includes("小学生向け")) result.tags.push("小学生向け");
      working = stripMatched(working, keyword);
    }
  }

  // 6. 地名ヒント(「〜の近く」等) — マッチすればフリーテキストの最有力候補として確定させる
  const nearbyMatch = original.match(NEARBY_PATTERN);
  const nearbyToken = nearbyMatch?.[1]?.trim();
  if (nearbyMatch && nearbyToken) {
    result.q = nearbyToken;
    working = stripMatched(working, nearbyMatch[0]);
  }

  // 7. それでも q が空なら、残った文字列から意味のありそうな最初のトークンを拾う
  //    (助詞・一般的なフィラーは除外。何も残らなければ q は空のまま = 無条件検索)
  //    ただし他の軸(都道府県・カテゴリ・雨・屋内外・料金・年齢)が1つでも既に取れている場合は
  //    フォールバックしない。取れた軸に加えて不確かな残差を q(完全一致に近い部分一致)に積むと、
  //    住所等に文字通り含まれず該当0件になり、正しく絞り込めていた結果まで消してしまうため。
  const hasStructuredMatch =
    result.prefectures.length > 0 ||
    result.categories.length > 0 ||
    result.indoor.length > 0 ||
    result.rain.length > 0 ||
    result.fee !== "" ||
    result.tags.length > 0;
  if (!result.q && !hasStructuredMatch) {
    const STOPWORDS = new Set([
      "今日", "きょう", "明日", "あした", "この", "その", "あの",
      "ここ", "そこ", "あそこ", "近く", "近い", "付近", "周辺", "あたり",
      "ところ", "場所", "施設", "こと", "もの", "感じ", "遊べる", "遊べて",
      "行ける", "行けて", "楽しめる", "楽しめて", "おすすめ", "オススメ",
      "でも", "です", "ます", "だから", "という", "といった",
    ]);
    const tokens = working
      .split(/[\s、。・,]+|の|でも|には|とか/)
      .map((t) => t.trim())
      .filter((t) => t.length >= 2 && !STOPWORDS.has(t));
    if (tokens.length > 0) {
      result.q = tokens.sort((a, b) => b.length - a.length)[0];
    }
  }

  return result;
}
