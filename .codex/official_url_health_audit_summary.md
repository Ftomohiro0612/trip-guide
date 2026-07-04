# official_url Health Audit Summary

Generated: 2026-07-04T11:23:49

## Scope

- Input: data/facilities_data.json
- Total facilities: 2180
- URL present: 2176
- URL empty: 4
- Network policy: GET, redirect follow, UA set, 15000ms timeout, concurrency 20, retry 1
- Facility detail page displays url: true (app/facilities/[slug]/page.tsx renders href={facility.url} with label "公式サイトを見る")
- This is a live network audit. Results are non-deterministic and may change on rerun.

## Summary

- broken total: 504
- http_ok total: 1676
- high priority: 479
- medium priority: 19
- low priority: 6

## Classification Counts

| classification |count |
| --- |--- |
| ok_200 |1539 |
| redirect_ok |137 |
| redirect_to_toppage |15 |
| redirect_offsite |29 |
| not_found |147 |
| server_error |4 |
| dns_error |186 |
| ssl_error |73 |
| conn_error |35 |
| timeout |11 |
| no_url |4 |

## Fix Priority Counts

| priority |count |
| --- |--- |
| high |479 |
| medium |19 |
| low |6 |

## Broken By Domain Top 30

| host |broken |high |classification |examples |
| --- |--- |--- |--- |--- |
| www.cga-park.or.jp |9 |9 |dns_error:9 |682 幕張海浜公園 / 683 稲毛海浜公園プール / 702 千葉県立柏の葉公園 |
| www.park-tochigi.com |9 |9 |ssl_error:9 |404 田母沢御用邸記念公園 / 405 日光だいや川公園 / 408 イタリア大使館別荘記念公園 |
| www.tokyo-park.or.jp |8 |8 |not_found:6 / timeout:2 |231 葛西臨海公園 / 237 井の頭恩賜公園 / 281 木場公園 |
| kidokid.bornelund.co.jp |6 |6 |not_found:6 |305 ボーネルンド あそびのせかい セレオ八王子店 / 970 ボーネルンド キドキド ラゾーナ川崎プラザ店 / 971 ボーネルンド キドキド たまプラーザ テラス店 |
| www.kanagawa-park.or.jp |6 |6 |conn_error:1 / not_found:5 |831 県立相模原麻溝公園 / 837 県立秦野戸川公園 / 855 湘南海岸公園 |
| www.parks.or.jp |6 |6 |conn_error:1 / not_found:5 |474 大宮公園 / 528 加須はなさき水上公園 / 536 熊谷スポーツ文化公園 |
| invalid_or_empty |5 |3 |conn_error:1 / no_url:4 |32 藤枝市民プールキッズパーク / 51 ホテルテルメ温水プール / 83 ナガノフォレストビレッジ 森の駅Daizahoushi |
| litpla.com |4 |4 |not_found:4 |216 リトルプラネット ダイバーシティ東京プラザ / 246 リトルプラネット ららぽーと立川立飛 / 1321 リトルプラネット ららぽーと和泉 |
| www.katch.ne.jp |4 |4 |not_found:4 |1726 堀内公園 / 1729 ホワイトウェイブ21 / 1772 マーメイドパレス |
| www.city.saitama.jp |3 |3 |redirect_offsite:3 |475 さいたま市青少年宇宙科学館 / 477 大崎公園子供動物園 / 478 見沼自然公園 |
| www.city.utsunomiya.tochigi.jp |3 |3 |ssl_error:3 |416 宇都宮城址公園 / 417 うつのみや遺跡の広場 / 423 宇都宮市森林公園 |
| www.kidsus.jp |3 |3 |dns_error:3 |469 キッズユーエス・ランド宇都宮インターパーク店 / 569 キッズユーエス・ランド狭山店 / 635 キッズユーエス・ランド新潟松崎店 |
| www.kosodate-niigata.com |3 |3 |dns_error:3 |584 長岡市子育ての駅千秋 てくてく / 585 長岡市子育ての駅ぐんぐん(けやき子供の家) / 638 長岡市子ども創造センター ミライエ長岡 |
| www.nikko-kankou.org |3 |0 |redirect_to_toppage:3 |395 戦場ヶ原 / 397 龍頭の滝 / 398 霧降の滝 |
| www.tokyo-zoo.net |3 |3 |timeout:3 |225 上野動物園 / 230 葛西臨海水族園 / 236 井の頭自然文化園 |
| anebytrimpark.com |2 |2 |server_error:2 |752 アネビートリムパーク 船橋 / 843 アネビートリムパーク 横浜ランドマーク店 |
| event.bandainamco-am.co.jp |2 |2 |not_found:1 / timeout:1 |223 ナンジャタウン / 308 東京ドコドコ(冒険の島) |
| www.aganogawa.jp |2 |2 |ssl_error:2 |656 五頭山(ごずさん)登山口 / 658 水原町立水原中央公民館 瓢湖白鳥資料室 |
| www.aichi-koen.com |2 |2 |not_found:2 |1700 愛知県森林公園 / 1751 荒子川公園 |
| www.akakan.jp |2 |2 |dns_error:2 |608 赤倉観光リゾート / 661 妙高高原パノラマパーク 朝陽プラザ |
| www.city.kanuma.lg.jp |2 |2 |server_error:2 |455 鹿沼運動公園 / 999 鹿沼市千手山公園 |
| www.city.katsushika.lg.jp |2 |2 |not_found:2 |275 上千葉砂原公園 / 317 上千葉砂原公園 交通公園 |
| www.city.osaka.lg.jp |2 |2 |not_found:2 |1409 千島公園 / 1410 城北公園 |
| www.city.setagaya.lg.jp |2 |2 |not_found:2 |276 世田谷公園 / 283 等々力渓谷公園 |
| www.e-sadonet.tv |2 |1 |conn_error:2 |619 佐渡西三川ゴールドパーク / 621 尖閣湾揚島遊園 |
| www.edu.city.kyoto.jp |2 |2 |ssl_error:2 |1583 京都市青少年科学センター / 1639 京都市学校歴史博物館 |
| www.fukushimagata.jp |2 |2 |dns_error:2 |627 福島潟 / 628 新潟市水の駅 ビュー福島潟 |
| www.fureainooka.jp |2 |2 |dns_error:2 |388 大田原市ふれあいの丘 天文館 / 458 大田原市ふれあいの丘自然観察館 |
| www.hachimanyama.jp |2 |2 |conn_error:2 |418 八幡山公園 / 419 宇都宮タワー |
| www.hakone-tozan.co.jp |2 |2 |dns_error:2 |818 箱根強羅公園 / 824 箱根登山鉄道 |

