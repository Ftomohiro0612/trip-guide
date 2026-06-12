# Sheets 同期 provenance 4列対応 仕様書

> 作成: 2026-06-12 / Claude Code PM
> 前提設計: `.codex/facility-provenance-schema.md`（4フィールドの定義・運用ルール）
> 状態: オーナーGO済み（2026-06-12）/ Codex 実装待ち

## 目的

今後の新規・修正施設で provenance 4フィールドを Sheets ⇄ JSON 同期で扱えるようにする。

| 列名（シート見出し = キー名そのまま） | JSON フィールド | 型 |
|---|---|---|
| `source_urls` | `source_urls` | string（カンマ区切りURL） |
| `source_checked_at` | `source_checked_at` | string YYYY-MM-DD |
| `data_quality_status` | `data_quality_status` | enum: confirmed / likely_ok / needs_web_check / needs_human_review / exclude_candidate |
| `source_notes` | `source_notes` | string |

## スコープ

### やること

1. **`types/facility.ts`**: `Facility` に4フィールドを **optional** で追加（`data_quality_status` は union 型で）
2. **`scripts/sync-from-sheet.ts`**:
   - `CsvRow` に4列追加、`mergeRow` で setIf 反映
   - **空セルは「フィールド未設定のまま」**にする（空文字 `""` を JSON に書き込まない。既存の setIf が空値スキップならそのまま流用）
   - `data_quality_status` が enum 外の値なら **warning を出して該当フィールドをスキップ**（行ごと落とさない）
   - `source_checked_at` が `YYYY-MM-DD` 形式でなければ warning（値は保持してよい）
3. **`scripts/push-to-sheet.ts` / `scripts/export-to-csv.ts` / `scripts/append-to-sheet.ts`**:
   - ヘッダー配列の**末尾**に4列追加（既存22列の順序は変えない → 26列）
   - 値はフィールド未設定なら空文字
4. **シート「全件一覧」のヘッダー行**: push-to-sheet 実行でヘッダーが26列に更新されることを確認（ヘッダーを書かない実装なら手動追加手順を報告に含める）

### やらないこと（重要）

- **既存1,030件への data_quality_status 機械付与はしない**（別タスク・PM判断待ち）
- 既存データの値変更はしない。今回の同期対応で JSON に入ってよい差分は**ゼロ**（既に JSON 直編集済みの埼玉3件の4フィールドが、push → sync の往復で消えたり変質したりしないこと）
- 監査v3第2弾（provenance チェック #5〜#9）は別タスク
- フロントエンド表示は変更しない（additive フィールドで表示影響なし）

## 完了条件（オーナー補足 2026-06-12 反映・報告必須）

1. **source_urls の扱い**
   - カンマ区切り string として扱う
   - 各URLは trim する
   - 空要素は無視する
2. **warning 出力**
   - `data_quality_status` が enum 外: **施設ID・施設名・不正値**を warning に出し、該当フィールドはスキップ
   - `source_checked_at` が YYYY-MM-DD 形式でない: **施設ID・施設名・値**を warning に出す。値は保持してよい
3. **ヘッダー確認**
   - シートの列数が26列
   - 末尾4列が `source_urls` / `source_checked_at` / `data_quality_status` / `source_notes` の順
   - 既存22列の順序が変わっていないこと
4. **差分確認（往復テスト）**: `push-to-sheet` → `sync-sheet` 実行後に
   - `git diff -- data/facilities_data.json` が**空**であること
   - 総施設数が 1,030 件のまま
   - id896 / id898 / id901 の4フィールドが JSON とシート双方で保持されていること
5. **スコープ外確認**
   - 既存1,030件への data_quality_status 機械付与をしていないこと
   - フロントエンド表示変更をしていないこと
6. `npm run lint` / `npx tsc --noEmit` / `npm run build` PASS
7. **デプロイ不要**
8. 完了報告に含めるもの: 変更ファイル一覧 / 実行コマンド / 往復テスト結果 / warning 件数 / commit hash

## 注意

- 認証は `data/.gcp-sheets-credentials.json`（gitignore済）。agmsg にシークレットを貼らない
- 実行前に `data/facilities_data.json` のバックアップが自動取得されることを確認（既存の .bak 機構）
