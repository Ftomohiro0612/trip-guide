# MEM-ACT-001 — 初回activation修理 (Owner GO: 2026-09-16)

発注元: Memorips PM / 実装: Codex / base: `origin/main` @ `183801e8`

## 0. Owner確定方針 (2026-09-16)

Memoripは「検索サイトに記録を付けたもの」ではなく、**「遊び場を探すことを入口に、記録 → 子どもの好き → 次のおでかけへ循環するサービス」**として進める。
**検索機能やSEOを弱める意図はない。**

### 意味のある完了状態 (Owner定義・そのまま受入基準の根幹)

> 未登録の初見ユーザーが、目立つ「記録する」入口から Memoripらしい記録を1件完成させ、
> 子どもの反応を残し、その記録を失わず登録へ進める状態。

## 1. 最重要の前提 — 正しい体験は既に実装済みである

PMが本番(`183801e8`)で実測・コードで確認した。**新規に作るものではなく、既存の1本道へ他の面を合流させるのが本トラックの本体である。**

`app/facilities/[slug]/page.tsx` に限り、以下が端から端まで動いている:

1. `FacilityGuestRecordProvider` (per-facility で mount、`interestTags` と `recommendationCandidates` をサーバ側で算出して渡す)
2. `FacilityActionButtons` の「この場所を記録する」→ `openGuestRecord()` でゲストモーダル
3. モーダルは **反応タグ1つ以上を必須**にしている (タグ未選択の間 submit は disabled)。写真は任意。訪問日は当日が既定。
4. 送信すると `MEMORY COMPLETE` カード + **`NEXT OUTING`「この記録から、次に合いそうな3件」**
   — `selectGuestRecordRecommendations()` が**ユーザーが選んだタグ**で候補を絞った実データ推薦
5. 「写真以外の入力は、このタブで登録・ログイン後の保存画面へ引き継ぎます。」の明示 +
   `storeGuestRecordDraft()` (sessionStorage) と `/auth/register?redirectTo=/mypage/visits/new?...&guestDraft=1` の二重引き継ぎ

**したがって新しい推薦機能・新スコアは作らない (Owner HOLD)。**
既存資産 `lib/guest-record.ts` / `lib/guest-record-recommendations.ts` / `lib/child-likes.ts` /
`lib/mypage-recommendations.ts` / `components/ChildRecommendationSection.tsx` を前提とする。
**既存機能では商品約束を実現できないと判明した場合だけ、実装を止めてPM経由でOwnerへ戻すこと。**

## 2. 直すもの

### 2-1. 目立つ「記録する」入口がログイン壁になっている (最優先)

本番実測:

| 入口 | 現状の未登録挙動 | 個数(実測) |
|---|---|---|
| `FacilityCard` の「✓ 行ったことを記録」 | **即ログイン壁**へ redirect | トップに6 |
| `EventCard` → `EventRecordButton` の「このイベントを記録」 | **即ログイン壁**へ redirect | `/events/tokyo` に20 |
| 施設詳細「この場所を記録する」 | ゲストで完走できる(正しい体験) | 1 |

原因(コードで確認): `FacilityGuestRecordProvider` は `app/facilities/[slug]/page.tsx` でしか mount されず、
`FacilityCard` はその外側で描画されるため `onGuestRecord` を受け取れず、共有 hook
`useFacilityIntentActions` がログイン redirect へ落ちる。`useEventIntentActions` にはゲスト経路自体が無い。

**達成すべき状態**: 初見ユーザーが最初に押す確率の高い記録CTAから、ログイン壁に当たらずに
「Memoripらしい記録」(= 反応タグを残し、記録由来の次の候補が出る)に到達できること。

**実装方式はCodexが所有する。** ただし以下は制約:

- 共有hookの分岐を変える場合、**全consumerを列挙して受入条件に含めること**。
  - `useFacilityIntentActions` の consumer は `components/FacilityActionButtons.tsx` と
    `components/FacilityCard.tsx` の **2つのみ**。
  - `FacilityCard` の consumer は `app/page.tsx` / `app/category/[id]/page.tsx` /
    `app/tag/[slug]/page.tsx` / `app/prefecture/[id]/category/[categoryId]/page.tsx` /
    `app/facilities/[slug]/page.tsx` / `components/NearbyFilterableFacilityList.tsx` /
    `components/PrefectureDiscoveryFacilityList.tsx` /
    `app/mypage/visits/from-photo/FromPhotoVisitDraftsClient.tsx` の **8つ**。全箇所で回帰が無いこと。
  - `useEventIntentActions` の consumer は `components/EventRecordButton.tsx` の **1つのみ**。
  - オプショナル呼び出しへの差し替えは例外も警告も出さずサイレントに死ぬ。必ず全consumerを実際に確認すること。
- イベントには施設のような `interestTags` / `recommendationCandidates` が無い。
  既存資産でイベントのゲスト記録が成立しないなら、**タップ後にログイン壁で落とすのではなく、
  タップ前に要登録であることが分かる状態**にすること(壁の位置を後ろから前へ移すのは可)。
  イベントにゲスト記録を成立させる新規データ構造の新設は本トラックでは行わない。

### 2-2. `/try` が Memoripらしい体験を代表していない

本番実測:

- 実体は社内プレビュー用 `app/memory-story-preview/MemoryStoryReview.tsx` の流用
  (`app/try/page.tsx` がそれを sampleStories 付きで描画しているだけ)
- **写真が `required`**。未選択で送信すると**画面が何も変わらない**(エラー表示なし)= 無言で詰まる
- **反応タグ・子ども・満足度を一切扱わない** → 「子どもの"好き"が見える」体験になっていない
- 日付の初期値が `useState("2026-07-26")` で固定。結果カードに「2026.7.26」と出る
- 作成後に出るサンプル記録スタック(他家族の実名「彩瑛」「望結」入り)に、
  **サンプルである旨・誰の記録かの文脈ラベルが無い** → 「自分の記録も他人に見えるのか」と誤読され得る
- 施設側にある `guestDraft` 相当の引き継ぎが無く、お試しの成果が登録後どうなるか分からない

**達成すべき状態**: トップが最も明示的に案内するお試しが、2-1 と同じ「Memoripらしい記録」を代表すること。
すなわち **反応タグを残せ、記録由来の次の候補が出て、引き継ぎが明示される**こと。
写真は任意にすること。無言の失敗を残さないこと。固定日付を撤去すること。
サンプル記録にはサンプルである旨を明示すること。

### 2-3. トップページの配分

本番実測(スマホ390×844): 全高 **11,844px = 14.0画面**。

- ファーストビューの全幅大ボタン3本はすべて検索系。記録CTA 2本のみ**下線テキストリンク**扱い
- 循環の説明(STEP 01-04)は **11.8画面目**。手前の約9.7画面は探す系のみ
- **循環ブロックの締めCTAが「遊び場を探す」(→`/facilities`)と「できることを見る」(→`/guide`)で、記録開始への導線がゼロ**
- 1.1画面目のモック(「最近の記録 24件」「好きTOP3」)に見出し・注記・リンク・ボタンが一切無い

**達成すべき状態**: 記録の入口が、検索の入口と同等以上の視覚的階層を持つこと。
循環を理解させた直後に記録開始へ進めること。モックが何を表しているか説明なしで分かること。

**禁止**: 検索導線(検索ボックス・現在地・テーマ・カテゴリ・47都道府県リンク・おすすめ施設)の
**削除・件数表示の削減・内部リンクの削減**。SEOを弱めない。配分と階層の変更で達成すること。

### 2-4. `/about` のポジショニング

本番実測: `<main>` 内の語数が **記録×0 / 思い出×0 / 好き×0**。
リードは「子育て世代のための、子供向け遊び場検索サイト」、締めCTAは「地図から探す」「条件から絞り込む」。
一方 `<title>`・footer・`/guide` は記録サービスを名乗っており、**サイト内で自己定義が割れている**。

**達成すべき状態**: 0章の方針(探すことを入口に記録へ循環する)で自己定義が一致すること。
掲載エリア・施設件数・情報の正確性・運営者の記載は**残すこと**。

### 2-5. 副次 — 固定 `today`

