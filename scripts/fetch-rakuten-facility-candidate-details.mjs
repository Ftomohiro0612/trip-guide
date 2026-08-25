#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const DETAIL_URL = "https://experiences.travel.rakuten.co.jp/api/experiences/details";

function parseArgs(argv) {
  const args = {
    input: "tmp/rakuten-facility-discovery-preaudit-2026-08-25.json",
    output: "tmp/rakuten-facility-candidate-details-2026-08-25.json",
    concurrency: 3,
  };
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === "--input") args.input = argv[++index];
    else if (argv[index] === "--output") args.output = argv[++index];
    else if (argv[index] === "--concurrency") args.concurrency = Number(argv[++index]);
    else throw new Error(`Unknown argument: ${argv[index]}`);
  }
  return args;
}

async function fetchDetail(id, attempt = 1) {
  const url = new URL(`${DETAIL_URL}/${id}`);
  url.searchParams.set("language", "ja");
  url.searchParams.set("locale", "ja-jp");
  url.searchParams.set("displayCurrency", "JPY");
  url.searchParams.set("currency", "JPY");
  try {
    const response = await fetch(url, {
      headers: {
        accept: "application/json",
        "user-agent": "Memorips FacilityOps discovery audit/1.0",
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
    const retryable = error.status === 429 || error.status >= 500 || error.name === "TimeoutError";
    const maxAttempts = error.status === 429 ? 8 : 2;
    if (!retryable || attempt >= maxAttempts) {
      return { __error: error.message, __status: error.status ?? null, __attempts: attempt };
    }
    const delay = Math.max(error.retryAfter * 1_000, Math.min(60_000, 1_500 * 2 ** (attempt - 1)));
    await new Promise((resolvePromise) => setTimeout(resolvePromise, delay));
    return fetchDetail(id, attempt + 1);
  }
}

function optionEvidence(option) {
  return {
    option_id: option.optionId,
    option_title: option.title,
    host_name: option.hostName ?? null,
    supplier_name: option.supplierName ?? null,
    venue_address:
      option.venueAdress ??
      ([option.postalCode, option.state, option.city, option.addressLine1, option.addressLine2]
        .filter(Boolean)
        .join(" ") || null),
    meeting_point: option.meetingPoint ?? null,
    business_hours: option.businessHours ?? null,
    schedule: option.schedule ?? null,
  };
}

function compact(productRow, payload) {
  if (payload.__error) {
    return {
      ...productRow,
      detail_fetch_error: payload.__error,
      detail_fetch_status: payload.__status,
      detail_fetch_attempts: payload.__attempts,
    };
  }
  const experience = payload.experience;
  return {
    ...productRow,
    detail_available: experience.available,
    detail_active: experience.active,
    detail_published: experience.published,
    detail_title: experience.title,
    overview: experience.overview ?? null,
    categories: (experience.categories ?? []).map(({ id, value, level }) => ({ id, value, level })),
    destinations: (experience.destinations ?? []).map(({ id, value, level }) => ({ id, value, level })),
    options: (experience.options ?? []).map(optionEvidence),
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const audit = JSON.parse(await readFile(resolve(args.input), "utf8"));
  const products = audit.candidates;
  const details = new Array(products.length);
  try {
    const existing = JSON.parse(await readFile(resolve(args.output), "utf8"));
    const existingById = new Map(existing.products.map((product) => [product.product_id, product]));
    products.forEach((product, index) => {
      details[index] = existingById.get(product.product_id);
    });
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  let cursor = 0;
  let completed = details.filter(Boolean).length;

  async function writeCheckpoint() {
    const result = {
      schema_version: 1,
      fetched_at: new Date().toISOString(),
      source_product_count: audit.catalog_coverage.fetched_product_count,
      candidate_product_count: products.length,
      detail_product_count: details.filter(Boolean).length,
      products: details.filter(Boolean),
    };
    await writeFile(resolve(args.output), `${JSON.stringify(result, null, 2)}\n`, "utf8");
  }

  async function worker() {
    while (true) {
      const index = cursor;
      cursor += 1;
      if (index >= products.length) return;
      if (details[index]) continue;
      const product = products[index];
      details[index] = compact(product, await fetchDetail(product.product_id));
      completed += 1;
      if (completed % 50 === 0 || completed === products.length) {
        process.stderr.write(`Fetched ${completed}/${products.length} candidate details\n`);
      }
      if (completed % 25 === 0) await writeCheckpoint();
      await new Promise((resolvePromise) => setTimeout(resolvePromise, 150));
    }
  }

  await Promise.all(Array.from({ length: args.concurrency }, worker));
  await writeCheckpoint();
  console.log(JSON.stringify({ output: resolve(args.output), candidate_product_count: products.length }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
