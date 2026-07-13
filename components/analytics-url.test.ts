import assert from "node:assert/strict";
import test from "node:test";

const analyticsModulePath = "./analytics-url.ts";

const visitUuid = "123e4567-e89b-12d3-a456-426614174000";

test("maskAnalyticsUrl masks UUIDs in visit path, query, and hash", async () => {
  const { maskAnalyticsUrl } = await import(analyticsModulePath);
  const masked = maskAnalyticsUrl(
    `https://trip-guide.net/mypage/visits/${visitUuid}?next=/mypage/visits/${visitUuid}#${visitUuid}`,
  );

  assert.equal(
    masked,
    "https://trip-guide.net/mypage/visits/:id?next=/mypage/visits/:id#:id",
  );
  assert.equal(masked.includes(visitUuid), false);
});

test("maskAnalyticsUrl masks relative URLs against the current origin", async () => {
  const { maskAnalyticsUrl } = await import(analyticsModulePath);
  const masked = maskAnalyticsUrl(
    `/mypage/visits/${visitUuid}`,
    "https://trip-guide.net",
  );

  assert.equal(masked, "https://trip-guide.net/mypage/visits/:id");
});

test("maskAnalyticsPath returns a masked path suitable for page_path", async () => {
  const { maskAnalyticsPath } = await import(analyticsModulePath);
  const masked = maskAnalyticsPath(
    `https://trip-guide.net/mypage/visits/${visitUuid}?from=${visitUuid}`,
  );

  assert.equal(masked, "/mypage/visits/:id?from=:id");
});

test("maskAnalyticsText masks collect payload text before GA transport", async () => {
  const { maskAnalyticsText } = await import(analyticsModulePath);
  const masked = maskAnalyticsText(
    `dl=https://trip-guide.net/mypage/visits/${visitUuid}&dr=https://trip-guide.net/mypage/visits/${visitUuid}`,
  );

  assert.equal(masked.includes(visitUuid), false);
  assert.equal((masked.match(/:id/g) ?? []).length, 2);
});
