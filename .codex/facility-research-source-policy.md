# 施設情報 確認元ポリシー（公式確認・Nominatim・AI推定禁止）

> 作成: 2026-06-11 / Claude Code PM
> 詳細な項目別の可否は facility-source-trust-levels.md を参照。本書は運用ルールの正本。

## 0. Facility canon 採用必須条件（2026-08-27 Owner改定）

新規施設をcanonへ追加するには、次の4条件を満たすこと。

1. 公式一次情報でexact facility identityを確認できる
2. 公式一次情報で所在地を確認できる
3. 公式一次情報で現在営業していることを確認できる
4. 既存FacilityOps上、常設のおでかけ施設として適格である

子ども料金・対象年齢・保護者同伴条件はcanon採用の必須条件ではない。公式一次情報で確認できればfacility metadataとして記録し、確認できなければ `unknown` とする。外形や施設名から子ども利用可を推測してはならない。

公式に年齢制限・成人限定・子ども利用不可が明示されている場合は `child_use_status` / `child_use_notes` に記録し、`restricted` / `not_allowed` の施設を子ども向け推薦候補に含めない。このルールはAsoview、Rakuten Experiencesその他すべてのreverse discoveryに共通適用する。

## 1. AI 推定禁止項目（絶対ルール）

以下は AI の学習知識・推測で**確定してはならない**。一次情報（公式サイト・自治体サイト・観光協会・信頼できる報道）での確認が必須:

- 住所・所在地
- 緯度経度（住所確定後のジオコーディング結果のみ可）
- 閉店・移転・休業
- 料金・営業時間・定休日（確定表記する場合）
- 子ども料金・対象年齢・保護者同伴条件・子ども利用可否

違反事例: カンドゥー事件（2026-06-10、AI知識の旧店舗住所で確定 → 本番に誤住所）

## 2. 確認元URLと確認日の記録（新規・修正分から必須）

```json
"source_urls": "https://www.example-official.jp/access/",
"source_checked_at": "2026-06-11",
"data_quality_status": "confirmed"
```

- source_urls は確定根拠に使ったURL（**先頭を公式/自治体に**）。複数あればカンマ区切り
- まとめサイトしか根拠がない場合は confirmed にせず `needs_web_check`
- 既存データへの遡及付与はしない（status のみ機械分類: facility-data-quality-status-policy.md）
- スキーマ詳細: facility-provenance-schema.md / 項目別要件の正本: facility-source-requirements-by-field.md

## 3. Nominatim 利用ルール

1. **住所確定後**に実行（施設名検索での座標確定は補助のみ。カンドゥーでは施設名検索が有効だったが、住所未確定のまま座標を確定しない）
2. レート制限 1 リクエスト/秒 厳守。一括処理はスリープを入れる
3. 取得した座標は**県 bbox で必ず検証**（scripts/audit-data-quality.mjs の bbox 定数を使用）
4. bbox 外・ヒットなし → 座標を確定せず `needs_web_check`
5. `geocode_source` に nominatim / google / manual を記録

## 4. needs_web_check / needs_human_review

- 確認しきれない項目を**勝手に埋めない・空欄やN/Aで confirmed にしない**
- Web で白黒つく → `needs_web_check`、判断が要る → `needs_human_review`
- 監査レポートの該当リストに残し、別タスクで消化する

## 5. 除外・保留の扱い

- 県外・閉店・重複・対象外と判明 → **データに行を入れない／既存行は PM 判断で削除**
- name / description に「→該当県外」「参考のみ」「(削除…)」等のメモを書く運用は全面禁止（id929 / id734 事件）
- 作業メモは .codex/ 配下の作業ファイルか保留リスト（別ファイル）に書く
