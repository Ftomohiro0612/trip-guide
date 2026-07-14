# Summer Festivals & Fireworks Hub 2026 v1 — Integrated Owner Review

基準データfreeze: 2026-07-14（JST）

Track: `Summer Festivals & Fireworks Hub 2026 v1`

Track正式状態: **OPEN / RESEARCH ADOPTED / IMPLEMENTATION GO / PRODUCTION HOLD**

Review package: **D / H / N COMPLETE / INTEGRATED OWNER REVIEW**

## 1. Executive decision request

D / H / N実装、ローカルProduction build、PC/SP受入、Codex Diff Auditまで完了した。Ownerへ次の統合候補を提出する。

| 判定対象 | 実装候補 |
|---|---:|
| Research採用母集団 | 57件 |
| 2026-07-14 freeze後の掲載候補 | 57件 |
| Research上の主役 | 43件 |
| Research上の既存補助 | 14件 |
| 分類上の花火 / 夏祭り | 24件 / 24件 |
| 分類上の伝統 / 夜のおでかけ | 3件 / 6件 |
| Hero優先候補プール | 12件 |
| 今回の新規イベントレコード | 41件 |
| 既存イベントへの分類付与 | 16件 |
| `facility_id=null` | 41件 |
| `occurrence_dates` 使用 | 9件 |

Owner判定依頼は「この実装候補をProduction前候補として採用するか」。採用後も、以下は別GOまで実行しない。

- main反映
- Production deploy
- scheduled Production workflowの有効化
- hot memory更新
- 所有権返却
- release branch削除
- Phase C再開

57件は公開件数の固定値ではない。Production直前に再freezeし、終了・中止・延期・鮮度切れを除外して件数と比率を再計算する。

## 2. Owner条件への回答

| Owner条件 | 実装 / gate |
|---|---|
| 年付きHub ID | `feature_hubs: ["summer-2026"]` だけで抽出。年度非依存booleanは不使用 |
| 独立ページ | `/events/summer` を実装。花火・夏祭りを先に、伝統・夜のおでかけを別枠に表示 |
| Hero候補プール | 承認済み12件を優先し、今日以降の次回開催日順で4花火＋4夏祭りを表示。終了・鮮度切れ時だけ主役候補から補充 |
| PC/SP導線 | 全ページ共通Headerに1タップ導線。トップHero直下に大型CTA |
| 終了制御 | 共通`startsAt` / `endsAt`、fail-closed runtime hard stop、通常導線との同寸slotを実装 |
| null施設 | `facility_id=null`なら`venue_name`必須。visibility、カード、施設リンク、汎用一覧、都県一覧、JSON検証を対応 |
| 鮮度 | Hub 14日、Hero・7日以内開催は7日、荒天影響の直前は1日。未確認の一括日付更新を行わない |
| 無料 / 予約不要 | 明示ラベルと値を相関検証。有料席併存は一般無料観覧方法を明記した時だけ`is_free=true` |
| `endsAt` | 最終候補の最大終了日2026-09-27から、排他的翌日 `2026-09-28T00:00:00+09:00` を算出 |
| scheduled redeploy | 実行時hard stopは実装済み。Production scheduleの作成・有効化はHOLDのまま |

## 3. 最終構成と比率

Research上の「主役43 / 補助14」は編集上の役割である。補助14件のうち施設型花火・夏祭り5件にも分類上は`fireworks`または`summer_festival`を付けるため、分類比率では主役型48件となる。

| 指標 | 件数 | 比率 |
|---|---:|---:|
| 花火大会 | 24 | 42.1% |
| 夏祭り・盆踊り | 24 | 42.1% |
| 花火＋夏祭り | 48 | 84.2% |
| 縁日・灯籠・風鈴 | 3 | 5.3% |
| 夜のおでかけ | 6 | 10.5% |
| 合計 | 57 | 100% |

夜のおでかけは20%以下、花火＋夏祭りは70%以上のgateを通過した。動物園・水族館の夜間開園は主役セクションと混在しない。

