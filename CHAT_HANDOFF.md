# trip-guide.net プロジェクト 引継ぎメモ

このメモは、Claude(チャット相棒)に状況を引き継ぐためのものです。
新しいセッションで「このメモを読んで状況を把握してください」と最初に伝えれば、続きから相談できます。

**最終更新**: 2026-05-03 / 公開 + GA4 + Search Console + V4(173)+ V5(191)+ V6(214)+ Sheets API 双方向書き込み運用化

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
- **目的**: 子供向け遊び場(主に静岡・山梨・長野の施設214件)の検索サイト
- **スタック**: Next.js 16 (App Router) + TypeScript + Tailwind CSS v4 + Turbopack
- **ホスティング**: Vercel
- **データ**: `data/facilities_data.json` (214施設、全件緯度経度入り、画像68件)
- **データ運用**: Google スプレッドシート(マスター) ⇄ JSON 同期スクリプト + **Sheets API 直接書き込み**(append-to-sheet / push-to-sheet)
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
- **施設数 214件**(V3:151 + V4:22 + V5:18 + V6:23)、全件緯度経度入り
- **施設写真 68件**(32%)— Wikipedia 完全一致のみ採用、汎用写真は使わない方針(却下40件はブラックリスト管理)
- カテゴリ数 18(15既存 + 3新規 nature-park / viewpoint / scenic)
- スキーマ 22列(V5で signature_experiences / unique_selling_point / experience_tags / summer_water_play 追加)
- ヘルパースクリプト: `geocode.ts` / `geocode.mjs` / `fetch-wiki-images.ts` / `optimize-images.mjs` / **`export-to-csv.ts`** / **`sync-from-sheet.ts`** / **`append-to-sheet.ts`** / **`push-to-sheet.ts`**
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

### Wikipedia 自動取得の精査(strict-match policy)
- fetch-wiki はファジー検索で別施設・別概念をしばしば返すので、**Wikipedia 記事タイトルが施設名と完全一致するもののみ採用**が確立した運用方針
- 却下されたid群は `data/wiki-image-blacklist.json` に登録され、`npm run fetch-wiki` で次回以降スキップされる(無限再取得防止)
- 採用例: 155 河口湖音楽と森の美術館 / 171 八ヶ岳自然文化園 / 173 上高地 / 192 富士川クラフトパーク / 208 熱海城 など
- 却下例: 152 伊豆テディベア・ミュージアム ← テディベア(概念)/ 150 あすなろ園 ← 青木あすなろ建設(建設会社)など

### id=167 軽井沢おもちゃ王国 修正済み
- 嬬恋村は実は群馬県だが「軽井沢エリア」として長野県表記している → ジオコーダが混乱
- 施設名のみで再検索して正しい座標を取得・直接書き込み(`geocode_source: "manual"`)

---

## ✅ V5 + V6 拡張 + Sheets API 双方向化 (2026-05-03 完了)

### V5: スキーマ4列追加 + 18施設追加(id 174〜191)
- 新列: `signature_experiences`(配列)/ `unique_selling_point`(文字列)/ `experience_tags`(配列)/ `summer_water_play`(◎△×)
- 18施設追加(主に Forest Adventure シリーズ、三島スカイウォーク、チビッ子忍者村など)
- 22列スキーマで sync / export / type / 取り込み全て対応

### V6: 23施設追加(id 192〜214)
- 大型遊具公園が中心(山梨9 / 長野7 / 静岡7)
- 富士川クラフトパーク、万力公園、熱海城、はままつフラワーパークなど
- 全件 lat/lng 補完済み(13 Nominatim + 10 Google)、画像7件採用

### Google Sheets API による双方向書き込み(運用革命)
- **問題**: 旧フローでは新規行に id 空のまま sync すると毎回新規扱いで重複地獄
- **解決**: サービスアカウント `trip-guide-bot@trip-guide-495213.iam.gserviceaccount.com` を作成 + シート編集権限付与 + JSON キー(`data/.gcp-sheets-credentials.json`、gitignore済)
- **新スクリプト**:
  - `npm run append-to-sheet -- file.csv` → 末尾追記
  - `npm run push-to-sheet` → JSON 状態を全列フル書き戻し
- **新フロー**: シート編集 → `sync-sheet` → `push-to-sheet` で id 自動書き戻し完了。重複事故ゼロ
- **スプレッドシート初期化用 CSV** (`data/facilities_master.csv`) は、Sheets API 経由なら `push-to-sheet` で代替可能

