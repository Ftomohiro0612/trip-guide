# 施設調査 → facilities_data.json 反映 標準ワークフロー

> 作成: 2026-06-11 / Claude Code PM
> 関連: facility-source-trust-levels.md（項目別信頼レベル）/ facility-data-quality-checklist.md（チェックリスト）/ RESEARCH_METHODOLOGY.md（収集10ステップ）
> 目的: 誰が（Fable/Opus/Codex/人間）やっても同じ品質になる再現可能な手順

---

## A. 新規施設追加フロー

```
1. 候補収集     RESEARCH_METHODOLOGY.md の10ステップ（WebSearch+まとめサイト突合+公的サイト）
2. 一次確認     施設ごとに公式サイト（なければ自治体/観光協会ページ）を開き、
                exact identity・住所・営業状況（閉店していないか）・常設施設適格性を確認
                → 公式情報が見つからない施設は needs_web_check で保留（追加しない or 保留リストへ）
                → 子ども料金・年齢・同伴条件だけが見つからない場合は保留せず metadata を unknown にする
3. 県内判定     住所の都道府県が対象9県か確認。県外なら**その場でリストから除外**
                （「→該当県外」等のメモを残したままCSV/JSONに入れない。id734/929事件の再発防止）
4. データ整形   22列フォーマット + 新メタ3列:
                - source_urls: 確認に使ったURL（公式優先、複数可、カンマ区切り）
                - source_checked_at: 確認日（YYYY-MM-DD）
                - data_quality_status: "confirmed"
5. 座標取得     住所確定後に Nominatim（1req/s 厳守）で取得 → 県 bbox 内か検証
                bbox 外なら needs_web_check にして座標を確定しない。geocode_source を記録
6. タグ付与     recommended_for_tags_rules.md 準拠。description/公式説明に根拠語彙がある場合のみ
                公式に成人限定・子ども利用不可・年齢制限がある場合は child_use_status / notes を記録し、
                restricted / not_allowed を子ども向け推薦候補から除外
7. 反映         append-to-sheet → sync-sheet → push-to-sheet（id書き戻し必須）
8. 監査         node scripts/audit-data-quality.mjs → 新規分にhigh/mediumが出ていないか確認
9. 表示確認     ローカル build + 該当施設ページの表示確認（rain_friendly 等の値制約も）
10. デプロイ判断 PM へ報告（件数・監査結果・サンプル確認）→ GO 後デプロイ
```

## B. 既存施設修正フロー

```
1. 修正根拠の確認: 必ず公式/自治体の一次情報URLを取得（AI知識・まとめサイトで確定しない）
2. 修正 + source_urls / source_checked_at を更新、data_quality_status を confirmed に
3. 住所を修正した場合は座標も再取得（Nominatim→bbox検証→geocode_source更新）
4. 監査スクリプト再実行
5. 1コミット1目的（監査変更と混ぜない）。コミットメッセージに id と根拠URLを記載
6. PM 確認 → デプロイ
```

## C. 閉店・移転確認フロー

```
1. 検知のきっかけ: まとめサイト/口コミの閉店表記・404・ユーザー報告（これだけでは確定しない）
2. 確定確認: 公式サイト・自治体ページ・信頼できる報道のいずれかで確認。URLを記録
3. 閉店確定 → PM 判断へ（削除 or 「閉店」表示で残すかはプロダクト判断）
4. 移転確定 → 新住所を公式から取得 → B の修正フロー
5. 確認できない → needs_web_check のまま保留し、PM に報告
```

## D. 県外・対象外施設の扱い

- 対象9県: 静岡・長野・山梨・東京・栃木・埼玉・新潟・千葉・神奈川
- 県外と判明した施設は**追加しない / 既存なら削除候補として PM 判断に戻す**（自動削除しない）
- 対象エリア拡張（茨城・群馬・福島等）は PM/オーナーのプロダクト判断。データ作業側で勝手に追加しない
- 除外メモを name / description に書き込む運用は**全面禁止**（除外＝行を入れない）

## E. needs_web_check / needs_human_review の使い分け

| フラグ | 意味 | 例 |
|---|---|---|
| `needs_web_check` | Web（公式/自治体）を見れば白黒つく | 住所・座標・営業時間・料金・閉店疑い |
| `needs_human_review` | Web を見ても判断が要る（プロダクト判断・解釈） | タグの妥当性・カテゴリ分類・県外施設の扱い・親子施設の分割 |

## F. PM 判断に戻す条件（作業者は確定しない）

- 県外施設の追加/削除/エリア拡張
- 施設の削除全般（閉店含む）
- 公式確認が取れない項目の掲載可否
- SEO に影響する title/description の方針変更
- 大量一括修正（10件超のデータ変更）
- 監査ルール自体の変更

## G. AI の役割分担

| 作業 | AI 可否 |
|---|---|
| 検索・収集・突合・一覧化 | ✅ |
| 確認済み事実の要約（description 等） | ✅ |
| 分類・タグ導出（根拠語彙ベース） | ✅ |
| 住所・座標・料金・営業状況・閉店の**事実確定** | ❌ 一次情報URL必須 |
| 確認できなかった項目の補完 | ❌ needs_web_check で保留 |
