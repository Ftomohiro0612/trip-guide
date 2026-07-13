export type ChildLikeCategory = {
  category: string;
  count: number;
};

export type RankedChildLikeCategory = ChildLikeCategory & {
  rank: number;
};

type OtherChildLikeCategory = { category: "その他"; count: number };

export type ChildLikeRankingEntry =
  | RankedChildLikeCategory
  | OtherChildLikeCategory;

// 「好き」の集計表示だけで使う、実体確認済みの表記ゆれ対応表。
// 対応表に無い値は推測でまとめず、そのまま返す。
const CHILD_LIKE_CATEGORY_ALIASES: Readonly<Record<string, string>> = {
  "美術館・体験": "美術館",
  美術館: "美術館",
  体験: "体験",
  体験施設: "体験",
  "自然・絶景": "自然・絶景",
  "絶景・自然景観": "自然・絶景",
  "公園・自然": "公園・自然",
  自然公園: "公園・自然",
  展望台: "展望台",
  展望スポット: "展望台",
};

export function normalizeChildLikeCategory(category: string): string {
  return CHILD_LIKE_CATEGORY_ALIASES[category] ?? category;
}

export function compareChildLikeCategories(
  a: ChildLikeCategory,
  b: ChildLikeCategory,
): number {
  const aOther = a.category === "その他";
  const bOther = b.category === "その他";
  if (aOther !== bOther) return aOther ? 1 : -1;
  return b.count - a.count || a.category.localeCompare(b.category, "ja");
}

export function hasMeaningfulChildLikes(
  categories: readonly ChildLikeCategory[],
): boolean {
  return categories.some(
    ({ category, count }) => category !== "その他" && count >= 2,
  );
}

function selectChildLikeCategoryGroups(
  categories: readonly ChildLikeCategory[],
  limit: number,
): ChildLikeCategory[] {
  if (!Number.isInteger(limit) || limit <= 0) return [];

  // 「その他」は順位・同率計算にも表示上限にも含めない。
  const sorted = categories
    .filter(({ category }) => category !== "その他")
    .sort(compareChildLikeCategories);
  const selected: ChildLikeCategory[] = [];
  for (let index = 0; index < sorted.length; ) {
    const first = sorted[index];
    const group: ChildLikeCategory[] = [first];
    index += 1;

    while (index < sorted.length && sorted[index].count === first.count) {
      group.push(sorted[index]);
      index += 1;
    }

    if (selected.length === 0 && group.length > limit) {
      selected.push(...group);
      break;
    }
    if (selected.length + group.length > limit) break;
    selected.push(...group);
  }

  return selected;
}

function otherSupplement(
  categories: readonly ChildLikeCategory[],
  hasDisplayedCategory: boolean,
): OtherChildLikeCategory | null {
  if (!hasDisplayedCategory) return null;
  const count = categories.reduce(
    (total, category) =>
      category.category === "その他" ? total + category.count : total,
    0,
  );
  return count > 0 ? { category: "その他", count } : null;
}

export function buildChildLikeCategoryBreakdown(
  categories: readonly ChildLikeCategory[],
  limit = 5,
): ChildLikeCategory[] {
  const selected = selectChildLikeCategoryGroups(categories, limit);
  const other = otherSupplement(categories, selected.length > 0);
  return other ? [...selected, other] : selected;
}

export function buildChildLikeRanking(
  categories: readonly ChildLikeCategory[],
  limit = 5,
): ChildLikeRankingEntry[] {
  const selected = selectChildLikeCategoryGroups(categories, limit);

  let previousCount: number | null = null;
  let previousRank = 0;
  const ranked = selected.map((category, index) => {
    const rank = category.count === previousCount ? previousRank : index + 1;
    previousCount = category.count;
    previousRank = rank;
    return { ...category, rank };
  });
  const other = otherSupplement(categories, ranked.length > 0);
  return other ? [...ranked, other] : ranked;
}
