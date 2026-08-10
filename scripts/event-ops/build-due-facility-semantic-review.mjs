import { readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const MISSION_ID = "MEM-EVT-OPS-2026-W33-GROUP-B-DUE-FACILITY-REMEDIATION";
const RUN_ROOT = resolve(process.argv[2] || `.codex/runs/${MISSION_ID}`);
const AS_OF = "2026-08-10";
const AS_OF_NUMBER = 20260810;
const EVENT_TERMS = /イベント|催し|行事|祭|フェス|花火|体験|ワークショップ|講座|教室|展示|展覧|企画展|特別企画|公演|コンサート|上映|観察|見学会|説明会|ツアー|大会|フェア|マルシェ|セミナー|講演会|縁日|スタンプラリー|クイズラリー|サイエンス|探検|ショー|紙芝居|プレゼント|グリーティング|読み聞かせ|おはなし|作り|開催|予約|申込|募集|event|workshop|festival|calendar/iu;
const ACTIVE_TERMS = /開催中|開催予定|近日開催|夏休み|夏季|秋季|ハロウィン|受付中|募集中|申込受付|予約受付|期間限定/iu;

function extractDates(value) {
  const dates = new Map();
  const add = (year, month, day, raw) => {
    if (month < 1 || month > 12 || day < 1 || day > 31) return;
    const number = year * 10000 + month * 100 + day;
    const iso = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    dates.set(iso, { iso, number, raw });
  };
  for (const match of value.matchAll(/(?<year>20\d{2})\s*[年./-]\s*(?<month>\d{1,2})\s*[月./-]\s*(?<day>\d{1,2})\s*日?/gu)) {
    add(Number(match.groups.year), Number(match.groups.month), Number(match.groups.day), match[0]);
  }
  for (const match of value.matchAll(/令和\s*(?<era>\d{1,2})\s*年\s*(?<month>\d{1,2})\s*月\s*(?<day>\d{1,2})\s*日?/gu)) {
    add(2018 + Number(match.groups.era), Number(match.groups.month), Number(match.groups.day), match[0]);
  }
  for (const match of value.matchAll(/(?<![\d年./-])(?<month>\d{1,2})\s*月\s*(?<day>\d{1,2})\s*日/gu)) {
    add(2026, Number(match.groups.month), Number(match.groups.day), match[0]);
  }
  for (const match of value.matchAll(/(?<![\d年./-])(?<month>\d{1,2})\s*[/.]\s*(?<day>\d{1,2})(?!\d)/gu)) {
    add(2026, Number(match.groups.month), Number(match.groups.day), match[0]);
  }
  return [...dates.values()].sort((left, right) => left.number - right.number);
}

function normalizeTitle(value) {
  return value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/20\d{2}|令和\s*\d+/gu, "")
    .replace(/イベント|開催|お知らせ|期間限定|参加者募集|in|at/giu, "")
    .replace(/[\s\p{P}\p{S}]/gu, "");
}

function bigrams(value) {
  const set = new Set();
  for (let index = 0; index < value.length - 1; index += 1) set.add(value.slice(index, index + 2));
  return set;
}

function similarity(left, right) {
  const a = normalizeTitle(left);
  const b = normalizeTitle(right);
  if (!a || !b) return 0;
  if ((a.length >= 5 && b.includes(a)) || (b.length >= 5 && a.includes(b))) return 1;
  const aa = bigrams(a);
  const bb = bigrams(b);
  let intersection = 0;
  for (const token of aa) if (bb.has(token)) intersection += 1;
  const union = new Set([...aa, ...bb]).size;
  return union ? intersection / union : 0;
}

const retrieval = JSON.parse(readFileSync(join(RUN_ROOT, "retrieval-evidence.json"), "utf8"));
const linked = JSON.parse(readFileSync(join(RUN_ROOT, "linked-detail-evidence.json"), "utf8"));
const events = JSON.parse(readFileSync(resolve("data/events_data.json"), "utf8")).events;
const detailsByFacility = Object.groupBy(linked.details, (detail) => detail.facility_id);

