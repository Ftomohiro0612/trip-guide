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
const FAILURE_LOG = resolve(ROOT, "scripts/fetch-images-failures.log");

const DRY_RUN = process.argv.includes("--dry-run");
const FORCE = process.argv.includes("--force");
const RATE_LIMIT_MS = 200; // 5 req/sec
const MAX_WIDTH = 1200;

interface NewPlace {
  id: string;
  displayName?: { text: string };
  photos?: Array<{
    name: string; // e.g. "places/ChIJ.../photos/AbcXYZ"
    widthPx?: number;
    heightPx?: number;
    authorAttributions?: Array<{
      displayName?: string;
      uri?: string;
      photoUri?: string;
    }>;
  }>;
}

interface SearchTextResponse {
  places?: NewPlace[];
  error?: { code: number; message: string; status: string };
}

let lastRequestAt = 0;
async function rateLimit(): Promise<void> {
  const elapsed = Date.now() - lastRequestAt;
  if (elapsed < RATE_LIMIT_MS) {
    await new Promise((r) => setTimeout(r, RATE_LIMIT_MS - elapsed));
  }
  lastRequestAt = Date.now();
}

async function searchText(
  query: string,
  apiKey: string,
  signal: AbortSignal,
): Promise<
  | { ok: true; place: NewPlace }
  | { ok: false; reason: string; fatal?: boolean }
> {
  await rateLimit();
  let res: Response;
  try {
    res = await fetch("https://places.googleapis.com/v1/places:searchText", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask":
          "places.id,places.displayName,places.photos",
      },
      body: JSON.stringify({
        textQuery: query,
        languageCode: "ja",
        regionCode: "JP",
        maxResultCount: 1,
      }),
      signal,
    });
  } catch (e) {
    return { ok: false, reason: `network: ${(e as Error).message}` };
  }
  if (!res.ok) {
    const body = await res.text();
    const fatal = res.status === 400 || res.status === 403 || res.status === 429;
    return { ok: false, reason: `http ${res.status}: ${body.slice(0, 200)}`, fatal };
  }
  const data = (await res.json()) as SearchTextResponse;
  if (data.error) {
    return { ok: false, reason: `${data.error.status}: ${data.error.message}`, fatal: true };
  }
  const place = data.places?.[0];
  if (!place) return { ok: false, reason: "no place" };
  return { ok: true, place };
}

async function downloadPhoto(
  photoName: string,
  apiKey: string,
  outPath: string,
  signal: AbortSignal,
): Promise<{ ok: true } | { ok: false; reason: string; fatal?: boolean }> {
  await rateLimit();
  // Photo URI format per new API:
  // https://places.googleapis.com/v1/{photoName}/media?maxWidthPx=...&key=...
  // photoName already contains "places/{placeId}/photos/{photoId}"
  const url = new URL(
    `https://places.googleapis.com/v1/${photoName}/media`,
  );
  url.searchParams.set("maxWidthPx", String(MAX_WIDTH));
  url.searchParams.set("key", apiKey);
  let res: Response;
  try {
    res = await fetch(url, { signal, redirect: "follow" });
  } catch (e) {
    return { ok: false, reason: `network: ${(e as Error).message}` };
  }
  if (!res.ok) {
    const body = await res.text();
    const fatal = res.status === 400 || res.status === 403 || res.status === 429;
    return {
      ok: false,
      reason: `http ${res.status}: ${body.slice(0, 200)}`,
      fatal,
    };
  }
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 1000) {
    return { ok: false, reason: `too small (${buf.length}b)` };
  }
  await mkdir(dirname(outPath), { recursive: true });
  await writeFile(outPath, buf);
  return { ok: true };
}

async function logFailure(
  slug: string,
  name: string,
  reason: string,
): Promise<void> {
  const line = [new Date().toISOString(), slug, name, reason].join("\t") + "\n";
  await appendFile(FAILURE_LOG, line, "utf-8");
}

