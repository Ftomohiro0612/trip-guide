import assert from "node:assert/strict";
import test from "node:test";
import { buildEventSnapshot, buildFacilitySnapshot } from "./snapshot";
import type { Facility } from "../../types/facility";
import type { EventView } from "../events";

test("facility snapshots extract canon display fields without inventing hours/reservations", () => {
  const facility: Facility = { id: 1, slug: "fixture", name: "施設", prefecture: "東京都", prefecture_id: "tokyo", category: "公園", category_id: "park", address: "住所", indoor_outdoor: "屋外", rain_friendly: "△", is_free: false, fee_type: "有料", adult_fee: "500円", child_fee: "200円", description: "抜粋しない", target_age: "幼児〜", url: "https://example.com", tags: [], source_checked_at: "2026-10-25" };
  const before = JSON.stringify(facility);
  assert.deepEqual(buildFacilitySnapshot(facility), { title: "施設", venue_name: "施設", prefecture_label: "東京都", date_label: null, hours: null, price: "大人: 500円 / 子供: 200円", reservation: null, rain: "△", age: "幼児〜", official_url: "https://example.com", source_checked_at: "2026-10-25" });
  assert.equal(JSON.stringify(facility), before);
  assert.equal(buildFacilitySnapshot({ ...facility, source_checked_at: undefined }).source_checked_at, null);
});

test("ended event snapshots preserve title, date, venue and checked date without loading canon", () => {
  const view: EventView = { facilityName: null, facilitySlug: null, venueName: "会場", prefectureLabel: "東京都", discoveryType: "workshop_experience", isThisMonth: false, isThisWeekend: false,
    event: { id: "ended-event", facility_id: null, prefecture: "tokyo", title: "終了イベント", summary: "説明", start_date: "2026-10-01", end_date: "2026-10-02", date_label: "10月1〜2日", time_label: "10:00〜", price_label: "無料", reservation_label: "予約不要", age_label: "小学生", recommended_for_tags: [], recommended_for_label: null, recommended_for_note: null, is_free: true, is_indoor: true, reservation: "not_required", tags: [], official_url: "https://example.com/event", source_urls: [], source_checked_at: "2026-09-30", source_notes: "抜粋しない", status: "ended", display_priority: 1, image: null } };
  const before = JSON.stringify(view);
  assert.deepEqual(buildEventSnapshot(view), { title: "終了イベント", venue_name: "会場", prefecture_label: "東京都", date_label: "10月1〜2日", hours: "10:00〜", price: "無料", reservation: "予約不要", rain: null, age: "小学生", official_url: "https://example.com/event", source_checked_at: "2026-09-30" });
  assert.equal(JSON.stringify(view), before);
});
