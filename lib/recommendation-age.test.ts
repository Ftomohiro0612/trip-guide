import assert from "node:assert/strict";
import test from "node:test";

const modulePath = "./recommendation-age.ts";
const { currentChildAge, getAgeCompatibility } = await import(modulePath);

test("生年月と基準月から現在年齢を求める", () => {
  assert.equal(currentChildAge(2020, 8, "2026-08-22"), 6);
  assert.equal(currentChildAge(2020, 9, "2026-08-22"), 5);
});

test("全年齢と明示された候補は年齢適合にする", () => {
  assert.equal(getAgeCompatibility("どなたでも（小学生以下は保護者同伴）", 3), true);
  assert.equal(getAgeCompatibility("全年齢", 12), true);
});

test("年齢・学年の明示範囲から不適合を除外できる", () => {
  assert.equal(getAgeCompatibility("3歳〜小学生", 2), false);
  assert.equal(getAgeCompatibility("3歳〜小学生", 8), true);
  assert.equal(getAgeCompatibility("小学3〜6年生", 7), false);
  assert.equal(getAgeCompatibility("小学3〜6年生", 10), true);
  assert.equal(getAgeCompatibility("小学生以下（保護者同伴）", 4), true);
});

test("自由文から確実な年齢範囲を読めない場合はunknownにする", () => {
  assert.equal(getAgeCompatibility("子どもと家族", 5), null);
  assert.equal(getAgeCompatibility("公式参照", 8), null);
  assert.equal(getAgeCompatibility(null, 8), null);
});
