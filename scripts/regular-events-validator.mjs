const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/u;
const URL_PATTERN = /^https?:\/\/\S+$/u;
const CLOSED_LABEL_PATTERN = /満員|満席|受付終了/u;

export function validateRegularEventData({
  baseEvents,
  summerEvents,
  summerClassifications,
  facilities,
  baseline = emptyBaseline(),
}) {
  const findings = [];
  const facilityIds = new Set(facilities.map((facility) => String(facility.id)));
  const baseById = new Map(baseEvents.map((event) => [event.id, event]));

  validateUniqueIds(baseEvents, "base.id_duplicate", findings);
  validateUniqueIds(summerEvents, "summer.id_duplicate", findings);
  validateLayerIds(baseEvents, summerEvents, findings);

  for (const event of baseEvents) {
    validateEvent(event, "base", facilityIds, findings);
  }
  for (const event of summerEvents) {
    validateEvent(event, "summer", facilityIds, findings);
  }
  for (const classification of summerClassifications) {
    if (!baseById.has(classification.id)) {
      addFinding(findings, "cross.classification_missing_base", [classification.id]);
    }
  }

  validateDuplicatePopulation(baseEvents, "base", findings);
  validateDuplicatePopulation(summerEvents, "summer", findings);
  validateCrossLayerDuplicates(baseEvents, summerEvents, findings);

  const approvedByFingerprint = new Map(
    baseline.approved_exceptions.map((item) => [item.fingerprint, item]),
  );
  const existingByFingerprint = new Map(
    baseline.existing_violations.map((item) => [item.fingerprint, item]),
  );
  const approvedExceptions = [];
  const existingViolations = [];
  const unbaselinedViolations = [];

  for (const finding of findings) {
    if (approvedByFingerprint.has(finding.fingerprint)) {
      approvedExceptions.push({
        ...finding,
        reason: approvedByFingerprint.get(finding.fingerprint).reason,
      });
    } else if (existingByFingerprint.has(finding.fingerprint)) {
      existingViolations.push({
        ...finding,
        reason: existingByFingerprint.get(finding.fingerprint).reason,
      });
    } else {
      unbaselinedViolations.push(finding);
    }
  }

  const currentFingerprints = new Set(findings.map((finding) => finding.fingerprint));
  const staleApprovedExceptions = baseline.approved_exceptions.filter(
    (item) => !currentFingerprints.has(item.fingerprint),
  );
  const staleExistingViolations = baseline.existing_violations.filter(
    (item) => !currentFingerprints.has(item.fingerprint),
  );

  return {
    summary: {
      base_events: baseEvents.length,
      summer_events: summerEvents.length,
      summer_classifications: summerClassifications.length,
      facilities: facilities.length,
      findings: findings.length,
      approved_exceptions: approvedExceptions.length,
      existing_violations: existingViolations.length,
      unbaselined_violations: unbaselinedViolations.length,
      stale_approved_exceptions: staleApprovedExceptions.length,
      stale_existing_violations: staleExistingViolations.length,
      errors:
        unbaselinedViolations.length +
        staleApprovedExceptions.length +
        staleExistingViolations.length,
    },
    approved_exceptions: approvedExceptions,
    existing_violations: existingViolations,
    unbaselined_violations: unbaselinedViolations,
    stale_approved_exceptions: staleApprovedExceptions,
    stale_existing_violations: staleExistingViolations,
  };
}

function validateEvent(event, layer, facilityIds, findings) {
  const id = typeof event.id === "string" && event.id.trim() ? event.id : "<missing-id>";
  if (id === "<missing-id>") addFinding(findings, `${layer}.id_missing`, [id]);
  for (const field of ["prefecture", "title", "source_notes"]) {
    if (typeof event[field] !== "string" || event[field].trim() === "") {
      addFinding(findings, `${layer}.${field}_missing`, [id]);
    }
  }
  if (!DATE_PATTERN.test(event.start_date ?? "")) {
    addFinding(findings, `${layer}.start_date_invalid`, [id]);
  }
  if (!DATE_PATTERN.test(event.end_date ?? "")) {
    addFinding(findings, `${layer}.end_date_invalid`, [id]);
  }
  if (
    DATE_PATTERN.test(event.start_date ?? "") &&
    DATE_PATTERN.test(event.end_date ?? "") &&
    event.start_date > event.end_date
  ) {
    addFinding(findings, `${layer}.date_order_invalid`, [id]);
  }
  validateOccurrenceDates(event, layer, findings);
  validateSources(event, layer, findings);
  validateVenue(event, layer, facilityIds, findings);
  if (CLOSED_LABEL_PATTERN.test(event.reservation_label ?? "") && event.reservation !== "required") {
    addFinding(findings, `${layer}.closed_label_requires_reservation`, [id]);
  }
}

