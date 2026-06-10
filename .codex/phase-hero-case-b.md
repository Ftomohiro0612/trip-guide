# トップページ ヒーロー刷新: 案B「記録がたまるUI型」

> 作成: 2026-06-10 / Claude Code PM
> 優先度: 高
> ベース: `app/page.tsx`

---

## 目的

メモリップが「おでかけ記録サービス」であることをファーストビューで示す。
「探す → 行く → 記録する → 子どもの好きが見える」という体験価値を、
シンプルな2カラムレイアウトと3ステップで伝える。
既存の検索・地図・SEO導線はすべて維持する。

---

## ページ構成（変更後）

```
[1] ヒーロー（2カラム）          ← 全面刷新
[2] 3ステップ                   ← 新規追加
[3] 地図から探す                 ← 現状維持
[4] こんな遊びが好きな子に        ← 新規追加
[5] QuickFilter                 ← 現状維持
[6] エリアから探す               ← テキスト修正のみ
[7] カテゴリから探す             ← 現状維持
[8] ピックアップ                ← 現状維持
```

---

## [1] ヒーローセクション刷新

### レイアウト

```
デスクトップ: 左右2カラム（lg:grid-cols-2）
モバイル:     1カラム（左→右の順に縦積み）
```

現在の `<section>` の `<div className="relative mx-auto max-w-6xl ...text-center...">` を以下に置き換える。

### 実装

```tsx
<div className="relative mx-auto max-w-6xl px-4 py-12 sm:py-16">
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
    {/* ─── 左カラム: コピー・検索・CTA ─── */}
    <div className="text-white text-center lg:text-left">
      <p className="text-sm sm:text-base font-medium opacity-90 mb-3">
        関東甲信越9県 · {facilities.length}施設の子供向け遊び場
      </p>
      <h1 className="text-3xl sm:text-4xl font-bold leading-tight tracking-tight mb-4 drop-shadow-sm">
        子どもの&quot;好き&quot;が見える、
        <br />
        おでかけ記録サービス
      </h1>
      <p className="text-base opacity-95 mb-6 max-w-md mx-auto lg:mx-0">
        遊び場を探して、行きたい場所を保存。
        <br className="hidden sm:block" />
        行ったあとは、子どもの反応やまた行きたい場所を記録できます。
      </p>

      {/* 検索フォーム */}
      <p className="text-sm opacity-80 mb-2 font-medium">まずは遊び場を探す ↓</p>
      <form action="/facilities" className="max-w-md mx-auto lg:mx-0 mb-4">
        <div className="flex bg-white rounded-full shadow-xl overflow-hidden p-1.5">
          <input
            type="search"
            name="q"
            placeholder="施設名・地域・カテゴリで検索"
            className="flex-1 px-4 py-2.5 text-slate-900 placeholder-slate-400 outline-none text-sm sm:text-base"
          />
          <button
            type="submit"
            className="bg-brand hover:bg-brand-dark text-white font-bold px-5 sm:px-6 py-2.5 rounded-full transition-colors text-sm sm:text-base"
          >
            🔍 検索
          </button>
        </div>
      </form>

      {/* CTAボタン */}
      <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
        <Link
          href="/facilities"
          className="inline-flex items-center justify-center gap-2 bg-white text-sky-600 hover:bg-sky-50 font-bold px-6 py-3 rounded-full shadow-md transition-colors text-sm sm:text-base"
        >
          🗺️ 遊び場を探す
        </Link>
        <Link
          href="/sign-up"
          className="inline-flex items-center justify-center gap-2 bg-white/20 hover:bg-white/30 text-white border border-white/40 font-bold px-6 py-3 rounded-full transition-colors text-sm sm:text-base"
        >
          ✨ メモリップをはじめる
        </Link>
      </div>
    </div>

    {/* ─── 右カラム: 記録UIモック ─── */}
    <div className="flex justify-center lg:justify-end">
      <div className="w-full max-w-xs bg-white/15 backdrop-blur-sm rounded-3xl p-5 border border-white/25 shadow-2xl text-white">
        {/* モックヘッダー */}
        <p className="text-xs font-semibold opacity-70 mb-4 flex items-center gap-1">
          <span>📱</span> おでかけ記録プレビュー
        </p>

        {/* 実績サマリー */}
        <div className="flex gap-2 mb-4">
          {[["12", "おでかけ"], ["8", "施設"], ["2", "こども"]].map(([n, label]) => (
            <div key={label} className="flex-1 bg-white/20 rounded-xl py-2 text-center">
              <div className="text-lg font-bold leading-none">{n}</div>
              <div className="text-xs opacity-75 mt-0.5">{label}</div>
            </div>
          ))}
        </div>

        {/* 最近のおでかけ */}
        <div className="bg-white/20 rounded-xl p-3 mb-3">
          <p className="text-xs opacity-70 mb-1">📍 最近のおでかけ</p>
          <p className="font-semibold text-sm">よこはまこどもの国</p>
          <div className="flex flex-wrap gap-1 mt-2">
            <span className="text-xs bg-white/30 rounded-full px-2 py-0.5">😊 たのしかった</span>
            <span className="text-xs bg-white/30 rounded-full px-2 py-0.5">🔥 また行きたい</span>
          </div>
        </div>

        {/* 子どもの好き */}
        <div className="bg-white/20 rounded-xl p-3">
          <p className="text-xs opacity-70 mb-2">👧 ゆいちゃんの好き</p>
          <div className="flex flex-wrap gap-1">
            {["🐾 動物", "🛝 遊具", "💧 水遊び", "🌲 自然"].map((tag) => (
              <span key={tag} className="text-xs bg-white/30 rounded-full px-2 py-0.5">{tag}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  </div>
</div>
```

