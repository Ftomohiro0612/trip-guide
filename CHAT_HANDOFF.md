# trip-guide.net プロジェクト 引継ぎメモ

このメモは、Claude(チャット相棒)に状況を引き継ぐためのものです。
新しいセッションで「このメモを読んで状況を把握してください」と最初に伝えれば、続きから相談できます。

---

## ユーザーについて

- **役割**: trip-guide.net(子供向け遊び場検索サイト)のオーナー兼開発者
- **技術レベル**: Node.js / Git / Next.js などの基礎は今回が初体験。コマンドラインも慣れていない
- **環境**: Windows 11、PowerShell、Node.js v24.15.0、npm 11.12.1、Claude Code v2.1.126
- **作業ディレクトリ**: `C:\Users\tomo-\projects\trip-guide`
- **GitHub アカウント**: `Ftomohiro0612`(リポジトリはまだ作成していない可能性あり)

## プロジェクト概要

- **サイト名**: trip-guide.net
- **目的**: 子供向け遊び場(主に静岡・山梨・長野の施設151件)の検索サイト
- **スタック**: Next.js 14 (App Router) + TypeScript + Tailwind CSS
- **ホスティング予定**: Vercel
- **元データ**: `facilities_data.json`(151施設、全フィールド入り)
- **詳細仕様**: `HANDOFF.md`(プロジェクトの完全な仕様書)
- **クイックスタート**: `CLAUDE_CODE_QUICKSTART.md`(セットアップ手順)

## 現在の進捗

### 完了済み(Phase 1 MVP)
別の Claude Code セッションを `trip-guide` フォルダで動かして、以下まで完成済み:

- ✅ Next.js プロジェクト初期化(TypeScript + Tailwind + App Router)
- ✅ `app/layout.tsx` — Noto Sans JP / Header / Footer / SEO メタデータ
- ✅ `app/page.tsx` — ヒーロー + クイックフィルタ + エリア3カード + カテゴリ15カード + ピックアップ
- ✅ `app/facilities/page.tsx` — 一覧(サイドバーフィルタ + ソート + 空状態)
- ✅ `app/facilities/[slug]/page.tsx` — 詳細(基本情報テーブル + Google Maps embed + JSON-LD構造化データ + 関連施設)
- ✅ `lib/facilities.ts`, `lib/filter.ts`, `lib/icons.ts` — データアクセス・フィルタ・アイコン
- ✅ `types/facility.ts` — 全データ型
- ✅ `components/` — Header / Footer / FacilityCard / QuickFilter / FilterSidebar / SortSelect

### 動作確認済みの URL(localhost:3000)
- ホーム: `/`
- 一覧: `/facilities`
- フィルタ例: `/facilities?prefectures=yamanashi&fee=free`
- 雨の日OK: `/facilities?tags=雨の日OK`
- 詳細例: `/facilities/facility-001`

### Phase 2 候補(未着手)
1. **GitHub & Vercel デプロイ**(最優先候補。本番URL発行)
2. `/prefecture/[id]` と `/category/[id]` のページ(リンクは既にあるが404)
3. `next-sitemap`, `robots.txt`(SEO必須)
4. 施設詳細の OGP 画像
5. 地図ビュー(Leaflet)

## 直近のやり取りで決まっていること

- **次にやるべきは「GitHub & Vercel デプロイ」が優先候補**(早期公開でモチベ維持 + 後の更新が自動反映に)
- **GitHub ユーザー名は `Ftomohiro0612`**、リポジトリ名は `trip-guide` の予定
- **Git のユーザー設定はまだ未完了**(`git config --global user.name/email` を実行していない可能性あり)
- **Git for Windows がインストール済みかどうか未確認**

## 役割分担(ユーザーの希望)

- **チャット相棒の Claude(あなた)**: 戦略相談、手順案内、エラー翻訳、学習サポート
- **実装担当の Claude Code(別セッション)**: コード作成、修正、テスト、デプロイコマンド実行

ユーザーは「黒い画面(CLI)」より「チャット相棒との会話」を好むため、できるだけチャット側で計画を固めてから、CLI には1つのまとまった指示を投げる流れが理想。

## ユーザーへの接し方

- 専門用語は最小限に。使うときは必ず一言で噛み砕く
- 手順は番号付きで、コピペできる形で提示
- 画面のスクショを送ってくることが多いので、それを見て状況判断 → 次の一手を案内
- 「Yes / Enter / 矢印キーで↓」など具体的に
- できたら一度区切って「次どうする?」と相談する

## 参考ファイル(同フォルダ内)

- `HANDOFF.md` — プロジェクト完全仕様書
- `CLAUDE_CODE_QUICKSTART.md` — 初期セットアップ手順
- `facilities_data.json` — 151施設の元データ
- このメモ(`CHAT_HANDOFF.md`)

---

新セッションでは、まずユーザーに「ブラウザで `http://localhost:3000` を開いて完成を確認しましたか?」と聞いて、その後「次は GitHub & Vercel デプロイ進めますか?」と提案するのが自然です。
