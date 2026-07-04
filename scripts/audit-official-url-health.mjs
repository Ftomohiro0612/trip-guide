import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = resolve(__dirname, "..");
const FACILITIES_PATH = resolve(ROOT_DIR, "data", "facilities_data.json");
const REPORT_DIR = resolve(ROOT_DIR, ".codex");
const AUDIT_JSON_PATH = resolve(REPORT_DIR, "official_url_health_audit.json");
const AUDIT_SUMMARY_PATH = resolve(REPORT_DIR, "official_url_health_audit_summary.md");

const CONCURRENCY = 20;
const TIMEOUT_MS = 15_000;
const MAX_REDIRECTS = 10;
const MAX_TITLE_BYTES = 64 * 1024;
const RETRIES = 1;
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36 MemoripOfficialUrlAudit/1.0";

const CLASSIFICATIONS = [
  "ok_200",
  "redirect_ok",
  "redirect_to_toppage",
  "redirect_offsite",
  "not_found",
  "server_error",
  "dns_error",
  "ssl_error",
  "conn_error",
  "timeout",
  "no_url",
];

const HIGH_ERROR_CLASSIFICATIONS = new Set([
  "not_found",
  "server_error",
  "ssl_error",
  "timeout",
  "dns_error",
]);
const BROKEN_OK_CLASSIFICATIONS = new Set(["ok_200", "redirect_ok"]);
const FLAGSHIP_NAME_KEYWORDS = [
  "県立",
  "市立",
  "国営",
  "公園",
  "動物園",
  "水族館",
  "博物館",
  "科学館",
  "美術館",
  "遊園地",
  "テーマパーク",
  "プール",
];

function text(value) {
  if (typeof value === "string") return value.trim();
  if (value == null) return "";
  return String(value).trim();
}

function generatedTimestamp() {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })
    .format(new Date())
    .replace(" ", "T");
}

async function readFacilities() {
  const raw = await readFile(FACILITIES_PATH, "utf-8");
  const json = JSON.parse(raw);
  const facilities = Array.isArray(json) ? json : json.facilities;
  if (!Array.isArray(facilities)) {
    throw new Error("facilities_data.json に facilities 配列が見つかりません");
  }
  return facilities;
}

function normalizeHost(hostname) {
  return text(hostname).toLowerCase().replace(/^www\./, "");
}

function hostOf(value) {
  try {
    return new URL(value).hostname.toLowerCase();
  } catch {
    return "";
  }
}

function isRootLanding(value) {
  try {
    const url = new URL(value);
    const path = url.pathname.replace(/\/+$/g, "");
    return path === "" && url.search === "";
  } catch {
    return false;
  }
}

function hasMeaningfulPath(value) {
  try {
    const path = new URL(value).pathname.replace(/\/+$/g, "");
    return path !== "";
  } catch {
    return false;
  }
}

function sameDomain(originalUrl, finalUrl) {
  const originalHost = normalizeHost(hostOf(originalUrl));
  const finalHost = normalizeHost(hostOf(finalUrl));
  return Boolean(originalHost && finalHost && originalHost === finalHost);
}

function classifyHttpResult(result, originalUrl) {
  const status = result.status_code;
  if (status === 200) {
    if (result.redirect_count === 0) return "ok_200";
    if (hasMeaningfulPath(originalUrl) && isRootLanding(result.final_url)) {
      return "redirect_to_toppage";
    }
    if (!sameDomain(originalUrl, result.final_url)) return "redirect_offsite";
    return "redirect_ok";
  }
  if (status === 404 || status === 410) return "not_found";
  if (status >= 500 && status <= 599) return "server_error";
  return "conn_error";
}

