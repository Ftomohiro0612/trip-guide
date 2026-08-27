import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { basename, resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const INPUT_PATH = resolve(
  ROOT,
  "docs/audits/asoview-reverse-discovery-candidates-2026-08-26.json",
);
const FACILITIES_PATH = resolve(ROOT, "data/facilities_data.json");
const SEARCH_SEEDS_PATH = resolve(
  ROOT,
  "scripts/data/asoview-independent-search-seeds-2026-08-26.json",
);
const CACHE_DIR = resolve(ROOT, ".codex/research/asoview-second-pass-2026-08-27");
const CACHE_PATH = resolve(CACHE_DIR, "cache.json");
const OUTPUT_PATH = resolve(
  ROOT,
  "docs/audits/asoview-reverse-discovery-second-pass-2026-08-27.json",
);
const CHECKED_AT = "2026-08-27";
const REVIEW_VERSION = 7;
const CONCURRENCY = Math.max(
  1,
  Number(process.env.ASOVIEW_SECOND_PASS_CONCURRENCY ?? 5),
);
const MAX_PAGES_PER_CANDIDATE = Math.max(
  8,
  Number(process.env.ASOVIEW_SECOND_PASS_MAX_PAGES ?? 20),
);
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/140 Safari/537.36 MemoripFacilityOpsOfficialSecondPass/1.0";
const PREFECTURES = [
  "北海道", "青森県", "岩手県", "宮城県", "秋田県", "山形県", "福島県",
  "茨城県", "栃木県", "群馬県", "埼玉県", "千葉県", "東京都", "神奈川県",
  "新潟県", "富山県", "石川県", "福井県", "山梨県", "長野県", "岐阜県",
  "静岡県", "愛知県", "三重県", "滋賀県", "京都府", "大阪府", "兵庫県",
  "奈良県", "和歌山県", "鳥取県", "島根県", "岡山県", "広島県", "山口県",
  "徳島県", "香川県", "愛媛県", "高知県", "福岡県", "佐賀県", "長崎県",
  "熊本県", "大分県", "宮崎県", "鹿児島県", "沖縄県",
];
const PREFECTURE_PATTERN = `(?:${PREFECTURES.join("|")})`;
const CHILD_PATTERN =
  /(?:0|０|1|１|2|２|3|３|4|４|5|５|6|６|7|７|8|８|9|９|10|１０|11|１１|12|１２|13|１３|14|１４|15|１５|16|１６|17|１７|18|１８)\s*歳|乳児|幼児|未就学|園児|小学生|中学生|高校生|子ども|子供|こども|お子様|親子|保護者同伴|小人|こども料金|子供料金/iu;
const EXPLICIT_CHILD_USE_PATTERN =
  /(?:(?:乳児|幼児|未就学|園児|小学生|中学生|高校生|子ども|子供|こども|お子様|小人|キッズ)[^。\n]{0,90}(?:料金|円|無料|対象|利用|入場|入園|入館|参加|体験|同伴|以上|以下|未満)|(?:料金|円|無料|対象|利用|入場|入園|入館|参加|体験)[^。\n]{0,90}(?:乳児|幼児|未就学|園児|小学生|中学生|高校生|子ども|子供|こども|お子様|小人|キッズ)|(?:\d{1,2}|[０-９]{1,2})\s*歳[^。\n]{0,90}(?:料金|円|無料|対象|利用|入場|入園|入館|参加|体験|以上|以下|未満|同伴)|保護者(?:の)?同伴)/iu;
const CURRENT_PATTERN =
  /営業時間|開館時間|開園時間|営業日|利用時間|受付時間|休館日|休園日|定休日|入館料|入園料|利用料金|料金表|営業カレンダー|営業予定|本日の営業|予約受付|チケット(?:購入|販売)|ご利用案内/iu;
const PERMANENTLY_CLOSED_PATTERN =
  /閉館しました|閉園しました|閉店しました|廃業(?:しました)?|施設を廃止|(?:当館|当園|当店|当施設|店舗|施設)[^。\n]{0,50}(?:営業終了|閉鎖|閉館|閉園|閉店)/iu;
const CHILD_PRIORITY_PATTERN =
  /料金|price|fee|ticket|チケット|利用案内|guide|faq|よくある|予約|reserve|booking|年齢|age|保護者|child|kids?|calendar|営業/iu;
const INTERNAL_PRIORITY_PATTERN =
  /料金|price|fee|ticket|チケット|利用案内|guide|faq|よくある|予約|reserve|booking|アクセス|access|店舗|store|施設|facility|営業|hours?|calendar|年齢|age|保護者|child|kids?|入館|入園|利用|about|outline|概要|pdf/iu;
const OFFICIAL_BOOKING_HOST_PATTERN =
  /(?:reserva\.be|select-type\.com|airreserve\.net|stores\.jp|square\.site|peatix\.com|passmarket\.yahoo\.co\.jp|e-tix\.jp|webket\.jp|ticketbook\.jp)$/iu;
const BLOCKED_HOST_PATTERN =
  /(?:asoview\.com|iko-yo\.net|jalan\.|tripadvisor\.|wikipedia\.org|google\.|yahoo\.|yimg\.|bing\.com|mapion\.co\.jp|navitime\.co\.jp|rurubu\.jp|activityjapan\.com|kkday\.com|klook\.com|trip\.com|veltra\.com|nta\.co\.jp|jtb\.co\.jp|tour\.ne\.jp|tenki\.jp|mapple\.net|tabiwaza\.jp|fitmap\.jp|ekiten\.jp|rockgym\.jp|climbing-net\.com|climbers-web\.jp|enjoytokyo\.jp|instagram\.com|facebook\.com|(?:^|\.)x\.com|line\.me|ameblo\.jp|ameba\.jp|hatenablog\.com|note\.com|4travel\.jp|skyticket\.jp|japan-guide\.com|matcha-jp\.com|walkerplus\.com|tabelog\.com|hotpepper\.jp|prtimes\.jp|atpress\.ne\.jp|value-press\.com|impress\.co\.jp|itmedia\.co\.jp|news-fukabori\.com|pretty-online\.jp|kurashi-no\.jp|x-play\.jp|production\.x-play\.jp|training\.greenfield\.style|kids-school\.|kodomo-booster\.com|asreet\.com|nap-camp\.com|waribikinavi\.jp|museum\.or\.jp|travel\.watch\.|honda\.co\.jp|montbell\.jp|weathernews\.jp|jalan\.net|goo\.ne\.jp|4gamer\.net|reuters\.|oricon\.|knt\.co\.jp|yado\.knt\.co\.jp|h-takarajima\.com|keizai\.biz|bavi\.jp|playablejapan\.com|producer\.or\.jp|yaeyama\.or\.jp|ibarakiguide\.jp|hot-ishikawa\.jp|miyaginavi\.jp|maruchiba|crossroadfukuoka|tochigiji\.or\.jp|aichinow|japan47go)/iu;
const TOURISM_PORTAL_PATTERN =
  /(?:kankou|tourism|visit-|travel|tabi|kanko|story|maruchiba|crossroadfukuoka|tochigiji|aichinow|japan47go|hyogo-tourism|feel-kobe)/iu;

await mkdir(CACHE_DIR, { recursive: true });
const [ledger, facilityData, searchSeeds] = await Promise.all([
  readFile(INPUT_PATH, "utf8").then(JSON.parse),
  readFile(FACILITIES_PATH, "utf8").then(JSON.parse),
  readFile(SEARCH_SEEDS_PATH, "utf8").then(JSON.parse),
]);
const targets = ledger.identities.filter(
  (identity) => identity.status === "OFFICIAL_EVIDENCE_INSUFFICIENT",
);
if (targets.length !== 741) {
  throw new Error(`expected 741 second-pass targets, found ${targets.length}`);
}
const seedByIdentity = new Map(
  searchSeeds.items.map((item) => [item.asoview_identity, item]),
);
const cache = await readJson(CACHE_PATH, {
  schema_version: 1,
  generated_at: new Date().toISOString(),
  searches: {},
  pages: {},
});
const priorOutput = await readJson(OUTPUT_PATH, null);
const reviewByIdentity = new Map(
  (priorOutput?.review_version === REVIEW_VERSION ? priorOutput.reviews : [])
    .filter((review) => review.review_complete && !review.processing_error)
    .map((review) => [review.asoview_identity, review]),
);

const reviews = targets.map((target) =>
  reviewByIdentity.get(target.asoview_identity) ?? makePendingReview(target),
);
await saveOutput();
if (process.argv.includes("--classify-only")) {
  console.log(JSON.stringify(summarize(), null, 2));
  process.exit(0);
}

const pending = reviews.filter((review) => !review.review_complete);
let cursor = 0;
let completedThisRun = 0;
await Promise.all(
  Array.from({ length: Math.min(CONCURRENCY, pending.length || 1) }, worker),
);
await saveCache();
await saveOutput();
console.log(JSON.stringify(summarize(), null, 2));

async function worker() {
  while (true) {
    const index = cursor++;
    if (index >= pending.length) return;
    const review = pending[index];
    const target = targets.find(
      (candidate) => candidate.asoview_identity === review.asoview_identity,
    );
    try {
      Object.assign(review, await reviewTarget(target));
    } catch (error) {
      Object.assign(review, {
        review_complete: true,
        final_status: "OFFICIAL_EVIDENCE_INSUFFICIENT",
        final_missing_conditions: [
          "identity",
          "address",
          "current_operation",
          "child_use",
        ],
        final_insufficiency_code: "MULTIPLE_EVIDENCE_INSUFFICIENT",
        reason: "second-pass public official-source exploration failed closed",
        processing_error: error instanceof Error ? error.message : String(error),
        checked_at: CHECKED_AT,
      });
    }
    completedThisRun += 1;
    if (completedThisRun % 5 === 0 || completedThisRun === pending.length) {
      await saveCache();
      await saveOutput();
      const summary = summarize();
      console.log(
        `reviewed=${completedThisRun}/${pending.length} total=${summary.completed_count}/741 add=${summary.final_status_counts.ADD ?? 0} duplicate=${summary.final_status_counts.DUPLICATE ?? 0} not_eligible=${summary.final_status_counts.NOT_ELIGIBLE ?? 0} insufficient=${summary.final_status_counts.OFFICIAL_EVIDENCE_INSUFFICIENT ?? 0}`,
      );
    }
  }
}

function makePendingReview(target) {
  const initial = classifyInitialInsufficiency(target);
  return {
    asoview_identity: target.asoview_identity,
    normalized_identity: target.normalized_identity,
    review_complete: false,
    initial_status: "OFFICIAL_EVIDENCE_INSUFFICIENT",
    initial_insufficiency_code: initial.code,
    initial_missing_conditions: initial.missing,
    priority_child_use_only:
      initial.missing.length === 1 && initial.missing[0] === "child_use",
  };
}

function classifyInitialInsufficiency(target) {
  const rows = priorEvidenceRows(target).filter(isPlausiblePrimaryEvidenceRow);
  const conditions = {
    identity: rows.some((row) => Number(row.identity_score ?? 0) >= 70),
    address: rows.some((row) => row.location_matched === true),
    current_operation: rows.some((row) => row.current_operation_matched === true),
    child_use: rows.some((row) => row.child_use_matched === true),
  };
  const missing = Object.entries(conditions)
    .filter(([, satisfied]) => !satisfied)
    .map(([condition]) => condition);
  return { code: insufficiencyCode(missing), missing };
}

async function reviewTarget(target) {
  const seed = seedByIdentity.get(target.asoview_identity);
  const firstPassUrls = unique([
    ...(seed?.urls ?? []),
    ...priorEvidenceRows(target).map((row) => row.url),
  ]).filter(isHttpUrl);
  const seedPages = await fetchCandidateSeeds(target, firstPassUrls);
  let officialHosts = chooseOfficialHosts(target, seedPages);
  let searchQueries = [];
  let searchUrls = [];

  if (officialHosts.length === 0) {
    const query = `"${target.asoview_identity}" 公式 住所 営業時間`;
    searchQueries.push(query);
    searchUrls.push(...(await yahooSearch(query)));
    const searchedPages = await fetchCandidateSeeds(target, searchUrls.slice(0, 10));
    seedPages.push(...searchedPages);
    officialHosts = chooseOfficialHosts(target, seedPages);
  }

  let pages = await crawlOfficialHosts(target, officialHosts, seedPages);
  let evidence = aggregateEvidence(target, pages, officialHosts);

  if (
    evidence.identity.satisfied &&
    evidence.address.satisfied &&
    evidence.current_operation.satisfied &&
    !evidence.child_use.satisfied
  ) {
    const query = `"${target.asoview_identity}" 小学生 幼児 料金 FAQ 予約`;
    searchQueries.push(query);
    const urls = await yahooSearch(query);
    searchUrls.push(...urls);
    const childPages = await fetchCandidateSeeds(target, urls.slice(0, 10));
    const additionalHosts = chooseOfficialHosts(target, [
      ...seedPages,
      ...childPages,
    ]).filter((host) => !officialHosts.includes(host));
    officialHosts = unique([...officialHosts, ...additionalHosts]);
    pages = uniquePages([
      ...pages,
      ...(await crawlOfficialHosts(
        target,
        officialHosts,
        [...seedPages, ...childPages],
        true,
      )),
    ]);
    evidence = aggregateEvidence(target, pages, officialHosts);
  }

  const notEligible = classifyNotEligible(target, evidence, pages);
  if (notEligible) {
    return {
      review_complete: true,
      final_status: "NOT_ELIGIBLE",
      reason: notEligible.reason,
      not_eligible_basis: notEligible,
      evidence,
      official_hosts: officialHosts,
      search_queries: searchQueries,
      inspected_page_count: pages.length,
      inspected_pages: summarizePages(pages),
      checked_at: CHECKED_AT,
    };
  }

  const missing = Object.entries(evidence)
    .filter(([, item]) => !item.satisfied)
    .map(([condition]) => condition);
  if (missing.length > 0) {
    return {
      review_complete: true,
      final_status: "OFFICIAL_EVIDENCE_INSUFFICIENT",
      final_missing_conditions: missing,
      final_insufficiency_code: insufficiencyCode(missing),
      reason: `second-pass official-source exploration did not establish: ${missing.join(", ")}`,
      evidence,
      official_hosts: officialHosts,
      search_queries: searchQueries,
      inspected_page_count: pages.length,
      inspected_pages: summarizePages(pages),
      checked_at: CHECKED_AT,
    };
  }

  const duplicate = findDuplicate(
    target,
    evidence.address.value,
    evidence.identity.official_name,
  );
  if (duplicate) {
    return {
      review_complete: true,
      final_status: "DUPLICATE",
      reason:
        "second-pass official identity and address resolve to an existing facility canon entry",
      duplicate: {
        facility_id: duplicate.id,
        facility_slug: duplicate.slug,
        facility_name: duplicate.name,
        facility_address: duplicate.address,
      },
      evidence,
      official_hosts: officialHosts,
      search_queries: searchQueries,
      inspected_page_count: pages.length,
      inspected_pages: summarizePages(pages),
      checked_at: CHECKED_AT,
    };
  }

  const coordinates = await geocode(evidence.address.value, target);
  return {
    review_complete: true,
    final_status: "ADD",
    reason:
      "second-pass official primary sources establish identity, address, current operation, and explicit child-use conditions",
    evidence,
    official_hosts: officialHosts,
    search_queries: searchQueries,
    inspected_page_count: pages.length,
    inspected_pages: summarizePages(pages),
    facility: buildAddition(target, evidence, coordinates),
    checked_at: CHECKED_AT,
  };
}

function priorEvidenceRows(target) {
  if (Array.isArray(target.official_evidence?.inspected_results)) {
    return target.official_evidence.inspected_results;
  }
  return target.official_evidence
    ? [
        {
          ...target.official_evidence,
          url: target.official_evidence.url ?? target.official_evidence.official_url,
          official_address: target.official_evidence.official_address,
          identity_score: target.official_evidence.identity_score,
          current_operation_matched:
            target.official_evidence.current_operation_matched,
          child_use_matched: target.official_evidence.child_use_matched,
        },
      ]
    : [];
}

function isPlausiblePrimaryEvidenceRow(row) {
  if (!row?.url || row.fetch_error) return false;
  try {
    const host = new URL(row.url).hostname;
    return !BLOCKED_HOST_PATTERN.test(host) && !TOURISM_PORTAL_PATTERN.test(host);
  } catch {
    return false;
  }
}

async function fetchCandidateSeeds(target, urls) {
  const pages = [];
  for (const url of unique(urls).slice(0, 14)) {
    if (!isHttpUrl(url)) continue;
    let parsed;
    try {
      parsed = new URL(url);
    } catch {
      continue;
    }
    if (BLOCKED_HOST_PATTERN.test(parsed.hostname)) continue;
    const page = await fetchPage(url);
    if (!page.error) pages.push(page);
  }
  const officialLabelLinks = uniqueBy(
    pages.flatMap((page) =>
      (page.links ?? [])
        .filter((link) =>
          /公式(?:サイト|ホームページ|ページ)|施設HP|ホームページはこちら/iu.test(
            link.text,
          ),
        )
        .map((link) => ({ ...link, source_url: page.final_url ?? page.url })),
    ),
    (link) => link.url,
  ).slice(0, 5);
  for (const link of officialLabelLinks) {
    if (BLOCKED_HOST_PATTERN.test(hostname(link.url))) continue;
    const page = await fetchPage(link.url);
    if (page.error) continue;
    page.discovered_by_official_link_label = true;
    page.discovery_source_url = link.source_url;
    pages.push(page);
  }
  const hosts = unique(pages.map((page) => hostname(page.final_url ?? page.url)))
    .filter((host) => host && !BLOCKED_HOST_PATTERN.test(host))
    .slice(0, 8);
  for (const host of hosts) {
    const scheme = pages.find(
      (page) => hostname(page.final_url ?? page.url) === host,
    )?.final_url ?? `https://${host}/`;
    const rootUrl = new URL("/", scheme).href;
    const page = await fetchPage(rootUrl);
    if (page.error) continue;
    page.root_probe = true;
    pages.push(page);
  }
  return uniquePages(pages);
}

function chooseOfficialHosts(target, pages) {
  const grouped = Map.groupBy(pages, (page) => hostname(page.final_url ?? page.url));
  const ranked = [];
  for (const [host, hostPages] of grouped) {
    if (!host || BLOCKED_HOST_PATTERN.test(host)) continue;
    const publicOperator =
      isGovernmentHost(host) && isPublicOperatorCandidate(target.asoview_identity);
    const tourismPortal = TOURISM_PORTAL_PATTERN.test(host);
    const maxIdentity = Math.max(
      ...hostPages.map((page) => identityScore(target.asoview_identity, page)),
    );
    const rootIdentity = Math.max(
      0,
      ...hostPages
        .filter((page) => page.root_probe)
        .map((page) => identityScore(target.asoview_identity, page)),
    );
    const discoveredByOfficialLabel = hostPages.some(
      (page) => page.discovered_by_official_link_label,
    );
    const domainMatched = domainIdentityMatched(target.asoview_identity, host);
    const officialSignals = hostPages.some(
      (page) =>
        extractAddresses(page, target.asoview_identity).length > 0 ||
        CURRENT_PATTERN.test(page.text) ||
        CHILD_PATTERN.test(page.text),
    );
    if (
      (publicOperator && maxIdentity >= 0.45) ||
      (!tourismPortal &&
        maxIdentity >= 0.72 &&
        officialSignals &&
        (rootIdentity >= 0.55 || discoveredByOfficialLabel || domainMatched))
    ) {
      ranked.push({
        host,
        score:
          maxIdentity +
          (rootIdentity >= 0.55 ? 0.35 : 0) +
          (discoveredByOfficialLabel ? 0.3 : 0) +
          (domainMatched ? 0.2 : 0) -
          (publicOperator ? 0.1 : 0),
      });
    }
  }
  return ranked
    .sort((left, right) => right.score - left.score)
    .slice(0, 1)
    .map((item) => item.host);
}

async function crawlOfficialHosts(target, officialHosts, seedPages, childOnly = false) {
  const pages = uniquePages(
    seedPages.filter((page) => officialHosts.includes(hostname(page.final_url ?? page.url))),
  );
  const queue = [];
  for (const page of pages) {
    for (const link of page.links ?? []) {
      if (isCrawlableOfficialLink(link, page, officialHosts)) {
        queue.push(scoreLink(link, target.asoview_identity, childOnly));
      }
    }
    const origin = new URL(page.final_url ?? page.url).origin;
    for (const path of [
      "/", "/price/", "/fee/", "/guide/", "/information/", "/faq/",
      "/access/", "/ticket/", "/reserve/", "/reservation/", "/calendar/",
    ]) {
      queue.push({ url: new URL(path, origin).href, score: path === "/" ? 25 : 10 });
    }
  }
  const visited = new Set(pages.map((page) => canonicalUrl(page.final_url ?? page.url)));
  queue.sort((left, right) => right.score - left.score);
  while (queue.length && pages.length < MAX_PAGES_PER_CANDIDATE) {
    const next = queue.shift();
    const key = canonicalUrl(next.url);
    if (visited.has(key)) continue;
    visited.add(key);
    const page = await fetchPage(next.url);
    if (page.error) continue;
    if (next.linked_from_official) page.linked_from_official = true;
    const finalHost = hostname(page.final_url ?? page.url);
    const linkedBooking = page.linked_from_official === true;
    if (!officialHosts.includes(finalHost) && !linkedBooking) continue;
    pages.push(page);
    if (pages.length >= MAX_PAGES_PER_CANDIDATE) break;
    for (const link of page.links ?? []) {
      if (isCrawlableOfficialLink(link, page, officialHosts)) {
        queue.push(scoreLink(link, target.asoview_identity, childOnly));
      }
    }
    queue.sort((left, right) => right.score - left.score);
  }
  return uniquePages(pages);
}

function isCrawlableOfficialLink(link, sourcePage, officialHosts) {
  if (!isHttpUrl(link.url)) return false;
  if (/(?:login|logout|member|account|password|passwd|checkout|cart)/iu.test(link.url)) {
    return false;
  }
  const host = hostname(link.url);
  if (officialHosts.includes(host)) {
    return INTERNAL_PRIORITY_PATTERN.test(`${link.text} ${link.url}`);
  }
  if (
    OFFICIAL_BOOKING_HOST_PATTERN.test(host) &&
    /予約|チケット|購入|料金|reserve|booking|ticket/iu.test(`${link.text} ${link.url}`)
  ) {
    const cached = cache.pages[canonicalUrl(link.url)];
    if (cached) cached.linked_from_official = true;
    link.linked_from_official = true;
    return true;
  }
  return false;
}

function scoreLink(link, identity, childOnly) {
  const text = `${link.text} ${link.url}`;
  let score = childOnly && CHILD_PRIORITY_PATTERN.test(text) ? 100 : 0;
  if (INTERNAL_PRIORITY_PATTERN.test(text)) score += 40;
  if (/pdf(?:$|\?)/iu.test(link.url)) score += 25;
  if (normalize(text).includes(normalize(coreIdentity(identity)))) score += 20;
  return { url: link.url, score, linked_from_official: link.linked_from_official };
}

function aggregateEvidence(target, pages, officialHosts) {
  const officialPages = pages.filter((page) => {
    const host = hostname(page.final_url ?? page.url);
    return officialHosts.includes(host) || page.linked_from_official === true;
  });
  const identityPage = officialPages
    .map((page) => ({ page, score: identityScore(target.asoview_identity, page) }))
    .sort((left, right) => right.score - left.score)[0];
  const addressCandidates = officialPages.flatMap((page) => {
    const addresses = extractAddresses(page, target.asoview_identity);
    return addresses.map((address) => ({
      page,
      address,
      page_address_count: addresses.length,
      facility_proximity: addressFacilityProximity(target, page, address),
    }));
  });
  const expectedPrefecture = target.asoview_detail?.prefecture ?? "";
  const addressCandidate = addressCandidates
    .filter(
      (item) =>
        extractPrefecture(item.address.value) &&
        item.address.score >= 50 &&
        (!expectedPrefecture ||
          extractPrefecture(item.address.value) === expectedPrefecture) &&
        (!isGovernmentHost(hostname(item.page.final_url ?? item.page.url)) ||
          publicAddressIsFacilitySpecific(target, item)) &&
        (item.page_address_count <= 1 || item.facility_proximity > 0),
    )
    .sort(
      (left, right) =>
        right.address.score +
        right.facility_proximity * 120 +
        targetPageAffinity(target, right.page) -
        (left.address.score +
          left.facility_proximity * 120 +
          targetPageAffinity(target, left.page)),
    )[0];
  const currentPage = officialPages
    .filter(
      (page) => CURRENT_PATTERN.test(page.text) && !PERMANENTLY_CLOSED_PATTERN.test(page.text),
    )
    .sort(
      (left, right) =>
        targetPageAffinity(target, right) - targetPageAffinity(target, left),
    )[0];
  const childPage = officialPages
    .filter((page) => EXPLICIT_CHILD_USE_PATTERN.test(page.text))
    .sort(
      (left, right) =>
        targetPageAffinity(target, right) - targetPageAffinity(target, left),
    )[0];
  const officialName = identityPage
    ? extractOfficialName(target.asoview_identity, identityPage.page)
    : "";
  return {
    identity: evidenceItem(
      Boolean(identityPage && identityPage.score >= 0.72),
      identityPage?.page,
      identityPage
        ? snippet(identityPage.page.text, identityRegex(target.asoview_identity))
        : "",
      { score: identityPage?.score ?? 0, official_name: officialName },
    ),
    address: evidenceItem(
      Boolean(addressCandidate),
      addressCandidate?.page,
      addressCandidate?.address.excerpt ?? "",
      { value: addressCandidate?.address.value ?? "" },
    ),
    current_operation: evidenceItem(
      Boolean(currentPage),
      currentPage,
      currentPage ? snippet(currentPage.text, CURRENT_PATTERN) : "",
    ),
    child_use: evidenceItem(
      Boolean(childPage),
      childPage,
      childPage ? snippet(childPage.text, EXPLICIT_CHILD_USE_PATTERN) : "",
    ),
  };
}

function evidenceItem(satisfied, page, excerpt, extra = {}) {
  return {
    satisfied,
    url: page?.final_url ?? page?.url ?? "",
    title: page?.title ?? "",
    source_type: page ? sourceType(page) : "",
    excerpt: compact(excerpt).slice(0, 360),
    ...extra,
  };
}

function classifyNotEligible(target, evidence, pages) {
  const identity = target.asoview_identity;
  const officialText = pages
    .filter((page) => {
      const url = page.final_url ?? page.url;
      return url === evidence.identity.url || url === evidence.current_operation.url;
    })
    .map((page) => page.text)
    .join(" ");
  const identityPageText = pages
    .filter((page) => (page.final_url ?? page.url) === evidence.identity.url)
    .map((page) => page.text)
    .join(" ");
  if (PERMANENTLY_CLOSED_PATTERN.test(identityPageText)) {
    return {
      category: "CLOSED_OR_ENDED",
      reason: "official exact-identity page states that the facility closed or ended operation",
      url: evidence.identity.url,
      excerpt: snippet(identityPageText, PERMANENTLY_CLOSED_PATTERN),
    };
  }
  if (
    /^(?:株式会社|有限会社|[（(]株[）)]|[（(]有[）)]|NPO|特定非営利活動法人)/iu.test(identity) &&
    !/ミュージアム|博物館|美術館|科学館|水族館|動物園|公園|パーク|農園|果樹園|遊園地|ジム|スタジオ|ランド|スキー場|温泉|体験館/iu.test(identity)
  ) {
    return {
      category: "OPERATOR_IDENTITY_NOT_FACILITY",
      reason: "provider identity resolves to an operator entity, not an exact permanent facility identity",
      url: evidence.identity.url,
      excerpt: evidence.identity.excerpt,
    };
  }
  if (
    /(?:2026|令和8)[^。\n]{0,140}(?:名称|名前|施設名)[^。\n]{0,140}(?:変更|変わ|改称|になります)|(?:名称変更|改称|新名称)/iu.test(
      officialText,
    )
  ) {
    return {
      category: "OBSOLETE_OR_RENAMED_IDENTITY",
      reason: "official source shows that the candidate identity is obsolete, renamed, or no longer operating under the exact name",
      url: evidence.current_operation.url || evidence.identity.url,
      excerpt: snippet(
        officialText,
        /(?:2026|令和8)[^。\n]{0,100}(?:名称|名前|施設名)|名称変更|改称|新名称/iu,
      ),
    };
  }
  if (
    /賃貸物件|不動産|物件情報/iu.test(officialText) &&
    !/常設施設|遊び場|ミュージアム|博物館|公園|パーク/iu.test(officialText)
  ) {
    return {
      category: "NON_FACILITY_BUSINESS",
      reason: "official source resolves to a non-facility business identity",
      url: evidence.identity.url,
      excerpt: snippet(officialText, /賃貸物件|不動産|物件情報/iu),
    };
  }
  if (
    /ホテル|旅館|宿泊施設|民宿|ゲストハウス/iu.test(identity) &&
    !/日帰り|一般利用|ビジター利用|遊び場|キッズパーク|体験施設/iu.test(officialText)
  ) {
    return {
      category: "ACCOMMODATION_ONLY",
      reason: "official source identifies an accommodation-only operation rather than an independently usable family facility",
      url: evidence.identity.url,
      excerpt: snippet(officialText, /ホテル|旅館|宿泊施設|民宿|ゲストハウス/iu),
    };
  }
  if (
    /スクール|レッスン|ガイドサービス|体験ツアー|アクティビティツアー/iu.test(
      officialText,
    ) &&
    !/ミュージアム|博物館|美術館|科学館|水族館|動物園|公園|パーク|農園|果樹園|牧場|遊園地|ジム|スタジオ|スペース|フィールド|クラブ|ランド|スキー場|温泉|体験館|道場|工房|アスレチック/iu.test(
      identity,
    )
  ) {
    return {
      category: "LESSON_OR_GUIDE_OPERATION",
      reason: "official source identifies lessons, a school, or guided activities rather than an independently visitable permanent facility",
      url: evidence.identity.url,
      excerpt: snippet(
        officialText,
        /スクール|レッスン|ガイドサービス|体験ツアー|アクティビティツアー/iu,
      ),
    };
  }
  if (
    /ツアー|ガイド|ダイビング|シュノーケル|SUP|カヌー|カヤック|ラフティング|パラグライダー|レンタル/iu.test(identity) &&
    /集合|ツアー|ガイド|レンタル|出発|催行|体験プラン/iu.test(officialText) &&
    !/常設施設|ミュージアム|博物館|科学館|遊園地|公園|農園|スキー場|クライミングジム|ボルダリングジム/iu.test(officialText)
  ) {
    return {
      category: "TOUR_OR_RENTAL_ONLY",
      reason: "official source identifies a tour, meeting-point, guide, or rental operation rather than a permanent facility",
      url: evidence.identity.url,
      excerpt: snippet(officialText, /集合|ツアー|ガイド|レンタル|出発|催行|体験プラン/iu),
    };
  }
  if (
    /サービス$|メッセージ$|ブリーズ$|鉄道$|協議会$|推進協議会$/iu.test(identity) &&
    /ツアー|ガイド|体験プラン|スクール|レッスン|運行|協議会|事務局/iu.test(
      officialText,
    )
  ) {
    return {
      category: "OPERATOR_OR_NETWORK_IDENTITY",
      reason: "official source resolves to an operator, transport network, or coordinating body rather than an exact permanent facility",
      url: evidence.identity.url,
      excerpt: snippet(
        officialText,
        /ツアー|ガイド|体験プラン|スクール|レッスン|運行|協議会|事務局/iu,
      ),
    };
  }
  if (
    /本イベント|イベント会場|開催期間|会期/iu.test(officialText) &&
    /イベント|謎解き|展覧会|展示会|フェス|期間限定/iu.test(
      `${identity} ${evidence.identity.title}`,
    )
  ) {
    return {
      category: "TEMPORARY_EVENT",
      reason: "official source identifies an event or time-limited venue rather than a permanent facility",
      url: evidence.identity.url,
      excerpt: snippet(
        officialText,
        /本イベント|イベント会場|開催期間|会期/iu,
      ),
    };
  }
  if (
    /\/(?:exhibitions?|events?|news)\//iu.test(evidence.identity.url) &&
    /開催期間|会期|期間限定|前売券|当日券|本イベント/iu.test(officialText)
  ) {
    return {
      category: "TEMPORARY_EVENT",
      reason: "official event or exhibition page is time-limited and does not establish a permanent facility identity",
      url: evidence.identity.url,
      excerpt: snippet(
        officialText,
        /開催期間|会期|期間限定|前売券|当日券|本イベント/iu,
      ),
    };
  }
  if (
    /展$|イベント|フェス|まつり|祭|期間限定|わくわくパーク/iu.test(identity) &&
    /開催期間|会期|期間限定|終了しました|開催終了|最終日/iu.test(officialText)
  ) {
    return {
      category: "TEMPORARY_EVENT",
      reason: "official source identifies a temporary or ended event rather than a permanent facility",
      url: evidence.identity.url,
      excerpt: snippet(officialText, /開催期間|会期|期間限定|終了しました|開催終了|最終日/iu),
    };
  }
  if (
    /レストラン|食堂|居酒屋|喫茶店|カフェ/iu.test(identity) &&
    !/猫|犬|動物|アニマル|ハリネズミ|体験|キッズ|親子|遊び場|ミュージアム|博物館|美術館|展望/iu.test(identity)
  ) {
    return {
      category: "FOOD_ONLY",
      reason: "identity and official source resolve to a food-only operation",
      url: evidence.identity.url,
      excerpt: snippet(officialText, /レストラン|食堂|居酒屋|喫茶店|カフェ/iu),
    };
  }
  return null;
}

function findDuplicate(target, address, officialName) {
  const normalizedAddress = normalizeAddress(address);
  const names = unique([target.asoview_identity, officialName].filter(Boolean));
  return facilityData.facilities.find((facility) => {
    const addressEqual =
      normalizedAddress && normalizeAddress(facility.address) === normalizedAddress;
    const nameScore = Math.max(
      ...names.map((name) => bigramDice(normalize(name), normalize(facility.name))),
    );
    const prefectureEqual = extractPrefecture(address) === facility.prefecture;
    return (addressEqual && nameScore >= 0.48) || (prefectureEqual && nameScore >= 0.92);
  });
}

async function yahooSearch(query) {
  if (cache.searches[query]) return cache.searches[query];
  const url = `https://search.yahoo.co.jp/search?p=${encodeURIComponent(query)}`;
  let urls = [];
  try {
    const response = await fetchWithTimeout(url, {
      headers: { "User-Agent": USER_AGENT, Accept: "text/html" },
    });
    if (response.ok) {
      const html = await response.text();
      urls = unique(
        [...html.matchAll(/href="(https?:\/\/[^"#]+)"/giu)]
          .map((match) => decodeHtml(match[1]))
          .filter((candidate) => {
            try {
              const host = new URL(candidate).hostname;
              return !/(?:yahoo\.|yimg\.|lycorp\.)/iu.test(host);
            } catch {
              return false;
            }
          }),
      ).slice(0, 12);
    }
  } catch {
    urls = [];
  }
  cache.searches[query] = urls;
  await delay(350);
  return urls;
}

async function fetchPage(url) {
  const key = canonicalUrl(url);
  if (cache.pages[key]) return cache.pages[key];
  let page;
  try {
    const response = await fetchWithTimeout(url, {
      redirect: "follow",
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "text/html,application/xhtml+xml,application/pdf;q=0.9,*/*;q=0.5",
      },
    });
    const contentType = response.headers.get("content-type") ?? "";
    const finalUrl = response.url || url;
    if (!response.ok) {
      page = { url, final_url: finalUrl, status: response.status, error: `HTTP ${response.status}` };
    } else if (/application\/pdf/iu.test(contentType) || /\.pdf(?:$|\?)/iu.test(finalUrl)) {
      const bytes = Buffer.from(await response.arrayBuffer());
      const text = await extractPdfText(bytes, finalUrl);
      page = {
        url,
        final_url: finalUrl,
        status: response.status,
        content_type: "application/pdf",
        title: basename(new URL(finalUrl).pathname),
        text: text.slice(0, 120_000),
        links: [],
      };
    } else {
      const html = await response.text();
      page = {
        url,
        final_url: finalUrl,
        status: response.status,
        content_type: contentType,
        title: decodeHtml(html.match(/<title[^>]*>([\s\S]*?)<\/title>/iu)?.[1] ?? ""),
        text: toVisibleText(html).slice(0, 120_000),
        json_ld_addresses: extractJsonLdAddresses(html),
        links: extractLinks(html, finalUrl),
      };
    }
  } catch (error) {
    page = {
      url,
      final_url: url,
      status: 0,
      error: error instanceof Error ? error.message : String(error),
    };
  }
  cache.pages[key] = page;
  return page;
}

async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

async function extractPdfText(bytes, url) {
  const hash = createHash("sha256").update(url).digest("hex").slice(0, 20);
  const pdfPath = resolve(CACHE_DIR, `${hash}.pdf`);
  const textPath = resolve(CACHE_DIR, `${hash}.txt`);
  await writeFile(pdfPath, bytes);
  try {
    await runCommand("pdftotext", ["-layout", "-enc", "UTF-8", pdfPath, textPath]);
    return await readFile(textPath, "utf8");
  } catch {
    return "";
  } finally {
    await Promise.all([
      rm(pdfPath, { force: true }),
      rm(textPath, { force: true }),
    ]);
  }
}

function runCommand(command, args) {
  return new Promise((resolveCommand, rejectCommand) => {
    const child = spawn(command, args, { stdio: "ignore" });
    child.once("error", rejectCommand);
    child.once("exit", (code) =>
      code === 0 ? resolveCommand() : rejectCommand(new Error(`${command} exited ${code}`)),
    );
  });
}

function extractLinks(html, baseUrl) {
  const links = [];
  for (const match of html.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/giu)) {
    try {
      const url = new URL(decodeHtml(match[1]), baseUrl);
      if (!/^https?:$/u.test(url.protocol)) continue;
      url.hash = "";
      links.push({ url: url.href, text: toVisibleText(match[2]).slice(0, 240) });
    } catch {
      continue;
    }
  }
  return uniqueBy(links, (link) => link.url).slice(0, 500);
}

function extractJsonLdAddresses(html) {
  const addresses = [];
  for (const match of html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/giu)) {
    try {
      const value = JSON.parse(decodeHtml(match[1]));
      walkJson(value, (entry) => {
        if (!entry || typeof entry !== "object") return;
        const address = entry.address;
        if (typeof address === "string" && extractPrefecture(address)) addresses.push(address);
        if (address && typeof address === "object") {
          const joined = [
            address.postalCode ? `〒${address.postalCode}` : "",
            address.addressRegion,
            address.addressLocality,
            address.streetAddress,
          ].filter(Boolean).join(" ");
          if (extractPrefecture(joined)) addresses.push(joined);
        }
      });
    } catch {
      continue;
    }
  }
  return unique(addresses.map(cleanAddress).filter(Boolean));
}

