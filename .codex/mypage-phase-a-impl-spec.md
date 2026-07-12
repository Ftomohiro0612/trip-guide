# Phase A 実装仕様書 — マイページ上部の情報設計（Codex発注用・proposal-only）

- 作成: 2026-07-11 / PM（memoripsClaude）
- ステータス: **proposal-only。オーナーGO前。実装・commit・push は禁止。**
- 上位設計: `.codex/mypage-info-design-proposal.md`
- 上位ロードマップ: `docs/memorip-activation-doc1-funnel.md`（③④⑤）
- コンセプト（オーナー確定）:
  > **おでかけ記録が、家族の思い出と子どもの好みの地図になっていくマイページ**

---

## 0. オーナー確定事項（2026-07-11）

| # | 確定 |
|---|---|
| 1 | Phase A → B → C の順で進める |
| 2 | 共有（Phase D）は**今回のスコープ外** |
| 3 | しきい値は既存正本どおり **3件 / 10件** を踏襲（`docs/memorip-activation-doc4-activation.md:16-19`） |
| 4 | 記録0・子どもありは onboarding へ戻さず、**マイページ側で受ける** |
| 5 | クイックアクションは当面 **[記録する][振り返る][行きたい][写真から]** |
| 6 | **【訂正済】宝箱 T1〜T6 は本番LIVE**（`3ea9028` / `47c90f9`・ともに origin/main の祖先）。「宝箱」は**社内コードネーム**であり、**UI文言に出さない方針**（T1で確定）。既存LIVEメモリの訂正は**不要**。<br>★**コードネームの grep 結果だけで機能の存在を判定しないこと。** PMが `宝箱` をgrepして0件だったため「未実装」と誤断した（実体は 📷思い出の写真 `page.tsx:535` / 🏅定番スポット `:747` / 🌱最近の初めて `:756` / 家族のあしあと帳 `:691` / 子どもたちの「好き」 `:787` / PC2カラム `:484` として全て現存）。存在判定は**機能の実体（見出し文言・コミット・本番）**で行う。 |
| 7 | 好きの芽/ランキング判定は **family total ではなく子どもごとの published visit count**。家族の累計・今月件数とは母数を分ける。全員表示時は**条件を満たした子のカードだけ**表示 |
| 8 | **前月比は Phase A に入れない**。Phase A は「今月+◯回」「はじめての場所+◯」まで |
| 9 | 「行きたい今月+◯件」は導出可否を確認し、**追加DBクエリが必要なら Phase A に含めない**（追加DBクエリ0を死守） |
| 10 | 未ログイン /mypage の実挙動を再確認し、認証修正が要るなら **Phase A に混ぜず別トラック** |

---

## 1. 事前検証の結果（オーナー指摘4点への回答・すべてコード/本番実測）

### ✅ 検証1: 子どもごとの visit count — **追加クエリ0で実現可能。採用。**

- `visits` は `.limit()` なしで published 全件取得（`app/mypage/page.tsx:294-303`）
- `visit_children` は **全 visitIds** に対して取得済み（`app/mypage/page.tsx:357-363`）
- → 子どもごとの published visit count = `visit_children` の child_id ごとの **distinct visit_id 数**。**追加クエリ0**。

**重要な構造的注意（母数を分ける根拠）:**
- `visit_children` の PK は `(visit_id, child_id)`（`supabase/migrations/002_phase2_schema.sql:62-69`）
  → **1記録に複数の子を紐付け可能**
- 子ども未紐付けの記録も存在する（`no_child` フロー: `app/mypage/visits/new/page.tsx:549-551`）
- → **Σ(子どもごと件数) は家族総数と一致しない（上にも下にもズレる）**
- → 家族の「累計/今月」と子どもの「しきい値判定」は**必ず別変数で持つこと**。相互に流用禁止。

### ❌ 検証2: 「行きたいリストに今月◯件追加」— **現在のロード済みデータでは導出不可能**

- `wishlists` の select は `.select("facility_slug")` のみ。**created_at を取っていない**（`app/mypage/page.tsx:305-309`）
- テーブル側に `created_at TIMESTAMPTZ DEFAULT now()` は**存在する**（`supabase/migrations/002_phase2_schema.sql:92`）
- → 既存クエリに列を1つ足すだけ（**追加ラウンドトリップ0・migration 0**）だが、現状データからは出せない。

