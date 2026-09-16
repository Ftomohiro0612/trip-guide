# MEM-ACT-001 browser verification

Run from this worktree's root. Playwright is intentionally installed outside the
repository; `package.json` and `package-lock.json` are unchanged.

```powershell
$qa = Join-Path $env:TEMP 'memorips-activation-qa-20260916'
New-Item -ItemType Directory -Path $qa -Force
Push-Location $qa
npm install playwright
npx playwright install chromium
Pop-Location
```

The recorded runs used Node 24, Chromium, viewport 390×844, Asia/Tokyo, a local
production build, and these **synthetic local values** in ignored `.env.local`:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=local-activation-test-only
```

Start `node scripts/activation-qa/auth-fixture.mjs` in one terminal and
`npm run start -- -p 3100` after `npm run build` in another. The fixture binds
only to loopback and keeps synthetic wishlist changes in memory. It does not
implement real authentication and must never be used as a deployed backend.

```powershell
node scripts/activation-qa/capture.mjs after
node scripts/activation-qa/verify-activation.mjs
node scripts/activation-qa/compare-evidence.mjs
```

`QA_BASE` optionally selects another local port. `before-flow.mjs` and
`capture.mjs before` target the unchanged baseline build. Do not run those
against the implementation and overwrite the committed before evidence.

`verify-activation` uses real rendered application components and browser
navigation. Guest contexts have no auth cookie. Authenticated contexts have a
synthetic Supabase session and use the local fixture for session/user and
wishlist responses. It checks registration URL + same-tab draft preservation,
then establishes the local session and checks the real save form's restoration
banner. External email/password/OAuth delivery and Production database writes
are outside this test.

The evidence records every named consumer, mandatory-field disabled states,
HTML validity, date, selected tag, draft, actual recommendation links, and
authenticated destinations. Recommendations must exist in the Product canon,
match the selected reaction tag, and exclude the recorded facility. The photo
import test uses a synthetic one-pixel PNG and never presses save/upload.

`compare-evidence` checks link multiplicities, existing count labels, metadata,
JSON-LD, and sitemap URL sets against the committed baseline observations and
`183801e8`. Run it before restoring incidental sitemap `lastmod` changes.
