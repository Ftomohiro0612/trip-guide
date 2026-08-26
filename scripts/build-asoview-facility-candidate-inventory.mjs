import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const CATALOG_PATH = resolve(
  ROOT,
  ".codex/research/asoview-public-page-catalog-2026-08-26.jsonl",
);
const CATALOG_MANIFEST_PATH = resolve(
  ROOT,
  ".codex/research/asoview-public-page-catalog-manifest-2026-08-26.json",
);
const FACILITY_PATH = resolve(ROOT, "data/facilities_data.json");
const OUTPUT_PATH = resolve(
  ROOT,
  "docs/audits/asoview-facility-candidates-2026-08-26.json",
);

const facilityRaw = await readFile(FACILITY_PATH);
const facilityData = JSON.parse(facilityRaw);
const catalogRaw = await readFile(CATALOG_PATH, "utf8");
const catalogManifest = JSON.parse(
  await readFile(CATALOG_MANIFEST_PATH, "utf8"),
);
const EXPECTED_CATALOG_COUNTS = catalogManifest.expected_catalog_counts;
const manifestUrlSet = new Set(catalogManifest.sitemap_urls);
const manifestHash = createHash("sha256")
  .update(JSON.stringify(catalogManifest.sitemap_urls))
  .digest("hex");
if (
  manifestHash !== catalogManifest.sitemap_urls_sha256 ||
  manifestUrlSet.size !== catalogManifest.expected_public_page_count ||
  Object.values(EXPECTED_CATALOG_COUNTS).reduce((sum, count) => sum + count, 0) !==
    catalogManifest.expected_public_page_count
) {
  throw new Error("Asoview sitemap manifest integrity check failed");
}

const outcomesByUrl = new Map();
for (const line of catalogRaw.split("\n")) {
  if (!line) continue;
  try {
    const record = JSON.parse(line);
    if (
      manifestUrlSet.has(record.url) &&
      (record.ok || record.terminal_unavailable)
    ) {
      outcomesByUrl.set(record.url, record);
    }
  } catch {
    // Ignore an interrupted final JSONL line; the fetcher will retry it.
  }
}

const outcomes = [...outcomesByUrl.values()];
const pages = outcomes.filter((record) => record.ok);
const catalogCounts = Object.fromEntries(
  Object.keys(EXPECTED_CATALOG_COUNTS).map((kind) => [
    kind,
    outcomes.filter((page) => page.kind === kind).length,
  ]),
);
const terminalUnavailableCounts = Object.fromEntries(
  Object.keys(EXPECTED_CATALOG_COUNTS).map((kind) => [
    kind,
    outcomes.filter(
      (page) => page.kind === kind && page.terminal_unavailable,
    ).length,
  ]),
);
const catalogComplete = Object.entries(EXPECTED_CATALOG_COUNTS).every(
  ([kind, count]) => catalogCounts[kind] === count,
);

const identities = new Map();
for (const page of pages) {
  const identity = extractProviderIdentity(page);
  if (!identity) continue;
  const normalized = normalize(identity);
  if (normalized.length < 3) continue;
  const bucket = identities.get(normalized) ?? {
    identity,
    normalized,
    pages: [],
  };
  bucket.pages.push(page);
  identities.set(normalized, bucket);
}

const identityList = [...identities.values()];
const facilityNorms = facilityData.facilities.map((facility) => ({
  facility,
  normalized: normalize(facility.name),
}));
const facilityById = new Map(
  facilityData.facilities.map((facility) => [facility.id, facility]),
);
const reverseCanonIdsByIdentity = new Map();

const coverage = [];
const candidateFacilityIds = new Set();
const candidatesByFacilityId = new Map(
  facilityNorms.map(({ facility }) => [facility.id, new Map()]),
);
const facilityByNormalizedName = new Map();
for (const entry of facilityNorms) {
  const bucket = facilityByNormalizedName.get(entry.normalized) ?? [];
  bucket.push(entry.facility);
  facilityByNormalizedName.set(entry.normalized, bucket);
}

