# trip-guide.net プロジェクト 引継ぎメモ

このメモは、Claude(チャット相棒)に状況を引き継ぐためのものです。
新しいセッションで「このメモを読んで状況を把握してください」と最初に伝えれば、続きから相談できます。

**最終更新**: 2026-05-02 / Phase 1 + 2 完了 + 本番公開済み

---

## ユーザーについて

- **役割**: trip-guide.net (子供向け遊び場検索サイト)のオーナー兼開発者
- **技術レベル**: Node.js / Git / Next.js などの基礎は初体験スタートだったが、デプロイまで一通り完走済み
- **環境**: Windows 11、PowerShell、Node.js v24.15.0、npm 11.12.1、Claude Code v2.1.126
- **作業ディレクトリ**: `C:\Users\tomo-\projects\trip-guide`
- **GitHub アカウント**: `Ftomohiro0612`
- **メールアドレス**: info@fic-investment.biz

## プロジェクト概要

- **サイト名**: trip-guide.net
- **目的**: 子供向け遊び場(主に静岡・山梨・長野の施設151件)の検索サイト
- **スタック**: Next.js 16 (App Router) + TypeScript + Tailwind CSS v4 + Turbopack
- **ホスティング**: Vercel
- **データ**: `data/facilities_data.json` (151施設、全件に正確な緯度経度あり)
- **詳細仕様**: `HANDOFF.md`(プロジェクトの完全な仕様書)

## 公開状況 (LIVE)

| 項目 | 値 |
|---|---|
| **本番URL** | https://trip-guide.net (SSL有効、独自ドメイン稼働中) |
| **Vercel preview** | https://trip-guide-nine.vercel.app |
| **GitHub** | https://github.com/Ftomohiro0612/trip-guide |
| **DNS** | Xserver管理(A レコードのみ Vercel 216.198.79.1 に変更、TXT/NS/MX は Xserver のまま) |
| **メール** | Xserver 側でそのまま継続(SPF/DKIM保護) |

---

## 現在の進捗

### ✅ Phase 1 MVP (完了)
- Next.js 16 + TypeScript + Tailwind v4 + Turbopack でセットアップ
- ヒーロー / クイックフィルタ / エリアカード / カテゴリカード / ピックアップ
- 施設一覧(サイドバーフィルタ + ソート + 空状態)
- 施設詳細(JSON-LD `TouristAttraction` + Google Maps embed + 関連施設)
- 大型 Leaflet 地図(151マーカー、県別カラー、フィルタ、自動 fitBounds)
- データアクセス・フィルタ・アイコンの lib モジュール

### ✅ Phase 2 SEO (完了)
- 県別ページ `/prefecture/[id]` × 3
- カテゴリ別ページ `/category/[id]` × 15
- タグページ `/tag/[slug]` × 10 (ロングテールSEO)
- About / 404 / Loading / error / global-error ページ
- next-sitemap (188 URL) + robots.txt
- 自動生成 OGP 画像(トップ・県・カテゴリ・タグ・施設詳細)、Noto Sans JP埋め込み
- Twitter Cards / OGP / robots / keywords / format-detection / viewport / theme-color
- favicon / apple-icon / PWA manifest
- BreadcrumbList + WebSite SearchAction + ItemList JSON-LD
- canonical URL を全主要ページに付与
- 適用中フィルタチップ(× ボタンで個別解除)
- スキップリンク / フォーカススタイル / 動きを抑制設定

### ✅ データ充実 (完了)
- **ジオコーディング 151/151 完了** (Nominatim 83 + Google Geocoding API 68)
- 施設写真 54件 (Wikipedia 由来、ライセンス表記付き、sharp で 152MB → 7MB に最適化)
- ヘルパースクリプト: `geocode.ts`, `fetch-images.ts`, `fetch-wiki-images.ts`, `cleanup-wiki-images.mjs`, `optimize-images.mjs`
- バックアップ: `data/facilities_data.json.bak` (Google ジオコード前) / `data/facilities_data.json.images.bak`(画像追加前) — どちらも `.gitignore` 対象

### ✅ 体験向上 (完了)
- シェアボタン(X / LINE / Facebook / リンクコピー / OS標準シェア)
- GA4 / Search Console 連携の組み込み枠 (env で有効化)
- アクセシビリティ強化(skip link, focus-visible, prefers-reduced-motion)

---

## 🛑 現在ここで止まっている作業

### Google Analytics 4 のプロパティ作成中

**目的**: アクセス計測を有効化して、検索流入や行動を追跡できる状態にする。

**今までやったこと**:
- コード側は対応済み: `components/Analytics.tsx` が `process.env.NEXT_PUBLIC_GA_ID` を読み込み、設定があれば自動で gtag スクリプトを埋め込む(`app/layout.tsx` で組み込み済み)
- ユーザーは https://analytics.google.com/ で GA4 プロパティ作成手順を進めている途中

**次にやること**:
1. **GA4 で測定 ID (`G-XXXXXXXXXX` 形式)を取得** ← ユーザーがいま進めているところ
2. **Vercel に環境変数追加**:
   - Vercel ダッシュボード → trip-guide → Settings → Environment Variables
   - Name: `NEXT_PUBLIC_GA_ID`
   - Value: `G-XXXXXXXXXX`(取得した測定ID)
   - Environment: All(Production / Preview / Development 全部チェック)
   - Save
3. Vercel が自動再デプロイ → ブラウザで https://trip-guide.net を開いて DevTools → Network タブで `gtag/js` がロードされていれば成功
4. GA4 のリアルタイムレポートに自分のアクセスが表示されればOK

