# 施設データ取得プロセス監査（現状の棚卸しと問題点）

> 作成: 2026-06-11 / Claude Code PM（Fable 5 レビュー）
> 対象: facilities_data.json 1,031件・RESEARCH_METHODOLOGY.md・監査v2.1・過去インシデント

---

## 1. 現状の取得方法（棚卸し）

RESEARCH_METHODOLOGY.md（10ステップ）と git 履歴・.codex ログから復元した実態:

```
[収集]   WebSearch（県×カテゴリ×シーズン×沿線の網羅検索）
          + まとめサイト突合（いこーよ/mamasky/じゃらん/aumo 等）
          + 公的サイト（県公園課・市町村子育て/観光ページ・観光協会）
    ↓
[整形]   Claude が検索結果を 22列CSV に要約（住所・料金・対象年齢・説明文を含む）
    ↓
[反映]   append-to-sheet → Sheets(マスター) → sync-sheet → facilities_data.json → push-to-sheet(id書き戻し)
    ↓
[座標]   住所/施設名から Nominatim(686件)・Google(335件)・manual(10件) で取得
    ↓
[派生]   recommended_for_tags を AI 付与（.codex/recommended_for_tags_rules.md 準拠、2026-06-10 整備済み）
    ↓
[監査]   scripts/audit-data-quality.mjs（v2.1: 県名矛盾・bbox・invalid_address・説明文3分類・タグ矛盾）
    ↓
[反映]   npm run build（postbuild で sitemap 再生成）→ Vercel デプロイ
```

### 取得元の実態評価

| 情報源 | 現状の使われ方 | 評価 |
|---|---|---|
| 公式サイト | 収集時に参照することはあるが**項目ごとの確認は必須化されていない** | ⚠️ |
| 公的サイト（自治体・観光協会） | 収集の網羅性確保に使用 | ✅ 良い |
| まとめサイト（いこーよ等） | 突合・補完に使用。**住所・料金の確定根拠にもなり得てしまう** | ⚠️ |
| WebSearch 結果スニペット | 説明文・属性の主要ソース。**古い/閉店前情報を含み得る** | ⚠️ |
| AI 知識（学習データ） | 明示的には禁止されていなかった → **カンドゥー事件の原因** | ❌ |
| Nominatim / Google | 座標取得。geocode_source は全件記録済み | ✅ 良い |

## 2. 根拠の残存状況（メタ情報フィールド調査結果）

| フィールド | 保有件数 | 評価 |
|---|---|---|
| `geocode_source` | **1,031/1,031** | ✅ 座標の出所は全件追える |
| `url`（公式/参考URL） | 948/1,031（83件 N/A） | △ あるが「確認元」ではなく「参考リンク」扱い |
| `source_urls`（確認元URL） | **0/1,031** | ❌ 存在しない |
| `source_checked_at` / `verified_at`（確認日） | **0/1,031** | ❌ 存在しない。情報鮮度が追えない |
| `data_quality_status` | **0/1,031** | ❌ confirmed/needs_check の区別がない |

**結論: 座標以外は「いつ・どこで確認した情報か」が一切残っていない。** これがカンドゥー型事故（AI知識で住所確定）を検出不能にした構造的原因。

## 3. 取得方法の妥当性評価（リスク別）

| リスク | 現状 | 実害事例 |
|---|---|---|
| AI推定で住所・閉店・移転を確定 | 禁止ルールは2026-06-10にメモリ化したが**フロー文書に未統合** | カンドゥー（イクスピアリ旧店舗住所） |
| 除外メモ行の混入 | 収集CSVの作業メモがそのまま JSON 化される構造 | id929（削除済み）・**id734（本監査で発見・未対応）** |
| 県外施設の混入 | 県単位調査だが隣県施設が紛れる。prefecture は調査県名で機械的に付与 | id734: 茨城の施設が prefecture=千葉県 |
| 住所未確定のまま座標取得 | 手順上の順序強制なし。施設名で Nominatim 検索する運用も混在 | 埼玉3件の bbox 外れ（id896/898/901、要確認のまま） |
| 古い/閉店前情報 | 収集時のスニペット依存。再確認サイクルなし | 顕在化前（リスク） |
| まとめサイト情報の事実化 | 住所・料金がまとめサイト由来でも区別できない | 検出不能 |
| 監査と修正の混在 | テンプレート3で分離ルール化済み（2026-06-11） | 解消済み |
| sitemap の意図せぬ更新 | postbuild 挙動を既知制約に記録済み | 解消済み |

## 4. 既存1,031件の分類運用（全件再調査はしない）

新フィールド `data_quality_status` を導入し、**監査スクリプトで機械分類 → 必要なものだけ人/Webが確認**する:

| status | 条件（機械判定） | 件数の見込み |
|---|---|---|
| `confirmed` | source_urls + source_checked_at あり（今後の新規/修正分） | 0 → 増えていく |
| `likely_ok` | 監査で矛盾なし・url あり・座標 bbox 内 | 大多数 |
| `needs_web_check` | 監査 high/medium 検出（invalid_address・coord mismatch・thin description 等） | 数百 |
| `needs_human_review` | 自動判断不能（タグ妥当性・カテゴリ等） | 30〜 |
| `exclude_candidate` | 県外・閉店・参考行・重複 | id734 ほか |

既存データは「触らない・分類だけする」。修正は status 別に優先度を付けて別タスク化。

## 5. 監査スクリプト次期改善案（v3 候補）

1. **provenance_missing**: source_urls / source_checked_at 欠落の検出（新規・修正行のみ対象。既存は info）
2. **name_memo_pollution**: name に `→ / 参考 / 除外 / 要確認 / TODO / (削除` を含む行（id734型。今回手動 grep で1件発見）
3. **placeholder_fields**: address/url/description が `N/A・不明・各エリア` 等
4. **prefecture_id 整合**: prefecture ⇔ prefecture_id の対応表チェック
5. **out_of_scope_prefecture**: 対象9県以外の prefecture 値（または address 内の9県外県名）
6. **url_format**: url のドメイン形式チェック（http(s) 以外・明らかな検索結果URL）。404 検出はレート配慮で別バッチ
7. **water_play/pool 根拠**: description/signature_experiences に水遊び系語彙がないのにタグだけある場合を flag
8. **data_quality_status 集計**: status 別件数のレポート出力

## 6. 今回発見した重大データ汚染（NO-GO・PM判断待ち）

**id 734「牛久(うしく)アクアパラダイス→該当県外」**
- prefecture: 千葉県 / address: 「茨城」 / url: N/A / description: 「(削除-千葉県外のため重複登録回避)」
- id929 と同型の除外メモ行。茨城県は対象9県外
- **推奨対応: id929 と同様に削除**（再採番なし・欠番運用・監査再実行・sitemap 更新）
- ルールに従い本監査では修正していない
