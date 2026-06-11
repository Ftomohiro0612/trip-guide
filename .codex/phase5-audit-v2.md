# Phase 5: データ品質監査スクリプト v2

> 作成: 2026-06-11 / Claude Code PM
> 対象: `scripts/audit-data-quality.mjs`（既存構成を最小限の破壊で改善）

---

## 背景

- 現行の `prefecture_mismatch` は 881 件と過剰検出。原因: 「住所に都道府県名がない＝mismatch」にしているため、市区町村始まりの正当な住所まで検出している。
- `short_description`（80字未満）は 948 件。文字数だけでは重大度が判定できない。
- カンドゥー住所誤り（イクスピアリ→イオンモール幕張新都心）の再発防止に使える形にする。

---

## チェック仕様（v2）

### 1. `address_pref_mismatch`（旧 prefecture_mismatch の置き換え）

- **address 内に prefecture と異なる都道府県名が明記されている場合のみ** mismatch とする。
- 注意: 「京都府」に「京都」を含む等の部分一致誤検出を避けるため、PREFS の完全文字列で `includes` 判定し、複数ヒット時は最初の出現位置が最も早いものを採用する。
- 例: prefecture=千葉県, address="東京都江戸川区…" → mismatch。
- address に都道府県名がない場合はこのチェックでは**検出しない**。

### 2. `prefecture_missing_in_address`（新カテゴリ）

- address に47都道府県名がいずれも含まれていないものを別カテゴリで出力。
- これは「即エラー」ではなく「表記改善候補」。`needs_web_check: false`、`severity: "info"` とする。

### 3. `invalid_address`（新カテゴリ）

- 以下を検出:
  - address が null / 空文字 / 10文字未満
  - 既存 FAKE_ADDRESS_PATTERNS（"各エリア", "都内", "アクセス", "近郊", "周辺"）を含む
  - 数字を1文字も含まない（番地がない住所はほぼ不完全）— ただし「丁目」「番」「号」を含む場合は除外
- `needs_web_check: true`, `severity: "high"`。

### 4. `coord_pref_mismatch`（新規）

- 外部APIは使わない。**都道府県ごとの粗い bbox** をスクリプト内に定数で持つ。
  - 対象9県のみで良い（データが関東甲信越9県のため）: 茨城・栃木・群馬・埼玉・千葉・東京・神奈川・山梨・長野・新潟・静岡 のうちデータに存在する県。
  - データに存在する prefecture の一覧を実行時に出して、bbox 未定義の県があれば warning を出す。
- bbox は余裕を持たせる（±0.1度程度のマージン）。bbox 外に出たもののみ検出。
- latitude / longitude が null・0・範囲外（日本国外）は `invalid_coordinates` として別出力。
- `needs_web_check: true`, `severity: "high"`。カンドゥー型の誤りはこれで捕捉できる。

参考bbox（マージン込み、必要に応じ調整可）:

```
茨城県: lat 35.7–36.95, lng 139.6–140.95
栃木県: lat 36.1–37.2,  lng 139.2–140.3
群馬県: lat 35.9–37.1,  lng 138.3–139.8
埼玉県: lat 35.7–36.3,  lng 138.7–139.95
千葉県: lat 34.8–36.15, lng 139.65–140.95
東京都: lat 35.4–35.95, lng 138.9–139.95（島嶼部は別途 lat 24–35.7, lng 138.9–142.3 を許容）
神奈川県: lat 35.1–35.7, lng 138.9–139.8
山梨県: lat 35.1–35.95, lng 138.15–139.2
長野県: lat 35.1–37.05, lng 137.7–138.85
新潟県: lat 36.7–38.6,  lng 137.6–139.9
静岡県: lat 34.5–35.7,  lng 137.4–139.2
```

### 5. 説明文 3 カテゴリ（旧 short_description の置き換え）

- `short_description`: 60文字未満（80→60に緩和）。`severity: "low"`。
- `thin_description`: 60文字以上だが、体験語彙が乏しい。判定ヒューリスティック:
  - 体験キーワード（例: 遊べる, 体験, 楽しめる, ふれあえる, 見られる, 学べる, 乗れる, 作れる, 滑り台, 遊具, プール, 水遊び, アスレチック 等）を**1つも含まない**
  - かつ施設名・住所・営業情報の言い換えだけに見える（「〜に立地」「〜にある」のみ等）
  - `severity: "medium"`
- `missing_experience`: 子ども向け体験への言及ゼロ（「子ども」「親子」「家族」「キッズ」「こども」いずれも含まず、体験キーワードもゼロ）。`severity: "medium"`。
- 1施設が複数カテゴリに該当する場合は最も重いもの1つに分類（missing_experience > thin_description > short_description）。

### 6. `tag_category_conflict`（既存維持）

- 既存ロジック（CORE_TAGS / SUSPICIOUS_SOLO_TAGS）をそのまま維持。名称を `tag_category_mismatch` → `tag_category_conflict` に変更してよい（レポートキーも揃える）。
- 件数が現行30件から大きく増えないこと（増えたらロジック変更ミスを疑う）。

---

## 出力仕様

- `.codex/` 配下に JSON レポート（既存と同様）+ **Markdown サマリーレポート** `facility_data_quality_report.md` を追加:
  - カテゴリごとの件数表
  - 各カテゴリの上位10件（id / name / prefecture / 理由）をテーブルで
  - severity 集計（high / medium / low / info）
- JSON issue オブジェクトに `severity` フィールドを追加。既存フィールド（needs_web_check 等）は維持。
- **自動修正は一切しない**。判定が曖昧なものは `needs_web_check: true` のまま出力するだけ。

---

## 完了条件

- [ ] `node scripts/audit-data-quality.mjs` がエラーなく実行できる
- [ ] address_pref_mismatch が「別都道府県名の明記」のみ検出（881件から大幅減のはず）
- [ ] prefecture_missing_in_address が info として別出力
- [ ] coord_pref_mismatch がカンドゥー型の座標ズレを検出できる構造になっている
- [ ] 説明文が 3 カテゴリに分類され、重複なし
- [ ] tag_category_conflict は約30件のまま
- [ ] Markdown レポートが生成される
- [ ] `npm run lint` が通る（mjs が lint 対象外なら node 実行確認のみで可）
- [ ] 実行後の各カテゴリ件数を agmsg で memorips-claude に報告
- [ ] facilities_data.json は変更しない（監査のみ）
