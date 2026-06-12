import { readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const DATA_PATH = resolve(ROOT, "data/facilities_data.json");
const DEFAULT_KEEP_IDS = [1, 12, 23, 145, 192];

function parseArgs(argv) {
  const options = {
    apply: false,
    keepIds: DEFAULT_KEEP_IDS,
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--apply") {
      options.apply = true;
    } else if (arg === "--dry-run") {
      options.apply = false;
    } else if (arg === "--ids") {
      const value = argv[++i];
      if (!value) throw new Error("--ids requires a comma-separated id list");
      options.keepIds = parseIdList(value);
    } else if (arg.startsWith("--ids=")) {
      options.keepIds = parseIdList(arg.slice("--ids=".length));
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return options;
}

function parseIdList(value) {
  const ids = value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => Number.parseInt(part, 10));

  if (ids.length === 0 || ids.some((id) => !Number.isInteger(id) || id <= 0)) {
    throw new Error(`Invalid --ids value: ${value}`);
  }

  return ids;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const keepIds = new Set(options.keepIds);
  const raw = await readFile(DATA_PATH, "utf-8");
  const data = JSON.parse(raw);

  if (!Array.isArray(data.facilities)) {
    throw new Error("facilities_data.json does not contain a facilities array");
  }

  const removable = data.facilities.filter(
    (facility) => facility.things_to_do !== undefined && !keepIds.has(facility.id),
  );

  console.log(`Mode: ${options.apply ? "apply" : "dry-run"}`);
  console.log(`Keeping ids: ${[...keepIds].sort((a, b) => a - b).join(",")}`);
  console.log(`Facilities with things_to_do: ${data.facilities.filter((f) => f.things_to_do !== undefined).length}`);
  console.log(`Would remove things_to_do from: ${removable.length}`);

  for (const facility of removable) {
    console.log(`  id=${facility.id} ${facility.name}`);
  }

  if (!options.apply) {
    console.log("No changes written. Pass --apply to modify facilities_data.json.");
    return;
  }

  for (const facility of removable) {
    delete facility.things_to_do;
  }

  await writeFile(DATA_PATH, JSON.stringify(data, null, 2) + "\n", "utf-8");
  console.log("Updated data/facilities_data.json");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
