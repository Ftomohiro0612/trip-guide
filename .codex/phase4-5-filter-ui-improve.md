# Phase 4-5: フィルターUI改善

> 作成: 2026-06-10 / Claude Code PM

---

## 現状の構造（重要）

`/facilities` ページには2種類のフィルターパラメータが共存している。混同しないこと。

| パラメータ | 型 | 例 | 管理場所 |
|---|---|---|---|
| `prefectures` | 複数選択（カンマ区切り） | `?prefectures=tokyo,kanagawa` | FilterSidebar（既存） |
| `prefecture` | 単一（都道府県名） | `?prefecture=長野県` | ページ上部の都道府県ボタン列（Phase 4-4 追加） |
| `recommended_tag` | 単一 | `?recommended_tag=animal` | ページ上部の都道府県ボタン列（Phase 4-4 追加） |

既存の `ActiveFilterChips` は `prefectures`（複数）を処理するが、`recommended_tag` と `prefecture`（単一）を処理していない。

---

## タスク一覧

### タスク 1: `ActiveFilterChips` を拡張

`components/ActiveFilterChips.tsx` に `recommended_tag` と `prefecture`（単一）の chip を追加する。

`RECOMMENDED_FOR_TAG_HEADLINE` を import して、`recommended_tag` のラベル表示に使う。

追加する chip ロジック：

```tsx
import { RECOMMENDED_FOR_TAG_META } from "@/lib/recommended-tags";
import type { RecommendedForTag } from "@/types/facility";

// recommended_tag chip
const recommendedTag = searchParams.get("recommended_tag");
if (recommendedTag && recommendedTag in RECOMMENDED_FOR_TAG_META) {
  const meta = RECOMMENDED_FOR_TAG_META[recommendedTag as RecommendedForTag];
  chips.push({
    key: "recommended_tag",
    label: `${meta.icon} ${meta.label}`,
    onRemove: () => {
      const params = new URLSearchParams(searchParams);
      params.delete("recommended_tag");
      params.delete("prefecture"); // tag解除時にprefectureも解除
      update(params);
    },
  });
}

// prefecture (単一) chip — recommended_tag が指定されているときのみ表示
const prefecture = searchParams.get("prefecture");
if (prefecture && recommendedTag) {
  chips.push({
    key: "prefecture_tag",
    label: `📍 ${prefecture}`,
    onRemove: () => {
      const params = new URLSearchParams(searchParams);
      params.delete("prefecture");
      update(params);
    },
  });
}
```

chip 表示位置: 既存の chips 配列の先頭に push する（`prefList` 処理の前）。

---

### タスク 2: `FilterSidebar` に「おすすめタイプ」セクション追加

`components/FilterSidebar.tsx` に折りたたみ式の「おすすめタイプ」セクションを追加。

```tsx
import { RECOMMENDED_FOR_TAG_META, type RecommendedForTag } from "@/lib/recommended-tags";

// 既存の RECOMMENDED_FOR_TAG_META から全タグのリストを生成
const RECOMMENDED_TAG_OPTIONS = Object.entries(RECOMMENDED_FOR_TAG_META).map(
  ([key, meta]) => ({ value: key as RecommendedForTag, label: `${meta.icon} ${meta.label}` })
);
```

フィルター操作ロジック：
- `recommended_tag` は単一選択（`toggleRecommendedTag` を実装）
- 選択時: `params.set("recommended_tag", value)` し `params.delete("prefecture")`（都道府県はリセット）
- 解除時: `params.delete("recommended_tag")` し `params.delete("prefecture")`

UIデザイン（既存のカテゴリセクションに合わせる）：
```tsx
{/* おすすめタイプ */}
<details open className="border-b border-slate-200 py-3">
  <summary className="cursor-pointer text-sm font-semibold text-slate-800 flex items-center justify-between select-none">
    おすすめタイプ
    <span className="text-slate-400 text-xs">▼</span>
  </summary>
  <div className="mt-2 grid grid-cols-2 gap-1">
    {RECOMMENDED_TAG_OPTIONS.map(({ value, label }) => {
      const isActive = searchParams.get("recommended_tag") === value;
      return (
        <button
          key={value}
          type="button"
          onClick={() => toggleRecommendedTag(value)}
          className={`text-left text-xs rounded-lg px-2 py-1.5 transition-colors ${
            isActive
              ? "bg-sky-100 text-sky-700 font-medium"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          {label}
        </button>
      );
    })}
  </div>