`app/mypage/memories/page.tsx:66` の `const today = new Date("2026-07-26T00:00:00+09:00")` により
「あれから◯日」の算出基準が止まっている。実時刻基準にすること。
**JSTの扱いは既存の `Asia/Tokyo` 固定の流儀に合わせること**(実行環境TZ依存にしない)。

## 3. 非ゴール / HOLD

- **新しい推薦機能・新スコア・recommendation engineの変更は禁止**(Owner HOLD)。既存資産の再利用のみ。
- 検索機能・SEOの弱体化(前述)。
- DB schema変更・マイグレーション。必要と判明したら実装を止めてPMへ戻すこと(Owner手動適用ゲートのため)。
- 施設・イベントのデータ追加・削除・鮮度更新。本トラックはデータを触らない。
- マイページ全体の再設計。2-5 以外のログイン後画面の改修。
- 新都道府県・新カテゴリ。

## 4. 受入条件 (AC)

すべて **未ログイン / スマホ相当(390×844)** で確認すること。ベースラインは `origin/main` @ `183801e8`。

- **AC-1**: トップの施設カードの記録CTAを未登録で押して、ログイン画面に飛ばされない。
  反応タグを選んで記録を完成でき、完成カードに記録由来の次の候補が出る。
- **AC-2**: `/events` 配下の記録CTAが、未登録ユーザーをタップ後のログイン壁で落とさない。
  (ゲスト記録が成立しない場合は、タップ前に要登録と分かる状態であること。)
- **AC-3**: `/try` で**写真を選ばずに**記録を完成できる。完成物に反応タグと記録由来の次の候補が含まれる。
- **AC-4**: `/try` の日付初期値が実行日である。`2026-07-26` の固定値がコードベースから消えている
  (`app/memory-story-preview/MemoryStoryReview.tsx` / `app/mypage/memories/page.tsx` の両方)。
- **AC-5**: `/try` のサンプル記録が、サンプルであると画面上で判別できる。
- **AC-6**: ゲストで作った記録が、登録/ログインへ進む導線の中で失われないことが画面上で明示される
  (施設詳細で既に成立している水準を、2-1・2-2 の各入口でも満たす)。
- **AC-7**: トップの循環説明ブロックから、記録開始へ直接進める導線がある。
- **AC-8**: トップの記録CTAが、検索CTAと同等以上の視覚的階層を持つ。
- **AC-9**: トップのモック表示に、それが何かを説明するラベルがある。
- **AC-10**: `/about` の `<main>` が0章の方針で自己定義している。掲載エリア・件数・情報の正確性・運営者の記載が残っている。
- **AC-11 (回帰・SEO非弱体化)**: トップ・県・カテゴリ・タグ・施設詳細・イベントの
  内部リンク本数と掲載件数表示が `183801e8` 以上であること。`sitemap` のURL数が減っていないこと。
  施設詳細/イベント詳細の構造化データ・metadata が欠落していないこと。
- **AC-12 (共有hook回帰)**: 2-1 に列挙した `useFacilityIntentActions` 2consumer /
  `FacilityCard` 8consumer / `useEventIntentActions` 1consumer の**全箇所**で、
  ログイン済み・未ログインの双方の挙動を確認し、結果を報告に列挙すること。
- **AC-13**: `npm run lint` と `npm run build` が exit 0。validator errors 0。
  warnings はベースライン同数以下。ビルド後に `public/sitemap*` の差分が出た場合は内容を確認し、
  意図した差分でなければ戻すこと。

## 5. 工程

- L2: worktree隔離 → 実装 → lint/build/validator → PRを出す。
- PM が独立検収(AC全件を本番同等条件で再実測)。
- **GREEN確定の直後・merge前**に `ai-memory-memorips` の `action-ledger.md` へ本トラックの
  `REQUESTED` 行を commit + push し、**リモートから読み戻して確認**してから merge する。
- merge 後に `npm run cf:deploy`(Cloudflare公開env 6件が必要。値は推測しない)。
- 本番実測 → ledger `SUCCEEDED` → `active-decisions.md` へ記録。
- **Owner再承認は本番反映まで不要**(2026-09-16 Owner明示)。
  ただし schema変更が必要と判明した場合、または既存資産では商品約束を実現できないと
  判明した場合のみ、実装を止めてPM経由でOwnerへ戻す。
