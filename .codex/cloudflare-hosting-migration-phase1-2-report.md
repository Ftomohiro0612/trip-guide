# Memorip Cloudflare hosting migration — Phase 1〜2 report

> 実施日: 2026-09-12〜13 (JST)
> branch: `codex/cloudflare-workers-migration-20260828`
> status: **Phase 1〜3完了、Phase 4はValueCommerce管理画面確認のみ残存**
> production DNS: **Cloudflareへ切替済み（両zone Active）**

## 結論

Next.js 16.3.3の商品挙動を維持するため、Cloudflareが案内するbetaの
vinextではなく、既存の`next build`を使う`@opennextjs/cloudflare` 1.20.4を
採用した。公開SSGページと施設画像をWorkers Static Assetsへ移し、ISR、
Vercel Image Optimization、公開assetのVercel origin transferへの依存を除去した。

Cloudflare temporary deploymentと本番相当E2Eは完了した。
ただし実Worker Traceで、認証済みSSRがFreeの10ms CPU/requestを継続的に超えた。
同じ`/mypage/wishlist`を連続実行して`637ms / 68ms / 56ms`、
`/auth/callback`で`231ms`を記録した。Cloudflareの一時的超過許容により応答は
成功したが、公式仕様は「継続的に上限へ到達すると実行をterminate」としているため、
**月額固定費0円で安全に収まるという受け入れ条件は満たさない**。

2026-09-12のOwner判断により、商品中核の大規模再設計は行わずWorkers Paidを採用した。
Cloudflare Dashboardで`Workers Paid / Active`を実確認し、本体Workerに`cpu_ms: 3000`、
301専用Workerに`cpu_ms: 50`の上限を設定した。これにより実測最大637msへ十分な余裕を
持たせつつ、runaway CPUをrequest単位で制限する。認証・SSR・検索・Supabase data modelは
変更していない。

## Cloudflare account / deployment

- Account email: `fic.investment2020@gmail.com`
- Account name: `Fic.investment2020@gmail.com's Account`
- Account ID: `c3695ab3744fbad04ca5f0bd8c31e5a0`
- Compute plan: Workers Paid（Active、次回更新 2026-10-12）
- Zone plan: Free（DNS/CDN。追加の有料zone機能なし）
- Worker: `memorip`
- Temporary URL: <https://memorip.fic-investment2020.workers.dev>
- Production URL: <https://memorips.com>
- Redirected legacy URL: <https://trip-guide.net>
- Latest verified version: `8761f55a-58b3-4eca-a496-e85e62a2fcb9`
- Wrangler OAuth credential: repo外の暗号化file + Windows Credential Managerに保存。
  token/service keyはcommitしていない。

## vinext compatibility実測とadapter選定

`npx --yes vinext check`を現repoで実行した結果は83% compatible、
19 supported、2 partial、3 issuesだった。

- `next/font/google`: self-hosted build outputではなくCDN挙動になるpartial差分
- `next/image`: `remotePatterns`とCloudflare側画像処理の挙動差
- Viteに必要な`"type": "module"`が未設定で、repo/script全体のESM化が必要
- generated OpenNext artifactを含む`next/dist/server/next-server.js`検出
- CommonJS globals (`__dirname`, `__filename`)検出
- 現行Next.js middleware conventionとの差分

vinextはCloudflare公式上もbetaであり、font/image/ESM移行に商品・build挙動の差がある。
「推奨だから」という理由で採用せず、Next.jsのproduction build semanticsを維持する
OpenNextを選択した。

## migration architecture

### 公開ページ / URL / SEO

- Next production buildで生成した5,962 route中、実HTML 5,907件をversioned Static
  Assets用に`.html` assetとしてstage。公開URLはextensionlessのまま内部rewriteし、
  `Content-Type: text/html`を維持。
- TOP、施設詳細、イベント、都道府県、legal、画像、JS/CSS、robots、sitemapを
  Worker実行なしで直接配信。検索条件をserverで解決する施設一覧/tag/categoryは
  商品挙動維持のためOpenNext Workerで配信。
