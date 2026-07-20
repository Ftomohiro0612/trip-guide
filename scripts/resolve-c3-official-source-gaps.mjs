import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const researchPath = path.join(root, ".codex", "facility-content-c3-official-research-2026-07-20.json");
const facilitiesPath = path.join(root, "data", "facilities_data.json");
const report = JSON.parse(fs.readFileSync(researchPath, "utf8"));
const facilitiesDocument = JSON.parse(fs.readFileSync(facilitiesPath, "utf8"));
const facilities = facilitiesDocument.facilities ?? facilitiesDocument;
const facilityById = new Map(facilities.map((facility) => [Number(facility.id), facility]));

const decodeEntities = (value) => value
  .replace(/&amp;/giu, "&")
  .replace(/&quot;/giu, '"')
  .replace(/&#39;/giu, "'")
  .replace(/&lt;/giu, "<")
  .replace(/&gt;/giu, ">")
  .replace(/&#(\d+);/gu, (_, code) => String.fromCodePoint(Number(code)));
const stripTags = (value) => decodeEntities(value.replace(/<script\b[^>]*>[\s\S]*?<\/script>/giu, " ").replace(/<style\b[^>]*>[\s\S]*?<\/style>/giu, " ").replace(/<[^>]+>/gu, " ")).replace(/\s+/gu, " ").trim();
const compact = (value) => value.normalize("NFKC").replace(/【[^】]+】/gu, "").replace(/[（(].*?[）)]/gu, "").replace(/[\s・「」『』\-]/gu, "").toLowerCase();
const meaningfulNameParts = (name) => {
  const cleaned = name.normalize("NFKC").replace(/【[^】]+】/gu, "").replace(/[（(].*?[）)]/gu, " ");
  const parts = cleaned.split(/[\s・「」『』＆&／/]+/u).map((part) => part.trim()).filter((part) => part.length >= 3);
  return [...new Set([compact(cleaned), ...parts.map(compact)])].filter((part) => part.length >= 3);
};

const extractSearchUrls = (html) => {
  const urls = [];
  for (const match of html.matchAll(/href=["']([^"']*uddg=[^"']+)["']/giu)) {
    try {
      const absolute = new URL(decodeEntities(match[1]), "https://duckduckgo.com");
      const target = absolute.searchParams.get("uddg");
      if (target && /^https?:\/\//u.test(target)) urls.push(target);
    } catch {}
  }
  return [...new Set(urls)];
};

const extractSnippets = (html, nameParts) => {
  const blocks = [...html.matchAll(/<(?:title|h1|h2|h3|p|li|dt|dd|th|td)\b[^>]*>([\s\S]*?)<\/(?:title|h1|h2|h3|p|li|dt|dd|th|td)>/giu)]
    .map((match) => stripTags(match[1]))
    .filter((text) => text.length >= 12 && text.length <= 260)
    .filter((text) => !/(cookie|プライバシー|サイトマップ|copyright|メニュー)/iu.test(text));
  return [...new Set(blocks)]
    .map((text, index) => ({ text, score: nameParts.reduce((score, part) => score + (compact(text).includes(part) ? 10 : 0), 0) + (text.match(/[、・「」（）]/gu) ?? []).length * 0.2 - index * 0.01 }))
    .sort((left, right) => right.score - left.score)
    .slice(0, 12);
};

const fetchText = async (url, timeout = 20000) => {
  const response = await fetch(url, { redirect: "follow", signal: AbortSignal.timeout(timeout), headers: { "user-agent": "Mozilla/5.0 (compatible; MemoripFacilityResearch/1.0; +https://trip-guide.net)", accept: "text/html,application/xhtml+xml,*/*;q=0.5" } });
  const text = await response.text();
  return { response, text };
};

const resolveOne = async (item) => {
  const facility = facilityById.get(Number(item.id));
  const nameParts = meaningfulNameParts(facility.name);
  let host = "";
  try { host = new URL(item.requested_url).hostname; } catch {}
  const query = `${host ? `site:${host} ` : ""}\"${facility.name.replace(/【[^】]+】/gu, "")}\" 公式`;
  try {
    const search = await fetchText(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`, 30000);
    const candidates = extractSearchUrls(search.text)
      .filter((url) => !/duckduckgo|google|bing/iu.test(url))
      .filter((url) => !host || new URL(url).hostname === host || new URL(url).hostname.endsWith(`.${host}`))
      .slice(0, 8);
    for (const candidate of candidates) {
      try {
        const fetched = await fetchText(candidate);
        if (!fetched.response.ok) continue;
        const bodyCompact = compact(stripTags(fetched.text).slice(0, 500000));
        const matchedParts = nameParts.filter((part) => bodyCompact.includes(part));
        if (matchedParts.length === 0) continue;
        const snippets = extractSnippets(fetched.text, nameParts);
        return { ...item, resolved: true, issue: null, discovered_url: candidate, final_url: fetched.response.url, status: fetched.response.status, name_matched: true, matched_name_parts: matchedParts, snippets, resolution_method: "official-domain-search" };
      } catch {}
    }
    return { ...item, search_query: query, searched_urls: candidates, resolution_method: "official-domain-search-unresolved" };
  } catch (error) {
    return { ...item, search_query: query, resolution_method: "official-domain-search-error", search_error: error.name };
  }
};

const unresolvedIndices = report.results.map((item, index) => ({ item, index })).filter(({ item }) => !item.resolved);
for (const task of unresolvedIndices) {
  const facility = facilityById.get(Number(task.item.id));
  const nameParts = meaningfulNameParts(facility.name);
  const matchedParts = nameParts.filter((part) =>
    (task.item.snippets ?? []).some((snippet) => compact(snippet.text).includes(part)),
  );
  if (matchedParts.length > 0 && Number(task.item.status) === 200) {
    report.results[task.index] = {
      ...task.item,
      resolved: true,
      issue: null,
      name_matched: true,
      matched_name_parts: matchedParts,
      resolution_method: "official-page-snippet-match",
    };
  }
}
const stillUnresolved = report.results.map((item, index) => ({ item, index })).filter(({ item }) => !item.resolved);
let cursor = 0;
const workers = Array.from({ length: 3 }, async () => {
  while (cursor < stillUnresolved.length) {
    const task = stillUnresolved[cursor++];
    const resolved = await resolveOne(task.item);
    report.results[task.index] = resolved;
    console.log(`${cursor}/${stillUnresolved.length} ${resolved.id} ${resolved.resolved ? "resolved" : resolved.issue}`);
    await new Promise((resolve) => setTimeout(resolve, 350));
  }
});
await Promise.all(workers);
report.resolved_count = report.results.filter((item) => item.resolved).length;
report.issue_count = report.results.length - report.resolved_count;
report.gap_resolution_completed_at = new Date().toISOString();
fs.writeFileSync(researchPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ resolved: report.resolved_count, issues: report.issue_count }));