**→ オーナー確定#9 の文言に厳格に従い、Phase A スコープから「行きたい今月+◯件」を除外する。**
（列追加で無料に実現できるため、オーナーが許可すれば Phase A に戻せる。§9 の確認事項に記載。）

### ✅ 検証3: 未ログイン /mypage — **素通りしない。認証修正は不要。**

- **本番実測**: `GET https://trip-guide.net/mypage` → `302` → `https://trip-guide.net/auth/login?redirectTo=%2Fmypage`（PM実行・確認済み）
- 正体は **`proxy.ts:38-44`**。この Next.js では **`middleware.ts` が `proxy.ts` にリネームされている**
  （`AGENTS.md`「This is NOT the Next.js you know」に該当。`middleware.ts` を探すと空振りする）
- → **別トラックの提起は取り下げ。** 上位提案書の C9 / R7 は**削除**。

### ⚠️ 検証4で発見した穴A: 「今月」の意味論が壊れる（**Phase A の看板指標に直撃**）

- `buildMonthlyData` は **`visited_on`（訪問日）** でバケットする（`app/mypage/page.tsx:219`）
- **`visited_on` が null の記録は集計から丸ごと除外**（`app/mypage/page.tsx:218`）
- `visits` の select に **`created_at` は入っていない**（`app/mypage/page.tsx:296-298`）
- スキーマは過去記録を一級市民として扱う:
  `is_past_entry BOOLEAN NOT NULL DEFAULT false` / `date_precision` / `visited_year` / `visited_month`
  （`supabase/migrations/002_phase2_schema.sql:20-24`）
- **オンボーディング③ は仕様上「過去記録1件へ誘導」する**（`docs/memorip-activation-doc1-funnel.md:63`）

**帰結: オンボーディング経由で過去のおでかけを記録した新規ユーザーは、記録直後に「今月のおでかけ +0回」を見る。**
積み上がりのフィードバックが、最も必要な瞬間（＝Activation ③ の直後）に空振りする。
**Phase A の看板指標と Activation ③ が正面衝突する。**

**→ 対処: 「今月」は `created_at`（記録日）ベースとする。** §3-A2 で確定。
理由: コンセプトは「**記録**が積み上がっていく楽しさ」であり、ユーザーの行為は「記録すること」。
記録日基準なら **過去記録も、visited_on が null の記録も、必ず報われる**。
コストは `visits` の既存 select に `created_at` を1列足すのみ（**追加クエリ0・migration 0**）。

### ⚠️ 検証4で発見した穴B: 「今月」判定が UTC になる（Vercel）

- `buildMonthlyData` は `new Date()` を使う（`app/mypage/page.tsx:226`）。**Vercel の実行環境は UTC**。
- 毎月1日の **00:00〜09:00 JST** は UTC ではまだ前月 → **「今月」が丸1ヶ月ズレる**。
- 同型の罠を過去に踏んでいる（イベントSSGの `getBuildDateString` を Asia/Tokyo 化した件）。
- 現状は折り畳まれたグラフの中なので目立たないが、**「今月+◯回」をヒーローに昇格させた瞬間に user-visible なバグになる。**

**→ 対処: 月境界の判定は必ず `Asia/Tokyo` 固定で行う。** §3-A1 で確定。**受入条件に含める。**

---

## 2. Phase A スコープ

### やること

1. **`lib/mypage-stats.ts` 新設** — 集計・しきい値判定の純関数を切り出す（テスト可能に）
2. **① サマリーヘッダー（ヒーロー）** — 既存の 挨拶(`:486-507`) + 子どもチップ(`:564-597`) + あしあと帳の数字(`:690-781` 上部) を**統合**
3. **② 今月の変化カード** — 新規（記録3件以上で出現）
4. **③ クイックアクション再構成** — `[記録する][振り返る][行きたい][写真から]`
5. **⑦ あしあと帳** — 数字をヒーローへ移管し「詳細」に純化。**6ヶ月推移グラフの `<details>` 折り畳みを解除**（既定表示）
6. **⑨ 思い出の写真を下部へ降格** — 上部を写真非依存にする
7. **`MonthlyBarChart` / `CategoryBar` を `components/` へ抽出**（現状 `page.tsx` インライン）
8. **S0'（記録0・子あり）をヒーローで受ける**

### やらないこと（明示的な非スコープ）

