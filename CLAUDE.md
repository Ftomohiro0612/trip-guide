@AGENTS.md

# trip-guide.net プロジェクト指示書

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

## Read-first

- セッション開始時は最初に `C:\Users\tomo-\Documents\ai-session-memory\memorips\current-session.md` を読む。
- 続いてrepo rootの自動読込規約を確認し、作業開始時に `git fetch` 後の `origin/main` と対象branchを実測する。
- 初回参加、track切替、current-sessionの欠落・矛盾時のみ、`ai-session-memory/memorips/memorips-canonical-document-map.md`を参照する。

## ユーザーの技術レベル

- Node.js / Git / Next.js は今回が初体験
- コマンドラインに慣れていない
- Windows 11 + PowerShell 環境
- 専門用語は最小限に、噛み砕いて説明すること
- 手順は番号付き・コピペ可能な形で提示
- スクショを送ってきたらそれを見て次の一手を案内

## 進捗状況

現在の件数、県数、Active Track、branch／HEADはCLAUDE.mdを正本としない。
`ai-session-memory/memorips/current-session.md`と、`git fetch`後のGitHub実測を優先する。
通常イベントWaveの標準手順は`docs/event-wave-playbook.md`を正とする。

## AI役割分担

- Claude Code PM（このスレッド）: 進行管理・仕様書作成・Codexへの指示出し・GO/NO-GO判定
- Codex: 実装・lint/build・vercel deploy
- GPT: 事業方針・優先順位の相談役

## 参考ファイル

- `MEMORIPS_AI_ROLES.md` — AI役割分担・コミュニケーションフローの背景資料（read-firstには使用しない）
- `HANDOFF.md` — 過去時点の引継ぎsnapshot（現在地には使用しない）
- `docs/event-wave-playbook.md` — 通常イベントWaveの調査・L2・L3正本手順
- `SPEC.md` — プロジェクト初期仕様書（旧 HANDOFF.md）
- `product-direction.md` — プロダクト方針書・実装進捗
- `CLAUDE_CODE_QUICKSTART.md` — 初期セットアップ手順
- `data/facilities_data.json` — 施設正本データ