---

## [2] 3ステップセクション（新規追加）

ヒーロー `<section>` の閉じタグ直後、地図セクションの前に追加する。

```tsx
{/* 3ステップ */}
<section className="bg-slate-50 border-b border-slate-100 py-10" aria-labelledby="steps-heading">
  <div className="mx-auto max-w-6xl px-4">
    <h2 id="steps-heading" className="sr-only">メモリップの使い方</h2>
    <div className="grid grid-cols-3 gap-4 text-center max-w-2xl mx-auto">
      <div className="flex flex-col items-center gap-2">
        <div className="w-12 h-12 rounded-full bg-sky-100 flex items-center justify-center text-2xl">🔍</div>
        <p className="font-bold text-slate-900 text-sm sm:text-base">遊び場を探す</p>
        <p className="text-xs text-slate-500 hidden sm:block">条件・エリア・タグで検索</p>
      </div>

      {/* 区切り矢印 */}
      <div className="col-span-3 hidden" />
      {/* → は grid 3列なので間に矢印を入れると4列になる。
           代わりに各itemの右に絶対配置で → を置くか、
           3アイテムそれぞれに相対的に表示する。
           シンプル実装: ステップ番号バッジのみ使用 */}

      <div className="flex flex-col items-center gap-2">
        <div className="w-12 h-12 rounded-full bg-cyan-100 flex items-center justify-center text-2xl">📝</div>
        <p className="font-bold text-slate-900 text-sm sm:text-base">記録する</p>
        <p className="text-xs text-slate-500 hidden sm:block">感想・反応・また行くかを保存</p>
      </div>

      <div className="flex flex-col items-center gap-2">
        <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center text-2xl">✨</div>
        <p className="font-bold text-slate-900 text-sm sm:text-base">好きが見える</p>
        <p className="text-xs text-slate-500 hidden sm:block">子どもの興味・傾向がわかる</p>
      </div>
    </div>
  </div>
</section>
```

---

## [3] 地図から探す

変更なし（現状維持）。

---

## [4] こんな遊びが好きな子に（新規追加）

QuickFilter セクションの前に追加する。

