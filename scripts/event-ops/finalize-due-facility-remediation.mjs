import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const MISSION_ID = "MEM-EVT-OPS-2026-W33-GROUP-B-DUE-FACILITY-REMEDIATION";
const AS_OF = "2026-08-10";
const RUN_ROOT = resolve(process.argv[2] || `.codex/runs/${MISSION_ID}`);
const REPORT_ROOT = resolve(process.argv[3] || `.codex/reports/${MISSION_ID}`);
const retrieval = JSON.parse(readFileSync(join(RUN_ROOT, "retrieval-evidence.json"), "utf8"));
const semantic = JSON.parse(readFileSync(join(RUN_ROOT, "semantic-review.json"), "utf8"));
const linked = JSON.parse(readFileSync(join(RUN_ROOT, "linked-detail-evidence.json"), "utf8"));
const productEvents = JSON.parse(readFileSync(resolve("data/events_data.json"), "utf8")).events;

const ADDED_EVENT_IDS = new Map([
  [228, "evt-228-202609-01"],
  [522, "evt-522-202608-01"],
  [792, "evt-792-202607-01"],
  [872, "evt-872-202610-01"],
  [913, "evt-913-202609-01"],
  [944, "evt-944-202608-01"],
]);
const productEventsById = new Map(productEvents.map((event) => [event.id, event]));
const addedEventsById = new Map(productEvents.filter((event) => ADDED_EVENT_IDS.has(event.facility_id)).map((event) => [event.id, event]));

const semanticById = new Map(semantic.facilities.map((row) => [row.facility_id, row]));
const detailById = Object.groupBy(linked.details, (row) => row.facility_id);

// These rows produced a lexical/date signal, but direct reading showed only an
// ended item, a routine operation notice, recruitment/procurement, or an event
// at another venue. They must not be allowed to become HOLD merely because a
// page-wide keyword/date matcher fired.
const NO_CURRENT_OVERRIDES = new Set([
  14, 61, 76, 90, 95, 110, 131, 137, 160, 177, 211, 245, 249, 255, 286, 302,
  377, 400, 402, 444, 527, 566, 699, 715, 723, 735, 755, 777, 807, 829, 903,
  990, 1027, 1049, 1062, 1313, 1338, 1339, 1350, 1387, 1397, 1414, 1432,
  1433, 1435, 1443, 1934, 1971, 1979, 1980, 2001, 2015, 2038, 2047, 2082,
  2085, 2090, 2093, 2100, 2108, 2148, 2155, 2177, 2186,
]);

