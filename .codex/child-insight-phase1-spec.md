# 子ども別インサイト Phase 1 仕様書（child-insight-phase1）

- 作成: 2026-08-07 PM（Claude Code）/ Owner GO済み（2026-08-07）
- ベースライン: **origin/main `ea9aae0`**（AC・行番号はすべてこのコミット基準で確認済み）
- 実装ブランチ: `codex/child-insight-phase1-l2-20260807`（origin/main起点のworktree）
- 役割分担: 本仕様はPMが所有する「仕様・境界・受入条件」。**実装方式（関数分割・クエリ構成・状態管理など）はCodexが所有**し、本文中の実装例は参考であって命令ではない。

## 1. 背景・目的

マイページ「子どもたちの好き」（好きの芽/好きランキング）は現在、**同行visitの施設カテゴリ回数のみ**で算出しており（`app/mypage/page.tsx` の `buildChildCategorySummaries`）、毎回入力させている satisfaction・reaction tags を一切使っていない。その結果:

1. 「合わなかった（not_fit）」訪問も「好き」に加算される（誤推定）
2. いつも一緒に出かける兄弟は必ず同一ランキングになる（兄弟同一化）
3. `child_age_at_visit` が年差のみで最大+1歳誤差（children に birth_month があるのに未使用）
4. behaviorタグ（どんな様子だった？）が「ほぼ毎回真（きょうだいで遊んだ）」と「めったに起きない（成長系）」の二極のみで、訪問ごとに答えが変わる中間軸がなく、毎回同じ入力になる（Owner実体験・2026-08-07）

本Phase 1は**必須入力を一切増やさず**、既存入力を出力に活かす最小修正+behaviorタグ拡充を行う。

## 2. スコープ（5点）

| # | 項目 | 種別 |
|---|---|---|
| A | 「好き」集計の satisfaction フィルタ（not_fit除外） | コード |
| B | 訪問時年齢の月対応 | コード |
| C | 「よく楽しんだこと」（interestタグ集計）の併記 | コード |
| D | behaviorタグ拡充（8タグ追加） | Migration 015 |
| E | 「その他」自由記述のプレースホルダー改善 | コード |

## 3. 非スコープ（今回は触らない）

- ヒーローの現在年齢 `calcAge`（`app/mypage/page.tsx` 内・TZ/死条件問題）→ 別トラック（calcage-tz-track・Owner指示で別GO）
- 成長タグの時系列ビュー（「初めてできたこと年表」等）→ 別フェーズ
- interest「その他」選択+メモ空で痕跡が残らない件 → 既知の限界として据え置き
- 「好きランキング」見出し文言の変更（フィルタ導入で根拠が改善されるため現行維持）
- 家族のあしあと帳・ヒーロー・最近の思い出・マップ等、「子どもたちの好き」セクション以外の集計
- DBスキーマ変更・既存 `child_age_at_visit` 保存値のbackfill（migrationはタグ行追加のみ）

## 4. 仕様

### A. satisfaction フィルタ

- 「子どもたちの好き」セクションの集計対象を、その子の visit_children 行のうち **`satisfaction != 'not_fit'`** に限定する（loved / enjoyed / neutral は含める）。
- フィルタは同セクション内で一貫させる: カテゴリ回数、段階判定（none / pre_sprout / sprout / ranking。しきい値0/1–2/3–9/10+は `lib/mypage-stats.ts` `childStage` のまま変更しない）、「記録がN件たまりました」等の件数表示、すべて**フィルタ後件数**を使う。
- 他セクション（ヒーロー統計・あしあと帳・月次グラフ・マップ・最近の思い出）の件数は変更しない。
- セクション注記（origin/main `app/mypage/page.tsx:775-777` 付近「お子さまごとに、一緒に行ったおでかけを…」）の末尾に次の一文を追加する:
  「『合わなかった』と記録したおでかけは数えていません。」

### B. 訪問時年齢の月対応

- 保存時（新規 `app/mypage/visits/new/page.tsx` と編集 `app/mypage/visits/[id]/edit/page.tsx` の両方）の `child_age_at_visit` を月考慮の満年齢にする:
  - 訪問月 ≥ 誕生月 → `visitedYear - birth_year`
  - 訪問月 < 誕生月 → `visitedYear - birth_year - 1`
  - （誕生「日」は保持していないため月粒度。同月は満年齢到達とみなす）
- 現状 new ページは children から birth_year のみ取得している（origin/main `new/page.tsx:230-233`）。birth_month の取得が必要。
- **表示される訪問時年齢**（訪問詳細 `VisitChildCard` の「訪問時 N歳」、施設別履歴）は、**既存レコード（年差のまま保存済みの行）を含めて**月考慮の正しい値になること。実現方法（表示時再計算か保存値fallbackか）はCodex裁量。DB backfillは行わない。

### C. 「よく楽しんだこと」の併記

