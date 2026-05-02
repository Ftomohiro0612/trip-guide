import {
  appendFile,
  copyFile,
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
const BACKUP_PATH = resolve(ROOT, "data/facilities_data.json.bak");
const FAILURE_LOG = resolve(ROOT, "scripts/geocode-failures.log");

const DRY_RUN = process.argv.includes("--dry-run");
const RATE_LIMIT_MS = 100; // 10 req/sec

interface GoogleGeocodeResponse {
  status: string;
  error_message?: string;
  results: Array<{
    geometry: { location: { lat: number; lng: number } };
    formatted_address?: string;
    types?: string[];
    partial_match?: boolean;
  }>;
}

type GeocodeOk = {
  ok: true;
  lat: number;
  lng: number;
  formatted: string;
  partial: boolean;
};
type GeocodeErr = { ok: false; reason: string; aborted?: boolean };
type GeocodeResult = GeocodeOk | GeocodeErr;

let lastRequestAt = 0;

async function rateLimit(): Promise<void> {
  const elapsed = Date.now() - lastRequestAt;
  if (elapsed < RATE_LIMIT_MS) {
    await new Promise((r) => setTimeout(r, RATE_LIMIT_MS - elapsed));
  }
  lastRequestAt = Date.now();
}

async function geocode(
  query: string,
  apiKey: string,
  signal: AbortSignal,
): Promise<GeocodeResult> {
  await rateLimit();
  const url = new URL("https://maps.googleapis.com/maps/api/geocode/json");
  url.searchParams.set("address", query);
  url.searchParams.set("key", apiKey);
  url.searchParams.set("region", "jp");
  url.searchParams.set("language", "ja");

  let res: Response;
  try {
    res = await fetch(url, { signal });
  } catch (e) {
    if ((e as Error).name === "AbortError") {
      return { ok: false, reason: "aborted", aborted: true };
    }
    return { ok: false, reason: `network: ${(e as Error).message}` };
  }
  if (!res.ok) {
    return { ok: false, reason: `http ${res.status}` };
  }
  const data = (await res.json()) as GoogleGeocodeResponse;
  if (data.status !== "OK") {
    const msg = data.error_message ? `: ${data.error_message}` : "";
    // OVER_QUERY_LIMIT and REQUEST_DENIED are fatal — caller should stop
    return { ok: false, reason: `${data.status}${msg}` };
  }
  const r = data.results[0];
  if (!r) return { ok: false, reason: "no results" };
  return {
    ok: true,
    lat: r.geometry.location.lat,
    lng: r.geometry.location.lng,
    formatted: r.formatted_address ?? "",
    partial: r.partial_match ?? false,
  };
}

async function logFailure(
  slug: string,
  name: string,
  address: string,
  reason: string,
): Promise<void> {
  const line = [
    new Date().toISOString(),
    slug,
    name,
    address,
    reason,
  ].join("\t") + "\n";
  await appendFile(FAILURE_LOG, line, "utf-8");
}

function isFatal(reason: string): boolean {
  return (
    reason.startsWith("OVER_QUERY_LIMIT") ||
    reason.startsWith("REQUEST_DENIED") ||
    reason.startsWith("INVALID_REQUEST")
  );
}

async function main(): Promise<void> {
  const apiKey = process.env.GOOGLE_GEOCODING_API_KEY;
  if (!DRY_RUN && (!apiKey || apiKey.trim() === "")) {
    console.error(
      "GOOGLE_GEOCODING_API_KEY is missing. Ensure .env.local exists and contains the key.",
    );
    process.exit(1);
  }

  const raw = await readFile(DATA_PATH, "utf-8");
  const json = JSON.parse(raw) as FacilitiesFile;
  const targets = json.facilities.filter(
    (f) => f.geocode_source === "fallback",
  );

  console.log(`Total facilities: ${json.facilities.length}`);
  console.log(`Fallback targets to re-geocode: ${targets.length}`);

  if (DRY_RUN) {
    console.log("\n[DRY RUN] No API calls will be made. Targets:");
    targets.forEach((f, i) => {
      console.log(
        `  ${String(i + 1).padStart(3)}. ${f.slug}  ${f.name}  (${f.prefecture} ${f.address})`,
      );
    });
    console.log(`\nEstimated requests: ${targets.length} (× up to 2 retries)`);
    console.log(
      `At 10 req/sec, expected runtime: ~${Math.ceil(targets.length / 10)}–${Math.ceil((targets.length * 2) / 10)} seconds`,
    );
    return;
  }

  if (targets.length === 0) {
    console.log("Nothing to do.");
    return;
  }

  // Backup original (only if no backup yet — preserves the true pre-Google state)
  if (!existsSync(BACKUP_PATH)) {
    await copyFile(DATA_PATH, BACKUP_PATH);
    console.log(`Backed up: ${BACKUP_PATH}`);
  } else {
    console.log(`Backup already exists at ${BACKUP_PATH} (kept).`);
  }

  const ac = new AbortController();
  let interrupted = false;
  const onSig = (): void => {
    if (interrupted) return;
    interrupted = true;
    console.log("\nInterrupt — aborting and saving progress…");
    ac.abort();
  };
  process.on("SIGINT", onSig);
  process.on("SIGTERM", onSig);

  let okCount = 0;
  let failCount = 0;
  let stoppedFatal = false;

  for (let i = 0; i < targets.length; i++) {
    if (ac.signal.aborted) break;
    const f = targets[i];
    const idx = `[${i + 1}/${targets.length}]`;

    // Primary query: prefecture + address (most precise)
    const primaryQuery = `${f.prefecture} ${f.address}`;
    let result = await geocode(primaryQuery, apiKey!, ac.signal);

    // Retry with prefecture + name if first failed (and not fatal/aborted)
    if (!result.ok && !result.aborted && !isFatal(result.reason)) {
      const retry = await geocode(
        `${f.prefecture} ${f.name}`,
        apiKey!,
        ac.signal,
      );
      if (retry.ok) result = retry;
      else if (retry.aborted) result = retry;
      else {
        // Combine reasons for the failure log
        result = {
          ok: false,
          reason: `${result.reason} | ${retry.reason}`,
        };
      }
    }

    if (result.ok) {
      f.latitude = result.lat;
      f.longitude = result.lng;
      f.geocode_source = "google";
      okCount++;
      const flag = result.partial ? " (partial)" : "";
      console.log(
        `${idx} ✓ ${f.slug} ${f.name} → ${result.lat.toFixed(4)}, ${result.lng.toFixed(4)}${flag}`,
      );
    } else if (result.aborted) {
      console.log(`${idx} ⏸  aborted`);
      break;
    } else {
      failCount++;
      await logFailure(f.slug, f.name, f.address, result.reason);
      console.log(`${idx} ✗ ${f.slug} ${f.name}: ${result.reason}`);
      if (isFatal(result.reason)) {
        console.error(
          `\nFatal Google API error (${result.reason}). Stopping. Check API key, billing, and quota.`,
        );
        stoppedFatal = true;
        break;
      }
    }

    // Persist progress every 10 entries
    if ((i + 1) % 10 === 0) {
      await writeFile(DATA_PATH, JSON.stringify(json, null, 2), "utf-8");
    }
  }

  process.off("SIGINT", onSig);
  process.off("SIGTERM", onSig);

  // Final write
  await writeFile(DATA_PATH, JSON.stringify(json, null, 2), "utf-8");

  console.log(
    `\nDone. Geocoded: ${okCount}, Failed: ${failCount}, Total: ${targets.length}`,
  );
  if (failCount > 0) {
    console.log(`Failures logged to ${FAILURE_LOG}`);
  }
  if (stoppedFatal) {
    process.exit(2);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