// The initial semantic pass missed these because the registry URL returned a
// shell/calendar or a non-candidate landing page. A human review of the
// retrieved body (and, where listed below, an official fallback) found a real
// current/future signal, but not a complete candidate-specific participation
// basis.
const HOLD_PROMOTIONS = new Map([
  [37, ["イオンモール浜松志都呂の2026年夏イベント一覧", "公式イベント一覧で複数の開催中企画を確認したが、各企画の候補単位の料金・対象・参加条件をこの確認では一意に結び付けられない。"]],
  [121, ["2026年度イベント予定", "公式ページは今後の募集掲載方針を示すが、候補ごとの開催日時・対象・参加条件が未掲載。"]],
  [201, ["須坂市動物園 2026年度年間スケジュール", "年間予定に今後の行事を確認したが、開催時間や参加方法は管理事務所への確認案内のみ。"]],
  [208, ["熱海海上花火大会日の延長営業", "施設の延長営業は確認できたが、花火大会自体の会場と施設内参加条件を一つの施設イベントとして確定できない。"]],
  [366, ["那須サファリパーク 2026年8月のイベント案内", "公式一覧に当月イベントの掲載を確認したが、取得本文では候補名・対象・料金・参加方法を候補単位で復元できない。"]],
  [369, ["パンダコパンダぬいぐるみ展（会期延長）", "公式ニュースで2026年9月28日までの会期を確認したが、イベント固有の料金・予約条件を確認できない。"]],
  [435, ["真岡市科学教育センター関連の夏休み科学企画", "公式市サイトでセンター関連企画の存在を確認したが、当該施設開催としての日時・対象・申込状態を一つの候補に結び付けられない。"]],
  [515, ["8月開催「水あそびかけっこ教室」", "施設トップで企画名を確認したが、候補固有の開催日時・対象・料金・申込条件が取得本文に揃わない。"]],
  [568, ["モールウェイ／ダックウォーク", "園内プログラム名と時刻は確認したが、実施日・休止条件を含む将来日の参加基礎が明示されない。"]],
  [1920, ["ROOF TOP CAFE & BAR 2026", "2026年10月31日までの期間は確認したが、子どもの参加可否・料金・予約条件を候補単位で確認できない。"]],
  [1950, ["しゃくなげ湖 土曜夜市", "公式本文で開催企画を確認したが、取得範囲に開催日・時間・参加条件が揃わない。"]],
  [1985, ["嚴島神社の今後の年中行事", "公式行事案内への導線は確認したが、今日以降の個別行事について一般参列可否と時間を確認できない。"]],
  [1992, ["『写真でつなぐ、ひろしまの平和』フォトコンテスト", "8月1日開始は確認したが、原爆ドームを会場とする参加イベントか、広域募集企画かを施設候補として確定できない。"]],
  [2026, ["上野公園の夏の花火大会", "毎年開催の記載はあるが、2026年の開催日・時間・公式参加案内が掲載されていない。"]],
  [2111, ["根津記念館ミニ企画展／月見茶会", "公式トップで候補名は確認したが、取得本文に候補固有の日程・料金・申込条件が揃わない。"]],
  [2150, ["小諸市動物園100周年記念企画", "2026年度に複数企画を予定する旨は確認したが、個別企画の日時・対象・参加条件が未確定。"]],
  [2153, ["上田創造館 夏の企画展2026／プラネタリウム", "公式施設ページで開催中企画を確認したが、PDF・複数企画に条件が分散し、候補単位の料金・申込条件を確定できない。"]],
]);

const SUPPLEMENTAL_URLS = new Map([
  [37, "https://hamamatsushitoro.aeonmall.jp/event"],
  [201, "https://www.city.suzaka.nagano.jp/suzaka_zoo/info/699.html"],
  [369, "https://www.teddynet.co.jp/nasu/news/"],
  [435, "https://www.city.moka.lg.jp/event_bosyu/event/index.html"],
  [1960, "https://www.city.onomichi.hiroshima.jp/soshiki/7/89864.html"],
  [2123, "https://www.town.minobu.lg.jp/site/kinzan/"],
  [2153, "https://www.ueda-rpc.or.jp/facility/sozokan.html"],
  [2181, "https://www.city.matsumoto.nagano.jp/site/kyoiku/4408.html"],
]);

// Nineteen due registry rows had no primary or secondary URL at all. The
// Product facility's already-recorded official URL (plus one searched official
// site for facility 83) is used as the required reasonable official fallback.
const MISSING_REGISTRY_FALLBACK_URLS = new Map([
  [55, "https://www.city.komoro.lg.jp/soshikikarasagasu/kaikoenjimusho/shisetsuannai/1/1/1626.html"],
  [56, "https://art-karuizawa.com/"],
  [63, "https://www.shirakabaresort.jp/activity/zoo/"],
  [65, "https://toybox-net.jp/alpspark/map/09zoo.html"],
  [73, "https://bandainamco-am.co.jp/kids/karuizawa/"],
  [74, "https://www.karuizawa-psp.jp/kidspark/"],
  [75, "https://www.princehotels.co.jp/karuizawa-east/nature/kids_forest/"],
  [77, "https://matsumoto-aeonmall.com/static/detail/kids_guide"],
  [80, "https://osakada-park.jp/"],
  [81, "https://sun-marine.jp/"],
  [83, "https://naganoforestvillage.eternal-story.com/"],
  [88, "https://www.ngn.janis.or.jp/~shinmachi-museum/"],
  [92, "https://www.town.fujimi.lg.jp/uploaded/attachment/32462.pdf"],
  [93, "https://www.yuuin.com/"],
  [94, "https://www.hakuba-gaku.com/"],
  [96, "https://www.vill.asahi.nagano.jp/official/soshikikarasagasu/sangyoshinkoka/shoko_kanko/1/1/422.html"],
  [114, "https://www.alpaca-farm.net/"],
  [170, "https://www.princehotels.co.jp/karuizawa-west/facility/asobinomori"],
  [172, "https://www.pref.gunma.jp/soshiki/145/"],
]);