function validateOccurrenceDates(event, layer, findings) {
  if (event.occurrence_dates === undefined) return;
  if (!Array.isArray(event.occurrence_dates) || event.occurrence_dates.length === 0) {
    addFinding(findings, `${layer}.occurrence_dates_invalid`, [event.id]);
    return;
  }
  const uniqueDates = new Set();
  for (const date of event.occurrence_dates) {
    if (!DATE_PATTERN.test(date ?? "")) {
      addFinding(findings, `${layer}.occurrence_date_invalid`, [event.id], String(date));
      continue;
    }
    if (uniqueDates.has(date)) {
      addFinding(findings, `${layer}.occurrence_date_duplicate`, [event.id], date);
    }
    uniqueDates.add(date);
    if (
      DATE_PATTERN.test(event.start_date ?? "") &&
      DATE_PATTERN.test(event.end_date ?? "") &&
      (date < event.start_date || date > event.end_date)
    ) {
      addFinding(findings, `${layer}.occurrence_date_outside_range`, [event.id], date);
    }
  }
}

function validateSources(event, layer, findings) {
  const id = event.id ?? "<missing-id>";
  if (!URL_PATTERN.test(event.official_url ?? "")) {
    addFinding(findings, `${layer}.official_url_invalid`, [id]);
  }
  if (
    !Array.isArray(event.source_urls) ||
    event.source_urls.length === 0 ||
    event.source_urls.some((url) => !URL_PATTERN.test(url ?? ""))
  ) {
    addFinding(findings, `${layer}.source_urls_invalid`, [id]);
  } else if (
    URL_PATTERN.test(event.official_url ?? "") &&
    !event.source_urls.some(
      (sourceUrl) => normalizeUrl(sourceUrl) === normalizeUrl(event.official_url),
    )
  ) {
    addFinding(findings, `${layer}.official_url_missing_from_sources`, [id]);
  }
  if (!DATE_PATTERN.test(event.source_checked_at ?? "")) {
    addFinding(findings, `${layer}.source_checked_at_invalid`, [id]);
  }
}

function validateVenue(event, layer, facilityIds, findings) {
  const id = event.id ?? "<missing-id>";
  const hasFacility = event.facility_id !== null && event.facility_id !== undefined;
  const hasVenue = typeof event.venue_name === "string" && event.venue_name.trim() !== "";
  if (hasFacility && hasVenue) {
    addFinding(findings, `${layer}.facility_and_venue_both_set`, [id]);
  }
  if (!hasFacility && !hasVenue) {
    addFinding(findings, `${layer}.facility_or_venue_missing`, [id]);
  }
  if (hasFacility && !facilityIds.has(String(event.facility_id))) {
    addFinding(findings, `${layer}.facility_id_unknown`, [id], String(event.facility_id));
  }
}

function validateUniqueIds(events, rule, findings) {
  for (const group of grouped(events, (event) => event.id)) {
    if (group.key && group.events.length > 1) {
      addFinding(findings, rule, group.events.map((event) => event.id));
    }
  }
}

function validateLayerIds(baseEvents, summerEvents, findings) {
  const summerIds = new Set(summerEvents.map((event) => event.id));
  for (const event of baseEvents) {
    if (summerIds.has(event.id)) {
      addFinding(findings, "cross.id_collision", [event.id]);
    }
  }
}

