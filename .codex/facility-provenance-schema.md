# 施設データ 根拠管理（provenance）スキーマ設計

> 作成: 2026-06-11 / Claude Code PM（Fable 5 設計レビュー）
> 状態: 設計のみ。facilities_data.json への適用は新規・修正分から段階導入

---

## 結論（MVP設計）

**施設単位で4フィールドのみ追加**する。項目単位（住所だけのsource等）は MVP では持たない。

```json
{
  "id": 1234,
  "name": "○○こども公園",
  "...既存フィールド...": "...",

  "source_urls": "https://www.city.example.lg.jp/park/123.html, https://example-park.jp/",
  "source_checked_at": "2026-06-11",
  "data_quality_status": "confirmed",
  "source_notes": "料金は公式に記載なし・自治体ページの2026年4月時点情報"
}
```

| フィールド | 型 | 必須 | 内容 |
|---|---|---|---|
| `source_urls` | string（カンマ区切り） | confirmed なら必須 | 確定根拠に使ったURL。**先頭を最重要ソース（公式/自治体）にする** |
| `source_checked_at` | string YYYY-MM-DD | confirmed なら必須 | 最後に確認した日。情報鮮度の管理用 |
| `data_quality_status` | enum | 全件（段階導入） | confirmed / likely_ok / needs_web_check / needs_human_review / exclude_candidate |
| `source_notes` | string | 任意 | 確認時の補足（「料金は公式記載なし」等）。なければ省略可 |

### 既存フィールドとの関係

- `url`（既存・948件）: **「ユーザーに見せる公式サイトリンク」として継続**。確認根拠は source_urls に分離（同じURLでもよい）。`official_url` への改名は同期スクリプト・表示コードへの影響が大きいため**しない**
- `geocode_source`（既存・全件）: 座標の根拠として継続。変更なし
- `needs_web_check` / `needs_human_review`: **データ本体には持たせない**。`data_quality_status` の値として表現（監査レポート側の同名フラグはレポート専用のまま）

## 設計判断の理由

### 施設単位 vs 項目単位

| | 施設単位（採用） | 項目単位（将来） |
|---|---|---|
| Sheets 同期 | 4列追加で済む（22→26列） | 列爆発（15項目×2で+30列）または JSON ネストで Sheets 表現不能 |
| Codex の更新しやすさ | 1行直すだけ | 構造化編集が必要・ミス増 |
| JSON サイズ | +5%程度 | +30%超 |
| 粒度 | 「この施設はいつ・どこで確認したか」 | 「住所はA、料金はB」まで追える |

施設単位で粒度が足りないケース（住所は公式・料金は未確認等）は **source_notes に文章で残す**。これで実用上の95%をカバーできる。

### 将来版（Phase 5+ / Supabase 移行時に再検討）

```json
"provenance": {
  "address":  { "url": "https://...", "checked_at": "2026-06-11" },
  "fee":      { "url": "https://...", "checked_at": "2026-06-11" },
  "closure":  { "url": null, "checked_at": null }
}
```

- 項目単位が本当に必要になるのは B2B レポート提供時（データの監査可能性が商品価値になる段階）
- Supabase 移行時は `facility_sources` テーブル（facility_id × field × url × checked_at）に正規化する方が筋が良い

## 導入手順（段階）

1. **今後の新規・修正分から4フィールドを必ず付ける**（research-workflow §A-4 / §B-2 に規定済み）
2. Sheets に4列追加（append-to-sheet / sync-sheet / push-to-sheet の22列定義の拡張が必要 — 別タスク・Codex）
3. 既存1,030件は **status のみ機械付与**（facility-data-quality-status-policy.md 参照）。source_urls の遡及調査はしない
4. 監査v3で provenance チェックを追加（facility-audit-v3-provenance-plan.md）

## 互換性チェックリスト

- [ ] フィールド追加は additive — 既存の表示コード（page.tsx 等）は未知フィールドを無視するため**表示影響なし**
- [ ] sync-sheet / push-to-sheet の列マッピング更新が必要（実装タスク化のこと。更新まで新フィールドは JSON 直編集運用）
- [ ] 監査スクリプトは新フィールド欠落を「既存=info / 新規修正=high」で区別（v3で対応）
