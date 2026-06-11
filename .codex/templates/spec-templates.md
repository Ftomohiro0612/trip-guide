# Memorips 標準仕様書テンプレート集

> 作成: 2026-06-11 / Claude Code PM
> 目的: PM エージェントのモデルが変わっても（Fable 5 → Opus 等）、Codex への指示・レビューの品質を一定に保つ。
> 使い方: 該当テンプレートをコピーし `.codex/<タスク名>.md` として保存 → agmsg / codex exec で「仕様書 .codex/xxx.md を読んで実行」と指示する。

## 共通ルール（全テンプレート前提）

- シークレットは `C:\Users\tomo-\.codex\.sandbox-secrets\` 参照。値をチャット・agmsg・仕様書に貼らない
- Vercel デプロイは原則 PM の GO 後（仕様書に明記がある場合のみ即デプロイ可）
- 完了報告は agmsg で memorips チームの memorips-claude へ。commit hash は**実際の hash**を貼る（`<hash>` のような placeholder 禁止）
- 施設住所・座標は AI 推定で確定しない。公式サイト or Nominatim で確認し、ソース URL を報告に含める
- 個人データ（子ども名・メモ・写真）を公開ページに出さない

---

## 1. UI改善タスク

```markdown
# <タスク名>

> 作成: <日付> / Claude Code PM

## 背景
<現状の問題・ユーザーフィードバック・スクショ等>

## 目的
<このUI変更で達成したいこと（1〜3行）>

## 対象ファイル
- `app/...` / `components/...`（対象を列挙。対象外ファイルへの変更は禁止と明記）

## 実装要件
- <変更点を Before/After 形式 or 具体JSXで。曖昧語(「いい感じに」)を使わない>
- スマホ(375px)・PC両方のレイアウト指定
- 既存の Tailwind トーン（rounded-2xl/3xl, slate, sky/cyan/emerald, brand）に合わせる

## やってはいけないこと
- 対象外セクション・コンポーネントの変更
- metadata / SEO 要素（title, description, JSON-LD, sitemap関連）の変更（明示指示がない限り）
- 既存の検索・フィルター・認証ロジックの変更

## セキュリティ確認
- 新しい外部リンクに rel="noopener" / ユーザー入力の表示に XSS 懸念がないか

## 実行コマンド
npm run lint / npx tsc --noEmit / npm run build
（可能ならローカル起動して該当ページの HTTP 200 と主要文言を確認）

## 完了条件
- [ ] 指定どおりの表示（スマホ・PC）
- [ ] 対象外への変更がない（git diff --stat で確認）
- [ ] lint / tsc / build 全パス

## 報告すべき項目
- commit hash / 変更ファイル一覧 / 実行した検証コマンドと結果 / 確認できなかった項目（あれば正直に）

## コミットメッセージ例
feat: <画面名> — <変更内容を1行で>
fix: <画面名> — <修正内容>（バグ修正の場合）
```

---

## 2. DB / RLS 変更タスク

```markdown
# <タスク名>

## 背景
<なぜスキーマ変更が必要か>

## 目的
<新機能・修正の1〜3行説明>

## 対象ファイル
- `supabase/migrations/0XX_<name>.sql`（新規。既存 migration の書き換え禁止）
- 関連するアプリコード

## 実装要件
- テーブル定義 / カラム追加（型・NOT NULL・デフォルト・FK・ON DELETE を明示）
- RLS: ENABLE ROW LEVEL SECURITY + ポリシー（SELECT/INSERT/UPDATE/DELETE それぞれ）
- GRANT を authenticated に限定（anon に出すのは集計RPCのみ）
- インデックス（FK・検索キー）

## やってはいけないこと
- 既存 migration ファイルの編集（必ず新番号で追加）
- RLS なしのテーブル作成
- service role キーのアプリコード使用
- anon へのテーブル直接 GRANT
- DROP / DELETE を含む migration（PM の明示承認が必要）

