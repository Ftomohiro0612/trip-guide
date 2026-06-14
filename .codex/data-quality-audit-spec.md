# 県別データ品質監査レーン 共通仕様（監査のみ・修正は別タスク）

> 作成: 2026-06-13 / Claude Code PM（オーナー方針確定済み）
> 目的: 県単位でデータ品質を監査 → 指摘を構造化レポート化 → オーナーが修正GO/範囲調整/横展開を判断
> **このレーンは「監査＝指摘の洗い出し」まで。修正(facilities_data.json書換)は別タスクで、PMレビュー後に発注する**

## レーン順序（オーナー確定 2026-06-13）

1. exclude_candidate 4件 非表示化（別タスク・先行）
2. **山梨 監査（修正なし・本仕様の初回適用。ここで型を固める）**
3. 山梨 P0/P1 修正
4. 神奈川 監査（同じ型を横展開）
5. 神奈川 P0/P1 修正
6. 第6バッチ things_to_do 継続

- 山梨を先行する理由: 既に things_to_do が49施設入っており精度改善の効果が出やすい
- 神奈川は施設タイプが多様 → 山梨で監査・修正フォーマットを固めてから横展開

## スコープ（1県ぶん）

- 対象: 当該県（prefecture_id）の全施設
- **監査のみ。facilities_data.json は一切変更しない**。成果物はレポート2点のみ

## 成果物（県ごと）

1. `.codex/data-quality-<pref>-audit.md` — サマリ（県全体の件数、severity別集計、issue type別集計、重複・同名混同の所見、横展開時の注意）
2. `.codex/data-quality-<pref>-findings.json` — 指摘の構造化リスト

初回は `<pref>=yamanashi`。

## findings.json の各指摘に含めるフィールド（必須）

```json
{
  "facility_id": 0,
  "facility_name": "",
  "issue_type": "",          // 下記「監査観点」のいずれか
  "severity": "P0|P1|P2",
  "current_value": "",        // 現状の値（該当フィールドの抜粋）
  "recommended_fix": "",      // 推奨修正（断定せず候補として）
  "evidence_url": "",         // 根拠URL
  "official_source": true,    // 公式情報源か否か（true/false）
  "human_review_required": true // 人間確認が必要か（true/false）
}
```

## severity 定義（オーナー確定）

- **P0 = 公開リスク**: 誤った住所・別施設取り違え・閉業/移転の見落とし・事実誤認など、公開されると利用者に実害/誤誘導が生じるもの
- **P1 = 判断体験への影響**: カテゴリ違い・recommended_for_tags のズレ・公式URL欠落/誤り・data_quality_status不整合など、利用者の検索・判断を誤らせるもの
- **P2 = 表現品質改善**: description の薄さ・things_to_do の表現磨き・軽微な表記ゆれなど、品質向上系

## 監査観点（issue_type の候補）

各施設について以下を確認:

1. **住所(address)** — 実在性・都道府県/市区町村の整合・番地ズレ・観光圏で県を曲げていないか（確定原則: 実所在県を正）
   - **住所精度ルール（2026-06-13 オーナー追加・山梨監査の教訓）**: チェックは「市区町村が合っているか」ではなく、**「公式住所と番地・建物名レベルまで一致しているか」**で行う。
   - 市区町村のみ / 観光地名のみ（例「河口湖畔」）/ エリア名のみ（例「北杜市」）の住所は、**`issue_type: address_precision_issue` として必ず記録**する。
   - ただし**座標が公式施設位置と一致している場合は P0 ではなく P1 に落とす**（地図ピンは正しく、実害は表示精度のため）。座標も公式位置とズレている場合のみ P0。
2. **公式URL(url)** — 欠落/リンク切れ/別施設・別店舗を指していないか
3. **source_urls** — 根拠URLの妥当性・欠落
4. **data_quality_status** — confirmed/likely_ok/needs_web_check/exclude_candidate の妥当性（過大評価していないか）
5. **source_notes** — 根拠メモの有無・整合
6. **category / category_id** — 施設実態とカテゴリの一致（職業体験がplaygroundになっている等）
7. **recommended_for_tags** — 実態との整合・過不足
8. **things_to_do** — 事実誤り・禁止表現・量産臭（既存49件の精査含む）
9. **description** — 事実誤り・薄さ・他施設からの流用臭
10. **重複・同名混同** — 同一物理施設の二重登録、同名別施設の取り違え（例: 第5バッチで検出した id275 上千葉砂原公園 / id317 同 交通公園 のような分割登録）
11. **状態変化の横断チェック（休止・終了・閉鎖・移転・名称変更）** — ある体験/サービス/施設が「休止・終了・閉鎖・移転・名称変更」と判明したら、**1フィールドだけ直して終わらせない**。下記の全表示フィールドを横断で確認し、古い情報が残っていないか必ず洗う:
    - `description` / `signature_experiences` / `unique_selling_point` / `things_to_do` / 料金ラベル(`adult_fee` / `child_fee` 等) / `category`・`recommended_for_tags` / OGP・metaなどのSEO表示文 / `name`(名称変更時)
    - 修正時は `source_notes` に「いつ・何を・公式のどこで確認し、どのフィールドから除外したか」を残す。
    - **Why（id149 R413どうしの教訓 2026-06-13）**: 仕様Dを `things_to_do` の鮮度修正だけに限定したため、休止中の二輪系(オフロードバイク・小型バイク)が `description`/`signature_experiences`/`unique_selling_point`/料金ラベルに残り、デプロイ後も本番(＝meta descriptionにも出る)で宣伝され続けた。
    - **PM本番確認**: 「残すべき語句が有る」だけでなく「**消すべき語句が本番HTML・画面表示の両方に残っていない**」を grep で両面チェックする。Codexの「旧文言なし」報告は確認範囲依存なので鵜呑みにしない。

## 監査の進め方（Codex）

- 住所・URL・存在性は**公式情報源での確認を優先**（AI記憶での補完は禁止。住所はとくに公式URL確認必須＝住所確認ルールの教訓）
- 確認できないものは断定せず `human_review_required: true` とし、recommended_fix は候補に留める
- evidence_url は可能な限り公式（official_source=true）。二次情報しかない場合は official_source=false で明示
- 重複・同名混同は施設名・住所・座標の近接で機械検出してから個別精査

## レビュー・ゲート（PM）

- findings.json の構造妥当性・severity分類の妥当性をPMレビュー
- P0 は全件、P1 は重点、P2 はサンプル確認
- オーナーへ: severity別サマリを提示 → **修正GO / 修正範囲調整 / 神奈川へ横展開** を判断
- 修正は別タスク（P0/P1優先）として、住所修正は公式URL確認必須・座標も再ジオコードのルールを適用

## 横展開（神奈川以降）

- 本仕様の `<pref>` を差し替えて再利用
- 山梨の監査で見つかった「型の不足」（観点の追加・severity境界の調整）を本仕様に反映してから神奈川へ
