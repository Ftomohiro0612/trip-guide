#!/usr/bin/env node

import { createHash } from "node:crypto";
import { createWriteStream } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { gunzipSync } from "node:zlib";

const ROOT = resolve(import.meta.dirname, "..");
const OUTPUT = resolve(
  ROOT,
  ".codex/research/asoview-base-namespace-2026-08-28.jsonl",
);
const MANIFEST = resolve(
  ROOT,
  ".codex/research/asoview-base-namespace-manifest-2026-08-28.json",
);
const PROBE = resolve(
  ROOT,
  ".codex/research/asoview-base-namespace-probe-2026-08-28.json",
);
const BASE_SITEMAP = "https://www.asoview.com/sitemap_3_base.xml.gz";
const CONCURRENCY = Number(process.env.ASOVIEW_FETCH_CONCURRENCY ?? 16);
const REQUEST_SPACING_MS = Number(
  process.env.ASOVIEW_FETCH_SPACING_MS ?? 120,
);
const USER_AGENT =
  "MemoripBaseNamespaceAudit/1.0 (+https://trip-guide.net; public-pages-only)";

await mkdir(dirname(OUTPUT), { recursive: true });

const sitemapResponse = await fetch(BASE_SITEMAP, {
  headers: { "User-Agent": USER_AGENT },
});
if (!sitemapResponse.ok) {
  throw new Error(
    `base sitemap fetch failed: ${BASE_SITEMAP} ${sitemapResponse.status}`,
  );
}
const sitemapXml = gunzipSync(
  Buffer.from(await sitemapResponse.arrayBuffer()),
).toString("utf8");
const sitemapUrls = [
  ...sitemapXml.matchAll(
    /<loc>(https:\/\/www\.asoview\.com\/base\/(\d+)\/)<\/loc>/gu,
  ),
].map((match) => ({ url: match[1], id: Number(match[2]) }));
const sitemapIdSet = new Set(sitemapUrls.map(({ id }) => id));
const probe = JSON.parse(await readFile(PROBE, "utf8"));
const observedIds = [
  ...sitemapIdSet,
  ...probe.public_hits.map(({ id }) => id),
];
const observedMaxId = Math.max(...observedIds);
const namespaceMaxId = Math.ceil((observedMaxId + 1) / 5_000) * 5_000 - 1;
const namespaceIds = Array.from(
  { length: namespaceMaxId },
  (_, index) => index + 1,
);
const scanTargetIds = namespaceIds.filter((id) => !sitemapIdSet.has(id));

const completed = new Set();
try {
  const prior = await readFile(OUTPUT, "utf8");
  for (const line of prior.split("\n")) {
    if (!line) continue;
    try {
      const record = JSON.parse(line);
      if (record.terminal) completed.add(record.id);
    } catch {
      // A partially written final line will be retried.
    }
  }
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}

