import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const MISSION_ID = "MEM-EVT-OPS-2026-W33-GROUP-B-DUE-FACILITY-REMEDIATION";
const RUN_ROOT = resolve(process.argv[2] || `.codex/runs/${MISSION_ID}`);
const CACHE_ROOT = join(RUN_ROOT, "linked-content-cache");
const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/138 Safari/537.36 MemoripsEventOpsRemediation/2026-W33";
const EVENT_TERMS = /イベント|催し|行事|祭|フェス|花火|体験|ワークショップ|講座|教室|展示|展覧|企画展|特別企画|公演|コンサート|上映|観察|見学会|説明会|ツアー|大会|フェア|マルシェ|セミナー|講演会|縁日|スタンプラリー|クイズラリー|サイエンス|探検|ショー|紙芝居|プレゼント|グリーティング|読み聞かせ|おはなし|作り|開催|予約|申込|募集|event|workshop|festival|calendar/iu;
const CURRENT_TERMS = /2026|令和\s*8|夏休み|夏季|秋|ハロウィン|開催中|開催予定|受付中|募集中|(?:8|9|10|11|12)\s*[月/]/iu;
const GENERIC_LABEL = /^(イベント|イベント一覧|イベント情報|イベント・体験|イベント＆トピックス|イベントカレンダー|お知らせ|ニュース|もっと見る|MORE)$/iu;

mkdirSync(CACHE_ROOT, { recursive: true });

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function decodeEntities(value) {
  const named = { amp: "&", apos: "'", gt: ">", hellip: "…", lt: "<", nbsp: " ", quot: '"' };
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

function normalizeHtml(html) {
  const title = decodeEntities(html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/iu)?.[1] ?? "")
    .replace(/\s+/gu, " ")
    .trim();
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
  return { title, text };
}

function contexts(text) {
  const lines = text.split(/\n+/gu).map((line) => line.replace(/\s+/gu, " ").trim()).filter(Boolean);
  const found = [];
  const seen = new Set();
  for (let index = 0; index < lines.length; index += 1) {
    if (!EVENT_TERMS.test(lines[index]) && !CURRENT_TERMS.test(lines[index])) continue;
    const context = lines.slice(Math.max(0, index - 1), Math.min(lines.length, index + 2)).join(" | ").slice(0, 1400);
    if (seen.has(context)) continue;
    seen.add(context);
    found.push(context);
    if (found.length >= 100) break;
  }
  return found;
}

async function fetchAttempt(url, attempt) {
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
    let text = "";
    let extractionError = null;
    if (/application\/pdf/iu.test(contentType) || buffer.subarray(0, 4).toString("ascii") === "%PDF") {
      const token = sha256(url).slice(0, 16);
      const pdfPath = join(CACHE_ROOT, `${token}-${attempt}.pdf`);
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
        ({ title, text } = normalizeHtml(decoded));
      } else {
        text = decoded.replace(/\r/gu, "").trim();
      }
    }
    const evaluable = response.ok && text.replace(/\s+/gu, "").length >= 120;
    return {
      attempt,
      requested_url: url,
      final_url: response.url,
      status: response.status,
      ok: response.ok,
      content_type: contentType,
      bytes: buffer.length,
      body_sha256: sha256(buffer),
      title,
      text,
      text_chars: text.length,
      evaluable,
      extraction_error: extractionError,
      error: null,
    };
  } catch (error) {
    return { attempt, requested_url: url, final_url: null, status: 0, ok: false, content_type: null, bytes: 0, body_sha256: null, title: "", text: "", text_chars: 0, evaluable: false, extraction_error: null, error: `${error.name}: ${error.message}` };
  }
}

async function fetchDetail(task) {
  const attempts = [await fetchAttempt(task.url, 1)];
  if (!attempts[0].evaluable) {
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 300));
    attempts.push(await fetchAttempt(task.url, 2));
  }
  const selected = attempts.find((attempt) => attempt.evaluable) ?? null;
  let cachePath = null;
  if (selected) {
    cachePath = `${task.facility_id}-${sha256(task.url).slice(0, 16)}.txt`;
    writeFileSync(join(CACHE_ROOT, cachePath), selected.text, "utf8");
  }
  return {
    ...task,
    // The full response body is persisted separately in the content cache.
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    attempts: attempts.map(({ text, ...attempt }) => attempt),
    selected: selected
      ? {
          final_url: selected.final_url,
          title: selected.title,
          text_chars: selected.text_chars,
          text_sha256: sha256(selected.text),
          cache_path: cachePath,
          opening_text: selected.text.slice(0, 1000),
          review_contexts: contexts(selected.text),
        }
      : null,
  };
}

const retrieval = JSON.parse(readFileSync(join(RUN_ROOT, "retrieval-evidence.json"), "utf8"));
const tasks = [];
for (const row of retrieval.facilities.filter((facility) => facility.selected_source)) {
  const links = row.selected_source.review_links || [];
  let selectedLinks = links.filter((link) =>
    link.label.length >= 6 &&
    !GENERIC_LABEL.test(link.label.trim()) &&
    CURRENT_TERMS.test(link.label),
  );
  if (selectedLinks.length === 0) {
    selectedLinks = links
      .filter((link) => link.label.length >= 10 && !GENERIC_LABEL.test(link.label.trim()) && EVENT_TERMS.test(link.label))
      .slice(0, 3);
  }
  const seen = new Set();
  for (const link of selectedLinks) {
    if (seen.has(link.href)) continue;
    seen.add(link.href);
    tasks.push({ facility_id: row.facility_id, name: row.name, prefecture: row.prefecture, label: link.label, url: link.href });
  }
}

const results = [];
let cursor = 0;
async function worker() {
  while (cursor < tasks.length) {
    const task = tasks[cursor];
    cursor += 1;
    results.push(await fetchDetail(task));
    if (results.length % 100 === 0) process.stderr.write(`linked details ${results.length}/${tasks.length}\n`);
  }
}
await Promise.all(Array.from({ length: 18 }, worker));
results.sort((left, right) => left.facility_id - right.facility_id || left.url.localeCompare(right.url));
const output = {
  mission_id: MISSION_ID,
  executed_at: new Date().toISOString(),
  task_count: tasks.length,
  evaluable_count: results.filter((result) => result.selected).length,
  unresolved_count: results.filter((result) => !result.selected).length,
  details: results,
};
writeFileSync(join(RUN_ROOT, "linked-detail-evidence.json"), `${JSON.stringify(output, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ task_count: output.task_count, evaluable_count: output.evaluable_count, unresolved_count: output.unresolved_count }, null, 2));
