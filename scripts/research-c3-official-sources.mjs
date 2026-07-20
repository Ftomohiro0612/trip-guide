import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const manifestPath = path.join(root, ".codex", "facility-content-c3-manifest-2026-07-20.json");
const facilitiesPath = path.join(root, "data", "facilities_data.json");
const samplePath = path.join(root, ".codex", "facility-content-c3-rewrite-samples-2026-07-20.md");
const outputPath = path.join(root, ".codex", "facility-content-c3-official-research-2026-07-20.json");

const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const facilitiesDocument = JSON.parse(fs.readFileSync(facilitiesPath, "utf8"));
const facilities = facilitiesDocument.facilities ?? facilitiesDocument;
const facilityById = new Map(facilities.map((facility) => [Number(facility.id), facility]));
const sampleMarkdown = fs.readFileSync(samplePath, "utf8");

const sampleUrlById = new Map();
for (const match of sampleMarkdown.matchAll(/^## Sample \d+: [^\n]+?（[^・]+・ID (\d+)・[^）]+）\n([\s\S]*?)(?=^## Sample \d+: |^## サンプル監査結果)/gmu)) {
  const id = Number(match[1]);
  const officialBlock = match[2].match(/### 公式URL\n\n([\s\S]*?)(?=\n### )/u)?.[1] ?? "";
  const urls = [...officialBlock.matchAll(/https?:\/\/[^)>\s]+/gu)].map((item) => item[0]);
  if (urls[0]) sampleUrlById.set(id, urls[0]);
}

const decodeEntities = (value) => value
  .replace(/&nbsp;|&#160;/giu, " ")
  .replace(/&amp;/giu, "&")
  .replace(/&quot;|&#34;/giu, '"')
  .replace(/&#39;|&apos;/giu, "'")
  .replace(/&lt;/giu, "<")
  .replace(/&gt;/giu, ">")
  .replace(/&#(\d+);/gu, (_, code) => String.fromCodePoint(Number(code)))
  .replace(/&#x([\da-f]+);/giu, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)));

const stripTags = (value) => decodeEntities(
  value
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/giu, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/giu, " ")
    .replace(/<svg\b[^>]*>[\s\S]*?<\/svg>/giu, " ")
    .replace(/<br\s*\/?>/giu, "。")
    .replace(/<[^>]+>/gu, " "),
).replace(/\s+/gu, " ").trim();

const compactName = (value) => value
  .normalize("NFKC")
  .replace(/【[^】]+】/gu, "")
  .replace(/[（(].*?[）)]/gu, "")
  .replace(/[\s・「」『』\-]/gu, "")
  .toLowerCase();

const candidateTexts = (html) => {
  const values = [];
  for (const match of html.matchAll(/<meta\b[^>]*(?:name|property)=["'](?:description|og:description)["'][^>]*content=["']([^"']+)["'][^>]*>/giu)) values.push(match[1]);
  for (const match of html.matchAll(/<meta\b[^>]*content=["']([^"']+)["'][^>]*(?:name|property)=["'](?:description|og:description)["'][^>]*>/giu)) values.push(match[1]);
  for (const match of html.matchAll(/<(?:title|h1|h2|h3|p|li|dt|dd|th|td)\b[^>]*>([\s\S]*?)<\/(?:title|h1|h2|h3|p|li|dt|dd|th|td)>/giu)) values.push(match[1]);
  return [...new Set(values.map(stripTags))]
    .filter((value) => value.length >= 12 && value.length <= 260)
    .filter((value) => !/(cookie|プライバシー|サイトマップ|メニューを開|検索結果|javascript|copyright|無断転載)/iu.test(value));
};

const evidenceTerms = (facility) => {
  const source = [
    facility.name,
    facility.description,
    facility.unique_selling_point,
    ...(facility.signature_experiences ?? []),
    ...(facility.things_to_do ?? []),
  ].join(" ").normalize("NFKC");
  return [...new Set(source.split(/[\s、。・「」『』（）()／/]+/u))]
    .map((value) => value.replace(/^(?:親子|子ども|家族|公式|施設|地域)$/u, ""))
    .filter((value) => value.length >= 3)
    .slice(0, 80);
};

const rankSnippets = (facility, candidates) => {
  const terms = evidenceTerms(facility);
  const compactFacilityName = compactName(facility.name);
  return candidates
    .map((text, index) => {
      const compact = compactName(text);
      const nameScore = compactFacilityName.length >= 4 && compact.includes(compactFacilityName) ? 10 : 0;
      const termScore = terms.reduce((score, term) => score + (text.includes(term) ? Math.min(4, term.length / 2) : 0), 0);
      const detailScore = (text.match(/[、・「」（）]/gu) ?? []).length * 0.25;
      return { text, score: Number((nameScore + termScore + detailScore - index * 0.01).toFixed(2)) };
    })
    .sort((left, right) => right.score - left.score || left.text.localeCompare(right.text, "ja"))
    .slice(0, 12);
};

const fetchOne = async (entry) => {
  const facility = facilityById.get(Number(entry.id));
  const requestedUrl = sampleUrlById.get(Number(entry.id)) ?? facility?.url ?? "";
  const checkedAt = new Date().toISOString();
  if (!/^https?:\/\//u.test(requestedUrl)) {
    return { id: entry.id, name: entry.name, requested_url: requestedUrl, checked_at: checkedAt, resolved: false, issue: "OFFICIAL_URL_MISSING", snippets: [] };
  }
  try {
    const response = await fetch(requestedUrl, {
      redirect: "follow",
      signal: AbortSignal.timeout(25000),
      headers: {
        "user-agent": "Mozilla/5.0 (compatible; MemoripFacilityResearch/1.0; +https://trip-guide.net)",
        accept: "text/html,application/xhtml+xml,application/pdf;q=0.8,*/*;q=0.5",
      },
    });
    const contentType = response.headers.get("content-type") ?? "";
    const body = await response.text();
    const htmlCandidates = /html|xml|text/iu.test(contentType) ? candidateTexts(body) : [];
    const snippets = rankSnippets(facility, htmlCandidates);
    const compactBody = compactName(stripTags(body).slice(0, 500000));
    const compactFacilityName = compactName(facility.name);
    const nameMatched = compactFacilityName.length >= 4 && compactBody.includes(compactFacilityName);
    const specificPath = new URL(response.url).pathname.replace(/\/+$/u, "").length > 1;
    const resolved = response.ok && (/pdf/iu.test(contentType) || nameMatched || (specificPath && snippets.length >= 2));
    return {
      id: entry.id,
      name: entry.name,
      requested_url: requestedUrl,
      final_url: response.url,
      status: response.status,
      content_type: contentType,
      checked_at: checkedAt,
      content_sha256: createHash("sha256").update(body).digest("hex"),
      name_matched: nameMatched,
      resolved,
      issue: response.ok ? (resolved ? null : "OFFICIAL_IDENTITY_NOT_CONFIRMED_ON_PAGE") : `HTTP_${response.status}`,
      snippets,
    };
  } catch (error) {
    return { id: entry.id, name: entry.name, requested_url: requestedUrl, checked_at: checkedAt, resolved: false, issue: `FETCH_ERROR:${error.name}`, snippets: [] };
  }
};

const results = new Array(manifest.entries.length);
let cursor = 0;
const workers = Array.from({ length: 10 }, async () => {
  while (cursor < manifest.entries.length) {
    const index = cursor++;
    results[index] = await fetchOne(manifest.entries[index]);
    console.log(`${index + 1}/${manifest.entries.length} ${results[index].id} ${results[index].status ?? "-"} ${results[index].resolved ? "resolved" : results[index].issue}`);
  }
});
await Promise.all(workers);

const report = {
  generated_at: new Date().toISOString(),
  source_head: process.env.C3_SOURCE_HEAD ?? "27a179528cce5edca6030408e2f590f310798054",
  target_count: manifest.entries.length,
  resolved_count: results.filter((result) => result.resolved).length,
  issue_count: results.filter((result) => !result.resolved).length,
  results,
};
fs.writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ resolved: report.resolved_count, issues: report.issue_count, output: path.relative(root, outputPath) }));
