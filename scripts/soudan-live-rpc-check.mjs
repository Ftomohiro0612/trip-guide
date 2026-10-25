/** Run ONLY after Owner applies 021. Never uses service-role credentials for data/RPCs.
 * node scripts/soudan-live-rpc-check.mjs --json <result-file.json>
 * Results contain check names/statuses only; no credentials, tokens, or row contents.
 */
import { randomBytes, randomUUID, createHash } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

export async function runLiveCheck({ url, anonKey, serviceKey, fetchImpl = fetch }) {
  if (!url || !anonKey || !serviceKey) throw new Error('missing_environment');
  const origin = new URL(url);
  if (!['http:', 'https:'].includes(origin.protocol)) throw new Error('invalid_supabase_url');
  const results = { ok: false, checks: [], cleanup: [] };
  const users = [];
  const consultations = [];
  const token = randomBytes(24).toString('base64url');
  const hash = createHash('sha256').update(token).digest('hex');
  let a;
  const request = async (path, { method = 'GET', body, jwt = anonKey, admin = false } = {}) => {
    const response = await fetchImpl(new URL(path, origin), {
      method,
      signal: AbortSignal.timeout(30_000),
      headers: { apikey: admin ? serviceKey : anonKey, Authorization: `Bearer ${admin ? serviceKey : jwt}`, 'Content-Type': 'application/json', Prefer: 'return=representation' },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    const raw = await response.text();
    let data = null;
    try { data = raw ? JSON.parse(raw) : null; } catch { /* Never echo raw server output. */ }
    return { status: response.status, ok: response.ok, data };
  };
  const check = (name, condition) => {
    results.checks.push({ name, ok: !!condition });
    if (!condition) throw new Error(`check_failed:${name}`);
  };
  const rest = (table, query = '') => `/rest/v1/${table}${query}`;
  const addConsultation = async (title, extra = {}) => {
    const result = await request(rest('consultations'), { method: 'POST', jwt: a.jwt, body: { user_id: a.id, title, ...extra } });
    check(`create_${title}`, result.ok && !!result.data?.[0]?.id);
    const id = result.data[0].id;
    consultations.push(id);
    return id;
  };
  const patch = (id, body) => request(rest('consultations', `?id=eq.${id}`), { method: 'PATCH', jwt: a.jwt, body });
  const get = (p_token) => request('/rest/v1/rpc/soudan_shared_get', { method: 'POST', body: { p_token } });
  let c;
  let candidate;
  const add = (extra = {}) => request('/rest/v1/rpc/soudan_shared_add_response', { method: 'POST', body: {
    p_token: token, p_candidate_id: candidate, p_kind: 'comment', p_body: '確認メモ', p_author_label: '  家族  ', p_correction_field: null,
    p_reaction: null, p_source_url: null, p_reply_to_id: null, ...extra,
  } });
  const denied = (r) => !r.ok && r.data?.code === '42501';
  const noSecrets = (value) => {
    if (!value || typeof value !== 'object') return true;
    return Object.entries(value).every(([key, item]) => !['user_id', 'share_token_hash', 'share_enabled', 'share_expires_at'].includes(key) && noSecrets(item));
  };
  try {
    for (const label of ['A', 'B']) {
      const email = `soudan-check-${randomUUID()}@example.com`;
      const password = randomBytes(24).toString('base64url');
      const created = await request('/auth/v1/admin/users', { admin: true, method: 'POST', body: { email, password, email_confirm: true } });
      // Register cleanup before any subsequent assertion/sign-in can fail.
      if (created.ok && created.data?.id) users.push({ id: created.data.id });
      check(`temporary_user_${label}`, created.ok && !!created.data?.id);
      const signed = await request('/auth/v1/token?grant_type=password', { method: 'POST', body: { email, password } });
      check(`user_jwt_${label}`, signed.ok && !!signed.data?.access_token);
      users.at(-1).jwt = signed.data.access_token;
    }
    [a] = users;
    const b = users[1];
    for (const table of ['consultations', 'consultation_candidates', 'consultation_responses']) {
      const probe = await request(rest(table, '?select=__soudan_missing_column__&limit=0'), { jwt: a.jwt });
      check(`${table}_exists_42703_not_42P01`, !probe.ok && ['42703', 'PGRST204'].includes(probe.data?.code));
      check(`${table}_anon_select_denied`, denied(await request(rest(table, '?select=id&limit=1'))));
    }
    c = await addConsultation('primary', { share_enabled: true, share_token_hash: hash });
    const other = await addConsultation('other');
    const inserted = await request(rest('consultation_candidates'), { method: 'POST', jwt: a.jwt, body: [
      { consultation_id: c, kind: 'facility', facility_slug: 'soudan-test-facility', title: '候補1' },
      { consultation_id: c, kind: 'external', external_url: 'https://example.com/outing', title: '候補2' },
      { consultation_id: other, kind: 'event', event_id: 'soudan-test-event', title: '別の相談の候補' },
    ] });
    check('create_candidates', inserted.ok && inserted.data?.length === 3);
    candidate = inserted.data[0].id;
    const otherCandidate = inserted.data[2].id;
    for (const [method, body] of [['GET', undefined], ['PATCH', { title: 'forbidden' }], ['DELETE', undefined]]) {
      const r = await request(rest('consultations', `?id=eq.${c}&select=id`), { method, body, jwt: b.jwt });
      check(`B_cannot_${method}_A_consultation`, r.ok && Array.isArray(r.data) && r.data.length === 0);
    }
    for (const table of ['consultation_candidates', 'consultation_responses']) {
      const r = await request(rest(table, `?consultation_id=eq.${c}&select=id`), { jwt: b.jwt });
      check(`B_cannot_read_${table}`, r.ok && r.data?.length === 0);
    }
    const shared = await get(token);
    check('anon_get_valid', shared.ok && shared.data?.consultation?.id === c && shared.data.candidates.length === 2);
    check('shared_json_allowlist', noSecrets(shared.data));
    for (const [name, value] of [['wrong', randomBytes(24).toString('base64url')], ['short', 'short'], ['bad_characters', '!'.repeat(32)]]) {
      const r = await get(value);
      check(`anon_get_${name}_null`, r.ok && r.data === null);
    }
    for (const [name, state] of [['disabled', { share_enabled: false }], ['expired', { share_enabled: true, share_expires_at: '2000-01-01T00:00:00Z' }], ['archived', { share_expires_at: null, status: 'archived' }]]) {
      check(`set_${name}`, (await patch(c, state)).ok);
      const r = await get(token);
      check(`anon_get_${name}_null`, r.ok && r.data === null);
      const write = await add();
      check(`anon_write_${name}_invalid_link`, write.ok && write.data?.error === 'invalid_link');
    }
    check('restore_share', (await patch(c, { status: 'open', share_enabled: true, share_expires_at: null })).ok);
    const invalid = await add({ p_token: 'short' });
    check('anon_write_invalid_link', invalid.ok && invalid.data?.error === 'invalid_link');
    let unverified;
    let responseId;
    let count = 0;
    for (const kind of ['finding', 'correction', 'unverified', 'comment']) {
      const r = await add({ p_kind: kind, p_correction_field: kind === 'correction' ? 'hours' : null });
      check(`anon_write_${kind}`, r.ok && r.data?.ok === true && !!r.data.id);
      count++;
      responseId = r.data.id;
      if (kind === 'unverified') unverified = r.data.id;
    }
    for (const [name, extra] of [['reaction_only', { p_body: '', p_reaction: 'like' }], ['finding_reply', { p_kind: 'finding', p_reply_to_id: unverified }]]) {
      const r = await add(extra);
      check(name, r.ok && r.data?.ok === true);
      count++;
    }
    for (const [name, extra, error] of [
      ['long_body', { p_body: 'あ'.repeat(501) }, 'invalid_body'],
      ['script_url', { p_source_url: 'javascript:alert(1)' }, 'invalid_source_url'],
      ['other_candidate', { p_candidate_id: otherCandidate }, 'invalid_candidate'],
      ['misused_correction', { p_correction_field: 'price' }, 'invalid_correction_field'],
      ['wrong_reply_kind', { p_reply_to_id: unverified }, 'invalid_reply'],
      ['wrong_reply_target', { p_kind: 'finding', p_reply_to_id: responseId }, 'invalid_reply'],
      ['blank_author', { p_author_label: '　 ' }, 'invalid_author_label'],
      ['empty_body', { p_body: '' }, 'invalid_body'],
      ['bad_reaction', { p_reaction: 'other' }, 'invalid_reaction'],
      ['bad_kind', { p_kind: 'other' }, 'invalid_kind'],
    ]) {
      const r = await add(extra);
      check(`reject_${name}`, r.ok && r.data?.ok === false && r.data.error === error);
    }
    while (count < 30) {
      const r = await add();
      check(`rate_fill_${++count}`, r.ok && r.data?.ok === true);
    }
    const limited = await add();
    check('31st_response_rate_limited', limited.ok && limited.data?.error === 'rate_limited');
    const after = await get(token);
    check('link_rows_forced_open_and_trimmed', after.ok && after.data?.responses?.length === 30 && after.data.responses.every((r) => r.status === 'open' && r.source === 'link' && r.author_label === '家族'));
    check('owner_resolve_link_response', (await request(rest('consultation_responses', `?id=eq.${responseId}`), { method: 'PATCH', jwt: a.jwt, body: { status: 'resolved', resolved_at: new Date().toISOString() } })).ok);
    check('owner_cannot_rewrite_body', denied(await request(rest('consultation_responses', `?id=eq.${responseId}`), { method: 'PATCH', jwt: a.jwt, body: { body: 'forbidden' } })));
    for (const [method, body] of [['PATCH', { status: 'resolved' }], ['DELETE', undefined]]) {
      check(`anon_response_${method}_denied`, denied(await request(rest('consultation_responses', `?id=eq.${responseId}`), { method, body })));
    }
    results.ok = true;
  } catch (error) {
    // Only our fixed check names are safe to report; HTTP/network errors can contain URLs.
    results.error = error instanceof Error && error.message.startsWith('check_failed:') ? error.message : 'request_failed';
  } finally {
    for (const id of consultations) {
      try {
        const r = await request(rest('consultations', `?id=eq.${id}`), { method: 'DELETE', jwt: a.jwt });
        results.cleanup.push({ kind: 'consultation', ok: r.ok && r.data?.length === 1 });
      } catch { results.cleanup.push({ kind: 'consultation', ok: false }); }
    }
    for (const user of users.reverse()) {
      try {
        const r = await request(`/auth/v1/admin/users/${user.id}`, { method: 'DELETE', admin: true });
        results.cleanup.push({ kind: 'user', ok: r.ok });
      } catch { results.cleanup.push({ kind: 'user', ok: false }); }
    }
    if (results.cleanup.some((item) => !item.ok)) results.ok = false;
  }
  return results;
}

async function main() {
  try { process.loadEnvFile('.env.local'); } catch { /* Environment may be supplied by PM. */ }
  let result;
  try {
    result = await runLiveCheck({ url: process.env.NEXT_PUBLIC_SUPABASE_URL, anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY });
  } catch { result = { ok: false, error: 'invalid_or_missing_environment', checks: [], cleanup: [] }; }
  const jsonIndex = process.argv.indexOf('--json');
  if (jsonIndex !== -1) {
    const file = process.argv[jsonIndex + 1];
    if (!file || file.startsWith('--')) throw new Error('--json requires an output filename');
    await writeFile(file, `${JSON.stringify(result, null, 2)}\n`, { flag: 'wx' });
  }
  console.log(JSON.stringify(result));
  process.exitCode = result.ok ? 0 : 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(() => { console.error('soudan_check_output_failed'); process.exitCode = 1; });
}
