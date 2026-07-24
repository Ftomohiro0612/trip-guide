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
assert.equal(currentById.size, current.facilities.length, "duplicate facility id");
assert.equal(
  new Set(current.facilities.map(({ slug }) => slug)).size,
  current.facilities.length,
  "duplicate facility slug",
);

assert.equal(
  current.metadata.total_facilities,
  current.facilities.length,
  "metadata total_facilities",
);

const assertMetadataCounts = ({
  metadataEntries,
  baselineMetadataEntries,
  facilityIdField,
  label,
}) => {
  assert.equal(
    new Set(metadataEntries.map(({ id }) => id)).size,
    metadataEntries.length,
    `duplicate ${label} metadata id`,
  );
  const metadataById = new Map(metadataEntries.map((entry) => [entry.id, entry]));
  const baselineMetadataById = new Map(
    baselineMetadataEntries.map((entry) => [entry.id, entry]),
  );
  for (const entry of metadataEntries) {
    const baselineEntry = baselineMetadataById.get(entry.id);
    if (baselineEntry) {
      assert.equal(entry.name, baselineEntry.name, `${label} metadata ${entry.id} name`);
    } else {
      assert.equal(
        typeof entry.name === "string" && entry.name.length > 0,
        true,
        `${label} metadata ${entry.id} name`,
      );
    }
  }
  const actualCounts = new Map();
  for (const facility of current.facilities) {
    const metadataEntry = metadataById.get(facility[facilityIdField]);
    assert(metadataEntry, `${label} metadata ${facility[facilityIdField]} exists`);
    actualCounts.set(
      facility[facilityIdField],
      (actualCounts.get(facility[facilityIdField]) ?? 0) + 1,
    );
  }
  for (const entry of metadataEntries) {
    assert.equal(
      entry.count,
      actualCounts.get(entry.id) ?? 0,
      `${label} metadata ${entry.id} count`,
    );
  }
  assert.equal(
    metadataEntries.reduce((sum, { count }) => sum + count, 0),
    current.facilities.length,
    `${label} metadata count total`,
  );
};

assertMetadataCounts({
  metadataEntries: current.metadata.prefectures,
  baselineMetadataEntries: baseline.metadata.prefectures,
  facilityIdField: "prefecture_id",
  label: "prefecture",
});
assertMetadataCounts({
  metadataEntries: current.metadata.categories,
  baselineMetadataEntries: baseline.metadata.categories,
  facilityIdField: "category_id",
  label: "category",
});

const changedIds = [];
for (const [id, before] of baselineById) {
  const after = currentById.get(id);
  assert(after, `facility ${id} must not be deleted`);
  assert.equal(after.id, before.id, `facility ${id} id changed`);
  assert.equal(after.slug, before.slug, `facility ${id} slug changed`);
  if (JSON.stringify(before) !== JSON.stringify(after)) changedIds.push(id);
}

const nonTargetExistingChangedIds = changedIds.filter((id) => !targetIds.has(id));
const postBaselineAddedFacilityIds = current.facilities
  .filter(({ id }) => !baselineById.has(id))
  .map(({ id }) => id)
  .sort((a, b) => a - b);

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
const excludedAfter = current.facilities.filter(
  ({ data_quality_status }) => data_quality_status === "exclude_candidate",
);
assert.equal(
  visibleAfter.length + excludedAfter.length,
  current.facilities.length,
  "current publication boundary partitions facility master",
);

for (const entry of manifest.entries) {
  const after = currentById.get(entry.id);
  if (entry.post_public_state === "excluded") {
    assert.equal(
      after?.data_quality_status,
      "exclude_candidate",
      `facility ${entry.id} post_public_state excluded`,
    );
  } else {
    assert.notEqual(
      after?.data_quality_status,
      "exclude_candidate",
      `facility ${entry.id} post_public_state ${entry.post_public_state}`,
    );
  }
}

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
      non_target_existing_changes: nonTargetExistingChangedIds.length,
      non_target_existing_changed_ids: nonTargetExistingChangedIds,
      post_baseline_added_facility_count: postBaselineAddedFacilityIds.length,
      post_baseline_added_facility_ids: postBaselineAddedFacilityIds,
      classification_counts: classificationCounts,
      url_updates: urlUpdateCount,
      name_updates: nameUpdateCount,
      public_excludes: publicExcludeCount,
      holds: holdCount,
      facility_master_before: baseline.facilities.length,
      facility_master_after: current.facilities.length,
      published_before: visibleBefore.length,
      published_after: visibleAfter.length,
      excluded_after: excludedAfter.length,
    },
    null,
    2,
  ),
);
