# MEM-TOPVALUE-002 follow-up 2 — Hero見出しの意味の塊が改行で分断される問題を修正 (Owner GO: 2026-09-18)

発注元: Memorips PM / 実装: Codex (Task Scheduler dispatch) / base: `origin/main` @ `92d30ab4`
(PR#101/#102の本番反映後、本番PCスクリーンショットを見たOwnerからの直接フィードバック)

## 0. Owner確定方針(2026-09-18、原文)

> Owner判断：GO
> Heroの価値訴求を守るため、改行制御を入れてください。
>
> - PCでは「子どもの『好き』が見えてくる。」を途中改行しない
> - PC / スマホでは「次のおでかけが見つかる。」を途中改行しない
>
> 目的は装飾ではなく、Memoripの価値である「好きが見える」「次のおでかけが見つかる」という意味の塊を崩さない
> ことです。文言変更や情報追加には広げず、この範囲はProduction確認までOwner再判断不要です。

添付スクリーンショット(PC幅)で、Hero左側の`<h1>`が実際には
```
遊び場を探す。
思い出を残す。
子どもの「好き」
が見えてくる。
```
の4行に分かれており、「子どもの『好き』」と「が見えてくる。」という一つの意味の塊が3行目と4行目に
分断されている。また右側のスマホモック見出しも
```
「好き」が見えると、次のおでかけが見つ
かる。
```
のように「見つかる。」が単語の途中(「見つ」と「かる。」)で分断されている。

## 1. 対象コード(`origin/main` @ `92d30ab4` 時点)

### 1-1. `<h1>`(`app/page.tsx`、527-530行目付近)

```tsx
<h1 className="mx-auto max-w-4xl text-3xl font-bold leading-tight tracking-tight drop-shadow-sm text-balance sm:text-5xl lg:mx-0 lg:text-[3rem]">
  <span className="inline-block">遊び場を探す。思い出を残す。</span>
  <br className="hidden sm:block" />
  <span className="inline-block">子どもの「好き」が見えてくる。</span>
</h1>
```
2つ目の `<span className="inline-block">子どもの「好き」が見えてくる。</span>` は、`inline-block`
だけでは内部の折り返しを止められない(`inline-block`は親からの行分割は防ぐが、要素自体の中身は
通常どおり折り返される)。そのため、PC幅(`lg:text-[3rem]`)で「子どもの「好き」」と「が見えてくる。」が
別々の行に分かれてしまっている。

### 1-2. Heroモックの見出し(`app/page.tsx`、275-278行目付近、`HeroMemoryCardCluster`内)

```tsx
<p className="px-2 pb-2 text-center text-sm font-bold text-slate-900">
  「好き」が見えると、次のおでかけが見つかる。
  <span className="mt-1 block text-xs font-medium">画面イメージ・件数や内容はサンプルです</span>
</p>
```
プレーンテキストのため、スマホモックの狭い幅(`max-w-[19.5rem]`程度)で「次のおでかけが見つかる。」が
単語の途中(「見つ」/「かる。」)で折り返されてしまっている。

## 2. 直すこと

**文言は一切変更しない。改行制御(CSS)のみを追加する。**

### 2-1. `<h1>` の2つ目のspan

`子どもの「好き」が見えてくる。` のspanに、PC幅(`lg`ブレークポイント以上)でのみ内部改行を禁止する
クラスを追加する(例: `lg:whitespace-nowrap`)。モバイル/タブレット幅ではOwner指示の対象外
(「PCでは」と明記されている)なので、そこでの折り返し挙動は変更しないこと
(= `lg:` 未満には `whitespace-nowrap` を付けない)。

1つ目のspan(`遊び場を探す。思い出を残す。`)はOwner指示の対象外のため変更しない。

`lg:whitespace-nowrap` を追加した結果、`max-w-4xl` のコンテナ幅に対して
`子どもの「好き」が見えてくる。`(全角15文字)が `lg:text-[3rem]` で確実に収まり、はみ出し
(横スクロールやコンテナからのオーバーフロー)が発生しないことを確認すること。万一収まらない場合のみ、
`text-balance` の挙動や `max-w-4xl` を調整してよいが、まずは `lg:whitespace-nowrap` 単体で
崩れないことを確認するのを優先する。

### 2-2. Heroモックの見出し(`「好き」が見えると、次のおでかけが見つかる。」`)

このテキストを2つの意味の塊に分け、それぞれ `inline-block` + `whitespace-nowrap` で包んで、
折り返しが発生する場合は塊の**境界**でのみ起きるようにする(塊の内部では改行させない)。
PC・スマホどちらの幅でも「次のおでかけが見つかる。」自体が割れないこと(Owner指示は
「PC / スマホでは」と明記、ブレークポイント限定ではない)。

イメージ:
```tsx
<p className="px-2 pb-2 text-center text-sm font-bold text-slate-900">
  <span className="inline-block whitespace-nowrap">「好き」が見えると、</span>
  <span className="inline-block whitespace-nowrap">次のおでかけが見つかる。</span>
  <span className="mt-1 block text-xs font-medium">画面イメージ・件数や内容はサンプルです</span>
</p>
```
(spanの分割位置・空白の有無は上記を参考に、実際にレンダリングして「次のおでかけが見つかる。」が
どの画面幅でも1行に収まり、かつ全体がモックのカード幅からはみ出さないことを優先して調整してよい)

## 3. 非ゴール / HOLD

- 見出し・キャプションの文言変更(Owner明記: 「文言変更や情報追加には広げず」)。
- `heroQuickLinks`・「今日の思い出」ブロックの写真・その他Heroの構成変更(直前のPR#101/#102で確定済み)。
- Hero以外のセクションの変更。
- 新しい推薦機能・新スコア・recommendation engineの変更(Owner HOLD、2026-09-16、継続)。

## 4. 受入条件 (AC)

未ログイン・スマホ相当(390×844)とPC相当(1280px、可能なら1440px程度も)の両方で確認すること。
ベースラインは `origin/main` @ `92d30ab4`。

- **AC-1**: PC幅(1280px)で `<h1>` の「子どもの「好き」が見えてくる。」が1行で表示され、
  「子どもの「好き」」と「が見えてくる。」が別行に分かれていない。かつコンテナからのはみ出し・
  横スクロールが発生していない。
- **AC-2**: スマホ幅(390px)・PC幅(1280px)の両方で、Heroモックの見出しの「次のおでかけが見つかる。」
  部分が1行で表示され、単語の途中(「見つ」/「かる。」等)で折り返されていない。かつモックカードの幅から
  テキストがはみ出していない。
- **AC-3 (回帰)**: `<h1>` および Heroモック見出しの文言そのものは `92d30ab4` と一字一句同一。
  Hero以外のセクション、`heroQuickLinks`、「今日の思い出」ブロックの写真、`<title>`・meta description・
  `JsonLd`・sitemap URL数は `92d30ab4` と同一。
- **AC-4**: `npm run lint` と `npm run build` が exit 0(直接実行、パイプ禁止)。
- **AC-5 (実測)**: 未ログイン・スマホ(390×844)/PC(1280px)双方のスクリーンショットで、AC-1・AC-2の
  改行結果を確認する。

## 5. 工程(Codex側で実施、直前2件と同一フロー)

1. 本worktree(`codex/hero-linebreak-followup-20260918`、base `origin/main` @ `92d30ab4`)で実装。
2. `npm run lint` / `npm run build` を直接実行しexit codeを確認(パイプ禁止)。
3. 未ログイン・スマホ(390×844)/PC(1280px)のスクリーンショットを `screenshots/hero-sp.png` /
   `screenshots/hero-pc.png` に保存(上書きでよい)。
4. commit→push→`gh pr create --base main --head codex/hero-linebreak-followup-20260918` でPR作成。
   **mergeはしない**。
5. このworktree直下に `codex-result.md` を作成し、PR番号・URL・最終commit hash・lint/build exit code・
   スクリーンショット保存先・判断に迷った点(なければ「なし」)を書く。
6. 完了後、このworktree直下に `codex-done.marker` を作成する(内容は任意)。
