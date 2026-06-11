# trip-guide.net プロジェクト 引継ぎメモ

このメモは、Claude(チャット相棒)に状況を引き継ぐためのものです。
新しいセッションで「このメモを読んで状況を把握してください」と最初に伝えれば、続きから相談できます。

**最終更新**: 2026-06-11(夜) / トップ再設計v3〜v3.3 本番デプロイ済み(33a2cb3・metadata9県化・記録UIカード・ベネフィット価値セクション) / 写真機能: Phase A(Migration 006・RLS全PASS)+Phase B(アップロードUI・EXIF除去)実装済みだが `lib/config.ts` の `PHOTO_UPLOAD_ENABLED=false` で本番非表示 / 次タスク: 写真Phase C(詳細ページ表示+削除UI)→flag true で写真公開判断 / 訪問記録詳細ページ・Brand Phase 2 ロゴはデプロイ済み

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
- **目的**: 子供向け遊び場(関東甲信越9県、施設968件)の検索サイト
- **スタック**: Next.js 16 (App Router) + TypeScript + Tailwind CSS v4 + Turbopack
- **ホスティング**: Vercel
- **データ**: `data/facilities_data.json` (968施設、全件緯度経度入り、画像350件)
- **県別**: 静岡 68 / 長野 73 / 山梨 72 / 東京 155 / 栃木 118 / 埼玉 118 / 新潟 120 / 千葉 115 / 神奈川 124
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
- **施設数 968件** — 全件緯度経度入り
  - V3:151 → V4:+22 → V5:+18 → V6:+23 → V7 東京 +150 → V8 関東5県 +506 → V9 第2弾 +68 → V10 audit補完 +35 → 削除 5 (重複) = **968**
- **9県カバー**: 静岡 68 / 長野 73 / 山梨 72 / 東京 155 / 栃木 118 / 埼玉 118 / 新潟 120 / 千葉 115 / 神奈川 124
- **施設写真 350件**(36%)— Wikipedia 完全一致のみ採用、却下292件はブラックリスト管理(`data/wiki-image-blacklist.json`)
- **カテゴリ数 20**(15既存 + 5新規:nature-park / viewpoint / scenic / indoor-theme-park / game-center)
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
- **画像カバレッジ向上**: 残り 618 件を Google Places API (New) で取得検討。無料枠($200/月)で約 $5 程度
- **fetch-wiki の自動 strict フィルタ**(現状は `scripts/.tmp-strict-wiki-filter.mjs` をその都度作成 → 1 コマンド化したい)
- **V10 audit 追加分(id 941-975)の説明文・料金の精査**(Web検索ベースの暫定値、シートで磨ける)
- **インデックス進捗の確認**: 1〜2週間後に Search Console「カバレッジ」または `site:trip-guide.net` で実際にインデックスされた URL 数を確認

---

## ✅ V7-V10 追加履歴 (2026-05-04)

### V7 東京都 +150件(id 215-364)
- 新カテゴリ2つ追加:`indoor-theme-park` 屋内テーマパーク / `game-center` ゲームセンター
- rain_friendly が「雨天OK / 雨天NG / 雨天一部OK」のテキストで、prerender 全落ち事故 → 正規化 + RAIN_FALLBACK で復旧

### V8 関東5県 +506件(id 365-870)
- **栃木 / 埼玉 / 新潟 / 千葉 / 神奈川**(各国 100件前後)を一括追加
- PrefectureId 型 / 県別アイコン・色・説明文 / sync の PREFECTURE_MAP / MapView の PREF_COLORS &  LABELS / metadata.prefectures をそれぞれ 5県分拡張

### V9 第2弾 +68件(id 871-940)
- 6県横断の70件 CSV から、既存と同名2件(府中の森公園 / コニカミノルタ満天)を skip して 68件追加

### V10 audit補完 +35件(id 941-975)
- 9県完成度 audit(WebSearch ベース)で見つかった漏れ施設を補完
- 静岡 5 / 長野 1 / 栃木 2 / 埼玉 8 / 新潟 7 / 千葉 3 / 神奈川 9
- 神奈川キドキドは ラゾーナ川崎 / たまプラーザ / 武蔵小杉 / みなとみらい / 湘南 の 5店を追加
- 説明文・料金は web 検索ベースの暫定値、要シート精査

