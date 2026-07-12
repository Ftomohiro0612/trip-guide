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

function selectChildLikeCategoryGroups(
  categories: readonly ChildLikeCategory[],
  limit: number,
): ChildLikeCategory[] {
  if (!Number.isInteger(limit) || limit <= 0) return [];

  const sorted = [...categories].sort(compareChildLikeCategories);
  const selected: ChildLikeCategory[] = [];
  for (let index = 0; index < sorted.length; ) {
    const first = sorted[index];
    const group: ChildLikeCategory[] = [first];
    index += 1;

    // 「その他」は順位・同率グループに含めず、常に単独で末尾に置く。
    if (first.category !== "その他") {
      while (
        index < sorted.length &&
        sorted[index].category !== "その他" &&
        sorted[index].count === first.count
      ) {
        group.push(sorted[index]);
        index += 1;
      }
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

export function buildChildLikeCategoryBreakdown(
  categories: readonly ChildLikeCategory[],
  limit = 5,
): ChildLikeCategory[] {
  return selectChildLikeCategoryGroups(categories, limit);
}

export function buildChildLikeRanking(
  categories: readonly ChildLikeCategory[],
  limit = 5,
): RankedChildLikeCategory[] {
  const selected = selectChildLikeCategoryGroups(
    categories.filter(({ category }) => category !== "その他"),
    limit,
  );

  let previousCount: number | null = null;
  let previousRank = 0;
  return selected.map((category, index) => {
    const rank = category.count === previousCount ? previousRank : index + 1;
    previousCount = category.count;
    previousRank = rank;
    return { ...category, rank };
  });
}
