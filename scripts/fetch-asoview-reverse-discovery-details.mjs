import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const INVENTORY_PATH = resolve(
  ROOT,
  "docs/audits/asoview-facility-candidates-2026-08-26.json",
);
const OUTPUT_PATH = resolve(
  ROOT,
  ".codex/research/asoview-reverse-discovery-details-2026-08-26.json",
);
const USER_AGENT =
  "MemoripFacilityOpsDiscovery/1.0 (+https://trip-guide.net; public-pages-only)";
const SPACING_MS = Number(process.env.ASOVIEW_REVERSE_SPACING_MS ?? 650);
const CONCURRENCY = Number(process.env.ASOVIEW_REVERSE_CONCURRENCY ?? 1);
const DETAILS_VERSION = 2;
const PREFECTURE_PATTERN =
  /北海道|青森県|岩手県|宮城県|秋田県|山形県|福島県|茨城県|栃木県|群馬県|埼玉県|千葉県|東京都|神奈川県|新潟県|富山県|石川県|福井県|山梨県|長野県|岐阜県|静岡県|愛知県|三重県|滋賀県|京都府|大阪府|兵庫県|奈良県|和歌山県|鳥取県|島根県|岡山県|広島県|山口県|徳島県|香川県|愛媛県|高知県|福岡県|佐賀県|長崎県|熊本県|大分県|宮崎県|鹿児島県|沖縄県/u;

const inventory = JSON.parse(await readFile(INVENTORY_PATH, "utf8"));
if (
  !inventory.source.catalog_complete &&
  process.env.ASOVIEW_ALLOW_INCOMPLETE !== "1"
) {
  throw new Error("refusing reverse discovery from an incomplete catalog");
}

let priorByIdentity = new Map();
try {
  const prior = JSON.parse(await readFile(OUTPUT_PATH, "utf8"));
  if (prior.details_version === DETAILS_VERSION) {
    priorByIdentity = new Map(
      prior.items
        .filter((item) => item.fetch_ok)
        .map((item) => [item.normalized_identity, item]),
    );
  }
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}

const items = inventory.reverse_discovery_candidates.map((candidate) =>
  priorByIdentity.get(candidate.normalized_identity) ?? {
    asoview_identity: candidate.asoview_identity,
    normalized_identity: candidate.normalized_identity,
    family_relevance: candidate.family_relevance,
    initial_disposition: candidate.initial_disposition,
    canon_matches: candidate.canon_matches,
    source_url: preferredPage(candidate.pages).url,
    fetch_ok: false,
  },
);

const pending = items.filter((candidate) => !candidate.fetch_ok);
let cursor = 0;
let reviewed = 0;
let requestThrottle = Promise.resolve();
let nextRequestAt = Date.now();

await Promise.all(
  Array.from({ length: Math.min(CONCURRENCY, pending.length || 1) }, worker),
);

async function worker() {
  while (true) {
    const index = cursor++;
    if (index >= pending.length) return;
    const item = pending[index];
    await waitForRequestSlot();
    Object.assign(item, await fetchDetails(item.source_url));
    reviewed += 1;
    if (reviewed % 25 === 0 || reviewed === pending.length) {
      await save();
      console.log(
        `reviewed=${reviewed}/${pending.length} remaining=${items.filter((candidate) => !candidate.fetch_ok).length}`,
      );
    }
  }
}

await save();
console.log(`reverse details complete: ${items.length} identities`);

async function save() {
  const output = {
    schema_version: 1,
    details_version: DETAILS_VERSION,
    generated_at: new Date().toISOString(),
    source_catalog_complete: inventory.source.catalog_complete,
    item_count: items.length,
    fetch_ok_count: items.filter((item) => item.fetch_ok).length,
    items,
  };
  await writeFile(OUTPUT_PATH, `${JSON.stringify(output, null, 2)}\n`, "utf8");
}

async function fetchDetails(url) {
  const verifiedAt = new Date().toISOString();
  try {
    const response = await fetch(url, {
      redirect: "follow",
      headers: {
        Accept: "text/html,application/xhtml+xml",
        "User-Agent": USER_AGENT,
      },
    });
    const html = await response.text();
    const visibleText = decodeHtml(
      html
        .replace(/<script[\s\S]*?<\/script>/gi, " ")
        .replace(/<style[\s\S]*?<\/style>/gi, " ")
        .replace(/<[^>]+>/g, " "),
    ).replace(/\s+/g, " ");
    const canonical =
      html
        .match(/<link[^>]+rel=["']canonical["'][^>]*>/i)?.[0]
        ?.match(/href=["']([^"']+)["']/i)?.[1] ?? "";
    const basePath = html.match(/href=["'](\/base\/\d+\/)["']/i)?.[1] ?? "";
    const address = decodeHtml(
      html
        .match(/class=["']access-information__base-address["'][^>]*>([\s\S]*?)<\/span>/i)?.[1]
        ?.replace(/<[^>]+>/g, " ") ?? "",
    ).replace(/\s+/g, " ").trim();
    const coordinates = html
      .match(/maps\.google\.co\.jp\/maps\?q=(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/i)
      ?.slice(1, 3)
      .map(Number);
    return {
      fetch_ok: response.ok,
      fetched_at: verifiedAt,
      status: response.status,
      final_url: response.url,
      canonical_url: canonical,
      base_url: basePath ? new URL(basePath, response.url).href : "",
      address,
      latitude: coordinates?.[0],
      longitude: coordinates?.[1],
      prefecture: address.match(PREFECTURE_PATTERN)?.[0] ?? "",
      visible_unavailable_marker:
        visibleText.match(
          /販売終了|販売期間外|予約受付終了|受付を終了|現在(?:は)?(?:購入|予約)できません|このチケットは現在販売していません/u,
        )?.[0] ?? "",
      visible_text_excerpt: visibleText.slice(0, 1_200),
    };
  } catch (error) {
    return {
      fetch_ok: false,
      fetched_at: verifiedAt,
      status: 0,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function waitForRequestSlot() {
  let release;
  const previous = requestThrottle;
  requestThrottle = new Promise((resolveThrottle) => {
    release = resolveThrottle;
  });
  await previous;
  const wait = Math.max(0, nextRequestAt - Date.now());
  if (wait) await delay(wait);
  nextRequestAt = Date.now() + SPACING_MS;
  release();
}

function preferredPage(pages) {
  return (
    pages.find((page) => page.kind === "ticket") ??
    pages.find((page) => page.kind === "base") ??
    pages[0]
  );
}

function decodeHtml(value) {
  return String(value ?? "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function delay(milliseconds) {
  return new Promise((resolveDelay) => setTimeout(resolveDelay, milliseconds));
}
