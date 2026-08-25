#!/usr/bin/env node

import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const API_URL = "https://experiences.travel.rakuten.co.jp/api/experiences/search";
const PAGE_SIZE = 18;
const DEFAULT_CONCURRENCY = 8;

function parseArgs(argv) {
  const args = {
    output: "tmp/rakuten-japan-catalog-2026-08-25.json",
    concurrency: DEFAULT_CONCURRENCY,
  };

  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === "--output") args.output = argv[++index];
    else if (argv[index] === "--concurrency") args.concurrency = Number(argv[++index]);
    else throw new Error(`Unknown argument: ${argv[index]}`);
  }

  if (!Number.isInteger(args.concurrency) || args.concurrency < 1 || args.concurrency > 20) {
    throw new Error("--concurrency must be an integer from 1 through 20");
  }

  return args;
}

async function fetchJson(page, attempt = 1) {
  const url = new URL(API_URL);
  url.searchParams.set("language", "ja");
  url.searchParams.set("locale", "ja-jp");
  url.searchParams.set("displayCurrency", "JPY");
  url.searchParams.set("destination", "1");
  url.searchParams.set("page", String(page));

  try {
    const response = await fetch(url, {
      headers: {
        accept: "application/json",
        "user-agent": "Memorips FacilityOps coverage audit/1.0",
      },
      signal: AbortSignal.timeout(60_000),
    });
    if (!response.ok) {
      const error = new Error(`HTTP ${response.status}`);
      error.status = response.status;
      error.retryAfter = Number(response.headers.get("retry-after")) || 0;
      throw error;
    }
    return await response.json();
  } catch (error) {
    if (attempt >= 8) throw new Error(`Page ${page} failed after ${attempt} attempts: ${error.message}`);
    const retryDelay = Math.max(error.retryAfter * 1_000, Math.min(60_000, 1_500 * 2 ** (attempt - 1)));
    await new Promise((resolvePromise) => setTimeout(resolvePromise, retryDelay));
    return fetchJson(page, attempt + 1);
  }
}

function compact(item) {
  return {
    id: item.id,
    title: item.title,
    destinations: (item.destination ?? []).map(({ id, level, value }) => ({ id, level, value })),
    available: item.available,
    active: item.active,
    published: item.published,
    latest_availability: item.latestAvailability,
    default_price_jpy: item.defaultPriceInJPY,
    option_count: Number(item.optionCount),
    key_information: (item.keyInformation ?? []).map(({ id, value }) => ({ id, value })),
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const first = await fetchJson(1);
  const expectedCount = first?.experiences?.count;
  const firstItems = first?.experiences?.experiences;
  if (!Number.isInteger(expectedCount) || !Array.isArray(firstItems)) {
    throw new Error("Unexpected Rakuten catalog response shape");
  }

  const pageCount = Math.ceil(expectedCount / PAGE_SIZE);
  const pages = new Array(pageCount);
  pages[0] = firstItems;
  let nextPage = 2;

  async function worker() {
    while (true) {
      const page = nextPage;
      nextPage += 1;
      if (page > pageCount) return;
      const result = await fetchJson(page);
      if (result?.experiences?.count !== expectedCount) {
        throw new Error(`Catalog count changed while fetching page ${page}`);
      }
      pages[page - 1] = result.experiences.experiences;
      await new Promise((resolvePromise) => setTimeout(resolvePromise, 150));
      if (page % 50 === 0 || page === pageCount) {
        process.stderr.write(`Fetched ${page}/${pageCount} pages\n`);
      }
    }
  }

  await Promise.all(Array.from({ length: args.concurrency }, worker));

  const items = pages.flat().map(compact).sort((a, b) => a.id - b.id);
  const ids = new Set(items.map((item) => item.id));
  if (items.length !== expectedCount || ids.size !== expectedCount) {
    throw new Error(
      `Coverage mismatch: expected ${expectedCount}, received ${items.length}, unique ${ids.size}`,
    );
  }

  const itemPayload = JSON.stringify(items);
  const snapshot = {
    schema_version: 1,
    fetched_at: new Date().toISOString(),
    source: {
      api_url: API_URL,
      destination_id: 1,
      destination_name: "Japan",
      language: "ja",
      locale: "ja-jp",
      display_currency: "JPY",
    },
    coverage: {
      expected_product_count: expectedCount,
      fetched_product_count: items.length,
      unique_product_count: ids.size,
      page_size: PAGE_SIZE,
      page_count: pageCount,
      items_sha256: createHash("sha256").update(itemPayload).digest("hex"),
    },
    items,
  };

  const output = resolve(args.output);
  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");
  process.stdout.write(`${JSON.stringify({ output, ...snapshot.coverage }, null, 2)}\n`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
