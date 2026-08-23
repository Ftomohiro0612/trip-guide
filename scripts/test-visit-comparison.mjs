import assert from "node:assert/strict";
import test from "node:test";
import {
  findPreviousVisit,
  formatVisitDuration,
  visitGapInDays,
} from "../lib/visit-comparison.ts";

function visit(id, visitedOn, createdAt) {
  return {
    id,
    visited_on: visitedOn,
    created_at: createdAt,
  };
}

test("selects the visit immediately before the current visit", () => {
  const current = visit("current", "2026-06-15", "2026-06-16T00:00:00Z");
  const previous = findPreviousVisit(current, [
    visit("oldest", "2026-01-01", "2026-01-02T00:00:00Z"),
    visit("future", "2026-08-01", "2026-08-02T00:00:00Z"),
    visit("immediate", "2026-05-01", "2026-05-02T00:00:00Z"),
  ]);

  assert.equal(previous?.id, "immediate");
});

test("uses created_at within the same visit date", () => {
  const current = visit("current", "2026-06-15", "2026-06-15T12:00:00Z");
  const previous = findPreviousVisit(current, [
    visit("before", "2026-06-15", "2026-06-15T11:00:00Z"),
    visit("after", "2026-06-15", "2026-06-15T13:00:00Z"),
  ]);

  assert.equal(previous?.id, "before");
});

test("sorts visits without a visit date last and then by created_at", () => {
  const current = visit("current", null, "2026-06-15T12:00:00Z");
  const previous = findPreviousVisit(current, [
    visit("dated", "2027-01-01", "2027-01-02T00:00:00Z"),
    visit("undated-before", null, "2026-06-15T11:00:00Z"),
    visit("undated-after", null, "2026-06-15T13:00:00Z"),
  ]);

  assert.equal(previous?.id, "undated-before");
});

test("returns no previous visit for the first item in chronology", () => {
  const current = visit("current", "2026-01-01", "2026-01-02T00:00:00Z");
  const previous = findPreviousVisit(current, [
    visit("future", "2026-02-01", "2026-02-02T00:00:00Z"),
  ]);

  assert.equal(previous, null);
});

test("calculates date-only visit gaps without timezone drift", () => {
  assert.equal(visitGapInDays("2026-01-31", "2026-03-01"), 29);
  assert.equal(visitGapInDays("2026-03-01", "2026-03-01"), 0);
  assert.equal(visitGapInDays(null, "2026-03-01"), null);
});

test("formats saved duration buckets and exact minutes", () => {
  assert.equal(formatVisitDuration(150), "2〜3時間");
  assert.equal(formatVisitDuration(95), "95分");
  assert.equal(formatVisitDuration(null), "未記録");
});
