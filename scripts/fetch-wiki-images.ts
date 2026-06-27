import {
  appendFile,
  copyFile,
  mkdir,
  readFile,
  writeFile,
} from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { Facility } from "../types/facility";

interface FacilitiesFile {
  metadata: unknown;
  facilities: Facility[];
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const DATA_PATH = resolve(ROOT, "data/facilities_data.json");
const IMAGES_DIR = resolve(ROOT, "public/images/facilities");
const FAILURE_LOG = resolve(ROOT, "scripts/fetch-wiki-failures.log");

const DRY_RUN = process.argv.includes("--dry-run");
const FORCE = process.argv.includes("--force");
const PREFECTURE_FILTER = process.argv
  .find((arg) => arg.startsWith("--prefecture="))
  ?.split("=", 2)[1];
const RATE_LIMIT_MS = 150;

const UA = "trip-guide.net image fetcher (info@fic-investment.biz)";

interface WikiQueryPage {
  pageid: number;
  ns: number;
  title: string;
  fullurl?: string;
  index?: number;
  original?: { source: string; width: number; height: number };
  thumbnail?: { source: string; width: number; height: number };
}

interface WikiQueryResp {
  query?: { pages?: Record<string, WikiQueryPage> };
}

let lastRequestAt = 0;
async function rateLimit(): Promise<void> {
  const elapsed = Date.now() - lastRequestAt;
  if (elapsed < RATE_LIMIT_MS) {
    await new Promise((r) => setTimeout(r, RATE_LIMIT_MS - elapsed));
  }
  lastRequestAt = Date.now();
}

function normalizeForCompare(s: string): string {
  return s
    .toLowerCase()
    .replace(/[\s　\-_()（）「」『』・,.、。!！?？]/g, "");
}

function sharesSignificantSubstring(
  a: string,
  b: string,
  minLen = 3,
): boolean {
  const A = normalizeForCompare(a);
  const B = normalizeForCompare(b);
  if (!A || !B) return false;
  // Either side contains the other entirely (when short)
  if (A.length >= minLen && B.includes(A)) return true;
  if (B.length >= minLen && A.includes(B)) return true;
  // Find any contiguous substring of A of length >= minLen that's in B
  for (let i = 0; i + minLen <= A.length; i++) {
    const piece = A.slice(i, i + minLen);
    if (B.includes(piece)) return true;
  }
  return false;
}

async function searchWikipedia(
  query: string,
  facilityName: string,
  signal: AbortSignal,
): Promise<
  | {
      ok: true;
      title: string;
      pageUrl: string;
      imageUrl: string;
    }
  | { ok: false; reason: string }
> {
  await rateLimit();
  const url = new URL("https://ja.wikipedia.org/w/api.php");
  url.searchParams.set("action", "query");
  url.searchParams.set("format", "json");
  url.searchParams.set("generator", "search");
  url.searchParams.set("gsrsearch", query);
  url.searchParams.set("gsrlimit", "3");
  url.searchParams.set("prop", "pageimages|info");
  url.searchParams.set("piprop", "original|thumbnail");
  url.searchParams.set("pithumbsize", "1200");
  url.searchParams.set("inprop", "url");
  url.searchParams.set("redirects", "1");
  url.searchParams.set("origin", "*");

  let res: Response;
  try {
    res = await fetch(url, { signal, headers: { "User-Agent": UA } });
  } catch (e) {
    return { ok: false, reason: `network: ${(e as Error).message}` };
  }
  if (!res.ok) return { ok: false, reason: `http ${res.status}` };
  const data = (await res.json()) as WikiQueryResp;
  const pages = data.query?.pages;
  if (!pages) return { ok: false, reason: "no results" };

  // Find the first result (by index) with an image AND a title that
  // shares a substring with the facility name (filters out fuzzy false positives)
  const sorted = Object.values(pages).sort(
    (a, b) => (a.index ?? 0) - (b.index ?? 0),
  );
  for (const p of sorted) {
    const src = p.original?.source ?? p.thumbnail?.source;
    if (!src) continue;
    if (!sharesSignificantSubstring(p.title, facilityName)) continue;
    return {
      ok: true,
      title: p.title,
      pageUrl: p.fullurl ?? "",
      imageUrl: src,
    };
  }
  return { ok: false, reason: "no matching image" };
}

async function downloadImage(
  imageUrl: string,
  outPath: string,
  signal: AbortSignal,
): Promise<{ ok: true; size: number } | { ok: false; reason: string }> {
  await rateLimit();
  let res: Response;
  try {
    res = await fetch(imageUrl, {
      signal,
      headers: { "User-Agent": UA },
      redirect: "follow",
    });
  } catch (e) {
    return { ok: false, reason: `network: ${(e as Error).message}` };
  }
  if (!res.ok) return { ok: false, reason: `http ${res.status}` };
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 1000) return { ok: false, reason: `too small ${buf.length}b` };
  await mkdir(dirname(outPath), { recursive: true });
  await writeFile(outPath, buf);
  return { ok: true, size: buf.length };
}

