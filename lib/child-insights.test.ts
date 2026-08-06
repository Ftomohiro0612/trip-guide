import assert from "node:assert/strict";
import test from "node:test";

const childInsightsModulePath = "./child-insights.ts";
const mypageStatsModulePath = "./mypage-stats.ts";
const { buildFrequentInterestTagsByChild, filterChildLikeVisits } =
  await import(childInsightsModulePath);
const { buildChildStats } = await import(mypageStatsModulePath);

function tag(
  id: string,
  label: string,
  sortOrder: number,
  tagType = "interest",
) {
  return {
    tag_id: id,
    reaction_tags: {
      id,
      label,
      tag_type: tagType,
      sort_order: sortOrder,
    },
  };
}

const siblingFixture = [
  {
    child_id: "sora",
    visit_id: "shared-1",
    satisfaction: "loved",
    visit_child_tags: [tag("animal", "動物を見る", 10)],
  },
  {
    child_id: "umi",
    visit_id: "shared-1",
    satisfaction: "enjoyed",
    visit_child_tags: [tag("vehicle", "乗り物", 20)],
  },
  {
    child_id: "sora",
    visit_id: "shared-2",
    satisfaction: "enjoyed",
    visit_child_tags: [tag("animal", "動物を見る", 10)],
  },
  {
    child_id: "umi",
    visit_id: "shared-2",
    satisfaction: "neutral",
    visit_child_tags: [tag("vehicle", "乗り物", 20)],
  },
  {
    child_id: "sora",
    visit_id: "shared-3",
    satisfaction: "neutral",
    visit_child_tags: [],
  },
  {
    child_id: "umi",
    visit_id: "shared-3",
    satisfaction: "loved",
    visit_child_tags: [],
  },
];

test("not_fit 3件だけの子はフィルタ前sprout・フィルタ後noneになる", () => {
  const visits = ["1", "2", "3"].map((visitId) => ({
    child_id: "not-fit-only",
    visit_id: visitId,
    satisfaction: "not_fit",
    visit_child_tags: [],
  }));

  assert.deepEqual(buildChildStats(["not-fit-only"], visits)[0], {
    childId: "not-fit-only",
    visitCount: 3,
    stage: "sprout",
  });
  assert.deepEqual(
    buildChildStats(["not-fit-only"], filterChildLikeVisits(visits))[0],
    {
      childId: "not-fit-only",
      visitCount: 0,
      stage: "none",
    },
  );
});

test("4件中not_fit 1件を除外すると「好き」の件数は4件から3件になる", () => {
  const visits = ["loved", "enjoyed", "neutral", "not_fit"].map(
    (satisfaction, index) => ({
      child_id: "sora",
      visit_id: String(index + 1),
      satisfaction,
      visit_child_tags: [],
    }),
  );

  assert.equal(buildChildStats(["sora"], visits)[0].visitCount, 4);
  assert.equal(
    buildChildStats(["sora"], filterChildLikeVisits(visits))[0].visitCount,
    3,
  );
});

test("同一visitの兄弟でも2回以上選んだinterestタグが子ども別になる", () => {
  const result = buildFrequentInterestTagsByChild(siblingFixture);

  assert.deepEqual(result.get("sora"), [
    { id: "animal", label: "動物を見る", count: 2, sortOrder: 10 },
  ]);
  assert.deepEqual(result.get("umi"), [
    { id: "vehicle", label: "乗り物", count: 2, sortOrder: 20 },
  ]);
});

test("interestのみ・2回以上・回数順・同数sort_order順・最大5件", () => {
  const selectedOnTwoVisits = [
    tag("sixth", "6番目", 60),
    tag("fifth", "5番目", 50),
    tag("fourth", "4番目", 40),
    tag("third", "3番目", 30),
    tag("second", "2番目", 20),
    tag("first", "1番目", 10),
    tag("behavior", "様子タグ", 1, "behavior"),
  ];
  const visits = ["one", "two"].map((visitId) => ({
    child_id: "sora",
    visit_id: visitId,
    satisfaction: "loved",
    visit_child_tags: selectedOnTwoVisits,
  }));
  visits.push({
    child_id: "sora",
    visit_id: "not-fit",
    satisfaction: "not_fit",
    visit_child_tags: [tag("excluded", "除外", 0)],
  });
  visits.push({
    child_id: "sora",
    visit_id: "once",
    satisfaction: "neutral",
    visit_child_tags: [tag("once", "1回だけ", 0)],
  });

  assert.deepEqual(
    buildFrequentInterestTagsByChild(visits)
      .get("sora")
      ?.map(({ id }: { id: string }) => id),
    ["first", "second", "third", "fourth", "fifth"],
  );
});
