import assert from "node:assert/strict";
import test from "node:test";
import { candidateError, defaultSoudanTitle, openDestinations, ownerView, plannedDateRule, profileAgeBands, responseCounts, shareState } from "./soudan-owner";
import type { Consultation, ConsultationResponse } from "./soudan/types";

test("JST title rolls over before UTC; only deduplicated age labels leave profiles", () => {
  assert.equal(defaultSoudanTitle(new Date("2026-10-31T15:00:00Z")), "11月の週末おでかけ");
  assert.equal(defaultSoudanTitle(new Date("2026-10-31T14:59:59Z")), "10月の週末おでかけ");
  assert.deepEqual(profileAgeBands([
    { birth_year: 2026, birth_month: 10 }, { birth_year: 2025, birth_month: 1 },
    { birth_year: 2020, birth_month: 11 }, { birth_year: 2020, birth_month: 10 },
    { birth_year: 2014, birth_month: 10 },
  ], new Date("2026-10-25T00:00:00Z")), ["0〜2歳", "3〜5歳", "小学生", "中学生以上"]);
  assert.deepEqual(profileAgeBands([], new Date()), []);
});

test("destination choices contain only open consultations, newest first with stable ties", () => {
  const item = (id: string, status: Consultation["status"], updated_at: string) => ({ id, status, updated_at });
  const input = [item("old", "open", "2026-10-01"), item("decided", "decided", "2026-10-26"), item("b", "open", "2026-10-25"), item("a", "open", "2026-10-25"), item("archived", "archived", "2026-10-26")];
  const before = JSON.stringify(input);
  assert.deepEqual(openDestinations(input).map((c) => c.id), ["a", "b", "old"]);
  assert.deepEqual(openDestinations([]), []); // zero -> create without a sheet
  assert.equal(JSON.stringify(input), before);
});

test("duplicate and 30-candidate guard errors have distinct messages; SQL details stay server-side", () => {
  assert.equal(candidateError({ code: "23505", message: "private sql detail" }), "すでに入っています");
  assert.equal(candidateError({ code: "23514", message: "candidate limit reached" }), "1つの相談に入れられる候補は30件までです");
  assert.ok(!candidateError({ code: "23514", message: "other secret details" }).includes("secret"));
});

test("planned_date changes only for dated facility decisions and confirms overwrites", () => {
  for (const kind of ["event", "external"]) {
    assert.equal(plannedDateRule(kind, "2026-10-20", "2026-10-25"), "keep");
    assert.equal(plannedDateRule(kind, null, "2026-10-25"), "keep");
  }
  assert.equal(plannedDateRule("facility", "2026-10-20", null), "keep");
  assert.equal(plannedDateRule("facility", null, null), "keep");
  assert.equal(plannedDateRule("facility", null, "2026-10-25"), "set");
  assert.equal(plannedDateRule("facility", "2026-10-25", "2026-10-25"), "keep");
  assert.equal(plannedDateRule("facility", "2026-10-24", "2026-10-25"), "confirm");
});

test("share status handles exact expiry, stops, archives, and never exposes owner/hash in UI DTO", () => {
  const now = new Date("2026-10-25T00:00:00Z");
  const c = { id: "id", user_id: "owner", status: "open", share_token_hash: "hash", share_enabled: true, share_expires_at: null } as Consultation;
  assert.equal(shareState(c, now), "共有中");
  assert.equal(shareState({ ...c, share_token_hash: null }, now), "未発行");
  assert.equal(shareState({ ...c, share_enabled: false }, now), "停止中");
  assert.equal(shareState({ ...c, status: "archived" }, now), "停止中");
  assert.equal(shareState({ ...c, share_expires_at: now.toISOString() }, now), "失効");
  assert.equal(shareState({ ...c, share_expires_at: "invalid" }, now), "失効");
  const view = ownerView(c);
  assert.equal("share_token_hash" in view, false);
  assert.equal("user_id" in view, false);
});

test("response badges count unresolved issues while preserving resolved records", () => {
  const responses = [
    { kind: "unverified", status: "open" }, { kind: "unverified", status: "resolved" },
    { kind: "correction", status: "open" }, { kind: "correction", status: "open" },
    { kind: "correction", status: "resolved" }, { kind: "finding", status: "open" },
  ] as ConsultationResponse[];
  assert.deepEqual(responseCounts(responses), { unverified: 1, correction: 2 });
  assert.equal(responses.length, 6);
});
