export type ChildLikeCategory = {
  category: string;
  count: number;
};

export type RankedChildLikeCategory = ChildLikeCategory & {
  rank: number;
};

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

export function buildChildLikeRanking(
  categories: readonly ChildLikeCategory[],
  limit = 5,
): RankedChildLikeCategory[] {
  if (!Number.isInteger(limit) || limit <= 0) return [];

  const sorted = [...categories]
    .filter(({ category }) => category !== "その他")
    .sort(compareChildLikeCategories);
  if (sorted.length === 0) return [];

  const selected: ChildLikeCategory[] = [];
  for (let index = 0; index < sorted.length; ) {
    const count = sorted[index].count;
    const group: ChildLikeCategory[] = [];
    while (index < sorted.length && sorted[index].count === count) {
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

  let previousCount: number | null = null;
  let previousRank = 0;
  return selected.map((category, index) => {
    const rank = category.count === previousCount ? previousRank : index + 1;
    previousCount = category.count;
    previousRank = rank;
    return { ...category, rank };
  });
}
