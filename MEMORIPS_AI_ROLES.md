# Memorips AI 役割分担

> 最終更新: 2026-06-10

---

## 役割一覧

| エージェント | 役割 | 主な担当範囲 |
|---|---|---|
| **GPT** | 相談役・事業PM | 事業方針・優先順位判断・PMレビュー・成長戦略 |
| **Claude Code PM** | プロジェクト管理 | product-direction.md 更新・タスク整理・Codex への指示出し・仕様書作成 |
| **Codex** | 実装 | コーディング・ブラウザQA・lint/typecheck・migration・UI修正 |

---

## 各エージェントの詳細

### GPT（相談役・事業PM）

- 事業戦略・プロダクト方針の相談
- 優先順位判断・意思決定サポート
- 機能アイデアのブレスト
- Claude Code PM が迷ったときの上位判断

### Claude Code PM（このスレッド）

- product-direction.md の更新・管理
- タスク仕様書の作成（`.codex/` 配下）
- Codex への指示出し（agmsg 経由）
- Codex の実装レビュー（GO/NO-GO 判定）
- 実装後の動作確認依頼（オーナーへ）
- デプロイ判断・依頼

**やらないこと**:
- コードの直接編集（`.md` ファイルと `.codex/` 仕様書のみ）
- Vercel / Supabase の直接操作
- シークレットの受け取り・貼り付け

### Codex（実装担当）

- Next.js / TypeScript のコーディング
- SQL migration ファイルの作成
- UI実装・スタイル調整
- lint / tsc / build 確認
- vercel --prod デプロイ
- 実装完了後に agmsg で GO を報告

**やらないこと**:
- 仕様・優先順位の判断
- product-direction.md の更新
- シークレットをチャット・agmsg に貼ること

---

## シークレット管理ルール（全エージェント共通）

- Supabase key / Vercel token 等はチャット・agmsg に貼らない
- シークレットは `C:\Users\tomo-\.codex\.sandbox-secrets\` を参照
- 個人情報・写真・ブランド・ドメイン構成に関わる判断はオーナー確認

---

## 将来のエージェント拡張候補

以下が重くなってきた時点でサブエージェント化を検討：

| 候補 | 担当 | タイミング |
|---|---|---|
| UXレビュー担当 | フォーム体験・モバイルUI品質 | 写真・アルバム機能着手時 |
| Data/Privacyレビュー担当 | RLS確認・個人情報取り扱い | 匿名集計・公開データ実装時 |
| Growth/SEOレビュー担当 | SEOコンテンツ・集客施策 | ベータ公開・LP作成時 |

---

## コミュニケーションフロー

```
オーナー
  ↕
Claude Code PM（このスレッド）
  ├── agmsg → Codex（実装依頼・GO確認）
  └── 必要時 → GPT（方針相談）

Codex
  └── agmsg → Claude Code PM（完了報告・GO送信）

オーナー
  └── Supabase Dashboard で migration 手動実行
      （Claude Code PM から依頼、完了後に報告）
```