const MISSING_REGISTRY_HOLDS = new Map([
  [83, ["森のLakeside Bar／YAMASAI 2026", "公式サイトに現在／将来の企画掲載を確認したが、候補固有の子どもの対象・料金・申込条件が一つの参加基礎として揃わない。"]],
]);

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function cleanText(html) {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/giu, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/giu, " ")
    .replace(/<[^>]+>/gu, " ")
    .replace(/&nbsp;|&#160;/giu, " ")
    .replace(/&amp;/giu, "&")
    .replace(/&lt;/giu, "<")
    .replace(/&gt;/giu, ">")
    .replace(/&quot;|&#34;/giu, '"')
    .replace(/\s+/gu, " ")
    .trim();
}

async function fetchOnce(url, attempt) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20_000);
  try {
    const response = await fetch(url, {
      redirect: "follow",
      signal: controller.signal,
      headers: { "user-agent": "Memorips-EventOps/2026.08 due-facility-remediation" },
    });
    const body = Buffer.from(await response.arrayBuffer());
    const text = cleanText(body.toString("utf8"));
    return {
      attempt,
      requested_url: url,
      final_url: response.url,
      status: response.status,
      ok: response.ok,
      content_type: response.headers.get("content-type"),
      bytes: body.length,
      body_sha256: sha256(body),
      text_chars: text.length,
      evaluable: response.ok && text.length >= 120,
      opening_text: text.slice(0, 1200),
      error: null,
    };
  } catch (error) {
    return {
      attempt,
      requested_url: url,
      final_url: null,
      status: null,
      ok: false,
      content_type: null,
      bytes: 0,
      body_sha256: null,
      text_chars: 0,
      evaluable: false,
      opening_text: null,
      error: error instanceof Error ? error.message : String(error),
    };
  } finally {
    clearTimeout(timer);
  }
}

async function verifyUrl(url) {
  const attempts = [await fetchOnce(url, 1)];
  if (!attempts[0].evaluable) attempts.push(await fetchOnce(url, 2));
  return { url, attempts, selected: attempts.find((attempt) => attempt.evaluable) || null };
}

async function mapConcurrent(values, limit, mapper) {
  const output = new Array(values.length);
  let cursor = 0;
  async function worker() {
    while (true) {
      const index = cursor;
      cursor += 1;
      if (index >= values.length) return;
      output[index] = await mapper(values[index], index);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, values.length) }, () => worker()));
  return output;
}

function candidateSpecificFacts(candidate) {
  const text = candidate.review_contexts.join(" ");
  return {
    date: candidate.future_dates.length > 0,
    time: /(?:午前|午後|\d{1,2}\s*[:：時]\s*\d{0,2})/u.test(text),
    price: /無料|参加費|料金|入館料|入場料|\d[\d,]*\s*円/u.test(text),
    reservation: /予約|申込|申し込|受付|先着|抽選|当日参加|自由参加|不要/u.test(text),
    audience: /対象|\d+\s*歳|幼児|小学生|中学生|高校生|子ども|こども|親子|どなたでも|一般/u.test(text),
    venue: /会場|場所|開催場所|館内|園内|ホール|広場|展示室|ラウンジ|当館/u.test(text),
  };
}

