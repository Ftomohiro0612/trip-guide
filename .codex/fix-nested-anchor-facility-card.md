# FacilityCard ネストアンカー修正

> 作成: 2026-06-10 / Claude Code PM

---

## バグ

`components/FacilityCard.tsx` で `<Link>` (カード全体) の中に `<Link>` (タグチップ) が入れ子になっており、
`<a>` の入れ子という無効な HTML 構造になっている。

```
<Link href="/facilities/facility-xxx">  ← カード外枠（line 24）
  ...
  <Link href="/facilities?recommended_tag=animal">  ← チップ（line 84）
  </Link>
  ...
</Link>
```

ブラウザは `<a>` の入れ子をパースできず、React の hydration error を引き起こす可能性がある。

---

## 修正方針

タグチップの `<Link>` を **`<button>` + `useRouter().push()`** に変換する。

`e.stopPropagation()` は引き続き使用してカードクリックとの競合を防ぐ。

ただし `FacilityCard` は `"use client"` かどうか確認すること。
もし Server Component であれば `"use client"` を追加するか、
別のクライアントコンポーネント `TagChip.tsx` を切り出すかを判断して実装すること。

---

## 修正内容: `components/FacilityCard.tsx`

### 変更 A: `"use client"` の確認・追加

ファイル先頭に `"use client"` がなければ追加する。
`useRouter` を使うため Client Component が必要。

### 変更 B: imports に `useRouter` を追加

```tsx
import { useRouter } from "next/navigation";
```

### 変更 C: コンポーネント内で `router` を取得

```tsx
const router = useRouter();
```

### 変更 D: タグチップを `<button>` に変更

```tsx
// Before:
<Link
  key={tag}
  href={`/facilities?recommended_tag=${tag}`}
  onClick={(e) => e.stopPropagation()}
  className="text-xs px-2 py-0.5 bg-sky-100 text-sky-700 rounded-full hover:bg-sky-200 transition-colors cursor-pointer"
>
  <span aria-hidden>{meta.icon}</span> {meta.label}
</Link>

// After:
<button
  key={tag}
  type="button"
  onClick={(e) => {
    e.preventDefault();
    e.stopPropagation();
    router.push(`/facilities?recommended_tag=${tag}`);
  }}
  className="text-xs px-2 py-0.5 bg-sky-100 text-sky-700 rounded-full hover:bg-sky-200 transition-colors cursor-pointer"
>
  <span aria-hidden>{meta.icon}</span> {meta.label}
</button>
```

---

## 注意

- カード全体の `<Link>` (line 24) はそのまま維持する
- `app/facilities/[slug]/page.tsx` の詳細ページチップは `<Link>` であっても問題ない（カード外なので入れ子ではない）
- `MobileFilterBar` など他のコンポーネントに同様のパターンがないか確認すること

---

## 完了条件

- [ ] `FacilityCard` のタグチップが `<button>` になっており、クリックで `/facilities?recommended_tag=...` に遷移する
- [ ] カードクリックとチップクリックが独立して動作する（stopPropagation が効いている）
- [ ] HTML バリデーションで `<a>` の入れ子がない
- [ ] `npm run lint` / `npx tsc --noEmit` / `npm run build` が通る
- [ ] `npx vercel --prod --yes --token <TOKEN>` でデプロイ（token は `C:\Users\tomo-\.codex\.sandbox-secrets\vercel.json`）
- [ ] agmsg で memorips チームの memorips-claude に GO 報告 + commit hash を送ること
