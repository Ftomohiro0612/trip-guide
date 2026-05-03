# trip-guide.net プロジェクト 引継ぎメモ

このメモは、Claude(チャット相棒)に状況を引き継ぐためのものです。
新しいセッションで「このメモを読んで状況を把握してください」と最初に伝えれば、続きから相談できます。

**最終更新**: 2026-05-03 / Phase 1 + 2 + 公開 + GA4 + Search Console + sitemap 受理 + V4 22件追加(計173施設)+ Sheet⇄JSON 同期運用化

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
- **目的**: 子供向け遊び場(主に静岡・山梨・長野の施設173件)の検索サイト
- **スタック**: Next.js 16 (App Router) + TypeScript + Tailwind CSS v4 + Turbopack
- **ホスティング**: Vercel
- **データ**: `data/facilities_data.json` (173施設、全件に緯度経度あり、画像57件)
- **データ運用**: Google スプレッドシート(マスター) ⇄ JSON 同期スクリプト
- **詳細仕様**: `HANDOFF.md`(プロジェクトの完全な仕様書、データ運用フローも記載)

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
- **ジオコーディング 173/173 完了** (V3初期: Nominatim 83 + Google 68 / V4追加分: Nominatim 12 + Google 10)
- **施設写真 57件**(33%)— Wikipedia 完全一致のみ採用、汎用写真は使わない方針
- カテゴリ数 18(15既存 + 3新規 nature-park / viewpoint / scenic)
- ヘルパースクリプト: `geocode.ts` / `geocode.mjs` / `fetch-images.ts` / `fetch-wiki-images.ts` / `cleanup-wiki-images.mjs` / `optimize-images.mjs` / **`export-to-csv.ts`** / **`sync-from-sheet.ts`**
- バックアップ: `data/facilities_data.json.bak.*` — gitignore 対象

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

---

## ✅ V4 拡張 + 運用パイプライン構築 (2026-05-03 完了)

### 22施設追加(id 152〜173)
- 静岡 3 / 山梨 12 / 長野 7 件、主に河口湖・山中湖・軽井沢周辺の美術館 / 体験施設 / 自然系
- 全件 緯度経度補完済み(例外: id=167 軽井沢おもちゃ王国は群馬県嬬恋村が長野県表記でジオコード結果がズレ)
- 新カテゴリ3つ追加: `nature-park` 公園・自然 / `viewpoint` 展望台 / `scenic` 自然・絶景
- アイコン・説明文も `lib/icons.ts` / `lib/descriptions.ts` に追加済み

### Google スプレッドシート ⇄ JSON 同期運用化
- スプレッドシートID: `1p4bqL1Oq89k5c-9Wa0REXd8BojzUBBXfF5-iSYEeeH4`
- 「全件一覧」タブが先頭、18列(id / 県 / カテゴリ / 施設名 / 所在地 / 屋内・屋外 / 雨天対応 / 料金タイプ / 大人料金目安 / 子供料金目安 / おすすめポイント詳細 / 対象年齢 / URL/参考 / lat / lng / image / image_credit / tags)
- 通常運用: シート編集 → `npm run sync-sheet` → JSON 反映
- **重要な落とし穴**: シートに id 空のまま新規行追加 → 同期 → 自動採番されるが、**シートに id を書き戻さないと次回また新規扱いで重複**する
  - 対策: 同期後 `npm run export-csv` → `data/facilities_master.csv` をシートに再インポート
  - sync スクリプトは「added > 0 かつ orphaned > 0」を検知すると警告を出す
  - 詳細手順は HANDOFF.md「データ運用フロー」セクション
- バグ修正済み: `is_free` の startsWith("無料") 判定 / カテゴリ count 自動更新

### 詳細ページ UX 改修
- ヒーロー画像のフル不透明度化(以前は60%+グラデオーバーレイで写真が見えなかった)
- 「写真ギャラリー」セクション新設(基本情報 直上、3列 PC / 2列 SP、4:3 比率)
  - 配列前提のコンポーネント `FacilityGallery.tsx` で書いてあるので、将来 `images: string[]` に拡張可能
  - 画像なし施設はセクションごと非表示

