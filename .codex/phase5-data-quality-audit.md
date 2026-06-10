# Phase 5: 施設データ品質監査

> 作成: 2026-06-10 / Claude Code PM
> 目的: 都道府県ミスマッチ・タグ矛盾・説明文不足を検出してレポート化。大量修正は行わず、まず全体像を可視化する。

---

## 背景

カンドゥー（id=357）のレビューで以下の構造的問題が判明：
- `address: "東京都各エリア/職業体験"` という架空アドレス → `prefecture: 東京都` に誤設定（実態はイクスピアリ＝千葉県）
- `recommended_for_tags: ["playground"]` ← 職業体験施設なのに不適切
- `description` が施設の実態を十分に伝えていない

同種の問題が他にどれくらいあるかを可視化するため、品質監査スクリプトを作成・実行する。

---

## やること

### Step 1: カテゴリ一覧を取得

`data/facilities_data.json` から `category_id` の一覧を取得してコンソール出力する（後続ルール定義のため）。

### Step 2: 品質監査スクリプト作成

`scripts/audit-data-quality.mjs` を新規作成する。

#### 2-1: 都道府県ミスマッチチェック

```javascript
// address に含まれる都道府県と prefecture フィールドが不一致 → needs_web_check: true
const PREFS = [
  '北海道','青森県','岩手県','宮城県','秋田県','山形県','福島県',
  '茨城県','栃木県','群馬県','埼玉県','千葉県','東京都','神奈川県',
  '新潟県','富山県','石川県','福井県','山梨県','長野県','岐阜県',
  '静岡県','愛知県','三重県','滋賀県','京都府','大阪府','兵庫県',
  '奈良県','和歌山県','鳥取県','島根県','岡山県','広島県','山口県',
  '徳島県','香川県','愛媛県','高知県','福岡県','佐賀県','長崎県',
  '熊本県','大分県','宮崎県','鹿児島県','沖縄県'
];

function extractPrefFromAddress(address) {
  if (!address) return null;
  for (const p of PREFS) {
    if (address.includes(p)) return p;
  }
  return null;
}
```

判定ロジック：
- `extractPrefFromAddress(address)` が null → アドレスが架空・不完全 → `needs_web_check: true`, `web_check_reason: "住所に都道府県名が含まれておらず prefecture の自動判定不可"`
- `extractPrefFromAddress(address)` が `prefecture` と不一致 → `needs_web_check: true`, `web_check_reason: "address内の都道府県(${addrPref})とprefecture(${pref})が不一致"`
- 一致 → 問題なし

**例外**: 以下のテキストパターンが address に含まれる場合は自動フラグ（架空アドレスパターン）：
- "各エリア"
- "都内"
- "アクセス"
- "近郊"
- "周辺"

#### 2-2: タグ×カテゴリ矛盾チェック

以下のルールで `recommended_for_tags` と `category_id` の整合性を検査する。

```javascript
// カテゴリ別: 少なくとも1つあるべき「コアタグ」
// コアタグが1つもない → needs_web_check
const CORE_TAGS = {
  'aquarium':        ['animal', 'exhibition'],
  'zoo':             ['animal', 'animal_contact', 'animal_feed'],
  'farm':            ['animal_contact', 'animal_feed', 'food', 'experience'],
  'science-museum':  ['science', 'exhibition'],
  'art-museum':      ['exhibition'],
  'museum':          ['exhibition', 'experience'],
  'experience':      ['experience', 'craft'],
  'indoor-play':     ['playground', 'character', 'craft', 'vehicle'],
  'indoor-theme-park': ['character', 'experience', 'playground'],
  'nature-park':     ['nature', 'wide_space', 'running'],
  'park':            ['playground', 'wide_space', 'running', 'nature'],
  'water-park':      ['water_play', 'pool'],
  'athletic':        ['athletic', 'playground', 'running'],
  'camping':         ['nature', 'wide_space'],
  'viewpoint':       ['nature', 'wide_space'],
  'scenic':          ['nature'],
};

// カテゴリに対して「このタグだけある（コアタグなし）」なら怪しい
const SUSPICIOUS_SOLO_TAGS = {
  'aquarium':        ['playground'],   // 水族館なのにplaygroundだけ
  'zoo':             ['playground'],   // 動物園なのにplaygroundだけ
  'science-museum':  ['playground'],   // 科学館なのにplaygroundだけ
  'experience':      ['playground'],   // 体験施設なのにplaygroundだけ
  'indoor-theme-park': ['playground'], // テーマパークなのにplaygroundだけ
  'museum':          ['playground'],   // 博物館なのにplaygroundだけ
};
```

