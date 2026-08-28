#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const COVERAGE = resolve(
  ROOT,
  "docs/audits/asoview-base-namespace-coverage-2026-08-28.json",
);
const FACILITYOPS = resolve(
  ROOT,
  "docs/audits/asoview-base-namespace-facilityops-2026-08-28.json",
);
const OUTPUT = resolve(
  ROOT,
  "docs/audits/asoview-base-namespace-offers-2026-08-28.json",
);
const USER_AGENT =
  "MemoripAsoviewNamespaceOfferAudit/1.0 (+https://trip-guide.net; public-pages-only)";

const [coverage, facilityOps] = await Promise.all([
  readFile(COVERAGE, "utf8").then(JSON.parse),
  readFile(FACILITYOPS, "utf8").then(JSON.parse),
]);
if (!coverage.coverage.scan_complete) {
  throw new Error("refusing offer audit from an incomplete base namespace scan");
}
if (facilityOps.coverage.pending_count !== 0) {
  throw new Error("refusing offer audit from an incomplete FacilityOps review");
}

const reviewByIdentity = new Map(
  facilityOps.reviews.map((review) => [review.normalized_identity, review]),
);
const eligible = coverage.recovered_family_candidates.filter((candidate) => {
  if (candidate.coverage_disposition === "DUPLICATE") return true;
  const review = reviewByIdentity.get(candidate.normalized_identity);
  return review && ["ADD", "DUPLICATE"].includes(review.final_status);
});

const providerPages = await mapLimit(eligible, 4, async (candidate) => {
  const productUrls = new Set();
  const pages = [];
  for (const asoviewPage of candidate.asoview_pages) {
    const page = await fetchText(asoviewPage.url);
    pages.push({
      url: asoviewPage.url,
      status: page.status,
      final_url: page.finalUrl,
      title: page.title,
    });
    for (const url of extractProductUrls(page.html)) productUrls.add(url);
  }
  return {
    asoview_identity: candidate.asoview_identity,
    normalized_identity: candidate.normalized_identity,
    provider_pages: pages,
    product_urls: [...productUrls].sort(),
  };
});

const allProductUrls = [
  ...new Set(providerPages.flatMap((provider) => provider.product_urls)),
];
const productResults = await mapLimit(allProductUrls, 4, async (url) => {
  const page = await fetchText(url);
  const canonicalUrl = extractCanonical(page.html) || page.finalUrl || url;
  const unavailable =
    !page.ok ||
    /お探しのページが見つかりません|販売終了|受付終了|現在予約できません/u.test(
      `${page.title} ${page.description}`,
    );
  const kind = /\/item\/ticket\//u.test(canonicalUrl)
    ? "ticket"
    : "activity";
  const availabilityMatched = kind === "ticket"
    ? /購入|チケット/u.test(`${page.title} ${page.description} ${page.html.slice(0, 500_000)}`)
    : /予約|体験/u.test(`${page.title} ${page.description} ${page.html.slice(0, 500_000)}`);
  const disallowedProductMatched =
    /ふるさと納税|返礼品|共通(?:入園)?券|セット(?:券|チケット|プラン)|周遊|複数施設|バスセット|電車セット|食事(?:券|付)|宿泊(?:付|セット)|期間限定|特別展|企画展|イベント|花火|ナイト(?:パス|チケット)|コンサート|公演|県民|早割|シーズン券/iu.test(
      `${page.title} ${page.description}`,
    );
  return {
    url,
    status: page.status,
    final_url: page.finalUrl,
    canonical_url: canonicalUrl,
    title: page.title,
    description: page.description,
    kind,
    public_and_available:
      !unavailable && availabilityMatched && !disallowedProductMatched,
    availability_matched: availabilityMatched,
    disallowed_product_matched: disallowedProductMatched,
  };
});
const productByUrl = new Map(productResults.map((product) => [product.url, product]));

