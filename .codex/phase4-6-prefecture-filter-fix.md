# Phase 4-6: prefecture フィルター整合性修正

> 作成: 2026-06-10 / Claude Code PM

---

## 背景と問題

`/facilities?recommended_tag=animal&prefecture=埼玉県`（上部ボタン選択後）にサイドバーから
別県（栃木県など）を選ぶと、URL に `prefecture=埼玉県` と `prefectures=tochigi` の両方が入り、
AND 条件になって 0 件になる。

### 現状のパラメータ構造

| パラメータ | 型 | 出所 |
|---|---|---|
| `prefecture` | 単一県名（例: `prefecture=埼玉県`） | 上部都道府県ボタン（Phase 4-4 追加） |
| `prefectures` | カンマ区切りID（例: `prefectures=chiba,saitama`） | サイドバーチェックボックス |

### フィルターの二段構造（バグの原因）

1. `applyFilters(facilities, filters)` → `prefectures`（ID）で絞り込む
2. `page.tsx` の `results` フィルター → `prefecture`（名前）でさらに絞り込む

両方が存在すると AND 条件 → 0 件になる。

---

## 確定仕様

### 上部都道府県ボタン（変更なし）

- 単一選択ショートカット
- クリックすると `buildPrefectureHref` が `recommended_tag + prefecture` のみの新規 URL を生成
  （既存の `prefectures` はクリアされる ← これは現状のままで OK）

### サイドバーの都道府県チェックリスト（修正対象）

- 複数選択を維持
- **バグ修正**: サイドバーで県をチェックしたとき、`prefecture`（上部ボタン由来）が残っていたら
  `prefectures` に吸収してから `prefecture` を削除する

### 見出し（修正対象）

| 選択状態 | 見出し例 |
|---|---|
| 0県 + recommended_tag あり | `動物が好きな子におすすめの施設` |
| 1県 + recommended_tag あり | `千葉県の動物が好きな子におすすめの施設` |
| 複数県 + recommended_tag あり | `選択したエリアの動物が好きな子におすすめの施設` |

---

## 修正ファイルと内容

### ファイル 1: `components/FilterSidebar.tsx`

#### 修正 1-A: `togglePrefecture` 関数を追加

既存の `toggleList` 関数の後（`setFee` の前）に以下を追加：

```ts
function togglePrefecture(prefId: string) {
  const params = new URLSearchParams(searchParams);
  // prefecture（上部ボタン由来の単一県名）が残っていたら prefectures に吸収して削除
  const singlePref = params.get("prefecture");
  if (singlePref) {
    const match = prefectures.find((p) => p.name === singlePref);
    const existing = (params.get("prefectures") ?? "")
      .split(",")
      .filter(Boolean);
    const merged =
      match && !existing.includes(match.id)
        ? [...existing, match.id]
        : existing;
    if (merged.length) params.set("prefectures", merged.join(","));
    params.delete("prefecture");
  }
  // 新たにチェックした prefecture を toggle
  const list = (params.get("prefectures") ?? "").split(",").filter(Boolean);
  const next = list.includes(prefId)
    ? list.filter((v) => v !== prefId)
    : [...list, prefId];
  if (next.length) params.set("prefectures", next.join(","));
  else params.delete("prefectures");
  update(params);
}
```

#### 修正 1-B: 都道府県チェックボックスの `onChange` を変更

```tsx
// Before:
onChange={() => toggleList("prefectures", p.id)}

// After:
onChange={() => togglePrefecture(p.id)}
```

#### 修正 1-C: サイドバー summary のラベルに `prefecture`（単一）を反映

```ts
// Before:
const selectedPrefectureLabel =
  prefList.length > 0
    ? prefectures
        .filter((p) => prefList.includes(p.id))
        .map((p) => p.name)
        .join("・")
    : "すべて";

// After:
const singlePref = searchParams.get("prefecture");
const selectedPrefectureLabel =
  prefList.length > 0
    ? prefectures
        .filter((p) => prefList.includes(p.id))
        .map((p) => p.name)
        .join("・")
    : singlePref || "すべて";
```

---

### ファイル 2: `app/facilities/page.tsx`

#### 修正 2-A: サイドバー prefectures を名前リストに変換して見出しを多県対応にする

`prefectureParam` / `selectedPrefecture` を決定している行の **直後** に以下を追加：

