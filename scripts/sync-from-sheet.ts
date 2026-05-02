import { copyFile, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "csv-parse/sync";
import type {
  CategoryMeta,
  Facility,
  FacilitiesData,
  FacilityTag,
  IndoorOutdoor,
  PrefectureId,
  PrefectureMeta,
  RainFriendly,
} from "../types/facility.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const DATA_PATH = resolve(ROOT, "data/facilities_data.json");

const SHEET_ID = "1p4bqL1Oq89k5c-9Wa0REXd8BojzUBBXfF5-iSYEeeH4";
const CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv`;

const PREFECTURE_MAP: Record<string, PrefectureId> = {
  静岡県: "shizuoka",
  長野県: "nagano",
  山梨県: "yamanashi",
};

interface CsvRow {
  id?: string;
  県?: string;
  カテゴリ?: string;
  施設名?: string;
  所在地?: string;
  "屋内・屋外"?: string;
  雨天対応?: string;
  料金タイプ?: string;
  大人料金目安?: string;
  子供料金目安?: string;
  おすすめポイント詳細?: string;
  対象年齢?: string;
  "URL/参考"?: string;
  lat?: string;
  lng?: string;
  image?: string;
  image_credit?: string;
  tags?: string;
}

function val(row: CsvRow, key: keyof CsvRow): string {
  return (row[key] ?? "").trim();
}

function buildCategoryMap(categories: CategoryMeta[]): Map<string, string> {
  return new Map(categories.map((c) => [c.name, c.id]));
}

function slugForId(id: number): string {
  return `facility-${String(id).padStart(3, "0")}`;
}

function parseFloatOrNull(s: string): number | null {
  if (!s) return null;
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : null;
}

function parseTags(s: string): FacilityTag[] {
  return s
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean) as FacilityTag[];
}

interface MergeResult {
  next: Facility;
  changedFields: string[];
}

function mergeRow(
  existing: Facility | undefined,
  row: CsvRow,
  id: number,
  categoryMap: Map<string, string>,
): MergeResult {
  const changes: string[] = [];

  // Initialize a base record (either existing or fresh defaults)
  const base: Facility = existing
    ? { ...existing }
    : {
        id,
        slug: slugForId(id),
        name: "",
        prefecture: "",
        prefecture_id: "shizuoka",
        category: "",
        category_id: "",
        address: "",
        indoor_outdoor: "屋外",
        rain_friendly: "△",
        is_free: false,
        fee_type: "有料",
        adult_fee: "",
        child_fee: "",
        description: "",
        target_age: "",
        url: null,
        tags: [],
      };

  base.id = id;
  if (!existing) base.slug = slugForId(id);

  const setIf = <K extends keyof Facility>(
    key: K,
    raw: string,
    transform: (s: string) => Facility[K],
  ) => {
    if (raw === "") return; // empty cell → keep existing
    const next = transform(raw);
    if (JSON.stringify(base[key]) !== JSON.stringify(next)) {
      changes.push(String(key));
      base[key] = next;
    }
  };

  setIf("prefecture", val(row, "県"), (s) => s);
  if (val(row, "県")) {
    const pid = PREFECTURE_MAP[val(row, "県")];
    if (!pid) {
      console.warn(`⚠️  unknown prefecture: "${val(row, "県")}" (id=${id})`);
    } else if (base.prefecture_id !== pid) {
      base.prefecture_id = pid;
      changes.push("prefecture_id");
    }
  }

  setIf("category", val(row, "カテゴリ"), (s) => s);
  if (val(row, "カテゴリ")) {
    const cid = categoryMap.get(val(row, "カテゴリ"));
    if (!cid) {
      console.warn(`⚠️  unknown category: "${val(row, "カテゴリ")}" (id=${id})`);
    } else if (base.category_id !== cid) {
      base.category_id = cid;
      changes.push("category_id");
    }
  }

  setIf("name", val(row, "施設名"), (s) => s);
  setIf("address", val(row, "所在地"), (s) => s);
  setIf(
    "indoor_outdoor",
    val(row, "屋内・屋外"),
    (s) => s as IndoorOutdoor,
  );
  setIf(
    "rain_friendly",
    val(row, "雨天対応"),
    (s) => s as RainFriendly,
  );

  if (val(row, "料金タイプ")) {
    const fee = val(row, "料金タイプ");
    // "無料(時之栖内)" や "無料(一部有料)" のような括弧付きも free 扱い。
    // 入口・基本利用が無料かどうかが頭の単語で決まるため startsWith で判定。
    const isFree = fee.startsWith("無料");
    if (base.fee_type !== fee) {
      base.fee_type = fee as Facility["fee_type"];
      changes.push("fee_type");
    }
    if (base.is_free !== isFree) {
      base.is_free = isFree;
      changes.push("is_free");
    }
  }

  setIf("adult_fee", val(row, "大人料金目安"), (s) => s);
  setIf("child_fee", val(row, "子供料金目安"), (s) => s);
  setIf("description", val(row, "おすすめポイント詳細"), (s) => s);
  setIf("target_age", val(row, "対象年齢"), (s) => s);
  setIf("url", val(row, "URL/参考"), (s) => s || null);

  setIf("latitude", val(row, "lat"), parseFloatOrNull);
  setIf("longitude", val(row, "lng"), parseFloatOrNull);
  setIf("image", val(row, "image"), (s) => s || null);
  setIf("image_attribution", val(row, "image_credit"), (s) => s || null);
  setIf("tags", val(row, "tags"), parseTags);

  return { next: base, changedFields: changes };
}

function recomputeCounts(data: FacilitiesData): void {
  const prefCounts = new Map<PrefectureId, number>();
  const catCounts = new Map<string, number>();
  for (const f of data.facilities) {
    prefCounts.set(f.prefecture_id, (prefCounts.get(f.prefecture_id) ?? 0) + 1);
    catCounts.set(f.category_id, (catCounts.get(f.category_id) ?? 0) + 1);
  }
  data.metadata.prefectures = data.metadata.prefectures.map(
    (p): PrefectureMeta => ({ ...p, count: prefCounts.get(p.id) ?? 0 }),
  );
  data.metadata.total_facilities = data.facilities.length;
}

async function main() {
  // 1. Backup
  const timestamp = new Date()
    .toISOString()
    .replace(/[:.]/g, "-")
    .replace(/T/, "_")
    .slice(0, 19);
  const backupPath = `${DATA_PATH}.bak.${timestamp}.json`;
  await copyFile(DATA_PATH, backupPath);
  console.log(`✓ Backup: ${backupPath}`);

  // 2. Fetch CSV
  console.log(`→ Fetching ${CSV_URL}`);
  const res = await fetch(CSV_URL, { redirect: "follow" });
  if (!res.ok) {
    throw new Error(`CSV fetch failed: ${res.status} ${res.statusText}`);
  }
  const csvText = await res.text();
  console.log(`✓ Downloaded ${csvText.length.toLocaleString()} bytes`);

  // 3. Parse CSV
  const rows: CsvRow[] = parse(csvText, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    bom: true,
  });
  console.log(`✓ Parsed ${rows.length} data rows`);

  // 4. Load existing JSON
  const raw = await readFile(DATA_PATH, "utf-8");
  const existing: FacilitiesData = JSON.parse(raw);
  const byId = new Map(existing.facilities.map((f) => [f.id, f]));
  const categoryMap = buildCategoryMap(existing.metadata.categories);

  // 5. Merge rows
  const merged: Facility[] = [];
  const seenIds = new Set<number>();
  let nextId = Math.max(0, ...existing.facilities.map((f) => f.id)) + 1;
  let updated = 0;
  let added = 0;
  const changeLog: Array<{ id: number; name: string; fields: string[] }> = [];

  for (const row of rows) {
    if (!val(row, "施設名") && !val(row, "id")) continue; // skip blank rows

    const idStr = val(row, "id");
    let id: number;
    let existingFacility: Facility | undefined;

    if (idStr) {
      const parsed = parseInt(idStr, 10);
      if (!Number.isFinite(parsed)) {
        console.warn(`⚠️  invalid id: "${idStr}" — skipping row "${val(row, "施設名")}"`);
        continue;
      }
      id = parsed;
      existingFacility = byId.get(id);
      if (existingFacility) {
        updated++;
      } else {
        // id given but doesn't match — treat as new with that explicit id
        added++;
        nextId = Math.max(nextId, id + 1);
      }
    } else {
      id = nextId++;
      added++;
    }

    if (seenIds.has(id)) {
      console.warn(`⚠️  duplicate id ${id} in sheet — keeping first occurrence`);
      continue;
    }
    seenIds.add(id);

    const { next, changedFields } = mergeRow(existingFacility, row, id, categoryMap);
    if (existingFacility && changedFields.length > 0) {
      changeLog.push({ id, name: next.name, fields: changedFields });
    }
    merged.push(next);
  }

  // 6. Carry over JSON entries not present in sheet (warn only)
  const orphaned = existing.facilities.filter((f) => !seenIds.has(f.id));
  if (orphaned.length > 0) {
    console.warn(
      `⚠️  ${orphaned.length} facilities in JSON missing from sheet (kept as-is):`,
    );
    for (const f of orphaned) console.warn(`     id=${f.id} ${f.name}`);
    merged.push(...orphaned);
  }

  // 7. Sort by id and write
  merged.sort((a, b) => a.id - b.id);
  const out: FacilitiesData = { ...existing, facilities: merged };
  recomputeCounts(out);
  await writeFile(DATA_PATH, JSON.stringify(out, null, 2) + "\n", "utf-8");

  // 8. Summary
  console.log("");
  console.log("─".repeat(50));
  console.log(`✓ Sync done: ${merged.length} total facilities`);
  console.log(`  · updated: ${updated}`);
  console.log(`  · added:   ${added}`);
  console.log(`  · kept (not in sheet): ${orphaned.length}`);
  if (changeLog.length > 0) {
    console.log("");
    console.log("Updated rows:");
    for (const c of changeLog.slice(0, 30)) {
      console.log(`  id=${c.id} ${c.name} → [${c.fields.join(", ")}]`);
    }
    if (changeLog.length > 30) {
      console.log(`  ...and ${changeLog.length - 30} more`);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
