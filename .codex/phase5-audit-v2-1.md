# Phase 5: 監査スクリプト v2.1 + id 929 データ修正

> 作成: 2026-06-11 / Claude Code PM
> 前提: v2 (.codex/phase5-audit-v2.md) 実装済み
> 実行タイミング: タスク2（訪問記録詳細ページ）完了後

---

## タスクA: 監査スクリプト v2.1（コミット1）

対象: `scripts/audit-data-quality.mjs`

### A-1. invalid_address の10文字未満ルール撤廃

- 「address が10文字未満」での検出を**削除**する。
- invalid_address の検出条件を以下のみに絞る:
  - address が null / 空文字
  - FAKE_ADDRESS_PATTERNS（"各エリア", "都内", "アクセス", "近郊", "周辺"）を含む
  - 数字・「丁目」「番」「号」「番地」・ハイフン（- ‐ − ー の類）のいずれも含まない（＝番地情報が皆無）
- 「伊東市富戸1090」のような短いが正当な住所は検出しないこと。

### A-2. 長野県 bbox 経度下限の調整

- 上高地（lng 約137.65）が偽陽性になっているため、長野県の経度下限を 137.7 → **137.55** に変更。
- 変更後、上高地(id 173)が coord_pref_mismatch から消えることを確認。
- 埼玉3件（id 896, 898, 901）は bbox を変えずに残してよい（要確認対象として正当）。

### A-3. 再実行と報告

- `node scripts/audit-data-quality.mjs` を再実行し、JSON/Markdown レポートを再生成。
- invalid_address の新件数と coord_pref_mismatch の残件数を報告に含める。

コミットメッセージ: `fix: 監査v2.1 — invalid_address過剰検出解消・長野bbox調整`

---

## タスクB: id 929 データ修正（コミット2・別コミット必須）

対象: `data/facilities_data.json` の id=929

### 現状の問題

- name: 「アクアマリンふくしま→該当県外(参考)」 — メモ文字列が name に混入
- prefecture: 新潟県 — 誤り（実際は福島県いわき市の施設）

### 修正手順（カンドゥー事件の再発防止ルールに従う）

1. **住所は AI 推定で確定しない**。Nominatim で「アクアマリンふくしま」を検索し、公式所在地・座標を確認する:
   `https://nominatim.openstreetmap.org/search?q=アクアマリンふくしま&format=json&addressdetails=1`
2. 可能なら公式サイト（www.aquamarine.or.jp）の記載住所と突合する。
3. 確認できた場合のみ修正:
   - name: 「アクアマリンふくしま」（メモ文字列を除去）
   - prefecture: 「福島県」 + prefecture_id も整合させる（既存の prefecture_id 体系を確認すること）
   - address / latitude / longitude: Nominatim 確認値
   - geocode_source: "nominatim"
4. **確認できなかった場合は修正せず**、needs_web_check のまま PM に報告する。
5. 注意: 福島県は対象9県外の可能性がある。データセットの県構成（prefectures リスト）に福島県がない場合は、**修正せずに PM に判断を仰ぐ**（削除 or 県追加の判断は PM/オーナー）。

コミットメッセージ: `fix: id929 アクアマリンふくしま — 施設名メモ混入除去・所在地修正`

---

## 共通完了条件

- [ ] タスクA・Bは**別コミット**
- [ ] facilities_data.json の変更はタスクBのみ（タスクAでは変更禁止）
- [ ] `npm run lint` / `node scripts/audit-data-quality.mjs` 通過
- [ ] agmsg で memorips-claude に各タスクの結果（新件数・id929の確認ソースURL・commit hash）を報告
- [ ] デプロイは不要（データ・スクリプトのみ。本番反映は PM 確認後）
