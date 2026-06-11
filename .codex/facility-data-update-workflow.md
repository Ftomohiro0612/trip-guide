# 施設データ更新 標準運用（マスタードキュメント）

> 作成: 2026-06-11 / Claude Code PM
> このファイルは施設データ運用の入口。詳細は各ドキュメントへ。

## ドキュメント体系

| ファイル | 内容 |
|---|---|
| **本書** | 運用の全体像・タスク種別ごとの参照先 |
| `facility-research-workflow.md` | 新規追加・修正・閉店確認の標準手順（A〜G） |
| `facility-source-trust-levels.md` | 項目別の確認元可否表（◎/△/✕） |
| `facility-research-source-policy.md` | AI推定禁止・source_urls・Nominatim ルールの正本 |
| `facility-data-quality-checklist.md` | 修正前後チェックリスト（仕様書に埋め込む） |
| `facility-data-source-audit.md` | 現状の棚卸し・問題点・既存データ分類方針・監査v3案 |
| `facility-provenance-schema.md` | 根拠管理4フィールドの設計（MVP/将来版） |
| `facility-data-quality-status-policy.md` | data_quality_status 5分類の使い分け・既存1,030件の初期付与 |
| `facility-source-requirements-by-field.md` | 項目別 確定根拠要件の**正本** |
| `facility-audit-v3-provenance-plan.md` | provenance 監査 v3 の追加計画（未実装） |
| `RESEARCH_METHODOLOGY.md`（リポジトリ直下） | 県単位の収集10ステップ |
| `recommended_for_tags_rules.md` | タグ19キーの付与ルール |
| `templates/spec-templates.md` テンプレート9 | 施設データ更新タスクの仕様書テンプレート |

## タスク種別 → 使うもの

| やりたいこと | 手順 | チェック |
|---|---|---|
| 新県・新規施設の追加 | research-workflow §A + RESEARCH_METHODOLOGY | checklist 全項目 |
| 既存施設の修正（住所・料金等） | research-workflow §B | checklist + source-policy §1-3 |
| 閉店・移転の対応 | research-workflow §C | PM 判断必須 |
| データ品質監査 | spec-templates テンプレート3 | 監査と修正の分離 |
| タグの見直し | recommended_for_tags_rules | 根拠語彙の確認 |

## 鉄の掟（5つ）

1. **住所・座標・閉店・移転は AI 推定で確定しない**（一次情報URL必須）
2. **監査と修正は別タスク・別コミット**
3. **除外メモを name/description に書かない**（除外＝行を入れない）
4. **新規・修正分には source_urls / source_checked_at / data_quality_status を必ず付ける**
5. **削除・県外・10件超の一括変更・SEO 変更は PM 判断に戻す**

## 過去インシデント（再発防止の原点）

| 事件 | 原因 | 対策（本体系での担保） |
|---|---|---|
| カンドゥー住所誤り | AI知識で住所確定 | source-policy §1 / trust-levels 住所◎のみ |
| id929 / id734 除外メモ行混入 | 作業メモがデータ化 | source-policy §5 / 監査v3 name_memo_pollution |
| 881件過剰検出 | 監査ルールの過剰一般化 | テンプレート3「確実に問題があるものに絞る」 |
| 旧3県表記の残存 | データ拡張時の文言棚卸し漏れ | 県追加時に grep 棚卸しをチェックリスト化（research-workflow §A-10） |