function walkJson(value, visitor) {
  visitor(value);
  if (Array.isArray(value)) {
    for (const child of value) walkJson(child, visitor);
  } else if (value && typeof value === "object") {
    for (const child of Object.values(value)) walkJson(child, visitor);
  }
}

function extractAddresses(page, identity) {
  const candidates = [];
  if (!isGovernmentHost(hostname(page.final_url ?? page.url))) {
    for (const value of page.json_ld_addresses ?? []) {
      candidates.push({ value, excerpt: value, score: 120 });
    }
  }
  const text = page.text ?? "";
  const regexes = [
    new RegExp(`〒\\s*\\d{3}-?\\d{4}\\s*${PREFECTURE_PATTERN}[^\\n。|｜]{3,120}`, "gu"),
    new RegExp(`${PREFECTURE_PATTERN}[^\\n。|｜]{3,100}`, "gu"),
  ];
  const identityPosition = normalize(text).indexOf(normalize(coreIdentity(identity)));
  for (const regex of regexes) {
    for (const match of text.matchAll(regex)) {
      const value = cleanAddress(match[0]);
      if (!isPlausibleAddress(value)) continue;
      const distance = identityPosition >= 0 ? Math.abs(match.index - identityPosition) : 20_000;
      const nearby = text.slice(Math.max(0, match.index - 80), match.index + match[0].length + 40);
      const path = new URL(page.final_url ?? page.url).pathname;
      const labelBonus = /住所|所在地|アクセス|会場|店舗情報/iu.test(nearby) ? 35 : 0;
      const postalBonus = /^〒/u.test(value) ? 20 : 0;
      const pathBonus = /access|about|guide|info|shop|store|facility/iu.test(path)
        ? 15
        : 0;
      candidates.push({
        value,
        excerpt: snippet(text, new RegExp(escapeRegex(value.slice(0, 12)), "u")),
        score: Math.max(1, 70 - Math.floor(distance / 180)) + labelBonus + postalBonus + pathBonus,
      });
    }
  }
  return uniqueBy(candidates, (candidate) => normalizeAddress(candidate.value));
}