### 残課題(優先度低)
- **既存68件画像の再精査**(strict matcher で今までのすり抜けを洗い出し)
- **画像カバレッジ向上**: 残り146件を Google Places API (New) で取得検討。無料枠($200/月)で約 $1.50 程度
- **fetch-wiki の自動 strict フィルタ**(現状の手動分類 → 却下 → ブラックリスト追加 を 1 コマンド化)
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
| 〃 | Nominatim + Google で V4 全件ジオコード、id=167 軽井沢おもちゃ王国 を手動再検索で修正 |
| 〃 | Wikipedia ファジーマッチ 28件却下、完全一致3件のみ採用 → 画像57件 |
| 〃 | V5: 22列スキーマ移行(signature_experiences ほか3列追加)+ 18施設追加(id 174-191) |
| 〃 | V5 全件ジオコード + 4件画像採用、`wiki-image-blacklist.json` 機構導入 |
| 〃 | **Sheets API 双方向書き込み構築**(サービスアカウント、append-to-sheet / push-to-sheet) |
| 〃 | V6: 23施設追加(id 192-214)、大型遊具公園中心 + 7件画像採用、計214件で本日着地 |

---

## 今後やるべき残タスク

### Phase 3 候補(優先順)
1. **既存68件画像の再精査**(strict matcher で今までのすり抜けを洗い出し、ブラックリストに追加)
2. **fetch-wiki の自動 strict フィルタ**(分類 → 却下 → ブラックリスト追加を `--strict` フラグで1コマンド化)
3. **Google Places API で残り146件の画像取得**(無料枠内、約 $1.50)
4. **新4列のフロントエンド表示**(signature_experiences / unique_selling_point / experience_tags / summer_water_play は データに入っただけで UI 未対応)
5. **www → 非www リダイレクト** (現在 `www.trip-guide.net` は SSL エラー)
6. **お気に入り機能** (localStorage、軽量)
7. **検索機能の強化**(現在は単純な部分一致)

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

- `HANDOFF.md` — プロジェクト完全仕様書(運用フロー記載)
- `CLAUDE_CODE_QUICKSTART.md` — 初期セットアップ手順
- `data/facilities_data.json` — 214施設の最新データ(全件緯度経度入り、68件画像付き)
- `data/facilities_data.json.bak.*` — タイムスタンプ付きバックアップ(gitignore)
- `data/wiki-image-blacklist.json` — Wikipedia ファジーマッチ却下済み id 一覧(40件)
- `data/.gcp-sheets-credentials.json` — Sheets API サービスアカウント鍵(gitignore)
- `scripts/` — geocode.ts(Google fallback)/ geocode.mjs(Nominatim 一次)/ fetch-wiki-images.ts(blacklist対応済)/ optimize-images.mjs / **export-to-csv.ts** / **sync-from-sheet.ts** / **append-to-sheet.ts** / **push-to-sheet.ts**
- このメモ(`CHAT_HANDOFF.md`)

## 環境変数 / 認証ファイル

| 名前 | 用途 | 場所 |
|---|---|---|
| `GOOGLE_GEOCODING_API_KEY` | Geocoding API(2026-05-03 鍵更新済み)| `.env.local` |
| `NEXT_PUBLIC_GA_ID` | GA4 測定 ID (`G-1V6K1ZJH6S`) | Vercel Settings(Prod / Dev) |
| `data/.gcp-sheets-credentials.json` | Sheets API サービスアカウント鍵 | ローカルのみ(.gitignore済) |
| `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` | (未使用 — HTML ファイル方式で認証完了) | — |

---

## 次セッション再開時のプロンプト例

```
trip-guide.net は 214施設で公開稼働中です(Phase 1+2、GA4、Search Console、Sheets API 双方向書き込みまで完了)。
CHAT_HANDOFF.md を読んで現状を把握してください。
今日は Phase 3 の「[進めたい項目]」を進めたいです。
```

データ追加をしたい時(V7+):
```
data/v7_additions_for_sheet.csv を作りました。標準フローで取り込んでください。
```
→ Claude が以下を順次実行:
1. `npm run append-to-sheet -- data/v7_additions_for_sheet.csv`
2. `npm run sync-sheet`(自動採番)
3. `npm run push-to-sheet`(id 書き戻し)
4. `node scripts/geocode.mjs` + `npm run geocode`
5. `npm run fetch-wiki` + 厳格フィルタ + ブラックリスト追加
6. もう一度 `push-to-sheet` で完全同期
7. commit & push

---

新セッションで取りかかりやすいクイック作業:
- **既存68件 Wikipedia 画像の strict 再精査**(ブラックリストに追加で再発防止)
- **新4列(signature_experiences ほか)を施設詳細ページに表示**(データはあるが UI 未対応)
- **Places API 写真取得**(Cloud Console で API 有効化 + `npm run fetch-images` 実行、約 $1.50)
