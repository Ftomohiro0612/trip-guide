import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { google } from "googleapis";
import type { Facility, FacilitiesData } from "../types/facility.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const DATA_PATH = resolve(ROOT, "data/facilities_data.json");
const CRED_PATH = resolve(ROOT, "data/.gcp-sheets-credentials.json");

const SHEET_ID = "1p4bqL1Oq89k5c-9Wa0REXd8BojzUBBXfF5-iSYEeeH4";
const TAB_NAME = "全件一覧";

// Same schema/order as the sheet header (and as scripts/export-to-csv.ts)
const HEADERS = [
  "id",
  "県",
  "カテゴリ",
  "施設名",
  "所在地",
  "屋内・屋外",
  "雨天対応",
  "料金タイプ",
  "大人料金目安",
  "子供料金目安",
  "おすすめポイント詳細",
  "対象年齢",
  "URL/参考",
  "lat",
  "lng",
  "image",
  "image_credit",
  "tags",
  "signature_experiences",
  "unique_selling_point",
  "experience_tags",
  "summer_water_play",
] as const;

const COL_LAST = String.fromCharCode("A".charCodeAt(0) + HEADERS.length - 1); // V

function rowFor(f: Facility): unknown[] {
  return [
    f.id,
    f.prefecture,
    f.category,
    f.name,
    f.address,
    f.indoor_outdoor,
    f.rain_friendly,
    f.fee_type,
    f.adult_fee,
    f.child_fee,
    f.description,
    f.target_age,
    f.url ?? "",
    f.latitude ?? "",
    f.longitude ?? "",
    f.image ?? "",
    f.image_attribution ?? "",
    (f.tags ?? []).join(","),
    (f.signature_experiences ?? []).join(","),
    f.unique_selling_point ?? "",
    (f.experience_tags ?? []).join(","),
    f.summer_water_play ?? "",
  ];
}

async function main() {
  const raw = await readFile(DATA_PATH, "utf-8");
  const data: FacilitiesData = JSON.parse(raw);
  const facilities = [...data.facilities].sort((a, b) => a.id - b.id);

  const auth = new google.auth.GoogleAuth({
    keyFile: CRED_PATH,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  const sheets = google.sheets({ version: "v4", auth });

  // 1. Read current sheet to know how many rows are there
  const cur = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: `${TAB_NAME}!A:A`,
  });
  const sheetRowCount = cur.data.values?.length ?? 1;
  console.log(`Sheet currently has ${sheetRowCount} rows (incl. header)`);
  console.log(`JSON has ${facilities.length} facilities`);

  // 2. Build new data values (header + all facilities)
  const headerRow = [...HEADERS] as unknown[];
  const dataRows = facilities.map(rowFor);

  const targetEndRow = facilities.length + 1; // +1 for header

  // 3. Write headers + all rows starting at A1
  const writeRange = `${TAB_NAME}!A1:${COL_LAST}${targetEndRow}`;
  console.log(`Writing range: ${writeRange}`);

  const writeRes = await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range: writeRange,
    valueInputOption: "RAW",
    requestBody: { values: [headerRow, ...dataRows] },
  });

  console.log(`✓ Updated ${writeRes.data.updatedCells} cells`);

  // 4. If the sheet had MORE rows than JSON has, blank out the extras
  if (sheetRowCount > targetEndRow) {
    const clearRange = `${TAB_NAME}!A${targetEndRow + 1}:${COL_LAST}${sheetRowCount}`;
    console.log(`Clearing leftover rows: ${clearRange}`);
    await sheets.spreadsheets.values.clear({
      spreadsheetId: SHEET_ID,
      range: clearRange,
    });
    console.log("✓ Cleared leftover rows");
  }

  console.log("");
  console.log("Done. Sheet now mirrors JSON exactly.");
}

main().catch((err) => {
  if (err.code === "ENOENT" && String(err.path).includes(".gcp-sheets-credentials.json")) {
    console.error("");
    console.error("✗ Service account credentials not found.");
    console.error(`  Expected at: ${CRED_PATH}`);
    console.error("  Place the JSON key file there (it is gitignored).");
    process.exit(1);
  }
  console.error(err);
  process.exit(1);
});
