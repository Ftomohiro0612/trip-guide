# trip-guide.net PM 概要ドキュメント

> 作成日: 2026-06-09  |  担当PM: Claude Code  |  情報源: GitHub / ローカルプロジェクト / CHAT_HANDOFF.md

---

## 1. プロジェクト基本情報

| 項目 | 値 |
|---|---|
| サイト名 | trip-guide.net |
| コンセプト | 「子供が楽しめる遊び場がすぐ見つかる！」子育て世代向け施設検索サイト |
| 本番URL | https://trip-guide.net（SSL有効・独自ドメイン稼働中） |
| Vercel Preview | https://trip-guide-nine.vercel.app |
| GitHub | https://github.com/Ftomohiro0612/trip-guide（アカウント: Ftomohiro0612） |
| ローカルパス | `C:\Users\tomo-\projects\trip-guide` |
| DNS管理 | Xserver（Aレコードのみ Vercel に向け変更。MX/NS/SPF/DKIM は Xserver 維持） |
| 運営 | FIC（FIC投資研究所 / info@fic-investment.biz） |

---

## 2. 技術スタック

| 領域 | 技術 |
|---|---|
| フロントエンド | Next.js 16 (App Router) + TypeScript + Tailwind CSS v4 + Turbopack |
| データ管理 | data/facilities_data.json（直接読み込み） |
| 地図 | Leaflet + OpenStreetMap（一覧ページ）/ Google Maps Embed（詳細ページ） |
| ホスティング | Vercel（無料枠） |
| SEO | next-sitemap（186 URL）+ JSON-LD（LocalBusiness/TouristAttraction） |
| アナリティクス | Google Analytics 4（測定ID: G-1V6K1ZJH6S） |
| Search Console | https://trip-guide.net 登録済み、Sitemap 提出済み |

---

## 3. 現在の開発状況（2026-06-09 時点）

### ✅ Phase 1: MVP（完了）
- ヒーロー + クイックフィルタ + エリアカード + カテゴリカード
- 施設一覧（サイドバーフィルタ + ソート）
- 施設詳細（JSON-LD + Google Maps + 関連施設）
- Leaflet 地図（968マーカー、県別カラー、フィルタ）

### ✅ Phase 2: SEO強化（完了）
- 県別ページ × 9、カテゴリ別ページ × 20、タグページ × 10
- 自動生成 OGP 画像（Noto Sans JP埋め込み）
- BreadcrumbList / WebSite SearchAction / ItemList JSON-LD
- canonical URL 全主要ページ付与

### ✅ データ充実（完了）
- **968施設** / 9県カバー（最終更新: 2026-05-04）
- 県別内訳: 静岡 68 / 長野 73 / 山梨 72 / 東京 155 / 栃木 118 / 埼玉 118 / 新潟 120 / 千葉 115 / 神奈川 124
- 施設写真 350件（36%）—— Wikipedia 完全一致のみ採用
- カテゴリ数: 20種類

### ✅ 本番デプロイ（完了）
- GitHub + Vercel 連携（push → 自動デプロイ）
- GA4 実装・動作確認済み
- Google Search Console 所有権確認 + Sitemap 提出済み

### 🔜 次フェーズ（未着手）
- コンテンツ拡充（施設写真の追加、ブログ記事）
- UX向上（「現在地から近い順」機能）
- ユーザーレビュー機能（v2）

---

## 4. 施設情報の取得パイプライン（全工程）

新規施設データを1件本番に反映するまでに、以下の工程が順番に走ります。

### データフロー全体像

