import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { google } from "googleapis";
import { parse } from "csv-parse/sync";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const CRED_PATH = resolve(ROOT, "data/.gcp-sheets-credentials.json");

const SHEET_ID = "1p4bqL1Oq89k5c-9Wa0REXd8BojzUBBXfF5-iSYEeeH4";
const TAB_NAME = "全件一覧";

const csvPath = process.argv[2];
if (!csvPath) {
  console.error("Usage: node scripts/append-to-sheet.ts <csv-file-path>");
  console.error("Example: npm run append-to-sheet -- data/v6_additions_for_sheet.csv");
  process.exit(1);
}

const csv = readFileSync(resolve(ROOT, csvPath), "utf-8");
const rows = parse(csv, {
  columns: true,
  skip_empty_lines: true,
  trim: true,
  bom: true,
}) as Record<string, string>[];

console.log(`Loaded ${rows.length} rows from ${csvPath}`);

// Column order must match the sheet exactly (26 columns).
const COLUMNS = [
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
  "source_urls",
  "source_checked_at",
  "data_quality_status",
  "source_notes",
] as const;

const values = rows.map((r) => COLUMNS.map((c) => r[c] ?? ""));

const auth = new google.auth.GoogleAuth({
  keyFile: CRED_PATH,
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});
const sheets = google.sheets({ version: "v4", auth });

async function main() {
  // Check current row count first
  const meta = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: `${TAB_NAME}!A:A`,
  });
  const existingRows = meta.data.values?.length ?? 0;
  console.log(`Sheet has ${existingRows} existing rows (incl. header)`);

  const startRow = existingRows + 1;
  console.log(`Appending ${rows.length} rows starting at A${startRow}`);

  const res = await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range: `${TAB_NAME}!A${startRow}`,
    valueInputOption: "RAW",
    insertDataOption: "INSERT_ROWS",
    requestBody: { values },
  });

  console.log(`✓ Appended. Updated range: ${res.data.updates?.updatedRange}`);
  console.log(`  Cells written: ${res.data.updates?.updatedCells}`);
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
