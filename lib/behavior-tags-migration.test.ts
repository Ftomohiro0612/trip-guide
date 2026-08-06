import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration = readFileSync(
  new URL("../supabase/migrations/015_behavior_tags_expansion.sql", import.meta.url),
  "utf8",
);

const expectedRows = [
  ["immersed", "夢中で遊んだ", "engagement", 120],
  ["focused", "集中していた", "engagement", 125],
  ["all_smiles", "ずっと笑顔だった", "emotion", 130],
  ["energetic_to_end", "最後まで元気だった", "stamina", 135],
  ["tired_midway", "途中で疲れた", "stamina", 140],
  ["got_bored", "すぐ飽きた", "engagement", 145],
  ["was_scared", "怖がっていた", "emotion", 150],
  ["improved", "前より上手になった", "growth", 235],
] as const;

test("Migration 015は指定8タグをbehaviorとして指定順で追加する", () => {
  const actualRows = Array.from(
    migration.matchAll(
      /\('([^']+)', '([^']+)', '([^']+)', (\d+), 'behavior'\)/g,
    ),
    (match) => [match[1], match[2], match[3], Number(match[4])],
  );

  assert.deepEqual(actualRows, expectedRows);
});

test("Migration 015は既存タグを更新せずid競合時に何もしない", () => {
  assert.match(migration, /ON CONFLICT \(id\) DO NOTHING;/);
  assert.doesNotMatch(migration, /\b(?:UPDATE|DELETE|ALTER|DROP)\b/i);
});
