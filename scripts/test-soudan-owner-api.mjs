import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { posix } from 'node:path';
import { runInNewContext } from 'node:vm';
import test from 'node:test';
import ts from 'typescript';

const id = '00000000-0000-0000-0000-000000000001';
const valid = { kind: 'facility', reference: 'fixture', destination: id };
const parent = { id, title: '週末', status: 'open' };
const facility = { slug: 'fixture', name: '施設', prefecture: '東京都', url: 'https://example.test', is_free: true };
const event = { id: 'fixture', title: 'イベント', status: 'scheduled', date_label: '10月25日', official_url: 'https://example.test' };
const request = (input = valid, headers = {}) => new Request('https://example.test/api/soudan/candidates', {
  method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: typeof input === 'string' ? input : JSON.stringify(input),
});

// Run the real handlers and shared business logic with a Cookie-client DB boundary.
function harness(steps = [], { user = { id: 'owner' }, authError = false } = {}) {
  let authCalls = 0;
  const calls = [], invalidations = [], lookups = [];
  const db = {
    auth: { async getUser() { authCalls++; if (authError) throw new Error('private backend detail'); return { data: { user } }; } },
    from(table) {
      const call = { table, operation: 'select', filters: [] };
      const q = {
        select() { return q; }, insert(value) { call.operation = 'insert'; call.value = value; return q; },
        update(value) { call.operation = 'update'; call.value = value; return q; }, delete() { call.operation = 'delete'; return q; },
        eq(key, value) { call.filters.push([key, value]); return q; }, order() { return q; }, limit() { return q; }, single() { return q; },
        then(resolve, reject) {
          return Promise.resolve().then(() => {
            calls.push(call);
            const step = steps.shift();
            assert.ok(step, `unexpected ${table}:${call.operation}`);
            assert.equal(table, step.table); assert.equal(call.operation, step.operation ?? 'select');
            step.verify?.(call);
            return { data: step.data ?? null, error: step.error ?? null };
          }).then(resolve, reject);
        },
      };
      return q;
    },
  };
  const cache = new Map();
  function load(file) {
    if (cache.has(file)) return cache.get(file).exports;
    const compiled = ts.transpileModule(readFileSync(file, 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, esModuleInterop: true } }).outputText;
    const mod = { exports: {} }; cache.set(file, mod);
    function require(specifier) {
      if (specifier === 'server-only') return {};
      if (specifier === 'next/cache') return { revalidatePath: (path) => invalidations.push(path) };
      if (specifier === '@/lib/supabase/server') return { createClient: async () => db };
      if (specifier === '@/lib/facilities') return { getFacilityBySlug: (slug) => { lookups.push(slug); return facility; }, isFacilityVisible: () => true };
      if (specifier === '@/lib/events') return { getEventById: (id) => { lookups.push(id); return event; }, toEventView: (event) => ({ event, venueName: '会場', prefectureLabel: '東京都' }) };
      return load(`${specifier.startsWith('@/') ? specifier.slice(2) : posix.join(posix.dirname(file), specifier)}.ts`);
    }
    runInNewContext(compiled, { require, module: mod, exports: mod.exports, Request, Response, TextDecoder, TextEncoder, URL, Date }, { filename: file });
    return mod.exports;
  }
  return { post: load('app/api/soudan/candidates/route.ts').POST, get: load('app/api/soudan/destinations/route.ts').GET,
    calls, invalidations, lookups, get authCalls() { return authCalls; }, done() { assert.equal(steps.length, 0); } };
}

for (const [label, input] of Object.entries({ invalidJson: '{broken', null: null, array: [], kind: { ...valid, kind: 'external' },
  longReference: { ...valid, reference: 'a'.repeat(301) }, emptyReference: { ...valid, reference: '' }, referenceType: { ...valid, reference: 1 },
  destination: { ...valid, destination: 'not-a-uuid' }, missingDestination: { kind: 'facility', reference: 'fixture' } })) {
  test(`candidate API rejects ${label} with 400 before authentication or writes`, async () => {
    const h = harness();
    const response = await h.post(request(input));
    assert.equal(response.status, 400); assert.equal((await response.json()).ok, false);
    assert.equal(h.authCalls, 0); assert.equal(h.calls.length, 0); assert.equal(h.lookups.length, 0);
  });
}

test('candidate API enforces actual UTF-8 bytes, declared size, and JSON content type', async () => {
  for (const [req, status] of [[request('a'.repeat(8193)), 413], [request('あ'.repeat(3000)), 413],
    [request(valid, { 'Content-Length': '8193' }), 413], [request(valid, { 'Content-Type': 'text/plain' }), 415]]) {
    const h = harness(); const response = await h.post(req);
    assert.equal(response.status, status); assert.equal(h.authCalls, 0); assert.equal(h.calls.length, 0);
  }
  const h = harness([], { user: null });
  assert.equal((await h.post(request(JSON.stringify(valid).padEnd(8192, ' '), { 'Content-Type': 'application/json; charset=utf-8' }))).status, 401);
});

