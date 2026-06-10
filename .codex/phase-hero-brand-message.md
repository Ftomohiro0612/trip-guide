# トップページ ヒーローセクション ブランドメッセージ変更

> 作成: 2026-06-10 / Claude Code PM

---

## 目的

施設検索サイトから「おでかけ記録サービス（メモリップ）」としての価値を伝えるよう、
トップページ（`app/page.tsx`）のファーストビューの文言を調整する。

**大きなUI改修は行わない。文言の変更のみ。**

---

## 変更対象: `app/page.tsx`

### 変更 1: ヒーローセクション上部の施設数・エリア表示

```tsx
// Before:
<p className="text-sm sm:text-base font-medium opacity-90 mb-3">
  🗻 静岡 · 🏔️ 長野 · 🍇 山梨 / 全 {facilities.length} 施設
</p>

// After:
<p className="text-sm sm:text-base font-medium opacity-90 mb-3">
  関東甲信越9県 · {facilities.length}施設の子供向け遊び場
</p>
```

### 変更 2: h1 メインコピー

```tsx
// Before:
<h1 className="text-3xl sm:text-5xl font-bold leading-tight tracking-tight mb-4 drop-shadow-sm">
  子供が楽しめる遊び場が、
  <br className="hidden sm:block" />
  すぐ見つかる！
</h1>

// After:
<h1 className="text-3xl sm:text-5xl font-bold leading-tight tracking-tight mb-4 drop-shadow-sm">
  子どもの
  <wbr />
  <span className="inline">"好き"</span>
  が見える、
  <br className="hidden sm:block" />
  おでかけ記録サービス
</h1>
```

### 変更 3: サブコピー

```tsx
// Before:
<p className="text-base sm:text-lg opacity-95 mb-8 max-w-2xl mx-auto">
  「今日どこ行く？」を3秒で解決。雨の日も、無料も、年齢別も、ここから。
</p>

// After:
<p className="text-base sm:text-lg opacity-95 mb-8 max-w-2xl mx-auto">
  遊び場を探して、行きたい場所を保存。<br className="hidden sm:block" />
  行ったあとは、子どもの反応やまた行きたい場所を記録できます。
</p>
```

### 変更 4: 検索フォームの上にラベルを追加

検索フォームの直前（`<form action="/facilities"...>` の前）にラベルを追加する：

```tsx
// 追加（form タグの直前に挿入）:
<p className="text-sm opacity-80 mb-2 font-medium">
  まずは遊び場を探す ↓
</p>
```

---

## 変更しないこと

- `app/layout.tsx` や各ページの `metadata`（title・description）は変更しない
- ヒーロー以降のセクション（地図・クイックフィルター・エリア・カテゴリ・ピックアップ）は変更しない
- ヘッダーコンポーネントは変更しない
- 既存の検索・フィルター・導線ロジックは変更しない

---

## 完了条件

- [ ] ファーストビューのコピーが指定どおり変更されている
- [ ] 施設数・エリア表示が「関東甲信越9県」になっている
- [ ] 「まずは遊び場を探す」ラベルが検索フォーム上部に表示される
- [ ] ヒーロー以降のセクションに変更がない
- [ ] `npm run lint` / `npx tsc --noEmit` / `npm run build` が通る
- [ ] `npx vercel --prod --yes --token <TOKEN>` でデプロイ（token は `C:\Users\tomo-\.codex\.sandbox-secrets\vercel.json`）
- [ ] agmsg で memorips チームの memorips-claude に GO 報告 + commit hash を送ること