const targets = scanTargetIds.filter((id) => !completed.has(id));
const manifest = {
  schema_version: 1,
  generated_at: new Date().toISOString(),
  source: {
    base_sitemap_url: BASE_SITEMAP,
    robots_url: "https://www.asoview.com/robots.txt",
  },
  base_sitemap_count: sitemapUrls.length,
  base_sitemap_sha256: createHash("sha256")
    .update(JSON.stringify(sitemapUrls.map(({ url }) => url)))
    .digest("hex"),
  supplemental_probe: {
    path: ".codex/research/asoview-base-namespace-probe-2026-08-28.json",
    interval: probe.probe_interval,
    probe_count: probe.probe_count,
    public_hit_count: probe.public_hit_count,
  },
  namespace_min_id: 1,
  namespace_max_id: namespaceMaxId,
  observed_max_id: observedMaxId,
  namespace_id_count: namespaceIds.length,
  sitemap_covered_id_count: sitemapIdSet.size,
  off_sitemap_scan_target_id_count: scanTargetIds.length,
  derivation:
    "Take the greatest numeric base ID observed in the current sitemap or the supplemental probe, round its containing allocation block up to the end of the 5,000-ID block, and exhaustively scan every ID from 1 through that bound that is not already covered by sitemap_3_base. Empty gaps are retained so isolated off-sitemap pages cannot be missed by band sampling.",
};
await writeFile(MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

console.log(
  JSON.stringify(
    {
      ...manifest,
      resume_count: completed.size,
      pending_count: targets.length,
      concurrency: CONCURRENCY,
      request_spacing_ms: REQUEST_SPACING_MS,
    },
    null,
    2,
  ),
);

const output = createWriteStream(OUTPUT, { flags: "a", encoding: "utf8" });
let cursor = 0;
let written = 0;
let publicCount = 0;
let retryableFailures = 0;
let nextRequestAt = Date.now();
let throttle = Promise.resolve();

async function worker() {
  while (true) {
    const index = cursor++;
    if (index >= targets.length) return;
    const id = targets[index];
    const record = await fetchBase(id);
    if (record.public_page) publicCount += 1;
    if (!record.terminal) retryableFailures += 1;
    output.write(`${JSON.stringify(record)}\n`);
    written += 1;
    if (written % 500 === 0 || written === targets.length) {
      console.log(
        `progress=${written}/${targets.length} public=${publicCount} retryable_failures=${retryableFailures} last_id=${id}`,
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

if (retryableFailures > 0) {
  throw new Error(
    `${retryableFailures} IDs failed after retries; rerun to append terminal replacements`,
  );
}

console.log(`Base namespace catalog complete: ${OUTPUT}`);

async function fetchBase(id) {
  const url = `https://www.asoview.com/base/${id}/`;
  let lastError = "unknown error";
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20_000);
    try {
      await waitForRequestSlot();
      const response = await fetch(url, {
        redirect: "follow",
        signal: controller.signal,
        headers: {
          Accept: "text/html,application/xhtml+xml",
          "User-Agent": USER_AGENT,
        },
      });
      const html = await readThroughHead(response);
      clearTimeout(timeout);
      const title = decodeHtml(extractTagText(html, "title"));
      const notFound =
        response.status === 404 || /お探しのページが見つかりません/u.test(title);
      if (
        [403, 408, 425, 429].includes(response.status) ||
        response.status >= 500
      ) {
        if (attempt < 3) {
          await delay(30_000 * attempt);
          continue;
        }
        return {
          id,
          url,
          in_base_sitemap: sitemapIdSet.has(id),
          status: response.status,
          terminal: false,
          public_page: false,
          title,
          description: "",
          robots: "",
          canonical_url: "",
          fetched_at: new Date().toISOString(),
          error: `retryable HTTP status ${response.status}`,
        };
      }
      return {
        id,
        url,
        in_base_sitemap: sitemapIdSet.has(id),
        status: response.status,
        terminal:
          response.ok ||
          (response.status >= 400 &&
            response.status < 500 &&
            ![403, 408, 425, 429].includes(response.status)),
        public_page: response.ok && !notFound,
        title,
        description: decodeHtml(extractMeta(html, "description")),
        robots: decodeHtml(extractMeta(html, "robots")),
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
    id,
    url,
    in_base_sitemap: sitemapIdSet.has(id),
    status: 0,
    terminal: false,
    public_page: false,
    title: "",
    description: "",
    robots: "",
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
      if (/<\/head>/iu.test(html)) break;
    }
  } finally {
    await reader.cancel().catch(() => {});
  }
  return html;
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
  return value
    .replace(/&amp;/gu, "&")
    .replace(/&quot;/gu, '"')
    .replace(/&#39;|&apos;/gu, "'")
    .replace(/&lt;/gu, "<")
    .replace(/&gt;/gu, ">");
}

function delay(milliseconds) {
  return new Promise((resolveDelay) => setTimeout(resolveDelay, milliseconds));
}
