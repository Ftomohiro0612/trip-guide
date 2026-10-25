import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { posix } from 'node:path';
import { runInNewContext } from 'node:vm';
import { createHash } from 'node:crypto';
import test from 'node:test';
import ts from 'typescript';

const id = '00000000-0000-0000-0000-000000000001';
const candidateId = '00000000-0000-0000-0000-000000000002';
const responseId = '00000000-0000-0000-0000-000000000003';
const consultation = { id, user_id: 'owner', title: '週末', conditions: {}, status: 'open', share_enabled: false, share_token_hash: null, share_expires_at: null, decided_date: null };
const candidate = { id: candidateId, consultation_id: id, kind: 'facility', title: '施設', facility_slug: 'fixture' };

// Execute the real Server Actions against an in-memory PostgREST boundary. No network,
// service key, Next server, emitted files or production fixtures are used by this test.
function harness(steps = [], { user = { id: 'owner' } } = {}) {
  const calls = [];
  const invalidations = [];
  const db = {
    auth: { getUser: async () => ({ data: { user } }) },
    from(table) {
      const q = { table, operation: 'select', filters: [] };
      const query = {
        select(columns) { q.columns = columns; return query; },
        insert(value) { q.operation = 'insert'; q.value = value; return query; },
        update(value) { q.operation = 'update'; q.value = value; return query; },
        delete() { q.operation = 'delete'; return query; },
        eq(key, value) { q.filters.push(['eq', key, value]); return query; },
        is(key, value) { q.filters.push(['is', key, value]); return query; },
        order() { return query; }, limit() { return query; },
        single() { return query; }, maybeSingle() { return query; },
        then(resolve, reject) {
          return Promise.resolve().then(() => {
            calls.push(q);
            const step = steps.shift();
            assert.ok(step, `unexpected ${q.table}:${q.operation}`);
            assert.equal(q.table, step.table);
            assert.equal(q.operation, step.operation ?? 'select');
            step.verify?.(q);
            return { data: step.data ?? null, error: step.error ?? null };
          }).then(resolve, reject);
        },
      };
      return query;
    },
  };
  const cache = new Map();
  function load(file) {
    if (cache.has(file)) return cache.get(file).exports;
    const source = readFileSync(file, 'utf8');
    const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, esModuleInterop: true } }).outputText;
    const evaluatedModule = { exports: {} };
    cache.set(file, evaluatedModule);
    function require(specifier) {
      if (specifier === 'server-only') return {};
      if (specifier === 'next/cache') return { revalidatePath: (path) => invalidations.push(path) };
      if (specifier === '@/lib/supabase/server') return { createClient: async () => db };
      const relative = specifier.startsWith('@/') ? specifier.slice(2) : posix.join(posix.dirname(file), specifier);
      return load(`${relative}.ts`);
    }
    runInNewContext(compiled, { require, module: evaluatedModule, exports: evaluatedModule.exports, crypto, btoa, TextEncoder, URL, Date, process: { env: {} }, console: { log() {}, error() {} } }, { filename: file });
    return evaluatedModule.exports;
  }
  return { actions: load('app/mypage/soudan/actions.ts'), calls, invalidations, done: () => assert.equal(steps.length, 0) };
}
const ownerStep = (extra = {}) => ({ table: 'consultations', data: { ...consultation, ...extra }, verify: (q) => assert.ok(q.filters.some(([op, key, value]) => op === 'eq' && key === 'user_id' && value === 'owner')) });
const candidateStep = (extra = {}) => ({ table: 'consultation_candidates', data: { ...candidate, ...extra } });
const successPatch = (verify) => ({ table: 'consultations', operation: 'update', data: { id }, verify });

