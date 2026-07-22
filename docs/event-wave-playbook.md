# 通常イベント Coverage & Freshness Wave Playbook

> 正本化: 2026-07-22
> 対象: 夏祭り・花火を除く、都道府県別の家族・子ども向け通常イベント

## 1. 目的と境界

Waveの主目的は、既存情報の鮮度更新だけでなく、今後開催される公式確認済みイベントを増やすことです。

通常Waveの変更対象は原則`data/events_data.json`だけです。次を同じbranchへ混ぜません。

- `data/summer_events_2026.json`、Summer Map関連データ
- `data/facilities_data.json`
- UI、フィルター仕様、ページ構造
- 対象県以外のイベント

別ファイルが必要になった場合は実装を止め、理由と分離案を先に報告します。

## 2. Branchと責任範囲

### L2

調査、データ更新、validator、test、build、Preview、remote pushまでを行います。main統合やProduction反映は行いません。通常のデータ拡充ではOwner Review Packを作りません。

開始時:

```powershell
git fetch origin
git rev-parse origin/main
git status --short
git worktree list
```

最新`origin/main`から`codex/<prefecture>-regular-events-wave<n>-l2-<date>`を作成し、Base SHAを記録します。共有ルートがdirtyなら触らず、専用worktreeを使用します。

### L3

Ownerの`GO FOR EXACT HEAD`を受けた後だけ実施します。

1. `git fetch origin`
2. `origin/main`がOwner確認時のBaseと一致するか確認
3. 進んでいればGOは失効。最新mainへ追従し、差分と検証を再確認
4. 変わっていなければ`--ff-only`で統合
5. forceなしでmain push
6. `HEAD == main == origin/main == Exact HEAD`を確認
7. validator、回帰test、buildを再実行
8. 同一SHAのVercel Productionが`READY`、apex/wwwが同一deploymentへ昇格したことを確認
9. 公開aliasでPC/SP・JSON-LD・Crosslink・console・5xxをQA

## 3. 調査順序

公式一次情報を優先し、検索結果の抜粋だけで採用しません。

1. 科学館、博物館、美術館
2. 動物園、水族館
3. 大型公園、自然公園、自然体験施設
4. 子ども向け文化施設、公立ホール、劇場
5. 県・主要市のイベント情報
6. 既存掲載施設の公式イベント一覧

対象例は、企画展、特別展、工作、科学実験、生きもの観察、自然体験、バックヤードツアー、子ども講座、ステージ、ミュージカル、季節展示、期間限定体験です。

## 4. 採用・更新ルール

既存行は次を公式情報で再確認します。

- `start_date`、`end_date`、`occurrence_dates`
- `date_label`、`time_label`、`price_label`
- `reservation`、`reservation_label`
- `age_label`
- `facility_id`または`venue_name`
- `official_url`、`source_urls`
- `source_checked_at`、`source_notes`
- `scheduled`、`ongoing`、`ended`、`cancelled`

終了済みは`ended`、中止は`cancelled`。延期は公式に確定した新日程を反映します。

### 満員・受付終了

開催が公式確認できる限り除外しません。

```json
{
  "reservation": "required",
  "reservation_label": "満員"
}
```

または`受付終了`とします。公式記載のないキャンセル待ち、当日枠、追加募集は推測しません。満員を理由に`ended`や`cancelled`へ変更しません。

### HOLD

次は正本へ投入せず、完了報告に理由を残します。

- 開催日・会場・内容のいずれかが未確定
- 公式一次情報が確認できない
- 検索結果と公式ページの年度が一致しない
- 中止か開催か判断できない
- 公式詳細へ到達できず、時間・料金・予約条件等を確定できない

### 施設

- `facility_id`: `data/facilities_data.json`に実在し、会場が公式情報と一致するときだけ使用
- `venue_name`: 未登録会場の正式名称を使用
- 名称が似ているだけでは施設を推測しない
- `facility_id`と`venue_name`を同時設定しない

## 5. 重複防止とbaseline

最低限、次を確認します。

- event ID
- 公式URL＋各開催日
- 正規化タイトル＋公式URL＋各開催日
- 同一施設／会場＋正規化タイトル＋各開催日
- `occurrence_dates`を展開した既存イベント
- base通常イベント⇔Summer新規イベント

同一公式一覧URL・同日でも、タイトル、時間、内容が異なる場合だけ別イベントとして承認できます。承認理由はbaselineへ明記します。

```powershell
npm run events:regular:validate
npm run events:regular:test
```

通常イベントvalidatorは次を検査します。

