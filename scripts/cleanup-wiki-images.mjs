import { readFile, writeFile, unlink } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const DATA_PATH = resolve(ROOT, "data/facilities_data.json");

const MIN_LEN = 5; // stricter than fetch-time minLen=3

function normalize(s) {
  return s.toLowerCase().replace(/[\s　\-_()（）「」『』・,.、。!！?？]/g, "");
}

function sharesAny(a, b) {
  const A = normalize(a);
  const B = normalize(b);
  if (!A || !B) return false;
  // Exact normalized match (handles short names like "ぐりんぱ")
  if (A === B) return true;
  // One fully contains the other, shared part >= 4 chars
  if (A.length >= 4 && B.includes(A)) return true;
  if (B.length >= 4 && A.includes(B)) return true;
  // Otherwise need a substring of >= 5 chars in common
  for (let i = 0; i + MIN_LEN <= A.length; i++) {
    if (B.includes(A.slice(i, i + MIN_LEN))) return true;
  }
  return false;
}

function extractWikiTitle(html) {
  if (!html) return "";
  // image_attribution looks like:
  //   <a href="...">Wikipedia: TITLE</a>
  //   or sometimes "Wikipedia: TITLE"
  const m = html.match(/Wikipedia:\s*([^<]+?)(?:<\/a>|$)/);
  return m ? m[1].trim() : "";
}

async function main() {
  const raw = await readFile(DATA_PATH, "utf-8");
  const json = JSON.parse(raw);

  const removed = [];
  const kept = [];

  for (const f of json.facilities) {
    if (!f.image || f.image_source !== "manual") continue;
    const wikiTitle = extractWikiTitle(f.image_attribution ?? "");
    const isMatch = sharesAny(f.name, wikiTitle, MIN_LEN);
    if (!isMatch) {
      removed.push({
        slug: f.slug,
        name: f.name,
        wikiTitle,
        path: f.image,
      });
    } else {
      kept.push({ slug: f.slug, name: f.name, wikiTitle });
    }
  }

  console.log(`Inspecting ${kept.length + removed.length} Wikipedia images`);
  console.log(`Keeping (>=${MIN_LEN}-char shared substring): ${kept.length}`);
  console.log(`Removing (loose match): ${removed.length}`);
  console.log("");

  for (const r of removed) {
    console.log(`  ✗ ${r.slug} "${r.name}" was matched to "${r.wikiTitle}"`);
  }

  if (removed.length === 0) {
    console.log("\nNothing to clean up.");
    return;
  }

  for (const r of removed) {
    const filePath = resolve(ROOT, "public", r.path.replace(/^\//, ""));
    if (existsSync(filePath)) {
      await unlink(filePath);
    }
    const fac = json.facilities.find((x) => x.slug === r.slug);
    if (fac) {
      delete fac.image;
      delete fac.image_attribution;
      delete fac.image_source;
    }
  }

  await writeFile(DATA_PATH, JSON.stringify(json, null, 2), "utf-8");
  console.log(
    `\nRemoved ${removed.length} fuzzy matches. ${kept.length} clean images remain.`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