test('unauthenticated and foreign-id mutations cannot write; invalid inputs never reach DB', async () => {
  const anonymous = harness([], { user: null });
  assert.equal((await anonymous.actions.changeShare(id, 'issue')).ok, false);
  const foreign = harness([{ table: 'consultations', data: null }]);
  assert.equal((await foreign.actions.changeShare(id, 'issue')).ok, false);
  foreign.done();
  const invalid = harness();
  assert.equal((await invalid.actions.saveCandidate(id, null, { kind: 'external', title: 'x', external_url: 'javascript:alert(1)' })).ok, false);
  assert.equal((await invalid.actions.decideSoudan(id, candidateId, '2026-02-29')).ok, false);
  assert.equal(invalid.calls.length, 0);
});

test('share issuance returns a URL once, persists only its server-generated hash; stopping leaves no URL', async () => {
  let hash;
  const h = harness([ownerStep(), successPatch((q) => {
    assert.equal(q.value.share_enabled, true);
    assert.equal(q.value.share_expires_at, null);
    assert.deepEqual(Object.keys(q.value).sort(), ['share_enabled', 'share_expires_at', 'share_token_hash']);
    hash = q.value.share_token_hash;
  })]);
  const result = await h.actions.changeShare(id, 'issue');
  assert.equal(result.ok, true);
  const token = new URL(result.url).pathname.split('/').at(-1);
  assert.match(token, /^[A-Za-z0-9_-]{32}$/);
  assert.equal(hash, createHash('sha256').update(token).digest('hex'));
  assert.equal(JSON.stringify(h.calls).includes(token), false);
  assert.ok(h.invalidations.includes(`/mypage/soudan/${id}`));
  h.done();
  const stopped = harness([ownerStep({ share_token_hash: hash, share_enabled: true }), successPatch((q) => assert.deepEqual(JSON.parse(JSON.stringify(q.value)), { share_enabled: false }))]);
  const stop = await stopped.actions.changeShare(id, 'stop');
  assert.equal(stop.ok, true); assert.equal('url' in stop, false); stopped.done();
});

test('archived and expired shares cannot resume; archive stops the existing link', async () => {
  const archived = harness([ownerStep({ status: 'archived', share_token_hash: 'hash' })]);
  assert.equal((await archived.actions.changeShare(id, 'issue')).ok, false); archived.done();
  const expired = harness([ownerStep({ share_token_hash: 'hash', share_expires_at: '2000-01-01T00:00:00Z' })]);
  assert.equal((await expired.actions.changeShare(id, 'resume')).ok, false); expired.done();
  const archive = harness([ownerStep(), successPatch((q) => {
    assert.equal(q.value.status, 'archived'); assert.equal(q.value.share_enabled, false);
  })]);
  assert.equal((await archive.actions.changeConsultationState(id, 'archive')).ok, true); archive.done();
});

test('date conflicts cause no writes and are checked again against the current wishlist', async () => {
  const h = harness([ownerStep(), candidateStep(), { table: 'wishlists', data: { id: 'wish', planned_date: '2026-11-01' } }]);
  const result = await h.actions.decideSoudan(id, candidateId, '2026-11-02');
  assert.equal(result.conflict, '2026-11-01'); assert.equal(h.calls.some((q) => q.operation !== 'select'), false); h.done();
  const changed = harness([ownerStep(), candidateStep(), { table: 'wishlists', data: { id: 'wish', planned_date: '2026-11-03' } }]);
  assert.equal((await changed.actions.decideSoudan(id, candidateId, '2026-11-02', '2026-11-01')).conflict, '2026-11-03'); changed.done();
});

test('confirmed facility decision conditionally updates only planned_date and saves expiry', async () => {
  const h = harness([ownerStep(), candidateStep(), { table: 'wishlists', data: { id: 'wish', planned_date: '2026-11-01' } }, {
    table: 'wishlists', operation: 'update', data: { id: 'wish' }, verify(q) {
      assert.deepEqual(Object.keys(q.value), ['planned_date']);
      assert.equal(q.value.planned_date, '2026-11-02');
      assert.ok(q.filters.some(([op, key, value]) => op === 'eq' && key === 'planned_date' && value === '2026-11-01'));
    },
  }, successPatch((q) => {
    assert.equal(q.value.decided_candidate_id, candidateId);
    assert.equal(q.value.decided_date, '2026-11-02');
    assert.equal(q.value.share_expires_at, '2027-01-31T15:00:00.000Z');
  })]);
  assert.equal((await h.actions.decideSoudan(id, candidateId, '2026-11-02', '2026-11-01')).ok, true); h.done();
});

