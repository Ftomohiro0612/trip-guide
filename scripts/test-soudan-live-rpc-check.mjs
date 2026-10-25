// Harness dry-run only: scripted HTTP responses do NOT verify PostgreSQL/RLS semantics.
import assert from 'node:assert/strict';
import test from 'node:test';
import { runLiveCheck } from './soudan-live-rpc-check.mjs';

const ids = Array.from({ length: 8 }, (_, i) => `00000000-0000-0000-0000-${String(i + 1).padStart(12, '0')}`);
const [userA, userB, consultation, otherConsultation, candidate, externalCandidate, otherCandidate, response] = ids;
const anonKey = 'mock-anon-key';
const serviceKey = 'mock-service-key';

function plan() {
  const calls = [];
  const push = (method, path, role, data, status = 200) => calls.push({ method, path, role, data, status });
  const rpcGet = (data) => push('POST', '/rest/v1/rpc/soudan_shared_get', 'anon', data);
  const rpcAdd = (data) => push('POST', '/rest/v1/rpc/soudan_shared_add_response', 'anon', data);
  const patch = () => push('PATCH', '/rest/v1/consultations', 'A', [{ id: consultation }]);
  for (const [id, role] of [[userA, 'A'], [userB, 'B']]) {
    push('POST', '/auth/v1/admin/users', 'service', { id });
    push('POST', '/auth/v1/token', 'anon', { access_token: `mock-jwt-${role}` });
  }
  for (const table of ['consultations', 'consultation_candidates', 'consultation_responses']) {
    push('GET', `/rest/v1/${table}`, 'A', { code: '42703' }, 400);
    push('GET', `/rest/v1/${table}`, 'anon', { code: '42501' }, 401);
  }
  push('POST', '/rest/v1/consultations', 'A', [{ id: consultation }]);
  push('POST', '/rest/v1/consultations', 'A', [{ id: otherConsultation }]);
  for (const id of [candidate, externalCandidate, otherCandidate]) push('POST', '/rest/v1/consultation_candidates', 'A', [{ id }]);
  for (const method of ['GET', 'PATCH', 'DELETE']) push(method, '/rest/v1/consultations', 'B', []);
  for (const table of ['consultation_candidates', 'consultation_responses']) push('GET', `/rest/v1/${table}`, 'B', []);
  rpcGet({ consultation: { id: consultation }, candidates: [{ id: candidate }, { id: externalCandidate }], responses: [] });
  for (let i = 0; i < 3; i++) rpcGet(null);
  for (let i = 0; i < 3; i++) { patch(); rpcGet(null); rpcAdd({ ok: false, error: 'invalid_link' }); }
  patch();
  rpcAdd({ ok: false, error: 'invalid_link' });
  for (let i = 0; i < 6; i++) rpcAdd({ ok: true, id: response });
  for (const error of ['invalid_body', 'invalid_source_url', 'invalid_candidate', 'invalid_correction_field', 'invalid_reply', 'invalid_reply', 'invalid_author_label', 'invalid_body', 'invalid_reaction', 'invalid_kind']) rpcAdd({ ok: false, error });
  for (let i = 0; i < 24; i++) rpcAdd({ ok: true, id: response });
  rpcAdd({ ok: false, error: 'rate_limited' });
  rpcGet({ consultation: { id: consultation }, candidates: [], responses: Array.from({ length: 30 }, () => ({ status: 'open', source: 'link', author_label: '家族' })) });
  push('PATCH', '/rest/v1/consultation_responses', 'A', [{ id: response }]);
  push('PATCH', '/rest/v1/consultation_responses', 'A', { code: '42501' }, 403);
  for (const method of ['PATCH', 'DELETE']) push(method, '/rest/v1/consultation_responses', 'anon', { code: '42501' }, 401);
  for (const id of [consultation, otherConsultation]) push('DELETE', '/rest/v1/consultations', 'A', [{ id }]);
  for (const id of [userB, userA]) push('DELETE', `/auth/v1/admin/users/${id}`, 'service', {});
  return calls;
}