判定ロジック：
1. `CORE_TAGS[category_id]` が定義されている
2. タグリストにコアタグが1つもない
3. かつ `SUSPICIOUS_SOLO_TAGS[category_id]` に含まれるタグのみある
→ `needs_web_check: true`, `web_check_reason: "category(${cat})に対してcoretags不在、suspicious tags(${suspicious})のみ付与"`

コアタグが1つもないがsuspiciousでもない場合は `web_check_reason: "category(${cat})に対してcoretags(${coreTags.join(',')})が付与されていない"` でフラグ。

#### 2-3: 説明文の短さチェック

```javascript
// description が null または80文字未満
if (!f.description || f.description.length < 80) {
  // needs_web_check: true
  // web_check_reason: `description が ${f.description?.length ?? 0}文字（80文字未満）`
}
```

#### 2-4: 出力フォーマット

各チェックで問題が見つかった施設エントリは以下のフォーマットで出力：

```json
{
  "id": 357,
  "name": "カンドゥー",
  "prefecture": "東京都",
  "address": "東京都各エリア/職業体験...",
  "category_id": "indoor-play",
  "recommended_for_tags": ["playground"],
  "description": "...",
  "issue_type": "prefecture_mismatch",
  "needs_web_check": true,
  "web_check_reason": "address内に '各エリア' パターンあり（架空アドレスの可能性）",
  "web_check_status": "pending",
  "web_check_result": null,
  "web_checked_sources": [],
  "needs_human_review": false,
  "human_review_reason": null
}
```

### Step 3: レポートファイル生成

スクリプト実行後、以下の4ファイルを `.codex/` に出力：

1. **`.codex/facility_data_quality_report.json`** — サマリー
   ```json
   {
     "generated_at": "2026-06-10",
     "total_facilities": 968,
     "prefecture_mismatch_count": 0,
     "tag_category_mismatch_count": 0,
     "short_description_count": 0,
     "total_needs_web_check": 0,
     "total_needs_human_review": 0
   }
   ```

2. **`.codex/prefecture_mismatch_facilities.json`** — 都道府県ミスマッチ一覧

3. **`.codex/tag_category_mismatch_facilities.json`** — タグ×カテゴリ矛盾一覧

4. **`.codex/short_description_facilities.json`** — 説明文短すぎ一覧

---

### Step 4: カンドゥーの暫定修正

スクリプト実行後、`data/facilities_data.json` 内のカンドゥー（name: "カンドゥー"）を以下に修正：

```json
{
  "prefecture": "千葉県",
  "prefecture_id": "chiba",
  "address": "千葉県浦安市舞浜1-4 イクスピアリ",
  "recommended_for_tags": ["experience"],
  "description": "30種以上の職業を体験できる施設。パイロット・警察官・アイスクリームメーカー・モデルなど多彩なロールプレイが楽しめる。3〜15歳対象。現在の稼働店舗はイクスピアリ（千葉県浦安市）のみ。"
}
```

**注意**: `craft` は陶芸・工作系タグのため職業体験施設には不適切。`experience` のみ付与する。将来的に `job_experience` タグを検討。

注意: `facilities_data.json` を直接編集する。id は変更しない。

---

### Step 5: ビルド確認・コミット

```bash
npm run build
git add scripts/audit-data-quality.mjs .codex/facility_data_quality_report.json .codex/prefecture_mismatch_facilities.json .codex/tag_category_mismatch_facilities.json .codex/short_description_facilities.json data/facilities_data.json
git commit -m "feat: Phase 5-1 — データ品質監査スクリプト + カンドゥー暫定修正"
```

---

## 完了条件

- [ ] `scripts/audit-data-quality.mjs` が作成・実行できる
- [ ] 4つのレポートファイルが `.codex/` に生成されている
- [ ] `facility_data_quality_report.json` に件数サマリーが入っている
- [ ] カンドゥーの `prefecture` が `千葉県` に修正されている
- [ ] カンドゥーの `recommended_for_tags` に `experience` が含まれている
- [ ] `npm run build` が通る
- [ ] agmsg で memorips-claude に GO 報告 + レポートの件数サマリーを送ること

---

## 今後のフロー（今回は実行しない・参考）

```
1. audit-data-quality.mjs 実行 → needs_web_check: true のリスト生成
2. web調査エージェントが公式サイト等を確認
3. 確認できたものは web_check_status: "completed", web_check_result: "..." に更新
4. 確認できなかったものだけ needs_human_review: true に昇格
5. オーナーが human_review 対象のみ確認
```