function classifyError(error) {
  const code = error?.cause?.code || error?.code || "";
  const message = `${error?.name ?? ""} ${code} ${error?.message ?? ""}`;
  if (/AbortError|TimeoutError|ETIMEDOUT|UND_ERR_HEADERS_TIMEOUT|UND_ERR_BODY_TIMEOUT/i.test(message)) {
    return "timeout";
  }
  if (/ENOTFOUND|EAI_AGAIN|NXDOMAIN/i.test(message)) return "dns_error";
  if (/CERT_|SSL|TLS|UNABLE_TO_VERIFY|SELF_SIGNED|HOSTNAME|ERR_TLS/i.test(message)) {
    return "ssl_error";
  }
  return "conn_error";
}

function isRetryable(classification) {
  return classification === "timeout" || classification === "server_error" || classification === "conn_error";
}

function decodeBytes(bytes, contentType) {
  const contentTypeCharset = contentType.match(/charset=([^;\s]+)/i)?.[1]?.trim();
  const firstPass = new TextDecoder(labelForCharset(contentTypeCharset), { fatal: false }).decode(bytes);
  const metaCharset = firstPass.match(/<meta[^>]+charset=["']?\s*([^"'\s/>]+)/i)?.[1]?.trim();
  const charset = labelForCharset(contentTypeCharset || metaCharset);
  if (charset === labelForCharset(contentTypeCharset)) return firstPass;
  return new TextDecoder(charset, { fatal: false }).decode(bytes);
}

function labelForCharset(charset) {
  const normalized = text(charset).toLowerCase();
  if (["shift_jis", "shift-jis", "sjis", "windows-31j", "cp932"].includes(normalized)) {
    return "shift_jis";
  }
  if (["euc-jp", "euc_jp"].includes(normalized)) return "euc-jp";
  if (["iso-2022-jp", "jis"].includes(normalized)) return "iso-2022-jp";
  return "utf-8";
}

function decodeHtmlEntities(value) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(Number.parseInt(hex, 16)))
    .replace(/&#([0-9]+);/g, (_, num) => String.fromCodePoint(Number.parseInt(num, 10)));
}

function extractTitle(html) {
  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "";
  return decodeHtmlEntities(title.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()).slice(0, 240);
}

function titleOk(title, classification) {
  if (!title) return false;
  if (!BROKEN_OK_CLASSIFICATIONS.has(classification)) return false;
  return !/(404|not found|forbidden|service unavailable|error|ページが見つかりません|お探しのページ)/i.test(title);
}

async function readFirstBytes(response) {
  if (!response.body) return new Uint8Array();
  const reader = response.body.getReader();
  const chunks = [];
  let total = 0;

  try {
    while (total < MAX_TITLE_BYTES) {
      const { done, value } = await reader.read();
      if (done || !value) break;
      const remaining = MAX_TITLE_BYTES - total;
      const chunk = value.byteLength > remaining ? value.slice(0, remaining) : value;
      chunks.push(chunk);
      total += chunk.byteLength;
      if (value.byteLength > remaining) break;
    }
  } finally {
    await reader.cancel().catch(() => {});
  }

  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
}

async function fetchOnce(originalUrl, signal) {
  let currentUrl = originalUrl;
  const redirects = [];

  for (let redirectCount = 0; redirectCount <= MAX_REDIRECTS; redirectCount += 1) {
    const response = await fetch(currentUrl, {
      method: "GET",
      redirect: "manual",
      signal,
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "ja,en-US;q=0.9,en;q=0.8",
      },
    });

    if (response.status >= 300 && response.status <= 399) {
      const location = response.headers.get("location");
      if (!location) {
        await response.body?.cancel().catch(() => {});
        return {
          status_code: response.status,
          final_url: currentUrl,
          redirect_count: redirects.length,
          redirects,
          title: "",
          notes: ["redirect_without_location"],
        };
      }

      const nextUrl = new URL(location, currentUrl).toString();
      redirects.push({ from: currentUrl, to: nextUrl, status_code: response.status });
      await response.body?.cancel().catch(() => {});
      currentUrl = nextUrl;
      continue;
    }

    const contentType = response.headers.get("content-type") ?? "";
    let title = "";
    if (response.status === 200 && /text\/html|application\/xhtml\+xml|charset=/i.test(contentType)) {
      const bytes = await readFirstBytes(response);
      title = extractTitle(decodeBytes(bytes, contentType));
    } else {
      await response.body?.cancel().catch(() => {});
    }

    return {
      status_code: response.status,
      final_url: response.url || currentUrl,
      redirect_count: redirects.length,
      redirects,
      title,
      notes: [],
    };
  }

  return {
    status_code: 310,
    final_url: currentUrl,
    redirect_count: redirects.length,
    redirects,
    title: "",
    notes: ["too_many_redirects"],
  };
}