test('both owner APIs return 401 JSON for anonymous sessions without canon lookup or DB writes', async () => {
  const h = harness([], { user: null });
  for (const response of [await h.get(), await h.post(request())]) {
    assert.equal(response.status, 401);
    assert.deepEqual(await response.json(), { ok: false, error: 'ログインしてください。' });
    assert.equal(response.headers.get('Cache-Control'), 'private, no-store');
  }
  assert.equal(h.authCalls, 2); assert.equal(h.calls.length, 0); assert.equal(h.lookups.length, 0);
});

test('destinations use owner/open filters and retain response shape and order', async () => {
  const h = harness([{ table: 'consultations', data: [{ ...parent, updated_at: '2026-10-25' }], verify(q) {
    assert.deepEqual(q.filters, [['user_id', 'owner'], ['status', 'open']]);
  } }]);
  const response = await h.get();
  assert.equal(response.status, 200); assert.deepEqual(await response.json(), { ok: true, items: [{ ...parent, updated_at: '2026-10-25' }] }); h.done();
});

test('candidate API preserves facility/event snapshots, owner check, sort order and invalidation', async () => {
  for (const kind of ['facility', 'event']) {
    const h = harness([{ table: 'consultations', data: parent, verify(q) { assert.deepEqual(q.filters, [['id', id], ['user_id', 'owner']]); } },
      { table: 'consultation_candidates', data: [{ sort_order: 4 }] }, { table: 'consultation_candidates', operation: 'insert', verify(q) {
        assert.equal(q.value.kind, kind); assert.equal(q.value.consultation_id, id); assert.equal(q.value.sort_order, 5);
        assert.equal(q.value.snapshot.title, kind === 'facility' ? facility.name : event.title);
        assert.equal(q.value[kind === 'facility' ? 'facility_slug' : 'event_id'], 'fixture');
      } }, { table: 'consultations', operation: 'update' }]);
    const response = await h.post(request({ ...valid, kind, user_id: 'ignored', snapshot: { title: 'ignored' } }));
    assert.equal(response.status, 200); assert.deepEqual(await response.json(), { ok: true, id, title: parent.title, created: false });
    assert.deepEqual(h.invalidations, ['/mypage/soudan', `/mypage/soudan/${id}`]); h.done();
  }
});

test('auto-created consultation rolls back on insert/order errors and preserves duplicate/limit messages', async () => {
  for (const [error, message, orderError] of [[{ code: '23505' }, 'すでに入っています', false],
    [{ code: '23514', message: 'candidate limit reached' }, '1つの相談に入れられる候補は30件までです', false],
    [{ code: 'unavailable' }, '保存できませんでした。もう一度お試しください。', true]]) {
    const h = harness([{ table: 'children', data: [] }, { table: 'consultations', operation: 'insert', data: parent },
      { table: 'consultation_candidates', ...(orderError ? { error } : { data: [] }) },
      ...(!orderError ? [{ table: 'consultation_candidates', operation: 'insert', error }] : []),
      { table: 'consultations', operation: 'delete', verify(q) { assert.deepEqual(q.filters, [['id', id]]); } }]);
    const response = await h.post(request({ ...valid, destination: null }));
    assert.deepEqual(await response.json(), { ok: false, error: message }); assert.equal(h.invalidations.length, 0); h.done();
  }
});

test('owner APIs hide unexpected backend errors', async () => {
  const h = harness([], { authError: true });
  for (const response of [await h.get(), await h.post(request())]) {
    assert.equal(response.status, 503); assert.doesNotMatch(await response.text(), /private backend/);
  }
});

test('public facility/event component graph never imports page Server Actions', () => {
  const visited = new Set();
  function inspect(file) {
    if (visited.has(file)) return;
    visited.add(file);
    const source = readFileSync(file, 'utf8');
    const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    function visit(node) {
      if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
        const specifier = node.moduleSpecifier.text;
        const base = specifier.startsWith('@/') ? specifier.slice(2) : posix.normalize(posix.join(posix.dirname(file), specifier));
        assert.doesNotMatch(base, /^app\/(?:.*\/)?actions(?:\.[cm]?[jt]sx?)?$/, `${file} imports a page Server Action`);
        if (!node.importClause?.isTypeOnly && base.startsWith('components/')) {
          const target = [base, `${base}.tsx`, `${base}.ts`, `${base}/index.tsx`].find((path) => existsSync(path) && /\.[jt]sx?$/.test(path));
          if (target) inspect(target);
        }
      }
      ts.forEachChild(node, visit);
    }
    visit(ast);
  }
  for (const file of ['components/FacilityActionButtons.tsx', 'components/EventCard.tsx', 'components/SoudanAddButton.tsx']) inspect(file);
  const button = readFileSync('components/SoudanAddButton.tsx', 'utf8');
  assert.doesNotMatch(button, /@\/app\/mypage\/soudan\/actions/);
  for (const api of ['destinations', 'candidates']) assert.ok(button.includes(`fetch("/api/soudan/${api}"`));
});
