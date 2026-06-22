# 茨城 events-source-registry audit

- 確認日: 2026-06-22
- 対象: `data/facilities_data.json` の `prefecture_id === "ibaraki"` 46件（1067-1112）
- 追加先: `.codex/events-source-registry.json`（既存655件の末尾に46件追記）

## 集計

### patrol_tier

- weekly: 8
- biweekly: 13
- monthly: 2
- seasonal: 9
- manual_hard: 0
- no_event_source: 9
- not_suitable: 5
- on_hold: 0

### event_source_type

- official_event_page: 17
- official_news: 15
- official_calendar: 3
- official_pdf: 0
- sns_only: 2
- third_party_dependent: 0
- none: 9

## 巡回対象

| facility_id | name | tier | type | official_event_url |
|---:|---|---|---|---|
| 1067 | 霞ケ浦 どうぶつとみんなのいえ | biweekly | official_news | https://doubutsutominna.jp/topics |
| 1068 | ダチョウ王国 石岡ファーム | biweekly | official_news | https://dacho.co.jp/archives/category/news |
| 1069 | アクアワールド茨城県大洗水族館 | weekly | official_event_page | https://www.aquaworld-oarai.com/event-program/event/ |
| 1071 | 日立市かみね動物園 | weekly | official_event_page | https://www.city.hitachi.lg.jp/zoo/event/index.html |
| 1072 | つくばわんわんランド | weekly | official_event_page | https://wanwan-land.co.jp/event?date=today |
| 1073 | 日立シビックセンター科学館・天球劇場（サクリエ） | weekly | official_calendar | https://www.civic.jp/science/science-museum/schedule.html |
| 1074 | 大洗わくわく科学館 | monthly | official_news | https://www.jaea.go.jp/09/wakuwaku/news.html |
| 1075 | つくばエキスポセンター | weekly | official_event_page | https://www.expocenter.or.jp/event/list/ |
| 1076 | JAXA筑波宇宙センター | monthly | official_news | https://visit-tsukuba.jaxa.jp/information.html |
| 1077 | 地質標本館 | biweekly | official_event_page | https://www.gsj.jp/Muse/event/index.html |
| 1078 | 大子広域公園 フォレスパ大子 | seasonal | official_news | https://www.forespa-daigo.jp/ |
| 1080 | Hiタッチらんど・ハレニコ！ | biweekly | official_calendar | https://hareniko.com/#calendar |
| 1082 | 取手ウェルネスプラザ キッズプレイルーム | biweekly | official_event_page | https://www.toride-wellness-plaza.com/event/contents_type%3D92 |
| 1083 | 国営ひたち海浜公園 | weekly | official_calendar | https://www.hitachikaihin.jp/cal.php |
| 1084 | 笠間芸術の森公園 | seasonal | official_event_page | https://www.city.kasama.lg.jp/page/page002298.html |
| 1085 | ネーブルパーク | biweekly | official_news | https://navelpark.com/news/ |
| 1087 | 鹿島灘海浜公園 | seasonal | official_news | https://www.hokota-k.jp/news/index.html |
| 1090 | 奥日立きららの里 | biweekly | official_news | https://kiraranosato.com/info |
| 1091 | 水戸市森林公園 | biweekly | official_event_page | https://www.city.mito.lg.jp/site/shinrinkoen/list348-1228.html |
| 1092 | 牛久自然観察の森 | biweekly | official_event_page | https://www.city.ushiku.lg.jp/kanko-bunka-sports/kanko/miryoku-hasshin/ushiku-nature-sanctuary/page001817.html |
| 1093 | 茨城県水郷県民の森 | seasonal | official_event_page | https://www.ibaraki-suigou.jp/policy.html |
| 1094 | いばらきフラワーパーク | biweekly | official_news | https://www.flowerpark.or.jp/news-column/ |
| 1095 | かみねレジャーランド | seasonal | official_news | https://kaminepark.or.jp/news/?cat=4 |
| 1096 | こもれび森のイバライド | weekly | official_event_page | https://www.ibaraido.co.jp/event/ |
| 1099 | ミュージアムパーク 茨城県自然博物館 | weekly | official_event_page | https://www.nat.museum.ibk.ed.jp/eventpage/ |
| 1101 | らぽっぽ なめがたファーマーズヴィレッジ | biweekly | official_event_page | https://www.namegata-fv.jp/event/ |
| 1103 | 笠間工芸の丘 | biweekly | official_event_page | https://kasama-crafthills.com/%E3%82%A4%E3%83%99%E3%83%B3%E3%83%88/ |
| 1104 | フォレストアドベンチャー・つくば | seasonal | official_news | https://foret-aventure.jp/park/fa-tsukuba/ |
| 1105 | 竜神大吊橋 | seasonal | official_event_page | https://ohtsuribashi.ryujinkyo.jp/event.html |
| 1107 | 筑波山ケーブルカー＆ロープウェイ | seasonal | official_news | https://mt-tsukuba.com/ |
| 1110 | 偕楽園 | seasonal | official_event_page | https://ibaraki-kairakuen.jp/schedule/ |
| 1111 | 牛久大仏 | biweekly | official_event_page | https://daibutu.net/event.html |