</details>
```

セクションの挿入位置: カテゴリセクションの直前。

---

### タスク 3: FilterSidebar の都道府県を折りたたみ式チェックボックスに変更

**重要**: 複数選択機能は維持する。`prefectures`（複数パラメータ）のUI変更のみ。`prefecture`（単一、recommended_tag用）とは別物。

現状の都道府県チェックボックスリスト（常時全件表示）を `<details>` で折りたたみ、コンパクトにする。

UIデザイン：
```tsx
{/* エリア */}
{(() => {
  const selectedPrefs = getList("prefectures");
  const summaryLabel = selectedPrefs.length > 0
    ? prefectures
        .filter(p => selectedPrefs.includes(p.id))
        .map(p => p.name)
        .join("・")
    : "すべて";
  return (
    <details className="border-b border-slate-200 py-3">
      <summary className="cursor-pointer text-sm font-semibold text-slate-800 flex items-center justify-between select-none list-none">
        <span>エリア</span>
        <span className="text-xs text-slate-500 font-normal truncate max-w-[120px] ml-2">
          {summaryLabel}
        </span>
      </summary>
      <div className="mt-2 space-y-1 max-h-48 overflow-y-auto pr-1">
        {prefectures.map((p) => {
          const checked = selectedPrefs.includes(p.id);
          return (
            <label key={p.id} className="flex items-center gap-2 cursor-pointer group">
              <input
                type="checkbox"
                checked={checked}
                onChange={() => toggleList("prefectures", p.id)}
                className="rounded border-slate-300 text-sky-600 focus:ring-sky-400"
              />
              <span className={`text-sm transition-colors ${checked ? "text-sky-700 font-medium" : "text-slate-600 group-hover:text-slate-900"}`}>
                {p.name}
              </span>
            </label>
          );
        })}
      </div>
    </details>
  );
})()}
```

ポイント：
- `<details>` 初期状態は閉じた状態（`open` 属性なし）
- summary に選択中の都道府県名をプレビュー表示（未選択時は「すべて」）
- チェックボックスのロジックは既存の `toggleList("prefectures", p.id)` をそのまま使う
- 複数選択はそのまま維持（`prefectures` は配列）

---

### タスク 4: 施設詳細ページにテキストリンクを追加

`app/facilities/[slug]/page.tsx` の「こんな遊びが好きな子に 🎯」セクション内、タグチップの直下にテキストリンクを追加。

**表示条件**: `facility.recommended_for_tags` が存在し、1件以上ある場合。
**表示件数**: 最大3件（先頭から）。

```tsx
// facility.prefecture を取得（既にある想定）
const prefecture = facility.prefecture ?? "";

// テキストリンクエリア
<div className="mt-3 flex flex-wrap gap-2">
  {(facility.recommended_for_tags ?? []).slice(0, 3).map((tag) => {
    const meta = getRecommendedForTagMeta(tag);
    if (!meta) return null;
    const href = prefecture
      ? `/facilities?recommended_tag=${tag}&prefecture=${encodeURIComponent(prefecture)}`
      : `/facilities?recommended_tag=${tag}`;
    return (
      <Link
        key={tag}
        href={href}
        className="text-xs text-sky-600 hover:text-sky-800 hover:underline"
      >
        {prefecture ? `${prefecture}の${meta.label}が好きな子におすすめの施設をもっと見る` : `${meta.label}が好きな子におすすめの施設をもっと見る`} →
      </Link>
    );
  })}
</div>
```

タグチップ（既存の `<div className="flex flex-wrap gap-2">` ブロック）の直後に挿入する。

---

## 完了条件

- [ ] 施設一覧ページで `recommended_tag=animal` でアクセスすると `ActiveFilterChips` に「🐄 動物」のチップが表示される
- [ ] そのチップの × をクリックすると `recommended_tag` が解除される
- [ ] `prefecture=長野県` も一緒に指定されている場合、「📍 長野県」チップも表示される
- [ ] FilterSidebar の「おすすめタイプ」セクションでタグを選ぶと絞り込まれる
- [ ] FilterSidebar の都道府県がドロップダウン形式になっている
- [ ] 施設詳細ページのタグチップ下にテキストリンクが表示される
- [ ] `npm run lint` / `npx tsc --noEmit` / `npm run build` が通る
- [ ] agmsg で memorips-claude に GO 報告すること
