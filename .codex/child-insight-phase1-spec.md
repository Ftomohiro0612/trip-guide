# 子ども別インサイト Phase 1 仕様書（child-insight-phase1）

- 作成: 2026-08-07 PM（Claude Code）/ Owner GO済み（2026-08-07）
- ベースライン: **origin/main `ea9aae0`**（AC・行番号はすべてこのコミット基準で確認済み）
- 実装ブランチ: `codex/child-insight-phase1-l2-20260807`（origin/main起点のworktree）
- 役割分担: 本仕様はPMが所有する「仕様・境界・受入条件」。**実装方式（関数分割・クエリ構成・状態管理など）はCodexが所有**し、本文中の実装例は参考であって命令ではない。
- **2026-08-07 Owner補正（PR #14 review後・意味差修正）**: 初版実装（PR #14 commit `ed9b3d4`）はコード品質・AC文言には合致していたが、「好き」の意味づけがOwner採用済みのPhase 1方向とズレていた。本版は §3 非スコープ、§4-A/§4-C/§4-F、§5 適用順序、§6 AC-1/2/3/8 を補正した**現行の唯一の正本**。既にGREENの年齢helper（§4-B/AC-4）、behaviorタグ8件（§4-D/AC-5）、placeholder（§4-E/AC-6）は再設計不要・変更しない。

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
- 家族のあしあと帳・ヒーロー・最近の思い出・マップ等、「子どもたちの好き」セクション以外の集計
- DBスキーマ変更・既存 `child_age_at_visit` 保存値のbackfill（migrationはタグ行追加のみ）
- `childStage`（`lib/mypage-stats.ts`）のしきい値そのもの（0/1–2/3–9/10+）は変更しない。変更するのはその入力件数の定義のみ（§4-A）

**（2026-08-07 Owner補正で非スコープから外れ、今回スコープに追加された項目）**

- interest「その他」選択+メモ空で痕跡が残らない件 → **今回修正する（§4-F/AC-8）**。旧版は既知の限界として据え置いていたが、Owner指摘によりPhase 1のスコープに含める。
- 「好きランキング」という見出し・文言 → **施設カテゴリ内訳を「好き」から分離するため、「好き」の主要表示側では使わない**（§4-A/AC-1、AC-7'）。

## 4. 仕様

### A. 「好き」の根拠 = 有効反応visit（2026-08-07 Owner補正・旧A章を置き換え）

- **有効反応visit**を次のように定義する: その子の visit_children 行のうち、`satisfaction ∈ {'loved', 'enjoyed'}` **かつ** その行に紐づく `visit_child_tags` に `reaction_tags.tag_type = 'interest'` のタグが **1件以上** 選択されている行。
- `satisfaction = 'neutral'` の行、`satisfaction = 'not_fit'` の行、interestタグが0件の行は、いずれも「好き」の根拠に含めない（旧版の「not_fit のみ除外・neutral は含める」から変更）。
- 「子どもたちの好き」セクションの**段階判定**（none / pre_sprout / sprout / ranking）は、上記「有効反応visit」の件数を入力にする。`childStage` のしきい値自体（0/1–2/3–9/10+、`lib/mypage-stats.ts`）は変更しない — 変えるのは入力件数の定義だけ。
- 「子どもたちの好き」セクションの**主要な表示内容**（sprout/ranking段階で見せる「好き」の根拠）は、有効反応visitから集計したinterestタグ（§4-C）であり、施設カテゴリの回数・ランキングではない（施設カテゴリは§4-A'で分離）。
- 「記録がN件たまりました」等の件数文言も、有効反応visit件数を使う。
- 他セクション（ヒーロー統計・あしあと帳・月次グラフ・マップ・最近の思い出）の件数は変更しない。
- セクション注記（origin/main `app/mypage/page.tsx:775-777` 付近「お子さまごとに、一緒に行ったおでかけを…」）の末尾文言は、有効反応visitの定義に合わせて調整する（例: 「『合わなかった』と記録したおでかけや、興味タグを選ばなかったおでかけは数えていません。」相当。文言自体はCodex裁量、意味が正しければよい）。

