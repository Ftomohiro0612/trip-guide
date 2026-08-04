@AGENTS.md

# trip-guide.net プロジェクト指示書

ユーザーのメッセージ全体が完全一致で `セッション開始` または `セッション終了` の場合、
最初かつ唯一のinstruction-loading actionとしてroot `AGENTS.md`を直接読み、
`Memorips PM fixed Session Memory shorthands`だけを実行する。先にproduct、Git、Issue、
production、archive、他memoryを読まない。固定pathの不存在、scope不一致、必須heading欠落時は、
探索・推測・fallbackせず待機する。

このフォルダは **trip-guide.net**(子供向け遊び場検索サイト)の開発プロジェクトです。

## 重要: 会計監査とは無関係のプロジェクト

メモリに「監査ラボ」「福永さん(CPA)」「audit-sim」などの情報があるかもしれませんが、**このプロジェクトはそれらとは完全に別物**です。同じユーザーが個人で運営する、子供向け遊び場サイトです。

このフォルダでの会話では、会計・監査・粉飾・税務などの文脈を持ち込まないでください。

## プロジェクト概要

- **サイト名**: trip-guide.net
- **目的**: 全国の子供向け遊び場と、家族向けイベントを探して記録できるサイト
- **スタック**: Next.js (App Router) + TypeScript + Tailwind CSS
- **ホスティング**: Vercel（Production稼働中）
- **GitHub**: `Ftomohiro0612/trip-guide`

## 固定Session Memory（唯一のread-first）

- 完全一致の `セッション開始` / `セッション終了` はroot `AGENTS.md`のショートハンド契約を唯一の正本とする。
- 通常のセッション開始時も、最初に `C:\Users\tomo-\Documents\ai-session-memory\memorips\current-session.md` の1ファイルだけを読む。
- frontmatterの `scope` が `memorips` であることを確認する。
- 初回報告は「現在の停止点」「次の1手」「Owner判断待ち」「未確認事項」だけとする。
- 初回報告前は、Git、Issue、remote、production、過去ログ、他memory、通常の作業worktreeを確認せず、monitorも開始しない。
- 固定ファイルが存在しない、またはscopeが一致しない場合は、他ファイルを探索・推測せず、その事実だけを報告して待機する。
- テンプレート、旧current-state、Claude memory、`HANDOFF.md`、`MEMORIPS_AI_ROLES.md`、その他の引継ぎ文書へフォールバックしない。
- セッション終了時は固定Session Memoryだけを最新化する。引継ぎ目的でproduct repoやai-memory-memoripsのbranch変更、stash、clean化、production再確認、hot memory整合、Obsidian更新を行わない。

## ユーザーの技術レベル

- Node.js / Git / Next.js は今回が初体験
- コマンドラインに慣れていない
- Windows 11 + PowerShell 環境
- 専門用語は最小限に、噛み砕いて説明すること
- 手順は番号付き・コピペ可能な形で提示
- スクショを送ってきたらそれを見て次の一手を案内

## 進捗状況

最新の停止点と次の1手は、上記の固定Session Memoryだけを参照する。
通常イベントWaveの標準手順は `docs/event-wave-playbook.md` を正とするが、
セッション開始時の状態復元には使用しない。

## AI役割分担

**本節が役割の唯一の正本（2026-08-04 役割正本統一・Owner確定）。他ファイルに矛盾する記載があれば本節を優先する。**

- Claude Code PM（このスレッド）: Mission・優先順位・Codexへの作業依頼・受入・Owner escalation・hot memory管理
- Codex: 調査・正本確認・データ更新・実装・automated validation・必要な独立検証・本番観測
- Fable 5: Ownerが具体的scopeを明示した場合だけの単発read-only上位レビュー
- Owner: GO／NO-GO／HOLD・権限境界・事業判断
- ChatGPT: Owner相談役のみ

施設鮮度・イベント鮮度・意思決定情報充実・Production Health Sentinelは別PMではなく、Claude Code PMからCodexへ与える専門実行モード。

Codexの自律運用は `ai-memory-memorips` の operating contract に従うが、Mission選択・優先順位付け・作業アサインはClaude Code PMの専管であり、Codexが単独でMissionの次アクションを選び続ける「並行PM」運用は行わない。

## 参考ファイル

- `MEMORIPS_AI_ROLES.md` — 旧AI役割分担ドキュメント。非正本（本節へ統一済み・内容は参照しないこと）
- `HANDOFF.md` — 過去の引継ぎメモ（最新状態やread-firstの根拠には使用しない）
- `docs/event-wave-playbook.md` — 通常イベントWaveの調査・L2・L3正本手順（read-firstには使用しない）
- `SPEC.md` — プロジェクト初期仕様書（旧 HANDOFF.md）
- `product-direction.md` — プロダクト方針書・実装進捗
- `CLAUDE_CODE_QUICKSTART.md` — 初期セットアップ手順
- `data/facilities_data.json` — 施設正本データ