async function auditUrl(url) {
  const trimmedUrl = text(url);
  if (!trimmedUrl) {
    return {
      status_code: null,
      final_url: null,
      redirect_count: 0,
      same_domain: false,
      classification: "no_url",
      http_ok: false,
      title: "",
      title_ok: false,
      notes: ["url_empty"],
      attempts: 0,
    };
  }

  try {
    new URL(trimmedUrl);
  } catch {
    return {
      status_code: null,
      final_url: null,
      redirect_count: 0,
      same_domain: false,
      classification: "conn_error",
      http_ok: false,
      title: "",
      title_ok: false,
      notes: ["invalid_url"],
      attempts: 0,
    };
  }

  const attemptNotes = [];
  for (let attempt = 0; attempt <= RETRIES; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const result = await fetchOnce(trimmedUrl, controller.signal);
      const classification = classifyHttpResult(result, trimmedUrl);
      const notes = [
        ...attemptNotes,
        ...result.notes,
        ...(classification === "conn_error" && result.status_code ? [`unexpected_http_status_${result.status_code}`] : []),
      ];

      if (attempt < RETRIES && isRetryable(classification)) {
        attemptNotes.push(`attempt_${attempt + 1}_${classification}`);
        continue;
      }

      return {
        status_code: result.status_code,
        final_url: result.final_url,
        redirect_count: result.redirect_count,
        same_domain: sameDomain(trimmedUrl, result.final_url),
        classification,
        http_ok: BROKEN_OK_CLASSIFICATIONS.has(classification),
        title: result.title,
        title_ok: titleOk(result.title, classification),
        notes,
        attempts: attempt + 1,
      };
    } catch (error) {
      const classification = classifyError(error);
      const note = `${classification}:${error?.cause?.code || error?.code || error?.name || "error"}`;
      if (attempt < RETRIES && isRetryable(classification)) {
        attemptNotes.push(`attempt_${attempt + 1}_${note}`);
        continue;
      }
      return {
        status_code: null,
        final_url: null,
        redirect_count: 0,
        same_domain: false,
        classification,
        http_ok: false,
        title: "",
        title_ok: false,
        notes: [...attemptNotes, note],
        attempts: attempt + 1,
      };
    } finally {
      clearTimeout(timeout);
    }
  }

  throw new Error("unreachable retry state");
}

function isBroken(record) {
  return !BROKEN_OK_CLASSIFICATIONS.has(record.classification);
}

function isFlagshipFacility(facility) {
  const haystack = [facility.name, facility.category, facility.description].map(text).join(" ");
  return FLAGSHIP_NAME_KEYWORDS.some((keyword) => haystack.includes(keyword));
}

function fixPriority(facility, record, officialUrlDisplayed) {
  if (!isBroken(record)) return null;
  if (
    (HIGH_ERROR_CLASSIFICATIONS.has(record.classification) && officialUrlDisplayed) ||
    isFlagshipFacility(facility) ||
    facility.prefecture === "千葉県" ||
    facility.prefecture_id === "chiba"
  ) {
    return "high";
  }
  if (record.classification === "redirect_to_toppage" || record.classification === "redirect_offsite") {
    return "medium";
  }
  return "low";
}