### A'. 施設カテゴリの分離（2026-08-07 Owner補正・新設）

- 施設カテゴリ回数・カテゴリ内訳・カテゴリランキング（旧版でChildCategorySummaryの `categories` / `ranking` として「好き」に使っていたもの）は、「好き」の根拠・見出しから分離する。
- 分離後は「好き」ではなく事実の可視化として、「よく行った場所の傾向」など**好み・優先順位を示唆しない**文言の別ブロックで表示する（「好き」「ランキング」という語は施設カテゴリ側では使わない）。
- この事実ブロックの表示可否は、「好き」の段階判定（stage）に従属させなくてよい（訪問実績があれば独立して表示可）。集計対象の visit 母集団（有効反応visitのみか、全visitか）はCodex裁量とするが、選んだ母集団を明記すること。
- レイアウト上どこに配置するか（同カード内の別セクションか、別カードか）はCodex裁量。

### B. 訪問時年齢の月対応

- 保存時（新規 `app/mypage/visits/new/page.tsx` と編集 `app/mypage/visits/[id]/edit/page.tsx` の両方）の `child_age_at_visit` を月考慮の満年齢にする:
  - 訪問月 ≥ 誕生月 → `visitedYear - birth_year`
  - 訪問月 < 誕生月 → `visitedYear - birth_year - 1`
  - （誕生「日」は保持していないため月粒度。同月は満年齢到達とみなす）
- 現状 new ページは children から birth_year のみ取得している（origin/main `new/page.tsx:230-233`）。birth_month の取得が必要。
- **表示される訪問時年齢**（訪問詳細 `VisitChildCard` の「訪問時 N歳」、施設別履歴）は、**既存レコード（年差のまま保存済みの行）を含めて**月考慮の正しい値になること。実現方法（表示時再計算か保存値fallbackか）はCodex裁量。DB backfillは行わない。

### C. 「よく楽しんだこと」（2026-08-07 Owner補正: 集計対象を有効反応visitに変更）

- 対象: sprout / ranking 段階の子（= §4-Aの有効反応visitが3件以上）。
- 集計: その子の**有効反応visit**（§4-A、旧版の「not_fit除外visit全体」から変更）に紐づく `visit_child_tags` のうち、`reaction_tags.tag_type = 'interest'` のタグを選択回数で集計。
- 表示規則（変更なし）:
  - 選択回数 **2回以上** のタグのみ、回数降順（同数は `sort_order` 昇順）で **最大5件**。
  - 見出し「よく楽しんだこと」+「タグ名 N回」の形式で表示。施設カテゴリ内訳（§4-A'）とは独立した表示にする（従属関係を作らない）。
  - 該当タグが0件なら見出しごと非表示（空セクションを出さない）。
- behaviorタグ・成長タグ・その他自由記述は含めない。同一visit内の同一タグは1回（主キー上重複しない）。
- ここが兄弟差の出る唯一の表示であることが本項の目的（同じおでかけでも子どもごとに違うタグが出る）。既存の `lib/child-insights.ts` の集計関数はそのまま使ってよく、渡すvisit集合を「有効反応visit」に差し替えるだけで足りる想定（実装方式はCodex裁量）。

### F.「その他」選択の保持（2026-08-07 Owner補正・新設）

- 現状（origin/main基準・本ブランチのbaseline）: `app/mypage/visits/new/page.tsx` の `normalizeOtherNote()` は、interestの「その他」が選択されていても自由記述メモが空文字なら `null` を返す。interest側の「その他」はマスタタグ行を持たず `interest_other_note` のみで表現されるため、メモが空だと選択した事実がDBに一切残らない（`interest_other_note = null` は「その他を選択しなかった」と区別が付かない）。behavior側は「その他」がマスタタグ行として `visit_child_tags` に保存されるため、この問題は起きない。
- 修正: interestの「その他」を選択した状態で保存した場合、メモが空欄であっても「その他が選択された」という事実が保持され、その訪問を再度編集・表示したときに「その他」が選択されていたと分かる状態にする。
- 実現方法（DBに空文字を保存する／interest側にもタグ行を追加する、等）はCodex裁量。新規スキーマ追加は不要な想定だが、既存カラム内で表現できない場合はPMに相談すること。
- 対象は new / edit 両保存経路、および両ページの表示・編集復元ロジック。

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

