# 記録摩擦削減 実装仕様書(Track A: 行きたい起点クイック記録 / Track B: 写真起点記録)

- Owner GO: 2026-09-22(初回GO→Track A訂正→部分GO→最終GO)
- 目的: 「探す→行く→記録→好きが見える→次が見つかる」のうち **行く→記録の離脱を減らす**。機能数を増やすことが目的ではない。
- PMが実装前に既存コードを調査済み。**大部分は既存機能の再利用**であり、新規実装は下記の差分のみ。

## 0. 非機能要件・共通制約(全Trackに適用)

- GPS常時追跡・写真全体の自動スキャン・AIによる訪問自動確定・新規推薦/スコアリングエンジン・ネイティブアプリ化には広げない。
- Push通知は使わない(通知permission不要な受動的バナーのみ)。
- 既存の`wishlists`の意味(=「行きたい」= いつか行きたい候補も含む)を壊さない。
- **クイック記録で聞いていない項目は「未回答」として扱い、既定値をでっち上げて事実として保存しない**(本仕様の核心条件、詳細は1.3)。
- 新規テーブルは作らない。既存テーブルへの列追加のみ。

## 1. データモデル変更

### 1.1 `wishlists` テーブルへの列追加(Track A用)

```sql
ALTER TABLE public.wishlists
  ADD COLUMN planned_date DATE,
  ADD COLUMN visit_prompt_shown_at TIMESTAMPTZ,
  ADD COLUMN visit_prompt_dismissed_at TIMESTAMPTZ;
```

- 既存行は全て`planned_date = NULL`のまま。**意味変更なし**(=ただの「行きたい」)。
- `planned_date`が入っている行だけが2.2のプロンプト対象になる。

### 1.2 (参考)既存スキーマ再確認

- `visits.family_revisit TEXT NOT NULL CHECK (family_revisit IN ('yes','conditional','once_enough','no'))`
- `visits.parent_fatigue TEXT NOT NULL CHECK (parent_fatigue IN ('easy','normal','tired','exhausted'))`
- `visit_children.satisfaction child_satisfaction NOT NULL`(enum: `'loved','enjoyed','neutral','not_fit','could_not_join'`)。
- アプリ側の型は既に `family_revisit: string | null` / `parent_fatigue: string | null`(`lib/visited-places.ts`, `components/FacilityMyRecord.tsx`)、`satisfaction: string | null`(`lib/child-insights.ts`)として宣言されており、`FacilityMyRecord.tsx`は`family_revisit`が`null`のとき`"未設定"`を表示する分岐を、`lib/child-insights.ts`は`satisfaction === "loved" || satisfaction === "enjoyed"`という等価比較(`null`なら自動的にfalseになり、集計から自然に除外される)を**既に持っている**。つまりアプリ層は3列ともNULLを想定済みで、DBのNOT NULL制約だけが実態と合っていない。

### 1.3 NOT NULL制約緩和(Owner条件への対応・最重要)

```sql
ALTER TABLE public.visits
  ALTER COLUMN family_revisit DROP NOT NULL,
  ALTER COLUMN parent_fatigue DROP NOT NULL;

ALTER TABLE public.visit_children
  ALTER COLUMN satisfaction DROP NOT NULL;
```

- CHECK制約・ENUM型はそのまま残してよい(Postgresの CHECK は NULL に対して自動的に許可されるため、値が入る場合は引き続き列挙値のみ許可される)。
- **クイック記録経路(2.3のTrack A用クイック記録insert、3.のTrack B)では、この3列を明示的に`null`のまま保存し、既定値・代表値を絶対に入れない。** クイック記録では子どもごとの満足度(`satisfaction`)は質問しない(反応タグ1〜2個のみ)。よって`visit_children`行を作る際も`satisfaction: null`で保存する。
- 既存の手動記録フォーム(`app/mypage/visits/new/`)は変更しない。今まで通り`family_revisit`/`parent_fatigue`/`satisfaction`いずれも必須のまま。
- **既知の是正事項**: 現在本番で稼働中の`app/mypage/visits/from-photo/FromPhotoVisitDraftsClient.tsx`の`persistDraft()`は、写真起点の下書き作成時に`family_revisit: "conditional", parent_fatigue: "normal"`を無条件に書き込んでいる。これは本仕様が問題視している「未回答を事実として保存する」ケースそのものであり、**このコミットで同時に修正しnullへ変更する**こと(`satisfaction`はこの既存フローでは元々`visit_children`行自体を作っていないため対象外)。
  - 過去に作成済みの実データ行のうち、どれが実際にこの経路で作られた偽の既定値かを事後的に安全に判別する手段は現状ない(手動フォームでも`conditional`/`normal`は正当な回答値であり、値だけでは区別不可能)。**既存データの遡及的な書き換えは行わない**(誤って正当な回答を破壊するリスクの方が大きいため)。今後作成される行からのみ是正する。