for (const identity of identityList) {
  const exactFacilities = facilityByNormalizedName.get(identity.normalized) ?? [];
  for (const facility of exactFacilities) {
    addReverseCanonMatch(identity.normalized, facility.id);
    const target = candidatesByFacilityId.get(facility.id);
    for (const page of identity.pages) {
      target.set(page.url, candidateRecord(page, identity.identity, 100));
    }
  }
}

const identityMatcher = buildMatcher(
  identityList
    .filter(({ normalized }) => normalized.length >= 5)
    .map(({ normalized }) => ({ pattern: normalized, value: normalized })),
);
for (const { facility, normalized } of facilityNorms) {
  const target = candidatesByFacilityId.get(facility.id);
  for (const identityName of identityMatcher.match(normalized)) {
    const identity = identities.get(identityName);
    addReverseCanonMatch(identityName, facility.id);
    for (const page of identity.pages) {
      const prior = target.get(page.url);
      if (!prior || prior.score < 80) {
        target.set(page.url, candidateRecord(page, identity.identity, 80));
      }
    }
  }
}

const facilityMatcher = buildMatcher(
  facilityNorms
    .filter(({ normalized }) => normalized.length >= 4)
    .map(({ facility, normalized }) => ({
      pattern: normalized,
      value: facility.id,
    })),
);

for (const identity of identityList) {
  for (const facilityId of facilityMatcher.match(identity.normalized)) {
    addReverseCanonMatch(identity.normalized, facilityId);
  }
}

for (const page of pages) {
  const titleMatches = facilityMatcher.match(normalize(page.title));
  const descriptionMatches = facilityMatcher.match(normalize(page.description));
  for (const facilityId of new Set([...titleMatches, ...descriptionMatches])) {
    const target = candidatesByFacilityId.get(facilityId);
    const score = titleMatches.includes(facilityId) ? 70 : 60;
    const prior = target.get(page.url);
    if (!prior || score > prior.score) {
      target.set(page.url, candidateRecord(page, "", score));
    }
  }
}

for (const { facility } of facilityNorms) {
  const candidates = [...candidatesByFacilityId.get(facility.id).values()].sort(
    (left, right) => right.score - left.score || left.url.localeCompare(right.url),
  );
  if (candidates.length > 0) candidateFacilityIds.add(facility.id);
  coverage.push({
    facility_id: facility.id,
    facility_slug: facility.slug,
    facility_name: facility.name,
    prefecture: facility.prefecture,
    address: facility.address,
    disposition: candidates.length > 0 ? "candidate" : "no_identity_candidate",
    candidate_page_count: candidates.length,
    candidates,
  });
}

const reverseDiscovery = identityList
  .map((identity) => {
    const relevance = familyRelevance(identity);
    const canonMatches = suggestCanonMatches(identity.normalized);
    return {
      asoview_identity: identity.identity,
      normalized_identity: identity.normalized,
      family_relevance: relevance,
      initial_disposition:
        canonMatches.length > 0 ? "canon_match_candidate" : "unlisted_candidate",
      canon_matches: canonMatches,
      pages: identity.pages.map((page) => ({
        kind: page.kind,
        url: page.canonical_url || page.url,
        title: page.title,
        description: page.description,
      })),
    };
  })
  .filter((identity) => identity.family_relevance.length > 0)
  .sort((left, right) =>
    left.asoview_identity.localeCompare(right.asoview_identity, "ja"),
  );

const reverseDiscoveryPrefilter = identityList
  .map((identity) => {
    const relevance = familyRelevance(identity);
    return {
      asoview_identity: identity.identity,
      normalized_identity: identity.normalized,
      disposition:
        relevance.length > 0
          ? "FAMILY_REVIEW_CANDIDATE"
          : "NO_FAMILY_FACILITY_SIGNAL",
      family_relevance: relevance,
      public_page_count: identity.pages.length,
    };
  })
  .sort((left, right) =>
    left.asoview_identity.localeCompare(right.asoview_identity, "ja"),
  );

