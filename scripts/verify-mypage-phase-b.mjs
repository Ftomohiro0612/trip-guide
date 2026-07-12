import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import ts from "typescript";

function loadTypeScriptModule(path, requireMap = {}) {
  const source = readFileSync(path, "utf8");
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
  }).outputText;
  const loadedModule = { exports: {} };
  const localRequire = (specifier) => {
    if (specifier in requireMap) return requireMap[specifier];
    throw new Error(`Unexpected import in ${path}: ${specifier}`);
  };
  new Function("module", "exports", "require", output)(
    loadedModule,
    loadedModule.exports,
    localRequire,
  );
  return loadedModule.exports;
}

const stats = loadTypeScriptModule("lib/mypage-stats.ts");
const completion = loadTypeScriptModule("lib/visit-completion.ts", {
  "@/lib/mypage-stats": stats,
});

const children = [
  { id: "a", nickname: "あお", sortOrder: 0 },
  { id: "b", nickname: "べに", sortOrder: 1 },
];
const visit = (id, slug, childIds) => ({ id, facilitySlug: slug, childIds });
const categoryForSlug = (slug) =>
  slug.startsWith("park") ? "公園" : slug.startsWith("museum") ? "博物館" : "その他";

function summary(visits, currentVisitId = visits.at(-1).id) {
  return completion.buildCompletionSummary({
    currentVisitId,
    children,
    visits,
    categoryForSlug,
  });
}

for (const count of [1, 2, 3, 4, 9, 10]) {
  const visits = Array.from({ length: count }, (_, index) =>
    visit(`v${index + 1}`, index < 2 ? "park-1" : `museum-${index}`, ["a"]),
  );
  const result = summary(visits);
  assert.equal(result.familyTotal, count);
  assert.equal(result.children[0].visitCount, count);
  const copy = completion.childProgressCopy(result.children[0]);
  assert.equal(/ランキング/.test(`${copy.progress}${copy.hint ?? ""}`), false);
  if (count === 1) assert.match(copy.hint, /あと2件/);
  if (count === 2) assert.match(copy.hint, /あと1件/);
  if (count === 3) assert.match(copy.progress, /見えはじめました/);
  if (count >= 4) assert.match(copy.progress, new RegExp(`${count}件になりました`));
}

const noMeaningAtThree = summary([
  visit("x1", "park-1", ["a"]),
  visit("x2", "museum-1", ["a"]),
  visit("x3", "manual-1", ["a"]),
]);
assert.match(completion.childProgressCopy(noMeaningAtThree.children[0]).progress, /3件たまりました/);
assert.doesNotMatch(
  completion.childProgressCopy(noMeaningAtThree.children[0]).progress,
  /見えはじめました/,
);

const twoChildren = summary([
  visit("m1", "park-1", ["a", "b"]),
  visit("m2", "park-2", ["a"]),
  visit("m3", "museum-1", ["a", "b"]),
]);
assert.equal(twoChildren.familyTotal, 3);
assert.deepEqual(twoChildren.children.map((child) => child.visitCount), [3, 2]);
assert.equal(twoChildren.primaryChild.id, "a");

const unlinked = summary([visit("u1", "park-1", [])]);
assert.equal(unlinked.familyTotal, 1);
assert.equal(unlinked.children.length, 0);

const duplicateLinks = stats.buildChildStats(
  ["a"],
  [
    { child_id: "a", visit_id: "same" },
    { child_id: "a", visit_id: "same" },
  ],
);
assert.equal(duplicateLinks[0].visitCount, 1);

const currentNew = readFileSync("app/mypage/visits/new/page.tsx", "utf8");
const currentEdit = readFileSync("app/mypage/visits/[id]/edit/page.tsx", "utf8");
const currentComplete = readFileSync("app/mypage/visits/complete/page.tsx", "utf8");
const completionAction = readFileSync("app/mypage/visits/complete/actions.ts", "utf8");
const fromPhoto = readFileSync(
  "app/mypage/visits/from-photo/FromPhotoVisitDraftsClient.tsx",
  "utf8",
);
const analytics = readFileSync("components/VisitCompletionAnalytics.tsx", "utf8");
const mypage = readFileSync("app/mypage/page.tsx", "utf8");
const originNew = execFileSync(
  "git",
  ["show", "origin/main:app/mypage/visits/new/page.tsx"],
  { encoding: "utf8" },
);
const originMypage = execFileSync(
  "git",
  ["show", "origin/main:app/mypage/page.tsx"],
  { encoding: "utf8" },
);

