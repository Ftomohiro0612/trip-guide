import assert from "node:assert/strict";
import test from "node:test";

const modulePath = "./visit-other-note.ts";
const { encodeInterestOtherNote, isInterestOtherSelected } = await import(modulePath);

test("interestのその他はメモ空欄でも空文字として選択事実を保持する", () => {
  const stored = encodeInterestOtherNote("   ", true);

  assert.equal(stored, "");
  assert.equal(isInterestOtherSelected(stored), true);
});

test("interestのその他を選ばなければnullで未選択に戻る", () => {
  const stored = encodeInterestOtherNote("入力済みでも保存しない", false);

  assert.equal(stored, null);
  assert.equal(isInterestOtherSelected(stored), false);
});

test("interestのその他メモは前後空白を除いて保持する", () => {
  const stored = encodeInterestOtherNote("  迷路  ", true);

  assert.equal(stored, "迷路");
  assert.equal(isInterestOtherSelected(stored), true);
});
