#!/usr/bin/env node

import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { gunzipSync } from "node:zlib";

const ROOT = resolve(import.meta.dirname, "..");
const OUTPUT = resolve(
  ROOT,
  ".codex/research/asoview-base-namespace-probe-2026-08-28.json",
);
const BASE_SITEMAP = "https://www.asoview.com/sitemap_3_base.xml.gz";
const REQUEST_SPACING_MS = Number(
  process.env.ASOVIEW_FETCH_SPACING_MS ?? 120,
);
const CONCURRENCY = Number(process.env.ASOVIEW_FETCH_CONCURRENCY ?? 4);
const USER_AGENT =
  "MemoripBaseNamespaceAudit/1.0 (+https://trip-guide.net; public-pages-only)";

const sitemapResponse = await fetch(BASE_SITEMAP, {
  headers: { "User-Agent": USER_AGENT },
});
if (!sitemapResponse.ok) {
  throw new Error(`base sitemap fetch failed: ${sitemapResponse.status}`);
}
const sitemapXml = gunzipSync(
  Buffer.from(await sitemapResponse.arrayBuffer()),
).toString("utf8");
const sitemapIds = sitemapXml
  .split("https://www.asoview.com/base/")
  .slice(1)
  .map((suffix) => Number(suffix.split("/")[0]))
  .filter(Number.isFinite);
const upperBound = Math.ceil((Math.max(...sitemapIds) + 1) / 5_000) * 5_000 - 1;
const probeIds = [];
for (let id = 1; id <= upperBound; id += 100) probeIds.push(id);

let cursor = 0;
let nextRequestAt = Date.now();
let throttle = Promise.resolve();
const publicHits = [];
const failures = [];

async function worker() {
  while (true) {
    const index = cursor++;
    if (index >= probeIds.length) return;
    const result = await probe(probeIds[index]);
    if (result.public_page) publicHits.push(result);
    if (!result.terminal) failures.push(result);
    if ((index + 1) % 250 === 0) {
      console.log(
        `progress=${index + 1}/${probeIds.length} public_hits=${publicHits.length} retryable_failures=${failures.length}`,
      );
    }
  }
}

await Promise.all(Array.from({ length: CONCURRENCY }, worker));
if (failures.length > 0) {
  throw new Error(`probe has ${failures.length} retryable failures`);
}

const output = {
  schema_version: 1,
  probed_at: new Date().toISOString(),
  source: {
    base_sitemap_url: BASE_SITEMAP,
    robots_url: "https://www.asoview.com/robots.txt",
  },
  probe_interval: 100,
  lower_bound: 1,
  upper_bound: upperBound,
  probe_count: probeIds.length,
  public_hit_count: publicHits.length,
  public_hits: publicHits.sort((left, right) => left.id - right.id),
};
await writeFile(OUTPUT, `${JSON.stringify(output, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ ...output, public_hits: undefined }, null, 2));

async function probe(id) {
  const url = `https://www.asoview.com/base/${id}/`;
  let lastError = "unknown error";
  for (let attempt = 1; attempt <= 5; attempt += 1) {
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
      const unavailable = /お探しのページが見つかりません/u.test(title);
      if (
        [403, 408, 425, 429].includes(response.status) ||
        response.status >= 500
      ) {
        await delay(30_000 * attempt);
        continue;
      }
      return {
        id,
        url,
        status: response.status,
        terminal:
          response.ok ||
          (response.status >= 400 && response.status < 500),
        public_page: response.ok && !unavailable,
        title,
      };
    } catch (error) {
      clearTimeout(timeout);
      lastError = error instanceof Error ? error.message : String(error);
      if (attempt < 5) await delay(2_000 * 2 ** (attempt - 1));
    }
  }
  return {
    id,
    url,
    status: 0,
    terminal: false,
    public_page: false,
    title: "",
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
