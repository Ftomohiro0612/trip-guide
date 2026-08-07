import assert from "node:assert/strict";
import test from "node:test";

const childAgeModulePath = "./child-age.ts";
const { childAgeAtVisit, childAgeAtVisitInMonths } =
  await import(childAgeModulePath);

test("12月生まれの翌年1月訪問は誕生月を迎える前の満年齢になる", () => {
  assert.equal(childAgeAtVisit("2026-01-15", 2020, 12), 5);
  assert.equal(childAgeAtVisitInMonths("2026-01-15", 2020, 12), 61);
});

test("誕生月とそれ以降は当年分を加えた満年齢になる", () => {
  assert.equal(childAgeAtVisit("2026-12-01", 2020, 12), 6);
  assert.equal(childAgeAtVisit("2027-03-01", 2020, 12), 6);
});

test("誕生月が欠損した旧データでは年差へfallbackする", () => {
  assert.equal(childAgeAtVisit("2026-01-15", 2020, null), 6);
  assert.equal(childAgeAtVisitInMonths("2026-01-15", 2020, null), null);
});
