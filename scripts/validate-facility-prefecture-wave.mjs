import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const BASE_COMMIT = "69b7efcdf123bbf5735e085e5982a01b493584a6";
const CHECK_DATE = "2026-07-19";
const online = process.argv.includes("--online");

const TARGETS = {
  okayama: {
    name: "岡山県",
    host: "www.okayama-kanko.jp",
    bbox: [34.25, 35.35, 133.25, 134.55],
  },
  ishikawa: {
    name: "石川県",
    host: "www.hot-ishikawa.jp",
    bbox: [36.05, 37.95, 136.15, 137.4],
  },
  oita: {
    name: "大分県",
    host: "www.visit-oita.jp",
    bbox: [32.65, 33.75, 130.75, 132.15],
  },
  fukushima: {
    name: "福島県",
    host: "www.tif.ne.jp",
    bbox: [36.7, 38.0, 139.1, 141.1],
  },
  ehime: {
    name: "愛媛県",
    host: "www.iyokannet.jp",
    bbox: [32.85, 34.35, 131.9, 133.75],
  },
  nagasaki: {
    name: "長崎県",
    host: "www.nagasaki-tabinet.com",
    bbox: [31.8, 34.8, 128.0, 130.4],
  },
};

function gitShow(path) {
  return execFileSync("git", ["show", `${BASE_COMMIT}:${path}`], {
    cwd: ROOT,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
}

function normalize(value = "") {
  return value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\s　・･（）()「」『』【】\[\]‐‑‒–—―ー－-]/g, "");
}

function assertUnique(items, key, label) {
  const seen = new Map();
  for (const item of items) {
    const value = key(item);
    assert(!seen.has(value), `${label} duplicate: ${value}`);
    seen.set(value, item.id ?? item.name);
  }
}

async function readText(path) {
  return readFile(resolve(ROOT, path), "utf8");
}

const data = JSON.parse(await readText("data/facilities_data.json"));
const baseData = JSON.parse(gitShow("data/facilities_data.json"));
const registry = JSON.parse(await readText(".codex/events-source-registry.json"));
const activeTargets = Object.entries(TARGETS).filter(([id]) =>
  data.facilities.some((facility) => facility.prefecture_id === id),
);

assert(activeTargets.length > 0, "no target prefecture has been added");
assert.equal(data.metadata.total_facilities, data.facilities.length, "metadata total mismatch");
assert.equal(
  data.metadata.site_description,
  `全国${data.metadata.prefectures.length}都府県の子供向け遊び場検索サイト`,
  "site description prefecture count mismatch",
);
assertUnique(data.facilities, (facility) => String(facility.id), "facility id");
assertUnique(data.facilities, (facility) => facility.slug, "facility slug");
assertUnique(
  data.facilities,
  (facility) => `${normalize(facility.name)}|${normalize(facility.address)}`,
  "facility name/address",
);

const currentById = new Map(data.facilities.map((facility) => [facility.id, facility]));
for (const baseFacility of baseData.facilities) {
  assert.deepEqual(
    currentById.get(baseFacility.id),
    baseFacility,
    `existing facility changed: ${baseFacility.id} ${baseFacility.name}`,
  );
}

for (const path of [
  "data/events_data.json",
  "data/summer_events_2026.json",
  "data/summer_event_locations_2026.json",
]) {
  assert.deepEqual(
    JSON.parse(await readText(path)),
    JSON.parse(gitShow(path)),
    `Summer Hub source changed: ${path}`,
  );
}

