import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { createRequire } from 'node:module';
import { test } from 'node:test';
import ts from 'typescript';

const nativeRequire = createRequire(import.meta.url);
const read = (file) => readFileSync(file, 'utf8');
function load(file, stubs = {}) {
  const source = read(file);
  const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } });
  const compiledModule = { exports: {} };
  const require = (id) => {
    if (Object.hasOwn(stubs, id)) return stubs[id];
    if (id.startsWith('.')) return load(resolve(dirname(file), `${id}.ts`), stubs);
    if (id.startsWith('@/')) return {};
    return nativeRequire(id);
  };
  new Function('require', 'module', 'exports', outputText)(require, compiledModule, compiledModule.exports);
  return compiledModule.exports;
}
const pagePath = 'app/soudan/[token]/page.tsx';
const { metadata, dynamic } = load(pagePath);

test('shared metadata is static, generic, and denies indexing/referrers for every result', () => {
  assert.equal(dynamic, 'force-dynamic');
  assert.equal(metadata.referrer, 'no-referrer');
  assert.deepEqual(metadata.robots, { index: false, follow: false, noarchive: true, googleBot: { index: false, follow: false, noarchive: true } });
  assert.deepEqual(metadata.title, { absolute: 'おでかけ相談 | メモリップ' });
  assert.equal(metadata.description, 'おでかけの候補と調べたことを、一緒に相談するページです。');
  for (const card of [metadata.openGraph, metadata.twitter]) {
    assert.equal(card.title, 'おでかけ相談 | メモリップ');
    assert.equal(card.description, 'おでかけの候補を一緒に相談。');
    assert.deepEqual(card.images, ['/opengraph-image.png']);
    assert.equal(card.url, undefined);
  }
  assert.doesNotMatch(read(pagePath), /generateMetadata/);
});

test('page and API both receive all privacy headers', async () => {
  const entries = await load('next.config.ts').default.headers();
  for (const source of ['/soudan/:path*', '/api/soudan/:path*']) {
    const headers = Object.fromEntries(entries.find((entry) => entry.source === source).headers.map((entry) => [entry.key, entry.value]));
    assert.equal(headers['Referrer-Policy'], 'no-referrer');
    assert.equal(headers['X-Robots-Tag'], 'noindex, nofollow, noarchive');
    assert.equal(headers['Cache-Control'], 'private, no-store');
  }
});