## Broken By Prefecture

| prefecture |broken |high |classification |
| --- |--- |--- |--- |
| 栃木県 |67 |64 |conn_error:3 / dns_error:34 / not_found:4 / redirect_offsite:1 / redirect_to_toppage:4 / server_error:2 / ssl_error:19 |
| 東京都 |58 |58 |conn_error:3 / dns_error:18 / not_found:26 / redirect_offsite:1 / ssl_error:1 / timeout:9 |
| 神奈川県 |51 |50 |conn_error:2 / dns_error:16 / not_found:27 / redirect_offsite:4 / server_error:1 / ssl_error:1 |
| 新潟県 |45 |43 |conn_error:2 / dns_error:25 / not_found:7 / redirect_offsite:2 / redirect_to_toppage:1 / ssl_error:8 |
| 千葉県 |44 |44 |conn_error:3 / dns_error:30 / not_found:8 / server_error:1 / ssl_error:2 |
| 埼玉県 |41 |37 |conn_error:3 / dns_error:16 / not_found:12 / redirect_offsite:6 / redirect_to_toppage:1 / ssl_error:3 |
| 福岡県 |31 |30 |conn_error:2 / dns_error:9 / not_found:10 / redirect_offsite:3 / ssl_error:7 |
| 大阪府 |29 |29 |conn_error:2 / dns_error:7 / not_found:13 / redirect_offsite:2 / redirect_to_toppage:2 / ssl_error:3 |
| 愛知県 |22 |21 |dns_error:6 / not_found:9 / redirect_offsite:1 / redirect_to_toppage:1 / ssl_error:5 |
| 静岡県 |21 |21 |conn_error:1 / dns_error:9 / no_url:2 / not_found:5 / ssl_error:3 / timeout:1 |
| 長野県 |21 |18 |conn_error:1 / dns_error:5 / no_url:1 / not_found:8 / redirect_offsite:1 / redirect_to_toppage:3 / ssl_error:2 |
| 広島県 |21 |19 |conn_error:8 / dns_error:4 / not_found:5 / redirect_offsite:2 / ssl_error:2 |
| 京都府 |18 |15 |dns_error:2 / not_found:6 / redirect_offsite:3 / redirect_to_toppage:1 / ssl_error:6 |
| 山梨県 |14 |11 |conn_error:3 / dns_error:2 / no_url:1 / not_found:2 / redirect_offsite:1 / redirect_to_toppage:1 / ssl_error:3 / timeout:1 |
| 兵庫県 |14 |14 |conn_error:2 / dns_error:2 / not_found:5 / redirect_offsite:1 / ssl_error:4 |
| 茨城県 |7 |5 |dns_error:1 / redirect_offsite:1 / redirect_to_toppage:1 / ssl_error:4 |