| 都県 | 花火 | 夏祭り | 伝統 | 夜 | 合計 |
|---|---:|---:|---:|---:|---:|
| 東京 | 6 | 8 | 1 | 1 | 16 |
| 神奈川 | 6 | 5 | 1 | 3 | 15 |
| 千葉 | 6 | 5 | 0 | 1 | 12 |
| 埼玉 | 6 | 6 | 1 | 1 | 14 |

各都県の「5花火・5夏祭り」強い目標を一次情報の弱い候補で水増しせず達成した。

## 4. D — データと型

### データ配置

- `data/events_data.json` は変更していない。既存766件と既存LIVE 16件を維持する
- Hub候補は `data/summer_events_2026.json` に分離した
- 新規41件を実レコードとして追加し、既存16件は分類・非連続日・一次情報補正だけを重ねる
- `evt-1009-202607-01` 森のサマースクールは明示的除外IDで、Hub分類を付けない

### 採用フィールド

```ts
type FeatureHubId = "summer-2026";

type SummerEventType =
  | "fireworks"
  | "summer_festival"
  | "summer_tradition"
  | "night_outing";

type EventItem = {
  facility_id: number | null;
  venue_name?: string;
  event_type?: SummerEventType;
  feature_hubs?: FeatureHubId[];
  occurrence_dates?: string[];
};
```

`occurrence_dates` があるイベントは、次回日・今週末・月判定を実開催日だけで行う。`start_date`〜`end_date`の全日を連続開催と誤認しない。

### null施設

- 41件すべてに実会場名を設定
- visibilityは「有効な既存施設ID」または「null施設＋空でない会場名」のどちらかで通過
- EventCardは会場名を表示し、架空施設リンクや「施設ページ準備中」を出さない
- 都県別一覧はイベント自身の`prefecture`で掲載
- 「いつもの場所」はnull施設を安全に除外
- Event JSON-LDは`venue_name`を`Place.name`へ出力

## 5. H — `/events/summer`

- Next.js 16の`connection()`でrequest-time基準日を取得し、終了イベントと鮮度切れを動的に除外
- `feature_hubs`が`summer-2026`のイベントだけを抽出
- 次回開催日の近い順
- 花火、夏祭り、伝統、夜のおでかけの4分類
- Heroは優先12件プールを先に使い、プール不足時だけ承認済み主役候補で補充
- 都県、今週末、無料、予約不要、分類のclient filter
- canonical、metadata、Event ItemList JSON-LD、パンくずJSON-LD、sitemap対象を追加
- 汎用`/events`にも掲載し、独立ページではHub対象だけを表示

### フィルター固定ルール

- 無料: `is_free=true`かつ、一般観覧・沿道観覧・入場等の正式な無料方法を`price_label`へ明記
- 有料席併存: 無料の一般観覧方法と有料席を同じラベルで区別
- 予約不要: `reservation=not_required`かつ「予約不要」「自由参加」「事前予約なし」に相当する明示ラベル
- 条件不明は`true` / `not_required`へ推測変換しない

2026-07-14 freezeで、無料23件、予約不要25件。

## 6. N — トップ / PC / SP導線

- トップHero直下に大型の「夏祭り・花火大会2026」CTA
- CTA内に今週末、花火、夏祭りの直リンク
- PC Headerは通常「イベント一覧」と季節「🎆 夏祭り・花火」を同じslotで切替
- SP Headerは通常「🎪 イベント」と季節「🎆 夏祭り・花火」を同じslotで切替
- SPは新規ハンバーガーを使わず、トップ以外から1タップで到達
- 汎用`/events`にも夏Hubバナーを追加

## 7. Hybrid終了制御

共通設定:

```text
startsAt = 2026-07-14T00:00:00+09:00
endsAt   = 2026-09-28T00:00:00+09:00  # 排他的、9/27終了から再算定
```

runtime hard stopは次の構成。

1. server HTMLにはactive属性を出さずfail-closedにする
2. CSS既定で季節要素を不可視・操作不能にする
3. 同じ設定を読む`beforeInteractive` guardが期間内だけ`data-summer-2026-active=true`を付与する
4. 開いたまま終了時刻を跨ぐ場合もtimerが排他的終了時刻で属性を外す
5. HeaderとトップCTAは季節panelと通常panelを同じCSS Gridセルへ重ね、非表示panelも寸法を予約する
6. 切替は`visibility`と`pointer-events`だけで行い、外形寸法を変えない

