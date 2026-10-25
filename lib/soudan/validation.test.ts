import assert from "node:assert/strict";
import test from "node:test";
import { characterCount, isHttpUrl, normalizeAuthorLabel, validateCandidateInput, validateConditions, validateConsultationInput, validateResponseInput } from "./validation";

test("URL input rejects executable schemes, malformed hosts and obfuscated URLs", () => {
  for (const url of ["javascript:alert(1)", "data:text/html,test", "//example.com", "ftp://example.com", "https://", "https://a b", "https://example.com\\@evil.com", "https://user:pass@example.com", "\nhttps://example.com", "https://example.com/\0", "https://example.com/\n"]) assert.equal(isHttpUrl(url), false, url);
  for (const url of ["https://example.com/path?q=1#x", "http://example.com", "HTTPS://example.com", "https://例.jp/遊び"]) assert.equal(isHttpUrl(url), true, url);
  assert.equal(isHttpUrl(`https://a/${"x".repeat(491)}`, 500), false);
});

test("conditions discard unknown keys and accept only bounded typed values and age bands", () => {
  assert.deepEqual(validateConditions({ dates: ["2028-02-29"], areas: ["東京"], ageBands: ["3〜5歳"], rainOk: true, budget: "無料", travelTime: "1時間", note: "", nickname: "stored nowhere", birthMonth: 4, photo: "x" }), { ok: true, value: { dates: ["2028-02-29"], areas: ["東京"], budget: "無料", travelTime: "1時間", ageBands: ["3〜5歳"], rainOk: true, note: "" } });
  for (const value of [null, [], { dates: ["2026-02-29"] }, { dates: Array(6).fill("2026-01-01") }, { areas: Array(6).fill("東京") }, { budget: 1 }, { rainOk: "true" }, { note: "x".repeat(501) }, { ageBands: ["子の名前"] }]) assert.equal(validateConditions(value).ok, false);
  assert.equal(validateConditions({ areas: Array(5).fill("東京") }).ok, true);
});

test("text lengths count PostgreSQL Unicode characters; optional notes stay optional", () => {
  assert.equal(characterCount("😀"), 1);
  assert.equal(validateConsultationInput({ title: "😀".repeat(60) }).ok, true);
  assert.equal(validateConsultationInput({ title: "😀".repeat(61) }).ok, false);
  assert.equal(validateConsultationInput({ title: "" }).ok, false);
  const candidate = { kind: "external", title: "候補", external_url: "https://example.com" };
  assert.equal(validateCandidateInput(candidate).ok, true);
  for (const extra of [{ external_url: "javascript:a" }, { title: "x".repeat(101) }, { reason: "x".repeat(501) }, { sort_order: 1.5 }, { kind: "event" }, { kind: "facility" }]) assert.equal(validateCandidateInput({ ...candidate, ...extra }).ok, false);
  assert.equal(validateCandidateInput({ ...candidate, reason: "😀".repeat(500) }).ok, true);
});

test("response rules support reaction-only and finding replies, with trimmed labels", () => {
  const base = { kind: "comment", body: "確認", author_label: " \tパパ　" };
  const result = validateResponseInput(base);
  assert.equal(result.ok, true);
  if (result.ok) assert.equal(result.value.author_label, "パパ");
  assert.equal(normalizeAuthorLabel("\u2000v\ufeff"), "v");
  assert.equal(validateResponseInput({ ...base, body: "", reaction: "like" }).ok, true);
  assert.equal(validateResponseInput({ ...base, kind: "correction", correction_field: "hours" }).ok, true);
  assert.equal(validateResponseInput({ ...base, kind: "finding", reply_to_id: "00000000-0000-0000-0000-000000000001" }).ok, true);
  for (const [extra, error] of [
    [{ body: "😀".repeat(501) }, "invalid_body"], [{ body: "　 \t" }, "invalid_body"], [{ author_label: "　 " }, "invalid_author_label"],
    [{ author_label: "x".repeat(21) }, "invalid_author_label"], [{ correction_field: "hours" }, "invalid_correction_field"],
    [{ reaction: "no" }, "invalid_reaction"], [{ source_url: "javascript:alert(1)" }, "invalid_source_url"],
    [{ candidate_id: "bad" }, "invalid_candidate"], [{ reply_to_id: "bad" }, "invalid_reply"],
  ] as const) assert.deepEqual(validateResponseInput({ ...base, ...extra }), { ok: false, error });
});
