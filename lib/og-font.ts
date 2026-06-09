// Cache the font fetch per worker process to avoid re-fetching for every page
const cache = new Map<string, Promise<ArrayBuffer | null>>();

async function fetchSubset(text: string): Promise<ArrayBuffer | null> {
  // Use a UA that prompts Google Fonts to serve a TTF/woff (satori-compatible).
  const cssUrl = `https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@700&display=swap&text=${encodeURIComponent(text)}`;
  try {
    const css = await fetch(cssUrl, {
      headers: {
        // Older UA so Google Fonts returns WOFF (Satori doesn't support WOFF2)
        "User-Agent":
          "Mozilla/5.0 (Windows NT 6.1; Trident/7.0; rv:11.0) like Gecko",
      },
    }).then((r) => r.text());
    const m = css.match(/src:\s*url\(([^)]+)\)\s*format\(['"]([^'"]+)['"]\)/);
    if (!m) return null;
    const fontUrl = m[1];
    const buf = await fetch(fontUrl).then((r) => r.arrayBuffer());
    return buf;
  } catch {
    return null;
  }
}

export function getJpFontSubset(text: string): Promise<ArrayBuffer | null> {
  // Dedupe by characters so different texts that share most chars hit different keys
  // (acceptable; cache is per-build worker)
  const key = [...new Set(text.split(""))].sort().join("");
  const cached = cache.get(key);
  if (cached) {
    return cached;
  }

  const p = fetchSubset(text);
  cache.set(key, p);
  return p;
}
