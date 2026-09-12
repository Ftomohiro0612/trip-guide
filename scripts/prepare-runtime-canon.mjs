import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const packageDir = resolve(root, "node_modules/@memorip/runtime-canon");

await mkdir(packageDir, { recursive: true });
await writeFile(
  resolve(packageDir, "package.json"),
  JSON.stringify(
    {
      name: "@memorip/runtime-canon",
      private: true,
      type: "module",
      exports: {
        ".": {
          types: "./index.d.ts",
          import: "./index.mjs",
          default: "./index.mjs",
        },
      },
    },
    null,
    2,
  ) + "\n",
  "utf8",
);
await writeFile(
  resolve(packageDir, "index.mjs"),
  `export { default as facilitiesData } from "../../../data/facilities_data.json" with { type: "json" };\n` +
    `export { default as eventsData } from "../../../data/events_data.json" with { type: "json" };\n` +
    `export { default as summerEventsData } from "../../../data/summer_events_2026.json" with { type: "json" };\n` +
    `export { default as asoviewFacilityActionsData } from "../../../data/asoview_facility_actions.json" with { type: "json" };\n` +
    `export { default as rakutenFacilityActionsData } from "../../../data/rakuten_facility_actions.json" with { type: "json" };\n`,
  "utf8",
);
await writeFile(
  resolve(packageDir, "index.d.ts"),
  `export const facilitiesData: unknown;\n` +
    `export const eventsData: unknown;\n` +
    `export const summerEventsData: unknown;\n` +
    `export const asoviewFacilityActionsData: unknown;\n` +
    `export const rakutenFacilityActionsData: unknown;\n`,
  "utf8",
);
