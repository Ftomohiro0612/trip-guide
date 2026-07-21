import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const CRAFT_TYPES = [
  "工作・アート",
  "陶芸",
  "ガラス",
  "木工",
  "染め・織り",
  "紙・印刷",
  "アクセサリー・小物",
  "伝統工芸",
];

const evidence = JSON.parse(
  await readFile(new URL("../data/craft_category_evidence.json", import.meta.url)),
);
const reclassifications = JSON.parse(
  await readFile(
    new URL("../data/craft_category_reclassifications.json", import.meta.url),
  ),
);
const facilitiesData = JSON.parse(
  await readFile(new URL("../data/facilities_data.json", import.meta.url)),
);
const expansionSource = await readFile(
  new URL("./prepare-facility-expansion-30.mjs", import.meta.url),
  "utf8",
);
const accessorSource = await readFile(
  new URL("../lib/category-page-facilities.ts", import.meta.url),
  "utf8",
);
const pageSource = await readFile(
  new URL("../app/category/[id]/page.tsx", import.meta.url),
  "utf8",
);

const visibleFacilities = facilitiesData.facilities.filter(
  (facility) => facility.data_quality_status !== "exclude_candidate",
);
const prefectures = facilitiesData.metadata.prefectures;
const allowedTypes = new Set(CRAFT_TYPES);
const visibleById = new Map(visibleFacilities.map((facility) => [facility.id, facility]));
const recordById = new Map();