### MapView 同座標オフセット
- キポキポ(id=131)と恩賜林庭園(id=200)が同じ住所内施設で完全同座標 → マーカー重なって片方しか見えない問題を解決
- 同座標グループを ~40m 半径で円形に微小ジッタ、現在 27 組の親子施設すべて個別クリック可能に

### 整合性チェックでの修正
- 県外ジオコード 6件(京都・福岡・東京に飛んでいた栃木・千葉施設)を再ジオコード
- indoor_outdoor「屋内・屋外」表記 7件 → 「両方」に正規化
- 同名重複 5件削除(870 → 865)、その後 V9 / V10 で増加

---

## ⚠️ データ取り込み時の予防策(Tokyo 拡張で踏んだ罠)

新しい県や大量データを追加したら、**取り込み後の本番デプロイ前に**以下を必ずチェック。

### 1. 値の正規化(列ごとに想定形式が決まっている)
- `rain_friendly`: **`◎` / `△` / `×` の3記号のみ**(東京拡張で「雨天OK / 雨天NG / 雨天一部OK」が混入し prerender が全件落ちた)
- `indoor_outdoor`: `屋内` / `屋外` / `両方`
- `summer_water_play`: `◎` / `△` / `×` (rain_friendly と同じ記法)
- `料金タイプ`: 「無料」または「有料」始まり(`is_free` は `startsWith("無料")` で判定)
- `県`: 静岡県 / 長野県 / 山梨県 / 東京都 / 栃木県 / 埼玉県 / 新潟県 / 千葉県 / 神奈川県(他県は新規追加マッピング必要)

### 2. ローカルビルド検証
大量追加 + sync 完了後、commit する**前に**:
```powershell
npm run build
```
- `Generating static pages` フェーズで全ページの prerender が走り、未知の列値による型エラーがあれば即発見できる
- これを飛ばして push すると Vercel ビルド失敗 → production が古いまま静かに固定される(エラーバナーは出ないので気付きにくい)

### 3. デプロイ後の即時確認
push 後 1-2 分で Vercel ビルド結果を確認:
```powershell
vercel inspect https://trip-guide.net | grep status
```
status が `Error` なら最新の URL で `vercel inspect <URL>` してログ追跡。production が更新されていなくても DNS は古いビルドを返すので「変わらない」=「失敗してる」。

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
| 2026-05-04 | フィルタページ(タグ/カテゴリ/県/検索結果)上部に Leaflet 地図追加 |
| 〃 | V7 東京都 150件追加(id 215-364)、4県運用に拡張、20カテゴリ(+ indoor-theme-park / game-center) |
| 〃 | rain_friendly のテキスト値混入で prerender 全落ち → 正規化 + RAIN_FALLBACK で復旧 |
| 〃 | キポキポ + 恩賜林庭園 のジオコード/住所統合(同一住所内施設、(35.4548, 138.7942) で一致)|
| 〃 | 整合性 audit:県外ジオコード 6件再修復、indoor_outdoor 7件正規化、同名重複 5件削除 |
| 〃 | MapView の同座標オフセット実装(40m 半径、27 組の親子施設が個別クリック可能に)|
| 〃 | V8 関東5県(栃木/埼玉/新潟/千葉/神奈川)506件追加(id 365-870)、9県運用に拡張 |
| 〃 | V9 第2弾 68件追加(id 871-940)、夜遅く |
| 〃 | 9県完成度 audit(WebSearch ベース)→ V10 35件追加(id 941-975)、計 968 件で着地 |

---

---

## ✅ Memorips（マイページ機能）実装状況 (2026-06-09)

### サービス概要

trip-guide.net に組み込んだ **「メモリップ by Trip Guide」** — 家族のおでかけ記録機能。
詳細設計は `product-direction.md` 参照。

### 技術スタック追加分

| 項目 | 内容 |
|---|---|
| DB | Supabase（trip-guide プロジェクト） |
| 認証 | Google OAuth + メール認証（Supabase Auth） |
| SSR認証 | `@supabase/ssr` + cookie ベース |
| デプロイ | Vercel CLI（`npx vercel --prod`）— GitHub webhook は旧リポジトリ紐付けのため |

### Supabase 手動作業済み（ダッシュボードで実行）