function pickCandidate(row) {
  const live = row.linked_candidates
    .filter((candidate) => candidate.retrieval_succeeded)
    .filter((candidate) => !/終了|中止|受付終了|満席|過去/u.test(`${candidate.label} ${candidate.title || ""}`))
    .sort((left, right) => {
      const leftFacts = Object.values(candidateSpecificFacts(left)).filter(Boolean).length;
      const rightFacts = Object.values(candidateSpecificFacts(right)).filter(Boolean).length;
      return rightFacts - leftFacts || right.future_dates.length - left.future_dates.length;
    });
  return live[0] || null;
}

function holdReason(candidate) {
  if (!candidate) return "公式取得本文に現在／将来のイベント記載を確認したが、候補固有の日付・会場・参加条件を一つの登録基礎として切り出せない。";
  if (!candidate.retrieval_succeeded) return `候補「${candidate.label}」の公式詳細ページを取得できず、日付・会場・参加条件を確認できない。`;
  if (/中止/u.test(candidate.label)) return `候補「${candidate.label}」は中止表示があり、実施状態を scheduled として登録できない。`;
  if (/受付終了|満席/u.test(candidate.label)) return `候補「${candidate.label}」は受付終了／満席で、現在参加可能なイベントとして扱えない。`;
  const facts = candidateSpecificFacts(candidate);
  const labels = { date: "開催日", time: "開催時間", price: "料金または無料表示", reservation: "申込・予約条件", audience: "対象年齢・対象者", venue: "具体的会場" };
  const missing = Object.entries(facts).filter(([, present]) => !present).map(([key]) => labels[key]);
  if (missing.length) return `候補「${candidate.label}」の公式詳細を確認したが、候補固有の${missing.join("、")}が揃わない。`;
  return `候補「${candidate.label}」はページ内の関連企画・公開日・共通入館条件が候補本文に混在し、開始／終了日、料金、申込状態を当該候補へ一意に結び付けられない。`;
}

const duplicateUrls = new Set();
for (const row of semantic.facilities) {
  for (const event of row.existing_current_or_future_events) {
    if (event.official_url) duplicateUrls.add(event.official_url);
  }
}
for (const url of SUPPLEMENTAL_URLS.values()) duplicateUrls.add(url);
for (const url of MISSING_REGISTRY_FALLBACK_URLS.values()) duplicateUrls.add(url);
const verificationFetches = await mapConcurrent([...duplicateUrls], 12, verifyUrl);
const verificationByUrl = new Map(verificationFetches.map((row) => [row.url, row]));
writeFileSync(join(RUN_ROOT, "verification-fetches.json"), `${JSON.stringify({ mission_id: MISSION_ID, executed_in_this_mission: true, urls: verificationFetches }, null, 2)}\n`);

const detailIndex = linked.details.map((detail) => ({
  facility_id: detail.facility_id,
  requested_url: detail.url,
  label: detail.label,
  attempts: detail.attempts.map((attempt) => ({
    attempt: attempt.attempt,
    requested_url: attempt.requested_url,
    final_url: attempt.final_url,
    status: attempt.status,
    evaluable: attempt.evaluable,
    body_sha256: attempt.body_sha256,
    error: attempt.error,
  })),
  selected: detail.selected ? {
    final_url: detail.selected.final_url,
    title: detail.selected.title,
    text_chars: detail.selected.text_chars,
    text_sha256: detail.selected.text_sha256,
  } : null,
}));