- 対象: sprout / ranking 段階の子（= Aのフィルタ後3件以上）。
- 集計: その子のフィルタ後 visit_children に紐づく `visit_child_tags` のうち、`reaction_tags.tag_type = 'interest'` のタグを選択回数で集計。
- 表示規則:
  - 選択回数 **2回以上** のタグのみ、回数降順（同数は `sort_order` 昇順）で **最大5件**。
  - カテゴリ内訳（棒グラフ / ランキング）の下に見出し「よく楽しんだこと」+「タグ名 N回」の形式で表示。
  - 該当タグが0件なら見出しごと非表示（空セクションを出さない）。
- behaviorタグ・成長タグ・その他自由記述は含めない。同一visit内の同一タグは1回（主キー上重複しない）。
- ここが兄弟差の出る唯一の表示であることが本項の目的（同じおでかけでも子どもごとに違うタグが出る）。

### D. behaviorタグ拡充 — Migration `supabase/migrations/015_behavior_tags_expansion.sql`

011と同様に `ON CONFLICT (id) DO NOTHING` で以下8行を追加（`tag_type = 'behavior'` を明示。category は011のinterest昇格リストに含まれない新キーを使う）:

| id | label | category | sort_order |
|---|---|---|---|
| immersed | 夢中で遊んだ | engagement | 120 |
| focused | 集中していた | engagement | 125 |
| all_smiles | ずっと笑顔だった | emotion | 130 |
| energetic_to_end | 最後まで元気だった | stamina | 135 |
| tired_midway | 途中で疲れた | stamina | 140 |
| got_bored | すぐ飽きた | engagement | 145 |
| was_scared | 怖がっていた | emotion | 150 |
| improved | 前より上手になった | growth | 235 |

- 意図: 「訪問ごとに答えが変わる軸」（熱中度・感情・体力）を既存の社会系（190〜）より前に表示し、マイナス側の様子（すぐ飽きた・怖がっていた・途中で疲れた）を初めて選べるようにする。`improved` は既存成長ブロック（210–230）の直後。
- 既存タグ・既存記録・スキーマは変更しない。フォームはマスタ読取（`is_active=true` を `sort_order` 順）なので、コード変更なしで新タグが並ぶ想定。並び順が上表どおりになることだけ確認する。

### E. 「その他」プレースホルダー

`app/mypage/visits/new/page.tsx`（および編集ページに同欄があれば同様）の自由記述プレースホルダー「自由に書けます（任意）」を、欄の種類別に変更:

- interest側（何を楽しんでいた？）: 「例: 迷路にハマっていた、シャボン玉ばかりしていた」
- behavior側（どんな様子だった？）: 「例: 帰りたがらなかった、お友達に譲れた」

`maxLength=100` は維持。

## 5. 適用順序（migration rollout gate・恒久ルール）

1. コード実装・lint/build・ローカル検証（A/B/C/Eはmigration非依存で検証可能）
2. **Owner が Supabase Dashboard SQL Editor で Migration 015 を手動適用**（Codex/コードからの適用不可）
3. PM が live DB を検証（reaction_tags に新8行・tag_type/並び順）
4. Codex 実機検証（フォームに新タグ表示）
5. Owner Review Pack（ZIP）→ Owner GO → push（Vercel自動デプロイ）

コードは新タグの存在を前提にしないこと（migration未適用でも既存タグのみで正常動作）。

## 6. 受入条件（AC）— origin/main `ea9aae0` 基準

- **AC-1（フィルタ）**: satisfaction='not_fit' の visit_children 行が、「子どもたちの好き」のカテゴリ回数・段階判定・件数文言のすべてから除外される。not_fit のみ3件の子は pre_sprout ではなく **none 扱い（0件）** になる。他セクションの数値は origin/main と同一。
- **AC-2（兄弟差）**: 同一visitに同行した2児が異なるinterestタグを2回以上選んでいるfixtureで、「よく楽しんだこと」が子どもごとに異なる内容で表示される。
- **AC-3（表示規則）**: 「よく楽しんだこと」は interest タグのみ・2回以上・最大5件・回数降順（同数はsort_order昇順）・0件時は見出しごと非表示・pre_sprout以下の子には表示されない。
- **AC-4（年齢）**: birth 2020年12月の子の2026年1月訪問で `child_age_at_visit=5`（現行は6）。新規・編集の両保存経路で成立。既存の年差保存レコードの「訪問時 N歳」表示も月考慮値になる。
- **AC-5（タグ）**: Migration 015 適用後、記録フォームの「どんな様子だった？」に新8タグが §4-D の順で表示され、既存5タグ+その他・既存記録・interest側は不変。適用前でもフォーム・保存が正常動作。
- **AC-6（プレースホルダー）**: interest/behavior の「その他」欄に §4-E の文言が表示される。
- **AC-7（回帰）**: 「子どもたちの好き」以外のmypageセクション、/mypage/visits 一覧・詳細・編集・施設別履歴の表示が不変（Bの年齢表示を除く）。`npm run lint` / `npm run build` GREEN。

## 7. 検証・成果物

- lint / build ログ
- A/C/D のfixtureベース検証結果（not_fit除外前後の件数比較、兄弟差スクショ）
- UI変更を含むため **Owner Review Pack（ZIP）** を push 前に作成（仕様書・検証レポート・全diff・PC/SPスクショ・回帰確認表・MANIFEST sha256。秘密情報除外）