function cleanAddress(value) {
  return compact(value)
    .replace(/(?:電話|TEL|Tel|営業時間|開館時間|開園時間|アクセス|Google|MAP|地図|駐車場).*$/u, "")
    .replace(/(?:お問い合わせ|Copyright|©|メニュー).*$/iu, "")
    .replace(/\s{2,}/gu, " ")
    .trim();
}

function isPlausibleAddress(value) {
  const withoutPostalCode = String(value ?? "").replace(
    /^〒\s*\d{3}-?\d{4}\s*/u,
    "",
  );
  return (
    Boolean(extractPrefecture(value)) &&
    new RegExp(`${PREFECTURE_PATTERN}[^\\n。|｜]{0,30}[市区町村郡]`, "u").test(value) &&
    /(?:\d|[０-９])+(?:丁目|番地?|号|[-−ー](?:\d|[０-９]))/u.test(withoutPostalCode) &&
    value.length <= 150
  );
}

function extractPrefecture(value) {
  return String(value ?? "").match(new RegExp(PREFECTURE_PATTERN, "u"))?.[0] ?? "";
}

function identityScore(identity, page) {
  const target = normalize(identity);
  const core = normalize(coreIdentity(identity));
  const title = normalize(page.title ?? "");
  const text = normalize(`${page.title ?? ""} ${(page.text ?? "").slice(0, 20_000)}`);
  if (target.length >= 4 && text.includes(target)) return 1;
  if (core.length >= 4 && text.includes(core)) return 0.9;
  return Math.max(bigramDice(target, title), bigramDice(core, title));
}

