import assert from "node:assert/strict";
import test from "node:test";
import { SOUDAN_COPY } from "./copy";
import { buildLineShareUrl, buildShareUrl, buildWebShareData } from "./share-link";
import { SOUDAN_EVENTS } from "./analytics";
import type { SoudanAnalyticsEvent } from "./analytics";

test("mandatory visibility copy is centralized and avoids forbidden assurances", () => {
  assert.deepEqual(Object.values(SOUDAN_COPY), [
    "このリンクを知っている人は誰でも見られ、書き込めます",
    "LINE の家族グループなど、見せたい人にだけ送ってください。転送されると転送先の人も見られます",
    "検索結果には出ない設定です(閲覧を制限するものではありません)",
    "再発行すると古いリンクは使えなくなります",
  ]);
  for (const forbidden of ["非公開", "家族だけが見られる", "家族限定", "安全", "秘密"]) assert.equal(Object.values(SOUDAN_COPY).join().includes(forbidden), false);
});

test("sharing text includes only title, registration guidance and the link", () => {
  const url = buildShareUrl("a".repeat(32), "https://example.com/");
  assert.equal(url, `https://example.com/soudan/${"a".repeat(32)}`);
  assert.equal(new URL(buildShareUrl("a".repeat(32))).pathname, `/soudan/${"a".repeat(32)}`);
  assert.deepEqual(buildWebShareData("週末 & おでかけ", url), { title: "週末 & おでかけ", text: "週末 & おでかけ\n見るだけで登録は不要", url });
  const line = buildLineShareUrl("週末 & おでかけ", url);
  assert.equal(line.split("?")[0], "https://line.me/R/msg/text/");
  assert.equal(decodeURIComponent(line.split("?")[1]), `週末 & おでかけ\n見るだけで登録は不要\n${url}`);
  assert.throws(() => buildShareUrl("short"));
  assert.throws(() => buildShareUrl("a".repeat(32), "javascript:a"));
});

test("analytics declares aggregate events only", () => {
  assert.deepEqual(SOUDAN_EVENTS, ["soudan_create", "soudan_candidate_add", "soudan_share", "soudan_link_view", "soudan_response", "soudan_decide"]);
  const event: SoudanAnalyticsEvent = { name: "soudan_candidate_add", properties: { kind: "facility" } };
  assert.equal(event.properties.kind, "facility");
  // @ts-expect-error Never add identifying properties to aggregate events.
  const invalid: SoudanAnalyticsEvent = { name: "soudan_share", properties: { token: "secret" } };
  void invalid;
  // @ts-expect-error Only fixed, enumerated values are allowed.
  const invalidKind: SoudanAnalyticsEvent = { name: "soudan_response", properties: { kind: "free text" } };
  void invalidKind;
});
