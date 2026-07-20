import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const manifest = JSON.parse(
  readFileSync("data/facility_quality_q1_known_issues_manifest.json", "utf8"),
);
const current = JSON.parse(readFileSync("data/facilities_data.json", "utf8"));
const sitemap = readFileSync("public/sitemap-0.xml", "utf8");
const baseline = JSON.parse(
  execFileSync(
    "git",
    ["show", `${manifest.base_commit}:data/facilities_data.json`],
    { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 },
  ),
);

const targetIds = new Set(manifest.target_ids);
const baselineById = new Map(baseline.facilities.map((facility) => [facility.id, facility]));
const currentById = new Map(current.facilities.map((facility) => [facility.id, facility]));

assert.equal(manifest.entries.length, manifest.target_count, "manifest entry count");
assert.deepEqual(
  manifest.entries.map(({ id }) => id),
  manifest.target_ids,
  "manifest target order",
);
assert.equal(current.facilities.length, baseline.facilities.length, "facility master count");
assert.equal(currentById.size, current.facilities.length, "duplicate facility id");
assert.equal(
  new Set(current.facilities.map(({ slug }) => slug)).size,
  current.facilities.length,
  "duplicate facility slug",
);
assert.deepEqual(current.metadata, baseline.metadata, "metadata must remain unchanged");

const changedIds = [];
for (const [id, before] of baselineById) {
  const after = currentById.get(id);
  assert(after, `facility ${id} must not be deleted`);
  assert.equal(after.id, before.id, `facility ${id} id changed`);
  assert.equal(after.slug, before.slug, `facility ${id} slug changed`);
  if (JSON.stringify(before) !== JSON.stringify(after)) changedIds.push(id);
}

const unexpectedChangedIds = changedIds.filter((id) => !targetIds.has(id));
assert.deepEqual(unexpectedChangedIds, [], "manifest-external facility changes");

for (const entry of manifest.entries) {
  const before = baselineById.get(entry.id);
  const after = currentById.get(entry.id);
  assert(before && after, `manifest facility ${entry.id} exists`);
  assert.equal(before.name, entry.registered_name, `facility ${entry.id} baseline name`);
  assert.equal(before.url, entry.registered_url, `facility ${entry.id} baseline url`);
  assert(entry.official_sources.length > 0, `facility ${entry.id} official source`);
  assert(
    entry.official_sources.every((url) => url.startsWith("https://")),
    `facility ${entry.id} official sources must use https`,
  );

  const expectedUpdates = entry.expected_updates;
  for (const [field, value] of Object.entries(expectedUpdates)) {
    assert.deepEqual(after[field], value, `facility ${entry.id} ${field}`);
  }

  const allKeys = new Set([...Object.keys(before), ...Object.keys(after)]);
  const changedFields = [...allKeys].filter(
    (field) => JSON.stringify(before[field]) !== JSON.stringify(after[field]),
  );
  assert.deepEqual(
    changedFields.filter((field) => !(field in expectedUpdates)).sort(),
    [],
    `facility ${entry.id} changed fields outside expected updates`,
  );
}

const visibleBefore = baseline.facilities.filter(
  ({ data_quality_status }) => data_quality_status !== "exclude_candidate",
);
const visibleAfter = current.facilities.filter(
  ({ data_quality_status }) => data_quality_status !== "exclude_candidate",
);
assert.equal(visibleBefore.length, 3734, "baseline published count");
assert.equal(visibleAfter.length, 3732, "Q1 published count");
for (const id of [791, 1600]) {
  assert.equal(
    currentById.get(id)?.data_quality_status,
    "exclude_candidate",
    `facility ${id} must be public-excluded`,
  );
  assert.equal(
    sitemap.includes(`/facilities/facility-${id}<`),
    false,
    `facility ${id} must be absent from sitemap`,
  );
}
assert.notEqual(
  currentById.get(658)?.data_quality_status,
  "exclude_candidate",
  "HOLD facility 658 must not be public-excluded",
);

const classificationCounts = Object.fromEntries(
  [...new Set(manifest.entries.map(({ classification }) => classification))]
    .sort()
    .map((classification) => [
      classification,
      manifest.entries.filter((entry) => entry.classification === classification).length,
    ]),
);
const urlUpdateCount = manifest.entries.filter(
  ({ expected_updates }) => "url" in expected_updates,
).length;
const nameUpdateCount = manifest.entries.filter(
  ({ expected_updates }) => "name" in expected_updates,
).length;
const publicExcludeCount = manifest.entries.filter(
  ({ post_public_state }) => post_public_state === "excluded",
).length;
const holdCount = manifest.entries.filter(({ hold_reason }) => hold_reason).length;

console.log(
  JSON.stringify(
    {
      result: "PASS",
      targets: manifest.target_count,
      changed_facilities: changedIds.length,
      manifest_external_changes: unexpectedChangedIds.length,
      classification_counts: classificationCounts,
      url_updates: urlUpdateCount,
      name_updates: nameUpdateCount,
      public_excludes: publicExcludeCount,
      holds: holdCount,
      facility_master_before: baseline.facilities.length,
      facility_master_after: current.facilities.length,
      published_before: visibleBefore.length,
      published_after: visibleAfter.length,
    },
    null,
    2,
  ),
);