function buildAttribution(p: NewPlace): string {
  const photo = p.photos?.[0];
  if (!photo) return "";
  const attr = photo.authorAttributions?.[0];
  if (!attr) return "";
  const name = attr.displayName ?? "";
  const uri = attr.uri ?? "";
  if (uri && name) {
    return `<a href="${uri}" rel="noopener noreferrer" target="_blank">${name}</a>`;
  }
  return name;
}

async function main(): Promise<void> {
  const apiKey = process.env.GOOGLE_GEOCODING_API_KEY;
  if (!DRY_RUN && (!apiKey || apiKey.trim() === "")) {
    console.error("GOOGLE_GEOCODING_API_KEY missing.");
    process.exit(1);
  }

  const raw = await readFile(DATA_PATH, "utf-8");
  const json = JSON.parse(raw) as FacilitiesFile;
  const targets = json.facilities.filter((f) => FORCE || !f.image);

  console.log(`Total facilities: ${json.facilities.length}`);
  console.log(`Targets needing images: ${targets.length}`);

  if (DRY_RUN) {
    console.log("\n[DRY RUN] No API calls.");
    targets.slice(0, 10).forEach((f, i) => {
      console.log(`  ${i + 1}. ${f.slug}  ${f.name}`);
    });
    if (targets.length > 10) console.log(`  ... +${targets.length - 10} more`);
    console.log(
      `\nEstimated requests: ${targets.length * 2} (search + photo) | ~${Math.ceil((targets.length * 2) / 5)} sec`,
    );
    console.log(
      `Estimated cost: SearchText $0.032 + Photo $0.007 = ~$${(targets.length * 0.039).toFixed(2)}`,
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
  let failCount = 0;
  let stopped = false;

  for (let i = 0; i < targets.length; i++) {
    if (ac.signal.aborted) break;
    const f = targets[i];
    const idx = `[${i + 1}/${targets.length}]`;

    // Step 1: search text — try name+prefecture, fallback to address
    let result = await searchText(
      `${f.name} ${f.prefecture}`,
      apiKey!,
      ac.signal,
    );
    if (!result.ok && !result.fatal) {
      result = await searchText(
        `${f.prefecture} ${f.address}`,
        apiKey!,
        ac.signal,
      );
    }
    if (!result.ok) {
      failCount++;
      await logFailure(f.slug, f.name, `search: ${result.reason}`);
      console.log(`${idx} ✗ ${f.slug}: search ${result.reason.slice(0, 80)}`);
      if (result.fatal) {
        stopped = true;
        break;
      }
      continue;
    }

    const place = result.place;
    f.place_id = place.id;

    // Step 2: photo
    const photo = place.photos?.[0];
    if (!photo) {
      failCount++;
      await logFailure(f.slug, f.name, "no photos");
      console.log(`${idx} - ${f.slug}: no photos available`);
      continue;
    }
    const outPath = resolve(IMAGES_DIR, `${f.slug}.jpg`);
    const dl = await downloadPhoto(photo.name, apiKey!, outPath, ac.signal);
    if (!dl.ok) {
      failCount++;
      await logFailure(f.slug, f.name, `download: ${dl.reason}`);
      console.log(`${idx} ✗ ${f.slug}: download ${dl.reason.slice(0, 80)}`);
      if (dl.fatal) {
        stopped = true;
        break;
      }
      continue;
    }

    f.image = `/images/facilities/${f.slug}.jpg`;
    f.image_attribution = buildAttribution(place);
    f.image_source = "google-places";
    okCount++;
    console.log(`${idx} ✓ ${f.slug} ${f.name}`);

    if ((i + 1) % 5 === 0) {
      await writeFile(DATA_PATH, JSON.stringify(json, null, 2), "utf-8");
    }
  }

  process.off("SIGINT", onSig);
  process.off("SIGTERM", onSig);
  await writeFile(DATA_PATH, JSON.stringify(json, null, 2), "utf-8");

  console.log(
    `\nDone. Got images: ${okCount}, Failed: ${failCount}, Total: ${targets.length}`,
  );
  if (failCount > 0) console.log(`Failures: ${FAILURE_LOG}`);
  if (stopped) process.exit(2);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