## cga-park Cluster

| id |name |classification |priority |notes |
| --- |--- |--- |--- |--- |
| 682 |幕張海浜公園 |dns_error |high |dns_error:ENOTFOUND |
| 683 |稲毛海浜公園プール |dns_error |high |dns_error:ENOTFOUND |
| 702 |千葉県立柏の葉公園 |dns_error |high |dns_error:ENOTFOUND |
| 710 |蓮沼ウォーターガーデン |dns_error |high |dns_error:ENOTFOUND |
| 721 |千葉県立館山運動公園 |dns_error |high |dns_error:ENOTFOUND |
| 735 |千葉ポートパーク |dns_error |high |dns_error:ENOTFOUND |
| 738 |千葉県立行田公園 |dns_error |high |dns_error:ENOTFOUND |
| 755 |千葉市花の美術館 |dns_error |high |dns_error:ENOTFOUND |
| 885 |富津公園 |dns_error |high |dns_error:ENOTFOUND |

## High Priority Samples

| id |name |prefecture |classification |host |status |notes |
| --- |--- |--- |--- |--- |--- |--- |
| 27 |雄踏総合公園(亀崎ファミリーランドプール) |静岡県 |ssl_error |www.yuto-park.jp |- |ssl_error:ERR_TLS_CERT_ALTNAME_INVALID |
| 28 |豊田ラブリバー公園 |静岡県 |not_found |www.city.iwata.shizuoka.jp |404 | |
| 30 |キッズランドUS 静岡清水店 |静岡県 |not_found |kidslandus.com |404 | |
| 31 |キッズパークてん KIDS PARK X |静岡県 |dns_error |www.kids-parkx.com |- |dns_error:ENOTFOUND |
| 32 |藤枝市民プールキッズパーク |静岡県 |no_url | |- |url_empty |
| 33 |Mooovi 浜名湖 |静岡県 |dns_error |mooovi-hamanako.com |- |dns_error:ENOTFOUND |
| 37 |イオンモール浜松志都呂 |静岡県 |not_found |www.aeon.jp |404 | |
| 42 |静岡ホビースクエア |静岡県 |conn_error |www.hobbysquare.jp |- |attempt_1_conn_error:TypeError / conn_error:TypeError |
| 43 |studio iiro |静岡県 |dns_error |www.studioiiro.com |- |dns_error:ENOTFOUND |
| 46 |伊豆アート体験さくら坂 |静岡県 |not_found |taiken-jp.net |404 | |
| 51 |ホテルテルメ温水プール |静岡県 |no_url | |- |url_empty |
| 55 |小諸市児童遊園地 |長野県 |not_found |www.city.komoro.lg.jp |404 | |
| 63 |わくわくどうぶつ王国 |長野県 |redirect_offsite |familyland.ikenotaira-resort.co.jp |200 | |
| 65 |松本市アルプス公園 小鳥と小動物の森 |長野県 |not_found |toybox-net.jp |404 | |
| 71 |佐久平駅南口大型遊具 |長野県 |not_found |www.city.saku.nagano.jp |404 | |
| 73 |namco(ナムコ)あそびパーク 軽井沢プリンスショッピングプラザ店 |長野県 |not_found |bandainamco-am.co.jp |404 | |
| 75 |Nature Kids Forest House |長野県 |not_found |www.princehotels.co.jp |404 | |
| 76 |ASOBLE イオンモール須坂店 |長野県 |redirect_to_toppage |asoble.jp |200 | |
| 81 |サンマリーンながの |長野県 |ssl_error |sun-marine.jp |- |ssl_error:ERR_TLS_CERT_ALTNAME_INVALID |
| 88 |信州新町化石博物館 |長野県 |conn_error |www.ngn.janis.or.jp |- |attempt_1_conn_error:ECONNREFUSED / conn_error:ECONNREFUSED |
| 99 |野沢温泉スキー場 |長野県 |dns_error |www.nozawaonsen.com |- |dns_error:ENOTFOUND |
| 163 |Trick Art Museum 富士河口湖 |山梨県 |conn_error | |- |invalid_url |
| 164 |山中湖花の都公園 |山梨県 |ssl_error |www.hananomiyakokouen.jp |- |ssl_error:SELF_SIGNED_CERT_IN_CHAIN |
| 169 |アミーチアドベンチャー軽井沢 AMICI |長野県 |dns_error |amici-adventure.com |- |dns_error:ENOTFOUND |
| 180 |白馬EXアドベンチャー |長野県 |dns_error |hakuba-ex.com |- |dns_error:ENOTFOUND |
| 188 |はままつフルーツパーク時之栖 |静岡県 |dns_error |hamamatsu-fruitpark.com |- |dns_error:ENOTFOUND |
| 189 |姫の沢公園 |静岡県 |dns_error |hime.or.jp |- |dns_error:ENOTFOUND |
| 199 |押原公園 ゆめパーク昭和 |山梨県 |timeout |www.yamanashi-football.com |- |attempt_1_timeout:20 / timeout:20 |
| 202 |アウルアドベンチャー |長野県 |dns_error |owl-adventure.com |- |dns_error:ENOTFOUND |
| 209 |富士山樹空の森 |静岡県 |dns_error |sukuunomori.jp |- |dns_error:ENOTFOUND |
| 210 |焼津おもちゃ美術館 |静岡県 |dns_error |yaizu-toymuseum.jp |- |dns_error:ENOTFOUND |
| 211 |浜松こども館 |静岡県 |not_found |www.hcf.or.jp |404 | |
| 212 |はままつフラワーパーク |静岡県 |timeout |e-flowerpark.com |- |attempt_1_timeout:20 / timeout:20 |
| 213 |浜松市緑化推進センター(みどり〜な) |静岡県 |dns_error |www.midori-cd.com |- |dns_error:ENOTFOUND |
| 216 |リトルプラネット ダイバーシティ東京プラザ |東京都 |not_found |litpla.com |404 | |
| 223 |ナンジャタウン |東京都 |timeout |event.bandainamco-am.co.jp |- |attempt_1_conn_error / timeout:20 |
| 224 |サンシャイン水族館 |東京都 |timeout |sunshinecity.jp |- |attempt_1_timeout:20 / timeout:20 |
| 225 |上野動物園 |東京都 |timeout |www.tokyo-zoo.net |- |attempt_1_timeout:20 / timeout:20 |
| 228 |東京国立博物館 |東京都 |timeout |www.tnm.jp |- |attempt_1_server_error / timeout:20 |
| 230 |葛西臨海水族園 |東京都 |timeout |www.tokyo-zoo.net |- |attempt_1_timeout:20 / timeout:20 |