test('concurrent wishlist update does not get overwritten or mark the consultation decided', async () => {
  const h = harness([ownerStep(), candidateStep(), { table: 'wishlists', data: { id: 'wish', planned_date: null } }, { table: 'wishlists', operation: 'update', error: { code: 'PGRST116' } }]);
  assert.equal((await h.actions.decideSoudan(id, candidateId, '2026-11-02')).ok, false); h.done();
});

test('undated decisions preserve existing planned_date; event decisions never touch wishlists', async () => {
  const undated = harness([ownerStep(), candidateStep(), { table: 'wishlists', data: { id: 'wish', planned_date: '2026-11-01' } }, successPatch((q) => assert.equal(q.value.decided_date, null))]);
  assert.equal((await undated.actions.decideSoudan(id, candidateId, null)).ok, true); undated.done();
  const event = harness([ownerStep(), candidateStep({ kind: 'event', facility_slug: null, event_id: 'event' }), successPatch()]);
  assert.equal((await event.actions.decideSoudan(id, candidateId, '2026-11-02')).ok, true); event.done();
  assert.equal(event.calls.some((q) => q.table === 'wishlists'), false);
});

test('new wishlist row uses the chosen facility and date, and undated insert omits planned_date', async () => {
  for (const date of [null, '2026-11-02']) {
    const h = harness([ownerStep(), candidateStep(), { table: 'wishlists' }, { table: 'wishlists', operation: 'insert', verify(q) {
      assert.equal(q.value.user_id, 'owner'); assert.equal(q.value.facility_slug, 'fixture');
      if (date) assert.equal(q.value.planned_date, date);
      else assert.equal('planned_date' in q.value, false);
    } }, successPatch()]);
    assert.equal((await h.actions.decideSoudan(id, candidateId, date)).ok, true); h.done();
  }
});

test('resolving responses updates only status/time and reopening keeps the record', async () => {
  for (const operation of ['resolve', 'reopen']) {
    const h = harness([ownerStep(), { table: 'consultation_responses', data: { kind: 'correction' } }, { table: 'consultation_responses', operation: 'update', data: { id: responseId }, verify(q) {
      assert.deepEqual(Object.keys(q.value).sort(), ['resolved_at', 'status']);
      assert.equal(q.value.status, operation === 'resolve' ? 'resolved' : 'open');
      assert.equal(q.value.resolved_at === null, operation === 'reopen');
    } }]);
    assert.equal((await h.actions.changeResponse(id, responseId, operation)).ok, true); h.done();
  }
});

test('owner replies must target an unverified response on the same candidate; source is fixed', async () => {
  const input = { kind: 'finding', candidate_id: candidateId, reply_to_id: responseId, body: '確認できました', author_label: '作成者', source: 'link' };
  const mismatch = harness([ownerStep(), { table: 'consultation_responses', data: { candidate_id: null, kind: 'unverified' } }]);
  assert.equal((await mismatch.actions.addOwnerResponse(id, input)).ok, false); mismatch.done();
  const h = harness([ownerStep(), { table: 'consultation_responses', data: { candidate_id: candidateId, kind: 'unverified' } }, { table: 'consultation_responses', operation: 'insert', verify(q) {
    assert.equal(q.value.source, 'owner'); assert.equal(q.value.reply_to_id, responseId);
  } }]);
  assert.equal((await h.actions.addOwnerResponse(id, input)).ok, true); h.done();
});