- base・Summer内およびbase⇔SummerのID／意味的重複
- `facility_id`の実在、`facility_id`／`venue_name`の排他と必須性
- 開催日・`occurrence_dates`
- 公式URL、`source_urls`、確認日、source notes
- 満員・満席・受付終了と`reservation`の整合

判定は3層です。

- `approved_exceptions`: 別企画など根拠がある正当な例外
- `existing_violations`: 現行main由来の解消待ちdebt。新規行へコピーしない
- `unbaselined_violations`: 新規blocking。0でなければGREENにしない

baselineから消えた違反もstaleとしてblockingにし、解消済みdebtが例外一覧へ残り続けることを防ぎます。

通常Waveは原則`data/events_data.json`だけを変更します。ただし、登録済み`existing_violations`を解消する専用remediationでは、データ修正と対応baseline entryの削除を同一の原子的commitで行います。これは通常Waveへの無断baseline変更を許可するものではなく、PMが対象fingerprintと解消根拠を事前確認した場合だけ許可します。

`approved_exceptions`の追加、`existing_violations`の追加は通常Wave作業者が自己判断で行わず、PMレビュー対象とします。

## 6. L2検証

```powershell
npm run events:regular:validate
npm run events:regular:test
npm run events:validate
npm run events:filter:test
npm run crosslinks:test
npm run events:summer:test
npm run build
```

追加監査:

- sitemapに`/events/<prefecture>`と`/prefecture/<prefecture>`がある
- JSON-LD ItemList件数が表示件数と一致
- ID重複0、実イベントの未承認重複0
- 県外イベント、Summer、施設、UIの差分0
- `/events`、県イベントページ、県ページ、代表施設ページ
- PC/SP overflow 0、console error 0

Previewが認証保護され、変更がdata-onlyの場合は、認証付き配信HTML・JSON-LD確認と、同一Exact SHA・同一環境のproduction buildによるPC/SP QAを組み合わせられます。この例外は報告に明記し、Productionでは必ず公開aliasを実ブラウザ確認します。

## 7. 件数の定義

- 正本件数: `data/events_data.json`で対象県の全行
- 通常掲載対象: 製品のvisibility条件を通る通常イベント
- Summer合算: 県イベントページの実表示／JSON-LD ItemList件数
- ended件数: 正本の`status: "ended"`
- 施設紐付け: 対象県正本で`facility_id`が設定された行
- `venue_name`利用: `facility_id: null`かつ正式`venue_name`がある行

手計算だけに依存せず、production buildまたは公開ページのタイトル・JSON-LDで合算件数を確認します。

## 8. 完了報告テンプレート

### L2

- 既存更新、新規追加、ended、cancelled、延期
- 満員、受付終了
- HOLD件数と理由
- 更新前後の正本件数、通常掲載対象、Summer合算
- `facility_id`、`venue_name`
- 主要公式情報源
- 重複検査と承認例外
- Branch、Base SHA、Exact Final HEAD、ahead/behind、remote一致、working tree
- 変更ファイル、Preview URL／deployment SHA
- 全validator、test、build、sitemap、JSON-LD、PC/SP、console結果
- 県外、Summer、施設、UI差分0

### L3

- `HEAD == main == origin/main`
- Production deployment ID／URL／SHA／`READY`
- apex/wwwが同一deploymentへ昇格
- HTTP結果、公開alias QA、error/5xx logs
- `Production GREEN / COMPLETE / CLOSED`

## 9. 山梨・静岡・長野 3県レトロ

| 県 | Wave前→後の通常正本 | 現在掲載 | Summer合算 | ended |
|---|---:|---:|---:|---:|
| 山梨 | 36→44 | 36 | 47 | 8 |
| 静岡 | 31→49 | 38 | 48 | 10 |
| 長野 | 51→75 | 48 | 59 | 27 |

定着させる判断:

1. 既存更新だけで終わらず、新規追加をWaveの主成果に置く。
2. 同一公式一覧URLは重複の強いシグナルだが、別企画を自動削除しない。タイトル・時間・内容を確認し、例外理由を残す。
3. 満員・受付終了はイベント終了ではない。開催確認と予約状態を分ける。
4. HOLDを正本と分離すると、件数目標に引っ張られた不確定情報の投入を防げる。
5. dirtyな共有ルートを避け、専用worktreeとExact HEADでL2/L3を分離する。
6. Preview認証保護はdata-only L2では代替QAを明記できるが、Production公開aliasの実ブラウザQAは省略しない。
7. 件数は正本・通常掲載・Summer合算を分け、JSON-LDを最終表示の根拠にする。
8. 現行Summer中心validatorだけでは通常イベントの意味的重複を防げないため、最小validatorとbaselineをbuild gateに置く。
