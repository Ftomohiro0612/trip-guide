# Phase 4-4: recommended_for_tags チップのクリック化 & タグ+都道府県フィルター

> 作成: 2026-06-10 / Claude Code PM

---

## 現在の実装状況（コミット前・作業途中）

以下はすでに実装済み（未コミット）。**変更不要**。

| ファイル | 内容 |
|---------|------|
| `types/facility.ts` | `RecommendedForTag` 型追加、`Facility.recommended_for_tags` フィールド追加 |
| `lib/recommended-tags.ts` | `RECOMMENDED_FOR_TAG_META`（ラベル・アイコン）、`getRecommendedForTagMeta()` |
| `components/FacilityCard.tsx` | チップ表示（最大3件）追加済み。ただし `<span>` のためクリック不可 |
| `app/facilities/[slug]/page.tsx` | 「こんな子におすすめ 🎯」セクション追加済み。ただし `<span>` のためクリック不可 |
| `data/facilities_data.json` | `recommended_for_tags` 追加済み（全1032件） |

---

## このフェーズでやること

### タスク 1: 見出し変更

`app/facilities/[slug]/page.tsx` の見出しを変更する。

```diff
- こんな子におすすめ 🎯
+ こんな遊びが好きな子に 🎯
```

---

### タスク 2: チップをクリック可能にする

#### FacilityCard.tsx（施設カード）

チップの `<span>` を `<Link>` に変更する。

```tsx
// 変更前
<span key={tag} className="text-xs px-2 py-0.5 bg-sky-100 text-sky-700 rounded-full">
  <span aria-hidden>{meta.icon}</span> {meta.label}
</span>

// 変更後
<Link
  key={tag}
  href={`/facilities?recommended_tag=${tag}`}
  onClick={(e) => e.stopPropagation()}
  className="text-xs px-2 py-0.5 bg-sky-100 text-sky-700 rounded-full hover:bg-sky-200 transition-colors cursor-pointer"
>
  <span aria-hidden>{meta.icon}</span> {meta.label}
</Link>
```

- `onClick e.stopPropagation()` を必ず付けること（カード全体がLinkなので親への伝播を防ぐ）

#### app/facilities/[slug]/page.tsx（施設詳細ページ）

施設詳細ページのチップは **都道府県も引き継ぐ**。

```tsx
// facility.prefecture を使って都道府県を引き継ぐ
const prefecture = facility.prefecture ?? "";

// チップのリンク
<Link
  key={tag}
  href={`/facilities?recommended_tag=${tag}&prefecture=${encodeURIComponent(prefecture)}`}
  className="text-sm px-3 py-1.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200 font-medium hover:bg-sky-100 transition-colors"
>
  <span aria-hidden>{meta.icon}</span> {meta.label}
</Link>
```

---

### タスク 3: 施設一覧ページ (/facilities) にフィルター追加

#### 3-1: タグラベルマップを lib/recommended-tags.ts に追加

```ts
// 一覧ページの見出し用マップ
export const RECOMMENDED_FOR_TAG_HEADLINE: Record<RecommendedForTag, string> = {
  animal: "動物が好きな子におすすめの施設",
  animal_contact: "動物とふれあいたい子におすすめの施設",
  animal_feed: "動物にエサをあげたい子におすすめの施設",
  water_play: "水遊びが好きな子におすすめの施設",
  pool: "プールで遊びたい子におすすめの施設",
  playground: "遊具で遊ぶのが好きな子におすすめの施設",
  athletic: "アスレチックが好きな子におすすめの施設",
  slide: "すべり台が好きな子におすすめの施設",
  running: "走り回るのが好きな子におすすめの施設",
  wide_space: "広い場所が好きな子におすすめの施設",
  vehicle: "乗り物が好きな子におすすめの施設",
  craft: "工作・ものづくりが好きな子におすすめの施設",
  experience: "体験・農業に興味がある子におすすめの施設",
  exhibition: "展示・見学が好きな子におすすめの施設",
  science: "科学・実験が好きな子におすすめの施設",
  dinosaur: "恐竜が好きな子におすすめの施設",
  character: "キャラクターが好きな子におすすめの施設",
  nature: "自然が好きな子におすすめの施設",
  food: "食べ物・収穫体験が好きな子におすすめの施設",
};
```

#### 3-2: 一覧ページのフィルターロジック

既存の `/facilities` ページ（`app/facilities/page.tsx` など）に以下を追加する。

**クエリパラメータ**:
- `recommended_tag`: タグキー（例: `water_play`）
- `prefecture`: 都道府県名（例: `山梨県`）。なし = 全国

**フィルタリングロジック**:
```ts
// recommended_tag が指定されていれば、そのタグを持つ施設のみ表示
let filtered = facilities;
if (recommendedTag) {
  filtered = filtered.filter(f =>
    (f.recommended_for_tags ?? []).includes(recommendedTag as RecommendedForTag)
  );
}
if (prefecture && prefecture !== "全国") {
  filtered = filtered.filter(f => f.prefecture === prefecture);
}
```

**見出し**:
```ts
// recommended_tag が指定されている場合のみ見出しを表示
const tagHeadline = recommendedTag
  ? RECOMMENDED_FOR_TAG_META[recommendedTag as RecommendedForTag]
  : null;

const headline = tagHeadline
  ? prefecture && prefecture !== "全国"
    ? `${prefecture}の${tagHeadline.headline}`
    : tagHeadline.headline
  : null;
```

#### 3-3: 都道府県フィルターUI

`recommended_tag` が指定されている場合のみ都道府県フィルターを表示する。

**都道府県リスト**:
```ts
const PREFECTURES = ["全国", "東京都", "神奈川県", "千葉県", "埼玉県", "静岡県", "山梨県", "長野県", "栃木県", "新潟県"];
```

**UI**:
- ボタン形式（横スクロール可能なタグ列）
- 選択中: `bg-sky-600 text-white`
- 非選択: `bg-slate-100 text-slate-700 hover:bg-slate-200`
- クリックで URL クエリの `prefecture` を更新（`recommended_tag` は維持）

---

## 完了条件

- [ ] 見出しが「こんな遊びが好きな子に 🎯」に変わっていること
- [ ] 施設カードのチップクリックで `/facilities?recommended_tag=xxx` に遷移すること
- [ ] 施設詳細ページのチップクリックで `/facilities?recommended_tag=xxx&prefecture=山梨県` に遷移すること
- [ ] 一覧ページでタグフィルターが動くこと
- [ ] 都道府県フィルターUIが表示・切り替えできること
- [ ] 見出しが「山梨県の水遊びが好きな子におすすめの施設」のように動的に変わること
- [ ] `npm run lint` / `npx tsc --noEmit` / `npm run build` が通ること
- [ ] ローカルで動作確認後、agmsg で memorips-claude に GO 報告すること