- `001_phase1_schema.sql`: profiles / children テーブル + RLS + GRANT
- `002_phase2_schema.sql`: visits / visit_children / wishlists テーブル + RLS + GRANT
- Authentication → Providers → Google: OAuth Client ID/Secret 設定済み
- Authentication → URL Configuration: `https://trip-guide.net/auth/callback` 登録済み

### Phase 1 完了 ✅

| 機能 | ルート |
|---|---|
| 認証（メール + Google OAuth） | `/auth/register`, `/auth/login`, `/auth/callback` |
| マイページ | `/mypage` |
| 子どもプロフィール登録・編集 | `/mypage/children` |
| BottomNav（モバイル） | `components/BottomNav.tsx` |

### Phase 2 完了 ✅

| 機能 | ルート |
|---|---|
| 訪問記録フォーム（30秒入力） | `/mypage/visits/new` |
| おでかけ履歴一覧 | `/mypage/visits` |
| 行きたいリスト | `/mypage/wishlist` |

### 既知のポイント・ハマりどころ

- **GRANT は RLS と別**: `ENABLE ROW LEVEL SECURITY` だけでは 403 が出る。`GRANT ... TO authenticated;` が必須
- **Google OAuth クライアントは「ウェブアプリケーション」型**で作る（デスクトップ型は `redirect_uri` が `localhost` になり使えない）
- **Vercel は CLI デプロイ**: `npx vercel --prod --yes --token <token>`（token は `.codex/.sandbox-secrets/vercel.json`）
- **package.json に `@supabase/supabase-js` と `@supabase/ssr` が必要**（ない場合 Vercel ビルド失敗）

### Phase 3 完了 ✅ (2026-06-09)

| 機能 | ルート |
|---|---|
| 施設詳細ページ → 「行きたい♡」「行ったよ✓」ボタン | `components/FacilityActionButtons.tsx` |
| facility_slug と facilities_data.json の紐付け | visits/new クエリパラメータ対応 |
| 訪問記録の編集 | `/mypage/visits/[id]/edit` |
| 訪問記録の削除 | `DeleteVisitButton.tsx` |

### 優先方針（2026-06-09 オーナー確認済み）

**「自分の家族の記録が気持ちよく見える」を最優先。他ユーザー集計は件数が十分になるまで非表示。**

優先順位:
1. **オーナー自身で10件記録してUX確認**（30秒以内・保存後の振り返り体験）
2. **記録保存後の振り返りカード改善**（マイページの「自分の記録」表示を充実）
3. **memorips.com 簡易LP + 事前登録フォーム**
4. **施設ページへ「自分の記録」を還流**（他ユーザー集計ではなく自分の訪問歴）
5. **匿名集計・再訪率の表示**（一定件数たまってから）

### Phase 3 追加実装候補

#### 訪問記録 任意項目追加（visits テーブル拡張）
- 滞在時間（目安: 1時間未満 / 1〜2時間 / 2〜4時間 / 半日 / 終日）
- 時間は足りたか（十分 / ちょうど / 足りなかった）
- 食事・売店評価（なし / あり・満足 / あり・不満）

#### マイページ おでかけマップ（`/mypage/visits/map`）
- 行った場所（訪問済み施設ピン）
- 行きたい場所（wishlist ピン）
- また行きたい場所（family_revisit=yes のピン）
- 既存 Leaflet コンポーネントを流用

#### 地図ピンから自分の記録をポップアップ表示
- 訪問回数
- 子どもごとの満足度
- また行きたいか
- 親の疲れ度
- 滞在時間（任意項目追加後）
- 食事評価（任意項目追加後）

---

---

## ✅ Phase 4 実装状況 (2026-06-10)

### Phase 4-1 完了 ✅ デプロイ済み
- 反応タグ機能（Migration 005: reaction_tags / visit_child_tags テーブル）
- 訪問記録フォームに per-child タグ UI
- 施設詳細ページに反応タグ表示

### Phase 4-2 / 4-2b 完了 ✅ デプロイ済み
- フォーム改善（temp_feeling 削除・滞在時間4択・食事5択・満足度4択・アクセス6択）

