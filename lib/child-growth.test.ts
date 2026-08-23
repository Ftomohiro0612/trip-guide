import assert from "node:assert/strict";
import test from "node:test";

const childGrowthModulePath = "./child-growth.ts";
const { findGrowthRecordOnOrBefore, formatHeightCm } =
  await import(childGrowthModulePath);

const records = [
  {
    id: "older",
    child_id: "child-a",
    recorded_on: "2026-01-10",
    height_cm: 101.2,
    created_at: "2026-01-10T00:00:00Z",
  },
  {
    id: "newer",
    child_id: "child-a",
    recorded_on: "2026-04-20",
    height_cm: "104.5",
    created_at: "2026-04-20T00:00:00Z",
  },
  {
    id: "other-child",
    child_id: "child-b",
    recorded_on: "2026-04-25",
    height_cm: 110,
    created_at: "2026-04-25T00:00:00Z",
  },
];

test("訪問日以前でもっとも新しい身長記録を返す", () => {
  assert.equal(
    findGrowthRecordOnOrBefore(records, "child-a", "2026-05-01")?.id,
    "newer",
  );
});

test("同日の身長記録を訪問時の記録として扱う", () => {
  assert.equal(
    findGrowthRecordOnOrBefore(records, "child-a", "2026-01-10")?.id,
    "older",
  );
});

test("訪問日より前の記録がない場合は何も返さない", () => {
  assert.equal(
    findGrowthRecordOnOrBefore(records, "child-a", "2025-12-31"),
    null,
  );
  assert.equal(findGrowthRecordOnOrBefore(records, "child-a", null), null);
});

test("身長表示を小数1桁に揃える", () => {
  assert.equal(formatHeightCm(104), "104.0");
  assert.equal(formatHeightCm("104.5"), "104.5");
});