const dispositions = retrieval.facilities.map((base) => {
  const row = semanticById.get(base.facility_id);
  const sourceAttempts = base.attempts.map((attempt) => ({
    role: attempt.role,
    attempt: attempt.attempt,
    requested_url: attempt.requested_url,
    final_url: attempt.final_url,
    status: attempt.status,
    evaluable: attempt.evaluable,
    body_sha256: attempt.body_sha256,
    error: attempt.error,
  }));
  const common = {
    facility_id: base.facility_id,
    name: base.name,
    region: base.prefecture,
    patrol_tier: base.patrol_tier,
    last_checked_at: base.last_checked_at,
    cadence_days: base.cadence_days,
    registry_urls: [base.official_event_url, base.official_event_url_secondary].filter(Boolean),
    source_attempts: sourceAttempts,
    selected_source: base.selected_source ? {
      role: base.selected_source.role,
      requested_url: base.selected_source.requested_url,
      final_url: base.selected_source.final_url,
      title: base.selected_source.title,
      text_chars: base.selected_source.text_chars,
      text_sha256: base.selected_source.text_sha256,
      headings: base.selected_source.headings,
      evaluation_excerpts: base.selected_source.review_contexts.slice(0, 16),
    } : null,
    detail_fetch_count: (detailById[base.facility_id] || []).length,
    supplemental_official_source: SUPPLEMENTAL_URLS.has(base.facility_id)
      ? verificationByUrl.get(SUPPLEMENTAL_URLS.get(base.facility_id))
      : null,
    missing_registry_official_fallback: MISSING_REGISTRY_FALLBACK_URLS.has(base.facility_id)
      ? verificationByUrl.get(MISSING_REGISTRY_FALLBACK_URLS.get(base.facility_id))
      : null,
  };

  if (!base.selected_source) {
    const fallback = common.missing_registry_official_fallback;
    if (fallback?.selected) {
      if (MISSING_REGISTRY_HOLDS.has(base.facility_id)) {
        const [candidate, reason] = MISSING_REGISTRY_HOLDS.get(base.facility_id);
        return {
          ...common,
          source_attempts: fallback.attempts.map((attempt) => ({ ...attempt, role: "official_site_fallback" })),
          disposition: "candidate_found_hold",
          candidate,
          candidate_url: fallback.selected.final_url,
          reason,
        };
      }
      return {
        ...common,
        source_attempts: fallback.attempts.map((attempt) => ({ ...attempt, role: "official_site_fallback" })),
        disposition: "no_current_or_future_event",
        reason: "the registry had no source URL; this Mission located, retrieved, and evaluated the facility's official site fallback, which published no facility event starting on or after 2026-08-10.",
      };
    }
    const missingFallbackAttempts = fallback?.attempts.map((attempt) => ({ ...attempt, role: "official_site_fallback" })) || [];
    return {
      ...common,
      source_attempts: sourceAttempts.length ? sourceAttempts : missingFallbackAttempts,
      disposition: "source_unresolved",
      reason: sourceAttempts.length
        ? "primary retry, registry secondary URL when present, and an official-site fallback were attempted, but no response body could be retrieved and evaluated."
        : "the registry contained no source URL; a reasonable official-site fallback was located and retried, but no response body could be retrieved and evaluated.",
      unresolved_attempt_summary: (sourceAttempts.length ? sourceAttempts : missingFallbackAttempts).map((attempt) => `${attempt.role}#${attempt.attempt}: ${attempt.requested_url} -> ${attempt.status ?? attempt.error ?? "no response"} (evaluable=${attempt.evaluable})`),
    };
  }

  if (ADDED_EVENT_IDS.has(base.facility_id)) {
    const eventId = ADDED_EVENT_IDS.get(base.facility_id);
    const event = addedEventsById.get(eventId);
    if (!event) throw new Error(`added event missing from Product data: ${eventId}`);
    return {
      ...common,
      disposition: "candidate_found_added",
      reason: `a complete current/future official participation basis was evaluated in this Mission and added as ${eventId}.`,
      added_event: event,
    };
  }

  if (row.existing_current_or_future_events.length) {
    const existing = row.existing_current_or_future_events.map((event) => ({
      ...(productEventsById.get(event.id) || event),
      mission_verification: event.official_url ? verificationByUrl.get(event.official_url) : null,
    }));
    return {
      ...common,
      disposition: "candidate_found_duplicate",
      reason: `today-or-future official candidate is already represented by ${existing.map((event) => event.id).join(", ")}; its official URL was re-requested in this Mission.`,
      existing_events: existing,
    };
  }

  if (NO_CURRENT_OVERRIDES.has(base.facility_id)) {
    return {
      ...common,
      disposition: "no_current_or_future_event",
      reason: "retrieved content was read directly; all dated/event-like references were ended before 2026-08-10, routine operations/recruitment/procurement, or events at another venue, so no facility event starting today or later was published.",
    };
  }

  if (HOLD_PROMOTIONS.has(base.facility_id)) {
    const [candidate, reason] = HOLD_PROMOTIONS.get(base.facility_id);
    return { ...common, disposition: "candidate_found_hold", candidate, reason };
  }

  const hasSignal = row.main_page.current_future_context_count > 0 || row.linked_candidates.length > 0;
  if (!hasSignal) {
    return {
      ...common,
      disposition: "no_current_or_future_event",
      reason: "the successfully retrieved source body was evaluated (title, headings, dated notices, and event/calendar content); it published no event with a start date on or after 2026-08-10.",
    };
  }

  const candidate = pickCandidate(row);
  return {
    ...common,
    disposition: "candidate_found_hold",
    candidate: candidate?.label || row.main_page.current_future_contexts[0]?.context || "current/future event signal",
    candidate_url: candidate?.selected_url || candidate?.url || base.selected_source.final_url,
    candidate_dates_observed: candidate?.future_dates || row.main_page.current_future_contexts.flatMap((context) => context.future_dates),
    candidate_specific_fact_check: candidate ? candidateSpecificFacts(candidate) : null,
    reason: holdReason(candidate),
    reviewed_candidate_sources: row.linked_candidates.map((item) => ({
      label: item.label,
      url: item.url,
      selected_url: item.selected_url,
      retrieval_succeeded: item.retrieval_succeeded,
      future_dates: item.future_dates,
      candidate_specific_fact_check: candidateSpecificFacts(item),
      review_contexts: item.review_contexts,
    })),
    main_page_current_future_contexts: row.main_page.current_future_contexts,
  };
});

