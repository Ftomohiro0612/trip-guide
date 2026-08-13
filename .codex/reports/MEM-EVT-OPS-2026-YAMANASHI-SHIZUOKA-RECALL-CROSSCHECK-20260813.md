# MEM-EVT-OPS-2026-YAMANASHI-SHIZUOKA-RECALL-CROSSCHECK-20260813

- 確認日時: 2026-08-13T21:13:32+09:00（Asia/Tokyo）
- 対象: 指定された静岡県3候補のみ
- 判定基準: 公式一次情報で開催日、会場、料金、予約要否、現在の中止・延期告知を確認できた候補だけを追加する。公式記載のない条件は推測しない。

## 最終結果

### 1. 三嶋大祭り — 非追加

- 公式確認:
  - https://www.mishima-cci.com/maturi/
  - https://www.mishima-cci.com/maturi/view-point/
  - https://www.mishima-kankou.com/event/7541/
- 確認できた内容: 2026年8月15日～17日。三嶋大社大鳥居前、大通り、三嶋大社境内、大社～広小路間などで、山車・シャギリ、頼朝公旗挙げ行列、手筒花火、踊り等を実施。確認時点で2026年開催分の中止・延期告知なし。
- 非追加理由: 指定公式ページには一般観覧の料金と予約要否が明記されていない。無料・予約不要と推測せず、本Missionの確定条件を満たさないため追加しない。

### 2. 下田太鼓祭り（納涼花火大会を含む） — 非追加

- 公式確認:
  - https://www.shimoda-city.info/shimoda-taiko
- 確認できた内容: 下田太鼓祭りは8月14日・15日に下田旧町内で開催。納涼花火大会は2026年8月14日20:00～20:10、武ヶ浜埋立地（道の駅 開国下田みなと近く）。花火は荒天延期。確認時点で延期決定または中止告知なし。
- 非追加理由: 指定公式ページには一般観覧の料金と予約要否が明記されていない。無料・予約不要と推測せず、本Missionの確定条件を満たさないため追加しない。

### 3. 伊東温泉「夢花火」PART5～9・伊東温泉箸まつり花火大会 — 追加

- 追加ID: `evt-tier1-shizuoka-202608-01`
- 公式確認:
  - https://itospa.com/event/detail_10019.html
  - https://itospa.com/event/detail_10016.html
  - https://itospa.com/event/detail_54512.html
- 開催日: 2026年8月16日・21日・22日・23日・29日
- 時間: 20:30～20:50（8月22日は20:30～21:00）
- 会場: 伊東海岸。夢花火の主要観覧地点は伊東オレンジビーチ隣接のなぎさ公園、8月22日の箸まつり本会場は伊東オレンジビーチ。
- 料金・予約: 無料、事前予約不要。
- 中止・延期: 確認時点で告知なし。公式2026年一覧は開催予定として掲載中。
- ソース不整合の処理: 夢花火個別ページには曜日表記と8月22日のPART番号に誤記がある。開催日、曜日、PART番号、各時刻は同じ公式サイトの2026年全大会一覧を優先し、無料・予約不要・会場は夢花火個別ページ、箸まつり詳細は箸まつり個別ページで補完した。

## データ変更

- `data/events_data.json`: 1件追加。
- `metadata.total_events`: 1487から1488へ、今回の追加件数1だけ増加。
- `data/summer_events_2026.json`、`data/facilities_data.json`、`data/events-source-registry.json`: 変更なし。

注: 編集前から `metadata.total_events`（1487）と `events` 配列件数（1489）には2件の差がある。本Missionでは他データの修正を禁止されているため既存差異は解消せず、指定どおり今回の追加件数1だけを加算した。

## 検証

- `JSON.parse` による `data/events_data.json` の妥当性確認: GREEN
- 追加IDの一意性、`metadata.total_events`、追加レコード内容の確認: GREEN
- `npm run events:validate`: GREEN（errors 0）
- `npm run events:regular:validate`: GREEN（errors 0、unbaselined violations 0）
- 変更スコープ確認: `data/events_data.json` と本レポートのみ。指定された非スコープJSONは変更なし。
