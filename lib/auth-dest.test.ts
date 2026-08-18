import assert from "node:assert/strict";
import test from "node:test";
import {
  FALLBACK_AUTH_DEST,
  buildLoginRedirect,
  buildRegisterRedirect,
  isSafeRelativePath,
  sanitizeAuthRedirect,
} from "./auth-dest";

const safePaths = [
  "/mypage",
  "/facilities/facility-345",
  "/facilities/facility-345?action=record",
];

const unsafePaths: Array<[string, string | null | undefined]> = [
  ["absolute URL", "https://evil.com"],
  ["protocol-relative URL", "//evil.com"],
  ["single backslash after slash", "/\\evil.com"],
  ["decoded %5C after slash", decodeURIComponent("/%5Cevil.com")],
  ["double backslash after slash", "/\\\\evil.com"],
  ["decoded %2F%2F after slash", decodeURIComponent("/%2F%2Fevil.com")],
  ["leading control character", "\u0000/mypage"],
  ["embedded control character", "/my\u001Fpage"],
  ["DEL control character", "/mypage\u007F"],
  ["relative path", "mypage"],
  ["null", null],
  ["undefined", undefined],
];

test("isSafeRelativePath accepts safe relative auth destinations", () => {
  for (const path of safePaths) {
    assert.equal(isSafeRelativePath(path), true, path);
  }
});

test("isSafeRelativePath rejects unsafe auth destinations", () => {
  for (const [name, path] of unsafePaths) {
    assert.equal(isSafeRelativePath(path), false, name);
  }
});

test("sanitizeAuthRedirect falls back for unsafe auth destinations", () => {
  for (const [name, path] of unsafePaths) {
    assert.equal(sanitizeAuthRedirect(path), FALLBACK_AUTH_DEST, name);
  }
});

test("auth redirect builders sanitize before encoding", () => {
  assert.equal(
    buildLoginRedirect("/mypage/visits/new?guestDraft=1"),
    "/auth/login?redirectTo=%2Fmypage%2Fvisits%2Fnew%3FguestDraft%3D1",
  );
  assert.equal(
    buildRegisterRedirect("https://evil.example"),
    `/auth/register?redirectTo=${encodeURIComponent(FALLBACK_AUTH_DEST)}`,
  );
});
