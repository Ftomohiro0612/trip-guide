/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const test = require("node:test");
const ts = require("typescript");

require.extensions[".ts"] = (module, filename) => {
  const source = fs.readFileSync(filename, "utf8");
  const output = ts.transpileModule(source, {
    compilerOptions: {
      esModuleInterop: true,
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  module._compile(output, filename);
};

const {
  deriveEventDiscoveryType,
  normalizeEventSearchText,
  selectChildEventViews,
  selectSeasonalEventViews,
} = require("../lib/event-discovery.ts");
const { selectSeasonalFacilities } = require("../lib/seasonal-facilities.ts");

test("child picks prefer Tier A, avoid seasonal overlap, facilities, and themes", () => {
  const views = [
    view("seasonal", 1, "tokyo", ["dinosaur", "exhibition"], "2026-10-17"),
    view("animal-a", 2, "chiba", ["animal_contact"], "2026-10-18"),
    view("animal-b", 3, "kanagawa", ["animal_feed"], "2026-10-19"),
    view("space", 4, "saitama", ["space", "science"], "2026-10-20"),
    view("craft", 5, "ibaraki", ["craft"], "2026-10-21"),
    view("same-facility", 1, "tokyo", ["character"], "2026-10-18"),
  ];
  const seasonal = selectSeasonalEventViews(views, "2026-10-14", 1);
  const selected = selectChildEventViews(
    views,
    "2026-10-14",
    new Set(seasonal.map((item) => item.event.id)),
  );
  assert.equal(selected.picks.length, 3);
  assert.equal(
    selected.picks.some((pick) => pick.view.event.id === seasonal[0].event.id),
    false,
  );
  assert.equal(
    selected.picks.some(
      (pick) => pick.view.event.facility_id === seasonal[0].event.facility_id,
    ),
    false,
  );
  assert.equal(
    new Set(selected.picks.map((pick) => pick.view.event.facility_id)).size,
    3,
  );
  assert.equal(new Set(selected.picks.map((pick) => pick.primaryTheme)).size, 3);
});

test("event type map and Japanese search normalization are deterministic", () => {
  assert.equal(
    deriveEventDiscoveryType({
      title: "親子秋祭り",
      summary: "屋台を楽しむ",
      tags: [],
      recommended_for_tags: ["experience"],
    }),
    "festival_seasonal",
  );
  assert.equal(normalizeEventSearchText("ＰＬＡＮＥＴＡＲＩＵＭ　カタカナ"), "planetarium かたかな");
});

test("seasonal facilities require an access-month statement", () => {
  const facilities = [
    facility(1, "10月〜12月 みかん狩り", "shizuoka", "fruit"),
    facility(2, "春の花を楽しめます", "tokyo", "park"),
    facility(3, "秋の紅葉を歩く", "nagano", "nature"),
  ];
  assert.deepEqual(
    selectSeasonalFacilities(facilities, "2026-10-14").map(
      (pick) => pick.facility.id,
    ),
    [1, 3],
  );
});

function view(id, facilityId, prefecture, recommendedTags, date) {
  return {
    event: {
      id,
      facility_id: facilityId,
      prefecture,
      title: id,
      summary: "",
      start_date: date,
      end_date: date,
      occurrence_dates: [],
      recommended_for_tags: recommendedTags,
      recommended_for_label: "親子向け",
      age_label: "小学生",
    },
    facilityName: `facility-${facilityId}`,
    venueName: `facility-${facilityId}`,
    prefectureLabel: prefecture,
    isThisWeekend: false,
    isThisMonth: true,
  };
}

function facility(id, description, prefectureId, categoryId) {
  return {
    id,
    description,
    prefecture_id: prefectureId,
    category_id: categoryId,
    signature_experiences: [],
    things_to_do: [],
  };
}
