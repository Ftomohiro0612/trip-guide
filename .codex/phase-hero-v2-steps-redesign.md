# トップページ 使い方セクション + ヒーロー改善 v2

> 作成: 2026-06-11 / Claude Code PM
> 対象: `app/page.tsx`

---

## 優先順位

1. **3ステップ → STEP カード UI 化**（今回の主タスク）
2. 右カラム記録モックを少し具体化（同時実施）
3. ヒーロー背景の世界観装飾（軽め、同時実施）

---

## [A] 使い方セクション（3ステップ → STEP カード）

現在の 3ステップ `<section>` を以下に**丸ごと置き換える**。

```tsx
{/* ─── 使い方セクション ─── */}
<section className="relative py-16 sm:py-20 bg-white overflow-hidden" aria-labelledby="how-heading">
  {/* 背景装飾（薄い地図・ルート・きらめき） */}
  <div className="absolute inset-0 pointer-events-none select-none" aria-hidden>
    <svg className="absolute top-0 left-0 w-full h-full opacity-[0.045]" viewBox="0 0 1200 500" fill="none" preserveAspectRatio="xMidYMid slice">
      {/* 点線ルート（全体を横断するルート風） */}
      <path d="M0 380 Q200 320 400 260 Q600 200 800 240 Q1000 280 1200 200" stroke="#38bdf8" strokeWidth="2" strokeDasharray="6 8" fill="none"/>
      <path d="M0 100 Q300 160 600 120 Q900 80 1200 140" stroke="#34d399" strokeWidth="1.5" strokeDasharray="4 10" fill="none"/>
      {/* 地図ピン */}
      <path d="M120 180 C116 180 112 184 112 189 C112 195 120 204 120 204 S128 195 128 189 C128 184 124 180 120 180Z" fill="#38bdf8"/>
      <circle cx="120" cy="189" r="2.5" fill="white"/>
      <path d="M580 80 C576 80 572 84 572 89 C572 95 580 104 580 104 S588 95 588 89 C588 84 584 80 580 80Z" fill="#34d399"/>
      <circle cx="580" cy="89" r="2.5" fill="white"/>
      <path d="M980 300 C976 300 972 304 972 309 C972 315 980 324 980 324 S988 315 988 309 C988 304 984 300 980 300Z" fill="#06b6d4"/>
      <circle cx="980" cy="309" r="2.5" fill="white"/>
      {/* きらめき点 */}
      <path d="M200 60 L201.5 65 L207 66 L201.5 67.5 L200 72 L198.5 67.5 L193 66 L198.5 65Z" fill="#38bdf8"/>
      <path d="M800 120 L801 124 L805 124.5 L801 125.5 L800 130 L799 125.5 L795 124.5 L799 124Z" fill="#34d399"/>
      <path d="M1100 380 L1101 384 L1105 384.5 L1101 385.5 L1100 390 L1099 385.5 L1095 384.5 L1099 384Z" fill="#06b6d4"/>
      {/* 足あと（小さな楕円ペア） */}
      <ellipse cx="350" cy="420" rx="5" ry="3" transform="rotate(-20 350 420)" fill="#38bdf8"/>
      <ellipse cx="362" cy="428" rx="5" ry="3" transform="rotate(-20 362 428)" fill="#38bdf8"/>
      <ellipse cx="750" cy="450" rx="4" ry="2.5" transform="rotate(15 750 450)" fill="#34d399"/>
      <ellipse cx="762" cy="442" rx="4" ry="2.5" transform="rotate(15 762 442)" fill="#34d399"/>
    </svg>
  </div>

  <div className="relative mx-auto max-w-6xl px-4">
    {/* セクション見出し */}
    <div className="text-center mb-12">
      <p className="text-xs font-bold tracking-widest text-sky-500 uppercase mb-2">How it works</p>
      <h2 id="how-heading" className="text-2xl sm:text-3xl font-bold text-slate-900 mb-3">
        メモリップの使い方
      </h2>
      <p className="text-slate-600 max-w-xl mx-auto text-sm sm:text-base leading-relaxed">
        探して、行って、記録する。<br className="hidden sm:block" />
        おでかけのたびに、子どもの&quot;好き&quot;が少しずつ見えてきます。
      </p>
    </div>

    {/* STEPカード3枚 */}
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 relative">
      {/* カード間の接続線（デスクトップのみ） */}
      <div className="hidden md:block absolute top-10 left-[calc(33.3%-1rem)] right-[calc(33.3%-1rem)] h-px border-t-2 border-dashed border-sky-200 z-0" />

      {/* STEP 01: 遊び場を探す */}
      <div className="relative bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow p-7 sm:p-8 z-10">
        <div className="flex items-baseline gap-1 mb-6">
          <span className="text-[10px] font-bold tracking-[0.2em] text-sky-400">STEP</span>
          <span className="text-4xl font-bold text-sky-100 leading-none select-none">01</span>
        </div>
        {/* Icon: 地図ピン + ルート */}
        <div className="w-14 h-14 rounded-2xl bg-sky-50 flex items-center justify-center mb-5">
          <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-8 h-8">
            <path d="M8 34 Q12 26 20 20" stroke="#38bdf8" strokeWidth="1.5" strokeDasharray="2 3" strokeLinecap="round" fill="none"/>
            <path d="M20 6 C15.5 6 11 10 11 15.5 C11 22 20 32 20 32 S29 22 29 15.5 C29 10 24.5 6 20 6Z" fill="#38bdf8"/>
            <circle cx="20" cy="15.5" r="4" fill="white"/>
            <path d="M32 10 L32.8 12.8 L36 13.5 L32.8 14.2 L32 17 L31.2 14.2 L28 13.5 L31.2 12.8Z" fill="#34d399" opacity="0.9"/>
          </svg>
        </div>
        <h3 className="text-lg font-bold text-slate-900 mb-2">遊び場を探す</h3>
        <p className="text-sm text-slate-600 leading-relaxed">
          年齢・エリア・遊びのタグから、今の家族に合う場所を見つけます。
        </p>
      </div>

      {/* STEP 02: おでかけを記録する */}
      <div className="relative bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow p-7 sm:p-8 z-10">
        <div className="flex items-baseline gap-1 mb-6">
          <span className="text-[10px] font-bold tracking-[0.2em] text-cyan-400">STEP</span>
          <span className="text-4xl font-bold text-cyan-100 leading-none select-none">02</span>
        </div>
        {/* Icon: メモ + チェック + きらめき */}
        <div className="w-14 h-14 rounded-2xl bg-cyan-50 flex items-center justify-center mb-5">
          <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-8 h-8">
            <rect x="9" y="7" width="20" height="25" rx="3" fill="#06b6d4" opacity="0.12"/>
            <rect x="9" y="7" width="20" height="25" rx="3" stroke="#06b6d4" strokeWidth="1.5"/>
            <line x1="14" y1="14" x2="26" y2="14" stroke="#06b6d4" strokeWidth="1.3" strokeLinecap="round"/>
            <line x1="14" y1="19" x2="22" y2="19" stroke="#06b6d4" strokeWidth="1.3" strokeLinecap="round"/>
            <path d="M14 24.5 L17 27.5 L23 22" stroke="#34d399" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
            <path d="M31 10 L31.6 12.4 L34 13 L31.6 13.6 L31 16 L30.4 13.6 L28 13 L30.4 12.4Z" fill="#38bdf8" opacity="0.9"/>
          </svg>
        </div>
        <h3 className="text-lg font-bold text-slate-900 mb-2">おでかけを記録する</h3>
        <p className="text-sm text-slate-600 leading-relaxed">
          行ったあとに、子どもの反応・満足度・また行きたい気持ちを残します。
        </p>
      </div>

      {/* STEP 03: 好きが見える */}
      <div className="relative bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow p-7 sm:p-8 z-10">
        <div className="flex items-baseline gap-1 mb-6">
          <span className="text-[10px] font-bold tracking-[0.2em] text-emerald-400">STEP</span>
          <span className="text-4xl font-bold text-emerald-100 leading-none select-none">03</span>
        </div>
        {/* Icon: 芽 + 星 + タグチップ */}
        <div className="w-14 h-14 rounded-2xl bg-emerald-50 flex items-center justify-center mb-5">
          <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-8 h-8">
            <path d="M20 34 L20 20" stroke="#34d399" strokeWidth="1.8" strokeLinecap="round"/>
            <path d="M20 26 Q13 21 10 13 Q17 12 20 20" fill="#34d399" opacity="0.75"/>
            <path d="M20 23 Q27 18 30 10 Q23 9 20 17" fill="#34d399" opacity="0.55"/>
            <path d="M29 30 L29.7 32.8 L33 33.5 L29.7 34.2 L29 37 L28.3 34.2 L25 33.5 L28.3 32.8Z" fill="#38bdf8" opacity="0.9"/>
            <path d="M10 26 L10.5 28 L13 28.5 L10.5 29 L10 31 L9.5 29 L7 28.5 L9.5 28Z" fill="#06b6d4" opacity="0.7"/>
            <rect x="14" y="34" width="12" height="4.5" rx="2.25" fill="#34d399" opacity="0.2"/>
            <rect x="14" y="34" width="12" height="4.5" rx="2.25" stroke="#34d399" strokeWidth="1"/>
          </svg>
        </div>
        <h3 className="text-lg font-bold text-slate-900 mb-2">好きが見える</h3>
        <p className="text-sm text-slate-600 leading-relaxed">
          記録がたまるほど、子どもの好きな遊びや成長の変化が見えてきます。
        </p>
      </div>
    </div>
  </div>
</section>
```

