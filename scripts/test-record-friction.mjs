import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import ts from "typescript";
import { plannedDateChoices, selectVisitIntent, shiftDate, tokyoDate } from "../lib/visit-intent.ts";
import { hasQuickReactions } from "../lib/quick-visit-validation.ts";
import { nextVisitCandidate } from "../lib/visit-next-candidate.ts";
import { isChildLikeEligibleVisit } from "../lib/child-insights.ts";

const today = "2026-09-22";
const intent = (date, extra = {}) => ({ id: "a", facility_slug: "park", facility_name: "Park", planned_date: date,
  visit_prompt_shown_at: null, visit_prompt_dismissed_at: null, ...extra });

test("only overdue plans within seven days qualify; plain wishlists never qualify", () => {
  for (const date of [null, "2026-09-14", today, "2026-09-23"]) assert.equal(selectVisitIntent([intent(date)], [], today), null);
  for (const date of ["2026-09-15", "2026-09-21"]) assert.equal(selectVisitIntent([intent(date)], [], today)?.planned_date, date);
});

test("prompt repetition uses JST midnight and dismissals are final", () => {
  assert.equal(tokyoDate(new Date("2026-09-21T15:00:00Z")), today);
  assert.equal(selectVisitIntent([intent("2026-09-20", { visit_prompt_shown_at: "2026-09-21T15:00:00Z" })], [], today), null);
  assert.ok(selectVisitIntent([intent("2026-09-20", { visit_prompt_shown_at: "2026-09-21T14:59:59Z" })], [], today));
  assert.equal(selectVisitIntent([intent("2026-09-20", { visit_prompt_dismissed_at: "2026-09-21T00:00:00Z" })], [], today), null);
});

test("oldest eligible plan wins, after excluding matching visits from plan minus one day", () => {
  const old = intent("2026-09-15");
  const recent = intent("2026-09-21", { id: "b", facility_slug: "zoo" });
  assert.equal(selectVisitIntent([recent, old], [], today)?.id, "a");
  assert.equal(selectVisitIntent([recent, old], [{ facility_slug: "park", visited_on: "2026-09-14" }], today)?.id, "b");
  assert.equal(selectVisitIntent([old], [{ facility_slug: "park", visited_on: "2026-09-13" }, { facility_slug: "zoo", visited_on: today }], today)?.id, "a");
});

test("chips use nearest Saturday, including Saturday itself, across month/year boundaries", () => {
  assert.deepEqual(plannedDateChoices("2026-09-25").map((choice) => choice.date), ["2026-09-25", "2026-09-26", "2026-09-26"]);
  assert.equal(plannedDateChoices("2026-09-26")[2].date, "2026-09-26");
  assert.equal(plannedDateChoices("2026-09-27")[2].date, "2026-10-03");
  assert.equal(shiftDate("2026-12-31", 1), "2027-01-01");
});

test("one child and one interest is sufficient; selected children need one or two distinct tags", () => {
  assert.ok(hasQuickReactions({ a: ["animal"] }));
  assert.ok(hasQuickReactions({ a: ["animal", "nature"], b: ["nature"] }));
  for (const reactions of [{}, { a: [] }, { a: ["animal"], b: [] }, { a: ["a", "b", "c"] }, { a: ["a", "a"] }]) assert.equal(hasQuickReactions(reactions), false);
});

test("next candidate shares tags and excludes this child's visits, not a sibling's visits", () => {
  const facilities = [
    { slug: "current", recommended_for_tags: ["animal"] },
    { slug: "visited", recommended_for_tags: ["animal"] },
    { slug: "unrelated", recommended_for_tags: ["science"] },
    { slug: "next", recommended_for_tags: ["animal", "nature"] },
  ];
  const visits = [{ facilitySlug: "visited", childIds: ["child"] }, { facilitySlug: "next", childIds: ["sibling"] }];
  assert.equal(nextVisitCandidate(facilities, "current", "child", visits)?.slug, "next");
  assert.equal(nextVisitCandidate(facilities, "current", null, visits), null);
  assert.equal(nextVisitCandidate(facilities, "manual-place", "child", visits), null);
  assert.equal(nextVisitCandidate(facilities, "current", "child", [...visits, { facilitySlug: "next", childIds: ["child"] }]), null);
});

test("unanswered satisfaction is excluded from satisfaction-qualified likes", () => {
  const link = { tag_id: "animal", reaction_tags: { id: "animal", label: "動物", tag_type: "interest", sort_order: 10 } };
  assert.equal(isChildLikeEligibleVisit({ satisfaction: null, visit_child_tags: [link] }), false);
  assert.equal(isChildLikeEligibleVisit({ satisfaction: "enjoyed", visit_child_tags: [link] }), true);
});

function quickStore() {
  const inserts = [];
  const client = {
    auth: { getUser: async () => ({ data: { user: { id: "owner" } }, error: null }) },
    from(table) {
      let payload;
      const query = {
        select() { return query; },
        eq() { return query; },
        order() { return query; },
        insert(rows) { payload = rows; inserts.push({ table, rows }); return query; },
        then(resolve, reject) {
          const data = table === "children" ? [{ id: "child", nickname: "Test", birth_year: 2020, birth_month: 1 }]
            : table === "reaction_tags" ? [{ id: "animal", label: "動物" }]
              : table === "visit_children" ? payload.map((row) => ({ id: "link", child_id: row.child_id })) : [];
          return Promise.resolve({ data, error: null }).then(resolve, reject);
        },
      };
      return query;
    },
  };
  const source = readFileSync(new URL("../lib/quick-visit.ts", import.meta.url), "utf8");
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const exports = {};
  const require = (name) => {
    if (name === "@/lib/supabase/client") return { createClient: () => client };
    if (name === "@/lib/quick-visit-validation") return { hasQuickReactions };
    if (name === "@/lib/child-age") return { childAgeAtVisit: () => 6 };
    throw new Error(`Unexpected import: ${name}`);
  };
  new Function("require", "exports", compiled)(require, exports);
  return { ...exports, inserts };
}

test("quick persistence writes NULL satisfaction and only selected tags to both existing representations", async () => {
  const store = quickStore();
  await store.insertQuickChildren("visit", today, { child: ["animal"] });
  assert.deepEqual(store.inserts, [
    { table: "visit_children", rows: [{ visit_id: "visit", child_id: "child", satisfaction: null, child_age_at_visit: 6, reaction_tags: ["animal"] }] },
    { table: "visit_child_tags", rows: [{ visit_child_id: "link", tag_id: "animal" }] },
  ]);
});

test("unknown children and behavior/nonexistent tags are rejected before child inserts", async () => {
  for (const reactions of [{ stranger: ["animal"] }, { child: ["first_time"] }, { child: [] }]) {
    const store = quickStore();
    await assert.rejects(store.insertQuickChildren("visit", today, reactions));
    assert.deepEqual(store.inserts, []);
  }
});
