# 山梨 データ品質 第2弾 実装仕様（判断系9件・確定値）

> 作成: 2026-06-13 / Claude Code PM（オーナー裁定済み・変更先は確定値）
> 前提: 第1弾（住所7件＋id110＋id105）は本番反映済み(36bc2cb)。**第2弾は反映＋検証まで・デプロイはPMレビュー後にオーナーGOで別指示**。
> スコープ: 判断系9件のみ。軽量13件（URL差替9・water_play追加3・id145要調査1）は「山梨軽量サブバッチ」として別タスク。
> 重要: 変更先はすべて下表の確定値。Codexは変更先を推測しないこと。

## A. カテゴリ違い 3件（category_id＋category＋recommended_for_tags を確定値へ）

| id | 施設 | category_id | category(表示名) | recommended_for_tags |
|---|---|---|---|---|
| 156 | 河口湖猿まわし劇場 | `experience` | 体験 | `["animal","experience"]` |
| 129 | 猫カフェMOCHA 甲府昭和店 | `experience` | 体験 | `["animal","animal_contact"]` |
| 111 | ハイジの村 | `theme-park` | 遊園地・テーマパーク | `["nature","character","animal_contact"]` |

- description / things_to_do は事実整合の範囲のみ（不整合があれば最小修正、新規創作はしない）。id111 の things_to_do は現行のままで整合（ハイジ世界観/花畑/動物ふれあい/観覧車）。
- **カテゴリ移動に伴い metadata.categories[].count を実態に合わせて再計算**すること（zoo −1 / art-museum −1 / indoor-play −1 / experience +2 / theme-park +1）。auditでカテゴリ整合を確認。

## B. recommended_for_tags 変更 4件（category は据え置き・tagsのみ確定値へ）

| id | 施設 | category(据え置き) | recommended_for_tags |
|---|---|---|---|
| 165 | 山中湖長池親水公園 | nature-park | `["nature","wide_space"]` |
| 161 | 河口湖自然生活館 | nature-park | `["nature","experience","food"]` |
| 148 | Sun Meadows Kiyosato | ski | `["playground","nature"]` |
| 147 | Fujiten Snow Resort | ski | `["playground","nature"]` |

- id161 は隣接の大石公園(別施設)と役割を混同しないこと（統合・流用しない）。

## C. id135 杜の8（重複統合・コンテンツ保全）

1. **先に id134 グランドメルキュール八ヶ岳へ things_to_do を移植**（id134 は現在 things_to_do 空）。移植元 id135 の有用項目: 「杜の8のキッズスペースで遊ぶ」「森のラウンジで休む」「天体ドームで星空に親しむ」。「雨の日にホテル内で遊ぶ」は汎用なので任意。ホテル内設備である旨が分かる表現に整える。
2. **杜の8が「外部利用可（日帰り/非宿泊者OK）」か公式で確認**する。
   - 外部利用可と確認できない場合（既定の想定）→ id135 を `data_quality_status="exclude_candidate"` に設定（visibleFacilitiesで自動非表示）。`source_notes` に「id134グランドメルキュール館内のキッズスペース・公式URL同一の分割登録のため非表示、ttdはid134へ移植」を記録。
   - 外部利用可と明確に確認できた場合 → **非表示にせず現状維持し、その旨を報告**（独立施設として残すかはPM/オーナー判断）。
3. id134 の住所・座標は第1弾で確定済み。第2弾では触らない。

## D. id149 R413どうし（things_to_do 鮮度修正・施設は残す）

- 現 things_to_do: ["オフロードバイクに挑戦する","バギーで道志村の自然を走る","小型バイクに乗る","コースを選んで走る"]
- **2026年1月以降休止中の二輪系（オフロードバイク・小型バイク）を外す**。公式サイトで**現行稼働が確認できる体験のみ**残す（バギー軸）。安全に3項目に満たなければ3項目でOK（下限なし・padding禁止）。
- 施設の非表示はしない。住所・座標は第1弾で確定済み・触らない。

## 検証（反映＋ここまで・デプロイしない）
- node scripts/audit-data-quality.mjs：カテゴリ整合（A群の再計算反映）・意図しない変動なし
- push-to-sheet → sync 往復 diff ゼロ
- npm run lint / npx tsc --noEmit / npm run build すべてPASS
- 差分サマリ: 変更id・変更フィールド一覧、対象9件＋id134（移植）＋metadata.categories(count再計算)以外に差分0
- スクショ: id156・id129・id111（カテゴリ反映）/ id134・id135（移植・非表示）/ id149（ttd更新）の詳細・該当カテゴリページ PC/SP で整合・崩れなし
- 杜の8外部利用可否の確認結果を報告

## 対象外（触らない）
- 軽量13件（URL差替・water_play・id145）、id163(NHR C群裁定別タスク)、第6バッチ、他県、第1弾で確定済みの住所/座標
- commit / デプロイ（PMレビュー後にオーナーGOで別指示）
