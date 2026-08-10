import { readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const AS_OF = "2026-08-10";
const AS_OF_NUMBER = 20260810;
const MISSION_ID = "MEM-EVT-OPS-2026-W33-GROUP-B-DUE-FACILITY-REMEDIATION";
const RUN_ROOT = resolve(
  process.argv[2] ||
    `.codex/runs/${MISSION_ID}`,
);
const retrieval = JSON.parse(readFileSync(join(RUN_ROOT, "retrieval-evidence.json"), "utf8"));
const events = JSON.parse(readFileSync(resolve("data/events_data.json"), "utf8")).events;

const EVENT_TERMS = /イベント|催し|行事|祭|フェス|花火|体験|ワークショップ|講座|教室|展示|展覧|企画展|特別企画|公演|コンサート|上映|観察|見学会|説明会|ツアー|大会|フェア|マルシェ|セミナー|講演会|縁日|スタンプラリー|クイズラリー|サイエンス|探検|ショー|紙芝居|プレゼント|グリーティング|読み聞かせ|おはなし|作り|開催|予約|申込|募集|event|workshop|festival|calendar/iu;
const UNDATED_ACTIVE_TERMS = /開催中|開催予定|近日開催|毎週|毎月|期間限定|受付中|募集中|申込受付|予約受付|スケジュール/iu;

function comparableDate(year, month, day) {
  return year * 10000 + month * 100 + day;
}

function datesInText(value) {
  const dates = [];
  const seen = new Set();
  const patterns = [
    /(?<year>20\d{2})\s*[年./-]\s*(?<month>\d{1,2})\s*[月./-]\s*(?<day>\d{1,2})\s*日?/gu,
    /令和\s*(?<era>\d{1,2})\s*年\s*(?<month>\d{1,2})\s*月\s*(?<day>\d{1,2})\s*日?/gu,
    /(?<![\d年./-])(?<month>\d{1,2})\s*月\s*(?<day>\d{1,2})\s*日/gu,
    /(?<![\d年./-])(?<month>\d{1,2})\s*[/.]\s*(?<day>\d{1,2})(?!\d)/gu,
  ];
  for (const pattern of patterns) {
    for (const match of value.matchAll(pattern)) {
      const year = match.groups.year ? Number(match.groups.year) : match.groups.era ? 2018 + Number(match.groups.era) : 2026;
      const month = Number(match.groups.month);
      const day = Number(match.groups.day);
      if (month < 1 || month > 12 || day < 1 || day > 31) continue;
      const key = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      if (!seen.has(key)) {
        dates.push({ iso: key, number: comparableDate(year, month, day) });
        seen.add(key);
      }
    }
  }
  return dates;
}

function contextRows(text) {
  const lines = text
    .split(/\n+/gu)
    .map((line) => line.replace(/\s+/gu, " ").trim())
    .filter(Boolean);
  const result = [];
  const seen = new Set();
  for (let index = 0; index < lines.length; index += 1) {
    const lineDates = datesInText(lines[index]);
    const futureDates = lineDates.filter((date) => date.number >= AS_OF_NUMBER);
    const neighboring = lines.slice(Math.max(0, index - 1), Math.min(lines.length, index + 2)).join(" | ");
    const neighborDates = datesInText(neighboring).filter((date) => date.number >= AS_OF_NUMBER);
    const isFutureDated = futureDates.length > 0;
    const isEventAdjacentToFuture = EVENT_TERMS.test(lines[index]) && neighborDates.length > 0;
    const isUndatedActive = EVENT_TERMS.test(lines[index]) && UNDATED_ACTIVE_TERMS.test(neighboring);
    if (!isFutureDated && !isEventAdjacentToFuture && !isUndatedActive) continue;
    const context = neighboring.slice(0, 1200);
    if (seen.has(context)) continue;
    seen.add(context);
    result.push({
      context,
      future_dates: neighborDates.map((date) => date.iso),
      event_terms_present: EVENT_TERMS.test(context),
      undated_active_terms_present: UNDATED_ACTIVE_TERMS.test(context),
    });
    if (result.length >= 100) break;
  }
  return result;
}

function activeExistingEvents(facilityId) {
  return events
    .filter((event) => event.facility_id === facilityId)
    .filter((event) => {
      const lastDate = event.end_date || event.start_date;
      return lastDate && lastDate >= AS_OF;
    })
    .map((event) => ({
      id: event.id,
      title: event.title,
      start_date: event.start_date,
      end_date: event.end_date,
      occurrence_dates: event.occurrence_dates,
      status: event.status,
      official_url: event.official_url,
    }));
}

const packets = retrieval.facilities.map((row) => {
  if (!row.selected_source) {
    return {
      facility_id: row.facility_id,
      name: row.name,
      prefecture: row.prefecture,
      retrieval_terminal: row.retrieval_terminal,
      official_event_url: row.official_event_url,
      official_event_url_secondary: row.official_event_url_secondary,
      attempts: row.attempts,
      existing_current_or_future_events: activeExistingEvents(row.facility_id),
      content_review: null,
    };
  }
  const textPath = join(RUN_ROOT, "content-cache", `${row.facility_id}.txt`);
  const text = readFileSync(textPath, "utf8");
  const futureContexts = contextRows(text);
  return {
    facility_id: row.facility_id,
    name: row.name,
    prefecture: row.prefecture,
    retrieval_terminal: row.retrieval_terminal,
    official_event_url: row.official_event_url,
    official_event_url_secondary: row.official_event_url_secondary,
    selected_source: row.selected_source,
    existing_current_or_future_events: activeExistingEvents(row.facility_id),
    content_review: {
      title: row.selected_source.title,
      headings: row.selected_source.headings,
      text_chars: row.selected_source.text_chars,
      text_sha256: row.selected_source.text_sha256,
      future_or_active_contexts: futureContexts,
      context_count: futureContexts.length,
      opening_text: text.slice(0, 1200),
      closing_text: text.slice(-800),
    },
  };
});

const summary = {
  mission_id: MISSION_ID,
  as_of_date: AS_OF,
  packet_count: packets.length,
  unresolved_count: packets.filter((row) => !row.content_review).length,
  retrieved_with_future_or_active_context: packets.filter((row) => row.content_review?.context_count > 0).length,
  retrieved_without_future_or_active_context: packets.filter((row) => row.content_review?.context_count === 0).length,
  packets,
};
writeFileSync(join(RUN_ROOT, "review-packets.json"), `${JSON.stringify(summary, null, 2)}\n`, "utf8");
console.log(
  JSON.stringify(
    {
      packet_count: summary.packet_count,
      unresolved_count: summary.unresolved_count,
      retrieved_with_future_or_active_context: summary.retrieved_with_future_or_active_context,
      retrieved_without_future_or_active_context: summary.retrieved_without_future_or_active_context,
    },
    null,
    2,
  ),
);
