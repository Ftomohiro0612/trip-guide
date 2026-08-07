import assert from "node:assert/strict";
import test from "node:test";

const childInsightsModulePath = "./child-insights.ts";
const mypageStatsModulePath = "./mypage-stats.ts";
const {
  buildFrequentInterestTagsByChild,
  buildVisitCategoryCountsByChild,
  filterChildLikeVisits,
} = await import(childInsightsModulePath);
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
    satisfaction: "loved",
    visit_child_tags: [tag("vehicle", "乗り物", 20)],
  },
  {
    child_id: "sora",
    visit_id: "shared-3",
    satisfaction: "loved",
    visit_child_tags: [tag("water", "水遊び", 30)],
  },
  {
    child_id: "umi",
    visit_id: "shared-3",
    satisfaction: "loved",
    visit_child_tags: [tag("craft", "工作", 40)],
  },
];

test("旧定義4件からneutral・interestなしを除外し、有効反応2件になる", () => {
  const visits = [
    {
      child_id: "sora",
      visit_id: "loved-with-interest",
      satisfaction: "loved",
      visit_child_tags: [tag("animal", "動物を見る", 10)],
    },
    {
      child_id: "sora",
      visit_id: "enjoyed-with-interest",
      satisfaction: "enjoyed",
      visit_child_tags: [tag("water", "水遊び", 20)],
    },
    {
      child_id: "sora",
      visit_id: "neutral-with-interest",
      satisfaction: "neutral",
      visit_child_tags: [tag("craft", "工作", 30)],
    },
    {
      child_id: "sora",
      visit_id: "loved-without-interest",
      satisfaction: "loved",
      visit_child_tags: [tag("focused", "集中していた", 40, "behavior")],
    },
    {
      child_id: "sora",
      visit_id: "not-fit-with-interest",
      satisfaction: "not_fit",
      visit_child_tags: [tag("vehicle", "乗り物", 50)],
    },
  ];
  const formerDefinition = visits.filter(
    ({ satisfaction }) => satisfaction !== "not_fit",
  );

  assert.deepEqual(buildChildStats(["sora"], formerDefinition)[0], {
    childId: "sora",
    visitCount: 4,
    stage: "sprout",
  });
  assert.deepEqual(
    buildChildStats(["sora"], filterChildLikeVisits(visits))[0],
    {
      childId: "sora",
      visitCount: 2,
      stage: "pre_sprout",
    },
  );
});

test("有効反応visitが0件ならnoneになる", () => {
  const visits = [
    {
      child_id: "sora",
      visit_id: "neutral",
      satisfaction: "neutral",
      visit_child_tags: [tag("animal", "動物を見る", 10)],
    },
    {
      child_id: "sora",
      visit_id: "no-interest",
      satisfaction: "loved",
      visit_child_tags: [],
    },
  ];

  assert.deepEqual(buildChildStats(["sora"], filterChildLikeVisits(visits))[0], {
    childId: "sora",
    visitCount: 0,
    stage: "none",
  });
});

test("同一visitの兄弟でも2回以上選んだinterestタグが子ども別になる", () => {
  assert.equal(filterChildLikeVisits(siblingFixture).length, 6);
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
    visit_id: "enjoyed-without-interest",
    satisfaction: "enjoyed",
    visit_child_tags: [tag("behavior-only", "様子だけ", 0, "behavior")],
  });
  visits.push({
    child_id: "sora",
    visit_id: "once",
    satisfaction: "neutral",
    visit_child_tags: [tag("once", "1回だけ", 0)],
  });
  visits.push({
    child_id: "sora",
    visit_id: "neutral-two",
    satisfaction: "neutral",
    visit_child_tags: [tag("once", "neutralでは2回目", 0)],
  });

  assert.deepEqual(
    buildFrequentInterestTagsByChild(visits)
      .get("sora")
      ?.map(({ id }: { id: string }) => id),
    ["first", "second", "third", "fourth", "fifth"],
  );
});

test("施設カテゴリは好き判定と分離し、全同行visitを数える", () => {
  const visits = [
    {
      child_id: "sora",
      visit_id: "valid",
      satisfaction: "loved",
      visit_child_tags: [tag("animal", "動物を見る", 10)],
    },
    {
      child_id: "sora",
      visit_id: "neutral",
      satisfaction: "neutral",
      visit_child_tags: [tag("water", "水遊び", 20)],
    },
    {
      child_id: "sora",
      visit_id: "no-interest",
      satisfaction: "enjoyed",
      visit_child_tags: [],
    },
    {
      child_id: "sora",
      visit_id: "not-fit",
      satisfaction: "not_fit",
      visit_child_tags: [tag("craft", "工作", 30)],
    },
  ];
  const categoryByVisitId = new Map([
    ["valid", "動物園"],
    ["neutral", "公園"],
    ["no-interest", "水族館"],
    ["not-fit", "博物館"],
  ]);

  assert.equal(filterChildLikeVisits(visits).length, 1);
  assert.deepEqual(buildVisitCategoryCountsByChild(visits, categoryByVisitId).get("sora"), [
    { category: "動物園", count: 1 },
    { category: "公園", count: 1 },
    { category: "水族館", count: 1 },
    { category: "博物館", count: 1 },
  ]);
});