```tsx
{/* こんな遊びが好きな子に */}
<section className="mt-14" aria-labelledby="tag-heading">
  <div className="flex items-end justify-between mb-5">
    <div>
      <h2 id="tag-heading" className="text-2xl font-bold text-slate-900">
        こんな遊びが好きな子に
      </h2>
      <p className="text-sm text-slate-500 mt-1">
        お子さんの「好き」から遊び場を探す
      </p>
    </div>
  </div>
  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
    {tagList.map(([tag, meta, count]) => (
      <Link
        key={tag}
        href={`/facilities?recommended_tag=${tag}`}
        className="group flex items-center gap-3 bg-white border border-slate-200 hover:border-sky-400 hover:shadow-md rounded-2xl p-3 transition-all"
      >
        <span className="text-2xl shrink-0" aria-hidden>{meta.icon}</span>
        <div className="min-w-0">
          <p className="font-bold text-sm text-slate-900 group-hover:text-sky-600 line-clamp-1">
            {meta.label}
          </p>
          <p className="text-xs text-slate-500">{count} 施設</p>
        </div>
      </Link>
    ))}
  </div>
</section>
```

`tagList` の生成コード（`HomePage` 関数冒頭に追加）:

```tsx
import { RECOMMENDED_FOR_TAG_META } from "@/lib/recommended-tags";
import type { RecommendedForTag } from "@/types/facility";

// ...HomePage 関数内:
const tagList = (
  Object.entries(RECOMMENDED_FOR_TAG_META) as [RecommendedForTag, { label: string; icon: string }][]
)
  .map(([tag, meta]) => {
    const count = facilities.filter((f) =>
      (f.recommended_for_tags ?? []).includes(tag)
    ).length;
    return [tag, meta, count] as const;
  })
  .filter(([, , count]) => count > 0)
  .sort((a, b) => b[2] - a[2]);
```

---

## [6] エリアから探す — テキスト修正

```tsx
// Before:
<p className="text-sm text-slate-500 mt-1">
  3県151施設をエリア別にチェック
</p>

// After:
<p className="text-sm text-slate-500 mt-1">
  {prefectures.length}県{facilities.length}施設をエリア別にチェック
</p>
```

---

## 変更しないこと

- `app/layout.tsx` / metadata (SEO)
- `components/MapViewClient.tsx`
- `components/QuickFilter.tsx`
- `components/FacilityCard.tsx`
- ピックアップセクション（全体ロジック）
- カテゴリ・施設一覧・詳細ページ

---

## 完了条件

- [ ] ヒーローが2カラム（デスクトップ）/ 1カラム（モバイル）に変更されている
- [ ] 検索フォームが左カラムに移動し、動作する
- [ ] 2つのCTAボタンが表示される（「遊び場を探す」→ `/facilities`、「メモリップをはじめる」→ `/sign-up`）
- [ ] 右カラムのモックUIが表示される（デスクトップ・モバイル両方）
- [ ] 3ステップセクションがヒーロー直下に表示される
- [ ] 「こんな遊びが好きな子に」グリッドが施設数0のタグを除いて表示される
- [ ] エリアセクションの施設数・県数が動的になっている
- [ ] `npm run lint` / `npx tsc --noEmit` / `npm run build` が通る
- [ ] `npx vercel --prod --yes --token <TOKEN>` でデプロイ（token は `C:\Users\tomo-\.codex\.sandbox-secrets\vercel.json`）
- [ ] agmsg で memorips チームの memorips-claude に GO 報告 + commit hash を送ること

---

## 注意

- `/sign-up` ルートは未実装でよい（404 になっても今は問題なし）
- モックUIの数字（12回 / 8施設 / 2こども）はハードコードで構わない
- `tagList` の型エラーが出る場合は `as const` のタプル型を調整すること
- モバイルでモックUIが重くなりすぎないようにする（backdrop-blur は `lg:` prefix でのみ適用してもよい）