function scriptedFetch(calls) {
  return async (url, init) => {
    const expected = calls.shift();
    assert.ok(expected, 'no unexpected network call');
    assert.equal(init.method, expected.method);
    assert.equal(url.origin, 'https://mock.invalid');
    assert.equal(url.pathname, expected.path);
    const key = expected.role === 'service' ? serviceKey : anonKey;
    const jwt = expected.role === 'service' ? serviceKey : expected.role === 'anon' ? anonKey : `mock-jwt-${expected.role}`;
    assert.equal(init.headers.apikey, key);
    assert.equal(init.headers.Authorization, `Bearer ${jwt}`);
    if (expected.role === 'service') {
      assert.match(url.pathname, /^\/auth\/v1\/admin\/users(?:\/[^/]+)?$/);
      assert.ok(['POST', 'DELETE'].includes(init.method));
    }
    if (init.method === 'POST' && url.pathname === '/rest/v1/consultation_candidates') {
      const row = JSON.parse(init.body);
      assert.equal(Array.isArray(row), false, 'each candidate must be sent as one object');
      assert.deepEqual(Object.keys(row).sort(), ['consultation_id', 'kind', 'title', { facility: 'facility_slug', external: 'external_url', event: 'event_id' }[row.kind]].sort());
      assert.equal(row.consultation_id, row.kind === 'event' ? otherConsultation : consultation);
    }
    return new Response(JSON.stringify(expected.data), { status: expected.status });
  };
}

test('mock dry-run traverses every live-check branch and cleans up, without network', async () => {
  const calls = plan();
  const result = await runLiveCheck({ url: 'https://mock.invalid', anonKey, serviceKey, fetchImpl: scriptedFetch(calls) });
  assert.equal(result.ok, true, JSON.stringify(result));
  assert.equal(calls.length, 0);
  assert.equal(result.cleanup.length, 4);
  assert.ok(result.checks.length > 70);
  assert.doesNotMatch(JSON.stringify(result), /mock-(anon|service|jwt)|00000000-|share_token_hash/);
});

test('partial sign-in failure still deletes every created user', async () => {
  const calls = [
    { method: 'POST', path: '/auth/v1/admin/users', role: 'service', data: { id: userA }, status: 200 },
    { method: 'POST', path: '/auth/v1/token', role: 'anon', data: { message: 'untrusted secret error' }, status: 400 },
    { method: 'DELETE', path: `/auth/v1/admin/users/${userA}`, role: 'service', data: {}, status: 200 },
  ];
  const result = await runLiveCheck({ url: 'https://mock.invalid', anonKey, serviceKey, fetchImpl: scriptedFetch(calls) });
  assert.equal(result.ok, false);
  assert.equal(result.error, 'check_failed:user_jwt_A');
  assert.deepEqual(result.cleanup, [{ kind: 'user', ok: true }]);
  assert.equal(calls.length, 0);
  assert.equal(JSON.stringify(result).includes('untrusted secret error'), false);
});

test('network failures and cleanup failures never expose credentials or server detail', async () => {
  const result = await runLiveCheck({ url: 'https://mock.invalid', anonKey, serviceKey, fetchImpl: async () => { throw new Error(`network ${serviceKey}`); } });
  assert.equal(result.ok, false);
  assert.equal(result.error, 'request_failed');
  assert.equal(JSON.stringify(result).includes(serviceKey), false);
  const calls = plan();
  calls.at(-1).status = 500;
  const failedCleanup = await runLiveCheck({ url: 'https://mock.invalid', anonKey, serviceKey, fetchImpl: scriptedFetch(calls) });
  assert.equal(failedCleanup.ok, false);
  assert.equal(failedCleanup.cleanup.at(-1).ok, false);
});