- ❌ **前月比・増減の ± 表示**（オーナー確定#8。定義を別途決めてから）
- ❌ **「行きたい今月+◯件」**（§1 検証2。追加DBクエリ0を死守）
- ❌ **好きの芽 / ランキングカードの本実装** → **Phase C**
  （※ Phase A では**しきい値判定ロジックのみ** `lib/mypage-stats.ts` に用意し、UIは出さない）
- ❌ **完了画面の2件目導線** → **Phase B**
- ❌ **共有導線** → Phase D（スコープ外）
- ❌ **認証まわりの変更**（§1 検証3。不要と確定）
- ❌ **DBマイグレーション**（Phase A は一切不要）
- ❌ **新規DBクエリの追加**（`visits` select への `created_at` 1列追加のみ許可。ラウンドトリップは増やさない）

---

## 3. 実装詳細

### A1. `lib/mypage-stats.ts`（新設・純関数のみ）

**必須: 月境界は `Asia/Tokyo` 固定。`new Date()` のローカルTZに依存してはならない。**

```ts
// JST の「今月」キー（YYYY-MM）を返す。Vercel(UTC)でもJSTの月を返すこと。
export function currentMonthKeyJst(now: Date): string;

// JST基準で ISO日時文字列 → YYYY-MM
export function monthKeyOfJst(iso: string): string;

export type FamilyStats = {
  totalVisitCount: number;        // published visits 総数（既存 totalVisitCount と同値）
  distinctFacilityCount: number;  // 既存と同値
  thisMonthRecordedCount: number; // ★今月「記録した」件数（created_at ベース・JST）※訪問日ではない
  thisMonthNewlyRecordedFacilityCount: number; // ★今月はじめて「記録した」施設数（created_at ベース・JST）※初訪問ではない
};

export type ChildStats = {
  childId: string;
  visitCount: number;             // ★visit_children の distinct visit_id 数（family total とは別母数）
  stage: "none" | "pre_sprout" | "sprout" | "ranking";
};

// しきい値（正本: docs/memorip-activation-doc4-activation.md:16-19）
//   visitCount 0      → "none"
//   visitCount 1-2    → "pre_sprout"   （予告のみ。芽は出さない）
//   visitCount 3-9    → "sprout"       （好きの芽・推測形）
//   visitCount 10+    → "ranking"      （ランキング・事実形）
export function childStage(visitCount: number): ChildStats["stage"];
```

**`thisMonthNewlyRecordedFacilityCount` の定義（曖昧さを残さないこと）:**
> 全 published visits を `facility_slug` でグループ化し、各施設の **min(created_at)** を求める。
> その min(created_at) が **JSTの今月**に入る施設の数。

> ### ⚠️ 意味論の厳守（オーナー指示・2026-07-11）
> これは **「今月はじめて訪れた場所」ではない**。**「今月はじめてメモリップに記録した場所」** である。
> （5年前に行った公園を今月はじめて記録した場合も、ここに1件として数えられる。）
>
> したがって **UI文言に「はじめての場所」という表現を使ってはならない。**
> 「はじめて行った」と誤読され、事実と食い違う。
>
> **UI文言は以下に固定する:**
> - `今月の記録 +◯回`
> - `新しく記録した場所 +◯`
>
> 同様に `thisMonthRecordedCount` も **「今月おでかけした回数」ではない**。**「今月記録した件数」** である。
> 「今月のおでかけ」という表現も使わないこと。

**家族と子どもの母数を分離すること（オーナー確定#7）:**
- `FamilyStats.totalVisitCount` / `thisMonthVisitCount` は **visits 由来**
- `ChildStats.visitCount` は **visit_children 由来**
- **1記録に複数の子が紐づく / 子ども未紐付けの記録がある** ため、両者は一致しない。
  **相互に流用・代入してはならない。**

### A2. `app/mypage/page.tsx` のデータ取得変更（**これだけ**）

```diff
  supabase
    .from("visits")
    .select(
-     "id, facility_slug, facility_name, visited_on, family_revisit, parent_fatigue",
+     "id, facility_slug, facility_name, visited_on, created_at, family_revisit, parent_fatigue",
    )
```