const facilities = retrieval.facilities.map((row) => {
  const existing = events
    .filter((event) => event.facility_id === row.facility_id)
    .filter((event) => (event.end_date || event.start_date || "") >= AS_OF)
    .map((event) => ({ id: event.id, title: event.title, start_date: event.start_date, end_date: event.end_date, status: event.status, official_url: event.official_url }));
  if (!row.selected_source) {
    return {
      facility_id: row.facility_id,
      name: row.name,
      prefecture: row.prefecture,
      retrieval_terminal: row.retrieval_terminal,
      attempts: row.attempts,
      existing_current_or_future_events: existing,
      main_page: null,
      linked_candidates: [],
    };
  }
  const mainText = readFileSync(join(RUN_ROOT, "content-cache", `${row.facility_id}.txt`), "utf8");
  const mainLines = mainText.split(/\n+/gu).map((line) => line.replace(/\s+/gu, " ").trim()).filter(Boolean);
  const mainContexts = [];
  const mainSeen = new Set();
  for (let index = 0; index < mainLines.length; index += 1) {
    const context = mainLines.slice(Math.max(0, index - 1), Math.min(mainLines.length, index + 2)).join(" | ");
    const futureDates = extractDates(context).filter((date) => date.number >= AS_OF_NUMBER);
    const hasCurrentYear = /2026|令和\s*8/iu.test(context);
    const hasOnlyPastExplicitYear = /20(?:1\d|2[0-5])/u.test(context) && !hasCurrentYear;
    if (hasOnlyPastExplicitYear) continue;
    if (!(futureDates.length && EVENT_TERMS.test(context)) && !(EVENT_TERMS.test(context) && ACTIVE_TERMS.test(context))) continue;
    const compact = context.slice(0, 1400);
    if (mainSeen.has(compact)) continue;
    mainSeen.add(compact);
    mainContexts.push({ context: compact, future_dates: futureDates.map((date) => date.iso) });
    if (mainContexts.length >= 100) break;
  }
  const detailCandidates = [];
  for (const detail of detailsByFacility[row.facility_id] || []) {
    const selectedText = detail.selected
      ? readFileSync(join(RUN_ROOT, "linked-content-cache", detail.selected.cache_path), "utf8")
      : "";
    const evidenceText = `${detail.label}\n${detail.selected?.title || ""}\n${selectedText}`;
    const labelDates = extractDates(detail.label);
    const labelFutureDates = labelDates.filter((date) => date.number >= AS_OF_NUMBER);
    const labelHasCurrentYear = /2026|令和\s*8/iu.test(detail.label);
    const labelHasOnlyPastExplicitYear = /20(?:1\d|2[0-5])/u.test(detail.label) && !labelHasCurrentYear;
    const detailFront = `${detail.selected?.title || ""}\n${selectedText.slice(0, 6000)}`;
    const detailHasCurrentYear = /2026|令和\s*8/iu.test(detailFront);
    const detailHasOnlyPastExplicitYear = /20(?:1\d|2[0-5])/u.test(detailFront) && !detailHasCurrentYear;
    const futureDates = extractDates(evidenceText).filter((date) => date.number >= AS_OF_NUMBER);
    const currentSignal = (mainContexts.length > 0 || labelHasCurrentYear) && !labelHasOnlyPastExplicitYear && !detailHasOnlyPastExplicitYear && EVENT_TERMS.test(detail.label) && (
      labelFutureDates.length > 0 ||
      labelHasCurrentYear ||
      (EVENT_TERMS.test(evidenceText) && ACTIVE_TERMS.test(detail.label)) ||
      (labelDates.length === 0 && EVENT_TERMS.test(evidenceText) && ACTIVE_TERMS.test(`${detail.selected?.title || ""}\n${selectedText.slice(0, 5000)}`))
    );
    if (!currentSignal) continue;
    const matchScores = existing
      .map((event) => ({ id: event.id, title: event.title, score: similarity(`${detail.label} ${detail.selected?.title || ""}`, event.title) }))
      .filter((match) => match.score >= 0.35)
      .sort((left, right) => right.score - left.score);
    detailCandidates.push({
      label: detail.label,
      url: detail.url,
      selected_url: detail.selected?.final_url || null,
      retrieval_succeeded: Boolean(detail.selected),
      title: detail.selected?.title || null,
      future_dates: futureDates.map((date) => date.iso),
      active_terms_present: ACTIVE_TERMS.test(evidenceText),
      fact_presence: {
        date: futureDates.length > 0,
        time: /(?:午前|午後|\d{1,2}\s*[:：時]\s*\d{0,2})/u.test(selectedText),
        price: /無料|参加費|料金|入館料|入場料|\d[\d,]*\s*円/u.test(selectedText),
        reservation: /予約|申込|申し込|受付|先着|抽選|当日参加|自由参加|不要/u.test(selectedText),
        age_or_audience: /対象|\d+\s*歳|幼児|小学生|中学生|高校生|子ども|こども|親子|どなたでも|一般/u.test(selectedText),
        venue: /会場|場所|開催場所|館内|園内|ホール|広場|展示室|ラウンジ|当館/u.test(selectedText),
      },
      review_contexts: (detail.selected?.review_contexts || [])
        .filter((context) => extractDates(context).some((date) => date.number >= AS_OF_NUMBER) || ACTIVE_TERMS.test(context))
        .slice(0, 12),
      suggested_existing_matches: matchScores,
      attempts: detail.attempts,
    });
  }
  return {
    facility_id: row.facility_id,
    name: row.name,
    prefecture: row.prefecture,
    retrieval_terminal: row.retrieval_terminal,
    selected_source: row.selected_source,
    existing_current_or_future_events: existing,
    main_page: {
      title: row.selected_source.title,
      headings: row.selected_source.headings,
      text_chars: row.selected_source.text_chars,
      text_sha256: row.selected_source.text_sha256,
      current_future_contexts: mainContexts,
      current_future_context_count: mainContexts.length,
    },
    linked_candidates: detailCandidates,
  };
});

const output = {
  mission_id: MISSION_ID,
  as_of_date: AS_OF,
  facility_count: facilities.length,
  source_unresolved_count: facilities.filter((row) => !row.main_page).length,
  retrieved_no_current_signal_count: facilities.filter((row) => row.main_page && row.main_page.current_future_context_count === 0 && row.linked_candidates.length === 0).length,
  retrieved_current_signal_count: facilities.filter((row) => row.main_page && (row.main_page.current_future_context_count > 0 || row.linked_candidates.length > 0)).length,
  facilities,
};
writeFileSync(join(RUN_ROOT, "semantic-review.json"), `${JSON.stringify(output, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ facility_count: output.facility_count, source_unresolved_count: output.source_unresolved_count, retrieved_no_current_signal_count: output.retrieved_no_current_signal_count, retrieved_current_signal_count: output.retrieved_current_signal_count, linked_candidate_count: facilities.reduce((total, row) => total + row.linked_candidates.length, 0) }, null, 2));
