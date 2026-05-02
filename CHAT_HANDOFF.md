# trip-guide.net プロジェクト 引継ぎメモ

このメモは、Claude(チャット相棒)に状況を引き継ぐためのものです。
新しいセッションで「このメモを読んで状況を把握してください」と最初に伝えれば、続きから相談できます。

**最終更新**: 2026-05-02 / Phase 1 + 2 完了 + 本番公開済み + GA4 計測 + Search Console 認証 + sitemap 受理

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

## ✅ 今セッションで完了した作業

### GitHub / Vercel 本番デプロイ
- GitHub リポジトリ作成 + push 成功
- Vercel デプロイ完了、本番稼働中: https://trip-guide.net (SSL有効)
- Vercel CLI セットアップ完了(v53.1.0、`ftomohiro0612` でログイン済み、プロジェクトリンク済み)

### Google Analytics 4 セットアップ完了
- 測定ID: `G-1V6K1ZJH6S`
- Vercel 環境変数 `NEXT_PUBLIC_GA_ID` 登録済み(Production / Development)
- Preview 環境のみ未登録(将来 feature branch 運用時に手動追加する想定)
- 本番HTMLでGA4タグ埋め込み確認済み
- リアルタイムレポートで動作確認済み

---

## ✅ 追加で完了した作業: Google Search Console + Sitemap

- プロパティ追加済み: `https://trip-guide.net`(URL プレフィックス方式)
- 所有権確認方式: **HTML ファイル方式** を採用(`public/google53d37859cb4831ab.html`)
- 認証完了: 「所有権が確認されました」を取得
- Sitemap 提出済み: `/sitemap.xml`(サイトマップ インデックス、子に `sitemap-0.xml`、186 URL)
- ステータス: **「成功しました」** を確認(検出ページ数の反映は数日〜数週間)

### メモ
- HTML タグ方式 (`NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION`) は使わなかった → 今回はその環境変数は未設定のままで OK
- メモ帳に保存していた meta タグの content 値は捨てて問題なし

### 残課題(優先度低)
- Phase 3: 施設画像の追加(Wikimedia Commons をさらに探索する方向、汎用写真は使わない方針)
- インデックス進捗の確認: 1〜2週間後に Search Console「カバレッジ」または `site:trip-guide.net` で実際にインデックスされた URL 数を確認

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
| 〃 | GA4 (`G-1V6K1ZJH6S`) を Vercel 環境変数に登録、本番で稼働確認 |
| 〃 | Vercel CLI セットアップ(v53.1.0、プロジェクトリンク済み) |
| 〃 | Search Console プロパティ追加・HTML ファイル方式で所有権確認完了 |
| 〃 | `public/google53d37859cb4831ab.html` を配置、`/sitemap.xml` 提出 → 「成功しました」確認 |

---

## 今後やるべき残タスク

### Phase 3 候補
1. **施設画像の追加カバレッジ**(Wikimedia Commons をさらに探索する方針。汎用写真は使わない。Google Places API は保留)
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
| `NEXT_PUBLIC_GA_ID` | GA4 測定 ID (`G-1V6K1ZJH6S`) | Vercel Settings(Production / Development 登録済み、Preview のみ未設定) |
| `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` | (使わなかった — HTML ファイル方式で認証完了) | — |

---

## 次セッション再開時のプロンプト例

```
trip-guide.net は公開済みで、Phase 1 + 2 + GA4 + Search Console + sitemap まで完了しています。
CHAT_HANDOFF.md を読んで現状を把握してください。
今日は Phase 3 の「[進めたい項目]」を相談したいです。
```

または、別の作業に進みたい場合:

```
trip-guide.net は既に公開済みです。CHAT_HANDOFF.md を読んで現状を把握してください。
今日は Phase 3 の「[XX]」を進めたいです。アプローチを相談したい。
```

---

新セッションでは、まずユーザーから Search Console の認証コード(`content` の中身)を受け取り、Vercel 環境変数 `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` への登録 → 再デプロイ → 確認ボタン → sitemap 提出、の順で案内するのが自然です。