const output = {
  schema_version: 1,
  generated_at: new Date().toISOString(),
  source: {
    robots_url: "https://www.asoview.com/robots.txt",
    sitemap_index_url: "https://www.asoview.com/sitemap_index.xml",
    sitemap_urls_sha256: catalogManifest.sitemap_urls_sha256,
    expected_catalog_counts: EXPECTED_CATALOG_COUNTS,
    fetched_catalog_counts: catalogCounts,
    terminal_unavailable_counts: terminalUnavailableCounts,
    actionable_public_page_count: pages.length,
    catalog_complete: catalogComplete,
  },
  facility_canon: {
    count: facilityData.facilities.length,
    sha256: createHash("sha256")
      .update(JSON.stringify(facilityData))
      .digest("hex"),
  },
  reconciliation: {
    facility_count: coverage.length,
    candidate_facility_count: candidateFacilityIds.size,
    no_identity_candidate_count: coverage.length - candidateFacilityIds.size,
    candidate_page_count: coverage.reduce(
      (sum, item) => sum + item.candidate_page_count,
      0,
    ),
    extracted_asoview_identity_count: identityList.length,
    family_reverse_discovery_identity_count: reverseDiscovery.length,
    reverse_discovery_prefilter_identity_count:
      reverseDiscoveryPrefilter.length,
    reverse_discovery_no_family_signal_count:
      reverseDiscoveryPrefilter.filter(
        (identity) => identity.disposition === "NO_FAMILY_FACILITY_SIGNAL",
      ).length,
    family_reverse_discovery_unlisted_candidate_count:
      reverseDiscovery.filter(
        (identity) => identity.initial_disposition === "unlisted_candidate",
      ).length,
  },
  facility_coverage: coverage,
  reverse_discovery_prefilter: reverseDiscoveryPrefilter,
  reverse_discovery_candidates: reverseDiscovery,
};

await writeFile(OUTPUT_PATH, `${JSON.stringify(output, null, 2)}\n`, "utf8");
console.log(JSON.stringify(output.reconciliation, null, 2));
console.log(`catalog_complete=${catalogComplete}`);
console.log(`wrote ${OUTPUT_PATH}`);

function candidateRecord(page, providerIdentity, score) {
  return {
    kind: page.kind,
    url: page.canonical_url || page.url,
    title: page.title,
    description: page.description,
    provider_identity: providerIdentity || undefined,
    score,
  };
}

function extractProviderIdentity(page) {
  if (page.kind === "base") {
    return page.title
      .replace(/^【[^】]*(?:割引|OFF)[^】]*】\s*/iu, "")
      .replace(/のネット予約・口コミ・クーポン情報\s*-\s*アソビュー！?$/u, "")
      .replace(/の前売りチケット・割引情報\s*-\s*アソビュー！?$/u, "")
      .replace(/のリフト券$/u, "")
      .replace(/\s*[|｜]\s*(?:ネット予約なら|割引チケット・クーポンなら)?アソビュー！?$/u, "")
      .trim();
  }
  if (page.kind === "ticket") {
    return page.description.match(/^(.+?)の「/u)?.[1]?.trim() ?? "";
  }
  return "";
}