- **これ以外のクエリ追加・変更は禁止。** ラウンドトリップ数は現状のまま（増やさない）。
- `wishlists` の select は**触らない**（今月+◯件は非スコープ）。
- `VisitStat` 型に `created_at: string` を追加し、`isVisitStat` の型ガードも更新すること。
- **既存の `buildMonthlyData`（visited_on ベース・6ヶ月グラフ）は変更しない。**
  グラフは「いつ**行った**か」の可視化として `visited_on` のままが正しい。
  **ヒーローの「今月」だけが `created_at` ベース**である点を、コード上のコメントで1行明記すること。

### A3. ① サマリーヘッダー `components/MypageHero.tsx`（新設）

```
┌──────────────────────────────────────────────┐
│  [👦はると 4歳] [👧みお 2歳]              ⚙️  │  ← 子どもチップ（既存 :564-597 を移設）
│                                              │
│  おでかけ記録                                 │
│  27回 · 18か所                                │  ← ストック（大きく）
│                                              │
│  今月の記録 +3回 · 新しく記録した場所 +1        │  ← フロー（★Phase Aの主役）
└──────────────────────────────────────────────┘
```

**★文言は上記で固定。「はじめての場所」「今月のおでかけ」は使用禁止**（§3-A1 の意味論を参照）。

- **写真は置かない。** 上部は数と言葉だけで成立させる（オーナー確定・写真非依存）。
- 挨拶「こんにちは、◯◯さん 👋」は**廃止**し、この要約に置き換える
  （最上部は最も価値の高い領域。挨拶で消費しない）。
- ⚙️ は `/mypage/settings` への既存リンクを維持。
- 子どもチップのタップ挙動は**現状維持**（`#child-achievement-{id}` アンカー）。子軸フィルタは Phase A では作らない。

**「今月」行の出し分け:**
- `thisMonthRecordedCount === 0` → **「今月の記録 +0回」とは出さない。** 行ごと非表示にし、
  代わりに `おでかけを記録すると、ここに増えていきます` を淡色で表示。
  （ゼロを突きつけない。オーナー確定#8 の「誤解を招く表示をしない」と同じ精神）
- `thisMonthNewlyRecordedFacilityCount === 0` → その節（`· 新しく記録した場所 +N`）のみ非表示。

### A4. ② 今月の変化カード `components/MonthlyDiffCard.tsx`（新設）

- **出現条件: `FamilyStats.totalVisitCount >= 3`**（1〜2件では差分が意味を持たない）
- 文言（やさしい日本語。**Git用語・増減記号は使わない**）:
  - `今月は 3回 記録しました`
  - `新しく記録した場所が 1か所 増えました`（0なら非表示）
- **「はじめての場所」「今月のおでかけ」は使用禁止**（§3-A1 の意味論）。
- **± の前月比は書かない**（オーナー確定#8）。
- `thisMonthRecordedCount === 0` の月は**カードごと非表示**。

### A5. ③ クイックアクション（既存 `:878-915` を再構成）

4枠・横並び。**共有は入れない**（Phase D）。

| 枠 | ラベル | 遷移先 | 備考 |
|---|---|---|---|
| 1 | ✏️ 記録する | `/mypage/visits/new` | 既存 |
| 2 | 📖 振り返る | `/mypage/visits` | 既存の「おでかけ履歴」をリネーム |
| 3 | ⭐ 行きたい | `/mypage/wishlist` | 既存 |
| 4 | 📷 写真から | `/mypage/visits/from-photo` | 既存 |

- 既存の「🔍 遊び場を探す」導線は**BottomNav と重複しないよう**、この4枠の下にテキストリンクとして残す（削除しない）。

### A6. ⑦ あしあと帳（既存 `:690-781` を「詳細」に純化）

- **数字（総回数・か所数）はヒーロー①へ移管** → ここからは削除
- 残すもの: `🏅定番スポット` / `🌱最近の初めて` / `⭐また行きたい◯件` / `✅また行きたい評価◯件`
- **`<details>「最近6ヶ月の推移を見る」`（`:763-773`）の折り畳みを解除し、グラフを既定表示にする**
  （積み上がりの主役を隠さない）

### A7. ⑨ 思い出の写真を下部へ降格

- 既存ブロック（`:532-561`）を DOM 上・`lg:order` 上ともに**イベント節の下**へ移動
- 条件（`memoryPhotosWithUrls.length > 0`）は現状維持

### A8. S0'（記録0・子あり）をヒーローで受ける