### recommended_for_tags タグ付け 完了 ✅
- 全1032施設に AI タグ付け完了（Codex レビュー GO 済み）
- 使用タグ19個: animal/animal_contact/animal_feed/water_play/pool/playground/athletic/slide/running/wide_space/vehicle/craft/experience/exhibition/science/dinosaur/character/nature/food
- 生成ファイル: `.codex/all_tagged_facilities.json`（1032件）/ `needs_web_check_facilities.json`（421件）/ `needs_human_review_facilities.json`（10件）
- タグルール: `.codex/recommended_for_tags_rules.md`

### Migration 006 手動実行済み ✅
- `supabase/migrations/006_add_pool_reaction_tag.sql` — reaction_tags に pool を追加

### Phase 4-3 完了 ✅ デプロイ済み
- `data/facilities_data.json` に recommended_for_tags 反映済み（全1032件）
- `types/facility.ts` に `RecommendedForTag` 型追加
- `lib/recommended-tags.ts` 新規作成
- `components/FacilityCard.tsx` にチップ表示（最大3件）追加
- `app/facilities/[slug]/page.tsx` に「こんな遊びが好きな子に 🎯」セクション追加

### Phase 4-4 完了 ✅ デプロイ済み
- チップを Link 化（FacilityCard / 施設詳細）
- `RECOMMENDED_FOR_TAG_HEADLINE` マップ追加
- `/facilities` に recommended_tag + prefecture フィルター実装
- 都道府県ボタン行（全国/各県）を recommended_tag 指定時に表示

### Phase 4-5 完了 ✅ デプロイ済み（commit `2877943b`, 2026-06-10）
仕様書: `.codex/phase4-5-filter-ui-improve.md`
- `ActiveFilterChips.tsx`: recommended_tag チップ + prefecture（単一）チップ追加
- `FilterSidebar.tsx`: 「おすすめタイプ」折りたたみセクション追加（全19タグ、単一選択）
- `FilterSidebar.tsx`: 都道府県を折りたたみチェックボックスに変更（複数選択は維持）
- `app/facilities/[slug]/page.tsx`: タグチップ下にテキストリンク追加（最大3件）
- **ブラウザ確認: ユーザー待ち**

### Phase 5 カンドゥー修正 完了 ✅（commit `43c613c`）
- カンドゥー（id=357）修正済み（**公式住所で確認済み**）:
  - `prefecture`: 千葉県
  - `prefecture_id`: chiba
  - `address`: 千葉県千葉市美浜区豊砂1-5 イオンモール幕張新都心 エキマエ3階
  - `latitude`: 35.6575832 / `longitude`: 140.0251269（Nominatim直接ヒット）
  - `recommended_for_tags`: ["experience"]
  - `description`: 職業体験施設として更新（イクスピアリ記述削除）
- **インシデント記録**: `.codex/kandu-address-incident-report.md`
  - 原因: AI学習データから旧イクスピアリ店舗住所を公式確認なしで記入
  - 再発防止: 住所修正は公式URL確認必須・座標も再ジオコード必須（memory保存済み）

### Phase 4-6 完了 ✅ デプロイ済み（commit `3a62ecd`）
仕様書: `.codex/phase4-6-prefecture-filter-fix.md`
- `FilterSidebar.tsx`: `togglePrefecture()` 追加（サイドバーで県チェック時に `prefecture` を `prefectures` に吸収してから削除）
- `page.tsx`: `allSelectedPrefNames` で単一+複数の統合リスト、OR 条件フィルター
- 見出し: 0県 / 1県 / 複数県の3パターン対応
- **ブラウザ確認: ユーザー待ち**

### Phase 5 監査スクリプト 暫定完了（改善は別タスク）
スクリプト: `scripts/audit-data-quality.mjs`
レポート: `.codex/facility_data_quality_report.json` ほか3ファイル

**現在の検出結果と判断**:
| 問題 | 件数 | 判断 |
|---|---|---|
| 都道府県ミスマッチ | 881件 | **過剰検出**（ロジック要改善） |
| 説明文80字未満 | 948件 | **過剰検出**（閾値と基準要見直し） |
| タグ×カテゴリ矛盾 | 30件 | **有効**、次フェーズで確認対象 |

