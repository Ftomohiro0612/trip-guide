/**
 * 施設名の表記ゆれ(全角/半角、スペース・記号、ひらがな/カタカナ)を吸収する
 * ための正規化と、近似一致(スペルミス・軽微な表記差)の判定ユーティリティ。
 *
 * 「むさしの村」で検索できるのに「武蔵の村」では外れる、といった表記ゆれ
 * (Owner報告 2026-09-17)への対応。辞書・形態素解析・外部APIは使わず、
 * 決定的な文字変換のみで行う。
 */

const KATAKANA_START = 0x30a1;
const KATAKANA_END = 0x30f6;
const HIRAGANA_OFFSET = 0x60;

function katakanaToHiragana(text: string): string {
  let out = "";
  for (const ch of text) {
    const code = ch.codePointAt(0) ?? 0;
    if (code >= KATAKANA_START && code <= KATAKANA_END) {
      out += String.fromCodePoint(code - HIRAGANA_OFFSET);
    } else {
      out += ch;
    }
  }
  return out;
}

/**
 * 検索比較用に文字列を正規化する。全角/半角統一(NFKC)・大文字小文字統一・
 * カタカナ→ひらがな統一・区切り記号(スペース、中点、ハイフン、長音記号等)
 * の除去を行う。この関数を検索対象文字列とクエリの両方に必ず通すこと。
 */
export function normalizeForSearchMatch(text: string): string {
  return katakanaToHiragana(
    text.normalize("NFKC").toLocaleLowerCase("ja-JP"),
  ).replace(/[\s　・･,、。.\-ー_/／]/g, "");
}

/**
 * 施設名+別名(search_aliases)から、正規化済みの比較対象文字列一覧を作る。
 * name/search_aliases 以外(住所・説明文等)は含めない
 * (Owner指示: 曖昧一致の対象を施設名・別名に限定し、無関係施設の混入を防ぐ)。
 */
export function buildNormalizedNameVariants(
  name: string,
  aliases: string[] | undefined,
): string[] {
  return [name, ...(aliases ?? [])].map(normalizeForSearchMatch);
}

function levenshteinDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i += 1) {
    const current = [i];
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      current.push(
        Math.min(
          prev[j] + 1,
          current[j - 1] + 1,
          prev[j - 1] + cost,
        ),
      );
    }
    prev = current;
  }
  return prev[b.length];
}

/**
 * 「もしかして」候補として提示してよい近さかどうかを、正規化後の文字列同士の
 * 編集距離で判定する。閾値は短い語ほど厳しくし、無関係な施設が紛れ込むのを防ぐ。
 */
export function isCloseNameMatch(
  normalizedQuery: string,
  normalizedCandidate: string,
): boolean {
  if (!normalizedQuery || !normalizedCandidate) return false;
  if (normalizedCandidate.includes(normalizedQuery)) return false; // 通常一致は別経路で処理済み
  const lengthDiff = Math.abs(
    normalizedQuery.length - normalizedCandidate.length,
  );
  const threshold = normalizedQuery.length <= 5 ? 1 : 2;
  if (lengthDiff > threshold + 2) return false; // 明らかに長さが違う候補は先に除外(性能・誤検知対策)
  return levenshteinDistance(normalizedQuery, normalizedCandidate) <= threshold;
}

export interface FacilityNameSuggestionCandidate {
  slug: string;
  name: string;
  search_aliases?: string[];
}

/**
 * 通常一致(部分一致+別名)が0件のときだけ呼び出す「もしかして」候補探索。
 * 施設名・別名のみを対象にし(住所・説明文は含めない)、近似一致するものを
 * 距離の近い順に最大 limit 件返す。0件時のフォールバック専用のため、
 * 呼び出し側は必ず通常検索が0件だったことを確認してから使うこと。
 */
export function findFacilityNameSuggestions<
  T extends FacilityNameSuggestionCandidate,
>(query: string, facilities: T[], limit = 3): T[] {
  const normalizedQuery = normalizeForSearchMatch(query);
  if (!normalizedQuery) return [];

  const scored: { facility: T; distance: number }[] = [];
  for (const facility of facilities) {
    const variants = buildNormalizedNameVariants(
      facility.name,
      facility.search_aliases,
    );
    let bestDistance = Infinity;
    for (const variant of variants) {
      if (!isCloseNameMatch(normalizedQuery, variant)) continue;
      const distance = levenshteinDistance(normalizedQuery, variant);
      if (distance < bestDistance) bestDistance = distance;
    }
    if (Number.isFinite(bestDistance)) {
      scored.push({ facility, distance: bestDistance });
    }
  }

  return scored
    .sort((a, b) => a.distance - b.distance)
    .slice(0, limit)
    .map((entry) => entry.facility);
}