境界シミュレーションは、開始1ms前inactive、開始時active、終了1ms前active、終了時inactive、終了1ms後inactiveでPASSした。

正規運用は予定redeployで通常HTML・SEO・sitemapを正式復帰させる。runtimeは失敗時の安全弁。scheduled Production workflowはOwner最終GOまで追加・有効化していない。

## 8. ソース再確認と運用

### 2026-07-14確認

- 57件すべてに行単位の`source_checked_at=2026-07-14`と`source_notes`を保持
- 57件の`official_url`を再到達監査し、57/57でHTTP 200
- 到達監査は意味内容の代替ではなく、Researchで確認した一次情報と行単位確認日の補助証跡
- HTTPS接続を拒否する主催者2サイトは、同じ主催者の到達可能なHTTP正規ページへ補正: 富岡八幡宮、阿佐谷商店街振興組合

Owner指定3件のsource順:

| 催事 | `official_url`第一候補 | 補助source |
|---|---|---|
| 神楽坂まつり | 神楽坂通り商店会 | GO TOKYO |
| 深川八幡祭り | 富岡八幡宮 | GO TOKYO、江東区観光協会 |
| みなとみらい大盆踊り | パシフィコ横浜 | 横浜市観光情報 |

### 定期再確認gate

- 全Hub: 14日周期
- Heroまたは次回開催が7日以内: 7日以内
- 花火・夏祭りの開催前日〜当日: 1日以内
- 荒天イベントは次回開催前日を次の確認期限として前倒し
- `npm run events:summer:audit -- --today=YYYY-MM-DD`で行単位の期限を出す
- `npm run events:summer:freeze -- --today=YYYY-MM-DD`で終了・中止・延期・鮮度をRelease gateにする
- sourceを実際に開いて確認した行だけ`source_checked_at`を更新し、一括更新は禁止

2026-07-14 freezeの次回期限は2026-07-15。Production GO前に期限到来行を個別再確認し、再freezeする。

## 9. QA / preview証跡

### 自動検証

| 検証 | 結果 |
|---|---|
| `npm run events:summer:freeze -- --today=2026-07-14` | PASS、57件、errors 0、warnings 0 |
| `npm run events:validate -- --today=2026-07-15` | PASS、errors 0、warnings 0 |
| `npx tsc --noEmit` | PASS |
| `npm run lint` | PASS（既存`audit-facility-quality.mjs`の未使用変数warning 1件のみ） |
| `git diff --check` | PASS |
| `npm run build` | PASS、Next.js 16.2.4、2279 static pages、`/events/summer` dynamic |
| official URL reachability | 57/57 HTTP 200 |

### ローカルProduction preview

`next start`をProduction buildに対して起動し、Chrome実ブラウザで確認した。

| 観点 | PC 1280×900 | SP 375×812 |
|---|---|---|
| `/events/summer` | 57 cards、横overflow 0 | 横overflow 0 |
| 分類 | 24 / 24 / 3 / 6 | 同一DOM構成 |
| Hero | 12件プールから4花火＋4夏祭り | 同一選出 |
| Header季節導線 | 季節表示、通常fallback不可視 | 1タップ導線、40px高 |
| トップ大型CTA | 1120×237 | 324×345 |
| 通常fallback panel | 季節panelと1120×237で同寸 | 季節panelと324×345で同寸 |
| Header fallback panel | 季節panelと130×32で同寸 | 季節panelと104×40で同寸 |
| filter touch target | 11 filters動作 | 全11件40px高 |
| null施設 | 41 cards、準備中表示0 | 同一 |

Mobileの`/events/tokyo`からHeader季節リンク1回のclickで`/events/summer`へ遷移することを確認した。

フィルター実測（2026-07-14基準）:

| 条件 | 表示件数 |
|---|---:|
| 花火 | 24 |
| 東京 | 16 |
| 今週末 | 11 |
| 無料 | 23 |
| 予約不要 | 25 |

