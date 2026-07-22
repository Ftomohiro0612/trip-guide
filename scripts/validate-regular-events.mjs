import fs from "node:fs";
import path from "node:path";
import { validateRegularEventData } from "./regular-events-validator.mjs";

const root = process.cwd();
const base = readJson("data/events_data.json");
const summer = readJson("data/summer_events_2026.json");
const facilities = readJson("data/facilities_data.json");
const baseline = readJson("scripts/regular-events-validator-baseline.json");

const result = validateRegularEventData({
  baseEvents: base.events,
  summerEvents: summer.events,
  summerClassifications: summer.existing_event_classifications,
  facilities: facilities.facilities,
  baseline,
});

if (process.argv.includes("--json")) {
  console.log(JSON.stringify(result, null, 2));
} else {
  console.log("Regular Events validation");
  console.log(JSON.stringify(result.summary, null, 2));
  printSection("Approved exceptions", result.approved_exceptions);
  printSection("Existing violations", result.existing_violations);
  printSection("Unbaselined violations", result.unbaselined_violations);
  printSection("Stale approved exceptions", result.stale_approved_exceptions);
  printSection("Stale existing violations", result.stale_existing_violations);
}

if (result.summary.errors > 0 && !process.argv.includes("--audit")) {
  process.exitCode = 1;
}

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));
}

function printSection(label, items) {
  if (items.length === 0) return;
  console.log(`${label}:`);
  for (const item of items) {
    console.log(`- ${item.fingerprint}${item.reason ? ` — ${item.reason}` : ""}`);
  }
}
