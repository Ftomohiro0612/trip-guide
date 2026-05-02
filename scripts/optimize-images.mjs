import { readdir, stat, readFile, writeFile, rename, unlink } from "node:fs/promises";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const IMAGES_DIR = resolve(ROOT, "public/images/facilities");
const DATA_PATH = resolve(ROOT, "data/facilities_data.json");

const MAX_WIDTH = 1200;
const QUALITY = 80;

async function main() {
  const files = (await readdir(IMAGES_DIR)).filter((f) =>
    /\.(jpe?g|png|webp|gif)$/i.test(f),
  );
  console.log(`Optimizing ${files.length} images…`);

  let totalBefore = 0;
  let totalAfter = 0;
  const renames = new Map(); // oldFilename → newFilename (e.g. ".png" → ".jpg")

  for (let i = 0; i < files.length; i++) {
    const f = files[i];
    const inputPath = join(IMAGES_DIR, f);
    const before = (await stat(inputPath)).size;
    totalBefore += before;

    const baseName = f.replace(/\.[^.]+$/, "");
    const outName = `${baseName}.jpg`;
    const outPath = join(IMAGES_DIR, outName);
    const tmpPath = join(IMAGES_DIR, `.${outName}.tmp`);

    try {
      // Read input fully into memory first (avoids file-handle conflicts on Windows)
      const inputBuf = await readFile(inputPath);
      const buf = await sharp(inputBuf, { failOn: "none", animated: false })
        .resize({ width: MAX_WIDTH, withoutEnlargement: true })
        .jpeg({ quality: QUALITY, progressive: true, mozjpeg: true })
        .toBuffer();

      // Write to temp then rename (atomic-ish, avoids same-path read+write)
      await writeFile(tmpPath, buf);
      // Remove original if extension changed (so the rename target is free)
      if (f !== outName) {
        await unlink(inputPath);
        renames.set(f, outName);
      }
      await rename(tmpPath, outPath);

      const after = buf.length;
      totalAfter += after;
      console.log(
        `[${i + 1}/${files.length}] ${f}: ${(before / 1024).toFixed(0)}KB → ${(after / 1024).toFixed(0)}KB${f !== outName ? ` (renamed → ${outName})` : ""}`,
      );
    } catch (e) {
      console.error(`  ! ${f}: ${e.message}`);
      // Cleanup tmp on failure
      try {
        await unlink(tmpPath);
      } catch {}
    }
  }

  // Update data file paths if any extensions changed
  if (renames.size > 0) {
    const raw = await readFile(DATA_PATH, "utf-8");
    const json = JSON.parse(raw);
    let updated = 0;
    for (const fac of json.facilities) {
      if (!fac.image) continue;
      const fname = fac.image.split("/").pop();
      if (renames.has(fname)) {
        fac.image = `/images/facilities/${renames.get(fname)}`;
        updated++;
      }
    }
    await writeFile(DATA_PATH, JSON.stringify(json, null, 2), "utf-8");
    console.log(`Updated ${updated} image paths in JSON`);
  }

  console.log(
    `\nTotal: ${(totalBefore / 1024 / 1024).toFixed(1)}MB → ${(totalAfter / 1024 / 1024).toFixed(1)}MB (saved ${(((totalBefore - totalAfter) / totalBefore) * 100).toFixed(0)}%)`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
