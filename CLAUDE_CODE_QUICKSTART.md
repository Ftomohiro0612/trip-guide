# Claude Code クイックスタート - trip-guide.net

このドキュメントは、Claude Codeを起動してから実際の開発に入るまでの手順です。

## 0. 事前準備（一度だけ）

### Node.jsのインストール
```bash
# バージョン確認
node --version  # v18以上推奨

# まだの場合は https://nodejs.org からインストール
```

### Claude Codeのインストール
```bash
npm install -g @anthropic-ai/claude-code
```

### 作業ディレクトリの作成
```bash
mkdir ~/projects/trip-guide
cd ~/projects/trip-guide
```

### 添付ファイルを作業ディレクトリに配置
このセッションで作成した以下の3ファイルを `~/projects/trip-guide/` にコピー：
- `facilities_data.json` （151件の施設データ）
- `HANDOFF.md` （詳細な仕様書）
- `CLAUDE_CODE_QUICKSTART.md` （このファイル）

---

## 1. Claude Code起動

```bash
cd ~/projects/trip-guide
claude
```

## 2. 最初のプロンプト（コピペでOK）

```
このディレクトリで、子供向け遊び場検索サイト trip-guide.net を作りたい。

まず HANDOFF.md と facilities_data.json を読み込んで、プロジェクトの全体像を把握してください。

その後、Phase 1 (MVP) の実装を進めていきましょう。具体的には：

1. Next.js 14 (App Router) + TypeScript + Tailwind CSS のプロジェクトを初期化
2. facilities_data.json を読み込むための型定義
3. トップページ（ヒーロー + クイックフィルタ + エリアカード）
4. 施設一覧ページ（フィルタ機能付き）
5. 施設詳細ページ

まずは1のプロジェクト初期化から始めて、その都度動作確認しながら進めてください。
```

## 3. 開発中によく使うコマンド

### 開発サーバー起動
```bash
npm run dev
# → http://localhost:3000 で確認
```

### ビルド確認
```bash
npm run build
npm run start
```

### Claude Codeに修正を依頼
```
[Claude Code内で]
施設詳細ページのレイアウトをもっとモバイルフレンドリーにして
```

---

## 4. Vercelへのデプロイ手順

### 4.1 Gitリポジトリ作成
```bash
git init
git add .
git commit -m "Initial commit"
```

### 4.2 GitHubにプッシュ
1. GitHub.com で新規リポジトリ作成（例: `trip-guide`）
2. ローカルから接続
```bash
git remote add origin https://github.com/[your-username]/trip-guide.git
git branch -M main
git push -u origin main
```

### 4.3 Vercelにデプロイ
1. https://vercel.com にアクセス、GitHubアカウントでログイン
2. 「Add New Project」→ trip-guideリポジトリを選択
3. 「Deploy」ボタンを押すだけ（Next.jsは自動検出される）
4. デプロイ完了後、`https://trip-guide-xxx.vercel.app` のURLが発行される

### 4.4 独自ドメイン接続
1. Vercelプロジェクト → Settings → Domains
2. `trip-guide.net` を追加
3. 表示されたDNSレコード（A or CNAME）を、ドメイン管理サービス（お名前.com等）で設定
4. 数分～数時間でSSL証明書も自動発行されて完了

---

## 5. デプロイ後の継続的な更新フロー

### 施設データを追加・更新する場合
```bash
# 1. facilities_data.json を編集（または新しいExcelをJSONに変換）
# 2. コミット&プッシュ
git add data/facilities_data.json
git commit -m "Add new facility: XXX"
git push

# → Vercelが自動でビルド&デプロイ（約1-2分で本番反映）
```

### 機能追加・改修する場合
```bash
# 1. 開発ブランチを切る
git checkout -b feature/map-view

# 2. Claude Codeで実装
claude
> 地図ビュー機能を追加してほしい

# 3. ローカルで動作確認
npm run dev

# 4. main にマージしてプッシュ
git checkout main
git merge feature/map-view
git push
```

---

## 6. SEO対策チェックリスト（公開前）

- [ ] サイトマップ生成（`next-sitemap`）
- [ ] robots.txt 配置
- [ ] Google Search Console 登録 + サイトマップ提出
- [ ] Google Analytics 4 設定
- [ ] OGP画像（1200x630）を全ページに設定
- [ ] 構造化データ（JSON-LD）を施設詳細ページに埋め込み
- [ ] メタディスクリプションを各ページに設定
- [ ] 表示速度確認（PageSpeed Insights で90点以上目標）
- [ ] モバイルフレンドリーテスト合格
- [ ] 内部リンク構造の確認（すべてのページが3クリック以内）

---

## 7. 困ったときの対処法

### Claude Codeでうまく動かない時
- 「もっと具体的に〇〇のステップで進めて」と分割してお願いする
- エラーが出たらそのままClaude Codeに貼り付ける（自動で修正してくれる）
- 大きな変更前は `git commit` で保存しておく（巻き戻せる）

### Vercelデプロイがエラーする時
- ローカルで `npm run build` が通るか確認
- `next.config.js` の設定を見直す
- 環境変数が必要なら Vercel Settings で設定

### 表示速度が遅い時
- 画像は `next/image` を使う
- データのフィルタリングはサーバーコンポーネントで処理
- 不要なJavaScriptを削減

---

## 8. 将来的な拡張アイデア

### Phase 5: コミュニティ機能
- ユーザーレビュー（Disqusなど無料サービスから始める）
- お気に入り・「行った」「行きたい」ボタン
- SNSシェア機能

### Phase 6: マネタイズ
- アフィリエイトリンク（じゃらん、楽天トラベル）
- Google AdSense（ただし子供向けサイトは規約注意）
- 施設からの掲載料（B2B）

### Phase 7: 全国展開
- 静岡・長野・山梨で実績を作ってから、神奈川・東京など隣接県へ展開
- データ収集をMake自動化パイプラインで効率化

---

がんばってください！🚀

何か詰まったらまた claude.ai のセッションで相談してくださいね。