async function logFailure(
  slug: string,
  name: string,
  reason: string,
): Promise<void> {
  const line = [new Date().toISOString(), slug, name, reason].join("\t") + "\n";
  await appendFile(FAILURE_LOG, line, "utf-8");
}

function chooseExt(imageUrl: string): string {
  const m = imageUrl.match(/\.(jpe?g|png|webp|gif)$/i);
  if (m) return m[1].toLowerCase().replace("jpeg", "jpg");
  return "jpg";
}

async function main(): Promise<void> {
  const raw = await readFile(DATA_PATH, "utf-8");
  const json = JSON.parse(raw) as FacilitiesFile;

  // Manually rejected ids — past Wikipedia fuzzy matches the user reviewed
  // and turned down. Skipped unless --force, otherwise every run re-fetches
  // and re-rejects them.
  const blacklistPath = resolve(ROOT, "data/wiki-image-blacklist.json");
  const blacklist = new Set<number>(
    existsSync(blacklistPath)
      ? (JSON.parse(await readFile(blacklistPath, "utf-8"))
          .rejected as number[])
      : [],
  );

  const targets = json.facilities.filter(
    (f) =>
      (PREFECTURE_FILTER ? f.prefecture_id === PREFECTURE_FILTER : true) &&
      (FORCE || (!f.image && !blacklist.has(f.id))),
  );

  console.log(`Total: ${json.facilities.length}`);
  if (PREFECTURE_FILTER) {
    console.log(`Prefecture filter: ${PREFECTURE_FILTER}`);
  }
  console.log(`Targets needing images: ${targets.length}`);
  if (blacklist.size > 0 && !FORCE) {
    console.log(`Blacklisted (skipped): ${blacklist.size}`);
  }

  if (DRY_RUN) {
    console.log("\n[DRY RUN]");
    targets.slice(0, 10).forEach((f, i) =>
      console.log(`  ${i + 1}. ${f.slug} ${f.name}`),
    );
    if (targets.length > 10)
      console.log(`  ... +${targets.length - 10} more`);
    console.log(
      `\nEstimated requests: ${targets.length * 2} | ~${Math.ceil((targets.length * 2 * RATE_LIMIT_MS) / 1000)} sec`,
    );
    return;
  }

  if (targets.length === 0) {
    console.log("Nothing to do.");
    return;
  }

  const backupPath = resolve(ROOT, "data/facilities_data.json.images.bak");
  if (!existsSync(backupPath)) {
    await copyFile(DATA_PATH, backupPath);
    console.log(`Backed up: ${backupPath}`);
  }

  const ac = new AbortController();
  let interrupted = false;
  const onSig = () => {
    if (interrupted) return;
    interrupted = true;
    console.log("\nInterrupt — saving progress…");
    ac.abort();
  };
  process.on("SIGINT", onSig);
  process.on("SIGTERM", onSig);

  let okCount = 0;
  let noMatch = 0;
  let failCount = 0;

  for (let i = 0; i < targets.length; i++) {
    if (ac.signal.aborted) break;
    const f = targets[i];
    const idx = `[${i + 1}/${targets.length}]`;

    // Try multiple search queries
    const queries = [f.name, `${f.name} ${f.prefecture}`];
    let result: Awaited<ReturnType<typeof searchWikipedia>> | null = null;
    for (const q of queries) {
      result = await searchWikipedia(q, f.name, ac.signal);
      if (result.ok) break;
    }

    if (!result || !result.ok) {
      noMatch++;
      console.log(`${idx} - ${f.slug} ${f.name}: no Wikipedia image`);
      continue;
    }

    const ext = chooseExt(result.imageUrl);
    const outPath = resolve(IMAGES_DIR, `${f.slug}.${ext}`);
    const dl = await downloadImage(result.imageUrl, outPath, ac.signal);
    if (!dl.ok) {
      failCount++;
      await logFailure(f.slug, f.name, `download: ${dl.reason}`);
      console.log(`${idx} ✗ ${f.slug}: download ${dl.reason}`);
      continue;
    }

    f.image = `/images/facilities/${f.slug}.${ext}`;
    f.image_attribution = result.pageUrl
      ? `<a href="${result.pageUrl}" rel="noopener noreferrer" target="_blank">Wikipedia: ${result.title}</a>`
      : `Wikipedia: ${result.title}`;
    f.image_source = "manual";
    okCount++;
    console.log(
      `${idx} ✓ ${f.slug} ${f.name} ← "${result.title}" (${(dl.size / 1024).toFixed(0)}KB)`,
    );

    if ((i + 1) % 5 === 0) {
      await writeFile(DATA_PATH, JSON.stringify(json, null, 2), "utf-8");
    }
  }

  process.off("SIGINT", onSig);
  process.off("SIGTERM", onSig);
  await writeFile(DATA_PATH, JSON.stringify(json, null, 2), "utf-8");

  console.log(
    `\nDone. Got: ${okCount}, No-match: ${noMatch}, Failed: ${failCount}, Total: ${targets.length}`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