### Wikipedia 自動取得の精査
- fetch-wiki が一度に 31件マッチしたが、ファジー検索で別施設・別概念がかなり混入
- 完全一致の3件のみ採用(155 河口湖音楽と森の美術館 / 171 八ヶ岳自然文化園 / 173 上高地)、残り28件は画像ファイルごと削除して `image_*` フィールドを null に戻した
- これでサイト全体で 57件画像 / 116件画像なし

### 残課題(優先度低)
- **id=167 軽井沢おもちゃ王国 のジオコード誤り** — シートで「長野県」→「群馬県」に直して `npm run sync-sheet` + `npm run geocode` で復旧
- **既存54件 Wikipedia 画像も再精査**(同じファジー混入が懸念、特に 9 / 52 / 62 / 77 / 82 / 88 / 91 / 101 / 102 / 104 / 106 / 118 / 145 / 150 等)
- **画像カバレッジ向上**: 残り116件を Google Places API (New) で取得検討。無料枠($200/月)で約 $1.40 程度なので余裕で収まる
- **インデックス進捗の確認**: 1〜2週間後に Search Console「カバレッジ」または `site:trip-guide.net` で実際にインデックスされた URL 数を確認

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
| 〃 | 詳細ページ:ヒーロー画像をフル不透明度に変更、写真ギャラリーセクション新設 |
| 〃 | データ運用を Google スプレッドシート→JSON 同期に切替(`npm run export-csv` / `npm run sync-sheet`) |
| 2026-05-03 | V4 22件追加(id 152-173)、3新カテゴリ(nature-park / viewpoint / scenic) |
| 〃 | sync-from-sheet バグ修正(is_free, カテゴリ count, 重複 id 警告)|
| 〃 | Nominatim + Google で V4 全件ジオコード(id=167 のみズレ要修正)|
| 〃 | Wikipedia ファジーマッチ 28件却下、完全一致3件のみ採用 → 画像57件 |

---

## 今後やるべき残タスク

### Phase 3 候補(優先順)
1. **id=167 軽井沢おもちゃ王国 のジオコード修正**(シート1セル + 1コマンドで完了、5分作業)
2. **既存57件画像の再精査**(ファジーマッチ混入分を洗い出し)
3. **Google Places API で残り116件の画像取得**(無料枠内、約 $1.40)
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
- `data/facilities_data.json` — 173施設の最新データ(全件緯度経度入り、57件画像付き)
- `data/facilities_data.json.bak.*` — タイムスタンプ付きバックアップ(gitignore)
- `scripts/` — geocode.ts / fetch-wiki-images.ts / cleanup-wiki-images.mjs / optimize-images.mjs / fetch-images.ts (Places New 対応、未実行) / **export-to-csv.ts** / **sync-from-sheet.ts**
- `data/facilities_master.csv` — JSON から書き出した完全版 CSV(スプレッドシート初期化用)
- 詳しい運用フローは `HANDOFF.md` の「データ運用フロー」セクション参照
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
trip-guide.net は 173施設で公開稼働中です(Phase 1+2、GA4、Search Console、Sheet⇄JSON 同期まで完了)。
CHAT_HANDOFF.md を読んで現状を把握してください。
今日は Phase 3 の「[進めたい項目]」を進めたいです。
```

データ編集をしたい時:
```
スプレッドシートで V5 を 〇件追加しました。npm run sync-sheet で取り込んでください。
(sync 後、export-csv 再生成 + シートに再インポートで id を書き戻すのを忘れずに)
```

---

新セッションで取りかかりやすいクイック作業:
- **id=167 ジオコード修正**(シートで「長野県」→「群馬県」に変えて sync + geocode)
- **Wikipedia 既存写真の精査**(ファジーマッチ混入を洗い出して却下)
- **Places API 写真取得**(Cloud Console で API 有効化 + `npm run fetch-images` 実行)