function validateDuplicatePopulation(events, layer, findings) {
  const identities = expandIdentities(events, layer);
  for (const group of grouped(identities, (item) => `${item.url}|${item.date}`)) {
    if (!group.key || group.events.length < 2) continue;
    const byTitle = grouped(group.events, (item) => item.title);
    const exactTitleGroups = byTitle.filter((item) => item.key && item.events.length > 1);
    if (exactTitleGroups.length > 0) {
      for (const titleGroup of exactTitleGroups) {
        addFinding(
          findings,
          `${layer}.title_url_date_duplicate`,
          titleGroup.events.map((item) => item.id),
          titleGroup.events[0].date,
        );
      }
    } else {
      addFinding(
        findings,
        `${layer}.official_url_date_collision`,
        group.events.map((item) => item.id),
        group.events[0].date,
      );
    }
  }
  for (const group of grouped(
    identities,
    (item) => (item.venue && item.title ? `${item.venue}|${item.title}|${item.date}` : ""),
  )) {
    if (group.key && group.events.length > 1) {
      addFinding(
        findings,
        `${layer}.venue_title_date_duplicate`,
        group.events.map((item) => item.id),
        group.events[0].date,
      );
    }
  }
}

function validateCrossLayerDuplicates(baseEvents, summerEvents, findings) {
  const base = expandIdentities(baseEvents, "base");
  const summer = expandIdentities(summerEvents, "summer");
  const combined = [...base, ...summer];
  for (const group of grouped(combined, (item) => `${item.url}|${item.date}`)) {
    if (!group.key || !hasBothLayers(group.events)) continue;
    addFinding(
      findings,
      "cross.official_url_date_duplicate",
      group.events.map((item) => `${item.layer}:${item.id}`),
      group.events[0].date,
    );
  }
  for (const group of grouped(
    combined,
    (item) => (item.venue && item.title ? `${item.venue}|${item.title}|${item.date}` : ""),
  )) {
    if (!group.key || !hasBothLayers(group.events)) continue;
    addFinding(
      findings,
      "cross.venue_title_date_duplicate",
      group.events.map((item) => `${item.layer}:${item.id}`),
      group.events[0].date,
    );
  }
}

function expandIdentities(events, layer) {
  return events.flatMap((event) =>
    identityDates(event).map((date) => ({
      id: event.id,
      layer,
      date,
      title: normalizeText(event.title),
      url: normalizeUrl(event.official_url),
      venue:
        event.facility_id !== null && event.facility_id !== undefined
          ? `facility:${event.facility_id}`
          : `venue:${normalizeText(event.venue_name)}`,
    })),
  );
}

function identityDates(event) {
  if (Array.isArray(event.occurrence_dates) && event.occurrence_dates.length > 0) {
    return [...new Set(event.occurrence_dates.filter((date) => DATE_PATTERN.test(date ?? "")))];
  }
  return DATE_PATTERN.test(event.start_date ?? "") ? [event.start_date] : [];
}

function normalizeText(value) {
  return String(value ?? "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\s\p{P}\p{S}]+/gu, "");
}

function normalizeUrl(value) {
  try {
    const url = new URL(value);
    url.hash = "";
    url.hostname = url.hostname.toLowerCase().replace(/^www\./u, "");
    url.protocol = "https:";
    url.pathname = url.pathname.replace(/\/+$/u, "") || "/";
    return url.toString();
  } catch {
    return "";
  }
}

function grouped(events, keyFn) {
  const groups = new Map();
  for (const event of events) {
    const key = keyFn(event);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(event);
  }
  return [...groups.entries()].map(([key, groupedEvents]) => ({
    key,
    events: groupedEvents,
  }));
}

function hasBothLayers(events) {
  const layers = new Set(events.map((event) => event.layer));
  return layers.has("base") && layers.has("summer");
}

function addFinding(findings, rule, ids, detail = "") {
  const eventIds = [...new Set(ids.map(String))].sort();
  const fingerprint = [rule, ...eventIds, detail].filter(Boolean).join(":");
  if (findings.some((finding) => finding.fingerprint === fingerprint)) return;
  findings.push({ fingerprint, rule, event_ids: eventIds, detail });
}

function emptyBaseline() {
  return { approved_exceptions: [], existing_violations: [] };
}