function identityRegex(identity) {
  const variants = unique([
    identity,
    coreIdentity(identity),
    identity.replace(/[（(].*?[）)]/gu, "").trim(),
  ]).filter((value) => value.length >= 2);
  return new RegExp(variants.map(escapeRegex).join("|"), "iu");
}

function extractOfficialName(identity, page) {
  const title = compact(page.title).replace(/\s*[|｜].*$/u, "");
  return identityScore(identity, { title, text: title }) >= 0.72 ? title : identity;
}

function coreIdentity(value) {
  return String(value ?? "")
    .replace(/^(?:株式会社|有限会社|一般社団法人|公益財団法人|公益社団法人|合同会社|[（(]株[）)])\s*/u, "")
    .replace(/[（(][^）)]*(?:読み|よみ|英語|カナ)[^）)]*[）)]/gu, "")
    .replace(/（([^）]{2,40})）/gu, " $1 ")
    .replace(/\s+/gu, " ")
    .trim();
}

function sourceType(page) {
  const host = hostname(page.final_url ?? page.url);
  if (isGovernmentHost(host)) return "government_or_public_operator_official";
  if (page.linked_from_official) return "official_linked_booking_or_ticket_page";
  if (page.content_type === "application/pdf") return "official_pdf";
  return "facility_or_operator_official";
}

