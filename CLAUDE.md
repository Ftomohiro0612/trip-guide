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

## ユーザーの技術レベル

- Node.js / Git / Next.js は今回が初体験
- コマンドラインに慣れていない
- Windows 11 + PowerShell 環境
- 専門用語は最小限に、噛み砕いて説明すること
- 手順は番号付き・コピペ可能な形で提示
- スクショを送ってきたらそれを見て次の一手を案内

## 進捗状況

現在地は `HANDOFF.md` を参照。通常イベントWaveの標準手順は
`docs/event-wave-playbook.md` を正とします。

## AI役割分担

**セッション開始時に必ず読むこと**: `MEMORIPS_AI_ROLES.md`

- Claude Code PM（このスレッド）: 進行管理・仕様書作成・Codexへの指示出し・GO/NO-GO判定
- Codex: 実装・lint/build・vercel deploy
- GPT: 事業方針・優先順位の相談役

## 参考ファイル

- `MEMORIPS_AI_ROLES.md` — AI役割分担・コミュニケーションフロー（セッション開始時に読む）
- `HANDOFF.md` — 直近のチャット引継ぎメモ（最新の進捗はここ）
- `docs/event-wave-playbook.md` — 通常イベントWaveの調査・L2・L3正本手順
- `SPEC.md` — プロジェクト初期仕様書（旧 HANDOFF.md）
- `product-direction.md` — プロダクト方針書・実装進捗
- `CLAUDE_CODE_QUICKSTART.md` — 初期セットアップ手順
- `data/facilities_data.json` — 施設正本データ