for (const record of evidence.records) {
  assert(!recordById.has(record.facility_id), `${record.facility_id}: duplicate evidence`);
  recordById.set(record.facility_id, record);
  assert(visibleById.has(record.facility_id), `${record.facility_id}: facility is not visible`);
  assert.equal(record.status, "verified", `${record.facility_id}: status`);
  assert(
    ["ongoing", "recurring"].includes(record.offering),
    `${record.facility_id}: offering`,
  );
  assert(record.source_urls.length > 0, `${record.facility_id}: source_urls`);
  assert(
    record.source_urls.every((url) => /^https?:\/\//.test(url)),
    `${record.facility_id}: official source URL`,
  );
  assert(/^\d{4}-\d{2}-\d{2}$/.test(record.source_checked_at), `${record.facility_id}: checked date`);
  assert(record.decision_reason.length >= 30, `${record.facility_id}: decision reason`);
  assert(record.craft_types.length > 0, `${record.facility_id}: craft_types`);
  assert(
    record.craft_types.every((type) => allowedTypes.has(type)),
    `${record.facility_id}: public craft type`,
  );
}

const publicFacilities = evidence.records.map((record) =>
  visibleById.get(record.facility_id),
);
assert(publicFacilities.every(Boolean), "all public evidence must resolve to a visible facility");
const orderedFirstPage = [];
const queues = CRAFT_TYPES.map((type) =>
  evidence.records
    .filter((record) => record.craft_types[0] === type)
    .sort((left, right) => left.facility_id - right.facility_id),
);
while (orderedFirstPage.length < Math.min(24, evidence.records.length)) {
  for (const queue of queues) {
    const record = queue.shift();
    if (record) orderedFirstPage.push(record);
    if (orderedFirstPage.length === 24) break;
  }
}
const firstPageIds = orderedFirstPage.map((record) => record.facility_id);
assert.equal(firstPageIds.length, 24, "nationwide first page must contain 24 facilities");
assert.equal(new Set(firstPageIds).size, firstPageIds.length, "first page duplicates");
const firstPageTypeCounts = new Map();
for (const record of orderedFirstPage) {
  const type = record.craft_types[0];
  firstPageTypeCounts.set(type, (firstPageTypeCounts.get(type) ?? 0) + 1);
}
assert(firstPageTypeCounts.size >= 5, "first page must include at least five craft types");
assert(
  Math.max(...firstPageTypeCounts.values()) / firstPageIds.length <= 0.4,
  "one craft type must not exceed 40% of the first page",
);

const excludedIds = new Set([
  ...evidence.audit_exclusions.display_only,
  ...evidence.audit_exclusions.temporary_only,
  ...evidence.audit_exclusions.misclassified_or_no_evidence,
  ...evidence.audit_exclusions.cross_category_reviewed.map(
    ({ facility_id }) => facility_id,
  ),
]);
for (const id of excludedIds) {
  assert(!recordById.has(id), `${id}: excluded facility leaked into public craft`);
}
for (const id of evidence.audit_exclusions.misclassified_or_no_evidence) {
  assert(
    !(visibleById.get(id)?.recommended_for_tags ?? []).includes("craft"),
    `${id}: rejected craft tag was not removed`,
  );
}
for (const id of [
  ...evidence.audit_cohorts.accepted_l2_verified_untagged,
  ...evidence.audit_cohorts.added_by_required_all_prefecture_scan,
]) {
  assert(
    (visibleById.get(id)?.recommended_for_tags ?? []).includes("craft"),
    `${id}: verified cross-category facility did not receive craft tag`,
  );
}

assert.equal(reclassifications.records.length, 25, "reclassification manifest size");
for (const record of reclassifications.records) {
  const facility = visibleById.get(record.facility_id);
  assert(facility, `${record.facility_id}: reclassified facility missing`);
  assert.equal(record.before_category, "craft", `${record.facility_id}: before category`);
  assert.equal(facility.category_id, record.after_category, `${record.facility_id}: after category`);
  assert(record.decision_reason.length >= 30, `${record.facility_id}: reclassification reason`);
  assert(!recordById.has(record.facility_id), `${record.facility_id}: reclassified exclusion leaked into craft`);
  assert(
    visibleFacilities.some(
      (candidate) =>
        candidate.id === record.facility_id &&
        candidate.category_id === record.after_category,
    ),
    `${record.facility_id}: missing from destination category`,
  );
}

for (const prefecture of prefectures) {
  const expected = publicFacilities.filter(
    (facility) => facility.prefecture_id === prefecture.id,
  );
  assert(
    expected.every((facility) => recordById.has(facility.id)),
    `${prefecture.id}: prefecture public set mismatch`,
  );
}
assert.equal(
  new Set(visibleFacilities.map((facility) => facility.prefecture_id)).size,
  prefectures.length,
  "all visible prefectures must be scanned",
);

for (const type of CRAFT_TYPES) {
  const matching = evidence.records.filter((record) =>
    record.craft_types.includes(type),
  );
  assert(matching.length > 0, `${type}: empty public type`);
  assert(
    matching.every((record) => recordById.has(record.facility_id)),
    `${type}: type filter mismatch`,
  );
}

for (const category of facilitiesData.metadata.categories) {
  const expected = facilitiesData.facilities.filter(
    (facility) => facility.category_id === category.id,
  ).length;
  assert.equal(category.count, expected, `${category.id}: metadata count`);
}

const candidatePattern =
  /工作(?:室|エリア|体験|する|教室|プログラム|メニュー|コーナー|工房)|陶芸(?:体験|教室)|吹きガラス|ステンドグラス制作|木工(?:体験|教室|室)|(?:染め|織り|機織り|藍染め)(?:体験|を)|紙すき|紙漉|版画体験|新聞作り|絵付け(?:体験|を)|クラフト体験|創作体験|ものづくり体験|アクセサリー(?:作り|制作)|キャンドル(?:づくり|作り)|石けん(?:づくり|作り)|石鹸(?:づくり|作り)|リース(?:づくり|作り)|凧(?:づくり|作り)|ハタ作り|食品サンプル(?:作り|制作)|作品を作る|自由に作品を作る|寄せ植え|ブロック制作|レゴ教室|ものづくり工房|アートクラフト|木のワークショップ|制作体験/;
const candidateIds = visibleFacilities
  .filter((facility) =>
    candidatePattern.test(
      [
        facility.name,
        facility.description,
        ...(facility.things_to_do ?? []),
        ...(facility.signature_experiences ?? []),
      ].join(" "),
    ),
  )
  .map((facility) => facility.id);
const accountedIds = new Set([...recordById.keys(), ...excludedIds]);
for (const id of candidateIds) {
  assert(accountedIds.has(id), `${id}: all-facility candidate was not audited`);
}

assert(
  !/"art-museum"\s*:\s*\[[^\]]*"craft"/.test(expansionSource),
  "art-museum must not receive craft automatically",
);
assert(
  !accessorSource.includes("recommended_for_tags"),
  "raw recommended_for_tags must not be a publication condition",
);
for (const requiredConsumer of [
  "prefectureCounts",
  "craftTypeCounts",
  "mapFacilities",
  "jsonLdFacilities",
  "paginateFacilities",
]) {
  assert(
    accessorSource.includes(requiredConsumer),
    `single accessor is missing ${requiredConsumer}`,
  );
}
assert(
  pageSource.includes("getFacilitiesForCategoryPage"),
  "category page must use the unified accessor",
);
assert(
  pageSource.includes("result.mapFacilities") &&
    pageSource.includes("result.jsonLdFacilities") &&
    pageSource.includes("result.page.items"),
  "map, JSON-LD, and list must consume the unified result",
);

console.log(
  JSON.stringify({
    visibleFacilitiesScanned: visibleFacilities.length,
    prefecturesScanned: prefectures.length,
    publicCraftFacilities: evidence.records.length,
    candidateSignalsAudited: candidateIds.length,
    firstPagePrimaryTypes: Object.fromEntries(firstPageTypeCounts),
  }),
);