## セキュリティ確認
- 全テーブルで `user_id = auth.uid()` 系のポリシーが効いているか
- SECURITY DEFINER 関数に search_path 固定があるか

## 実行コマンド
npm run lint / npx tsc --noEmit / npm run build
（migration はオーナーが Supabase SQL Editor で手動実行 → PM 経由で完了連絡を受けてからアプリコードの動作確認）

## 完了条件
- [ ] migration SQL 作成（手動実行待ちの状態で報告）
- [ ] RLS テスト手順 or テスト SQL を添付
- [ ] 一時ユーザーA/Bで他人データへのアクセス不可を確認（migration 実行後）

## 報告すべき項目
- commit hash / migration 番号とファイル名 / オーナーに依頼する手動作業の手順 / RLSテスト結果

## コミットメッセージ例
feat: Migration 0XX — <テーブル名> 追加（RLS・GRANT・trigger）
```

---

## 3. データ監査タスク

```markdown
# <タスク名>

## 背景
<検出したいデータ品質問題。過去の過剰検出事例(881件問題)を踏まえること>

## 目的
<監査で何を検出し、何をしないか>

## 対象ファイル
- `scripts/audit-data-quality.mjs`（既存構成を最小限の破壊で拡張）
- 出力: `.codex/` 配下の JSON + Markdown レポート

## 実装要件
- 検出条件を「確実に問題があるもの」に絞る（疑わしい＝即エラーにしない）
- severity（high/medium/low/info）を付与
- 判断が曖昧なものは needs_web_check: true で出力のみ

## やってはいけないこと
- **facilities_data.json の自動修正**（監査と修正は必ず別タスク・別コミット）
- 外部 API の大量呼び出し（Nominatim はレート制限 1req/s 厳守、基本はローカル判定）
- 「住所に都道府県名がない＝エラー」のような過剰検出ルール

## セキュリティ確認
- レポートに API キー等が混入していないか

## 実行コマンド
node scripts/audit-data-quality.mjs / npm run lint

## 完了条件
- [ ] スクリプトがエラーなく完走
- [ ] カテゴリごとの件数がレポートに出る
- [ ] サンプル10件を目視し過剰検出がないか自己評価して報告

## 報告すべき項目
- 各カテゴリ件数 / 過剰検出の疑いと根拠 / 新規に見つかった重大データ汚染（あれば個別に）

## コミットメッセージ例
feat: 監査スクリプト — <チェック名> 追加
fix: 監査vX.X — <過剰検出の解消内容>
```

---

## 4. 子ども情報・写真・個人データを扱う機能

```markdown
# <タスク名>

## 背景・目的
<機能の説明。「誰のどんな個人データを、どこで、誰に見せるか」を必ず明文化>

## 対象ファイル
<列挙>

## 実装要件
- データは本人（user_id = auth.uid()）のみ参照可能
- ページは robots noindex / OGP 生成なし
- 写真: private バケット + signed URL（短期）+ EXIF 除去 + GPS 不保存
- 削除機能必須（個人データは消せること）

## やってはいけないこと
- 子ども名・自由メモ・写真を公開ページ（施設ページ・OGP・sitemap）に出す
- public バケット / getPublicUrl の使用
- EXIF・GPS の保存
- service role キーの使用
- 「あとで非公開にする」前提の一時公開

## セキュリティ確認（全項目必須）
- [ ] 他人の ID 直接アクセスで 404（403ではなく404で存在を隠す）
- [ ] 未ログイン時はログイン誘導
- [ ] RLS テスト（一時ユーザーA/B）実施
- [ ] noindex の確認
- [ ] grep で getPublicUrl / service role の不使用確認

## 実行コマンド
npm run lint / npx tsc --noEmit / npm run build + RLSテスト

## 完了条件
- 上記セキュリティ確認が全部✅であること（1つでも未確認なら GO を出さず報告）