## Replacement Candidate Policy

1. Use the facility or designated manager official page.
2. If unavailable, use the municipality or prefecture official page.
3. If unavailable, use a public-adjacent tourism association page.
4. Do not use private review, booking, or roundup sites as official_url by default.

## Notes

- `redirect_to_toppage` means an original path landed on the domain root after redirects, suggesting a missing individual page.
- `redirect_offsite` needs visual review before replacement because it may be a legitimate migration.
- Unexpected non-200 statuses outside 404/410/5xx are grouped as `conn_error` with `unexpected_http_status_*` notes because the spec requires one of the fixed classifications.

## PM Addendum (2026-07-04, memorips-claude)

**"broken 504" は上限値。fix前に必ず区分すること:**

- **確実に死んでいる 333件** = `dns_error` 186 + `not_found` 147。これが確定作業リスト。
- **要再検証 123件** = `timeout` 11 + `conn_error` 35 + `server_error` 4 + `ssl_error` 73。
  **監査環境の false-positive が多数**。PM がブラウザ UA で実測したところ、上野動物園 / サンシャイン
  水族館 / 東京国立博物館(監査=timeout)・park-tochigi.com 9件(監査=ssl_error・栃木県立公園)は
  **すべて 200 で生存**。Node の厳格 TLS・bot 対策・一時負荷が原因。**この 123 件は fix 前に
  ブラウザ UA で再 probe し、真の broken を確定すること。**
- **要目視 44件** = `redirect_offsite` 29 + `redirect_to_toppage` 15(正当な移転 vs 個別ページ消失)。

**修正の効率単位 = ドメインクラスタ**(39 クラスタ・broken の 24%=120件)。1 ドメイン失効で複数施設が
同時死。1 つ正しい移転先を見つければ複数に一括適用できる。

**cga-park クラスタ(千葉県立公園9件・富津公園885含む)の差し替え先=確定:**
`www.cga-park.or.jp/<path>/` → **`www.cue-net.or.jp/kouen/<同一 path>/`**(指定管理者 千葉県まちづくり
公社の新オフィシャル=差し替え優先度#1)。futtsu / makuhari / inage / kashiwanoha / hasunuma / tateyama /
portpark / gyoda の 8 つは 200 確認済み。id755 花の美術館(/inage/hana/)のみ要個別確認。
県公式フォールバック = `www.pref.chiba.lg.jp/kouen/toshikouen/guidemap/<name>/`。