## 5. 適用順序（2026-08-07 Owner補正・現行gate）

1. コード実装・lint/build・ローカル検証（A/A'/B/C/E/Fはmigration非依存で検証可能）
2. push → PR / Vercel Preview 取得
3. Owner: main統合GO
4. merge
5. merged SHA の Production GREEN 確認
6. 別の Owner GO で、Owner が Supabase Dashboard SQL Editor で Migration 015 を手動適用（Codex/コードからの適用不可）
7. PM が live DB を検証（reaction_tags に新8行・tag_type/並び順）

コードは新タグの存在を前提にしないこと（migration未適用でも既存タグのみで正常動作）。Owner Review Pack（ZIP）は自動必須ではない（Owner明示・2026-08-07）。

## 6. 受入条件（AC）— origin/main `ea9aae0` 基準

- **AC-1（有効反応visitフィルタ・2026-08-07 Owner補正）**: `satisfaction ∈ {'loved','enjoyed'}` かつ interestタグ1件以上の行（＝有効反応visit）だけが、「子どもたちの好き」の段階判定・主要表示・件数文言の根拠になる。`neutral` / `not_fit` / interestタグ0件のいずれかに該当する行は根拠から除外される。有効反応visitが0件の子は none 扱い（0件）になる。他セクションの数値は origin/main と同一。
- **AC-2（兄弟差）**: 同一visitに同行した2児が、有効反応visit条件を満たしつつ異なるinterestタグを2回以上選んでいるfixtureで、「よく楽しんだこと」が子どもごとに異なる内容で表示される。
- **AC-3（表示規則）**: 「よく楽しんだこと」は有効反応visitに紐づくinterestタグのみ・2回以上・最大5件・回数降順（同数はsort_order昇順）・0件時は見出しごと非表示・pre_sprout以下の子には表示されない。
- **AC-4（年齢）**: birth 2020年12月の子の2026年1月訪問で `child_age_at_visit=5`（現行は6）。新規・編集の両保存経路で成立。既存の年差保存レコードの「訪問時 N歳」表示も月考慮値になる。
- **AC-5（タグ）**: Migration 015 適用後、記録フォームの「どんな様子だった？」に新8タグが §4-D の順で表示され、既存5タグ+その他・既存記録・interest側は不変。適用前でもフォーム・保存が正常動作。
- **AC-6（プレースホルダー）**: interest/behavior の「その他」欄に §4-E の文言が表示される。
- **AC-7（回帰）**: 「子どもたちの好き」以外のmypageセクション、/mypage/visits 一覧・詳細・編集・施設別履歴の表示が不変（Bの年齢表示を除く）。`npm run lint` / `npm run build` GREEN。
- **AC-7'（施設カテゴリの分離・2026-08-07 Owner補正・新設）**: 施設カテゴリの回数・内訳は「好き」の表示・見出し・段階判定から独立し、「好み」「ランキング」を示唆しない事実文言（例:「よく行った場所の傾向」）の別ブロックとして表示される。この事実ブロックはstage=noneの子でも訪問実績があれば表示してよい。
- **AC-8（interestの「その他」保持・2026-08-07 Owner補正・新設）**: interestの「その他」を選択し自由記述メモを空欄のまま保存したvisitを、保存後に再度編集画面または訪問詳細で確認したとき、「その他」が選択されていたことが分かる状態になっている（保存直後にDBの値を見ても、選択の事実がnullや未選択と区別不能な状態になっていない）。

## 7. 検証・成果物（2026-08-07 Owner補正: ZIP必須を撤回）

- lint / build ログ
- A/A'/C/D/F のfixtureベース検証結果（有効反応visitフィルタ前後の件数比較、兄弟差、その他保持の再現手順）
- Owner Review Pack（ZIP）は**自動必須ではない**（Owner明示・2026-08-07）。作成は任意。push可否はPMの独立検収（`git diff origin/main..HEAD` によるAC・非スコープ確認）で判断する。
