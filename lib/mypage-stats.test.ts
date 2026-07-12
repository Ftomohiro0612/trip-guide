import assert from "node:assert/strict";
import test from "node:test";

const statsModulePath = "./mypage-stats.ts";
const { currentMonthKeyJst, recentMonthKeysJst } = await import(statsModulePath);

test("recentMonthKeysJst uses the JST current month in a UTC environment", () => {
  const now = new Date("2026-07-31T17:00:00Z");

  assert.deepEqual(recentMonthKeysJst(now, 6), [
    "2026-03",
    "2026-04",
    "2026-05",
    "2026-06",
    "2026-07",
    "2026-08",
  ]);
});

test("recentMonthKeysJst crosses the year boundary correctly", () => {
  assert.deepEqual(recentMonthKeysJst(new Date("2025-12-31T14:59:59Z"), 6), [
    "2025-07",
    "2025-08",
    "2025-09",
    "2025-10",
    "2025-11",
    "2025-12",
  ]);
  assert.deepEqual(recentMonthKeysJst(new Date("2026-01-01T00:00:00Z"), 6), [
    "2025-08",
    "2025-09",
    "2025-10",
    "2025-11",
    "2025-12",
    "2026-01",
  ]);
});

test("recentMonthKeysJst ends with currentMonthKeyJst", () => {
  const now = new Date("2026-07-31T17:00:00Z");
  const months = recentMonthKeysJst(now, 6);

  assert.equal(months.at(-1), currentMonthKeyJst(now));
});
