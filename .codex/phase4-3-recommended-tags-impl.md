# Phase 4-3: recommended_for_tags データ反映 & UI 実装

> 作成: 2026-06-10 / Claude Code PM

---

## 背景

全1032施設に `recommended_for_tags` を AI タグ付けし、Codex レビューで GO が出た。
このフェーズでは以下を実施する。

1. **Migration 006**: `reaction_tags` テーブルへ `pool` キーを追加
2. **facilities_data.json 更新**: 各施設に `recommended_for_tags` フィールドを追加
3. **施設カード UI**: 「こんな子におすすめ」タグ表示を追加

---

## タスク 1: Migration 006 — reaction_tags に pool を追加

### 前提確認
`reaction_tags` テーブルの現在の構造（Migration 005 で作成済み）を確認してから実行すること。

### やること
`reaction_tags` テーブルに `pool` キーを追加する。

```sql
-- 既存の display_order の最大値 + 1 で追加（構造に合わせて調整）
INSERT INTO reaction_tags (key, label_ja, label_en, icon, display_order)
VALUES ('pool', 'プール', 'Pool', '🏊', <既存の最大display_order + 1>);
```

- `reaction_tags` テーブルの全カラム名・型を確認してから SQL を書くこと
- display_order は既存最大値の次にすること
- Migration ファイル名: `006_add_pool_reaction_tag.sql`

---

## タスク 2: facilities_data.json への recommended_for_tags 追加

### 入力ファイル
- `data/facilities_data.json` (1032施設の元データ)
- `.codex/all_tagged_facilities.json` (タグ付け結果・GO確認済み)

### やること
Python スクリプトで `facilities_data.json` の各施設に `recommended_for_tags` フィールドを追加する。

```python
import json

with open('data/facilities_data.json', 'r', encoding='utf-8') as f:
    fdata = json.load(f)

with open('.codex/all_tagged_facilities.json', 'r', encoding='utf-8') as f:
    tagged = json.load(f)

tag_map = {t['facility_id']: t['recommended_for_tags'] for t in tagged}

for facility in fdata['facilities']:
    fid = str(facility['id'])
    facility['recommended_for_tags'] = tag_map.get(fid, [])

with open('data/facilities_data.json', 'w', encoding='utf-8') as f:
    json.dump(fdata, f, ensure_ascii=False, indent=2)

print(f"完了: {len(fdata['facilities'])} 件更新")
```

### 検証
- `facilities_data.json` の全施設に `recommended_for_tags` が追加されていること
- 空配列になっている施設が 0 件であること（`.codex/all_tagged_facilities.json` では全件タグあり）
- `data/facilities_data.json` と `.codex/all_tagged_facilities.json` の件数が一致すること

---

## タスク 3: 施設カード UI — 「こんな子におすすめ」タグ表示

### 使用するタグキー（19個）

```
animal / animal_contact / animal_feed / water_play / pool /
playground / athletic / slide / running / wide_space /
vehicle / craft / experience / exhibition / science /
dinosaur / character / nature / food
```

### タグの日本語ラベルとアイコン

| key | 表示ラベル | アイコン |
|-----|-----------|---------|
| animal | 動物 | 🐾 |
| animal_contact | ふれあい | 🤲 |
| animal_feed | えさやり | 🥕 |
| water_play | 水遊び | 💧 |
| pool | プール | 🏊 |
| playground | 遊具 | 🛝 |
| athletic | アスレチック | 🧗 |
| slide | すべり台 | 🎿 |
| running | かけっこ | 🏃 |
| wide_space | 広い場所 | 🌿 |
| vehicle | 乗り物 | 🚂 |
| craft | 工作 | ✂️ |
| experience | 体験 | 🌾 |
| exhibition | 展示・見学 | 🔭 |
| science | 科学 | 🔬 |
| dinosaur | 恐竜 | 🦕 |
| character | キャラクター | ⭐ |
| nature | 自然 | 🌲 |
| food | 食べ物 | 🍓 |

### 表示仕様

**施設カード（一覧ページ）**
- `recommended_for_tags` が空でない場合のみ表示
- タグは最大 3 個まで表示（超える場合は省略、詳細ページで全表示）
- 表示位置: 施設カードの下部（評価・レビュー件数の上または下）
- スタイル: 小さめのバッジ形式（例: `bg-sky-100 text-sky-700 text-xs px-2 py-0.5 rounded-full`）

**施設詳細ページ**
- 全タグを表示
- セクション見出し:「こんな子におすすめ 🎯」
- 表示位置: 施設概要の直下、または「特徴」セクションの中

### 実装ファイル

- 施設カードコンポーネント（既存の FacilityCard 等を確認して追加）
- 施設詳細ページ（`app/facilities/[slug]/page.tsx` 等、既存構成を確認して追加）

---

## 完了条件

- [ ] Migration 006 の SQL ファイル作成
- [ ] `facilities_data.json` の全施設に `recommended_for_tags` が追加されていること
- [ ] 施設カードに「こんな子におすすめ」タグが表示されること（ローカル確認）
- [ ] 施設詳細ページに全タグが表示されること（ローカル確認）
- [ ] `npm run lint` / `npx tsc --noEmit` / `npm run build` が通ること

完了後、agmsg で memorips-claude に GO を報告すること。
Migration SQL は Supabase Dashboard で手動実行（オーナーに依頼）。