---

## [B] ヒーロー右カラム記録モック — 内容を具体化

現在のモックUI（`bg-white/15 backdrop-blur-sm` カード）の内部 JSX を以下で置き換える。

```tsx
<div className="w-full max-w-xs bg-white/15 backdrop-blur-sm rounded-3xl p-5 border border-white/25 shadow-2xl text-white">
  {/* モックヘッダー */}
  <p className="text-xs font-semibold opacity-70 mb-4 flex items-center gap-1">
    <span aria-hidden>📱</span> おでかけ記録プレビュー
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
    <p className="font-semibold text-sm mb-0.5">よこはまこどもの国</p>
    <p className="text-xs opacity-70 mb-2">ゆいちゃん(7歳) · 2日前</p>
    {/* 満足度 */}
    <div className="flex items-center gap-1 mb-2">
      <span className="text-xs opacity-70">満足度</span>
      <span className="text-yellow-300 text-xs">★★★★</span><span className="text-white/40 text-xs">★</span>
    </div>
    {/* 反応タグ */}
    <div className="flex flex-wrap gap-1">
      <span className="text-xs bg-white/30 rounded-full px-2 py-0.5">😊 たのしかった</span>
      <span className="text-xs bg-white/30 rounded-full px-2 py-0.5">🔥 また行きたい</span>
    </div>
  </div>

  {/* 好きな遊びの傾向 */}
  <div className="bg-white/20 rounded-xl p-3">
    <p className="text-xs opacity-70 mb-2">✨ ゆいちゃんの好き</p>
    <div className="flex flex-wrap gap-1">
      {["🐾 動物", "🛝 遊具", "💧 水遊び", "🌲 自然"].map((tag) => (
        <span key={tag} className="text-xs bg-white/30 rounded-full px-2 py-0.5">{tag}</span>
      ))}
    </div>
    <p className="text-[10px] opacity-60 mt-2">12回の記録から</p>
  </div>
</div>
```