### 1.4 集計・表示側の確認事項(Codexが実装時に検証)

- `lib/child-likes.ts`によるカテゴリ集計は`facility_slug`ベースであり`family_revisit`/`parent_fatigue`/`satisfaction`を参照しない(影響なし、確認のみ)。
- `family_revisit`/`parent_fatigue`を読む全箇所(`lib/visited-places.ts`, `components/FacilityMyRecord.tsx`, `app/mypage/visits/page.tsx`, `app/mypage/visits/[id]/page.tsx`, `app/mypage/visits/[id]/edit/page.tsx`, `app/mypage/page.tsx`)、および`satisfaction`を読む全箇所(`lib/child-insights.ts`, `app/mypage/children/[id]/page.tsx`, `app/mypage/memories/page.tsx`, `app/mypage/page.tsx`, `app/mypage/visits/facility/[slug]/page.tsx`, `app/mypage/visits/page.tsx`, `app/mypage/visits/[id]/edit/page.tsx`, `app/mypage/visits/[id]/page.tsx`, `app/mypage/visits/[id]/VisitChildCard.tsx`, `app/mypage/visits/[id]/VisitComparison.tsx`, `components/FacilityMyRecord.tsx`)で、`null`を「未回答」として扱い、既存の列挙値のいずれかであるかのように誤表示・誤集計しないことをコードレビューで確認する。

## 2. Track A: 「行きたい」起点のクイック記録

### 2.1 近々予定チップ(新規・最小)

- 配置: `components/FacilityActionButtons.tsx`。既存の「行きたいに追加」ボタンの直下、**wishlisted状態のときだけ**、小さく表示:
  「近々行く予定なら教えてください」+ チップ3つ:`今日` / `明日` / `今週末`(選択式、1つだけ選べる。選ばなければ何も起きない=現状維持)。
- タップすると対応する日付を`planned_date`に確定保存(今週末は直近の土曜日を計算)。もう一度同じチップを押すと解除(`planned_date = NULL`に戻す)。
- 新しいページ・新しいナビゲーション項目は追加しない。

### 2.2 再提示バナー(新規)

- 表示場所: `app/mypage/page.tsx`のトップ(mypage訪問時に評価)。
- 対象抽出条件(該当ユーザーの`wishlists`から):
  - `planned_date IS NOT NULL`
  - `planned_date <= 今日 - 1日`(予定日を過ぎている)
  - `planned_date >= 今日 - 7日`(期限切れは表示しない=予定日から7日を過ぎたら自然消滅)
  - `visit_prompt_dismissed_at IS NULL`
  - `visit_prompt_shown_at`が`NULL`、または`visit_prompt_shown_at`の日付(ユーザーのタイムゾーンでなくAsia/Tokyo基準)が今日ではない(=今日はまだ表示していない。1日1回までに抑える対象判定条件)
  - 対応する`visits`行(同一user・同一facility_slug、`visited_on >= planned_date - 1日`)がまだ存在しない
  - 該当行が複数あれば`planned_date`が最も古いもの1件のみ表示(通知の洪水を避ける)
- バナー文言例: 「{相対日表現(例:昨日)}、{facility_name}に行きましたか？ 10秒で記録する」
- アクション:
  - **[記録する]** → 2.3のクイック記録フローを、施設=対象facility、訪問日=`planned_date`(編集可)でプリフィルして起動。保存成功時にその`wishlists`行の`visit_prompt_dismissed_at`も更新する。
  - **[まだ]** → `visit_prompt_shown_at = now()`のみ更新。これは「終了」ではなく「今日は後で」の意味。上の抽出条件により当日は再表示されないが、期限(`planned_date >= 今日-7日`)内であれば翌日以降mypageを開いた際にまた対象になり得て、その都度[まだ]を押せる限り1日1回まで表示を繰り返す。期限切れになるか、[記録する]か[行かなかった]が押されて初めて終わる。
  - **[行かなかった]** → `planned_date = NULL`, `visit_prompt_dismissed_at = now()`。**「行きたい」行自体は削除しない**(ただの「行きたい」に戻るだけ)。

### 2.3 クイック記録フロー(新規・共有部品として実装しTrack Bからも呼ぶ)