function countBy(items, getKey) {
  return items.reduce((counts, item) => {
    const key = getKey(item);
    counts[key] = (counts[key] ?? 0) + 1;
    return counts;
  }, {});
}

function sortedCountsObject(counts, preferredOrder = null) {
  const entries = preferredOrder
    ? preferredOrder.map((key) => [key, counts[key] ?? 0])
    : Object.entries(counts).sort(([a], [b]) => a.localeCompare(b));
  return Object.fromEntries(entries);
}

function domainRollup(records) {
  const groups = new Map();
  for (const record of records.filter(isBroken)) {
    const host = hostOf(record.url) || "invalid_or_empty";
    const group = groups.get(host) ?? {
      host,
      broken: 0,
      by_classification: {},
      high: 0,
      examples: [],
    };
    group.broken += 1;
    group.by_classification[record.classification] = (group.by_classification[record.classification] ?? 0) + 1;
    if (record.fix_priority === "high") group.high += 1;
    if (group.examples.length < 8) {
      group.examples.push({
        id: record.id,
        name: record.name,
        prefecture: record.prefecture,
        classification: record.classification,
        fix_priority: record.fix_priority,
        url: record.url,
      });
    }
    groups.set(host, group);
  }

  return [...groups.values()]
    .map((group) => ({
      ...group,
      by_classification: sortedCountsObject(group.by_classification),
    }))
    .sort((a, b) => b.broken - a.broken || a.host.localeCompare(b.host));
}

function prefectureRollup(records) {
  const groups = {};
  for (const record of records.filter(isBroken)) {
    const pref = record.prefecture || "unknown";
    groups[pref] ??= { broken: 0, high: 0, by_classification: {} };
    groups[pref].broken += 1;
    if (record.fix_priority === "high") groups[pref].high += 1;
    groups[pref].by_classification[record.classification] =
      (groups[pref].by_classification[record.classification] ?? 0) + 1;
  }

  return Object.fromEntries(
    Object.entries(groups)
      .sort(([, a], [, b]) => b.broken - a.broken)
      .map(([pref, value]) => [
        pref,
        {
          ...value,
          by_classification: sortedCountsObject(value.by_classification),
        },
      ]),
  );
}

function escapeMarkdownCell(value) {
  return String(value ?? "")
    .replaceAll("\\", "\\\\")
    .replaceAll("|", "\\|")
    .replaceAll("\n", " ");
}

function markdownTable(headers, rows) {
  if (rows.length === 0) return "_該当なし_";
  return [
    `| ${headers.map(escapeMarkdownCell).join(" |")} |`,
    `| ${headers.map(() => "---").join(" |")} |`,
    ...rows.map((row) => `| ${row.map(escapeMarkdownCell).join(" |")} |`),
  ].join("\n");
}