test('custom Cloudflare worker enforces headers even when generated middleware is skipped', async () => {
  const source = read('cloudflare/worker.js');
  const ast = ts.createSourceFile('worker.js', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  const helper = ast.statements.find((statement) => ts.isFunctionDeclaration(statement) && statement.name.text === 'applySoudanHeaders');
  assert.ok(helper);
  const applyHeaders = new Function(`${helper.getText(ast)}; return applySoudanHeaders;`)();
  for (const path of ['/soudan', '/soudan/test', '/soudan/test/', '/api/soudan', '/api/soudan/respond']) {
    const original = new Response('unavailable', { status: 404, headers: { 'Cache-Control': 'public, max-age=300' } });
    const response = applyHeaders(original, path);
    assert.equal(response.status, 404);
    assert.equal(await response.text(), 'unavailable');
    assert.equal(response.headers.get('Referrer-Policy'), 'no-referrer');
    assert.equal(response.headers.get('X-Robots-Tag'), 'noindex, nofollow, noarchive');
    assert.equal(response.headers.get('Cache-Control'), 'private, no-store');
    assert.equal(original.headers.get('Cache-Control'), 'public, max-age=300');
  }
  const other = new Response('other');
  assert.equal(applyHeaders(other, '/soudan-other'), other);
  assert.match(source, /return applySoudanHeaders\(response, new URL\(request.url\).pathname\)/);
});

test('sitemap excludes shared paths without blocking robots from reading noindex', () => {
  const config = nativeRequire('../next-sitemap.config.js');
  assert.ok(config.exclude.includes('/soudan/*'));
  for (const policy of config.robotsTxtOptions.policies) assert.equal(policy.disallow, undefined);
  assert.doesNotMatch(read('public/robots.txt'), /Disallow:.*soudan/i);
});

function files(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => entry.isDirectory() ? files(`${dir}/${entry.name}`) : [`${dir}/${entry.name}`]);
}
test('shared surface has no misleading visibility language and every external anchor is marked', () => {
  for (const file of [...files('app/soudan'), ...files('components/soudan')]) {
    const source = read(file);
    assert.doesNotMatch(source, /非公開|家族だけが見られる|家族限定|安全|秘密/, file);
    const externalAnchors = source.match(/<a\b[^>]*target="_blank"[^>]*>/g) || [];
    for (const anchor of externalAnchors) assert.match(anchor, /rel="noopener noreferrer nofollow"/, file);
  }
  const facts = read('components/soudan/SharedFacts.tsx');
  assert.match(facts, /rel="noopener noreferrer nofollow"/);
  assert.match(facts, /↗/);
  const source = read(pagePath);
  assert.match(source, /SOUDAN_COPY.visibility/);
  assert.match(source, /SOUDAN_COPY.forwarding/);
  assert.match(source, /SOUDAN_COPY.search/);
  assert.doesNotMatch(source, /cookies\(|console\.|\.from\(/);
  const anon = read('lib/soudan-anon.ts');
  assert.match(anon, /NEXT_PUBLIC_SUPABASE_ANON_KEY/);
  assert.match(anon, /persistSession: false, autoRefreshToken: false, detectSessionInUrl: false/);
  assert.doesNotMatch(anon + source + read('app/api/soudan/respond/route.ts'), /SERVICE_ROLE|supabase\/server|node:/);
});

test('shared navigation bypasses global auth refresh and third-party affiliate script', () => {
  for (const file of ['components/HeaderAuthButton.tsx', 'components/WishlistProvider.tsx']) {
    const source = read(file);
    assert.match(source, /usePathname\(\)\.startsWith\("\/soudan\/"\)/);
    assert.match(source, /useEffect\(\(\) => \{\s*if \(shared\) return;/);
  }
  assert.match(read('components/ValueCommerceLinkSwitch.tsx'), /if \(shared \|\|/);
  assert.doesNotMatch(read('middleware.ts'), /matcher:.*soudan/);
});

const { handleSharedResponse } = load('lib/soudan-respond.ts');
const valid = { token: 'a'.repeat(32), kind: 'comment', body: 'よさそう', author_label: 'パパ' };
const request = (input, options = {}) => new Request('https://example.test/api/soudan/respond', { method: 'POST', headers: { 'Content-Type': 'application/json', ...options.headers }, body: typeof input === 'string' ? input : JSON.stringify(input) });
for (const [label, input] of Object.entries({ longBody: { ...valid, body: 'あ'.repeat(501) }, scriptUrl: { ...valid, source_url: 'javascript:alert(1)' }, unknownKind: { ...valid, kind: 'other' }, badToken: { ...valid, token: 'x' }, noAuthor: { ...valid, author_label: '' }, invalidJson: '{broken', tooLarge: 'a'.repeat(8193) })) {
  test(`API rejects ${label} before RPC`, async () => {
    let calls = 0;
    const result = await handleSharedResponse(request(input), async () => { calls++; return { ok: true, id: 'id' }; });
    assert.equal(calls, 0);
    assert.ok(result.status >= 400);
    assert.equal((await result.json()).ok, false);
  });
}
test('API checks streamed UTF-8 bytes, JSON content type and content-length before RPC', async () => {
  for (const req of [request('あ'.repeat(3000)), request(valid, { headers: { 'Content-Type': 'text/plain' } }), request(valid, { headers: { 'Content-Length': '8193' } })]) {
    const result = await handleSharedResponse(req, async () => assert.fail('must not call RPC'));
    assert.ok([413, 415].includes(result.status));
  }
});
test('valid API input is normalized and mapped to explicit RPC args, errors reveal no SQL', async () => {
  let args;
  const response = await handleSharedResponse(request({ ...valid, author_label: ' パパ ', user_id: 'ignored' }), async (value) => { args = value; return { ok: true, id: 'not-exposed' }; });
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ok: true });
  assert.equal(args.p_author_label, 'パパ');
  assert.deepEqual(Object.keys(args).sort(), ['p_token', 'p_candidate_id', 'p_kind', 'p_body', 'p_author_label', 'p_correction_field', 'p_reaction', 'p_source_url', 'p_reply_to_id'].sort());
  assert.equal(response.headers.get('Cache-Control'), 'private, no-store');
  const limited = await handleSharedResponse(request(valid), async () => ({ ok: false, error: 'rate_limited' }));
  assert.equal(limited.status, 429);
  assert.match((await limited.json()).message, /少し時間/);
  const failure = await handleSharedResponse(request(valid), async () => { throw new Error(`SQL ${valid.token}`); });
  assert.equal(failure.status, 503);
  assert.doesNotMatch(await failure.text(), /SQL|aaaa/);
});

test('all invalid/null/error links render exactly the same unavailable result', async () => {
  const ReactDOMServer = nativeRequire('react-dom/server');
  const render = async (result, token = valid.token) => {
    const page = load(pagePath, {
      '@/lib/soudan-anon': { createSoudanAnonClient: () => ({ rpc: async () => result }) },
      '@/lib/soudan/token': load('lib/soudan/token.ts'),
      '@/lib/soudan-respond': load('lib/soudan-respond.ts'),
    }).default;
    return ReactDOMServer.renderToStaticMarkup(await page({ params: Promise.resolve({ token }) }));
  };
  assert.equal(await render({ data: null, error: null }), await render({ data: null, error: { message: 'not disclosed' } }));
  assert.equal(await render({ data: null, error: null }), await render(null, 'invalid'));
});

test('canon lookup resolves only requested references and falls back without invented address', async () => {
  let facilityLookups = 0;
  let eventLookups = 0;
  const facility = { name: '現在の施設', address: '正本の住所', prefecture: '東京都', is_free: true, url: 'https://example.test', source_checked_at: '2026-10-25' };
  const event = { title: '現在のイベント', date_label: '10月25日', source_checked_at: '2026-10-24', status: 'ended' };
  const { getSharedFacts } = load('lib/soudan-shared-facts.ts', {
    './facilities': { getFacilityBySlug: (slug) => { facilityLookups++; return slug === 'exists' ? facility : undefined; }, isFacilityVisible: (f) => !!f },
    './events': { getEventById: (id) => { eventLookups++; return id === 'exists' ? event : undefined; }, toEventView: (e) => ({ event: e, venueName: '会場', prefectureLabel: '東京都' }), getFacilityForEvent: () => facility },
  });
  const old = { title: '保存時の名称', hours: '保存時の時間', source_checked_at: '2026-10-01' };
  const current = await getSharedFacts({ kind: 'facility', facility_slug: 'exists', snapshot: old });
  assert.equal(current.snapshot.title, facility.name);
  assert.equal(current.snapshot.hours, null);
  assert.equal(current.snapshot.source_checked_at, '2026-10-25');
  assert.equal(current.address, facility.address);
  assert.ok(current.mapUrl.includes(encodeURIComponent(facility.address)));
  assert.equal(current.fromSnapshot, false);
  const removed = await getSharedFacts({ kind: 'facility', facility_slug: 'removed', snapshot: old });
  assert.deepEqual(removed, { snapshot: old, address: null, mapUrl: null, fromSnapshot: true });
  const currentEvent = await getSharedFacts({ kind: 'event', event_id: 'exists', snapshot: old });
  assert.equal(currentEvent.snapshot.title, event.title);
  assert.equal(currentEvent.snapshot.source_checked_at, '2026-10-24');
  assert.equal(currentEvent.address, facility.address);
  assert.equal((await getSharedFacts({ kind: 'event', event_id: 'removed', snapshot: old })).fromSnapshot, true);
  assert.equal(facilityLookups, 2);
  assert.equal(eventLookups, 2);
});

test('facts render pending corrections beside fields, preserve resolved records and guard URLs', () => {
  const { renderToStaticMarkup } = nativeRequire('react-dom/server');
  const Component = load('components/soudan/SharedFacts.tsx', { '@/lib/soudan/validation': load('lib/soudan/validation.ts') }).default;
  const html = renderToStaticMarkup(Component({ facts: { snapshot: { hours: '9〜17時', source_checked_at: '2026-10-25', official_url: 'javascript:alert(1)' }, fromSnapshot: false }, responses: [{ kind: 'correction', status: 'open', correction_field: 'hours' }, { kind: 'correction', status: 'resolved', correction_field: 'price' }] }));
  assert.match(html, /営業時間<span[^>]*>家族から訂正あり/);
  assert.doesNotMatch(html, /料金<span|javascript:/);
  assert.match(html, /公式確認日: 2026-10-25/);
});
