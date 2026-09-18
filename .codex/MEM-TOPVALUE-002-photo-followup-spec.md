# MEM-TOPVALUE-002 follow-up — Hero「今日の思い出」ブロックに写真を追加 (Owner GO: 2026-09-18)

発注元: Memorips PM / 実装: Codex (Task Scheduler dispatch) / base: `origin/main` @ `14d6d47f`
(直前のMEM-TOPVALUE-002 PR#101デプロイ後、本番を見たOwnerからの直接フィードバック)

## 0. Owner確定方針(2026-09-18、原文)

> 写真もいれてよ

本番の `https://memorips.com/` Heroを実機(スマホ)で見て、右側の「今日の思い出」ブロックに写真が無いことへの
指摘。PR#101で4要素並列(最近の記録/好きTOP3/写真も一緒に/行った場所)を3ステップ因果構成
(今日の思い出/好きが見えてきた/次のおでかけにおすすめ)へ作り直した際、写真要素を落としたことに対する
フィードバック。

## 1. 対象コード(`origin/main` @ `14d6d47f` 時点)

`app/page.tsx` の `HeroMemoryCardCluster` 内、「今日の思い出」ブロック(269行目付近の関数、
`<p className="text-xs font-bold text-sky-500">今日の思い出</p>` を含むカード)。

現状はテキストのみ:
```
今日の思い出
📍 こども自然公園
[水遊びに夢中] [また行きたい]
```

写真は一切表示されていない。PR#101より前は、このHeroMemoryCardCluster内に
`/guide/photo-now-record.png` と `/guide/photo-now-lookback.png` の2枚の画像が
(別ブロックとして)使われていたが、PR#101でどちらも削除された。画像ファイル自体は
`public/guide/` にまだ存在する。

## 2. 直すこと

「今日の思い出」ブロックに、実際の記録に写真が添付されるイメージが伝わる小さな写真サムネイルを1枚追加する。

- 画像は `/guide/photo-now-record.png`(`next/image` の `Image` コンポーネント、既存importを再利用)を使う。
- レイアウス: ブロック内でテキスト(📍こども自然公園 / 水遊びに夢中・また行きたいのタグ)と
  横並びにする(例: `flex items-start gap-3` で、左に `rounded-xl` の正方形サムネイル(目安
  `h-14 w-14` 程度、モックのカード全体の大きさに対して控えめに)、右にテキスト)。
  ブロック全体の高さ・他の2ブロック(好きが見えてきた/次のおでかけにおすすめ)とのバランスを崩さない
  サイズに収めること。
- `alt=""` + `aria-hidden`(既存の他の装飾画像と同じ扱い、モック全体は
  `aria-label="思い出の記録から子どもの好きが見え、次のおでかけにつながるスマホ画面風コンテナ"` で
  ラップ済みのため個々の画像はdecorative扱いでよい)。
- 「好きが見えてきた」「次のおでかけにおすすめ」の2ブロックには画像を追加しない
  (Owner指摘は「今日の思い出」に対するものであり、他ブロックの情報量を増やさない)。
- 見出し文言("「好き」が見えると、次のおでかけが見つかる。")・矢印コネクタ・他の2ブロックの内容は
  一切変更しない。

## 3. 非ゴール / HOLD

- 新しい推薦機能・新スコア・recommendation engineの変更(Owner HOLD、2026-09-16、継続)。
- Hero以外のセクションの変更。
- `heroQuickLinks`(検索下chip行)の再変更(直前のPR#101で確定済み、対象外)。
- 複数枚の写真ギャラリー化・カルーセル等、新規UI部品の追加(1枚のサムネイル追加のみに留める)。

## 4. 受入条件 (AC)

未ログイン・スマホ相当(390×844)とPC相当(1280px)の両方で確認すること。ベースラインは
`origin/main` @ `14d6d47f`。

- **AC-1**: Hero右側モックの「今日の思い出」ブロックに、`/guide/photo-now-record.png` を使った
  写真サムネイルが表示されている。
- **AC-2**: 「好きが見えてきた」「次のおでかけにおすすめ」の2ブロックの内容・順序・見出し文言は
  `14d6d47f` と同一。
- **AC-3 (回帰)**: Hero以外のセクション、`heroQuickLinks`、見出し文言("「好き」が見えると、
  次のおでかけが見つかる。")、`<title>`・meta description・`JsonLd`・sitemap URL数が
  `14d6d47f` 以上/同一であること。
- **AC-4**: `npm run lint` と `npm run build` が exit 0(直接実行、パイプ禁止)。
- **AC-5 (実測)**: 未ログイン・スマホ(390×844)/PC(1280px)双方のスクリーンショットで、
  写真サムネイルが正しく表示され、カード全体のレイアウトが崩れていないことを確認する。

## 5. 工程(Codex側で実施、PR#101のときと同一フロー)

1. 本worktree(`codex/hero-photo-followup-20260918`、base `origin/main` @ `14d6d47f`)で実装。
2. `npm run lint` / `npm run build` を直接実行しexit codeを確認(パイプ禁止)。
3. 未ログイン・スマホ(390×844)/PC(1280px)のスクリーンショットを `screenshots/hero-sp.png` /
   `screenshots/hero-pc.png` に保存(上書きでよい)。
4. commit→push→`gh pr create --base main --head codex/hero-photo-followup-20260918` でPR作成。
   **mergeはしない**。
5. このworktree直下に `codex-result.md` を作成し、PR番号・URL・最終commit hash・
   lint/build exit code・スクリーンショット保存先・判断に迷った点(無ければ「なし」)を書く。
6. 完了後、このworktree直下に `codex-done.marker` を作成する(内容は任意、存在確認のみに使う)。
