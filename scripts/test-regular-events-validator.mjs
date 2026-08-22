import assert from "node:assert/strict";
import test from "node:test";
import { validateRegularEventData } from "./regular-events-validator.mjs";

const facility = { id: 1 };

test("facility-backed event must reference an existing facility", () => {
  const event = makeEvent({ facility_id: 999 });
  const result = validate([event]);
  assert.deepEqual(
    result.unbaselined_violations.map((item) => item.rule),
    ["base.facility_id_unknown"],
  );
});

test("regular event may use facility_id=null with a formal venue_name", () => {
  const event = makeEvent({ facility_id: null, venue_name: "山梨市民会館 4階 401会議室" });
  const result = validate([event]);
  assert.equal(result.summary.errors, 0);
});

test("venue_name does not replace an explicit facility_id=null", () => {
  const event = makeEvent({ facility_id: undefined, venue_name: "山梨市民会館" });
  const result = validate([event]);
  assert.deepEqual(
    result.unbaselined_violations.map((item) => item.rule),
    ["base.facility_id_invalid"],
  );
});

test("facility-backed event must not also supply venue_name", () => {
  const event = makeEvent({ venue_name: "別会場" });
  const result = validate([event]);
  assert.deepEqual(
    result.unbaselined_violations.map((item) => item.rule),
    ["base.facility_and_venue_both_set"],
  );
});

test("occurrence_dates participate in semantic duplicate detection", () => {
  const first = makeEvent({ id: "a", occurrence_dates: ["2026-08-01", "2026-08-03"] });
  const second = makeEvent({ id: "b", start_date: "2026-08-03", end_date: "2026-08-03" });
  const result = validate([first, second]);
  assert.ok(
    result.unbaselined_violations.some(
      (item) => item.rule === "base.title_url_date_duplicate" && item.detail === "2026-08-03",
    ),
  );
});

test("base and Summer are checked as one real-event population", () => {
  const base = makeEvent({ id: "base-event" });
  const summer = makeEvent({ id: "summer-event", facility_id: null, venue_name: "テスト館" });
  const result = validate([base], [summer]);
  assert.ok(
    result.unbaselined_violations.some(
      (item) => item.rule === "cross.official_url_date_duplicate",
    ),
  );
});

test("approved exceptions and legacy violations remain separate", () => {
  const event = makeEvent({
    reservation: "unknown",
    reservation_label: "満員",
  });
  const first = validate([event]);
  const finding = first.unbaselined_violations.find(
    (item) => item.rule === "base.closed_label_requires_reservation",
  );
  const approved = validate([event], [], {
    approved_exceptions: [{ fingerprint: finding.fingerprint, reason: "企画単位の例外" }],
    existing_violations: [],
  });
  assert.equal(approved.approved_exceptions.length, 1);
  assert.equal(approved.existing_violations.length, 0);
  assert.equal(approved.summary.errors, 0);
});

test("stale baseline entries fail instead of hiding resolved debt", () => {
  const result = validate([makeEvent()], [], {
    approved_exceptions: [],
    existing_violations: [{ fingerprint: "base.fake:old", reason: "old" }],
  });
  assert.equal(result.stale_existing_violations.length, 1);
  assert.equal(result.summary.errors, 1);
});

function validate(baseEvents, summerEvents = [], baseline) {
  return validateRegularEventData({
    baseEvents,
    summerEvents,
    summerClassifications: [],
    facilities: [facility],
    baseline,
  });
}

function makeEvent(overrides = {}) {
  return {
    id: "event-1",
    facility_id: 1,
    prefecture: "nagano",
    title: "親子工作教室",
    start_date: "2026-08-01",
    end_date: "2026-08-01",
    reservation: "not_required",
    reservation_label: "予約不要",
    official_url: "https://example.com/event/",
    source_urls: ["https://example.com/event/"],
    source_checked_at: "2026-07-22",
    source_notes: "公式確認済み。",
    ...overrides,
  };
}