- `page.tsx:322` の redirect 条件は **変更しない**（記録0 かつ 子0 のみ onboarding へ）
- `totalVisitCount === 0 && hasChildren` のとき、ヒーローを次の形にする:
  ```
  [👦はると 4歳]
  最初の1件を記録しましょう
  記録すると、家族のおでかけがここにたまっていきます
  [✏️ おでかけを記録する]  ← primary CTA → /mypage/visits/new
  ```
- このとき **② 今月の変化 / ⑤ 最近の記録 / ⑦ あしあと帳 は出さない**（空の骨組みを見せない）
- ⑥ マップは既存の空カード（`VisitedPlacesMapClient.tsx:66-88`）を維持

### A9. コンポーネント抽出

- `MonthlyBarChart`（`page.tsx:960-1018`）→ `components/MonthlyBarChart.tsx`
- `CategoryBar`（`page.tsx:1020-1044`）→ `components/CategoryBar.tsx`
- **振る舞いを変えないこと**（純粋な移設。Phase C で再利用するための準備）

---

## 4. セクション構成（Phase A 完了時・上から）

> ### ⚠️ 2026-07-11 訂正（PMの仕様バグ・オーナー指示#5）
> 初版のこの表は **「子どもたちの『好き』」** と **「子どもプロフィール未登録プロンプト」** を書き落としており、
> 「セクション数 11 → 9」という記述も**算数として誤り**だった。
> Codex はこの表に忠実に従った結果、**本番LIVEの「子どもたちの『好き』」を削除**してしまった。
> **これは Codex の逸脱ではなく PM の仕様バグである。**
>
> **正しい合格条件: 「既存機能を1つも落とさず、セクション総数を増やさない」= Phase A 完了時も 11。**
> （統合で −1、今月の変化カード新設で +1 → 差し引きゼロ）

| # | ブロック | 状態 |
|---|---|---|
| ① | サマリーヘッダー（ヒーロー） | **新規**（旧 挨拶 + 子どもチップ + あしあと帳の数字 を統合） |
| ② | 今月の変化 | **新規**（3件以上） |
| ③ | クイックアクション | 再構成（旧「記録する・さがす」を置換） |
| ④ | 子どもプロフィール未登録プロンプト（`!hasChildren` 時のみ） | **既存・維持必須** |
| ⑤ | 最近の思い出（3→**5件**） | 既存拡張 |
| ⑥ | 家族のおでかけマップ | 既存そのまま |
| ⑦ | 家族のあしあと帳（推移グラフ既定表示） | 既存・数字を①へ移管 |
| ⑧ | **子どもたちの「好き」** | **既存・維持必須（削除禁止）** |
| ⑨ | 行きたい・行った場所のイベント | 既存そのまま |
| ⑩ | 思い出の写真 | 既存・**下部へ降格** |
| ⑪ | 設定 / ログアウト | 既存 |

**セクション数: 11（従来どおり）。増やさないこと。減らさないこと。**

> Phase C で ⑧「子どもたちの『好き』」が「好きの芽 / ランキング」カードに**置き換わる**。
> **Phase A では ⑧ をそのまま残す**（置換は Phase C の仕事）。
> Phase A 単独で本番に出せる = **回帰ゼロ**でなければならない。

---

## 5. 受入条件（Codex はすべて満たすこと）

### 機能

- [ ] `lib/mypage-stats.ts` の月境界判定が **`Asia/Tokyo` 固定**である
      （`new Date()` のローカルTZ／UTC に依存していない）
- [ ] **TZ検証**: システムTZを **UTC** に設定した状態で、
      **JST基準の月初（例: 2026-08-01 02:00 JST = 2026-07-31 17:00 UTC）** を模した日時で
      `currentMonthKeyJst()` が **`2026-08`** を返すことをテスト or 実行ログで示す
- [ ] 「今月の記録 +◯回」が **`created_at`（記録日）** ベースで算出されている
      （`visited_on` ベースでは**ない**ことをコードで示す）
- [ ] **UI文言が `今月の記録 +◯回` / `新しく記録した場所 +◯` である**
- [ ] **UI文言に「はじめての場所」「今月のおでかけ」が1箇所も無い**（grep で 0 件を示す）
      ※ 既存の「🌱 最近の初めて」（あしあと帳・`page.tsx:756`）は**別物なので残す**
- [ ] **過去記録テスト**: `visited_on` が**先月以前**の記録を今日新規作成したとき、
      ヒーローの「今月」が **+1 される**ことを実機で確認