```
① AI (Claude) が WebSearch で施設をリサーチ → CSV 生成
        ↓
② CSV を Google スプレッドシートに追加
  （append-to-sheet または手動インポート）
        ↓
③ npm run sync-sheet  ← Sheets CSV → JSON マージ・自動採番
        ↓
④ npm run push-to-sheet  ← 採番結果を Sheets に書き戻し（id重複防止）
        ↓
⑤ npm run geocode  ← 住所 → 緯度経度（Nominatim → Google fallback）
        ↓
⑥ npm run fetch-wiki  ← Wikipedia API で施設写真取得（厳格一致のみ）
        ↓
⑦ npm run fetch-images  ← Google Places API で写真取得（残り618件対象）
        ↓
⑧ npm run optimize-images  ← sharp で画像圧縮・リサイズ
        ↓
⑨ npm run build  ← ローカルビルド検証（prerender で型エラーを事前検知）
        ↓
⑩ git push → Vercel 自動デプロイ
```

---

### 各工程の詳細

#### ① AI (Claude) による施設リサーチ
- V7〜V10（東京150件・関東5県506件・68件・35件）はすべて Claude が WebSearch で各県の子供向け施設を検索し CSV を生成
- V10は「9県完成度 audit」として、WebSearch ベースで漏れ施設を検出して補完
- 生成 CSV は 22列スキーマに合わせてフォーマット

#### ② Google スプレッドシート（マスター）
- **シートID**: `1p4bqL1Oq89k5c-9Wa0REXd8BojzUBBXfF5-iSYEeeH4`
- 22列構成（id / 県 / カテゴリ / 施設名 / 所在地 / 屋内外 / 雨天対応 / 料金タイプ / 大人料金 / 子供料金 / 説明文 / 対象年齢 / URL / lat / lng / image / image_credit / tags / signature_experiences / unique_selling_point / experience_tags / summer_water_play）
- 追加方法: `npm run append-to-sheet -- file.csv`（API直接追記）または Sheets 画面から手動インポート

#### ③ JSON同期: `npm run sync-sheet`
- スプレッドシートの公開 CSV を取得 → `data/facilities_data.json` にマージ
- id がない行は自動採番
- スクリプト: `scripts/sync-from-sheet.ts`

#### ④ id書き戻し: `npm run push-to-sheet`
- 自動採番された id を Sheets に書き戻す（これをしないと次回 sync で重複発生）
- Google サービスアカウント経由（Sheets API 書き込み権限）
- スクリプト: `scripts/push-to-sheet.ts`

#### ⑤ 緯度経度取得: `npm run geocode`
- **一次**: Nominatim（OpenStreetMap、無料・1req/sec 制限）→ `scripts/geocode.mjs`
- **フォールバック**: Google Geocoding API（`GOOGLE_GEOCODING_API_KEY`）→ `scripts/geocode.ts`
- 失敗時は県の重心座標 ± ランダムオフセットで暫定配置

#### ⑥ Wikipedia 画像取得: `npm run fetch-wiki`
- Wikipedia API で施設名を検索して写真を取得（無料・著作権フリー）
- **採用ポリシー: 記事タイトルが施設名と完全一致するもののみ**（ファジー検索は却下）
- 却下履歴: `data/wiki-image-blacklist.json`（同施設を再取得しない）
- スクリプト: `scripts/fetch-wiki-images.ts`

#### ⑦ Google Places API 画像取得: `npm run fetch-images`
- **Google Places API (New)** を使用（`places.googleapis.com/v1/places:searchText`）
- 「施設名 + 都道府県」でテキスト検索 → 最初の写真を `maxWidthPx=1200` でダウンロード
- 著作権クレジットを `image_attribution` に自動保存
- 有料（推定コスト: SearchText $0.032 + Photo $0.007 = 約 $0.039/件）
- スクリプト: `scripts/fetch-images.ts`

#### ⑧ 画像最適化: `npm run optimize-images`
- **sharp** ライブラリで圧縮・リサイズ
- スクリプト: `scripts/optimize-images.mjs`

#### ⑨ ローカルビルド検証: `npm run build`
- `Generating static pages` で全施設ページをプレレンダリング
- 列値の型エラーがあれば Vercel push 前にここで検知できる
- **これを飛ばすと Vercel が静かに失敗して本番が古いまま固定される**