- 入力: 施設(プリフィル、変更可能)、訪問日(プリフィル、変更可能)、参加した子どもの選択(複数可)、**選択した子どもごとに反応タグを1〜2個**(既存`reaction_tags`のうち`tag_type = 'interest'`のみを表示、行動タグ(`behavior`)はこのモードでは出さない)。
- 写真・コメント(`parent_memo`)は表示するが折りたたみ/任意のまま(既存フォームと同じ扱いを踏襲)。
- 保存条件: 施設名+訪問日+**少なくとも1人の子どもに1個以上の反応タグ**があれば保存可能(文字数下限は設けない)。
- 子どもが1人も登録されていないユーザーの場合、クイック記録の前提(子どもの反応タグ)が満たせないため、このモードは使えない。その場合は既存の通常記録フォーム(`/mypage/visits/new`、子ども未選択でも保存可能な既存挙動)へ誘導するか、子ども登録を促す既存の導線を表示すればよい(具体的なUI文言・遷移先はCodexの裁量でよく、これは仕様確定を要するほどの曖昧さではない)。
- 画面間の引き渡し(プリフィルする施設・訪問日・戻り先など)は、既存の`lib/visit-flow-session.ts`(`storeVisitEdit`/`storeVisitCompletion`/`storeVisitPresetChildren`等、セッションストレージ経由の既存パターン)を再利用する。新しい状態受け渡し方式(URLクエリの新規スキーマ等)を発明しない。
- 保存時のinsert: `visits`は`status: 'published'`、`family_revisit: null`、`parent_fatigue: null`。`visit_children`は選択した子どもごとに1行作成し、`satisfaction: null`(質問していないため)、`reaction_tags`は選んだタグのみ(1.3の条件どおり)。
- 保存後は3.の完了画面へ遷移する。

## 3. Track B: 写真起点記録の即完成化

対象ファイル: `app/mypage/visits/from-photo/FromPhotoVisitDraftsClient.tsx`(既存フローを拡張。作り直さない)。

- 現状: 写真選択→EXIF撮影日→GPSによる近傍施設候補(端末内のみ、施設候補提案にのみ使用)→ユーザーが候補から確定 or 手動検索、のあとに**`status: 'draft'`で保存し`/mypage/visits/edit`へ遷移**して終わる。
- **既存の訂正不要事項(重要・変更しないこと)**: `persistDraft`内で、確定した施設がカタログに存在しない手動/private place(`facility_slug`が`manual-`始まり、`isManualFacilitySlug()`で判定)の場合に限り、選択写真のGPS(`photo.gps`)を`visits.place_latitude`/`place_longitude`へ**1回だけ**保存する既存ロジック(新規insert時・既存visitへの写真追加時の両方、`saveManualPlaceCoordinatesForExistingVisit`関数を含む)がある。これは「行った場所マップ」でカタログにない手動地点にもピンを立てるための、既にOwner承認済みの一度限りの保存であり、GPS常時追跡や保存範囲の拡大ではない。**このタスクではこの挙動を一切変更しない**(カタログ施設が確定した場合は今まで通り保存されない)。
- **この変更の適用範囲(重要・曖昧さの解消。5回目で確定)**: 「新規`visits`行を作るか」は`draft.existingMatch`の有無だけでは判定できない(`existingMatch`が付いていても、ユーザーが「別の記録として作成」= `createSeparate: true`を選べば新規insert経路に進む、`persistDraft`918・948・1022行付近を参照)。よって条件は**実際に実行される経路で判定する**:
  - **新規insert経路 = `!draft.existingMatch || draft.createSeparate`**。この経路にのみ、インライン反応タグ追加・即`published`化・`family_revisit`/`parent_fatigue`/`satisfaction`のNULL保存を適用する。
  - **既存マージ経路 = `draft.existingMatch && !draft.createSeparate`**(同日・同施設の既存visitへ写真を追加/入れ替えする`isFullMergeDraft`/`hasPhotoReplacement`を含む一連の処理)。この経路は**一切変更しない**。既存のvisitの`family_revisit`/`parent_fatigue`/`status`、および既存の`visit_children`行(satisfaction・reaction_tags含む)は今まで通り触らない。理由: `visit_children`は`(visit_id, child_id)`が主キーであり単純insertは失敗し得ること、既存の正当な回答をNULLや今回選んだタグで上書きしてしまうリスクがあるため。この経路の保存後の遷移先(`/mypage/visits/edit`)も現状のまま変更しない。
  - つまり「施設確定直後にインラインで反応タグ入力を追加する」ミニステップの表示条件も、`!draft.existingMatch || draft.createSeparate`と同じ判定を使う(`existingMatch`が付いていても`createSeparate`済みなら表示する)。
- 変更(新規insert経路 = `!draft.existingMatch || draft.createSeparate`のみ): 施設確定(`draft.facilitySlug`が確定 = `selectFacility`が呼ばれた状態)の直後に、2.3のクイック記録の子ども選択+反応タグ入力ステップをこの画面内にインラインで追加する。
  - 複数下書き(バッチ写真取り込み)の場合、新規insert経路に該当する各下書きカードの中にこのミニステップを表示する。
  - 保存(`persistDraft`の新規insert分岐)時に`status: 'draft'`ではなく`status: 'published'`、`family_revisit: null`, `parent_fatigue: null`で保存するよう変更(現行の`"conditional"`/`"normal"`ハードコードを削除)。上記の`place_latitude`/`place_longitude`保存ロジックはそのまま残すこと。