- [ ] **null日付テスト**: `visited_on` が **null**（date_precision が exact でない）の記録でも
      「今月」に**計上される**ことを確認
- [ ] 子どもごとの `visitCount` が **`visit_children` の distinct visit_id 数**であり、
      家族の `totalVisitCount` を流用していない
- [ ] `childStage()` のしきい値が **0 / 1-2 / 3-9 / 10+** である
- [ ] `thisMonthVisitCount === 0` のとき「今月 +0回」を**表示しない**
- [ ] クイックアクションが **[記録する][振り返る][行きたい][写真から]** の4枠であり、**共有が無い**

### 制約（違反したら NO-GO）

- [ ] **DBマイグレーションを追加していない**
- [ ] **DBクエリのラウンドトリップ数が増えていない**
      （`visits` select への `created_at` 1列追加**のみ**。`wishlists` select は不変）
- [ ] **好きの芽 / ランキングのUIを出していない**（Phase C）
- [ ] **完了画面を触っていない**（Phase B）
- [ ] **共有導線を追加していない**（Phase D）
- [ ] **認証まわり（`proxy.ts` 含む）を触っていない**
- [ ] **UI文言に Git用語（commit / push / diff / log）が無い**
- [ ] **前月比・増減記号（+◯% / ▲ / △）が無い**

### 表示・状態別

- [ ] **写真0枚のアカウント**で、上部（①②③）が成立する（空白・崩れが無い）
- [ ] **記録0・子どもあり**のとき、ヒーローが「最初の1件を記録しましょう」型になり、
      ②今月の変化 / 最近の思い出 / あしあと帳 が**出ない**
- [ ] **記録0・子0** のとき、従来どおり `/mypage/onboarding` へリダイレクトする（挙動不変）
- [ ] 記録 1〜2件 / 3〜9件 / 10件以上 の3状態で、それぞれスクリーンショットを提出

### 品質

- [ ] `npm run lint` / `npm run build` が通る
      ※ 撮影用に一時ページを作った場合は**必ず削除**し、`rm -rf .next` してから build すること
      （消し残しの `.next` 型定義でビルドが落ちる。実際に発生した）
- [ ] `public/sitemap-0.xml` の再生成差分を**コミットに混ぜない**（`git checkout` で分離）
- [ ] **PC・SP 両方**のスクリーンショットを提出し、**セクション順序が意図どおり**であること
      （`lg:order` の破綻が無い）
- [ ] **SP初期表示（1画面目）に ①②③ が収まる**こと（スクリーンショットで示す）
- [ ] **セクション数が 11**（従来どおり。増やさない・減らさない）

### ★回帰ゼロ検証（origin/main 比較・必須。1つでも LOST なら NO-GO）

`git show origin/main:app/mypage/page.tsx` と突き合わせ、以下が**すべて残存**することを一覧で示すこと。

- [ ] T1 家族のあしあと帳
- [ ] T2 🏅 定番スポット
- [ ] T2 🌱 最近の初めて
- [ ] T3 最近増えた足あとチップ（マップ下）
- [ ] T4 📷 思い出の写真帯
- [ ] **T5 子どもたちの「好き」**（子ども別カテゴリ集計・カテゴリ内訳バー・「◯◯がいちばん多いね」）
- [ ] T6 PC 2カラム（**右カラムが空にならないこと**。あしあと帳｜子どもたちの「好き」の左右構成を維持）
- [ ] 家族のおでかけマップ ＋ 「🐾行ったN · ♥行きたいM」バッジ
- [ ] 行きたい・行った場所のイベント節
- [ ] 最近の思い出
- [ ] 6ヶ月推移グラフ
- [ ] 子どもプロフィール未登録プロンプト（`!hasChildren` の状態で表示されること）
- [ ] **子ども編集導線 `/mypage/children`**
      ★**単純な grep では検出できない罠**: 現状 `/mypage/children` は `!hasChildren` の
      未登録プロンプト内にしか無く、**子どもを登録済みのユーザーからは到達不能**になっている。
      **`hasChildren === true` の状態で `/mypage/children` へ行ける導線があること**を
      スクリーンショットで示すこと。
- [ ] 子どもチップのアンカー: `href` と自身の `id` が**同じ値でないこと**。
      タップで「子どもたちの『好き』」節へ実際にスクロールすることを PC/SP 両方で確認。