```ts
// サイドバー prefectures（ID）→ 名前リストに変換
const sidebarPrefString = asSingleParam(sp.prefectures);
const sidebarPrefIds = sidebarPrefString
  ? sidebarPrefString.split(",").filter(Boolean)
  : [];
const sidebarPrefNames = sidebarPrefIds
  .map((id) => prefectures.find((p) => p.id === id)?.name)
  .filter((n): n is string => Boolean(n));

// 統合した選択県リスト
const allSelectedPrefNames =
  selectedPrefecture !== "全国"
    ? [selectedPrefecture, ...sidebarPrefNames]
    : sidebarPrefNames;
```

#### 修正 2-B: `headline` を多県対応に変更

```ts
// Before:
const headline = recommendedTag
  ? selectedPrefecture !== "全国"
    ? `${selectedPrefecture}の${RECOMMENDED_FOR_TAG_HEADLINE[recommendedTag]}`
    : RECOMMENDED_FOR_TAG_HEADLINE[recommendedTag]
  : null;

// After:
const headline = recommendedTag
  ? allSelectedPrefNames.length === 1
    ? `${allSelectedPrefNames[0]}の${RECOMMENDED_FOR_TAG_HEADLINE[recommendedTag]}`
    : allSelectedPrefNames.length > 1
    ? `選択したエリアの${RECOMMENDED_FOR_TAG_HEADLINE[recommendedTag]}`
    : RECOMMENDED_FOR_TAG_HEADLINE[recommendedTag]
  : null;
```

#### 修正 2-C: `results` フィルターを統合リスト（OR）に変更

```ts
// Before:
const results =
  selectedPrefecture !== "全国"
    ? tagFilteredResults.filter((f) => f.prefecture === selectedPrefecture)
    : tagFilteredResults;

// After:
const results =
  allSelectedPrefNames.length > 0
    ? tagFilteredResults.filter((f) =>
        allSelectedPrefNames.includes(f.prefecture ?? ""),
      )
    : tagFilteredResults;
```

**注意**: この修正により `applyFilters` の `prefectures`（ID）フィルターと `results` の名前フィルターが
「サイドバー使用時」に二重になるが、同一施設を対象にするため AND になっても結果は変わらない。
将来的には `applyFilters` から `prefectures` フィルターを除いて一本化が望ましいが、今回は対象外。

#### 修正 2-D: `active` フラグに `allSelectedPrefNames` を反映

```ts
// Before:
const active =
  hasActiveFilters(filters) ||
  recommendedTag !== null ||
  selectedPrefecture !== "全国";

// After:
const active =
  hasActiveFilters(filters) ||
  recommendedTag !== null ||
  allSelectedPrefNames.length > 0;
```

---

## 確認ケース

以下の4ケースすべてで整合した結果になること：

### ケース 1
URL: `?recommended_tag=animal&prefecture=千葉県`
- 見出し: 「千葉県の動物が好きな子におすすめの施設」
- 上部ボタン「千葉県」がハイライト
- 適用中: 動物 × 📍千葉県
- サイドバー summary: 「千葉県」

### ケース 2（ケース1の状態からサイドバーで埼玉県を追加）
URL: `?recommended_tag=animal&prefectures=chiba,saitama`
- 見出し: 「選択したエリアの動物が好きな子におすすめの施設」
- 上部ボタンはどれもハイライトなし
- 適用中: 動物 × 📍千葉県 × 📍埼玉県
- 結果: 千葉県 **または** 埼玉県の animal 施設（OR）
- 0件にならない

### ケース 3（ケース2の状態から上部「東京都」ボタンを押す）
URL: `?recommended_tag=animal&prefecture=東京都`（`prefectures` はクリア）
- 見出し: 「東京都の動物が好きな子におすすめの施設」
- 適用中: 動物 × 📍東京都

### ケース 4
URL: `?recommended_tag=animal&prefecture=埼玉県` からサイドバー「栃木県」をチェック
URL: `?recommended_tag=animal&prefectures=saitama,tochigi`
- 0件にならない
- 見出し: 「選択したエリアの動物が好きな子におすすめの施設」

---

## 完了条件

- [ ] 上記4ケースすべてで整合した見出し・チップ・結果が出る
- [ ] 上部ボタン経由 → サイドバー追加で 0 件にならない
- [ ] `npm run lint` / `npx tsc --noEmit` / `npm run build` が通る
- [ ] `npx vercel --prod --yes --token <VERCEL_TOKEN>` でデプロイ（token は `C:\Users\tomo-\.codex\.sandbox-secrets\vercel.json`）
- [ ] agmsg で memorips チームの memorips-claude に GO 報告 + commit hash を送ること
