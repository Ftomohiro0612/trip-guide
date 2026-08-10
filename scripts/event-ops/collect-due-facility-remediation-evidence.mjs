import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const MISSION_ID = "MEM-EVT-OPS-2026-W33-GROUP-B-DUE-FACILITY-REMEDIATION";
const AS_OF = "2026-08-10";
const AS_OF_TIME = new Date(`${AS_OF}T00:00:00Z`);
const CADENCE_DAYS = { weekly: 7, biweekly: 14, monthly: 31, seasonal: 92 };
const SCOPE = [
  "tokyo",
  "osaka",
  "hiroshima",
  "kyoto",
  "yamanashi",
  "nagano",
  "shizuoka",
  "kanagawa",
  "chiba",
  "saitama",
  "tochigi",
  "hyogo",
  "okayama",
  "fukushima",
  "toyama",
  "mie",
  "wakayama",
  "shimane",
  "kochi",
  "tokushima",
  "yamagata",
  "aomori",
];
const SCOPE_SET = new Set(SCOPE);
const EVENT_TERMS = /イベント|催し|行事|祭|フェス|花火|体験|ワークショップ|講座|教室|展示|展覧|企画展|特別企画|公演|コンサート|上映|観察|見学会|説明会|ツアー|大会|フェア|マルシェ|セミナー|講演会|縁日|スタンプラリー|クイズラリー|サイエンス|探検|ショー|紙芝居|プレゼント|グリーティング|読み聞かせ|おはなし|作り|開催|予約|申込|募集|event|workshop|festival|calendar/iu;
const DATE_TERMS = /(?:2026|令和\s*8)\s*[年./-]?\s*(?:0?[89]|1[0-2])\s*[月./-]\s*\d{1,2}\s*日?|(?:0?[89]|1[0-2])\s*[月/]\s*\d{1,2}\s*日?|\d{4}-\d{2}-\d{2}/u;
const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/138 Safari/537.36 MemoripsEventOpsRemediation/2026-W33";
const RUN_ROOT = resolve(
  process.argv[2] ||
    `.codex/runs/${MISSION_ID}`,
);
const CACHE_ROOT = join(RUN_ROOT, "content-cache");
const REGISTRY_PATH = resolve(".codex/events-source-registry.json");

mkdirSync(CACHE_ROOT, { recursive: true });

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function decodeEntities(value) {
  const named = {
    amp: "&",
    apos: "'",
    gt: ">",
    hellip: "…",
    lt: "<",
    nbsp: " ",
    quot: '"',
  };
  return value.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/giu, (match, entity) => {
    if (entity[0] === "#") {
      const radix = entity[1]?.toLowerCase() === "x" ? 16 : 10;
      const raw = radix === 16 ? entity.slice(2) : entity.slice(1);
      const codepoint = Number.parseInt(raw, radix);
      return Number.isFinite(codepoint) && codepoint >= 0 && codepoint <= 0x10ffff ? String.fromCodePoint(codepoint) : match;
    }
    return named[entity.toLowerCase()] ?? match;
  });
}

