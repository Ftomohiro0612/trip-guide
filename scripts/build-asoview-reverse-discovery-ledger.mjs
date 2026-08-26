import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const INVENTORY_PATH = resolve(
  ROOT,
  "docs/audits/asoview-facility-candidates-2026-08-26.json",
);
const DETAILS_PATH = resolve(
  ROOT,
  ".codex/research/asoview-reverse-discovery-details-2026-08-26.json",
);
const FACILITIES_PATH = resolve(ROOT, "data/facilities_data.json");
const RAKUTEN_AUDIT_PATH = resolve(
  ROOT,
  "docs/audits/rakuten-facility-discovery-candidates-2026-08-26.json",
);
const OUTPUT_PATH = resolve(
  ROOT,
  "docs/audits/asoview-reverse-discovery-candidates-2026-08-26.json",
);
const TEMPORARY_PATTERN =
  /(?:20\d{2}|令和\d+年|第[\d０-９]+回|期間限定|特別展|企画展|巡回展|展覧会|展(?:\d|\s|[（(～〜―「『」』）)]|$)|[（(][^）)]*(?:美術館|博物館|ミュージアム)[^）)]*[）)]|(?:vs\.?|対)[^（(]*(?:美術館|博物館|ミュージアム)|美術館コレクション|ミュージアム（.+美術館|美術館\s*[―-]|XRジャーニー|花火|祭(?:り|典)?|フェス|マルシェ|大会|ライブ|コンサート|公演|ショー|試合|観戦|運動会|イルミネーション|ポップアップ|夏休み|冬休み|ハロウィン|クリスマス|コラボ|会場|ライトづくり|in\s|＠|@|事務局)/iu;
const SERVICE_PATTERN =
  /(?:株式会社$|アウトレットパーク|ショッピングモール|ららぽーと|ホテル|レストラン|ダイニング|宿泊|ツアー|レンタル|バスセット|電車セット|乗車券|連絡協議会|研究会|プログラム|プロジェクト|CARステイ|BBQパーク|\s×\s)/iu;
const ACTIVITY_SERVICE_PATTERN =
  /(?:ツアー|ガイド|ダイビング|シュノーケ|SUP|サップ|カヌー|カヤック|ラフティング|パラグライダー|サーフィン|釣り|レンタル|スクール|アドベンチャーズ|サービス|サポート|クルーズ|ホエールウォッチング)/iu;
const FIXED_VENUE_PATTERN =
  /(?:水族館|動物園|遊園地|テーマパーク|ミュージアム|博物館|科学館|美術館|資料館|記念館|パーク|公園|ランド|牧場|農園|果樹園|いちご園|アスレチック|クライミングジム|ボルダリングジム|トランポリン|工房|陶芸|展望|タワー|スキー場|フォレストアドベンチャー|乗馬クラブ|プレイ(?:パーク|ランド))/iu;
const MANUAL_NOT_ELIGIBLE = new Set([
  "福岡ウォーターパーク",
]);

const [inventory, details, facilityData, rakutenAudit] = await Promise.all([
  readFile(INVENTORY_PATH, "utf8").then(JSON.parse),
  readFile(DETAILS_PATH, "utf8").then(JSON.parse),
  readFile(FACILITIES_PATH, "utf8").then(JSON.parse),
  readFile(RAKUTEN_AUDIT_PATH, "utf8").then(JSON.parse),
]);

if (
  ((!inventory.source.catalog_complete || !details.source_catalog_complete) &&
    process.env.ASOVIEW_ALLOW_INCOMPLETE !== "1") ||
  details.item_count !== inventory.reverse_discovery_candidates.length
) {
  throw new Error("reverse discovery inputs are incomplete");
}

const detailByIdentity = new Map(
  details.items.map((item) => [item.normalized_identity, item]),
);
const facilitiesById = new Map(
  facilityData.facilities.map((facility) => [facility.id, facility]),
);
const facilitiesByAddress = new Map();
const facilitiesByGrid = new Map();
for (const facility of facilityData.facilities) {
  const address = normalizeAddress(facility.address);
  if (address) {
    const matches = facilitiesByAddress.get(address) ?? [];
    matches.push(facility);
    facilitiesByAddress.set(address, matches);
  }
  if (Number.isFinite(facility.latitude) && Number.isFinite(facility.longitude)) {
    const key = gridKey(facility.latitude, facility.longitude);
    const matches = facilitiesByGrid.get(key) ?? [];
    matches.push(facility);
    facilitiesByGrid.set(key, matches);
  }
}
const rakutenByIdentity = new Map();
for (const identity of rakutenAudit.identities) {
  const key = normalizeIdentity(identity.extracted_identity);
  const matches = rakutenByIdentity.get(key) ?? [];
  matches.push(identity);
  rakutenByIdentity.set(key, matches);
}