#### ⑩ デプロイ: `git push`
- Vercel が GitHub への push を検知して自動デプロイ
- デプロイ後 1〜2分で `vercel inspect https://trip-guide.net` でステータス確認

---

## 5. 認証キー一覧

> 保存場所: `C:\Users\tomo-\.codex\.sandbox-secrets\`

| ファイル名 | 用途 |
|---|---|
| `coastal-mercury-495123-k5-83baf0c72a93.json` | Google サービスアカウント（Sheets API 読み書き用）|
| `google-oauth-client.json` | Google OAuth クライアント（Sheets API アクセス） |
| `google-oauth-token.json` | Google OAuth トークン（発行済み） |
| `x-api.json` | X（旧Twitter）API キー |
| `youtube-oauth-token.json` | YouTube OAuth トークン |
| `fic-wp.json` | FIC WordPress 認証情報 |
| `sumahokeiyaku-wp.json` | スマホ契約 WordPress 認証情報 |
| `sumahoryokinlab-wp.json` | スマホ料金ラボ WordPress 認証情報 |
| `wp-app-password.json` | WordPress アプリパスワード |

> `.env.local`（`C:\Users\tomo-\projects\trip-guide\.env.local`）
> - `GOOGLE_GEOCODING_API_KEY` = Google Geocoding API キー

---

## 6. データ運用の重要ルール（落とし穴）

### ルール1: id の書き戻し（必須）
新規施設をシートに id 空で追加 → `npm run sync-sheet` で自動採番 → **その後 `npm run export-csv` してシートに再インポート**しないと、次回同期で重複が発生する。

### ルール2: 列値の正規化（Vercel ビルド失敗を防ぐ）
| 列 | 正しい値のみ |
|---|---|
| 屋内・屋外 | `屋内` / `屋外` / `両方` |
| 雨天対応 | `◎` / `△` / `×` |
| 料金タイプ | `無料` または `有料` で始まる文字列 |
| 県 | `静岡県` / `長野県` / `山梨県` / `東京都` / `栃木県` / `埼玉県` / `新潟県` / `千葉県` / `神奈川県` |

### ルール3: push 前にローカルビルド確認
```powershell
npm run build
```
`Generating static pages` フェーズで全施設ページをプレレンダリングするため、型エラーを事前に検知できる。**これを飛ばして push すると Vercel ビルドが失敗し、本番が古いまま固定される（エラーバナーなし）。**

---

## 7. ローカルファイルの場所まとめ

| 場所 | 内容 |
|---|---|
| `C:\Users\tomo-\projects\trip-guide` | メインプロジェクト（本体） |
| `C:\Users\tomo-\.codex\.sandbox-secrets\` | 認証キー各種 |
| `C:\Users\tomo-\projects\trip-guide\.env.local` | ローカル環境変数 |
| `C:\Users\tomo-\projects\trip-guide\data\facilities_data.json` | 968施設データ（本体） |
| `C:\Users\tomo-\projects\trip-guide\scripts\` | データ取得・同期スクリプト |
| `C:\Users\tomo-\Documents\Memorip\` | PM管理ドキュメント（本ファイル） |

---

## 8. SEO戦略

- ターゲット: ロングテール（「山梨 子供 雨の日」「河口湖 子連れ 遊び場」等）
- 構造化データ（LocalBusiness / TouristAttraction JSON-LD）全施設詳細ページに実装済み
- サイトマップ: 186 URL（Search Console 提出済み、ステータス「成功」）
- OGP 画像: 県・カテゴリ・タグ・施設詳細ごとに自動生成

---

## 関連ドキュメント

- [RESEARCH_METHODOLOGY.md](RESEARCH_METHODOLOGY.md) — 施設調査の10ステップ標準メソドロジー（山梨モデル）

---

*このドキュメントは Claude Code が 2026-06-09 にGitHub / ローカルプロジェクトから収集した情報をもとに作成。次回更新時はこのファイルを上書きすること。*
