import { createHash } from "node:crypto";
import { createWriteStream } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, relative, resolve } from "node:path";
import { gunzipSync } from "node:zlib";

const ROOT = resolve(import.meta.dirname, "..");
const OUTPUT = resolve(
  ROOT,
  ".codex/research/asoview-public-page-catalog-2026-08-26.jsonl",
);
const MANIFEST = resolve(
  ROOT,
  ".codex/research/asoview-public-page-catalog-manifest-2026-08-26.json",
);
const BASE_NAMESPACE_CATALOG = resolve(
  ROOT,
  process.env.ASOVIEW_BASE_NAMESPACE_CATALOG ??
    ".codex/research/asoview-base-namespace-2026-08-28.jsonl",
);
const BASE_NAMESPACE_MANIFEST = resolve(
  ROOT,
  process.env.ASOVIEW_BASE_NAMESPACE_MANIFEST ??
    ".codex/research/asoview-base-namespace-manifest-2026-08-28.json",
);
const ALLOW_SITEMAP_ONLY = process.env.ASOVIEW_ALLOW_SITEMAP_ONLY === "1";
const CONCURRENCY = Number(process.env.ASOVIEW_FETCH_CONCURRENCY ?? 16);
const REQUEST_SPACING_MS = Number(
  process.env.ASOVIEW_FETCH_SPACING_MS ?? 120,
);
const USER_AGENT =
  "MemoripPublicCatalogAudit/1.1 (+https://trip-guide.net; public-pages-only)";

const SITEMAPS = [
  { kind: "ticket", url: "https://www.asoview.com/sitemap_2_ticket.xml.gz" },
  { kind: "base", url: "https://www.asoview.com/sitemap_3_base.xml.gz" },
  { kind: "activity", url: "https://www.asoview.com/sitemap_1_activity.xml.gz" },
];

await mkdir(dirname(OUTPUT), { recursive: true });

const completed = new Set();
try {
  const prior = await readFile(OUTPUT, "utf8");
  for (const line of prior.split("\n")) {
    if (!line) continue;
    try {
      const record = JSON.parse(line);
      if (record.ok || record.terminal_unavailable) completed.add(record.url);
    } catch {
      // A partially-written final line is ignored and will be retried.
    }
  }
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}

const targets = [];
const sitemapCounts = {};
const catalogUrls = [];
const targetUrlSet = new Set();
for (const sitemap of SITEMAPS) {
  const response = await fetch(sitemap.url, {
    headers: { "User-Agent": USER_AGENT },
  });
  if (!response.ok) {
    throw new Error(`sitemap fetch failed: ${sitemap.url} ${response.status}`);
  }
  const xml = gunzipSync(Buffer.from(await response.arrayBuffer())).toString(
    "utf8",
  );
  let sitemapCount = 0;
  for (const match of xml.matchAll(/<loc>(https:\/\/www\.asoview\.com\/[^<]+)<\/loc>/g)) {
    const url = decodeXml(match[1]);
    sitemapCount += 1;
    catalogUrls.push(url);
    targetUrlSet.add(url);
    if (!completed.has(url)) targets.push({ kind: sitemap.kind, url });
  }
  sitemapCounts[sitemap.kind] = sitemapCount;
}