### その次にやること: Google Search Console 登録
1. https://search.google.com/search-console で `trip-guide.net` を追加
2. 認証方法は **「HTML タグ」** が一番簡単(`<meta name="google-site-verification" content="XXX" />` の `XXX` をコピー)
3. **Vercel に環境変数追加**:
   - Name: `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION`
   - Value: 上の `XXX`(content の中身だけ)
4. 自動再デプロイ → Search Console で「確認」ボタンを押す
5. 認証成功 → **「Sitemaps」 メニュー** に `https://trip-guide.net/sitemap.xml` を送信
6. インデックスされ始めるまで数日〜数週間

---

## 直近の作業ログ

| 日付 | 主なできごと |
|---|---|
| 2026-05-02 早い時間 | Phase 1 MVP 実装、ジオコーディング(Nominatim)、地図ビュー追加 |
| 〃 | Phase 2 SEO実装(県/カテゴリ/タグ/About/404/OGP/sitemap/robots) |
| 〃 | Google Geocoding API でフォールバック68件を再ジオコード(完璧化) |
| 〃 | 施設写真 73→54件取得・最適化(Wikipedia + sharp) |
| 〃 | favicon / manifest / 構造化データ追加 |
| 〃 | GitHub リポジトリ作成・初回 push |
| 〃 | Vercel デプロイ、preview URL `trip-guide-nine.vercel.app` 公開 |
| 〃 | Xserver 側で A レコード書き換え(@ → 216.198.79.1) |
| 〃 | DNS 反映確認、SSL 自動発行成功、`https://trip-guide.net` 200 OK |
| 〃 | シェアボタン / canonical / ItemList JSON-LD / a11y 追加 push |
| 〃 | **GA4 セットアップ着手 (← いまここ)** |

---

## 今後やるべき残タスク

### Phase 3 候補
1. **GA4 + Search Console の有効化**(現在進行中)
2. **施設写真の追加カバレッジ**(Wikipedia で 54件、Google Places (New) を Cloud Console で有効化すれば残り97件もカバー可能。コスト ≈ $4)
3. **Wikipedia ファジーマッチの目視チェック**(54件のうちいくつかは関連サイト)
4. **www → 非www リダイレクト** (現在 `www.trip-guide.net` は SSL エラー)
5. **お気に入り機能** (localStorage、軽量)
6. **検索機能の強化**(現在は単純な部分一致)

### コンテンツ拡充
- 季節特集ページ(春の桜、夏の水遊び、秋の紅葉、冬のスキー)
- 施設データ追加(神奈川・東京などへ拡大)
- ブログ記事(fic-investment.biz の Make パイプライン応用)

---

## 役割分担

- **チャット相棒の Claude (claude.ai)**: 戦略相談、手順案内、エラー翻訳、学習サポート
- **実装担当の Claude Code**: コード作成、修正、テスト、デプロイコマンド実行

ユーザーは「黒い画面(CLI)」より「チャット相棒との会話」を好むため、計画はチャット側で固めて、Claude Code には1つのまとまった指示を投げる流れが理想。

## ユーザーへの接し方

- 専門用語は最小限に。使うときは必ず一言で噛み砕く
- 手順は番号付きで、コピペできる形で提示
- 画面のスクショを送ってくることが多いので、それを見て状況判断 → 次の一手を案内
- 「Yes / Enter / 矢印キーで↓」など具体的に
- できたら一度区切って「次どうする?」と相談する

## 参考ファイル(同フォルダ内)

- `HANDOFF.md` — プロジェクト完全仕様書
- `CLAUDE_CODE_QUICKSTART.md` — 初期セットアップ手順
- `data/facilities_data.json` — 151施設の最新データ(緯度経度・画像パス入り)
- `data/facilities_data.json.bak` — Google ジオコード前のスナップショット
- `data/facilities_data.json.images.bak` — 画像追加前のスナップショット
- `scripts/` — geocode.ts / fetch-wiki-images.ts / cleanup-wiki-images.mjs / optimize-images.mjs / fetch-images.ts (Places New 対応、未実行)
- このメモ(`CHAT_HANDOFF.md`)

## 環境変数 (.env.local / Vercel)

| 変数名 | 用途 | 設定場所 |
|---|---|---|
| `GOOGLE_GEOCODING_API_KEY` | Geocoding 再実行・将来の Places API 用 | `.env.local` (ローカル) / Vercel Settings |
| `NEXT_PUBLIC_GA_ID` | GA4 測定 ID (`G-XXXXXX`) | Vercel Settings(まだ未設定 ← 今ここ) |
| `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` | Search Console 認証 | Vercel Settings(まだ未設定) |

---

## 次セッション再開時のプロンプト例

```
trip-guide.net は既に公開済みで、Phase 1 + 2 が完成しています。
CHAT_HANDOFF.md を読んで現状を把握してください。

いま「現在ここで止まっている作業」セクションにある GA4 のセットアップを続きから進めたいです。
GA4 の測定ID(G-から始まるやつ)を取得したので、Vercel への登録手順を案内してください。
```

または、別の作業に進みたい場合:

```
trip-guide.net は既に公開済みです。CHAT_HANDOFF.md を読んで現状を把握してください。
今日は Phase 3 の「[XX]」を進めたいです。アプローチを相談したい。
```

---

新セッションでは、まずユーザーが「現在 GA4 の測定 ID 取得まで来ている」状態かどうかを確認して、状態に応じて Vercel への env 登録手順を案内するのが自然です。
