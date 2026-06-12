# things_to_do 展開バッチ設計

> 作成: 2026-06-12 / Claude Code PM
> 前提: 代表5施設パイロット本番公開済み（cc81f47）/ url調査完了で url未入力 102→25件
> 生成ルールの正本: facility-experience-candidates.md（補強5点込み）/ facility-page-content-enhancement.md
> 状態: 設計のみ。実データ反映はオーナー確認後

## 1. スコープ（何を生成するか）

- **第1期: things_to_do のみ**（additive・新フィールド追加のみ・既存値を書き換えない → リスク最小）
- **description 増強（150〜300字化・星評価表現削除）は第2期**として分離する
  - 理由: things_to_do は追加だけなのでロールバックが容易。description は既存値の置換であり、レビュー負荷・事故影響が桁違いに大きい。第1期のレビュー運用が回ってから判断
- recommended_for_tags / カテゴリ / 住所 / 料金等は触らない

## 2. 生成対象（eligibility）

**優先対象（この順でバッチ化）**:
1. data_quality_status = confirmed（65件 − パイロット済み・住所ズレ除外分）
2. data_quality_status = likely_ok（15件）
3. status なしだが **url あり**（公式系URL）の施設

**除外・保留**:
- needs_human_review 全件（24件: A群10/B群9/C群2/D群3）
- needs_web_check（id145）
- url 未入力の残り25件
- exclude_candidate 判断待ち（id146等）
- パイロット済み5件（id1/12/23/145/192 — 145はそもそも除外側）
- 体験候補が3件未満しか根拠から導けない施設は**バッチ内で生成スキップ**（things_to_do を付与しない=フォールバック表示のまま）とし、スキップ理由を成果物に記録

## 3. バッチ構成

- **1バッチ = 50件**（レビュー可能な上限目安）
- 並び: 県単位でまとめる（レビュー時に同種施設を比較しやすい）。第1バッチ=静岡県の対象施設から開始
- 各バッチの流れ:
  1. Codex: 対象50件の抽出リスト提出（id/名前/根拠フィールドの充実度）
  2. Codex: 生成 → `.codex/things-to-do-batch-N.json`（id / things_to_do案 / 各項目の根拠 / スキップ施設と理由）として提出。**facilities_data.json は触らない**
  3. PM: レビュー（things-to-do-review-checklist.md）→ 修正指示 or 承認
  4. オーナー: サンプル確認（初回バッチは全件、2バッチ目以降は PM が抽出した境界例のみ）
  5. Codex: 承認分のみ JSON 反映 → audit → 往復テスト → build → commit
  6. 数バッチ分まとめてデプロイ（毎バッチデプロイはしない）

## 4. 前提タスク（第1バッチ反映前に必要）

- **Sheets 27列対応**: things_to_do 列の sync-sheet / push-to-sheet / append-to-sheet / export-to-csv 対応（provenance 4列と同じ要領。カンマ区切りでなく **JSON配列→セル内は「 / 」区切り**等の表現を実装時に決定）
- 往復テスト（push→sync 差分ゼロ）に things_to_do が含まれること

## 5. 生成時の technical ルール

- 入力: description / signature_experiences / unique_selling_point / experience_tags / recommended_for_tags / category / indoor_outdoor / rain_friendly / summer_water_play / target_age / tags / **url先の公式情報（Web search 可。使った場合は source_urls 追記対象として報告**、ただし source_checked_at の更新は重要項目を確認した場合のみ）
- 変換・判定: facility-experience-candidates.md の変換表+補強5ルールに従う
- 出力検証（機械チェック）: 文字種・動詞止め・項目数3〜12・重複なし・禁止語（「まだ記録がありません」系/出典不明評価/断定系の持込可否・ベビーカー文言は公式根拠なしで禁止）

## 6. ロールバック・安全装置

- things_to_do は additive → **フィールド削除で完全に元の表示に戻る**（フォールバック実装済み）
- バッチ単位コミット → `git revert <batch-commit>` で即時取り消し可能
- 緊急時: 全 things_to_do を一括除去するスクリプト（rollback用）を第1バッチ実装時に用意（scripts/remove-things-to-do.mjs 等）
- デプロイ後に問題発覚した場合: revert → build → デプロイ（手順は rollout-plan 参照）