function isGovernmentHost(host) {
  return /(?:\.go\.jp|\.lg\.jp|^city\.|^pref\.|^www\.city\.|^www\.pref\.)/iu.test(host);
}

function isPublicOperatorCandidate(identity) {
  return /国立|県立|府立|都立|道立|市立|町立|村立|公園|市民|県民|町民|公共|文化会館|体育館|運動公園|自然公園|資料館|博物館|美術館|科学館|水族館|動物園|記念館|交流館|道の駅|観光案内所|城|庭園|史跡/iu.test(
    identity,
  );
}

function publicAddressIsFacilitySpecific(target, item) {
  const identity = normalize(coreIdentity(target.asoview_identity));
  const context = normalize(item.address.excerpt ?? "");
  return (
    identity.length >= 4 &&
    context.includes(identity) &&
    /施設所在地|所在地|会場|アクセス|住所|〒/iu.test(item.address.excerpt ?? "")
  );
}

function addressFacilityProximity(target, page, address) {
  const identity = normalize(coreIdentity(target.asoview_identity));
  if (identity.length < 4) return 0;
  const excerpt = normalize(address.excerpt ?? "");
  if (excerpt.includes(identity)) return 3;
  const title = normalize(page.title ?? "");
  const titleScore = bigramDice(identity, title);
  if (title.includes(identity)) return 2;
  if (titleScore >= 0.82) return 1;
  return 0;
}