const categoryIds = new Set(data.metadata.categories.map((category) => category.id));
const targetFacilities = [];
for (const [id, spec] of activeTargets) {
  const facilities = data.facilities.filter((facility) => facility.prefecture_id === id);
  const meta = data.metadata.prefectures.find((prefecture) => prefecture.id === id);
  assert.equal(facilities.length, 120, `${id}: expected 120 facilities`);
  assert.equal(meta?.name, spec.name, `${id}: prefecture metadata name mismatch`);
  assert.equal(meta?.count, facilities.length, `${id}: prefecture metadata count mismatch`);
  assertUnique(facilities, (facility) => normalize(facility.name), `${id} facility name`);

  const [minLat, maxLat, minLng, maxLng] = spec.bbox;
  for (const facility of facilities) {
    assert(facility.address.startsWith(spec.name), `${facility.name}: prefecture/address mismatch`);
    assert(facility.address.length >= spec.name.length + 3, `${facility.name}: address lacks detail`);
    assert(categoryIds.has(facility.category_id), `${facility.name}: unknown category`);
    assert.equal(facility.slug, `facility-${facility.id}`, `${facility.name}: slug mismatch`);
    assert(["屋内", "屋外", "両方"].includes(facility.indoor_outdoor), `${facility.name}: indoor/outdoor missing`);
    assert(["◎", "△", "×"].includes(facility.rain_friendly), `${facility.name}: rain suitability missing`);
    assert(["無料", "有料"].includes(facility.fee_type), `${facility.name}: fee type missing`);
    assert(typeof facility.adult_fee === "string" && facility.adult_fee, `${facility.name}: adult fee missing`);
    assert(typeof facility.child_fee === "string" && facility.child_fee, `${facility.name}: child fee missing`);
    assert(typeof facility.target_age === "string" && facility.target_age, `${facility.name}: target age missing`);
    assert(typeof facility.description === "string" && facility.description.length >= 50, `${facility.name}: description too short`);
    assert(Array.isArray(facility.signature_experiences) && facility.signature_experiences.length >= 3, `${facility.name}: signature experiences missing`);
    assert(Array.isArray(facility.experience_tags) && facility.experience_tags.length >= 3, `${facility.name}: experience tags missing`);
    assert(Array.isArray(facility.recommended_for_tags) && facility.recommended_for_tags.length >= 2, `${facility.name}: recommendations missing`);
    assert(Array.isArray(facility.things_to_do) && facility.things_to_do.length >= 3, `${facility.name}: things_to_do missing`);
    assert(Number.isFinite(facility.latitude) && Number.isFinite(facility.longitude), `${facility.name}: coordinates missing`);
    assert(facility.latitude >= minLat && facility.latitude <= maxLat && facility.longitude >= minLng && facility.longitude <= maxLng, `${facility.name}: coordinate/prefecture mismatch`);
    assert.equal(facility.geocode_source, "manual", `${facility.name}: coordinate provenance mismatch`);
    const url = new URL(facility.url);
    assert.equal(url.protocol, "https:", `${facility.name}: non-HTTPS source`);
    assert.equal(url.hostname, spec.host, `${facility.name}: source is not the official prefectural tourism site`);
    assert.equal(facility.source_urls, facility.url, `${facility.name}: canonical source mismatch`);
    assert.equal(facility.source_checked_at, CHECK_DATE, `${facility.name}: source check date mismatch`);
    assert.equal(facility.data_quality_status, "confirmed", `${facility.name}: data quality is not confirmed`);
    assert(facility.source_notes.includes("公式"), `${facility.name}: source provenance note missing`);
  }

  const registryRows = registry.facilities.filter((row) => row.prefecture === id);
  assert.equal(registryRows.length, facilities.length, `${id}: source registry count mismatch`);
  assert.equal(registry.meta.per_prefecture_count[id], facilities.length, `${id}: registry metadata count mismatch`);
  const registryById = new Map(registryRows.map((row) => [row.facility_id, row]));
  for (const facility of facilities) {
    assert.equal(registryById.get(facility.id)?.official_event_url, facility.url, `${facility.name}: registry official URL mismatch`);
  }
  targetFacilities.push(...facilities);
}

for (const prefecture of data.metadata.prefectures) {
  assert.equal(
    prefecture.count,
    data.facilities.filter((facility) => facility.prefecture_id === prefecture.id).length,
    `${prefecture.id}: global metadata count mismatch`,
  );
}
for (const category of data.metadata.categories) {
  assert.equal(
    category.count,
    data.facilities.filter((facility) => facility.category_id === category.id).length,
    `${category.id}: category metadata count mismatch`,
  );
}
assert.equal(registry.meta.total, registry.facilities.length, "registry total mismatch");

const sourceSurfaces = {
  "types/facility.ts": activeTargets.map(([id]) => `\"${id}\"`),
  "components/MapView.tsx": activeTargets.map(([id]) => `${id}:`),
  "lib/descriptions.ts": activeTargets.map(([id]) => `${id}:`),
  "lib/icons.ts": activeTargets.flatMap(([id]) => [`${id}:`, `/images/prefectures/${id}.webp`]),
  "scripts/audit-data-quality.mjs": activeTargets.flatMap(([id, spec]) => [spec.name, `${spec.name}: \"${id}\"`]),
  "scripts/geocode.mjs": activeTargets.map(([id]) => `${id}:`),
  "scripts/sync-from-sheet.ts": activeTargets.map(([id, spec]) => `${spec.name}: \"${id}\"`),
};
for (const [path, needles] of Object.entries(sourceSurfaces)) {
  const source = await readText(path);
  for (const needle of needles) assert(source.includes(needle), `${path}: missing ${needle}`);
}

if (online) {
  const urls = [...new Set(targetFacilities.map((facility) => facility.url))];
  let index = 0;
  const failures = [];
  async function worker() {
    while (index < urls.length) {
      const url = urls[index];
      index += 1;
      try {
        const response = await fetch(url, {
          headers: { "User-Agent": "Memorip facility validator/2026 (+https://trip-guide.net)" },
          redirect: "follow",
          signal: AbortSignal.timeout(30_000),
        });
        if (!response.ok) failures.push(`${response.status} ${url}`);
      } catch (error) {
        failures.push(`${error?.message ?? error} ${url}`);
      }
    }
  }
  await Promise.all(Array.from({ length: 8 }, () => worker()));
  assert.deepEqual(failures, [], `official URL failures:\n${failures.join("\n")}`);
}

console.log(
  JSON.stringify({
    status: "PASS",
    baseFacilitiesUnchanged: baseData.facilities.length,
    summerHubSourcesUnchanged: 3,
    prefectures: Object.fromEntries(activeTargets.map(([id]) => [id, 120])),
    added: targetFacilities.length,
    total: data.facilities.length,
    officialUrlsCheckedOnline: online ? new Set(targetFacilities.map((facility) => facility.url)).size : 0,
  }),
);
