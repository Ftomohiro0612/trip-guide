import { existsSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const runtimePath = resolve(
  root,
  ".next/standalone/node_modules/@memorip/runtime-canon/index.mjs",
);
const forced = process.argv.includes("--force");

// OpenNext sets NEXT_PRIVATE_STANDALONE while it invokes `next build`.
// A normal Next/Vercel build must retain the JSON-backed runtime package.
if (process.env.NEXT_PRIVATE_STANDALONE !== "true" && !forced) {
  process.exit(0);
}

if (!existsSync(runtimePath)) {
  throw new Error(`OpenNext standalone runtime package was not found: ${runtimePath}`);
}

await writeFile(
  runtimePath,
  `const canon = globalThis.__MEMORIP_RUNTIME_CANON__;
if (!canon) {
  throw new Error("Memorip runtime canon was not initialized by the Cloudflare Worker");
}

export const facilitiesData = canon.facilitiesData;
export const eventsData = canon.eventsData;
export const summerEventsData = canon.summerEventsData;
export const asoviewFacilityActionsData = canon.asoviewFacilityActionsData;
export const rakutenFacilityActionsData = canon.rakutenFacilityActionsData;
`,
  "utf8",
);

console.log("Prepared the OpenNext runtime canon shim.");