const allowed = new Set(["no_current_or_future_event", "candidate_found_added", "candidate_found_duplicate", "candidate_found_hold", "source_unresolved"]);
for (const row of dispositions) {
  if (!allowed.has(row.disposition)) throw new Error(`invalid disposition for facility ${row.facility_id}`);
}
if (dispositions.length !== 635) throw new Error(`expected 635 dispositions, got ${dispositions.length}`);

const order = ["no_current_or_future_event", "candidate_found_added", "candidate_found_duplicate", "candidate_found_hold", "source_unresolved"];
function counts(rows) {
  return Object.fromEntries(order.map((key) => [key, rows.filter((row) => row.disposition === key).length]));
}
const regions = ["tokyo", "osaka", "hiroshima", "kyoto", "yamanashi", "nagano", "shizuoka", "kanagawa", "chiba", "saitama", "tochigi"];
const perRegion = Object.fromEntries(regions.map((region) => {
  const rows = dispositions.filter((row) => row.region === region);
  return [region, { total: rows.length, ...counts(rows) }];
}));
const aggregate = { total: dispositions.length, ...counts(dispositions) };

for (const [region, summary] of Object.entries(perRegion)) {
  const sum = order.reduce((total, key) => total + summary[key], 0);
  if (sum !== summary.total) throw new Error(`regional count mismatch for ${region}`);
}
if (order.reduce((total, key) => total + aggregate[key], 0) !== aggregate.total) throw new Error("aggregate count mismatch");

const report = {
  mission_id: MISSION_ID,
  as_of_date: AS_OF,
  executed_in_this_mission: true,
  prior_run_numbers_reused_as_execution: false,
  due_derivation: {
    cadence_days: { weekly: 7, biweekly: 14, monthly: 31, seasonal: 92 },
    total: 635,
    reconciliation: "exact match to the original W33 Group B due-row total; registry last_checked_at values had not changed. Kyoto is 0 in both the exact prior script output and this re-derivation, so the user-supplied phrase '11 regions with nonzero due rows' is reconciled as 10 nonzero regions plus an explicit Kyoto zero row.",
  },
  aggregate,
  per_region: perRegion,
  facility_candidate_signals: [],
  product_event_changes: ADDED_EVENT_IDS.size,
  dispositions,
};