- 既存URLは変更しない。
- metadata、canonical、structured data、GA、affiliate CTA、PR表示をbuild outputに維持。
- `/tag/indoor-rainy -> /tag/rainy-day` 308、trailing slash除去308、
  `www.trip-guide.net -> trip-guide.net` 301をWorker入口で維持。
- client navigationがRSC companionを要求しないよう、直接static routeはdocument navigationに統一。

### 動的機能

- OpenNext WorkerがNext Route Handlers、Supabase auth callback、認証済みmypage SSR、
  server actionsを維持。
- Supabase project/database/storage/RLSは既存backendをそのまま利用。データ移行なし。
- 大容量canonはWorker bundleへ重複内包せず、14個のprivate static asset chunkとして分離。
- runtime canonを不要とするauth/一部mypage/avatar routeではloadしない。
- Supabase middlewareは`/mypage`だけlazy-loadし、公開API cold startから除外。
- R2/KV/D1/Queues/Durable Objects等の新規依存なし。

### 画像 / sharp非互換の解決

Workers runtimeでnative addonの`sharp`を実行しない構成へ変更した。

- 施設画像: build時に`sharp`で最大1600px、JPEG/WebP quality 82へ最適化し、
  Static Assetsから原寸URLで直接配信。
- Next Image Optimization: `images.unoptimized = true`。`/_next/image`を通常導線で使用しない。
- Supabase avatar等remote image: Supabase URLを直接配信し、request-time変換なし。
- 子どもavatar upload: Cloudflare Images bindingで`info()`によるJPEG/PNG/WebP検証、
  64M pixels上限、512x512 cover、JPEG quality 86を適用してから既存Supabase Storageへ保存。
- Images bindingが利用不能、またはFree変換枠超過(code 9422)では503とし、
  課金へ自動移行しない。
- `sharp`はbuild-time devDependencyとしてのみ残した。

ローカル`wrangler dev`では1200x800入力が512x512 JPEG 40,989 bytesへ変換された。
preview E2Eでは42,542 bytes JPEGのupload/download/deleteに成功し、
不正画像は400になった。見た目、cover crop、保存先、read/write contractを維持している。

## Production-equivalent build / test

- Next.js: 16.3.3
- `@opennextjs/cloudflare`: 1.20.4
- Wrangler: 4.131.1
- Next production build: PASS（5,962 pages）
- OpenNext Cloudflare build: PASS
- `wrangler dev`: PASS
- TypeScript `tsc --noEmit`: PASS
- targeted ESLint for changed source: PASS
- production data gates: PASS
  - event validation 0 error（13 stale-source warnings）
  - regular event 0 error
  - facility content 0 error
  - Rakuten 255 actions
  - Asoview validation gates PASS
  - ValueCommerce LinkSwitch static validation PASS
- combined existing test suite: 118/119 PASS
  - 1件は既存のcrosslink snapshotが4,704 facilitiesを期待する一方、
    origin/main dataが5,800件であるstale fixture。migration差分ではない。
- full-repo ESLint: 約4GB heapでOOM。変更sourceのtargeted lintは0 error。

## Free tier実測

Cloudflare公式の現行Free上限とactual output:

| 項目 | Free上限 | Memorip実測 | 判定 |
|---|---:|---:|---|
| Worker requests | 100,000/day | Vercel Functions平均約3,350/day、peak 46,776/day | GREEN（53,224/day margin） |
| CPU | 10ms/request | unauth mypage 4ms、search 18ms、auth callback 231ms、auth SSR 56〜637ms | **RED** |
| Memory | 128MB/isolate | dashboard P50 101.33MB、P90 110.67MB、P99 122.37MB | AMBER（上限内だが余白小） |
| Static assets | 20,000/version | Wrangler enumerated 8,244 | GREEN（41.22%、11,756余裕） |
| Asset file size | 25MiB/file | max 3,740,136 bytes | GREEN |
| Worker bundle | 64MiB | 21,270.24KiB raw / 2,922.17KiB gzip | GREEN |
| Startup | 1s | 27ms | GREEN |
| Environment variables | 64、各5KB | public build config 7種 + bindings 2種 | GREEN |