**監査ロジック改善方針（次タスク用）**:
- 都道府県: `prefecture_mismatch`（別県名明記）/ `invalid_address`（架空表現）/ `prefecture_missing_in_address`（都道府県名なし市区町村始まり、エラーでなく補完候補扱い）に分類
- 説明文: 文字数だけでなく内容で判定 — `short_description`（60字未満）/ `thin_description`（何ができる施設か不明）/ `missing_experience`（体験・設備・対象年齢情報不足）の3カテゴリに分類
- タグ矛盾30件: 職業体験なのにplayground / 水族館にanimal不在 / 科学館にscience不在 / 公園にwater_play根拠不明 を精査

---

## 今後やるべき残タスク（施設情報サイト側）

### Phase 3 候補(優先順)
1. **V10 audit追加分(id 941-975)の説明文・料金精査**(暫定値で取り込んだのでシートで磨ける)
2. **fetch-wiki の自動 strict フィルタ**(都度 `.tmp-strict-wiki-filter.mjs` を作っているので `--strict` フラグで1コマンド化)
3. **Google Places API で残り 618 件の画像取得**(無料枠内、約 $5)
4. **新4列のフロントエンド表示**(signature_experiences / unique_selling_point / experience_tags / summer_water_play は データに入っただけで UI 未対応、SEO 強化に効きそう)
5. **www → 非www リダイレクト** (現在 `www.trip-guide.net` は SSL エラー)
6. **お気に入り機能** (localStorage、軽量)
7. **検索機能の強化**(現在は単純な部分一致)
8. **群馬県の追加検討**(嬬恋村が長野県扱いで 3件混入しており、独立県化したい候補)

### コンテンツ拡充
- 季節特集ページ(春の桜、夏の水遊び、秋の紅葉、冬のスキー)
- 関東他県(茨城・群馬)/ 東北・北陸への拡大
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

- `HANDOFF.md` — このファイル（引継ぎメモ）
- `SPEC.md` — プロジェクト初期仕様書（旧 HANDOFF.md）
- `product-direction.md` — プロダクト方針書・実装進捗
- `CLAUDE_CODE_QUICKSTART.md` — 初期セットアップ手順
- `data/facilities_data.json` — 214施設の最新データ(全件緯度経度入り、68件画像付き)
- `data/facilities_data.json.bak.*` — タイムスタンプ付きバックアップ(gitignore)
- `data/wiki-image-blacklist.json` — Wikipedia ファジーマッチ却下済み id 一覧(40件)
- `data/.gcp-sheets-credentials.json` — Sheets API サービスアカウント鍵(gitignore)
- `scripts/` — geocode.ts(Google fallback)/ geocode.mjs(Nominatim 一次)/ fetch-wiki-images.ts(blacklist対応済)/ optimize-images.mjs / **export-to-csv.ts** / **sync-from-sheet.ts** / **append-to-sheet.ts** / **push-to-sheet.ts**

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
trip-guide.net は 9県968施設で公開稼働中です(関東甲信越カバー、Sheets API 双方向書き込み運用)。
HANDOFF.md を読んで現状を把握してください。
今日は Phase 3 の「[進めたい項目]」を進めたいです。
```

データ追加をしたい時(V11+):
```
data/v11_additions_for_sheet.csv を作りました。標準フローで取り込んでください。
```
→ Claude が以下を順次実行:
1. `npm run append-to-sheet -- data/v11_additions_for_sheet.csv`
2. `npm run sync-sheet`(自動採番、warning 出ればカテゴリ正規化)
3. `npm run push-to-sheet`(id 書き戻し)
4. `node scripts/geocode.mjs` → `npm run geocode`(Nominatim → Google fallback)
5. `npm run fetch-wiki` + 厳格フィルタ(`.tmp-strict-wiki-filter.mjs` をその都度作成)+ ブラックリスト追加
6. **`npm run build`** で prerender 検証(これ抜かすと Vercel が静かに失敗する)
7. もう一度 `push-to-sheet` で完全同期
8. commit & push

---

新セッションで取りかかりやすいクイック作業:
- **V10 追加分(id 941-975)の説明文・料金を精査**(WebSearch ベース暫定値、シートで magic で磨く)
- **新4列(signature_experiences ほか)を施設詳細ページに表示**(SEO とロングテール強化に効く)
- **Places API 写真取得**(Cloud Console で API 有効化 + `npm run fetch-images` 実行、約 $5)
