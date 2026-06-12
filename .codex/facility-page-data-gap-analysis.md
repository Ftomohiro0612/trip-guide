# 施設ページ v2 データギャップ分析

> 作成: 2026-06-12 / Claude Code PM
> 目的: 親が知りたい情報を「今出せる / 貯まれば出せる / 確認しないと出せない」に仕分けする

## A. 既存データで今すぐ表示・増強できる（スキーマ変更なし）

| 情報 | 出所フィールド | 備考 |
|---|---|---|
| メインの遊び・体験候補 | description / signature_experiences / unique_selling_point / category / tags / experience_tags / recommended_for_tags / summer_water_play / indoor_outdoor | **体験候補リストに再編**（facility-experience-candidates.md） |
| 何歳くらいが楽しめるか | target_age + recommended_for_tags | 文章リード化 |
| 雨の日に使えるか | rain_friendly + indoor_outdoor | 既に表示済み |
| 夏の水遊び | summer_water_play | 既に表示済み |
| 料金の区分 | is_free / fee_type / adult_fee / child_fee | 既に表示済み（粒度向上は公式確認案件） |
| どんな子に合うか | recommended_for_tags（19タグ） | 表現強化のみ |

## B. recommended_for_tags から導出できる体験候補（タグ→体験の変換）

19タグ → 体験文の対応はベースとして安全（タグ付けは全1,032件レビュー済み・GO済みのため）。
例: animal_feed→「動物にえさやりをする」/ slide→「長いすべり台で遊ぶ」/ wide_space→「芝生で走り回る」。
ただし**タグ単独では根拠が弱いものは description/signature_experiences との照合を必須とする**（詳細ルールは facility-experience-candidates.md）。

## C. visits / 記録データが貯まれば出せる（第3弾・集計実装と同時）

- 滞在時間の目安（visits.stay_duration の mode）
- 混雑傾向（30件以上のみ・表現を和らげる）
- 年齢帯別の楽しめた傾向
- また行きたい率

→ 全て phase5-anonymous-stats.md の段階表示ルールに従う。**先行して枠を出さない**

## D. 公式確認がないと出してはいけない（第2弾・provenance連動）

| 情報 | 理由 | 出し方 |
|---|---|---|
| 授乳室・おむつ替えの有無 | 誤情報の実害が大きい（乳児連れの行動を左右） | 公式サイト確認→新フィールド+confirmed のみ表示 |
| ベビーカー可否・貸出 | 同上 | 同上 |
| 駐車場（有無・台数・料金） | 同上 | 同上 |
| 食事（レストラン/持込可/売店） | 同上 | 同上 |
| 予約の要否 | 「予約不要」と誤って書くと当日トラブル | 同上 |
| 営業時間・休業日 | 変動が激しい | 当面サイトに持たない（公式リンク誘導継続） |
| 料金の詳細（割引・年パス等） | 変動 | 同上 |

**絶対ルール**: これらは AI 推定・学習データからの補完を禁止（カンドゥー事件の教訓）。記入時は source_urls / source_checked_at / data_quality_status=confirmed が必須。

## E. 現時点で「要確認」とすべき・出さない情報

- 閉店・移転・休業状態（url未入力102件・invalid_address 202件はこの確認も未了）
- 季節営業の期間（プール開き等）
- 星評価・口コミ評価の引用（出典不明のものが description に混入している → **v2書き換え時に削除**。例: id145「星5.0」、id192「星4.5、口コミ高評価」）

## まとめ: フェーズと必要作業

| フェーズ | 必要なもの | スキーマ変更 |
|---|---|---|
| 第1弾: 体験候補+紹介文増強 | コンテンツ再編集（代表施設→展開）+ 表示テンプレート | なし |
| 第2弾: 子連れチェック | 新6フィールド + Sheets同期対応 + 公式確認フロー | あり（別仕様書） |
| 第3弾: 滞在時間・混雑等 | みんなの記録 集計実装 | なし（RPC追加） |
