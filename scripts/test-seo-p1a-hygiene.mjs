import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const [topPageSource, footerSource, facilitiesDataSource] = await Promise.all([
  readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
  readFile(new URL("../components/Footer.tsx", import.meta.url), "utf8"),
  readFile(new URL("../data/facilities_data.json", import.meta.url), "utf8"),
]);

test("top page declares the production self-canonical", () => {
  assert.match(
    topPageSource,
    /alternates:\s*\{\s*canonical:\s*["']\/["']\s*\}/u,
  );
});

test("shared footer exposes a crawlable link to /about", () => {
  assert.match(footerSource, /<Link\s+href=["']\/about["']/u);
});

test("facility-163 no longer emits the '-' placeholder as an internal link", () => {
  const facilitiesData = JSON.parse(facilitiesDataSource);
  const facility = facilitiesData.facilities.find(({ id }) => id === 163);

  assert.ok(facility, "facility-163 must exist");
  assert.equal(facility.slug, "facility-163");
  assert.equal(facility.url, null);
});
