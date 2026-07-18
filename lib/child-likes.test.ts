import assert from "node:assert/strict";
import test from "node:test";

const childLikesModulePath = "./child-likes.ts";
const { buildChildLikeCategoryBreakdown, buildChildLikeRanking } =
  await import(childLikesModulePath);

test("1位同率を同じ順序・同じ順位で扱う", () => {
  const categories = [
    { category: "水族館", count: 3 },
    { category: "動物園", count: 3 },
    { category: "科学館", count: 1 },
  ];

  assert.deepEqual(buildChildLikeCategoryBreakdown(categories), [
    { category: "水族館", count: 3 },
    { category: "動物園", count: 3 },
    { category: "科学館", count: 1 },
  ]);
  assert.deepEqual(buildChildLikeRanking(categories), [
    { category: "水族館", count: 3, rank: 1 },
    { category: "動物園", count: 3, rank: 1 },
    { category: "科学館", count: 1, rank: 3 },
  ]);
});

test("5位境界の同率グループを芽・ランキングとも分割しない", () => {
  const categories = [
    { category: "博物館", count: 4 },
    { category: "科学館", count: 3 },
    { category: "水族館", count: 2 },
    { category: "動物園", count: 2 },
    { category: "屋内遊び場", count: 1 },
    { category: "遊園地・テーマパーク", count: 1 },
  ];
  const expected = [
    { category: "博物館", count: 4 },
    { category: "科学館", count: 3 },
    { category: "水族館", count: 2 },
    { category: "動物園", count: 2 },
  ];

  assert.deepEqual(buildChildLikeCategoryBreakdown(categories), expected);
  assert.deepEqual(
    buildChildLikeRanking(categories).map(
      ({ category, count }: { category: string; count: number }) => ({
        category,
        count,
      }),
    ),
    expected,
  );
});

test("その他は順位に入れず芽の内訳の末尾に置く", () => {
  const categories = [
    { category: "その他", count: 8 },
    { category: "公園・自然", count: 3 },
    { category: "博物館", count: 2 },
  ];

  assert.deepEqual(buildChildLikeCategoryBreakdown(categories), [
    { category: "公園・自然", count: 3 },
    { category: "博物館", count: 2 },
    { category: "その他", count: 8 },
  ]);
  assert.deepEqual(buildChildLikeRanking(categories), [
    { category: "公園・自然", count: 3, rank: 1 },
    { category: "博物館", count: 2, rank: 2 },
    { category: "その他", count: 8 },
  ]);
});

test("実カテゴリ5件とその他を芽・ランキングで5枠外の末尾に表示する", () => {
  const categories = [
    { category: "その他", count: 7 },
    { category: "博物館", count: 6 },
    { category: "科学館", count: 5 },
    { category: "水族館", count: 4 },
    { category: "動物園", count: 3 },
    { category: "公園・自然", count: 2 },
    { category: "屋内遊び場", count: 1 },
  ];

  assert.deepEqual(buildChildLikeCategoryBreakdown(categories), [
    { category: "博物館", count: 6 },
    { category: "科学館", count: 5 },
    { category: "水族館", count: 4 },
    { category: "動物園", count: 3 },
    { category: "公園・自然", count: 2 },
    { category: "その他", count: 7 },
  ]);
  assert.deepEqual(buildChildLikeRanking(categories), [
    { category: "博物館", count: 6, rank: 1 },
    { category: "科学館", count: 5, rank: 2 },
    { category: "水族館", count: 4, rank: 3 },
    { category: "動物園", count: 3, rank: 4 },
    { category: "公園・自然", count: 2, rank: 5 },
    { category: "その他", count: 7 },
  ]);
});

test("1位同率6件とその他を芽・ランキングで全件表示する", () => {
  const categories = [
    { category: "その他", count: 9 },
    { category: "博物館", count: 2 },
    { category: "水族館", count: 2 },
    { category: "動物園", count: 2 },
    { category: "科学館", count: 2 },
    { category: "屋内遊び場", count: 2 },
    { category: "遊園地・テーマパーク", count: 2 },
    { category: "公園・自然", count: 1 },
  ];
  const breakdown = buildChildLikeCategoryBreakdown(categories);
  const ranking = buildChildLikeRanking(categories);

  assert.equal(breakdown.length, 7);
  assert.deepEqual(breakdown.at(-1), { category: "その他", count: 9 });
  assert.deepEqual(ranking, [
    { category: "屋内遊び場", count: 2, rank: 1 },
    { category: "科学館", count: 2, rank: 1 },
    { category: "水族館", count: 2, rank: 1 },
    { category: "動物園", count: 2, rank: 1 },
    { category: "博物館", count: 2, rank: 1 },
    { category: "遊園地・テーマパーク", count: 2, rank: 1 },
    { category: "その他", count: 9 },
  ]);
});

test("その他しかない場合は芽・ランキングの表示対象を空にする", () => {
  const categories = [{ category: "その他", count: 12 }];

  assert.deepEqual(buildChildLikeCategoryBreakdown(categories), []);
  assert.deepEqual(buildChildLikeRanking(categories), []);
});

test("芽とランキングでその他の末尾補助表示を一致させる", () => {
  const categories = [
    { category: "その他", count: 4 },
    { category: "水族館", count: 3 },
    { category: "動物園", count: 2 },
  ];
  const breakdown = buildChildLikeCategoryBreakdown(categories);
  const ranking = buildChildLikeRanking(categories);

  assert.deepEqual(
    ranking.map(({ category, count }: { category: string; count: number }) => ({
      category,
      count,
    })),
    breakdown,
  );
  assert.deepEqual(ranking.at(-1), { category: "その他", count: 4 });
  assert.equal("rank" in ranking.at(-1), false);
});

test("好きの芽の7件ケースで5カテゴリ同率グループを丸ごと除外する", () => {
  const categories = [
    { category: "公園(大型遊具)", count: 2 },
    { category: "博物館", count: 1 },
    { category: "水族館", count: 1 },
    { category: "動物園", count: 1 },
    { category: "科学館", count: 1 },
    { category: "屋内遊び場", count: 1 },
  ];

  assert.deepEqual(buildChildLikeCategoryBreakdown(categories), [
    { category: "公園(大型遊具)", count: 2 },
  ]);
});

test("ランキング段階で最上位グループ単体が5件超なら全件を表示する", () => {
  const categories = [
    { category: "博物館", count: 2 },
    { category: "水族館", count: 2 },
    { category: "動物園", count: 2 },
    { category: "科学館", count: 2 },
    { category: "屋内遊び場", count: 2 },
    { category: "遊園地・テーマパーク", count: 2 },
    { category: "公園・自然", count: 1 },
  ];

  assert.deepEqual(buildChildLikeRanking(categories), [
    { category: "屋内遊び場", count: 2, rank: 1 },
    { category: "科学館", count: 2, rank: 1 },
    { category: "水族館", count: 2, rank: 1 },
    { category: "動物園", count: 2, rank: 1 },
    { category: "博物館", count: 2, rank: 1 },
    { category: "遊園地・テーマパーク", count: 2, rank: 1 },
  ]);
});
