#!/usr/bin/env node
// audit-metadata-pollution.mjs
// AUDIT-ONLY. Scans all facilities for generation-artifact / judgment-memo
// pollution leaked into user-visible metadata (name / address primarily,
// description / url secondarily). Does NOT mutate data. Triggered by the
// id345 miss (existing checkNameMemoPollution used only 6 tokens and never
// scanned address). Outputs a structured JSON + a summary markdown to .codex
// for PM TP/FP triage.

import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const DATA = path.join(ROOT, "data", "facilities_data.json");
const OUT_JSON = path.join(ROOT, ".codex", "metadata_pollution_audit.json");
const OUT_MD = path.join(ROOT, ".codex", "metadata_pollution_audit_summary.md");

// Owner-specified judgment-memo / generation-artifact tokens (2026-07-05).
// Kept as literal substrings; each carries a short label for the report.
const MEMO_TOKENS = [
  "都内ではなく",
  "該当なし",
  "代替",
  "注:",
  "注：",
  "予定",
  "候補",
  "差し替え",
  "元は",
  "ではないため",
  "代わり",
  "要確認",
  "未確認",
  // existing prod tokens folded in for parity
  "→",
  "参考",
  "除外",
  "TODO",
  "(削除",
  "（削除",
];

// Structural: a bracket (full/half width) whose inner text contains a
// judgment-memo cue — e.g. "施設名(都内ではなく注: 該当なし)".
const BRACKET_MEMO_CUES = [
  "なし",
  "該当",
  "代替",
  "予定",
  "候補",
  "要確認",
  "未確認",
  "注",
  "ではない",
  "代わり",
  "元は",
  "？",
  "?",
  "確認",
];
const BRACKET_RE = /[(（]([^)）]*)[)）]/g;

// address should look like an address, not a facility name or a sentence.
// A judgment-memo address typically has a colon and prose, and lacks any
// street-number / chome token.
const ADDRESS_NUMERIC = /[0-9０-９]|丁目|番地|番|号/;
const ADDRESS_MEMO_CUES = [
  "ではないため",
  "代替",
  "該当なし",
  "候補",
  "予定",
  "差し替え",
  "要確認",
  "未確認",
  "注:",
  "注：",
  "元は",
  "代わり",
];

function findTokens(text) {
  if (typeof text !== "string" || !text) return [];
  return MEMO_TOKENS.filter((t) => text.includes(t));
}

function findBracketMemo(text) {
  if (typeof text !== "string" || !text) return [];
  const hits = [];
  let m;
  BRACKET_RE.lastIndex = 0;
  while ((m = BRACKET_RE.exec(text)) !== null) {
    const inner = m[1] ?? "";
    const cue = BRACKET_MEMO_CUES.find((c) => inner.includes(c));
    if (cue) hits.push({ inner: inner.trim(), cue });
  }
  return hits;
}

function addressLooksLikeMemo(address) {
  if (typeof address !== "string" || !address) return null;
  const cue = ADDRESS_MEMO_CUES.find((c) => address.includes(c));
  if (cue) return { cue, hasNumeric: ADDRESS_NUMERIC.test(address) };
  // colon + prose but no street number is a soft signal
  if ((address.includes(":") || address.includes("：")) && !ADDRESS_NUMERIC.test(address)) {
    return { cue: "colon+no-number", hasNumeric: false };
  }
  return null;
}

function severityFor(signals) {
  // name pollution is user-visible title -> high; address -> high;
  // description/url -> medium.
  const fields = new Set(signals.map((s) => s.field));
  if (fields.has("name") || fields.has("address")) return "high";
  return "medium";
}

const raw = JSON.parse(await readFile(DATA, "utf8"));
const facilities = Array.isArray(raw) ? raw : raw.facilities;

const findings = [];

