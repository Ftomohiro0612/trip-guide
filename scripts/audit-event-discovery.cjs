/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

require.extensions[".ts"] = (module, filename) => {
  const source = fs.readFileSync(filename, "utf8");
  const output = ts.transpileModule(source, {
    compilerOptions: {
      esModuleInterop: true,
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  module._compile(output, filename);
};

const {
  EVENT_DISCOVERY_TYPE_LABELS,
  classifyEventDiscoveryType,
  getCompactEventAppealTags,
  selectChildEventViews,
  selectSeasonalEventViews,
} = require("../lib/event-discovery.ts");
const {
  getEventLastDate,
  getNextEventDate,
  isThisMonth,
  isThisWeekend,
} = require("../lib/event-dates.ts");
const { eventMatchesKeyword } = require("../lib/event-filter.ts");

const eventData = JSON.parse(
  fs.readFileSync(path.join(__dirname, "../data/events_data.json"), "utf8"),
);
const facilityData = JSON.parse(
  fs.readFileSync(path.join(__dirname, "../data/facilities_data.json"), "utf8"),
);
const facilities = new Map(
  facilityData.facilities.map((facility) => [facility.id, facility]),
);
const prefectures = new Map(
  facilityData.metadata.prefectures.map((prefecture) => [
    prefecture.id,
    prefecture.name,
  ]),
);
const clocks = ["2026-10-14", "2026-10-20", "2026-10-26"];
const audit = { clocks: {}, keywordSearches: {}, typeDistribution: {}, typeSample: [] };

for (const clock of clocks) {
  const views = getVisibleViews(clock);
  const seasonal = selectSeasonalEventViews(views, clock);
  const child = selectChildEventViews(
    views,
    clock,
    new Set(seasonal.map((view) => view.event.id)),
  );
  audit.clocks[clock] = {
    visibleCount: views.length,
    candidateCountByTier: child.candidatesByTier,
    seasonal: seasonal.map((view) => summarizeSeasonal(view, clock)),
    child: child.picks.map((pick) => ({
      ...summarizeView(pick.view),
      tags: pick.matchedTags,
      primaryTheme: pick.primaryTheme,
      scoreReason: pick.reason,
    })),
    overlap: child.picks
      .map((pick) => pick.view.event.id)
      .filter((id) => seasonal.some((view) => view.event.id === id)),
    repeatedFacilities: repeated([
      ...seasonal.map(facilityKey),
      ...child.picks.map((pick) => facilityKey(pick.view)),
    ]),
  };
}

const reportViews = getVisibleViews("2026-10-14");
for (const keyword of ["秋祭り", "祭り", "恐竜", "プラネタリウム"]) {
  const matches = reportViews.filter((view) => eventMatchesKeyword(view, keyword));
  audit.keywordSearches[keyword] = {
    count: matches.length,
    first3: matches.slice(0, 3).map((view) => view.event.title),
  };
}

for (const [type, label] of Object.entries(EVENT_DISCOVERY_TYPE_LABELS)) {
  const matches = reportViews.filter(
    (view) => classifyEventDiscoveryType(view.event).type === type,
  );
  audit.typeDistribution[type] = { label, count: matches.length };
  for (const view of matches.slice(0, 4)) {
    const classification = classifyEventDiscoveryType(view.event);
    audit.typeSample.push({
      id: view.event.id,
      title: view.event.title,
      type: label,
      reason: classification.reason,
    });
  }
}

process.stdout.write(`${JSON.stringify(audit, null, 2)}\n`);

function getVisibleViews(today) {
  const maxAgeDays = eventData.metadata.freshness_days_page;
  return eventData.events
    .filter((event) => {
      const lastDate = getEventLastDate(event);
      const checkedAge = daysBetween(event.source_checked_at, today);
      const hasPlace =
        event.facility_id !== null
          ? facilities.has(event.facility_id)
          : Boolean(event.venue_name?.trim());
      return (
        ["scheduled", "ongoing"].includes(event.status) &&
        lastDate !== null &&
        lastDate >= today &&
        checkedAge !== null &&
        checkedAge >= 0 &&
        checkedAge <= maxAgeDays &&
        /^https?:\/\/\S+$/u.test(event.official_url.trim()) &&
        hasPlace
      );
    })
    .sort((a, b) =>
      (a.start_date ?? "9999").localeCompare(b.start_date ?? "9999") ||
      b.display_priority - a.display_priority ||
      a.id.localeCompare(b.id),
    )
    .map((event) => {
      const facility = event.facility_id === null ? null : facilities.get(event.facility_id);
      return {
        event,
        facilityName: facility?.name ?? null,
        facilitySlug: facility?.slug ?? null,
        venueName: facility?.name ?? event.venue_name?.trim() ?? null,
        prefectureLabel: prefectures.get(event.prefecture) ?? event.prefecture,
        isThisWeekend: isThisWeekend(event, today),
        isThisMonth: isThisMonth(event, today),
      };
    });
}

function summarizeSeasonal(view, today) {
  const nextDate = getNextEventDate(view.event, today);
  return {
    ...summarizeView(view),
    tags: getCompactEventAppealTags(view.event),
    scoreReason: `${isThisWeekend(view.event, today) ? "今週末" : "日付順"}; next=${nextDate}; stable=${view.event.id}`,
  };
}

function summarizeView(view) {
  return {
    id: view.event.id,
    title: view.event.title,
    facility: view.venueName,
  };
}

function facilityKey(view) {
  return view.event.facility_id !== null
    ? `facility:${view.event.facility_id}`
    : `venue:${view.event.prefecture}:${view.venueName}`;
}

function repeated(values) {
  return values.filter((value, index) => values.indexOf(value) !== index);
}

function daysBetween(from, to) {
  const start = Date.parse(`${from}T00:00:00Z`);
  const end = Date.parse(`${to}T00:00:00Z`);
  if (!Number.isFinite(start) || !Number.isFinite(end)) return null;
  return Math.floor((end - start) / 86_400_000);
}
