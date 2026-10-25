import assert from "node:assert/strict";
import test from "node:test";
import { generateShareToken, hashShareToken, isPlausibleShareToken } from "./token";

test("share tokens contain all 24 random bytes as 32 unpadded base64url characters", () => {
  const original = crypto.getRandomValues;
  const bytes = Uint8Array.from({ length: 24 }, (_, i) => (i * 41 + 19) % 256);
  let requested = 0;
  Object.defineProperty(crypto, "getRandomValues", { configurable: true, value: (target: Uint8Array) => { requested = target.byteLength; target.set(bytes); return target; } });
  try {
    const token = generateShareToken();
    assert.equal(requested * 8, 192);
    assert.equal(token.length, 32);
    assert.match(token, /^[A-Za-z0-9_-]{32}$/);
    assert.deepEqual(Buffer.from(token, "base64url"), Buffer.from(bytes));
  } finally { Object.defineProperty(crypto, "getRandomValues", { configurable: true, value: original }); }
  const tokens = Array.from({ length: 1000 }, generateShareToken);
  assert.equal(new Set(tokens).size, tokens.length);
  assert.ok(tokens.every(isPlausibleShareToken));
});

test("token format and SHA-256 match the SQL contract", async () => {
  for (const value of [null, "", "a".repeat(31), "a".repeat(129), "a".repeat(31) + "+", "a".repeat(32) + "\n"]) assert.equal(isPlausibleShareToken(value), false);
  for (const value of ["a".repeat(32), "A_-0".repeat(32)]) assert.equal(isPlausibleShareToken(value), true);
  assert.equal(await hashShareToken("abc"), "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
  assert.equal(await hashShareToken("同じ入力"), await hashShareToken("同じ入力"));
  assert.notEqual(await hashShareToken("a"), await hashShareToken("b"));
});
