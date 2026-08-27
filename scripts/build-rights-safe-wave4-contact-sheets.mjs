import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import sharp from "sharp";

const ROOT = resolve(import.meta.dirname, "..");
const AUDIT_PATH = resolve(ROOT, "docs/audits/facility-image-coverage-rights-safe-wave4-2026-08-28.json");
const OUTPUT_DIR = resolve(ROOT, ".codex/rights-safe-wave4-contact-sheets");
const audit = JSON.parse(await readFile(AUDIT_PATH, "utf8"));
const accepted = audit.results.filter((result) => result.disposition === "accepted");
const columns = 5;
const rows = 5;
const tileWidth = 320;
const imageHeight = 200;
const labelHeight = 52;
const perSheet = columns * rows;
await mkdir(OUTPUT_DIR, { recursive: true });

const manifest = [];
for (let offset = 0; offset < accepted.length; offset += perSheet) {
  const batch = accepted.slice(offset, offset + perSheet);
  const composites = [];
  for (let index = 0; index < batch.length; index += 1) {
    const result = batch[index];
    const image = await sharp(resolve(ROOT, `public${result.accepted.output_path}`))
      .resize(tileWidth, imageHeight, { fit: "cover", position: "attention" })
      .jpeg({ quality: 88 })
      .toBuffer();
    const label = `${result.facility_id} ${result.facility_name}`;
    const labelSvg = Buffer.from(`<svg width="${tileWidth}" height="${labelHeight}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#111827"/><text x="7" y="30" font-family="Yu Gothic,Meiryo,sans-serif" font-size="15" fill="#fff">${escapeXml(label)}</text></svg>`);
    const left = (index % columns) * tileWidth;
    const top = Math.floor(index / columns) * (imageHeight + labelHeight);
    composites.push({ input: image, left, top }, { input: labelSvg, left, top: top + imageHeight });
  }
  const sheetNumber = Math.floor(offset / perSheet) + 1;
  const outputPath = resolve(OUTPUT_DIR, `sheet-${String(sheetNumber).padStart(2, "0")}.jpg`);
  await sharp({ create: { width: columns * tileWidth, height: rows * (imageHeight + labelHeight), channels: 3, background: "#374151" } })
    .composite(composites)
    .jpeg({ quality: 92 })
    .toFile(outputPath);
  manifest.push({ sheet: sheetNumber, file: outputPath, facilities: batch.map((result) => ({ id: result.facility_id, name: result.facility_name })) });
}
await writeFile(resolve(OUTPUT_DIR, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ accepted: accepted.length, sheets: manifest.length, output_dir: OUTPUT_DIR }, null, 2));

function escapeXml(value) {
  return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&apos;");
}