function buildMarkdown(audit) {
  const classificationRows = CLASSIFICATIONS.map((classification) => [
    classification,
    audit.summary.classification_counts[classification] ?? 0,
  ]);
  const priorityRows = ["high", "medium", "low"].map((priority) => [
    priority,
    audit.summary.fix_priority_counts[priority] ?? 0,
  ]);
  const domainRows = audit.summary.broken_by_domain.slice(0, 30).map((domain) => [
    domain.host,
    domain.broken,
    domain.high,
    Object.entries(domain.by_classification)
      .map(([classification, count]) => `${classification}:${count}`)
      .join(" / "),
    domain.examples.slice(0, 3).map((item) => `${item.id} ${item.name}`).join(" / "),
  ]);
  const prefRows = Object.entries(audit.summary.broken_by_prefecture).map(([prefecture, value]) => [
    prefecture,
    value.broken,
    value.high,
    Object.entries(value.by_classification)
      .map(([classification, count]) => `${classification}:${count}`)
      .join(" / "),
  ]);
  const highRows = audit.facilities
    .filter((record) => record.fix_priority === "high")
    .slice(0, 40)
    .map((record) => [
      record.id,
      record.name,
      record.prefecture,
      record.classification,
      hostOf(record.url),
      record.status_code ?? "-",
      record.notes.join(" / "),
    ]);
  const cgaRows = audit.facilities
    .filter((record) => hostOf(record.url) === "www.cga-park.or.jp")
    .map((record) => [record.id, record.name, record.classification, record.fix_priority, record.notes.join(" / ")]);

  return [
    "# official_url Health Audit Summary",
    "",
    `Generated: ${audit.meta.generated_at_jst}`,
    "",
    "## Scope",
    "",
    `- Input: ${audit.meta.input_file}`,
    `- Total facilities: ${audit.meta.total_facilities}`,
    `- URL present: ${audit.meta.url_present}`,
    `- URL empty: ${audit.meta.url_empty}`,
    `- Network policy: GET, redirect follow, UA set, ${audit.meta.timeout_ms}ms timeout, concurrency ${audit.meta.concurrency}, retry ${audit.meta.retries}`,
    `- Facility detail page displays url: ${audit.meta.facility_detail_url_displayed} (${audit.meta.facility_detail_url_display_evidence})`,
    "- This is a live network audit. Results are non-deterministic and may change on rerun.",
    "",
    "## Summary",
    "",
    `- broken total: ${audit.summary.broken_total}`,
    `- http_ok total: ${audit.summary.http_ok_total}`,
    `- high priority: ${audit.summary.fix_priority_counts.high ?? 0}`,
    `- medium priority: ${audit.summary.fix_priority_counts.medium ?? 0}`,
    `- low priority: ${audit.summary.fix_priority_counts.low ?? 0}`,
    "",
    "## Classification Counts",
    "",
    markdownTable(["classification", "count"], classificationRows),
    "",
    "## Fix Priority Counts",
    "",
    markdownTable(["priority", "count"], priorityRows),
    "",
    "## Broken By Domain Top 30",
    "",
    markdownTable(["host", "broken", "high", "classification", "examples"], domainRows),
    "",
    "## Broken By Prefecture",
    "",
    markdownTable(["prefecture", "broken", "high", "classification"], prefRows),
    "",
    "## cga-park Cluster",
    "",
    markdownTable(["id", "name", "classification", "priority", "notes"], cgaRows),
    "",
    "## High Priority Samples",
    "",
    markdownTable(["id", "name", "prefecture", "classification", "host", "status", "notes"], highRows),
    "",
    "## Replacement Candidate Policy",
    "",
    "1. Use the facility or designated manager official page.",
    "2. If unavailable, use the municipality or prefecture official page.",
    "3. If unavailable, use a public-adjacent tourism association page.",
    "4. Do not use private review, booking, or roundup sites as official_url by default.",
    "",
    "## Notes",
    "",
    "- `redirect_to_toppage` means an original path landed on the domain root after redirects, suggesting a missing individual page.",
    "- `redirect_offsite` needs visual review before replacement because it may be a legitimate migration.",
    "- Unexpected non-200 statuses outside 404/410/5xx are grouped as `conn_error` with `unexpected_http_status_*` notes because the spec requires one of the fixed classifications.",
    "",
  ].join("\n");
}

async function mapConcurrent(items, limit, mapper) {
  const results = new Array(items.length);
  let nextIndex = 0;
  let completed = 0;

  async function worker() {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await mapper(items[index], index);
      completed += 1;
      if (completed % 100 === 0 || completed === items.length) {
        console.log(`audited ${completed}/${items.length}`);
      }
    }
  }

  await Promise.all(Array.from({ length: limit }, worker));
  return results;
}

