import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import sharp from "sharp";

const args = Object.fromEntries(
  process.argv.slice(2).reduce((pairs, value, index, values) => {
    if (value.startsWith("--")) pairs.push([value.slice(2), values[index + 1]]);
    return pairs;
  }, []),
);

if (!args.raw || !args.track) {
  throw new Error("Usage: node scripts/build-landing-visuals.mjs --raw <raw-dir> --track <track-dir>");
}

const root = process.cwd();
const data = JSON.parse(await fs.readFile(path.join(root, "data", "facilities_data.json"), "utf8"));
const groups = [
  {
    kind: "category",
    items: data.metadata.categories,
    iconDir: path.join(root, "public", "images", "categories"),
    outputDir: path.join(root, "public", "images", "landing", "category"),
  },
  {
    kind: "prefecture",
    items: data.metadata.prefectures,
    iconDir: path.join(root, "public", "images", "prefectures"),
    outputDir: path.join(root, "public", "images", "landing", "prefecture"),
  },
];

const cap = 150_000;
const manifest = [];

async function encodeWithinCap(input, output) {
  for (let quality = 76; quality >= 64; quality -= 2) {
    const buffer = await sharp(input)
      .resize(1600, 640, { fit: "cover", position: "centre", kernel: sharp.kernel.lanczos3 })
      .webp({ quality })
      .toBuffer();
    if (buffer.length <= cap) {
      await fs.writeFile(output, buffer);
      return { bytes: buffer.length, quality };
    }
  }
  throw new Error(`${input} remains over ${cap} bytes at WebP quality 64`);
}

for (const group of groups) {
  await fs.mkdir(group.outputDir, { recursive: true });
  for (const item of group.items) {
    const output = path.join(group.outputDir, `${item.id}.webp`);
    const raw = path.join(args.raw, `${group.kind}-${item.id}-raw.png`);
    try {
      await fs.access(raw);
      const encoded = await encodeWithinCap(raw, output);
      manifest.push({ kind: group.kind, id: item.id, source: "generated", ...encoded });
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
      const metadata = await sharp(output).metadata();
      const stat = await fs.stat(output);
      manifest.push({ kind: group.kind, id: item.id, source: "accepted-pilot", bytes: stat.size, quality: null });
      if (metadata.width !== 1600 || metadata.height !== 640) {
        throw new Error(`${output} is ${metadata.width}x${metadata.height}, expected 1600x640`);
      }
    }
  }
}

function escapeXml(value) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

async function makeContactSheet(group) {
  const columns = group.kind === "category" ? 4 : 4;
  const tileWidth = 440;
  const tileHeight = 210;
  const rows = Math.ceil(group.items.length / columns);
  const width = columns * tileWidth;
  const height = rows * tileHeight;
  const composites = [];

  for (let index = 0; index < group.items.length; index += 1) {
    const item = group.items[index];
    const left = (index % columns) * tileWidth;
    const top = Math.floor(index / columns) * tileHeight;
    const icon = await sharp(path.join(group.iconDir, `${item.id}.webp`))
      .resize(78, 78, { fit: "contain" })
      .png()
      .toBuffer();
    const hero = await sharp(path.join(group.outputDir, `${item.id}.webp`))
      .resize(330, 132, { fit: "cover" })
      .png()
      .toBuffer();
    const label = Buffer.from(
      `<svg width="420" height="36"><rect width="420" height="36" fill="#ffffff"/><text x="8" y="25" font-size="20" font-family="Arial, sans-serif" font-weight="700" fill="#0f172a">${escapeXml(item.id)}</text></svg>`,
    );
    composites.push(
      { input: hero, left: left + 100, top: top + 8 },
      { input: icon, left: left + 12, top: top + 34 },
      { input: label, left: left + 10, top: top + 162 },
    );
  }

  const output = path.join(args.track, `contact-${group.kind === "category" ? "categories" : "prefectures"}.png`);
  await sharp({ create: { width, height, channels: 3, background: "#e2e8f0" } })
    .composite(composites)
    .png()
    .toFile(output);
  return output;
}

const expectedCount = groups.reduce((sum, group) => sum + group.items.length, 0);
if (manifest.length !== expectedCount || expectedCount !== 67) {
  throw new Error(`Expected 67 final images, found ${manifest.length}`);
}

for (const entry of manifest) {
  const group = groups.find((candidate) => candidate.kind === entry.kind);
  const file = path.join(group.outputDir, `${entry.id}.webp`);
  const metadata = await sharp(file).metadata();
  const stat = await fs.stat(file);
  if (metadata.width !== 1600 || metadata.height !== 640 || stat.size > cap) {
    throw new Error(`${file}: ${metadata.width}x${metadata.height}, ${stat.size} bytes`);
  }
  entry.bytes = stat.size;
}

const contactSheets = [];
for (const group of groups) contactSheets.push(await makeContactSheet(group));

const totalBytes = manifest.reduce((sum, entry) => sum + entry.bytes, 0);
const report = { generatedAt: new Date().toISOString(), count: manifest.length, totalBytes, cap, contactSheets, files: manifest };
await fs.writeFile(path.join(args.track, "image-manifest.json"), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ count: manifest.length, totalBytes, contactSheets }, null, 2));