## 巡回対象外

| facility_id | name | tier | type | reason |
|---:|---|---|---|---|
| 1070 | かすみがうら市水族館 | no_event_source | none | 市公式の施設ページは確認。水族館単体の継続的な公式イベント取得元は確認できず。 |
| 1079 | 道の駅 グランテラス筑西 | not_suitable | official_news | 公式イベント告知は地域・物販・ステージ中心。子ども向け施設イベント取得対象としては採用しない。 |
| 1081 | あそびパークPLUS ジョイフル本田ニューポートひたちなか店 | not_suitable | none | チェーン型屋内遊び場の店舗案内・料金カレンダー中心。店舗別の安定した公式イベント巡回対象としては採用しない。 |
| 1086 | ヒロサワ県西総合公園 | no_event_source | none | 公式施設ページは確認。公園単体の継続的な公式イベント取得元は確認できず。 |
| 1088 | 花立自然公園 スペースアスレランド | no_event_source | none | 市公式の施設ページは確認。施設単体の継続的な公式イベント取得元は確認できず。 |
| 1089 | 境町ニコニコパーク | no_event_source | none | 町公式の施設ページは確認。ニコニコパーク単体の公式イベント取得元は確認できず。 |
| 1097 | プレジャーガーデン | not_suitable | official_news | 公式お知らせは運休・アトラクション案内中心。イベント巡回は国営ひたち海浜公園本体のカレンダー側で扱うため単独巡回対象にしない。 |
| 1098 | ザ・ヒロサワ・シティ「ユメノバ」 | no_event_source | none | 公式のユメノバ施設ページは確認。ユメノバ単体の継続的な公式イベント取得元は確認できず。 |
| 1100 | ポケットファームどきどき 茨城町店 | no_event_source | sns_only | 公式サイトは施設・店舗案内中心。イベント告知は公式SNS中心で、公式Webの巡回取得元は確認できず。 |
| 1102 | 深作農園 | no_event_source | sns_only | 公式サイトは旬情報・店舗案内中心。直近告知は公式Instagram中心で、公式Webのイベント巡回取得元は確認できず。 |
| 1106 | 茨城空港 | not_suitable | official_news | 公式キャンペーン・イベント告知は空港利用促進/交通拠点イベント中心。展望台施設の子ども向けイベント巡回対象としては採用しない。 |
| 1108 | 大野潮騒はまなす公園 | not_suitable | none | 市公式の公園紹介は確認。展望塔・景観・常設遊具中心で、施設単体の公式イベント巡回対象としては採用しない。 |
| 1109 | 袋田の滝 | no_event_source | none | 町公式の観光ページは確認。袋田の滝単体の継続的な公式イベント取得元は確認できず。 |
| 1112 | 平磯白亜紀層（中生代白亜紀層） | no_event_source | none | 観光いばらき/県教育委員会の公式スポット・文化財ページは確認。天然記念物単体の公式イベント取得元は確認できず。 |

## メモ

- `weekly` / `biweekly` / `monthly` / `seasonal` は全件 `official_event_url` あり。
- `manual_hard` は該当なし。
- 第三者まとめサイトのみ、推測URL、SNSのみは巡回対象にしていない。