function targetPageAffinity(target, page) {
  const identity = normalize(target.asoview_identity);
  const core = normalize(coreIdentity(target.asoview_identity));
  const title = normalize(page.title ?? "");
  const leadingText = normalize((page.text ?? "").slice(0, 2_500));
  let score = 0;
  if (identity.length >= 4 && title.includes(identity)) score += 500;
  else if (core.length >= 4 && title.includes(core)) score += 420;
  score += Math.round(
    Math.max(bigramDice(identity, title), bigramDice(core, title)) * 200,
  );
  if (identity.length >= 4 && leadingText.includes(identity)) score += 120;
  else if (core.length >= 4 && leadingText.includes(core)) score += 90;
  if (page.linked_from_official === true) score += 20;
  return score;
}

function domainIdentityMatched(identity, host) {
  const domainTokens = host
    .replace(/^www\./iu, "")
    .split(/[.\-_]/u)
    .filter((token) => token.length >= 4 && !/^(?:com|co|ne|or|site|official)$/u.test(token));
  const latinIdentity = String(identity ?? "")
    .normalize("NFKC")
    .toLocaleLowerCase("en")
    .replace(/[^a-z0-9]/gu, "");
  return domainTokens.some((token) => latinIdentity.includes(token));
}

function snippet(text, pattern) {
  if (!text) return "";
  const match = text.match(pattern);
  if (!match || match.index === undefined) return "";
  return text.slice(Math.max(0, match.index - 120), match.index + match[0].length + 180);
}