汎用一覧のnull施設対応:

- `/events`: 603件 = 従来562件 + 新規41件、うちnull施設41件
- `/events/tokyo`: 49件 = 従来37件 + 新規12件
- null施設に施設リンクや「施設ページ準備中」を出さない

## 10. Diff Audit

| 範囲 | 主な差分 |
|---|---|
| data | 年付きHub候補JSON 1ファイル追加。`data/events_data.json`は不変 |
| model / visibility | nullable施設、会場名、分類、Hub、非連続日、Hero / freshness selector |
| page | `/events/summer`、filters、Hero、JSON-LD、metadata |
| navigation | top CTA、PC/SP Header、`/events`バナー、期限slot |
| card / list | null施設会場表示、施設リンク抑止、都県/汎用一覧反映 |
| validation | build前JSON相関、freeze、件数・比率・鮮度・`endsAt`検証 |
| SEO | sitemap configに`/events/summer`、JSON-LDの`<` escape強化 |

既存766件は新フィールド未設定のまま表示互換を維持する。新規41件は汎用イベント母集団へmergeされるが、Productionへは未反映。
`public/sitemap-0.xml`の大きな行差分はpostbuildによる全URLの`lastmod`再生成と`/events/summer`追加だけの機械差分で、既存routeの削除はない。

## 11. 残HOLDとRelease gate

Owner採用後、Production GO前に次を行う。

1. 期限到来sourceを行単位で再確認
2. 中止・延期・終了を除外し、freeze件数・構成比・`endsAt`を再算定
3. Heroプールの有効件数と4花火＋4夏祭り選出を再確認
4. Hosted previewが得られる場合は同じPC/SP / hard-stop / filter QAを再実行
5. scheduled終了redeployのworkflowをレビューし、Owner GO後にだけ有効化
6. 正規ドメインProduction deployは別Owner GOで実行

## Appendix A — 採用イベント57件

「主役 / 補助」はResearch上の編集役割。「花火 / 夏祭り / 伝統 / 夜」はHub分類。