let namespaceSupplement = null;
try {
  const [namespaceRaw, namespaceManifest] = await Promise.all([
    readFile(BASE_NAMESPACE_CATALOG, "utf8"),
    readFile(BASE_NAMESPACE_MANIFEST, "utf8").then(JSON.parse),
  ]);
  const latestTerminalById = new Map();
  for (const line of namespaceRaw.split("\n")) {
    if (!line) continue;
    try {
      const record = JSON.parse(line);
      if (record.terminal && !record.in_base_sitemap) {
        latestTerminalById.set(record.id, record);
      }
    } catch {
      // A partially-written final line is ignored and must be completed first.
    }
  }
  if (
    latestTerminalById.size !==
    namespaceManifest.off_sitemap_scan_target_id_count
  ) {
    throw new Error(
      `base namespace supplement incomplete: expected=${namespaceManifest.off_sitemap_scan_target_id_count} terminal=${latestTerminalById.size}`,
    );
  }
  const supplementalPages = [...latestTerminalById.values()].filter(
    (record) => record.public_page,
  );
  for (const record of supplementalPages) {
    const url = record.url;
    if (targetUrlSet.has(url)) continue;
    targetUrlSet.add(url);
    catalogUrls.push(url);
    if (!completed.has(url)) targets.push({ kind: "base", url });
  }
  namespaceSupplement = {
    catalog: relative(ROOT, BASE_NAMESPACE_CATALOG).replaceAll("\\", "/"),
    manifest: relative(ROOT, BASE_NAMESPACE_MANIFEST).replaceAll("\\", "/"),
    namespace_min_id: namespaceManifest.namespace_min_id,
    namespace_max_id: namespaceManifest.namespace_max_id,
    off_sitemap_scan_target_id_count:
      namespaceManifest.off_sitemap_scan_target_id_count,
    public_off_sitemap_page_count: supplementalPages.length,
  };
} catch (error) {
  if (!ALLOW_SITEMAP_ONLY) {
    throw new Error(
      `refusing sitemap-only Asoview intake; complete the base namespace scan or set ASOVIEW_ALLOW_SITEMAP_ONLY=1 for an explicit diagnostic override: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

const expectedCatalogCounts = {
  ...sitemapCounts,
  base:
    sitemapCounts.base +
    Number(namespaceSupplement?.public_off_sitemap_page_count ?? 0),
};

const manifestPayload = {
  schema_version: 1,
  generated_at: new Date().toISOString(),
  sitemaps: SITEMAPS,
  sitemap_page_counts: sitemapCounts,
  base_namespace_supplement: namespaceSupplement,
  sitemap_only_diagnostic_override: !namespaceSupplement,
  expected_catalog_counts: expectedCatalogCounts,
  expected_public_page_count: catalogUrls.length,
  sitemap_urls: catalogUrls,
  sitemap_urls_sha256: createHash("sha256")
    .update(JSON.stringify(catalogUrls))
    .digest("hex"),
};
await writeFile(
  MANIFEST,
  `${JSON.stringify(manifestPayload, null, 2)}\n`,
  "utf8",
);

console.log(
  `Asoview public catalog: total=${targets.length + completed.size} resume=${completed.size} pending=${targets.length} concurrency=${CONCURRENCY}`,
);

const output = createWriteStream(OUTPUT, { flags: "a", encoding: "utf8" });
let cursor = 0;
let written = 0;
let failures = 0;
let nextRequestAt = Date.now();
let throttle = Promise.resolve();

async function worker() {
  while (true) {
    const index = cursor++;
    if (index >= targets.length) return;
    const target = targets[index];
    const record = await fetchHeadRecord(target);
    if (!record.ok && !record.terminal_unavailable) failures += 1;
    output.write(`${JSON.stringify(record)}\n`);
    written += 1;
    if (written % 250 === 0 || written === targets.length) {
      console.log(
        `progress=${written}/${targets.length} failures=${failures} last=${target.url}`,
      );
    }
  }
}

await Promise.all(
  Array.from({ length: Math.min(CONCURRENCY, targets.length || 1) }, worker),
);
await new Promise((resolveStream, rejectStream) => {
  output.end(resolveStream);
  output.on("error", rejectStream);
});

if (failures > 0) {
  throw new Error(
    `${failures} public pages failed after retries; rerun to append successful replacements`,
  );
}

console.log(`Catalog complete: ${OUTPUT}`);

async function fetchHeadRecord(target) {
  let lastError = "unknown error";
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20_000);
    try {
      await waitForRequestSlot();
      const response = await fetch(target.url, {
        redirect: "follow",
        signal: controller.signal,
        headers: {
          Accept: "text/html,application/xhtml+xml",
          "User-Agent": USER_AGENT,
        },
      });
      const html = await readThroughHead(response);
      clearTimeout(timeout);
      if (
        [403, 408, 425, 429].includes(response.status) ||
        response.status >= 500
      ) {
        lastError = `retryable HTTP status ${response.status}`;
        if (attempt < 3) {
          await delay(30_000 * attempt);
          continue;
        }
        break;
      }
      return {
        kind: target.kind,
        url: target.url,
        final_url: response.url,
        status: response.status,
        ok: response.ok,
        terminal_unavailable:
          !response.ok &&
          response.status >= 400 &&
          response.status < 500 &&
          response.status !== 403 &&
          response.status !== 408 &&
          response.status !== 425 &&
          response.status !== 429,
        title: decodeHtml(extractTagText(html, "title")),
        description: decodeHtml(extractMeta(html, "description")),
        canonical_url: decodeHtml(extractCanonical(html)),
        fetched_at: new Date().toISOString(),
      };
    } catch (error) {
      clearTimeout(timeout);
      lastError = error instanceof Error ? error.message : String(error);
      if (attempt < 3) await delay(2_000 * 2 ** (attempt - 1));
    }
  }
  return {
    kind: target.kind,
    url: target.url,
    final_url: "",
    status: 0,
    ok: false,
    title: "",
    description: "",
    canonical_url: "",
    fetched_at: new Date().toISOString(),
    error: lastError,
  };
}

async function waitForRequestSlot() {
  let release;
  const previous = throttle;
  throttle = new Promise((resolveThrottle) => {
    release = resolveThrottle;
  });
  await previous;
  const wait = Math.max(0, nextRequestAt - Date.now());
  if (wait) await delay(wait);
  nextRequestAt = Date.now() + REQUEST_SPACING_MS;
  release();
}

async function readThroughHead(response) {
  if (!response.body) return "";
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let html = "";
  let bytes = 0;
  try {
    while (bytes < 96 * 1024) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      html += decoder.decode(value, { stream: true });
      if (/<\/head>/i.test(html)) break;
    }
  } finally {
    await reader.cancel().catch(() => {});
  }
  return html;
}

function extractTagText(html, tag) {
  return (
    html.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"))?.[1] ??
    ""
  ).trim();
}

function extractMeta(html, name) {
  const tag = html.match(
    new RegExp(`<meta[^>]+name=["']${name}["'][^>]*>`, "i"),
  )?.[0];
  return tag?.match(/content=["']([\s\S]*?)["']/i)?.[1]?.trim() ?? "";
}

function extractCanonical(html) {
  const tag = html.match(
    /<link[^>]+rel=["']canonical["'][^>]*>/i,
  )?.[0];
  return tag?.match(/href=["']([\s\S]*?)["']/i)?.[1]?.trim() ?? "";
}

function decodeHtml(value) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function decodeXml(value) {
  return value.replace(/&amp;/g, "&");
}

function delay(milliseconds) {
  return new Promise((resolveDelay) => setTimeout(resolveDelay, milliseconds));
}