function summarizePages(pages) {
  return pages.map((page) => ({
    url: page.final_url ?? page.url,
    status: page.status,
    title: page.title ?? "",
    source_type: sourceType(page),
    identity_signal: false,
    address_signal: extractAddresses(page, "").length > 0,
    current_operation_signal:
      CURRENT_PATTERN.test(page.text ?? "") && !PERMANENTLY_CLOSED_PATTERN.test(page.text ?? ""),
    child_use_signal: EXPLICIT_CHILD_USE_PATTERN.test(page.text ?? ""),
    content_type: page.content_type ?? "",
  }));
}

function insufficiencyCode(missing) {
  if (missing.length !== 1) return "MULTIPLE_EVIDENCE_INSUFFICIENT";
  return {
    identity: "IDENTITY_INSUFFICIENT",
    address: "ADDRESS_INSUFFICIENT",
    current_operation: "CURRENT_OPERATION_INSUFFICIENT",
    child_use: "CHILD_USE_INSUFFICIENT",
  }[missing[0]];
}

async function geocode(address, target) {
  const response = await fetchWithTimeout(
    `https://msearch.gsi.go.jp/address-search/AddressSearch?q=${encodeURIComponent(address.replace(/^〒\s*\d{3}-?\d{4}\s*/u, ""))}`,
    { headers: { "User-Agent": USER_AGENT } },
  );
  if (response.ok) {
    const rows = await response.json();
    const coordinates = rows?.[0]?.geometry?.coordinates;
    if (Array.isArray(coordinates) && coordinates.length === 2) {
      return {
        longitude: Number(coordinates[0]),
        latitude: Number(coordinates[1]),
        source: "gsi_address_search",
      };
    }
  }
  if (
    Number.isFinite(target.asoview_detail?.latitude) &&
    Number.isFinite(target.asoview_detail?.longitude)
  ) {
    return {
      longitude: target.asoview_detail.longitude,
      latitude: target.asoview_detail.latitude,
      source: "asoview_public_coordinate_after_independent_official_identity_and_address_confirmation",
    };
  }
  throw new Error(`geocode unavailable for official address: ${address}`);
}

