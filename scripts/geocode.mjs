import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_PATH = resolve(__dirname, "..", "data", "facilities_data.json");

// Approximate prefecture centroids (used as fallback if geocoding fails)
const PREFECTURE_CENTROIDS = {
  shizuoka: { lat: 34.9769, lng: 138.3831 },
  nagano: { lat: 36.2048, lng: 138.2529 },
  yamanashi: { lat: 35.6635, lng: 138.5683 },
  ibaraki: { lat: 36.3418, lng: 140.4468 },
  gunma: { lat: 36.3912, lng: 139.0609 },
  osaka: { lat: 34.65, lng: 135.52 },
  hyogo: { lat: 34.69, lng: 135.19 },
  kyoto: { lat: 35.01, lng: 135.77 },
  aichi: { lat: 35.18, lng: 136.91 },
  fukuoka: { lat: 33.59, lng: 130.4 },
  hiroshima: { lat: 34.4, lng: 132.46 },
  miyagi: { lat: 38.2682, lng: 140.8694 },
  kagawa: { lat: 34.3401, lng: 134.0434 },
  kumamoto: { lat: 32.7898, lng: 130.7417 },
  okayama: { lat: 34.6618, lng: 133.935 },
  ishikawa: { lat: 36.5947, lng: 136.6256 },
  oita: { lat: 33.2382, lng: 131.6126 },
};

const USER_AGENT =
  "trip-guide.net geocoder (contact: info@fic-investment.biz)";
const SLEEP_MS = 1100; // Respect Nominatim 1 req/sec policy

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function nominatim(query) {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", query);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "1");
  url.searchParams.set("countrycodes", "jp");
  url.searchParams.set("accept-language", "ja");
  const res = await fetch(url, {
    headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  const data = await res.json();
  if (!Array.isArray(data) || data.length === 0) return null;
  const lat = parseFloat(data[0].lat);
  const lng = parseFloat(data[0].lon);
  if (Number.isNaN(lat) || Number.isNaN(lng)) return null;
  return { lat, lng };
}

function fallbackJitter(prefId, seed) {
  const c = PREFECTURE_CENTROIDS[prefId] ?? PREFECTURE_CENTROIDS.shizuoka;
  // Stable pseudo-random offset based on seed so positions don't shift across runs
  const r1 = Math.sin(seed * 9301 + 49297) * 233280;
  const r2 = Math.sin(seed * 12289 + 76543) * 524287;
  return {
    lat: c.lat + (r1 - Math.floor(r1) - 0.5) * 0.4,
    lng: c.lng + (r2 - Math.floor(r2) - 0.5) * 0.4,
  };
}

async function main() {
  const raw = await readFile(DATA_PATH, "utf-8");
  const json = JSON.parse(raw);
  const facilities = json.facilities;

  const todo = facilities.filter(
    (f) =>
      f.latitude == null ||
      f.longitude == null ||
      f.geocode_source === "fallback",
  );

  console.log(
    `Total: ${facilities.length} | Already geocoded: ${facilities.length - todo.length} | Pending: ${todo.length}`,
  );

  let okCount = 0;
  let fallbackCount = 0;

  for (let i = 0; i < todo.length; i++) {
    const f = todo[i];
    const queries = [
      `${f.prefecture} ${f.address}`,
      f.address,
      `${f.prefecture} ${f.name}`,
    ];

    let coords = null;
    let usedQuery = "";
    for (const q of queries) {
      try {
        coords = await nominatim(q);
        usedQuery = q;
        if (coords) break;
      } catch (e) {
        console.warn(`  ! ${f.slug} query "${q}" failed: ${e.message}`);
      }
      await sleep(SLEEP_MS);
    }

    if (coords) {
      f.latitude = coords.lat;
      f.longitude = coords.lng;
      f.geocode_source = "nominatim";
      okCount++;
      console.log(
        `[${i + 1}/${todo.length}] ✓ ${f.slug} ${f.name} → ${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)} (${usedQuery})`,
      );
    } else {
      const fb = fallbackJitter(f.prefecture_id, f.id);
      f.latitude = fb.lat;
      f.longitude = fb.lng;
      f.geocode_source = "fallback";
      fallbackCount++;
      console.log(
        `[${i + 1}/${todo.length}] ⚠ ${f.slug} ${f.name} → fallback to prefecture centroid`,
      );
    }

    // Persist progress every 10 entries (resumable)
    if ((i + 1) % 10 === 0) {
      await writeFile(DATA_PATH, JSON.stringify(json, null, 2), "utf-8");
    }

    await sleep(SLEEP_MS);
  }

  await writeFile(DATA_PATH, JSON.stringify(json, null, 2), "utf-8");
  console.log(
    `\nDone. Geocoded: ${okCount}, Fallback: ${fallbackCount}, Total: ${todo.length}`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