async function main() {
  const startedAt = Date.now();
  const startedAtJst = generatedTimestamp();
  const facilities = await readFacilities();
  const officialUrlDisplayed = true;
  const records = await mapConcurrent(facilities, CONCURRENCY, async (facility) => {
    const urlAudit = await auditUrl(facility.url);
    const record = {
      id: facility.id,
      slug: facility.slug,
      name: facility.name,
      prefecture: facility.prefecture,
      prefecture_id: facility.prefecture_id,
      category: facility.category,
      category_id: facility.category_id,
      url: text(facility.url) || null,
      status_code: urlAudit.status_code,
      final_url: urlAudit.final_url,
      redirect_count: urlAudit.redirect_count,
      same_domain: urlAudit.same_domain,
      classification: urlAudit.classification,
      http_ok: urlAudit.http_ok,
      title: urlAudit.title,
      title_ok: urlAudit.title_ok,
      notes: urlAudit.notes,
      attempts: urlAudit.attempts,
      fix_priority: null,
    };
    record.fix_priority = fixPriority(facility, record, officialUrlDisplayed);
    return record;
  });

  const classificationCounts = sortedCountsObject(countBy(records, (record) => record.classification), CLASSIFICATIONS);
  const brokenRecords = records.filter(isBroken);
  const priorityCounts = sortedCountsObject(countBy(brokenRecords, (record) => record.fix_priority ?? "none"), [
    "high",
    "medium",
    "low",
  ]);

  const audit = {
    meta: {
      generated_at_jst: generatedTimestamp(),
      started_at_jst: startedAtJst,
      duration_seconds: Number(((Date.now() - startedAt) / 1000).toFixed(1)),
      input_file: "data/facilities_data.json",
      output_files: [
        ".codex/official_url_health_audit.json",
        ".codex/official_url_health_audit_summary.md",
      ],
      total_facilities: records.length,
      url_present: records.filter((record) => record.url).length,
      url_empty: records.filter((record) => !record.url).length,
      request_method: "GET",
      redirect_policy: `manual follow up to ${MAX_REDIRECTS}`,
      user_agent: USER_AGENT,
      timeout_ms: TIMEOUT_MS,
      concurrency: CONCURRENCY,
      retries: RETRIES,
      title_byte_limit: MAX_TITLE_BYTES,
      facility_detail_url_displayed: officialUrlDisplayed,
      facility_detail_url_display_evidence:
        'app/facilities/[slug]/page.tsx renders href={facility.url} with label "公式サイトを見る"',
      nondeterminism_notice:
        "This audit performs live network requests. DNS, TLS, redirects, rate limits, bot protection, and server state can change; reruns may produce different results.",
      data_mutation_notice: "Audit-only: data/facilities_data.json was read but not modified.",
    },
    summary: {
      total_facilities: records.length,
      url_present: records.filter((record) => record.url).length,
      url_empty: records.filter((record) => !record.url).length,
      http_ok_total: records.filter((record) => record.http_ok).length,
      broken_total: brokenRecords.length,
      classification_counts: classificationCounts,
      fix_priority_counts: priorityCounts,
      broken_by_domain: domainRollup(records),
      broken_by_prefecture: prefectureRollup(records),
    },
    facilities: records,
  };

  await mkdir(REPORT_DIR, { recursive: true });
  await writeFile(AUDIT_JSON_PATH, `${JSON.stringify(audit, null, 2)}\n`, "utf-8");
  await writeFile(AUDIT_SUMMARY_PATH, buildMarkdown(audit), "utf-8");

  console.log(
    JSON.stringify(
      {
        total_facilities: audit.summary.total_facilities,
        broken_total: audit.summary.broken_total,
        classification_counts: audit.summary.classification_counts,
        fix_priority_counts: audit.summary.fix_priority_counts,
        top_broken_domains: audit.summary.broken_by_domain.slice(0, 10).map((item) => ({
          host: item.host,
          broken: item.broken,
          high: item.high,
        })),
        duration_seconds: audit.meta.duration_seconds,
        outputs: audit.meta.output_files,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