---

## 6. 想定リスクと対策

| # | リスク | 対策 |
|---|---|---|
| R1 | 「今月」が UTC でズレる | **Asia/Tokyo 固定 + UTC環境でのTZテストを受入条件に明記**（§5） |
| R2 | 過去記録が「今月」に入らず、オンボーディング直後に空振り | **created_at ベースに変更**（§3-A2）＋過去記録テストを受入条件に |
| R3 | 家族総数と子ども別件数の取り違え | **型を分離**（`FamilyStats` / `ChildStats`）し、相互流用禁止をコメントで明記 |
| R4 | `lg:order` 破綻（PC/SP で順序が狂う） | **PC・SP 双方のスクリーンショット提出を必須化** |
| R5 | SPが縦に伸びて日常操作性が落ちる | **セクション 11→11（増やさない・減らさない）を受入条件に**。SP初期表示に①②③が収まることを確認 |
| R6 | 写真0枚で上部が空振り | **ヒーローに写真を置かない設計**。写真0枚アカウントでの確認を必須化 |
| R7 | 既存の6ヶ月グラフを created_at に変えてしまう | **グラフは visited_on のまま**（「いつ行ったか」の可視化として正しい）。§3-A2 に明記 |

---

## 7. 規模見積り

| 項目 | 内容 |
|---|---|
| 新規ファイル | `lib/mypage-stats.ts` / `components/MypageHero.tsx` / `components/MonthlyDiffCard.tsx` / `components/MonthlyBarChart.tsx` / `components/CategoryBar.tsx` |
| 変更ファイル | `app/mypage/page.tsx`（select 1列追加＋上部再構成＋2ブロック抽出＋写真降格） |
| migration | **なし** |
| 追加DBクエリ | **なし**（select に列1つ） |
| Codex発注 | **1発注** |
| 規模感 | 中（新規ロジックは差分算出とTZ処理のみ。大半は既存ロジックの移設） |

---

## 8. Phase B / C への接続（Phase A で仕込むこと）

- `lib/mypage-stats.ts` の `childStage()` は、**Phase B の完了画面**（「あと◯件で◯◯ちゃんの"好き"が見えはじめます」）と
  **Phase C の好きの芽カード**が**共用**する。だから Phase A で純関数として切り出す。
- `components/MonthlyBarChart` / `CategoryBar` の抽出は、**Phase C の `LikeSproutCard`** が再利用するための準備。
- **Phase C を Phase B より先に出してはならない**（予告→達成の対が壊れる）。

---

## 9. 「行きたい今月+◯件」の扱い — **除外で確定**（オーナー確定・2026-07-11）

> Phase A の主役は「**おでかけ記録が積み上がること**」。
> wishlist は**別の行動**なので、低コストでも今回は混ぜない。必要なら後続 Phase で検討する。

- `wishlists` の select は **変更禁止**（`facility_slug` のみのまま）。
- 「今月◯件追加」の類の指標を Phase A で実装してはならない。

---

## 10. 発注条件（オーナー確定・2026-07-11・GO済み）

Codex は以下を厳守すること。**違反は NO-GO。**

| # | 条件 |
|---|---|
| 1 | **feature branch で実装**（`main` で直接作業しない） |
| 2 | **migration なし** |
| 3 | **DBラウンドトリップ追加なし**（`visits` select への `created_at` 1列追加**のみ**許可） |
| 4 | **`wishlists` select は変更しない** |
| 5 | **Phase B / C / D は触らない**（完了画面・好きの芽UI・ランキング・共有導線は一切実装しない） |
| 6 | **commit までは可** |
| 7 | **`main` への push・本番反映は禁止**（別GO。オーナーが判断する） |
| 8 | PM が **コード / テスト / PC・SPスクリーンショット** を独立検証して報告する |

**提出物（Codex → PM）:**
- feature branch 名と commit hash
- `git diff` 全文（またはブランチ差分）
- `npm run lint` / `npm run build` の出力
- **TZテストの実行ログ**（UTC環境で JST月初 → 正しい月キーを返すこと。§5）
- **PC・SP 両方のスクリーンショット**（記録 1〜2件 / 3〜9件 / 10件以上 / 記録0・子あり / 写真0枚 の各状態）
- 「はじめての場所」「今月のおでかけ」の **grep 0件**の証跡