for (const f of facilities) {
  const signals = [];

  // name: token + bracket-memo
  for (const t of findTokens(f.name)) {
    signals.push({ field: "name", kind: "token", token: t });
  }
  for (const b of findBracketMemo(f.name)) {
    signals.push({ field: "name", kind: "bracket_memo", cue: b.cue, inner: b.inner });
  }

  // address: token + memo-shape
  for (const t of findTokens(f.address)) {
    signals.push({ field: "address", kind: "token", token: t });
  }
  const addrMemo = addressLooksLikeMemo(f.address);
  if (addrMemo) {
    signals.push({
      field: "address",
      kind: "address_memo_shape",
      cue: addrMemo.cue,
      has_street_number: addrMemo.hasNumeric,
    });
  }

  // secondary: description / url token scan (report but lower severity)
  for (const t of findTokens(f.description)) {
    signals.push({ field: "description", kind: "token", token: t });
  }
  for (const t of findTokens(f.url)) {
    signals.push({ field: "url", kind: "token", token: t });
  }

  if (signals.length === 0) continue;

  findings.push({
    id: f.id,
    slug: f.slug,
    name: f.name,
    prefecture: f.prefecture,
    address: f.address ?? null,
    url: f.url ?? null,
    description: f.description ?? null,
    severity: severityFor(signals),
    signal_fields: [...new Set(signals.map((s) => s.field))],
    signals,
    // PM fills these during triage
    triage: "pending", // pending | true_positive | false_positive
    triage_note: null,
  });
}

// severity then id ordering
const sevRank = { high: 0, medium: 1, low: 2 };
findings.sort((a, b) => (sevRank[a.severity] - sevRank[b.severity]) || (a.id - b.id));

const byField = {};
const byToken = {};
for (const fnd of findings) {
  for (const s of fnd.signals) {
    byField[s.field] = (byField[s.field] ?? 0) + 1;
    const key = s.token ?? s.cue ?? s.kind;
    byToken[key] = (byToken[key] ?? 0) + 1;
  }
}

const report = {
  generated_note: "AUDIT-ONLY metadata pollution scan (id345-type). No data mutated.",
  source: "data/facilities_data.json",
  total_facilities: facilities.length,
  total_findings: findings.length,
  high: findings.filter((f) => f.severity === "high").length,
  medium: findings.filter((f) => f.severity === "medium").length,
  tokens: MEMO_TOKENS,
  signals_by_field: byField,
  signals_by_token: byToken,
  findings,
};

await writeFile(OUT_JSON, JSON.stringify(report, null, 2) + "\n", "utf8");

// ---- summary markdown ----
function esc(s) {
  return String(s ?? "").replace(/\|/g, "\\|").replace(/\n/g, " ");
}
const lines = [];
lines.push("# メタデータ汚染 監査 (audit-only / id345型)");
lines.push("");
lines.push(`- source: \`data/facilities_data.json\` (${facilities.length}件)`);
lines.push(`- findings: **${findings.length}件** (high ${report.high} / medium ${report.medium})`);
lines.push("- data無変更・本番反映なし。PMがTP/FP分類→確定後に別トラックで修正判断。");
lines.push("");
lines.push("## シグナル内訳");
lines.push("");
lines.push("| フィールド | 件数 |");
lines.push("|---|---|");
for (const [k, v] of Object.entries(byField).sort((a, b) => b[1] - a[1])) {
  lines.push(`| ${k} | ${v} |`);
}
lines.push("");
lines.push("| トークン/種別 | 件数 |");
lines.push("|---|---|");
for (const [k, v] of Object.entries(byToken).sort((a, b) => b[1] - a[1])) {
  lines.push(`| ${esc(k)} | ${v} |`);
}
lines.push("");
lines.push("## 候補一覧 (severity→id順)");
lines.push("");
lines.push("| id | severity | 県 | name | 検出フィールド | 検出シグナル |");
lines.push("|---|---|---|---|---|---|");
for (const f of findings) {
  const sig = f.signals
    .map((s) => `${s.field}:${s.token ?? s.cue ?? s.kind}`)
    .join(" / ");
  lines.push(
    `| ${f.id} | ${f.severity} | ${esc(f.prefecture)} | ${esc(f.name)} | ${f.signal_fields.join(",")} | ${esc(sig)} |`,
  );
}
lines.push("");
await writeFile(OUT_MD, lines.join("\n"), "utf8");

console.log(`findings=${findings.length} high=${report.high} medium=${report.medium}`);
console.log(`byField=${JSON.stringify(byField)}`);
console.log(`wrote ${path.relative(ROOT, OUT_JSON)} + ${path.relative(ROOT, OUT_MD)}`);