Static assetの物理file数は8,161、Wranglerがversion upload時に数えた実数は8,244。
Cloudflare上限との判定には保守的にWrangler実数を採用した。

直近Vercel 30日profileはEdge 513,390（平均17,113/day、peak 152,739/day）、
Functions 100,494（平均3,350/day、peak 46,776/day）。Static AssetsはWorker invocationへ
算入されないため、Edge peakが100,000/dayを超えてもWorker daily limitを消費しない。

一方CPUはcold/warm双方で10msを超え、公式の「infrequentな超過」には分類できない。
previewで0 exceededCpuだったことは、flexibilityが働いた証拠であってFree適合の証拠ではない。

## Vercel quota対応表

| Vercelで消費したもの | 移行後 | quota事故防止 |
|---|---|---|
| ISR Reads 3.436M | versioned Static Assets | time-based ISRなし。更新はbuild/deployのみ |
| Fast Origin Transfer 30.22GB | Workers Static Assets | 公開HTML/JS/CSS/画像はWorker/Next originを通さない |
| Fast Data Transfer 24.79GB | Cloudflare static delivery | Static Assetsは無料・unlimitedの対象 |
| Image Optimization 5.1k transforms | static/direct image + avatar upload-time transform | 通常閲覧時のtransformをゼロ化。avatarのみImages Free 5,000 unique/month、超過時503 |

## Preview verification

最新versionで以下を確認済み。

- TOP 200
- facility一覧 200
- facility detail（複数、画像あり/なし）200
- event一覧/都道府県 200
- login page 200、logout/auth state change
- unauthenticated `/mypage/*` -> login 307
- ephemeral authenticated userでwishlist/child/visit read/write、保護page、cleanup
- avatar upload/download/delete、remote Supabase avatar、invalid input
- API search/event 200
- Rakuten CTA、Asoview CTA、PR label
- GA `G-1V6K1ZJH6S`
- ValueCommerce loader/PID `892685809`と`dalc.valuecommerce.com` request
- robots/sitemap 200
- unknown URL 404
- legacy tag redirect 308、trailing slash 308

ValueCommerce LinkSwitchの実clickはworkers.dev originではdirect Asoview URLのままだった。
loaderとPID、実network request、GA affiliate clickは正常であり、registered production domain
ではないtemporary originがValueCommerce側の変換対象外である可能性が高い。これは推論であり、
`trip-guide.net`切替後の実変換をPhase 3 final gateに残す。

## Environment variables / secrets

| Key | 種別 | 用途 |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | 公開client config | 既存Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 公開client config | RLS前提のanon key |
| `NEXT_PUBLIC_SITE_URL` | 公開client config | canonical/base URL (`https://trip-guide.net`) |
| `SITE_URL` | build config | sitemap/base URL |
| `NEXT_PUBLIC_GA_ID` | 公開client config | GA (`G-1V6K1ZJH6S`) |
| `NEXT_PUBLIC_VALUECOMMERCE_PID` | 公開client config | LinkSwitch PID (`892685809`) |
| `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` | 公開client config / optional | Search Console verification |
| `SUPABASE_SERVICE_ROLE_KEY` | **secret / build・runtime不要** | deployしない、repoへcommitしない |
| `ASSETS` | runtime binding | Static Assets |
| `IMAGES` | runtime binding | avatar upload-time transform |

`scripts/build-cloudflare.mjs`はprivate key名のbundle漏洩を検査し、検出時はoutputを削除してfailする。

## Phase 3 DNS cutover（完了）

2026-09-13 JSTにXServerで`memorips.com`と`trip-guide.net`の権威NSを
以下へ変更した。

- `archer.ns.cloudflare.com`
- `barbara.ns.cloudflare.com`

Cloudflare Dashboardで両zoneの`Your domain is now protected by Cloudflare`と
`DNS Setup: Full`を確認した。1.1.1.1、8.8.8.8、9.9.9.9の全resolverで、apex/wwwが
Cloudflare Anycast A recordを返す。既存MX/SPF/DKIMはzone importのまま保持した。