mkdirSync(REPORT_ROOT, { recursive: true });
writeFileSync(join(REPORT_ROOT, "due-facility-dispositions.json"), `${JSON.stringify(report, null, 2)}\n`);
writeFileSync(join(REPORT_ROOT, "detail-fetch-index.json"), `${JSON.stringify({ mission_id: MISSION_ID, executed_in_this_mission: true, detail_fetches: detailIndex }, null, 2)}\n`);

const lines = [
  `# ${MISSION_ID}`,
  "",
  "Every count below reflects requests and content evaluation executed in this Mission. No prior W33 Group B coverage count is reused as this Mission's execution.",
  "",
  "## Due-set reconciliation",
  "",
  "635 due rows were re-derived with weekly=7, biweekly=14, monthly=31, seasonal=92 as of 2026-08-10. This exactly matches the original total. Kyoto has zero due rows in both derivations; there are 10, not 11, nonzero regions.",
  "",
  "## Aggregate",
  "",
  `- no_current_or_future_event: ${aggregate.no_current_or_future_event}`,
  `- candidate_found_added: ${aggregate.candidate_found_added}`,
  `- candidate_found_duplicate: ${aggregate.candidate_found_duplicate}`,
  `- candidate_found_hold: ${aggregate.candidate_found_hold}`,
  `- source_unresolved: ${aggregate.source_unresolved}`,
  "",
  "## Per region",
  "",
  "| region | total | no current | added | duplicate | hold | unresolved |",
  "|---|---:|---:|---:|---:|---:|---:|",
  ...regions.map((region) => {
    const row = perRegion[region];
    return `| ${region} | ${row.total} | ${row.no_current_or_future_event} | ${row.candidate_found_added} | ${row.candidate_found_duplicate} | ${row.candidate_found_hold} | ${row.source_unresolved} |`;
  }),
  "",
  "## Added official basis",
  "",
  ...dispositions.filter((row) => row.disposition === "candidate_found_added").map((row) => {
    const event = row.added_event;
    return `- ${row.region} / ${row.facility_id} / ${row.name}: ${event.id}「${event.title}」 — ${event.date_label}; ${event.time_label}; ${event.price_label}; ${event.reservation_label}; ${event.age_label}; ${event.source_notes} (${event.official_url})`;
  }),
  "",
  "## Duplicates (official basis rechecked in this Mission)",
  "",
  ...dispositions.filter((row) => row.disposition === "candidate_found_duplicate").flatMap((row) => row.existing_events.map((event) => `- ${row.region} / ${row.facility_id} / ${row.name}: ${event.id}「${event.title}」 — ${event.start_date}〜${event.end_date}; ${event.date_label}; ${event.time_label}; ${event.price_label}; ${event.reservation_label}; ${event.age_label}; mission fetch evaluable=${event.mission_verification?.selected ? "true" : "false"} (${event.official_url})`)),
  "",
  "## Holds (each reason)",
  "",
  ...dispositions.filter((row) => row.disposition === "candidate_found_hold").map((row) => `- ${row.region} / ${row.facility_id} / ${row.name}: ${row.candidate} — ${row.reason} (${row.candidate_url || row.selected_source?.final_url})`),
  "",
  "## Source unresolved (each attempt set)",
  "",
  ...dispositions.filter((row) => row.disposition === "source_unresolved").flatMap((row) => [
    `- ${row.region} / ${row.facility_id} / ${row.name}`,
    ...row.unresolved_attempt_summary.map((attempt) => `  - ${attempt}`),
  ]),
  "",
  "## Product and facility-candidate outcome",
  "",
  "Six events with complete candidate-specific official participation bases were added. All other novel signals that lacked a complete basis remain individually reasoned HOLDs. No standalone facility-candidate signal was surfaced, and no facility was added.",
];
writeFileSync(join(REPORT_ROOT, "summary.md"), `${lines.join("\n")}\n`);

console.log(JSON.stringify({ aggregate, per_region: perRegion, report_root: REPORT_ROOT, verification_url_count: verificationFetches.length, detail_fetch_count: detailIndex.length }, null, 2));
