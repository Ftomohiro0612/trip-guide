# 施設データ修正 前後チェックリスト

> 作成: 2026-06-11 / Claude Code PM
> 使い方: 施設データを触るタスク（追加・修正・削除）の仕様書にこのチェックリストを埋め込む

## 修正前

- [ ] 修正根拠の一次情報URL（公式/自治体）を取得した（AI知識・まとめサイトで確定していない）
- [ ] 対象施設の id / name / 現状値を記録した（ロールバック用）
- [ ] 監査タスクと修正タスクが分離されている（同一コミットに混ぜない）
- [ ] 県外・削除・10件超の一括変更は PM 承認済み
- [ ] migration番号・id 再採番をしない確認（id は欠番運用）

## 修正時

- [ ] name にメモ文字列（→ / 参考 / 除外 / 要確認 / TODO / (削除）を入れていない
- [ ] address は都道府県名から始まる完全表記（公式表記に従う）
- [ ] 住所を変えた場合、座標も再取得し県 bbox 内であることを確認した
- [ ] geocode_source を更新した（nominatim / google / manual）
- [ ] source_urls / source_checked_at / data_quality_status を更新した
- [ ] enum 制約を守った（rain_friendly・summer_water_play: ◎/△/× のみ、indoor_outdoor: 屋内/屋外/両方、fee_type: 無料/有料で始まる）
- [ ] recommended_for_tags はルール（recommended_for_tags_rules.md）の19キーのみ・根拠語彙あり
- [ ] water_play と pool を取り違えていない（浅い水遊び=water_play / 泳ぐ前提=pool）

## 修正後

- [ ] `node scripts/audit-data-quality.mjs` を実行し、修正対象が検出から消えた／新規検出が増えていない
- [ ] 件数確認（総施設数の増減が意図どおり）
- [ ] Sheets 同期が必要な場合: sync 方向を確認（JSON直編集なら push-to-sheet、Sheets編集なら sync-sheet）し、id 書き戻しを忘れない
- [ ] `npm run build` が通る（postbuild の sitemap 変化は意図どおりか確認）
- [ ] 該当施設ページの表示確認（ローカル）
- [ ] コミットメッセージに id・変更内容・根拠URLを記載
- [ ] 完了報告に: commit hash / 変更件数 / 監査前後の件数 / 根拠URL / デプロイ実施有無
- [ ] デプロイは PM 確認後
