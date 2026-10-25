import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import ts from 'typescript';

const sql = readFileSync('supabase/migrations/021_odekake_soudan.sql', 'utf8');
const source = readFileSync('lib/soudan/types.ts', 'utf8');
const constants = {};
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } });
new Function('exports', compiled.outputText)(constants);
const tables = ['consultations', 'consultation_candidates', 'consultation_responses'];
const table = (name) => {
  const match = sql.match(new RegExp(`CREATE TABLE IF NOT EXISTS public\\.${name} \\(([\\s\\S]*?)\\n\\);`, 'i'));
  assert.ok(match, `${name} has idempotent creation`);
  return match[1];
};
const rpc = (name) => {
  const match = sql.match(new RegExp(`CREATE OR REPLACE FUNCTION public\\.${name}\\(([\\s\\S]*?)\\n\\$\\$;`, 'i'));
  assert.ok(match, `${name} exists`);
  return match[1];
};
const enumCheck = (body, field, values) => {
  const match = body.match(new RegExp(`CHECK \\(${field} IN \\(([^)]+)\\)\\)`, 'i'));
  assert.ok(match, `${field} has a check`);
  assert.deepEqual([...match[1].matchAll(/'([^']+)'/g)].map((m) => m[1]), values);
};

test('migration is additive, transactional, idempotent and has no destructive statement', () => {
  assert.doesNotMatch(sql, /\bDROP\b/i);
  assert.match(sql, /\bBEGIN;/);
  assert.match(sql, /COMMIT;\s*$/);
  assert.doesNotMatch(sql, /(?:ALTER TABLE|INSERT INTO|UPDATE|DELETE FROM) public\.(?:profiles|wishlists|visits|children|events|facilities)\b/i);
  for (const statement of sql.matchAll(/CREATE (?:UNIQUE )?INDEX ([^;]+);/gi)) assert.match(statement[1], /^IF NOT EXISTS /);
  for (const statement of sql.matchAll(/CREATE POLICY (\w+)/g)) assert.match(sql, new RegExp(`IF NOT EXISTS \\(SELECT 1 FROM pg_policies[^\\n]+policyname = '${statement[1]}'`));
  assert.match(sql, /pg_constraint[^\n]+consultations_decided_candidate_fk/);
  assert.equal([...sql.matchAll(/IF NOT EXISTS \(SELECT 1 FROM pg_trigger/g)].length, 3);
});

test('all tables have owner RLS and no direct anonymous/PUBLIC privilege', () => {
  for (const name of tables) {
    table(name);
    assert.match(sql, new RegExp(`ALTER TABLE public\\.${name} ENABLE ROW LEVEL SECURITY;`, 'i'));
  }
  const revokes = sql.match(/REVOKE ALL ON TABLE ([^;]+) FROM PUBLIC, anon, authenticated;/i);
  assert.ok(revokes);
  for (const name of tables) assert.ok(revokes[1].includes(`public.${name}`));
  for (const statement of sql.matchAll(/GRANT [^;]+;/gi)) {
    if (!/ON FUNCTION/i.test(statement[0])) assert.doesNotMatch(statement[0], /TO [^;]*(?:\banon\b|\bPUBLIC\b)/i);
  }
  assert.match(sql, /GRANT UPDATE \(status, resolved_at\) ON TABLE public.consultation_responses TO authenticated/);
  assert.doesNotMatch(sql, /GRANT[^;]*\bUPDATE\s*,[^;]*ON TABLE public.consultation_responses/);
  assert.match(sql, /WITH CHECK \(source = 'owner' AND EXISTS/);
});

test('RPCs pin definer search path, revoke PUBLIC execution and grant anonymous execution', () => {
  for (const name of ['soudan_shared_get', 'soudan_shared_add_response']) {
    const body = rpc(name);
    assert.match(body, /SECURITY DEFINER SET search_path = public, pg_temp/i);
    assert.doesNotMatch(body, /auth\.uid\(|RAISE/i);
    assert.match(sql, new RegExp(`REVOKE ALL ON FUNCTION public\\.${name}\\([^;]+\\) FROM PUBLIC;`));
    assert.match(sql, new RegExp(`GRANT EXECUTE ON FUNCTION public\\.${name}\\([^;]+\\) TO anon, authenticated;`));
    assert.match(body, /char_length\(p_token\) NOT BETWEEN 32 AND 128/);
    assert.match(body, /\^\[A-Za-z0-9_-\]\+\$/);
    assert.match(body, /encode\(sha256\(convert_to\(p_token,'utf8'\)\),'hex'\)/);
    assert.match(body, /share_enabled = true AND \(share_expires_at IS NULL OR share_expires_at > now\(\)\) AND status <> 'archived'/);
    assert.doesNotMatch(body, /'(?:user_id|share_token_hash|share_enabled|share_expires_at)'\s*,/);
    assert.doesNotMatch(body, /to_jsonb\(c\)|row_to_json\(c\)/i);
  }
  assert.match(rpc('soudan_shared_get'), /RETURN NULL/);
  assert.match(rpc('soudan_shared_add_response'), /FOR UPDATE;/);
  assert.match(sql, /'link', 'open'\) RETURNING id/);
  assert.match(sql, /x\.kind = 'unverified'/);
});

test('TypeScript allowlists exactly match SQL table CHECK values', () => {
  enumCheck(table('consultations'), 'status', constants.CONSULTATION_STATUSES);
  for (const [field, key] of [['kind', 'CANDIDATE_KINDS'], ['status', 'CANDIDATE_STATUSES']]) enumCheck(table('consultation_candidates'), field, constants[key]);
  for (const [field, key] of [['kind', 'RESPONSE_KINDS'], ['correction_field', 'CORRECTION_FIELDS'], ['reaction', 'REACTIONS'], ['status', 'RESPONSE_STATUSES'], ['source', 'RESPONSE_SOURCES']]) enumCheck(table('consultation_responses'), field, constants[key]);
});

test('TypeScript length/rate limits match SQL CHECKs and guards', () => {
  const limits = constants.LIMITS;
  assert.match(table('consultations'), new RegExp(`char_length\\(title\\) BETWEEN 1 AND ${limits.consultationTitle}\\)`));
  const candidates = table('consultation_candidates');
  assert.match(candidates, new RegExp(`char_length\\(title\\) BETWEEN 1 AND ${limits.candidateTitle}\\)`));
  for (const field of ['reason', 'research_note', 'concern', 'reject_reason']) assert.match(candidates, new RegExp(`char_length\\(${field}\\) BETWEEN 0 AND ${limits.note}\\)`));
  const responses = table('consultation_responses');
  assert.match(responses, new RegExp(`char_length\\(body\\) BETWEEN 0 AND ${limits.body}\\)`));
  assert.match(responses, new RegExp(`char_length\\(author_label\\) BETWEEN 1 AND ${limits.authorLabel}\\)`));
  assert.match(responses, new RegExp(`char_length\\(source_url\\) <= ${limits.sourceUrl}\\)`));
  assert.match(sql, new RegExp(`consultation_id = NEW.consultation_id\\) >= ${limits.candidates} THEN`));
  const add = rpc('soudan_shared_add_response');
  assert.match(add, new RegExp(`char_length\\(content\\) > ${limits.body} `));
  assert.match(add, new RegExp(`char_length\\(label\\) NOT BETWEEN 1 AND ${limits.authorLabel} `));
  assert.match(add, new RegExp(`char_length\\(p_source_url\\) > ${limits.sourceUrl} `));
  assert.match(add, new RegExp(`NOT BETWEEN ${limits.tokenMin} AND ${limits.tokenMax}`));
  assert.match(add, new RegExp(`interval '${limits.linkResponseWindowMinutes} minutes'\\) >= ${limits.linkResponsesPerWindow}`));
  assert.match(add, new RegExp(`source = 'link'\\) >= ${limits.linkResponsesTotal}`));
});