const identities = inventory.reverse_discovery_candidates.map((candidate) => {
  const detail = detailByIdentity.get(candidate.normalized_identity);
  if (!detail) throw new Error(`missing reverse detail: ${candidate.asoview_identity}`);

  const locationCandidates = [
    ...(facilitiesByAddress.get(normalizeAddress(detail.address)) ?? []),
    ...nearbyFacilities(detail.latitude, detail.longitude),
  ];
  const candidateMatches = [
    ...candidate.canon_matches,
    ...locationCandidates.map((facility) => ({
      facility_id: facility.id,
      facility_slug: facility.slug,
      facility_name: facility.name,
      prefecture: facility.prefecture,
      basis: "location_candidate",
      score: Math.round(
        bigramDice(
          normalizeIdentity(candidate.asoview_identity),
          normalizeIdentity(facility.name),
        ) * 100,
      ),
    })),
  ].filter(
    (match, index, matches) =>
      matches.findIndex(
        (candidateMatch) => candidateMatch.facility_id === match.facility_id,
      ) === index,
  );
  const suggestedMatches = candidateMatches
    .map((match) => ({ ...match, facility: facilitiesById.get(match.facility_id) }))
    .filter(({ facility }) => facility)
    .map(({ facility, ...match }) => ({
      ...match,
      address_matched: Boolean(
        normalizeAddress(detail.address) &&
          normalizeAddress(detail.address) === normalizeAddress(facility.address),
      ),
      distance_meters:
        Number.isFinite(detail.latitude) && Number.isFinite(detail.longitude)
          ? Math.round(
              distanceMeters(
                detail.latitude,
                detail.longitude,
                facility.latitude,
                facility.longitude,
              ),
            )
          : undefined,
    }));
  const duplicateMatch = suggestedMatches.find(
    (match) =>
      match.basis === "normalized_exact" ||
      (match.score >= 80 &&
        (!detail.prefecture || match.prefecture === detail.prefecture)) ||
      (match.score >= 75 && match.address_matched) ||
      (match.score >= 75 && match.distance_meters <= 150),
  );
  const priorRakutenReviews =
    rakutenByIdentity.get(normalizeIdentity(candidate.asoview_identity)) ?? [];
  const productText = candidate.pages
    .map((page) => `${page.title} ${page.description}`)
    .join(" ");
  const activityOnlyService =
    !candidate.pages.some((page) => page.kind === "ticket") &&
    ACTIVITY_SERVICE_PATTERN.test(productText) &&
    !FIXED_VENUE_PATTERN.test(candidate.asoview_identity);

  let status = "OFFICIAL_REVIEW_REQUIRED";
  let reason =
    "Asoview listing is only a discovery lead; official primary identity, address, current operation, and child-use evidence must be reviewed";
  if (duplicateMatch) {
    status = "DUPLICATE";
    reason = `normalized identity/location resolves to facility canon ${duplicateMatch.facility_id}`;
  } else if (MANUAL_NOT_ELIGIBLE.has(candidate.asoview_identity)) {
    status = "NOT_ELIGIBLE";
    reason = "official evidence establishes only a bounded seasonal event, not a permanent facility identity";
  } else if (TEMPORARY_PATTERN.test(candidate.asoview_identity)) {
    status = "NOT_ELIGIBLE";
    reason = "temporary exhibition, event, performance, pop-up, campaign, or organizing identity is not a permanent facility canon addition";
  } else if (SERVICE_PATTERN.test(candidate.asoview_identity)) {
    status = "NOT_ELIGIBLE";
    reason = "hotel, restaurant, bundled service, program, office, or non-independent operating identity is not a facility canon addition";
  } else if (activityOnlyService) {
    status = "NOT_ELIGIBLE";
    reason =
      "activity-only tour, guide, rental, outdoor service, or meeting-point provider does not establish an independent permanent facility identity";
  } else if (
    priorRakutenReviews.some((review) => review.status === "NOT_ELIGIBLE")
  ) {
    status = "NOT_ELIGIBLE";
    reason =
      "same normalized provider identity was already reviewed in the 2026-08-26 Rakuten FacilityOps audit and rejected as temporary, service-only, activity-only, or non-independent";
  } else if (
    priorRakutenReviews.some(
      (review) => review.status === "OFFICIAL_EVIDENCE_INSUFFICIENT",
    )
  ) {
    status = "OFFICIAL_EVIDENCE_INSUFFICIENT";
    reason =
      "same normalized provider identity was already reviewed against official primary sources on 2026-08-26 and did not establish every required condition";
  } else if (!detail.fetch_ok) {
    status = "ASOVIEW_DETAIL_UNAVAILABLE";
    reason = "the discovery detail could not be retrieved from the public Asoview page";
  }

  return {
    asoview_identity: candidate.asoview_identity,
    normalized_identity: candidate.normalized_identity,
    family_relevance: candidate.family_relevance,
    status,
    reason,
    asoview_pages: candidate.pages.map(({ kind, url, title }) => ({
      kind,
      url,
      title,
    })),
    asoview_detail: {
      source_url: detail.source_url,
      canonical_url: detail.canonical_url,
      base_url: detail.base_url,
      address: detail.address,
      prefecture: detail.prefecture,
      latitude: detail.latitude,
      longitude: detail.longitude,
      fetched_at: detail.fetched_at,
      status: detail.status,
      unavailable_marker: detail.visible_unavailable_marker,
    },
    canon_matches: suggestedMatches.map(
      ({ facility_id, facility_slug, facility_name, prefecture, basis, score, address_matched, distance_meters }) => ({
        facility_id,
        facility_slug,
        facility_name,
        prefecture,
        basis,
        score,
        address_matched,
        distance_meters,
      }),
    ),
    resolved_canon_match: duplicateMatch
      ? {
          facility_id: duplicateMatch.facility_id,
          facility_slug: duplicateMatch.facility_slug,
          facility_name: duplicateMatch.facility_name,
        }
      : undefined,
    prior_rakuten_facilityops_reviews: priorRakutenReviews.map(
      ({ candidate_id, status: priorStatus, reason: priorReason }) => ({
        candidate_id,
        status: priorStatus,
        reason: priorReason,
      }),
    ),
  };
});