const reviews = providerPages.map((provider) => ({
  ...provider,
  products: provider.product_urls.map((url) => productByUrl.get(url)),
  valid_individual_products: provider.product_urls
    .map((url) => productByUrl.get(url))
    .filter((product) => product?.public_and_available),
}));
const output = {
  schema_version: 1,
  audited_at: "2026-08-28",
  source_coverage:
    "docs/audits/asoview-base-namespace-coverage-2026-08-28.json",
  source_facilityops:
    "docs/audits/asoview-base-namespace-facilityops-2026-08-28.json",
  policy: {
    eligible_facility_statuses: ["ADD", "DUPLICATE"],
    individual_product_required: true,
    exact_provider_page_link_required: true,
    public_current_availability_required: true,
    temporary_bundled_or_furusato_product_rejected: true,
  },
  coverage: {
    eligible_identity_count: eligible.length,
    provider_page_count: providerPages.reduce(
      (total, provider) => total + provider.provider_pages.length,
      0,
    ),
    linked_unique_product_count: allProductUrls.length,
    valid_individual_product_count: productResults.filter(
      (product) => product.public_and_available,
    ).length,
    identities_with_valid_product_count: reviews.filter(
      (review) => review.valid_individual_products.length > 0,
    ).length,
  },
  reviews,
};
await writeFile(OUTPUT, `${JSON.stringify(output, null, 2)}\n`, "utf8");
console.log(JSON.stringify(output.coverage, null, 2));

async function fetchText(url) {
  let lastError = "unknown error";
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20_000);
    try {
      const response = await fetch(url, {
        redirect: "follow",
        signal: controller.signal,
        headers: {
          Accept: "text/html,application/xhtml+xml",
          "User-Agent": USER_AGENT,
        },
      });
      const html = await response.text();
      clearTimeout(timeout);
      if (
        [403, 408, 425, 429].includes(response.status) ||
        response.status >= 500
      ) {
        lastError = `retryable HTTP status ${response.status}`;
        if (attempt < 3) {
          await delay(5_000 * attempt);
          continue;
        }
      }
      return {
        ok: response.ok,
        status: response.status,
        finalUrl: response.url,
        html,
        title: decodeHtml(extractTagText(html, "title")),
        description: decodeHtml(extractMeta(html, "description")),
      };
    } catch (error) {
      clearTimeout(timeout);
      lastError = error instanceof Error ? error.message : String(error);
      if (attempt < 3) await delay(2_000 * attempt);
    }
  }
  return {
    ok: false,
    status: 0,
    finalUrl: "",
    html: "",
    title: "",
    description: "",
    error: lastError,
  };
}

function extractProductUrls(html) {
  const decoded = String(html)
    .replaceAll("\\/", "/")
    .replaceAll("\\u002F", "/")
    .replaceAll("&amp;", "&");
  const matches = decoded.match(
    /(?:https?:\/\/www\.asoview\.com)?\/item\/(?:ticket|activity)\/[A-Za-z0-9_-]+\/?/gu,
  ) ?? [];
  return [
    ...new Set(
      matches.map((value) =>
        new URL(value, "https://www.asoview.com").href,
      ),
    ),
  ];
}

function extractTagText(html, tag) {
  return (
    html.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "iu"))?.[1] ??
    ""
  ).trim();
}

function extractMeta(html, name) {
  const tag = html.match(
    new RegExp(`<meta[^>]+name=["']${name}["'][^>]*>`, "iu"),
  )?.[0];
  return tag?.match(/content=["']([\s\S]*?)["']/iu)?.[1]?.trim() ?? "";
}

function extractCanonical(html) {
  const tag = html.match(/<link[^>]+rel=["']canonical["'][^>]*>/iu)?.[0];
  return tag?.match(/href=["']([\s\S]*?)["']/iu)?.[1]?.trim() ?? "";
}

function decodeHtml(value) {
  return String(value)
    .replace(/&amp;/gu, "&")
    .replace(/&quot;/gu, '"')
    .replace(/&#39;|&apos;/gu, "'")
    .replace(/&lt;/gu, "<")
    .replace(/&gt;/gu, ">");
}

async function mapLimit(items, concurrency, mapper) {
  const results = new Array(items.length);
  let cursor = 0;
  async function worker() {
    while (true) {
      const index = cursor++;
      if (index >= items.length) return;
      results[index] = await mapper(items[index]);
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length || 1) }, worker),
  );
  return results;
}

function delay(milliseconds) {
  return new Promise((resolveDelay) => setTimeout(resolveDelay, milliseconds));
}
