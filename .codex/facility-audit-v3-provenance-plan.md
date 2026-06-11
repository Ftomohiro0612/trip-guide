# 監査スクリプト v3 — provenance 監査 追加計画

> 作成: 2026-06-11 / Claude Code PM
> 状態: **計画のみ。今回は実装しない**（実装はスキーマ4フィールドの Sheets 同期対応後）

## 追加チェック一覧

| # | チェック名 | 条件 | severity | 備考 |
|---|---|---|---|---|
| 1 | `name_memo_pollution` | name に `→` `参考` `除外` `要確認` `TODO` `(削除` を含む | **high** | id929/id734 型。即実装価値あり（スキーマ非依存） |
| 2 | `out_of_scope_prefecture` | prefecture が対象9県以外、または address に9県外の県名 | **high** | 同上・スキーマ非依存 |
| 3 | `prefecture_id_mismatch` | prefecture ⇔ prefecture_id 対応表と不一致 | high | スキーマ非依存 |
| 4 | `url_missing_or_placeholder` | url が空/N/A/http(s)以外/検索結果URL | medium | 既存83件が対象 |
| 5 | `provenance_missing` | data_quality_status なし | info | 段階導入中は info。導入完了後 medium |
| 6 | `confirmed_without_source` | status=confirmed なのに source_urls or source_checked_at が空 | **high** | 絶対ルール違反の検出 |
| 7 | `confirmed_by_weak_source` | source_urls の先頭がまとめサイト系ドメイン（iko-yo.net, aumo.jp, jalan.net 等のリスト）のみで confirmed | medium | 「公式っぽくないURLだけで confirmed」防止 |
| 8 | `stale_check` | source_checked_at が365日超 | low | 鮮度管理。料金・営業時間の再確認候補 |
| 9 | `status_consistency` | status=likely_ok なのに監査 high 検出あり（降格漏れ） | medium | 監査実行時に status を自動降格する実装でも可 |
| 10 | `address_change_without_source` | git diff で address が変わったのに source_urls 未更新 | — | スクリプトでなく**テンプレート9のチェックリストで担保**（git連携は過剰実装） |

## 実装順の推奨

1. **第1弾（スキーマ非依存・すぐ可能）**: #1 name_memo_pollution / #2 out_of_scope_prefecture / #3 prefecture_id_mismatch / #4 url_missing
2. **第2弾（4フィールド導入後）**: #5〜#9
3. レポートに status 別件数サマリーを追加（confirmed n件 / likely_ok n件 / ...）

## 実装時の注意（テンプレート3のルール継承）

- 監査と修正の分離・facilities_data.json 無変更
- 過剰検出を避ける: まとめサイトドメインリストは保守的に（不明ドメインは weak 扱いしない）
- 既存データへの provenance 欠落は info に留める（881件事件の教訓: 移行期の状態をエラー化しない）