const statuses = [
  "DUPLICATE",
  "NOT_ELIGIBLE",
  "ASOVIEW_DETAIL_UNAVAILABLE",
  "OFFICIAL_EVIDENCE_INSUFFICIENT",
  "OFFICIAL_REVIEW_REQUIRED",
];
const output = {
  schema_version: 1,
  audited_at: "2026-08-26",
  source_catalog: inventory.source,
  coverage: {
    identity_count: identities.length,
    status_counts: Object.fromEntries(
      statuses.map((status) => [
        status,
        identities.filter((identity) => identity.status === status).length,
      ]),
    ),
  },
  identities,
};

await writeFile(OUTPUT_PATH, `${JSON.stringify(output, null, 2)}\n`, "utf8");
console.log(JSON.stringify(output.coverage, null, 2));

function normalizeAddress(value) {
  return String(value ?? "")
    .normalize("NFKC")
    .replace(/〒\d{3}-?\d{4}/gu, "")
    .replace(/[\s\u3000,，.。\-‐‑–—―]/gu, "")
    .replace(/[０-９]/gu, (digit) => String.fromCharCode(digit.charCodeAt(0) - 0xfee0))
    .trim();
}

function normalizeIdentity(value) {
  return String(value ?? "")
    .normalize("NFKC")
    .toLocaleLowerCase("ja")
    .replace(/[\s\p{P}\p{S}]/gu, "")
    .trim();
}

function nearbyFacilities(latitude, longitude) {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return [];
  const latitudeCell = Math.round(latitude * 1_000);
  const longitudeCell = Math.round(longitude * 1_000);
  const matches = [];
  for (let latitudeOffset = -2; latitudeOffset <= 2; latitudeOffset += 1) {
    for (let longitudeOffset = -2; longitudeOffset <= 2; longitudeOffset += 1) {
      matches.push(
        ...(facilitiesByGrid.get(
          `${latitudeCell + latitudeOffset}:${longitudeCell + longitudeOffset}`,
        ) ?? []),
      );
    }
  }
  return matches;
}

function gridKey(latitude, longitude) {
  return `${Math.round(latitude * 1_000)}:${Math.round(longitude * 1_000)}`;
}

function bigramDice(left, right) {
  if (left === right) return 1;
  if (left.length < 2 || right.length < 2) return 0;
  const pairs = new Map();
  for (let index = 0; index < left.length - 1; index += 1) {
    const pair = left.slice(index, index + 2);
    pairs.set(pair, (pairs.get(pair) ?? 0) + 1);
  }
  let overlap = 0;
  for (let index = 0; index < right.length - 1; index += 1) {
    const pair = right.slice(index, index + 2);
    const count = pairs.get(pair) ?? 0;
    if (count > 0) {
      overlap += 1;
      pairs.set(pair, count - 1);
    }
  }
  return (2 * overlap) / (left.length - 1 + right.length - 1);
}

function distanceMeters(lat1, lon1, lat2, lon2) {
  if (![lat1, lon1, lat2, lon2].every(Number.isFinite)) return Infinity;
  const radians = (degrees) => (degrees * Math.PI) / 180;
  const earthRadius = 6_371_000;
  const latitudeDelta = radians(lat2 - lat1);
  const longitudeDelta = radians(lon2 - lon1);
  const a =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(radians(lat1)) *
      Math.cos(radians(lat2)) *
      Math.sin(longitudeDelta / 2) ** 2;
  return earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
