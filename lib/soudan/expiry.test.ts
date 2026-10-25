import assert from "node:assert/strict";
import test from "node:test";
import { computeShareExpiry, isShareActive } from "./expiry";

test("dated decisions expire 90 days after the following midnight JST", () => {
  const now = new Date("2026-10-25T14:59:59Z");
  assert.equal(computeShareExpiry({ decidedDate: "2026-10-25", now }), "2027-01-23T15:00:00.000Z");
  assert.equal(computeShareExpiry({ decidedDate: "2026-10-25", now: new Date("2026-10-25T15:00:00Z") }), "2027-01-23T15:00:00.000Z");
  assert.equal(computeShareExpiry({ decidedDate: "2028-02-29", now }), "2028-05-29T15:00:00.000Z");
  assert.throws(() => computeShareExpiry({ decidedDate: "2026-02-29", now }), RangeError);
  assert.throws(() => computeShareExpiry({ decidedDate: "2026-2-01", now }), RangeError);
  assert.throws(() => computeShareExpiry({ now: new Date("invalid") }), RangeError);
  assert.equal(computeShareExpiry({ now }), "2027-01-23T14:59:59.000Z");
});

test("share expiry is exclusive; archived, disabled and missing-token shares stop", () => {
  const c = { status: "decided" as const, share_enabled: true, share_token_hash: "hash", share_expires_at: "2026-10-25T15:00:00Z" };
  assert.equal(isShareActive(c, new Date("2026-10-25T14:59:59.999Z")), true);
  const now = new Date("2026-10-25T15:00:00Z");
  assert.equal(isShareActive(c, now), false);
  assert.equal(isShareActive({ ...c, share_expires_at: null }, now), true);
  assert.equal(isShareActive({ ...c, share_expires_at: null, status: "archived" }, now), false);
  assert.equal(isShareActive({ ...c, share_expires_at: null, share_enabled: false }, now), false);
  assert.equal(isShareActive({ ...c, share_expires_at: null, share_token_hash: null }, now), false);
  assert.equal(isShareActive({ ...c, share_expires_at: "invalid" }, now), false);
});
