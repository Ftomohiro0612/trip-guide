# 施設情報 確認元ポリシー（公式確認・Nominatim・AI推定禁止）

> 作成: 2026-06-11 / Claude Code PM
> 詳細な項目別の可否は facility-source-trust-levels.md を参照。本書は運用ルールの正本。

## 1. AI 推定禁止項目（絶対ルール）

以下は AI の学習知識・推測で**確定してはならない**。一次情報（公式サイト・自治体サイト・観光協会・信頼できる報道）での確認が必須:

- 住所・所在地
- 緯度経度（住所確定後のジオコーディング結果のみ可）
- 閉店・移転・休業
- 料金・営業時間・定休日（確定表記する場合）

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
