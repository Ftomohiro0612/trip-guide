import { readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { Facility } from "../types/facility.ts";

interface FacilitiesFile {
  metadata: unknown;
  facilities: Facility[];
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const DATA_PATH = resolve(ROOT, "data/facilities_data.json");
const OUT_PATH = resolve(ROOT, "data/facilities_master.csv");

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
] as const;

function csvEscape(value: unknown): string {
  const s = value === null || value === undefined ? "" : String(value);
  if (/[",\r\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function toRow(values: unknown[]): string {
  return values.map(csvEscape).join(",");
}

async function main() {
  const raw = await readFile(DATA_PATH, "utf-8");
  const parsed: FacilitiesFile = JSON.parse(raw);

  const lines: string[] = [];
  lines.push(toRow([...HEADERS]));

  for (const f of parsed.facilities) {
    lines.push(
      toRow([
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
      ]),
    );
  }

  // BOM for Excel/Google Sheets to detect UTF-8 correctly
  const csv = "﻿" + lines.join("\r\n") + "\r\n";
  await writeFile(OUT_PATH, csv, "utf-8");

  console.log(`✓ Exported ${parsed.facilities.length} rows`);
  console.log(`  → ${OUT_PATH}`);
  console.log("");
  console.log("Next: open this CSV, copy all rows, paste into your Google Sheet");
  console.log("(File → Import → Replace data, or Ctrl+A → Ctrl+C → paste).");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