## 報告すべき項目
- commit hash / セキュリティ確認の各項目の実施方法と結果 / 未確認項目（あれば必ず明示）

## コミットメッセージ例
feat: <機能名>（RLS・noindex・EXIF除去）
```

---

## 5. Codex 実装完了報告（Codex が agmsg で送る形式）

```markdown
GO / NO-GO: <どちらか明記。NO-GO の場合は理由>

## 実施内容
- <変更点を箇条書き 3〜6行>

## commit
<実際の full or short hash。placeholder 禁止>

## 検証
- npm run lint: PASS/FAIL
- npx tsc --noEmit: PASS/FAIL
- npm run build: PASS/FAIL
- <機能固有の検証（HTTP確認・RLSテスト等）と結果>

## 未実施・できなかったこと
- <正直に列挙。なければ「なし」>

## 残存課題・気づき
- <あれば。スコープ外で見つけた問題もここに>
```

---

## 6. デプロイ前レビュー（PM が GO 判定に使うチェックリスト）

```markdown
# デプロイ前レビュー: <対象>

## 確認項目
- [ ] 対象 commit が main にあり、git status が clean
- [ ] lint / tsc / build 全パスの報告がある
- [ ] git diff --stat で意図しないファイル変更がない（特に data/*.json, sitemap, metadata）
- [ ] 個人データ機能の場合: テンプレート4のセキュリティ確認が全部✅
- [ ] DB変更を含む場合: migration がオーナーにより実行済み
- [ ] 破壊的変更（URL変更・データ削除）が含まれる場合: オーナーの明示承認がある
- [ ] ロールバック手段の確認（直前の正常 deployment ID を控える）

## 判定
GO / NO-GO（NO-GO理由: ）

## デプロイ後確認
- [ ] 本番 URL で HTTP 200
- [ ] 変更箇所の表示確認（PC/スマホ）
- [ ] 既存主要動線（トップ→施設一覧→施設詳細→記録）が壊れていない
```

---

## 7. PR レビュー依頼（外部レビュー or /code-review 利用時）

```markdown
# レビュー依頼: <PR/commit>

## 背景・目的
<1〜3行>

## 変更概要
- <ファイルと変更点>

## 特に見てほしい点
- <ロジックの正しさ / RLS / パフォーマンス など具体的に>

## レビュー観点チェック
- [ ] 認可漏れ（user_id チェック・RLS）
- [ ] 個人データの露出（公開ページ・ログ・OGP）
- [ ] Next.js 16 の規約（searchParams await 等）
- [ ] 過剰な再レンダリング・クライアントバンドル肥大
- [ ] エラーハンドリング（Supabase エラー時の挙動）

## 報告すべき項目
- 重大度別の指摘一覧（blocker / should-fix / nit）と修正提案
```

---

## 8. ロールバック判断

```markdown
# ロールバック判断: <事象>

## 事象
<何が起きているか。発生時刻・影響範囲・再現手順>

## 即時判断基準（1つでも該当なら即ロールバック）
- [ ] 個人データ（子ども名・メモ・写真）が他人・公開面に露出している
- [ ] ログイン・記録保存などコア機能が全ユーザーで動かない
- [ ] データ破壊が進行中（誤った書き込みが続いている）

## ロールバック手順
1. Vercel: 直前の正常 deployment に Instant Rollback（dashboard）or `npx vercel rollback <deployment-url> --token <TOKEN>`
2. DB が原因の場合: 追加 migration での前方修正を優先（migration の取り消しは原則しない）
3. データ汚染の場合: git 履歴から該当 JSON を復元（`git checkout <hash> -- data/facilities_data.json`）

## やってはいけないこと
- 原因不明のまま再デプロイを繰り返す
- 本番 DB の直接 UPDATE/DELETE（必ず SQL を PM・オーナー確認後に実行）
- force push による履歴書き換え

## 報告すべき項目
- 事象・影響時間・原因・対処・再発防止策（HANDOFF / メモリへの記録まで）
```