function normalize(value) {
  return String(value ?? "")
    .normalize("NFKC")
    .toLocaleLowerCase("ja")
    .replace(/&(?:amp|quot|#39);/g, "")
    .replace(/[\s\u3000・･·\/／\\|｜:：,，.。\-‐‑–—―_()（）\[\]【】「」『』!！?？'"`®™]/g, "")
    .replace(/アソビュー!?$/u, "")
    .trim();
}

function buildMatcher(entries) {
  const nodes = [{ next: new Map(), fail: 0, outputs: [] }];
  for (const entry of entries) {
    let nodeIndex = 0;
    for (const character of entry.pattern) {
      let nextIndex = nodes[nodeIndex].next.get(character);
      if (nextIndex === undefined) {
        nextIndex = nodes.length;
        nodes[nodeIndex].next.set(character, nextIndex);
        nodes.push({ next: new Map(), fail: 0, outputs: [] });
      }
      nodeIndex = nextIndex;
    }
    nodes[nodeIndex].outputs.push(entry.value);
  }

  const queue = [];
  for (const child of nodes[0].next.values()) queue.push(child);
  for (let cursor = 0; cursor < queue.length; cursor += 1) {
    const nodeIndex = queue[cursor];
    for (const [character, childIndex] of nodes[nodeIndex].next) {
      queue.push(childIndex);
      let fallback = nodes[nodeIndex].fail;
      while (fallback && !nodes[fallback].next.has(character)) {
        fallback = nodes[fallback].fail;
      }
      nodes[childIndex].fail = nodes[fallback].next.get(character) ?? 0;
      nodes[childIndex].outputs.push(...nodes[nodes[childIndex].fail].outputs);
    }
  }

  return {
    match(text) {
      const matches = [];
      let nodeIndex = 0;
      for (const character of text) {
        while (nodeIndex && !nodes[nodeIndex].next.has(character)) {
          nodeIndex = nodes[nodeIndex].fail;
        }
        nodeIndex = nodes[nodeIndex].next.get(character) ?? 0;
        matches.push(...nodes[nodeIndex].outputs);
      }
      return [...new Set(matches)];
    },
  };
}

function familyRelevance(identity) {
  const identityText = identity.identity;
  const pageText = identity.pages
    .map((page) => `${page.title} ${page.description}`)
    .join(" ");
  const familyAudience = /0歳|１歳|1歳|幼児|小学生|親子|ファミリー|お子様/u.test(
    `${identityText} ${pageText}`,
  );
  const signals = [
    ["aquarium", /水族館/u],
    ["zoo", /動物園|サファリ|アニマル/u],
    ["amusement", /遊園地|テーマパーク|レジャーランド/u],
    ["child_brand", /キッズ|こども|子ども|子供|ジュニア/u],
    ["museum", /ミュージアム|博物館|科学館|美術館|資料館|記念館/u],
    ["railway", /鉄道/u],
    ["park", /パーク|公園|(?<!ポー)(?<!グ)(?<!ラ・ラ・)ランド/u],
    ["farm", /牧場|農園|果樹園|いちご/u],
    ["active_play", /アスレチック|ボルダリング|クライミング|トランポリン|プレイ(?:パーク|ランド)|アドベンチャー|忍者/u],
    ["viewpoint", /展望|タワー/u],
  ];
  const matches = signals
    .filter(([, pattern]) => pattern.test(identityText))
    .map(([label]) => label);
  if (familyAudience && /プール|スキー|スノー/u.test(identityText)) {
    matches.push("water_snow_family");
  }
  if (
    familyAudience &&
    /工房|陶芸|ガラス|とんぼ玉|ものづくり/u.test(identityText)
  ) {
    matches.push("craft_family");
  }
  if (
    familyAudience &&
    /ふれあい|猫カフェ|ねこカフェ|ドッグカフェ/u.test(identityText)
  ) {
    matches.push("animal_contact_family");
  }
  return matches;
}

function suggestCanonMatches(identity) {
  const suggestions = [];
  for (const facilityId of reverseCanonIdsByIdentity.get(identity) ?? []) {
    const facility = facilityById.get(facilityId);
    if (!facility) continue;
    const normalized = normalize(facility.name);
    const exact = identity === normalized;
    suggestions.push({
      facility_id: facility.id,
      facility_slug: facility.slug,
      facility_name: facility.name,
      prefecture: facility.prefecture,
      basis: exact ? "normalized_exact" : "normalized_contains",
      score: exact ? 100 : 90,
    });
  }
  return suggestions
    .sort((left, right) => right.score - left.score || left.facility_id - right.facility_id)
    .slice(0, 8);
}

function addReverseCanonMatch(identity, facilityId) {
  const matches = reverseCanonIdsByIdentity.get(identity) ?? new Set();
  matches.add(facilityId);
  reverseCanonIdsByIdentity.set(identity, matches);
}