Worker routes:

- `memorips.com/*` -> `memorip`
- `www.memorips.com/*` -> `memorip-domain-redirect`
- `trip-guide.net/*` -> `memorip-domain-redirect`
- `www.trip-guide.net/*` -> `memorip-domain-redirect`

旧domainと両`www`はpath/queryを保持して`https://memorips.com`へ301する。
Supabase AuthはSite URLを`https://memorips.com`へ変更し、callback allow-listへ
`memorips.com`、`www.memorips.com`、temporary workers.devを追加した。既存
`trip-guide.net/auth/callback`とlocalhost entryはrollback用に残した。

Cloudflareのzone初期設定が既存`robots.txt`へContent Signals Policyを追記していたため、
`memorips.com`のmanaged robots設定を無効化した。現在はbuild生成の116-byte
`robots.txt`が改変なしで配信される。

## Phase 4 production verification

`memorips.com`で以下を実測した。

- TOP、施設一覧、prefecture/query filter、画像あり`facility-001`、画像なし
  `facility-005`、Rakuten CTAあり`facility-012`: 200
- event一覧、summer event、login page: 200
- API search/page-data/event: 200、期待ID/slugを返却
- facility画像: `image/jpeg`でStatic Assetsから200。HTMLは`text/html`。
  HTML内`/_next/image`参照なし。
- canonical/metadata/structured data、GA `G-1V6K1ZJH6S`、ValueCommerce PID
  `892685809`、Asoview/Rakuten CTA、PR表示: HTML/ブラウザ上で維持
- `robots.txt`、sitemap index: 200、全URLは`memorips.com`
- unknown URL: 404、legacy tag/trailing slash: 308
- internal `/_memorip-pages/*`: 404
- `www.memorips.com`、`trip-guide.net`、`www.trip-guide.net`: path/query保持301

ephemeral production userで、既存Supabase projectを相手に次を実測し、完了後に
auth userとcascade dataを削除した。

- password sign-in / sign-out
- children、wishlist、visits、visit_childrenのRLS read/write
- `/mypage`、children、wishlist、visitsのauthenticated SSR: 全て200、作成data表示
- avatar: Cloudflare Imagesでupload 200、Supabase signed URL取得200、delete 200
- invalid JPEG: 400
- sign-out後`/mypage`: loginへ307

Active deployment `8761f55a`は検証後36 invocations、error rate 0%。Dashboardの
last-24h集計はExceeded CPU 0、Exceeded Memory 0、CPU P99 776ms、memory P99
111.31MBで、設定した3,000ms CPU / Workers 128MB memory内に収まった。

ValueCommerceについては本番ブラウザでloader 3件、PID、PRを確認したが、
公式確認方法の`dalr.valuecommerce.com`へ変換済みのlinkは0件だった。
`app3?p=892685809`応答も0 byteであり、hosting/runtimeではなくLinkSwitch広告space、
提携、または登録site URL側の設定を管理画面で確認する必要がある。管理画面は
自動logout状態のため、これだけがPhase 4の残gate。

### Rollback

Vercel project/deploymentとimport済みA recordsは削除しない。問題時はCloudflare Dashboardで
上記2本のWorker routeを外すと、同じCloudflare DNSのA record経由でVercel originへ戻せる。
zone全体を戻す必要がある場合のみ、Xserverで元の`ns1〜5.xserver.jp`へ戻す。
rollback後もSupabase dataは共通backendなのでデータ再作成/逆移行は不要。

## Owner decision / remaining production step

- 2026-09-12: Workers Paid採用GO。0円向けclient-side再設計はNO-GO。
- 2026-09-13: DNS cutover、Supabase auth URL、production E2E完了。Vercelは削除せず
  paused状態を保持。
- 残作業はValueCommerce管理画面で`memorips.com`とPID `892685809`のLinkSwitch
  設定を確認し、実linkが`dalr.valuecommerce.com`へ変換されることの再検証のみ。
- PRはmergeしない。残gate解消後にfinal report commitをpushし、clean確認後、
  このworktreeをtrack終了cleanupする。