---

## [C] ヒーロー背景 — 世界観装飾（軽め）

ヒーロー `<section>` の `<div className="absolute inset-0 bg-[radial-gradient...">` の直後に追加:

```tsx
{/* 世界観装飾レイヤー */}
<div className="absolute inset-0 pointer-events-none overflow-hidden select-none" aria-hidden>
  <svg className="absolute inset-0 w-full h-full opacity-[0.12]" viewBox="0 0 1200 600" fill="none" preserveAspectRatio="xMidYMid slice">
    {/* ルート点線 */}
    <path d="M0 500 Q200 420 400 380 Q600 340 800 400 Q1000 460 1200 380" stroke="white" strokeWidth="2" strokeDasharray="6 10" fill="none"/>
    {/* 地図ピン */}
    <path d="M180 120 C175 120 170 125 170 131 C170 138 180 150 180 150 S190 138 190 131 C190 125 185 120 180 120Z" fill="white"/>
    <circle cx="180" cy="131" r="3.5" fill="white" opacity="0.4"/>
    <path d="M950 200 C945 200 940 205 940 211 C940 218 950 230 950 230 S960 218 960 211 C960 205 955 200 950 200Z" fill="white"/>
    <circle cx="950" cy="211" r="3.5" fill="white" opacity="0.4"/>
    <path d="M600 80 C596 80 592 84 592 89 C592 95 600 104 600 104 S608 95 608 89 C608 84 604 80 600 80Z" fill="white"/>
    <circle cx="600" cy="89" r="3" fill="white" opacity="0.4"/>
    {/* きらめき */}
    <path d="M100 300 L101.5 306 L108 307.5 L101.5 309 L100 315 L98.5 309 L92 307.5 L98.5 306Z" fill="white"/>
    <path d="M1100 150 L1101 155 L1106 155.5 L1101 156.5 L1100 162 L1099 156.5 L1094 155.5 L1099 155Z" fill="white"/>
    <path d="M400 50 L401 54 L405 54.5 L401 55.5 L400 60 L399 55.5 L395 54.5 L399 54Z" fill="white"/>
    {/* 足あと */}
    <ellipse cx="300" cy="480" rx="7" ry="4.5" transform="rotate(-25 300 480)" fill="white"/>
    <ellipse cx="318" cy="490" rx="7" ry="4.5" transform="rotate(-25 318 490)" fill="white"/>
    <ellipse cx="850" cy="520" rx="6" ry="4" transform="rotate(20 850 520)" fill="white"/>
    <ellipse cx="866" cy="510" rx="6" ry="4" transform="rotate(20 866 510)" fill="white"/>
  </svg>
</div>
```

---

## 完了条件

- [ ] 使い方セクションが STEP 01/02/03 の3カードに変わっている
- [ ] 各カードにカスタムSVGアイコン・STEP番号・タイトル・説明文がある
- [ ] カード間の接続線がデスクトップで見える
- [ ] 背景の点線ルート・ピン・きらめきが薄く見える（over-decorationになっていない）
- [ ] ヒーロー右モックに満足度・タグ・「何回の記録から」が表示されている
- [ ] ヒーロー背景に装飾レイヤーが入っている（薄く、主役を邪魔しない）
- [ ] `npm run lint` / `npx tsc --noEmit` / `npm run build` が通る
- [ ] `npx vercel --prod --yes --token <TOKEN>` でデプロイ
- [ ] agmsg で memorips チームの memorips-claude に GO + commit hash を送ること