| ID | 催事 | 都県 | 分類 | 開催日 | 役割 | データ / Hero |
|---|---|---|---|---|---|---|
| `evt-685-202607-02` | サマーナイトファーム | 千葉 | 花火 | 2026-07-18〜2026-08-30 | 補助 | 既存 |
| `evt-summer-2026-chiba-001` | 幕張ビーチ花火フェスタ2026 | 千葉 | 花火 | 2026-08-01 | 主役 | 新規 / Hero候補 |
| `evt-summer-2026-chiba-002` | 市川市民納涼花火大会 | 千葉 | 花火 | 2026-08-01 | 主役 | 新規 |
| `evt-summer-2026-chiba-003` | 松戸花火大会2026 | 千葉 | 花火 | 2026-08-01 | 主役 | 新規 |
| `evt-summer-2026-chiba-004` | 手賀沼花火大会2026 | 千葉 | 花火 | 2026-08-01 | 主役 | 新規 |
| `evt-summer-2026-chiba-005` | 第79回木更津港まつり花火大会 | 千葉 | 花火 | 2026-08-15 | 主役 | 新規 / Hero候補 |
| `evt-674-202607-02` | トワイライトZOO | 千葉 | 夜 | 2026-07-25〜2026-08-23 | 補助 | 既存 |
| `evt-summer-2026-chiba-006` | 第72回茂原七夕まつり | 千葉 | 夏祭り | 2026-07-24〜2026-07-26 | 主役 | 新規 / Hero候補 |
| `evt-summer-2026-chiba-007` | やっさいもっさい踊り大会 | 千葉 | 夏祭り | 2026-08-14 | 主役 | 新規 |
| `evt-summer-2026-chiba-008` | 第51回千葉の親子三代夏祭り | 千葉 | 夏祭り | 2026-08-15〜2026-08-16 | 主役 | 新規 |
| `evt-summer-2026-chiba-009` | 第19回あびこカッパまつり | 千葉 | 夏祭り | 2026-08-29 | 主役 | 新規 |
| `evt-summer-2026-chiba-010` | 2026柏まつり | 千葉 | 夏祭り | 2026-09-19〜2026-09-20 | 主役 | 新規 |
| `evt-774-202607-01` | 花火シンフォニア（2026年夏） | 神奈川 | 花火 | 2026-07-18〜2026-09-22 | 補助 | 既存 |
| `evt-summer-2026-kanagawa-001` | 湯河原温泉海上花火大会 | 神奈川 | 花火 | 2026-08-03 | 主役 | 新規 |
| `evt-802-202608-01` | 第52回金沢まつり花火大会 | 神奈川 | 花火 | 2026-08-22 | 主役 | 既存 |
| `evt-summer-2026-kanagawa-002` | みなとみらいスマートフェスティバル2026 | 神奈川 | 花火 | 2026-08-24 | 主役 | 新規 / Hero候補 |
| `evt-summer-2026-kanagawa-003` | 第53回相模原納涼花火大会 | 神奈川 | 花火 | 2026-09-05 | 主役 | 新規 / Hero候補 |
| `evt-summer-2026-kanagawa-004` | よこすか開国花火大会2026 | 神奈川 | 花火 | 2026-09-27 | 主役 | 新規 |
| `evt-771-202608-01` | ナイトズーラシア | 神奈川 | 夜 | 2026-08-01〜2026-08-30 | 補助 | 既存 |
| `evt-772-202608-03` | ナイトのげやま2026 | 神奈川 | 夜 | 2026-08-01〜2026-08-30 | 補助 | 既存 |
| `evt-773-202608-01` | ナイト金沢ZOO | 神奈川 | 夜 | 2026-08-01〜2026-08-30 | 補助 | 既存 |
| `evt-904-202607-01` | 第20回 辻堂かいひん盆踊り「辻の盆」 | 神奈川 | 夏祭り | 2026-07-18〜2026-07-19 | 主役 | 既存 |
| `evt-summer-2026-kanagawa-005` | 茅ヶ崎海岸浜降祭 | 神奈川 | 夏祭り | 2026-07-20 | 主役 | 新規 / Hero候補 |
| `evt-summer-2026-kanagawa-006` | 湯河原やっさまつり | 神奈川 | 夏祭り | 2026-08-02〜2026-08-03 | 主役 | 新規 |
| `evt-summer-2026-kanagawa-007` | 第74回橋本七夕まつり | 神奈川 | 夏祭り | 2026-08-07〜2026-08-09 | 主役 | 新規 |
| `evt-summer-2026-kanagawa-008` | 第17回みなとみらい大盆踊り | 神奈川 | 夏祭り | 2026-08-28〜2026-08-29 | 主役 | 新規 |
| `evt-816-202608-01` | 江の島灯籠2026（江の島サムエル・コッキング苑会場） | 神奈川 | 伝統 | 2026-08-01〜2026-09-23 | 補助 | 既存 |
| `evt-494-202607-01` | メッツァの北欧花火2026 | 埼玉 | 花火 | 2026-07-18〜2026-09-22 | 補助 | 既存 |
| `evt-summer-2026-saitama-001` | 越谷花火大会 | 埼玉 | 花火 | 2026-07-25 | 主役 | 新規 |
| `evt-summer-2026-saitama-002` | さいたま市花火大会 大和田公園会場 | 埼玉 | 花火 | 2026-07-25 | 主役 | 新規 |
| `evt-summer-2026-saitama-003` | 第73回戸田橋花火大会 | 埼玉 | 花火 | 2026-08-01 | 主役 | 新規 / Hero候補 |
| `evt-summer-2026-saitama-004` | さいたま市花火大会 東浦和大間木公園会場 | 埼玉 | 花火 | 2026-08-08 | 主役 | 新規 |
| `evt-summer-2026-saitama-005` | さいたま市花火大会 岩槻文化公園会場 | 埼玉 | 花火 | 2026-08-22 | 主役 | 新規 |
| `evt-526-202607-01` | サマーナイトZOO 2026 | 埼玉 | 夜 | 2026-07-18〜2026-08-30 | 補助 | 既存 |
| `evt-summer-2026-saitama-006` | 与野夏祭り | 埼玉 | 夏祭り | 2026-07-18〜2026-07-19 | 主役 | 新規 |
| `evt-summer-2026-saitama-007` | 秩父川瀬祭 | 埼玉 | 夏祭り | 2026-07-19〜2026-07-20 | 主役 | 新規 |
| `evt-summer-2026-saitama-008` | 熊谷うちわ祭 | 埼玉 | 夏祭り | 2026-07-20〜2026-07-22 | 主役 | 新規 / Hero候補 |
| `evt-summer-2026-saitama-009` | 第45回川越百万灯夏まつり | 埼玉 | 夏祭り | 2026-07-25〜2026-07-26 | 主役 | 新規 / Hero候補 |
| `evt-summer-2026-saitama-010` | 第43回朝霞市民まつり「彩夏祭」 | 埼玉 | 夏祭り | 2026-07-31〜2026-08-02 | 主役 | 新規 |
| `evt-summer-2026-saitama-011` | 狭山市入間川七夕まつり | 埼玉 | 夏祭り | 2026-08-01〜2026-08-02 | 主役 | 新規 |
| `evt-481-202606-01` | 川越氷川神社 縁むすび風鈴 | 埼玉 | 伝統 | 2026-06-27〜2026-09-06 | 補助 | 既存 |
| `evt-summer-2026-tokyo-001` | 第49回隅田川花火大会 | 東京 | 花火 | 2026-07-25 | 主役 | 新規 / Hero候補 |
| `evt-summer-2026-tokyo-002` | 立川まつり国営昭和記念公園花火大会 | 東京 | 花火 | 2026-07-25 | 主役 | 新規 |
| `evt-summer-2026-tokyo-003` | 第60回葛飾納涼花火大会 | 東京 | 花火 | 2026-07-28 | 主役 | 新規 / Hero候補 |
| `evt-summer-2026-tokyo-004` | 第51回江戸川区花火大会 | 東京 | 花火 | 2026-08-01 | 主役 | 新規 |
| `evt-summer-2026-tokyo-005` | 八王子花火大会 | 東京 | 花火 | 2026-08-01 | 主役 | 新規 |
| `evt-summer-2026-tokyo-006` | 第67回いたばし花火大会 | 東京 | 花火 | 2026-08-01 | 主役 | 新規 |
| `evt-230-202608-01` | 水族園で夕涼み | 東京 | 夜 | 2026-08-08〜2026-08-11 | 補助 | 既存 |
| `evt-326-202607-01` | うえの夏まつり2026 | 東京 | 夏祭り | 2026-07-10〜2026-08-11 | 補助 | 既存 |
| `evt-243-202607-01` | グッド＆ラッキーの夏祭り2026 | 東京 | 夏祭り | 2026-07-11〜2026-08-30 | 補助 | 既存 |
| `evt-summer-2026-tokyo-007` | 第52回神楽坂まつり | 東京 | 夏祭り | 2026-07-22〜2026-07-25 | 主役 | 新規 |
| `evt-summer-2026-tokyo-008` | 第23回新宿エイサーまつり | 東京 | 夏祭り | 2026-07-25 | 主役 | 新規 |
| `evt-summer-2026-tokyo-009` | 八王子まつり | 東京 | 夏祭り | 2026-08-07〜2026-08-09 | 主役 | 新規 |
| `evt-summer-2026-tokyo-010` | 第70回阿佐谷七夕まつり | 東京 | 夏祭り | 2026-08-07〜2026-08-11 | 主役 | 新規 |
| `evt-summer-2026-tokyo-011` | 深川八幡祭り（富岡八幡宮例祭） | 東京 | 夏祭り | 2026-08-12〜2026-08-16 | 主役 | 新規 / Hero候補 |
| `evt-summer-2026-tokyo-012` | 第67回東京高円寺阿波おどり | 東京 | 夏祭り | 2026-08-29〜2026-08-30 | 主役 | 新規 |
| `evt-976-202607-01` | 江戸の夏を歩く―変化朝顔と風鈴回廊― | 東京 | 伝統 | 2026-07-14〜2026-08-30 | 補助 | 既存 |