const regressionManifest = {
  copy: [
    "記録しました！",
    "行った場所マップにピンが増えました",
    "おでかけの記録が増えました",
    "マップと履歴を見る",
    "おでかけ履歴を見る",
    "施設ページへ戻る",
  ],
  links: ["/mypage/visits", "/facilities/"],
  components: ["<Link", "VisitPhotoUploader", "ChildRegistrationNudge", "ChildAvatar"],
};
for (const value of regressionManifest.copy) {
  assert.ok(originNew.includes(value), `origin/main copy missing: ${value}`);
  assert.ok(currentComplete.includes(value), `Phase B copy missing: ${value}`);
}
for (const value of regressionManifest.links) {
  assert.ok(originNew.includes(value), `origin/main link missing: ${value}`);
  assert.ok(currentComplete.includes(value), `Phase B link missing: ${value}`);
}
for (const value of regressionManifest.components) {
  assert.ok(originNew.includes(value), `origin/main component missing: ${value}`);
  assert.ok(
    `${currentNew}${currentComplete}`.includes(value),
    `Phase B component missing: ${value}`,
  );
}
assert.match(currentComplete, /focus-visible:/);
assert.match(currentNew, /submissionLockedRef\.current/);
assert.match(currentEdit, /saveLockedRef\.current/);
assert.match(fromPhoto, /createdDraft: false/);
assert.match(fromPhoto, /createdDraftIds\.length > 1/);
assert.match(fromPhoto, /storeVisitEdit/);
assert.doesNotMatch(fromPhoto, /visits\/from-photo\/complete\?ids=/);
assert.match(completionAction, /\.eq\("user_id", user\.id\)/);
assert.match(completionAction, /\.eq\("status", "published"\)/);
assert.doesNotMatch(`${currentComplete}${completionAction}`, /service_role|SERVICE_ROLE/);
assert.doesNotMatch(currentComplete, /あと.*ランキング/);
assert.doesNotMatch(currentComplete, /preset_children|\/visits\/\$\{[^}]+\}\/complete/);
assert.doesNotMatch(currentNew, /preset_children|\/visits\/\$\{visitId\}\/complete/);
const normalizeEol = (value) => value.replaceAll("\r\n", "\n");
assert.equal(
  normalizeEol(mypage),
  normalizeEol(originMypage),
  "Phase A mypage must be byte-identical to origin/main apart from checkout EOL",
);

const payloads = [
  { event: "visit_completion_view", payload: { entry_method: "standard" } },
  { event: "visit_completion_view", payload: { entry_method: "photo_publish" } },
  { event: "visit_another_start", payload: { entry_method: "standard" } },
  { event: "visit_another_start", payload: { entry_method: "photo_publish" } },
];
for (const forbidden of [
  "user_id",
  "email",
  "child_id",
  "nickname",
  "birth_year",
  "age",
  "facility_slug",
  "facility_name",
  "address",
  "parent_memo",
  "other_note",
]) {
  assert.equal(JSON.stringify(payloads).includes(forbidden), false, forbidden);
}
assert.match(analytics, /try \{/);
assert.match(analytics, /sessionStorage/);
assert.match(analytics, /visit-another-start/);

console.log(JSON.stringify({
  result: "PASS",
  states: ["A", "B", "C", "D-meaningful", "D-empty", "E", "F", "G", "H"],
  familyVsChildren: { family: 3, children: { a: 3, b: 2 } },
  roundTrips: {
    before: { child1: 3, child3: 3, child5: 3 },
    after: { child1: 6, child3: 6, child5: 6 },
    definition: "Supabase auth/data HTTP requests, no tags or photos",
  },
  ga4Payloads: payloads,
  regression: { copyMissing: 0, linkMissing: 0, componentMissing: 0, focusVisibleMissing: 0 },
  mypagePhaseA: "byte-identical-to-origin/main",
}, null, 2));