function decodeBody(buffer, contentType) {
  const prefix = buffer.subarray(0, 4096).toString("latin1");
  const declared = `${contentType} ${prefix}`.match(/charset\s*=\s*["']?([^\s"';>]+)/iu)?.[1]?.toLowerCase();
  const encoding = declared?.includes("shift_jis") || declared?.includes("shift-jis") || declared?.includes("sjis")
    ? "shift_jis"
    : declared?.includes("euc-jp")
      ? "euc-jp"
      : "utf-8";
  try {
    return new TextDecoder(encoding).decode(buffer);
  } catch {
    return new TextDecoder("utf-8").decode(buffer);
  }
}

function normalizeHtml(html, baseUrl) {
  const title = decodeEntities(html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/iu)?.[1] ?? "")
    .replace(/\s+/gu, " ")
    .trim();
  const headings = [...html.matchAll(/<h[1-4]\b[^>]*>([\s\S]*?)<\/h[1-4]>/giu)]
    .map((match) => decodeEntities(match[1].replace(/<[^>]+>/gu, " ")).replace(/\s+/gu, " ").trim())
    .filter(Boolean)
    .slice(0, 80);
  const links = [];
  const seenLinks = new Set();
  for (const match of html.matchAll(/<a\b[^>]*href\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/giu)) {
    const label = decodeEntities(match[2].replace(/<[^>]+>/gu, " ")).replace(/\s+/gu, " ").trim();
    if (!label) continue;
    let href;
    try {
      href = new URL(match[1], baseUrl).href;
    } catch {
      continue;
    }
    const key = `${href}\u0000${label}`;
    if (seenLinks.has(key)) continue;
    seenLinks.add(key);
    links.push({ href, label: label.slice(0, 300) });
    if (links.length >= 500) break;
  }
  const text = decodeEntities(
    html
      .replace(/<!--[\s\S]*?-->/gu, " ")
      .replace(/<(?:script|style|noscript|svg|template)\b[\s\S]*?<\/(?:script|style|noscript|svg|template)>/giu, " ")
      .replace(/<(?:br|\/p|\/div|\/li|\/tr|\/section|\/article|\/h[1-6])\b[^>]*>/giu, "\n")
      .replace(/<[^>]+>/gu, " "),
  )
    .replace(/\r/gu, "")
    .replace(/[\t\f\v ]+/gu, " ")
    .replace(/ *\n */gu, "\n")
    .replace(/\n{3,}/gu, "\n\n")
    .trim();
  return { title, headings, links, text };
}

function extractReviewContexts(text) {
  const lines = text
    .split(/\n+/gu)
    .map((line) => line.replace(/\s+/gu, " ").trim())
    .filter(Boolean);
  const contexts = [];
  const seen = new Set();
  for (let index = 0; index < lines.length; index += 1) {
    if (!EVENT_TERMS.test(lines[index]) && !DATE_TERMS.test(lines[index])) continue;
    const context = lines
      .slice(Math.max(0, index - 1), Math.min(lines.length, index + 2))
      .join(" | ")
      .slice(0, 900);
    if (!seen.has(context)) {
      contexts.push(context);
      seen.add(context);
    }
    if (contexts.length >= 120) break;
  }
  return contexts;
}

function isEvaluableText(text, contentType) {
  if (/application\/pdf/iu.test(contentType)) return text.trim().length >= 80;
  const compact = text.replace(/\s+/gu, "");
  if (compact.length < 120) return false;
  if (/enable javascript|javascriptを有効|please wait while|just a moment/iu.test(compact) && compact.length < 800) return false;
  return true;
}

function fallbackUrl(row, attempts) {
  const source = attempts.findLast((attempt) => attempt.final_url)?.final_url || row.official_event_url || row.official_event_url_secondary;
  if (!source) return null;
  try {
    const parsed = new URL(source);
    if (parsed.pathname !== "/" && parsed.pathname !== "") return parsed.origin + "/";
    return new URL("event/", parsed.origin + "/").href;
  } catch {
    return null;
  }
}

async function fetchOnce(url, role, attemptNumber, facilityId) {
  const startedAt = new Date().toISOString();
  try {
    const response = await fetch(url, {
      redirect: "follow",
      headers: {
        accept: "text/html,application/xhtml+xml,application/pdf,text/plain;q=0.9,*/*;q=0.8",
        "accept-language": "ja,en-US;q=0.7,en;q=0.5",
        "user-agent": USER_AGENT,
      },
      signal: AbortSignal.timeout(20_000),
    });
    const buffer = Buffer.from(await response.arrayBuffer());
    const contentType = response.headers.get("content-type") || "";
    let title = "";
    let headings = [];
    let links = [];
    let text = "";
    let extractionError = null;
    if (/application\/pdf/iu.test(contentType) || buffer.subarray(0, 4).toString("ascii") === "%PDF") {
      const pdfPath = join(CACHE_ROOT, `${facilityId}-${role}-${attemptNumber}.pdf`);
      const txtPath = `${pdfPath}.txt`;
      writeFileSync(pdfPath, buffer);
      try {
        execFileSync("pdftotext", ["-layout", "-enc", "UTF-8", pdfPath, txtPath], { stdio: "ignore" });
        text = readFileSync(txtPath, "utf8").replace(/\r/gu, "").trim();
      } catch (error) {
        extractionError = `pdftotext: ${error.message}`;
      } finally {
        rmSync(txtPath, { force: true });
      }
    } else {
      const decoded = decodeBody(buffer, contentType);
      if (/html|xhtml|xml/iu.test(contentType) || /<html|<!doctype/iu.test(decoded.slice(0, 1000))) {
        ({ title, headings, links, text } = normalizeHtml(decoded, response.url));
      } else {
        text = decoded.replace(/\r/gu, "").trim();
      }
    }
    const evaluable = response.ok && isEvaluableText(text, contentType);
    return {
      role,
      attempt: attemptNumber,
      requested_url: url,
      final_url: response.url,
      started_at: startedAt,
      status: response.status,
      ok: response.ok,
      content_type: contentType,
      bytes: buffer.length,
      body_sha256: sha256(buffer),
      title,
      headings,
      links,
      text,
      text_chars: text.length,
      evaluable,
      extraction_error: extractionError,
      error: null,
    };
  } catch (error) {
    return {
      role,
      attempt: attemptNumber,
      requested_url: url,
      final_url: null,
      started_at: startedAt,
      status: 0,
      ok: false,
      content_type: null,
      bytes: 0,
      body_sha256: null,
      title: "",
      headings: [],
      links: [],
      text: "",
      text_chars: 0,
      evaluable: false,
      extraction_error: null,
      error: `${error.name}: ${error.message}`,
    };
  }
}

async function evaluateRetrieval(row) {
  const attempts = [];
  for (const [role, url] of [
    ["primary", row.official_event_url],
    ["secondary", row.official_event_url_secondary],
  ]) {
    if (!url) continue;
    const first = await fetchOnce(url, role, 1, row.facility_id);
    attempts.push(first);
    if (!first.evaluable) {
      await new Promise((resolveDelay) => setTimeout(resolveDelay, 350));
      attempts.push(await fetchOnce(url, role, 2, row.facility_id));
    }
    if (attempts.some((attempt) => attempt.evaluable)) break;
  }
  if (!attempts.some((attempt) => attempt.evaluable)) {
    const fallback = fallbackUrl(row, attempts);
    if (fallback && !attempts.some((attempt) => attempt.requested_url === fallback)) {
      attempts.push(await fetchOnce(fallback, "official_site_fallback", 1, row.facility_id));
    } else if (fallback) {
      attempts.push(await fetchOnce(new URL("news/", fallback).href, "official_site_fallback", 1, row.facility_id));
    }
  }
  const selected = attempts.find((attempt) => attempt.evaluable) ?? null;
  if (selected) {
    const contentPath = join(CACHE_ROOT, `${row.facility_id}.txt`);
    writeFileSync(contentPath, selected.text, "utf8");
  }
  return {
    facility_id: row.facility_id,
    name: row.name,
    prefecture: row.prefecture,
    patrol_tier: row.patrol_tier,
    last_checked_at: row.last_checked_at,
    cadence_days: CADENCE_DAYS[row.patrol_tier],
    official_event_url: row.official_event_url,
    official_event_url_secondary: row.official_event_url_secondary,
    // The full response body is persisted separately in the content cache.
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    attempts: attempts.map(({ text, ...attempt }) => attempt),
    selected_source: selected
      ? {
          role: selected.role,
          requested_url: selected.requested_url,
          final_url: selected.final_url,
          title: selected.title,
          headings: selected.headings,
          review_links: selected.links
            .filter((link) => EVENT_TERMS.test(link.label) || DATE_TERMS.test(link.label) || /2026|令和\s*8/iu.test(link.label))
            .slice(0, 150),
          text_chars: selected.text_chars,
          text_sha256: sha256(selected.text),
          review_contexts: extractReviewContexts(selected.text),
          has_event_term: EVENT_TERMS.test(selected.text),
          has_date_term: DATE_TERMS.test(selected.text),
        }
      : null,
    retrieval_terminal: selected ? "content_retrieved_for_review" : "source_unresolved_after_required_attempts",
    disposition: null,
    disposition_reason: null,
  };
}

const registry = JSON.parse(readFileSync(REGISTRY_PATH, "utf8")).facilities;
const due = registry.filter((row) => {
  const cadence = CADENCE_DAYS[row.patrol_tier];
  if (!SCOPE_SET.has(row.prefecture) || cadence == null) return false;
  if (!row.last_checked_at) return true;
  const checked = new Date(`${row.last_checked_at}T00:00:00Z`);
  return (AS_OF_TIME - checked) / 86_400_000 >= cadence;
});

const queue = [...due];
const results = [];
let cursor = 0;
async function worker() {
  while (cursor < queue.length) {
    const row = queue[cursor];
    cursor += 1;
    const result = await evaluateRetrieval(row);
    results.push(result);
    if (results.length % 25 === 0) process.stderr.write(`retrieved ${results.length}/${due.length}\n`);
  }
}

await Promise.all(Array.from({ length: 12 }, worker));
results.sort((left, right) => SCOPE.indexOf(left.prefecture) - SCOPE.indexOf(right.prefecture) || left.facility_id - right.facility_id);

const perRegion = Object.fromEntries(
  SCOPE.map((prefecture) => [prefecture, results.filter((row) => row.prefecture === prefecture).length]),
);
const output = {
  mission_id: MISSION_ID,
  executed_at: new Date().toISOString(),
  as_of_date: AS_OF,
  product_head_at_derivation: process.env.PRODUCT_HEAD || null,
  registry_path: ".codex/events-source-registry.json",
  cadence_days: CADENCE_DAYS,
  scope_prefectures: SCOPE,
  due_count: results.length,
  due_url_count: results.reduce(
    (total, row) => total + Number(Boolean(row.official_event_url)) + Number(Boolean(row.official_event_url_secondary)),
    0,
  ),
  per_region_due: perRegion,
  retrieval_summary: {
    content_retrieved_for_review: results.filter((row) => row.retrieval_terminal === "content_retrieved_for_review").length,
    source_unresolved_after_required_attempts: results.filter((row) => row.retrieval_terminal === "source_unresolved_after_required_attempts").length,
  },
  facilities: results,
};
writeFileSync(join(RUN_ROOT, "retrieval-evidence.json"), `${JSON.stringify(output, null, 2)}\n`, "utf8");
writeFileSync(
  join(RUN_ROOT, "due-facility-ids.txt"),
  `${results.map((row) => `${row.prefecture}\t${row.facility_id}\t${row.name}`).join("\n")}\n`,
  "utf8",
);
console.log(JSON.stringify({ run_root: RUN_ROOT, due_count: output.due_count, due_url_count: output.due_url_count, per_region_due: perRegion, retrieval_summary: output.retrieval_summary }, null, 2));