function buildAddition(target, evidence, coordinates) {
  return {
    asoview_identity: target.asoview_identity,
    name: canonicalName(evidence.identity.official_name || target.asoview_identity),
    address: evidence.address.value.replace(/^〒\s*\d{3}-?\d{4}\s*/u, ""),
    prefecture: extractPrefecture(evidence.address.value),
    official_url: evidence.identity.url,
    latitude: coordinates.latitude,
    longitude: coordinates.longitude,
    geocode_source: coordinates.source,
    family_relevance: target.family_relevance,
    source_evidence: {
      identity: evidence.identity,
      address: evidence.address,
      current_operation: evidence.current_operation,
      child_use: evidence.child_use,
      checked_at: CHECKED_AT,
    },
  };
}

function canonicalName(value) {
  return compact(value)
    .replace(/^(?:株式会社|有限会社|[（(]株[）)])\s*/u, "")
    .replace(/\s*[|｜].*$/u, "")
    .trim();
}

function summarize() {
  const completed = reviews.filter((review) => review.review_complete);
  return {
    target_count: reviews.length,
    completed_count: completed.length,
    pending_count: reviews.length - completed.length,
    initial_insufficiency_counts: countBy(reviews, "initial_insufficiency_code"),
    child_use_only_priority_count: reviews.filter((review) => review.priority_child_use_only).length,
    final_status_counts: countBy(completed, "final_status"),
    final_insufficiency_counts: countBy(
      completed.filter((review) => review.final_status === "OFFICIAL_EVIDENCE_INSUFFICIENT"),
      "final_insufficiency_code",
    ),
  };
}

async function saveOutput() {
  const output = {
    schema_version: 1,
    review_version: REVIEW_VERSION,
    checked_at: CHECKED_AT,
    generated_at: new Date().toISOString(),
    source_ledger: "docs/audits/asoview-reverse-discovery-candidates-2026-08-26.json",
    policy: {
      canon_conditions: ["identity", "address", "current_operation", "child_use"],
      asoview_is_discovery_only: true,
      primary_sources_only: true,
      fail_closed: true,
    },
    coverage: summarize(),
    reviews,
  };
  await writeFile(OUTPUT_PATH, `${JSON.stringify(output, null, 2)}\n`, "utf8");
}

async function saveCache() {
  cache.generated_at = new Date().toISOString();
  await writeFile(CACHE_PATH, `${JSON.stringify(cache)}\n`, "utf8");
}

async function readJson(path, fallback) {
  try {
    return JSON.parse(await readFile(path, "utf8"));
  } catch (error) {
    if (error.code === "ENOENT") return fallback;
    throw error;
  }
}

function countBy(rows, field) {
  const counts = {};
  for (const row of rows) {
    const key = row[field];
    if (!key) continue;
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort(([left], [right]) => left.localeCompare(right)));
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function uniqueBy(values, keyOf) {
  const seen = new Set();
  return values.filter((value) => {
    const key = keyOf(value);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function uniquePages(pages) {
  return uniqueBy(pages, (page) => canonicalUrl(page.final_url ?? page.url));
}

function canonicalUrl(value) {
  try {
    const url = new URL(value);
    url.hash = "";
    for (const key of [...url.searchParams.keys()]) {
      if (/^(?:utm_|fbclid|gclid)/iu.test(key)) url.searchParams.delete(key);
    }
    return url.href;
  } catch {
    return String(value ?? "");
  }
}

function hostname(value) {
  try {
    return new URL(value).hostname.replace(/^www\./iu, "");
  } catch {
    return "";
  }
}

function isHttpUrl(value) {
  try {
    return /^https?:$/u.test(new URL(value).protocol);
  } catch {
    return false;
  }
}

function normalize(value) {
  return String(value ?? "")
    .normalize("NFKC")
    .toLocaleLowerCase("ja")
    .replace(/(?:株式会社|有限会社|一般社団法人|公益財団法人|公益社団法人|合同会社)/gu, "")
    .replace(/[\s\p{P}\p{S}]/gu, "");
}

function normalizeAddress(value) {
  return normalize(String(value ?? "").replace(/〒\s*\d{3}-?\d{4}/gu, ""));
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

function toVisibleText(html) {
  return decodeHtml(
    String(html ?? "")
      .replace(/<script[\s\S]*?<\/script>/giu, " ")
      .replace(/<style[\s\S]*?<\/style>/giu, " ")
      .replace(/<\/?(?:p|div|li|tr|td|th|section|article|header|footer|br|h[1-6])\b[^>]*>/giu, "\n")
      .replace(/<[^>]+>/gu, " "),
  )
    .replace(/[\t\f\v ]+/gu, " ")
    .replace(/\n\s*\n+/gu, "\n")
    .trim();
}

function decodeHtml(value) {
  return String(value ?? "")
    .replace(/&nbsp;|&#160;/giu, " ")
    .replace(/&amp;/giu, "&")
    .replace(/&quot;/giu, '"')
    .replace(/&#39;|&apos;/giu, "'")
    .replace(/&lt;/giu, "<")
    .replace(/&gt;/giu, ">")
    .replace(/&#(\d+);/gu, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/giu, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)));
}

function compact(value) {
  return String(value ?? "").replace(/\s+/gu, " ").trim();
}

function escapeRegex(value) {
  return String(value ?? "").replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}

function delay(milliseconds) {
  return new Promise((resolveDelay) => setTimeout(resolveDelay, milliseconds));
}