- 遷移先: 新規insert経路で保存成功した場合は、現行の`/mypage/visits/from-photo/complete`ではなく**3.1の共有完了画面**へ遷移する。既存マージ経路は現状の遷移(`/mypage/visits/edit`)のまま変更しない。複数下書きを一括保存し、一部が新規insert・一部が既存マージだった場合は、新規insert分のみ完了画面の対象として扱ってよい(既存の`createdDraftIds`単位のロジックを流用できる)。

### 3.1 完了画面への追加(既存`/mypage/visits/complete`を拡張)

- 既存の「家族○回目」「{子}が好きが〜」相当の`primaryCopy`表示はそのまま維持(実際の文言は`app/mypage/visits/complete/actions.ts`を確認し、Owner の「○○が好きがまた1つ増えた」の意図に合っているか確認、ずれていれば文言のみ調整)。
- **新規**: 「次のおでかけ候補」ブロックを1件追加。
  - ロジック: 今回記録した施設の`recommended_for_tags`と一致するタグを持つ施設を`data/facilities_data.json`から抽出し、その子どもが**まだ訪問記録のない**施設を1件選ぶ(複数該当があればランダムまたは先頭1件、新規スコアリングは行わない)。該当なしなら何も表示しない(空表示でよい、代替導線は作らない)。
  - 表示: 既存`components/FacilityCard.tsx`をそのまま1件レンダリングする。

## 4. 発見性改善(Track Bの入口)

- 対象: `components/FacilityActionButtons.tsx`(施設詳細ページ)。
- 「この場所を記録する」ボタンの下に、小さいセカンダリリンクを追加:
  「📷 写真から記録することもできます」→ `/mypage/visits/from-photo` へ。
- 既存の`app/mypage/visits/new/page.tsx`冒頭にある同種のクロスリンクboxと同じトーン(新しいUIパターンを増やさない)。
- `components/FacilityCard.tsx`(一覧・グリッド)には追加しない(Owner指示「新しい大きな導線を増やさない」を優先し、詳細ページのみに留める)。

## 5. 受け入れ条件(AC)

1. 通常の「行きたいに追加」タップだけでは、翌日以降も一切バナーが出ない(既存ユーザーの体験は不変)。
2. 「今日/明日/今週末」チップを選んだ「行きたい」だけが、予定日を過ぎてから7日以内に、mypageバナー対象になり得る。[まだ]を選んだ場合は当日中の再表示はないが、期限内なら翌日以降1日1回まで再度対象になり得る。[記録する]で記録が完成するか[行かなかった]を押すと、以後二度と出ない。
3. Track A・Track Bいずれのクイック記録も、子どもの反応タグ1個以上の選択のみで保存可能(写真・コメント・家族の再訪意向・親の疲労度・子どもごとの満足度への回答を必須にしない)。
4. クイック記録・写真起点記録で作成された`visits`行は`family_revisit`/`parent_fatigue`が**共にNULL**、対応する`visit_children`行は`satisfaction`が**NULL**であり、いずれも列挙値が誤って入っていないことをDBで確認する。
5. 手動記録フォーム(`/mypage/visits/new`)の必須項目・挙動は一切変更されていない(回帰なし)。
6. 保存直後に「○○が好きが増えた」相当のフィードバック+次のおでかけ候補(0件なら非表示)が表示される。
7. 施設詳細ページから「写真から記録することもできます」経由で`/mypage/visits/from-photo`に到達できる。
8. GPS情報の扱いは既存動作から変更されていないことを確認する: 施設候補提案には端末内でこれまで通り使われる。カタログ施設が確定した場合は保存されない。手動/private place確定時のみ、既存の`place_latitude`/`place_longitude`保存(1回限り)が今まで通り行われる。これはOwner承認済みの既存機能であり、新規のGPS常時追跡・保存範囲拡大ではないことを確認する(既存動作の非退行確認であって、新規に「保存しない」ようにする変更ではない)。
9. 新しいpush通知・permissionダイアログが一切増えていないこと。

## 6. スコープ外(このタスクでは着手しない)

- ネイティブアプリ化、GPS常時追跡、写真ライブラリ全体の自動スキャン、AIによる施設自動確定、新規推薦/スコアリングエンジン、`wishlists`の意味変更、既存の遡及的データ修正。

## 7. Owner再確認が必要な場合

- 上記の設計・データモデルで表現できない事態が判明した場合(現時点では想定なし)。
- それ以外は、本仕様→実装→既定gate(build/tsc/lint/実データ確認)→Productionまで、Owner再判断不要(2026-09-22 Owner GO)。
