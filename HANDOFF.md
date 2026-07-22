# Memorip 現在地

> 更新: 2026-07-22 JST
> このファイルは再開時に最初に読む1ページです。詳細手順は `docs/event-wave-playbook.md`、過去の長い引継ぎはGit履歴を参照してください。

## Production

- Product main / Production SHA: `c319cb72c79cb8bd7f60730bb29e780cfdebbbd5`
- Vercel deployment: `dpl_BGvU2NGbYjMpPJxudETtiJFs2zDA` (`READY`)
- Public aliases: `https://trip-guide.net` / `https://www.trip-guide.net`
- 公開QA: apex・www HTTP 200、PC/SP overflow 0、console error 0、Production error/5xx 0
- 正本規模: 通常イベント824件、Summer採用500件、施設3,740件

## 完了マイルストーン

| Track | 正本 | 掲載対象 | Summer合算 | 状態 |
|---|---:|---:|---:|---|
| 山梨県 通常イベント | 44 | 36 | 47 | Production CLOSED |
| 静岡県 通常イベント Wave 2 | 49 | 38 | 48 | Production CLOSED |
| 長野県 通常イベント Wave 3 | 75 | 48 | 59 | Production CLOSED |

長野Wave 3は既存51件更新、新規24件、ended 27件。HOLD 2件は正本未投入。変更は`data/events_data.json`のみで、mainへfast-forward統合済みです。

## Active Tracks

次県へ進む前に、次の順で完了させます。

1. Track A — 通常イベント最小validator
   - Branch: `codex/regular-events-min-validator-l2-20260722`
   - Base: `c319cb72c79cb8bd7f60730bb29e780cfdebbbd5`
   - L2 HEAD: `1eae93efc90b2af423863a37cd6d13b0a8795a9f`
   - 状態: 実装・test・build・remote push済み、main未統合
   - baseline: 正当な例外24件、既存違反3件、新規未承認違反0件
2. Track B — HANDOFF現在地1ページ化＋イベントWave playbook正本化
   - Branch: `codex/event-wave-handoff-playbook-l2-20260722`
   - Track A HEADをbaseとするstacked branch
   - 山梨・静岡・長野の3県レトロをplaybookへ収録

Track A/BともOwner確認前にmainへ統合しません。

## 通常イベントの正本ルール

- 通常イベント: `data/events_data.json`
- Summer Hub: `data/summer_events_2026.json`
- 施設: `data/facilities_data.json`
- 通常Waveは原則`data/events_data.json`だけを変更し、Summer・施設・UIを混ぜない
- 公式一次情報を必須とし、未確定候補はHOLDで正本へ入れない
- 満員・受付終了は掲載対象。`reservation: "required"`と明示ラベルを使い、`ended`/`cancelled`にしない
- 既存施設は`facility_id`、未登録会場は正式な`venue_name`を使う
- 同一公式一覧URLでも、タイトル・時間・内容が異なる場合だけ別イベントにできる

## 再開時チェック

```powershell
git fetch origin
git rev-parse origin/main
git status --short
git worktree list
```

共有ルートには別作業が残ることがあるため、既存変更を消さず専用worktreeを使います。イベントWaveの調査・L2・L3手順、検証コマンド、報告様式は `docs/event-wave-playbook.md` を正とします。
