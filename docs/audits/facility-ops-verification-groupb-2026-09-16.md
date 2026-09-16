# Group B facility discovery verification — 2026-09-16

MEM-FAC-OPS-VERIFICATION-RERUN-GROUP-B-20260915

Actual official/local tourism, municipal, family-category, opening and association listings were relisted and compared to the frozen Product baseline. This is a bounded discovery sample of the listed entries, not an exhaustive census of every facility or municipality.

**Outcome:** 101 additions (8076–8176), ready for PM review. No merge or deploy. This one-off verification does not authorize further reruns.

## Counts

Candidates are unique resolved identities. Reviewed and already-registered counts are source-entry occurrences; aliases on the same source collapse. Already registered includes DUPLICATE resolutions. See JSON for every compared entry.

| Prefecture | Candidates | ADD | DUPLICATE | HOLD not_eligible | HOLD other | Reviewed | Already registered |
|---|---:|---:|---:|---:|---:|---:|---:|
| saitama | 16 | 10 | 4 | 0 | 2 | 37 | 18 |
| tochigi | 23 | 9 | 1 | 4 | 9 | 42 | 19 |
| hyogo | 16 | 7 | 4 | 2 | 3 | 46 | 28 |
| okayama | 17 | 11 | 1 | 1 | 4 | 38 | 18 |
| fukushima | 23 | 13 | 2 | 1 | 7 | 34 | 6 |
| toyama | 20 | 12 | 1 | 0 | 7 | 41 | 21 |
| mie | 18 | 6 | 2 | 2 | 8 | 26 | 6 |
| wakayama | 11 | 6 | 0 | 1 | 4 | 27 | 15 |
| shimane | 18 | 9 | 2 | 0 | 7 | 28 | 9 |
| kochi | 10 | 3 | 3 | 0 | 4 | 24 | 14 |
| tokushima | 16 | 0 | 5 | 1 | 10 | 35 | 19 |
| yamagata | 22 | 6 | 2 | 0 | 14 | 31 | 9 |
| aomori | 24 | 9 | 4 | 0 | 11 | 39 | 12 |
| **Total** | 234 | 101 | 31 | 12 | 90 | 448 | 194 |

Local municipal/district tourism entry points surfaced **48** of the added facilities. The check does not establish that those facilities are absent from every page of the prefectural sites.

## Sources checked

All entries below were read successfully. HTTP 200 means content was obtained, not a guarantee that all listed information is current. The Tokushima opening page required the Web fetch fallback. Family portal category listings support discovery; additions use official/operator evidence linked below.

### saitama

| Source type | URL | Status |
|---|---|---|
| tourism_board / municipality_or_district | [saitama-local](https://www.chichibuji.gr.jp/spot/) | OK (HTTP 200; listing/page content read) |
| municipal_facility_list | [saitama-municipal](https://www.city.saitama.lg.jp/008/017/index.html) | OK (HTTP 200; listing/page content read) |
| family_facility_portal | [saitama-family](https://iko-yo.net/facilities?prefecture_ids%5B%5D=11&genre_ids%5B%5D=19) | OK (HTTP 200; listing/page content read) |
| operator_or_association_roster | [science-roster](https://jcsm.jp/list/membership/) | OK (HTTP 200; listing/page content read) |
| tourism_board / prefecture | [saitama-pref](https://chocotabi-saitama.jp/spot/) | OK (HTTP 200; listing/page content read) |
| new_opening_or_upcoming | [saitama-new](https://www.city.fukaya.saitama.jp/soshiki/kodomomirai/seishonen/tanto/kodomokan/16506.html) | OK (HTTP 200; listing/page content read) |
| supplemental_official_facility_register | [saitama-register](https://www.pref.saitama.lg.jp/f2216/hakubutukantouroku/20230401.html) | OK (HTTP 200; listing/page content read) |
| supplemental_official_facility_register | [saitama-library-roster](https://www.lib.pref.saitama.jp/reference/hint/cat/ruien/) | OK (HTTP 200; listing/page content read) |

### tochigi

| Source type | URL | Status |
|---|---|---|
| tourism_board / municipality_or_district | [tochigi-local](https://www.nasukogen.org/spotsearch/index.php?cate=A) | OK (HTTP 200; listing/page content read) |
| municipal_facility_list | [tochigi-municipal](https://www.city.nasushiobara.tochigi.jp/shisetsuannai_shisetsuyoyaku/kankoshisetsu/index.html) | OK (HTTP 200; listing/page content read) |
| family_facility_portal | [tochigi-family](https://iko-yo.net/facilities?prefecture_ids%5B%5D=9&genre_ids%5B%5D=19) | OK (HTTP 200; listing/page content read) |
| operator_or_association_roster | [science-roster](https://jcsm.jp/list/membership/) | OK (HTTP 200; listing/page content read) |
| new_opening_or_upcoming | [tochigi-new](https://www.pref.tochigi.lg.jp/d04/nanma.html) | OK (HTTP 200; listing/page content read) |
| tourism_board / prefecture | [tochigi-pref](https://www.tochigiji.or.jp/spot/?genre%5B%5D=hi03) | OK (HTTP 200; listing/page content read) |

### hyogo

| Source type | URL | Status |
|---|---|---|
| tourism_board / municipality_or_district | [hyogo-local](https://www.himeji-kanko.jp/spot/) | OK (HTTP 200; listing/page content read) |
| municipal_facility_list | [hyogo-municipal](https://www.city.kobe.lg.jp/a21651/museum.html) | OK (HTTP 200; listing/page content read) |
| family_facility_portal | [hyogo-family](https://iko-yo.net/facilities?prefecture_ids%5B%5D=28&genre_ids%5B%5D=19) | OK (HTTP 200; listing/page content read) |
| operator_or_association_roster | [science-roster](https://jcsm.jp/list/membership/) | OK (HTTP 200; listing/page content read) |
| new_opening_or_upcoming | [hyogo-new](https://www.shimamura.co.jp/press/?p=9679) | OK (HTTP 200; listing/page content read) |
| tourism_board / prefecture | [hyogo-pref](https://www.hyogo-tourism.jp/spot/) | OK (HTTP 200; listing/page content read) |
| operator_or_association_roster | [hyogo-association-kobe](https://www2.hyogo-c.ed.jp/weblog2/museum-ac/?post_type=facility&user_prefix=001) | OK (HTTP 200; listing/page content read) |

### okayama

| Source type | URL | Status |
|---|---|---|
| municipal_facility_list | [okayama-municipal](https://www.city.kurashiki.okayama.jp/kosodate/youth/1013063/1013064/1013067/1007503/1015025/index.html) | OK (HTTP 200; listing/page content read) |
| family_facility_portal | [okayama-family](https://iko-yo.net/facilities?prefecture_ids%5B%5D=33&genre_ids%5B%5D=19) | OK (HTTP 200; listing/page content read) |
| operator_or_association_roster | [science-roster](https://jcsm.jp/list/membership/) | OK (HTTP 200; listing/page content read) |
| new_opening_or_upcoming | [okayama-new](https://www.fantasy.co.jp/info/info-40309/) | OK (HTTP 200; listing/page content read) |
| tourism_board / prefecture | [okayama-pref](https://www.okayama-kanko.jp/spot/) | OK (HTTP 200; listing/page content read) |
| tourism_board / municipality_or_district | [okayama-local-category](https://www.kurashiki-tabi.jp/see/?see_cat=see-cat04) | OK (HTTP 200; listing/page content read) |

### fukushima

| Source type | URL | Status |
|---|---|---|
| tourism_board / municipality_or_district | [fukushima-local](https://www.aizukanko.com/spot) | OK (HTTP 200; listing/page content read) |
| municipal_facility_list | [fukushima-municipal](https://www.city.aizuwakamatsu.fukushima.jp/docs/2012092600165/) | OK (HTTP 200; listing/page content read) |
| tourism_board / prefecture | [fukushima-pref-working](https://www.tif.ne.jp/jp/entry/?type=spot&cat=203) | OK (HTTP 200; listing/page content read) |
| operator_or_association_roster | [science-roster](https://jcsm.jp/list/membership/) | OK (HTTP 200; listing/page content read) |
| new_opening_or_upcoming | [fukushima-new](https://prtimes.jp/main/html/rd/p/000000004.000164858.html) | OK (HTTP 200; listing/page content read) |
| family_facility_portal | [fukushima-family](https://iko-yo.net/facilities?prefecture_ids%5B%5D=7&genre_ids%5B%5D=19) | OK (HTTP 200; listing/page content read) |

### toyama

| Source type | URL | Status |
|---|---|---|
| tourism_board / municipality_or_district | [toyama-local-museums](https://www.takaoka.or.jp/viewpoint/index_1_2__4.html) | OK (HTTP 200; listing/page content read) |
| municipal_facility_list | [toyama-municipal](https://www.city.toyama.lg.jp/shisei/shisetsu/1011038/1011039/index.html) | OK (HTTP 200; listing/page content read) |
| family_facility_portal | [toyama-family](https://www.pref.toyama.jp/3009/kurashi/kyouiku/kosodate/hp/tsudou/sizentaikensisetu.html) | OK (HTTP 200; listing/page content read) |
| operator_or_association_roster | [science-roster](https://jcsm.jp/list/membership/) | OK (HTTP 200; listing/page content read) |
| tourism_board / prefecture | [toyama-pref](https://www.info-toyama.com/attractions) | OK (HTTP 200; listing/page content read) |
| new_opening_or_upcoming | [toyama-new](https://kodomocchi-park.com/information/7ry1438ry75wd6gq) | OK (HTTP 200; listing/page content read) |

### mie

| Source type | URL | Status |
|---|---|---|
| tourism_board / municipality_or_district | [mie-local-facilities](https://www.toba.gr.jp/?cate=sightseeing&subcat_sightseeing%5B%5D=subcat0100&s=&spot=) | OK (HTTP 200; listing/page content read) |
| municipal_facility_list | [mie-municipal](https://www.city.toba.mie.jp/kanko_bunka_sports/shisetsu/index.html) | OK (HTTP 200; listing/page content read) |
| operator_or_association_roster | [science-roster](https://jcsm.jp/list/membership/) | OK (HTTP 200; listing/page content read) |
| tourism_board / prefecture | [mie-pref](https://www.kankomie.or.jp/spot) | OK (HTTP 200; listing/page content read) |
| new_opening_or_upcoming | [mie-new](https://www.kankomie.or.jp/topic/1325) | OK (HTTP 200; listing/page content read) |
| family_facility_portal | [mie-family](https://iko-yo.net/facilities?prefecture_ids%5B%5D=24&genre_ids%5B%5D=19) | OK (HTTP 200; listing/page content read) |

### wakayama

| Source type | URL | Status |
|---|---|---|
| tourism_board / municipality_or_district | [wakayama-local](https://www.nankishirahama.jp/spot/) | OK (HTTP 200; listing/page content read) |
| municipal_facility_list | [wakayama-municipal](https://www.city.wakayama.wakayama.jp/shisetsu/bunkashisetsu/index.html) | OK (HTTP 200; listing/page content read) |
| operator_or_association_roster | [science-roster](https://jcsm.jp/list/membership/) | OK (HTTP 200; listing/page content read) |
| tourism_board / prefecture | [wakayama-pref](https://www.wakayama-kanko.or.jp/spots/) | OK (HTTP 200; listing/page content read) |
| new_opening_or_upcoming | [wakayama-new](https://aqualoopkataonami.com/) | OK (HTTP 200; listing/page content read) |
| family_facility_portal | [wakayama-family](https://iko-yo.net/facilities?prefecture_ids%5B%5D=30&genre_ids%5B%5D=19) | OK (HTTP 200; listing/page content read) |

### shimane

| Source type | URL | Status |
|---|---|---|
| tourism_board / municipality_or_district | [shimane-local](https://www.kankou-matsue.jp/kankou/?cat=%E8%A6%B3%E5%85%89%E6%96%BD%E8%A8%AD) | OK (HTTP 200; listing/page content read) |
| municipal_facility_list | [shimane-municipal-working](https://www.city.matsue.lg.jp/kanko_bunka_sports/rekishi_bunkazai/shiryokan/index.html) | OK (HTTP 200; listing/page content read) |
| operator_or_association_roster | [science-roster](https://jcsm.jp/list/membership/) | OK (HTTP 200; listing/page content read) |
| tourism_board / prefecture | [shimane-pref](https://www.kankou-shimane.com/destination) | OK (HTTP 200; listing/page content read) |
| new_opening_or_upcoming | [shimane-new](https://windyfarm.jp/index.php) | OK (HTTP 200; listing/page content read) |
| family_facility_portal | [shimane-family](https://iko-yo.net/facilities?prefecture_ids%5B%5D=32&genre_ids%5B%5D=19) | OK (HTTP 200; listing/page content read) |

### kochi

| Source type | URL | Status |
|---|---|---|
| tourism_board / municipality_or_district | [kochi-local](https://www.shimanto-kankou.com/kanko/) | OK (HTTP 200; listing/page content read) |
| municipal_facility_list | [kochi-municipal](https://www.city.shimanto.lg.jp/site/scp/1219.html) | OK (HTTP 200; listing/page content read) |
| operator_or_association_roster | [science-roster](https://jcsm.jp/list/membership/) | OK (HTTP 200; listing/page content read) |
| tourism_board / prefecture | [kochi-pref](https://kochi-tabi.jp/search_spot.html) | OK (HTTP 200; listing/page content read) |
| new_opening_or_upcoming | [kochi-new](https://store.tsite.jp/kochi/event/shop/54693-0735300528.html) | OK (HTTP 200; listing/page content read) |
| family_facility_portal | [kochi-family](https://iko-yo.net/facilities?prefecture_ids%5B%5D=39&genre_ids%5B%5D=19) | OK (HTTP 200; listing/page content read) |
| operator_or_association_roster | [kochi-tourism-member-list](https://kochi-tabi.jp/corp/support_member/list.html) | OK (HTTP 200; listing/page content read) |

### tokushima

| Source type | URL | Status |
|---|---|---|
| tourism_board / municipality_or_district | [tokushima-local-association](https://www.naruto-kankou.jp/charm/) | OK (HTTP 200; listing/page content read) |
| municipal_facility_list | [tokushima-municipal](https://www.city.tokushima.tokushima.jp/kankou/kankou_shisetsu.html) | OK (HTTP 200; listing/page content read) |
| operator_or_association_roster | [science-roster](https://jcsm.jp/list/membership/) | OK (HTTP 200; listing/page content read) |
| tourism_board / prefecture | [tokushima-pref](https://www.awanavi.jp/spot/) | OK (HTTP 200; listing/page content read) |
| new_opening_or_upcoming | [tokushima-new](https://www.city.tokushima.tokushima.jp/shisetsu/park/nikoniko.html) | OK via Web fetch; direct HTTP attempt returned 404 |
| family_facility_portal | [tokushima-family](https://iko-yo.net/facilities?prefecture_ids%5B%5D=36&genre_ids%5B%5D=19) | OK (HTTP 200; listing/page content read) |
| municipal_facility_list | [tokushima-parks](https://www.city.tokushima.tokushima.jp/shisetsu/park/index.html) | OK (HTTP 200; listing/page content read) |

### yamagata

| Source type | URL | Status |
|---|---|---|
| tourism_board / municipality_or_district | [yamagata-local](https://www.tsuruokakanko.com/feature/spot) | OK (HTTP 200; listing/page content read) |
| municipal_facility_list | [yamagata-municipal-parks](https://www.city.tsuruoka.lg.jp/seibi/koen-ryokuti/koen/index.html) | OK (HTTP 200; listing/page content read) |
| operator_or_association_roster | [science-roster](https://jcsm.jp/list/membership/) | OK (HTTP 200; listing/page content read) |
| tourism_board / prefecture | [yamagata-pref](https://yamagatakanko.com/attractions/) | OK (HTTP 200; listing/page content read) |
| new_opening_or_upcoming | [yamagata-new](https://www.tsuruokakanko.com/spot/281) | OK (HTTP 200; listing/page content read) |
| family_facility_portal | [yamagata-family](https://iko-yo.net/facilities?prefecture_ids%5B%5D=6&genre_ids%5B%5D=19) | OK (HTTP 200; listing/page content read) |
| operator_or_association_roster | [yamagata-extra-roster](https://rekimin.com/pref/yamagata) | OK (HTTP 200; listing/page content read) |

### aomori

| Source type | URL | Status |
|---|---|---|
| tourism_board / municipality_or_district | [aomori-local](https://www.hirosaki-kanko.or.jp/cat_index.html?sbt=CAT013) | OK (HTTP 200; listing/page content read) |
| municipal_facility_list | [aomori-municipal](https://www.city.hirosaki.aomori.jp/gaiyou/shisetsu/shurui.html) | OK (HTTP 200; listing/page content read) |
| operator_or_association_roster | [aomori-roster](https://rekimin.com/pref/aomori) | OK (HTTP 200; listing/page content read) |
| tourism_board / prefecture | [aomori-pref](https://aomori-tourism.com/spot/) | OK (HTTP 200; listing/page content read) |
| new_opening_or_upcoming | [aomori-new](https://www.city.towada.lg.jp/shisei/shisetsu/toware.html) | OK (HTTP 200; listing/page content read) |
| family_facility_portal | [aomori-family](https://iko-yo.net/facilities?prefecture_ids%5B%5D=2&genre_ids%5B%5D=19) | OK (HTTP 200; listing/page content read) |

## Candidate dispositions

All 234 candidates are listed. Unknown child-use fields remain unknown under the existing canon contract; no unsupported child policy is inferred. Coordinate map centers are disclosed in the JSON and Product source notes.

### saitama

| Disposition | Facility / listing name | Evidence or reason |
|---|---|---|
| ADD 8076 | やまとーあーとみゅーじあむ | [official 1](https://www.yokoze.org/shisetsu/yamato_artmuseum/) |
| HOLD (other_hold) | 秩父美術館 | 個別の所在地を公式ページ本文で確定できない。 |
| DUPLICATE | 羊山公園 | Existing 508: 羊山公園(芝桜の丘) |
| DUPLICATE | 埼玉トヨペット秩父グリーンミューズパーク | Existing 501: 秩父ミューズパーク |
| ADD 8077 | リトリートフィールドMahora稲穂山 | [official 1](https://inahoyama.com/) / [official 2](https://inahoyama.com/about/) |
| ADD 8078 | さいたま市宇宙劇場 | [official 1](https://www.ucyugekijo.jp/) |
| HOLD (other_hold) | コープデリ商品検査センター | 施設内容・所在地・料金は公式確認済みだが、確認した所在地に対応する地図位置を確定できない。無関係な検索結果は不採用。 |
| ADD 8079 | 彩湖自然学習センター | [official 1](https://www.city.toda.saitama.jp/site/saiko/) |
| ADD 8080 | 越谷市立児童館コスモス | [official 1](https://www.city.koshigaya.saitama.jp/toiawase/shisetsu/jidokankosodateshien/jidokosumosu/kosumosu.html) |
| ADD 8081 | 越谷市立児童館ヒマワリ | [official 1](https://www.city.koshigaya.saitama.jp/toiawase/shisetsu/jidokankosodateshien/jidohimawari/jidoukanhimawari.html) |
| DUPLICATE | 越谷市科学技術体験センター | Existing 522: 越谷市科学技術体験センター ミラクル |
| ADD 8082 | 日本工業大学工業技術博物館 | [official 1](https://museum.nit.ac.jp/guide/) |
| ADD 8083 | 埼玉県立自然の博物館 | [official 1](https://shizen.spec.ed.jp/) / [official 2](https://shizen.spec.ed.jp/%E3%81%8A%E5%95%8F%E5%90%88%E3%82%8F%E3%81%9B-%E3%82%88%E3%81%8F%E3%81%82%E3%82%8B%E8%B3%AA%E5%95%8F) |
| DUPLICATE | 忍城址・行田市郷土博物館 | Existing 532: 行田市郷土博物館(忍城址) |
| ADD 8084 | 行田市はにわの館 | [official 1](https://www.gyoda-kankoukyoukai.jp/spot/16754) |
| ADD 8085 | 首都圏外郭放水路 | [official 1](https://gaikaku.jp/course/) / [official 2](https://www.ktr.mlit.go.jp/edogawa/edogawa00165.html) |

### tochigi

| Disposition | Facility / listing name | Evidence or reason |
|---|---|---|
| HOLD (other_hold) | 那須・芦野 石の美術館 | 施設内容・所在地・料金は公式確認済みだが、確認した所在地に対応する地図位置を確定できない。無関係な検索結果は不採用。 |
| ADD 8086 | 戦争博物館 | [official 1](https://www.nasukogen.org/spotsearch/detail.php?id=100121199) |
| ADD 8087 | 那須高原ビジターセンター | [official 1](https://nasu-vc.jp/) / [official 2](https://nasu-vc.jp/facility/) |
| HOLD (other_hold) | サンバレー美術館 | ホテル宿泊者以外の一般観覧条件・観覧料が未確認。 |
| DUPLICATE | 藤城清治美術館那須高原 | Existing 374: 那須高原藤城清治美術館 |
| HOLD (not_eligible) | 弦楽亭 | 常設見学施設ではなく貸音楽ホールで、通常の親子外出先としての常設体験がない。 |
| HOLD (other_hold) | 田川啓二美術館 | 施設内容・所在地・料金は公式確認済みだが、確認した所在地に対応する地図位置を確定できない。無関係な検索結果は不採用。 |
| ADD 8088 | エミール ガレ美術館 | [official 1](https://www.nasukogen.org/spotsearch/detail.php?id=100121027) |
| ADD 8089 | ダイアナガーデンエンジェル美術館 | [official 1](https://www.nasukogen.org/spotsearch/detail.php?id=100121059) |
| ADD 8090 | 塩原温泉ビジターセンター | [official 1](https://www.city.nasushiobara.tochigi.jp/shisetsuannai_shisetsuyoyaku/kankoshisetsu/7018.html) / [official 2](https://www.siobara.or.jp/vc/) |
| HOLD (other_hold) | 箱の森プレイパーク | 遊具・昆虫展示等の休止が多く、現在利用可能な親子向け範囲を確定できない。 |
| HOLD (other_hold) | 塩原温泉天皇の間記念公園 | 施設内容・所在地・料金は公式確認済みだが、確認した所在地に対応する地図位置を確定できない。無関係な検索結果は不採用。 |
| HOLD (not_eligible) | 道の駅湯の香しおばら | 確認した案内は直売・飲食中心で、独立した親子向け施設体験の基準を満たさない。 |
| HOLD (other_hold) | 道の駅明治の森・黒磯 | 体験企画の案内はあるが、現在常時利用できる体験内容・条件が未確認。 |
| HOLD (not_eligible) | 板室自然遊学センター | 自治体公式で2026年3月29日閉館を確認。 |
| HOLD (not_eligible) | 板室健康のゆグリーングリーン | 自治体公式で2026年3月29日閉館を確認。 |
| HOLD (other_hold) | 木の俣渓谷と木の俣園地 | 駐車料は確認したが、施設利用の料金区分と確定地図位置が未確認。 |
| ADD 8091 | 足尾銅山観光 | [official 1](https://www.nikko-kankou.org/spot/28/) |
| HOLD (other_hold) | 那須野が原博物館 | 施設公式の所在地は確認、現在の観覧料が未確認。 |
| ADD 8092 | 木の葉化石園 | [official 1](http://www.konohaisi.jp/) / [official 2](http://www.konohaisi.jp/map.html) |
| HOLD (other_hold) | 水と緑の南摩の里 | プレオープン段階で、現在利用可能なコースと通常営業時の条件を確定できない。 |
| ADD 8093 | とびやま歴史体験館 | [official 1](https://www.tochigiji.or.jp/spot/s5499) |
| ADD 8094 | 栃木県埋蔵文化財センター | [official 1](https://www.tochigiji.or.jp/spot/s65045) |

### hyogo

| Disposition | Facility / listing name | Evidence or reason |
|---|---|---|
| ADD 8095 | 姫路城西御屋敷跡庭園好古園 | [official 1](https://www.himeji-kanko.jp/spot/4/) |
| ADD 8096 | 姫路文学館 | [official 1](https://www.himeji-kanko.jp/spot/37/) |
| HOLD (not_eligible) | 日本城郭研究センター | 城郭研究の図書館・研究拠点と貸館で、常設の親子向け外出体験が確認できない。 |
| ADD 8097 | 三木美術館 | [official 1](https://www.himeji-kanko.jp/spot/44/) |
| HOLD (other_hold) | 竹中大工道具館 | 協会の施設一覧で所在地・料金を確認したが旧年の情報が混在。施設公式本文を取得できず、現行観覧料を確定できない。 |
| ADD 8098 | 白鶴美術館 | [official 1](https://www.hakutsuru-museum.org/) / [official 2](https://www.hakutsuru-museum.org/guide/) |
| HOLD (not_eligible) | 香雪美術館 | 御影の施設は改修に伴う長期休館中。別県の同名館には振り替えない。 |
| ADD 8099 | 神戸市立博物館 | [official 1](https://www.kobecitymuseum.jp/) / [official 2](https://www.kobecitymuseum.jp/guide/) |
| DUPLICATE | 神戸市立小磯記念美術館 | Existing 7805: 小磯記念美術館 |
| HOLD (other_hold) | 有馬切手文化博物館 | 公式料金は確認したが、見学施設の正式住所を本文で確定できない。 |
| DUPLICATE | 神戸市立青少年科学館 | Existing 1450: バンドー神戸青少年科学館 |
| ADD 8100 | 人と防災未来センター | [official 1](http://www.dri.ne.jp/) / [official 2](https://www.dri.ne.jp/guide/info/) |
| DUPLICATE | 西はりま天文台 | Existing 1555: 兵庫県立大学西はりま天文台 |
| ADD 8101 | オトビバ ららぽーと甲子園店 | [official 1](https://otoviva.shimamura.co.jp/) / [official 2](https://otoviva.shimamura.co.jp/shop/koshien/) |
| HOLD (other_hold) | メリケンパーク | 公式施設紹介で利用料金区分を確定できない。 |
| DUPLICATE | 元気村かみくげ・丹波竜の里公園 | Existing 1548: 丹波竜の里公園 |

### okayama

| Disposition | Facility / listing name | Evidence or reason |
|---|---|---|
| ADD 8102 | 川崎医科大学現代医学教育博物館 | [official 1](https://www.city.kurashiki.okayama.jp/kosodate/youth/1013063/1013064/1013067/1007503/1015025/1007518.html) |
| ADD 8103 | 環境学習センター | [official 1](https://www.city.kurashiki.okayama.jp/kosodate/youth/1013063/1013064/1013067/1007503/1015025/1007525.html) |
| DUPLICATE | 倉敷科学センター | Existing 2577: ライフパーク倉敷科学センター |
| ADD 8104 | 倉敷考古館 | [official 1](https://www.city.kurashiki.okayama.jp/kosodate/youth/1013063/1013064/1013067/1007503/1015025/1007510.html) |
| ADD 8105 | 倉敷市立美術館 | [official 1](https://www.city.kurashiki.okayama.jp/kcam/museum-guide/1008853.html) |
| ADD 8106 | 倉敷市歴史民俗資料館 | [official 1](https://www.city.kurashiki.okayama.jp/culture/art/1007596/1007813/1007814.html) |
| ADD 8107 | 倉敷民藝館 | [official 1](https://www.city.kurashiki.okayama.jp/kosodate/youth/1013063/1013064/1013067/1007503/1015025/1007511.html) |
| ADD 8108 | クルクルセンター | [official 1](https://www.city.kurashiki.okayama.jp/kosodate/youth/1013063/1013064/1013067/1007503/1015025/1007528.html) |
| HOLD (other_hold) | 倉敷埋蔵文化財センター | 公式利用案内を取得したが一般展示の入館料が本文にない。 |
| HOLD (other_hold) | 備前長船刀剣博物館 | 2026年8月〜2027年2月は特別展料金適用で、当該期間の適用額が未確認。 |
| HOLD (other_hold) | 日本化石資料館 | 公式県紹介は2022年の情報で、現行営業・観覧条件の追加確認が必要。 |
| HOLD (other_hold) | 倉敷昆虫館 | 現行の昆虫展示と所在地は公式確認、入館料金区分が未確認。 |
| ADD 8109 | 満奇洞 | [official 1](https://www.okayama-kanko.jp/spot/detail_10993.html) |
| ADD 8110 | 岡山後楽園 | [official 1](https://www.okayama-kanko.jp/spot/detail_10001.html) |
| ADD 8111 | 大原美術館 | [official 1](https://www.okayama-kanko.jp/spot/detail_10397.html) |
| ADD 8112 | 井倉洞 | [official 1](https://www.okayama-kanko.jp/spot/detail_10936.html) |
| HOLD (not_eligible) | 林源十郎商店 | 店舗・飲食主体の複合商業施設で、独立した親子向け外出体験を確認できない。 |

### fukushima

| Disposition | Facility / listing name | Evidence or reason |
|---|---|---|
| ADD 8113 | アカベコランド | [official 1](https://www.aizukanko.com/spot/1053) |
| ADD 8114 | 鶴ヶ城 | [official 1](https://www.aizukanko.com/spot/134) |
| ADD 8115 | 手作り体験ひろば番匠 | [official 1](https://www.aizukanko.com/spot/185) |
| ADD 8116 | 会津藩校日新館 | [official 1](https://www.aizukanko.com/spot/55) |
| ADD 8117 | 会津武家屋敷 | [official 1](https://www.aizukanko.com/spot/46) |
| ADD 8118 | 昭和なつかし館 | [official 1](https://www.aizukanko.com/spot/11) |
| HOLD (other_hold) | 生涯学習総合センター（會津稽古堂） | 図書館・学習貸室の案内から、通常利用可能な親子向け体験範囲を確定できない。 |
| HOLD (not_eligible) | 文化センター | 文化ホール・貸室利用が中心で、常設の家族向け見学・体験施設ではない。 |
| ADD 8119 | 福島県立博物館 | [official 1](https://general-museum.fcs.ed.jp/) / [official 2](https://general-museum.fcs.ed.jp/page_information/price) / [official 3](https://general-museum.fcs.ed.jp/page_information/location) |
| HOLD (other_hold) | 国立磐梯青少年交流の家 | 青少年団体向け研修利用と個人家族利用の予約・料金条件を切り分けて確定できない。 |
| HOLD (other_hold) | 福島市写真美術館 | 公式県ページで料金は確認したが、施設の正式住所が未確認。 |
| ADD 8120 | リト リーフアート ミュージアム 福島 | [official 1](https://www.tif.ne.jp/jp/entry/article.html?spot=7658) / [official 2](https://www.matsuya-inc.com/art_museum) |
| HOLD (other_hold) | 須賀川特撮アーカイブセンター | 展示と無料入館は確認したが、施設所在地の公式本文確認が未完了。 |
| ADD 8121 | 風流のはじめ館 | [official 1](https://www.tif.ne.jp/jp/entry/article.html?spot=7430) |
| ADD 8122 | こむこむ | [official 1](https://www.f-shinkoukousha.or.jp/comcom/?page_id=365) / [official 2](https://www.f-shinkoukousha.or.jp/comcom/planetarium/) / [official 3](https://www.f-shinkoukousha.or.jp/comcom/news/879/) |
| ADD 8123 | ふくしま森の科学体験センター | [official 1](http://www.mushitec-fukushima.gr.jp/) / [official 2](https://www.mushitec-fukushima.gr.jp/guide/) |
| HOLD (other_hold) | 福島県環境創造センター | 施設内容・所在地・料金は公式確認済みだが、確認した所在地に対応する地図位置を確定できない。無関係な検索結果は不採用。 |
| DUPLICATE | 高柳電設工業スペースパーク | Existing 2911: 郡山市ふれあい科学館 スペースパーク |
| HOLD (other_hold) | 磐梯山噴火記念館 | 公式サイトはHTTP 200だが実質本文を取得できず、現行料金等が未確認。 |
| ADD 8124 | いわき市石炭・化石館 | [official 1](http://www.sekitankasekikan.or.jp/) / [official 2](https://www.sekitankasekikan.or.jp/information.html) / [official 3](https://www.sekitankasekikan.or.jp/access.html) |
| ADD 8125 | 東日本大震災・原子力災害伝承館 | [official 1](https://www.fipo.or.jp/lore/) / [official 2](https://www.fipo.or.jp/lore/access) |
| DUPLICATE | アクアマリンえっぐ / アクアマリンふくしま | Existing 7281: 環境水族館アクアマリンふくしま |
| HOLD (other_hold) | 野口英世記念館 | 公式で体験展示・現行活動は確認したが、現在の入館料金が未確認。 |

### toyama

| Disposition | Facility / listing name | Evidence or reason |
|---|---|---|
| ADD 8126 | 高岡市 藤子・F・不二雄ふるさとギャラリー | [official 1](https://www.takaoka.or.jp/viewpoint/detail_3433.html) |
| ADD 8127 | 高岡市立博物館 | [official 1](https://www.takaoka.or.jp/viewpoint/detail_3203.html) |
| ADD 8128 | 高岡市鋳物資料館 | [official 1](https://www.takaoka.or.jp/viewpoint/detail_3255.html) |
| ADD 8129 | 高岡御車山会館 | [official 1](https://www.takaoka.or.jp/viewpoint/detail_3403.html) |
| HOLD (other_hold) | 高岡市伏木北前船資料館 | 公式観光ページの住所表記「伏木古国」に疑義があり、正式所在地の追加照合が必要。 |
| HOLD (other_hold) | 高岡市伏木気象資料館 | 公式観光ページの住所表記と地区名の対応を確定できない。 |
| ADD 8130 | 高岡市万葉歴史館 | [official 1](https://www.takaoka.or.jp/viewpoint/detail_3192.html) |
| ADD 8131 | 氷見市潮風ギャラリー | [official 1](https://www.takaoka.or.jp/viewpoint/detail_3131.html) |
| ADD 8132 | ミュゼふくおかカメラ館 | [official 1](https://www.takaoka.or.jp/viewpoint/detail_3188.html) |
| ADD 8133 | 高岡市土蔵造りのまち資料館 | [official 1](https://www.takaoka.or.jp/viewpoint/detail_3222.html) |
| ADD 8134 | 雅楽の館 | [official 1](https://www.takaoka.or.jp/viewpoint/detail_3828.html) |
| ADD 8135 | 富山県総合デザインセンター | [official 1](https://www.takaoka.or.jp/viewpoint/detail_3444.html) |
| ADD 8136 | FACTORY ART MUSEUM TOYAMA | [official 1](https://www.takaoka.or.jp/viewpoint/detail_3437.html) |
| HOLD (other_hold) | エコタウン交流推進センター | 貸室無料は確認したが、一般展示利用条件と施設の正式所在地が未確認。 |
| HOLD (other_hold) | 富山市郷土博物館・佐藤記念美術館 | 郷土博物館は既存3376。併記された佐藤記念美術館の独立性・必要項目が未確定。 |
| HOLD (other_hold) | 海浜公園キャンプ場 | 朝日町の施設であることは確認。正式所在地とキャンプ利用料金が未確認。 |
| ADD 8137 | 墓の木自然公園 | [official 1](http://www.nyuzen-kanko.jp/asobu_manabu/211/) |
| HOLD (other_hold) | 入善町中央公園 | 遊具・親水広場と所在地は公式確認、一般利用の料金区分が未確認。 |
| HOLD (other_hold) | 富山県立山博物館 | 公式施設案内を確認したが、展示施設ごとの現行料金が未確認。 |
| DUPLICATE | BBTパーク こどもっちパーク ファボーレ店 | Existing 6967: BBTパーク |

### mie

| Disposition | Facility / listing name | Evidence or reason |
|---|---|---|
| HOLD (other_hold) | 鳥羽大庄屋 かどや | 公式で所在地・催しを確認。常設見学の入館料金区分が未確認。 |
| ADD 8138 | 鳥羽湾めぐりとイルカ島 | [official 1](https://www.toba.gr.jp/sightseeing/1864/) / [official 2](https://shima-marineleisure.com/toba/) |
| HOLD (other_hold) | ストーンハンター伊勢志摩 | 採掘体験料金と所在地は確認したが、正式所在地と施設地図位置の突合が未完了。 |
| HOLD (not_eligible) | 鳥羽水族館 | 同住所の館内体験が既存3687・3749に分割登録されており、親施設追加は重複隣接の曖昧さが残る。 |
| ADD 8139 | ミキモト真珠島 | [official 1](https://www.toba.gr.jp/sightseeing/1853/) / [official 2](https://www.mikimoto-pearl-island.jp/営業案内) |
| ADD 8140 | キッズパーク umi no ue | [official 1](https://www.toba.gr.jp/sightseeing/3016/) |
| HOLD (other_hold) | 鳥羽里山キャンプ場 | 所在地は確認したが、現行のキャンプ利用料金が未確認。 |
| ADD 8141 | 鳥羽市立海の博物館 | [official 1](https://www.toba.gr.jp/sightseeing/1793/) / [official 2](https://www.city.toba.mie.jp/kanko_bunka_sports/shisetsu/3656.html) |
| HOLD (other_hold) | 鳥羽市立図書館 | 図書館としての利用案内のみで、独立した家族向け外出価値の確認が不足。 |
| HOLD (other_hold) | 鳥羽市歴史文化ガイドセンター（門野幾之進記念館） | 公式市紹介から一般見学の料金区分・正式所在地を確定できない。 |
| DUPLICATE | 三重県総合博物館 / MieMu三重県総合博物館（ミエム三重県総合博物館） | Existing 3702: 三重県総合博物館「ＭｉｅＭｕ（みえむ）」 |
| DUPLICATE | 神宮徴古館農業館 / 神宮徴古館・農業館・式年遷宮記念神宮美術館 | Existing 3738: 神宮徴古館･農業館 【伊勢神宮の博物館】 |
| HOLD (other_hold) | 七里御浜ふれあいビーチ | 公式県紹介で所在地は確認したが、施設利用の無料・有料区分が未確認。 |
| HOLD (other_hold) | 竹あかり工房 きぼう | 体験工房の存在と所在地は確認したが、現行の体験料金が未確認。 |
| HOLD (not_eligible) | いなべ市梅林公園 あわい | 既存3733梅林公園内の施設追加にあたり、親施設・既存キャンプ場との重複隣接の曖昧さが残る。 |
| HOLD (other_hold) | 刀剣ワールド桑名・多度 別館 | 施設内容・所在地・料金は公式確認済みだが、確認した所在地に対応する地図位置を確定できない。無関係な検索結果は不採用。 |
| ADD 8142 | 川越電力館テラ46 | [official 1](https://www.jera.co.jp/corporate/business/museum/kawagoe) / [official 2](https://www.jera.co.jp/corporate/business/museum/kawagoe/access) |
| ADD 8143 | 鈴鹿市考古博物館 | [official 1](https://www.city.suzuka.lg.jp/kouko/) / [official 2](https://www.city.suzuka.lg.jp/kouko/about/1009344.html) / [official 3](https://www.city.suzuka.lg.jp/kouko/about/1009339.html) |

### wakayama

| Disposition | Facility / listing name | Evidence or reason |
|---|---|---|
| HOLD (not_eligible) | 白浜美術館・歓喜神社 | 確認できる主展示は男女結合像等の宗教美術で、子ども向け外出施設としての基準を満たさない。 |
| ADD 8144 | 平草原公園 | [official 1](https://www.nankishirahama.jp/spot/533/) |
| HOLD (other_hold) | 和歌山市民図書館 | 公式入口が施設案内の一覧で、親子向け利用範囲・住所・料金の個別確認が未完了。 |
| ADD 8145 | 湊御殿 | [official 1](https://www.city.wakayama.wakayama.jp/shisetsu/bunkashisetsu/1010297.html) |
| ADD 8146 | 旧中筋家住宅 | [official 1](https://www.city.wakayama.wakayama.jp/shisetsu/bunkashisetsu/1010298.html) |
| ADD 8147 | 平井歴史資料室 | [official 1](https://www.city.wakayama.wakayama.jp/shisetsu/bunkashisetsu/1034719.html) |
| ADD 8148 | 和歌山城 | [official 1](https://www.wakayama-kanko.or.jp/spots/detail_661.html) |
| ADD 8149 | 鷲ヶ峰コスモスパーク | [official 1](https://www.wakayama-kanko.or.jp/spots/detail_3215.html) |
| HOLD (other_hold) | AQUA LOOP 片男波 | 2026年夏季営業の終了を確認。次期営業・常設性が未確認。 |
| HOLD (other_hold) | 道の駅 青洲の里 | 道の駅内の展示施設と飲食・物販を区別した見学料金が未確認。 |
| HOLD (other_hold) | 角長醤油資料館・職人蔵 | 施設内容・所在地・料金は公式確認済みだが、確認した所在地に対応する地図位置を確定できない。無関係な検索結果は不採用。 |

### shimane

| Disposition | Facility / listing name | Evidence or reason |
|---|---|---|
| DUPLICATE | 小泉八雲記念館 | Existing 7294: 小泉八雲記念館・小泉八雲旧居 |
| HOLD (other_hold) | 興雲閣 | 貸切料金は確認したが、通常の一般入館料金区分が未確認。 |
| ADD 8150 | 松江ホーランエンヤ伝承館 | [official 1](https://www.kankou-matsue.jp/kankou/desc/?cat=%E8%A6%B3%E5%85%89%E6%96%BD%E8%A8%AD&spot=27671) |
| ADD 8151 | 田部美術館 | [official 1](https://www.kankou-matsue.jp/kankou/desc/?cat=%E8%A6%B3%E5%85%89%E6%96%BD%E8%A8%AD&spot=27685) |
| ADD 8152 | マリンプラザしまね | [official 1](https://www.kankou-matsue.jp/kankou/desc/?cat=%E8%A6%B3%E5%85%89%E6%96%BD%E8%A8%AD&spot=27646) |
| ADD 8153 | ごうぎんカラコロ美術館 | [official 1](https://www.kankou-matsue.jp/kankou/desc/?cat=%E8%A6%B3%E5%85%89%E6%96%BD%E8%A8%AD&spot=27737) |
| HOLD (other_hold) | メテオプラザ | 施設公式URLはHTTP 200だが本文を取得できず、料金・所在地等が未確認。 |
| ADD 8154 | 安部榮四郎記念館 | [official 1](https://www.kankou-matsue.jp/kankou/desc/?cat=%E8%A6%B3%E5%85%89%E6%96%BD%E8%A8%AD&spot=27723) |
| HOLD (other_hold) | 中村元記念館 | 資料展示と所在地は確認したが、一般の観覧料金区分が未確認。 |
| ADD 8155 | 出雲玉作資料館 | [official 1](https://www.kankou-matsue.jp/kankou/desc/?cat=%E8%A6%B3%E5%85%89%E6%96%BD%E8%A8%AD&spot=27657) |
| HOLD (other_hold) | 鹿島歴史民俗資料館 | 観光協会の休館情報は2023年表記で、現行料金と公開条件の追加確認が必要。 |
| DUPLICATE | 島根県立三瓶自然館 | Existing 6687: 島根県立三瓶自然館サヒメル |
| ADD 8156 | 足立美術館 | [official 1](https://www.kankou-shimane.com/destination/20251) |
| ADD 8157 | 龍源寺間歩 | [official 1](https://www.kankou-shimane.com/destination/20238) |
| HOLD (other_hold) | WINDY FARM 風の丘の遊び場 | 2026年4月開設の遊び場を確認。遊び場の正確な住所・利用料金区分が未確認。 |
| HOLD (other_hold) | 森鴎外記念館 | 公式の住所表記は津和野町町田までで、施設の詳細所在地・地図位置が未確定。 |
| HOLD (other_hold) | 島根原子力館 | 公式で子ども向け展示は確認したが、一般入館料金・詳細所在地の確認が未完了。 |
| ADD 8158 | 石見銀山資料館 | [official 1](https://igmuseum.jp/) / [official 2](https://igmuseum.jp/outline/) |

### kochi

| Disposition | Facility / listing name | Evidence or reason |
|---|---|---|
| DUPLICATE | トンボ自然公園 / 四万十川学遊館 | Existing 6657: 四万十川学遊館あきついお |
| ADD 8159 | 四万十市郷土博物館しろっと | [official 1](https://www.shimanto-kankou.com/kanko/history/kyoudo.html) |
| HOLD (other_hold) | とまろっと | キャンプ施設の所在地は公式確認、現行利用料金が未確認。 |
| HOLD (other_hold) | 権谷せせらぎ交流館 | 施設内容・所在地・料金は公式確認済みだが、確認した所在地に対応する地図位置を確定できない。無関係な検索結果は不採用。 |
| HOLD (other_hold) | 四万十市天体観測施設 | 施設内容・所在地・料金は公式確認済みだが、確認した所在地に対応する地図位置を確定できない。無関係な検索結果は不採用。 |
| DUPLICATE | 横倉山自然の森博物館 | Existing 6647: 越知町立横倉山自然の森博物館 |
| DUPLICATE | 佐川地質館 | Existing 6645: 佐川町立佐川地質館 |
| HOLD (other_hold) | Kids Park CHUCHU 高知 蔦屋書店 | 公式で2026年6月13日のリニューアルを確認。現行利用料金が未確認。 |
| ADD 8160 | 土佐清水市立貝類展示館 海のギャラリー | [official 1](https://www.city.tosashimizu.kochi.jp/kanko/g01_uminogallery.html) |
| ADD 8161 | 中岡慎太郎館 | [official 1](http://www.nakaokashintarokan.jp/) / [official 2](http://www.nakaokashintarokan.jp/guide-01.html) |

### tokushima

| Disposition | Facility / listing name | Evidence or reason |
|---|---|---|
| HOLD (other_hold) | 鳴門市賀川豊彦記念館 | 観光協会で所在地・開館日を確認したが、入館料金区分が未確認。 |
| HOLD (other_hold) | モラエス展示場 | 取得した自治体ページで展示施設の現行利用条件・料金を確定できない。 |
| HOLD (other_hold) | とくしま植物園 | 施設内容・所在地・料金は公式確認済みだが、確認した所在地に対応する地図位置を確定できない。無関係な検索結果は不採用。 |
| DUPLICATE | 徳島城博物館 / 旧徳島城表御殿庭園 | Existing 6834: 徳島市立徳島城博物館 |
| HOLD (other_hold) | 徳島中央公園 | 駐車料・庭園料金と公園一般利用を区別した料金区分が未確認。 |
| HOLD (not_eligible) | こくふ街角博物館 | 街中の複数拠点を巡る取り組みであり、単独住所を持つ一施設ではない。 |
| HOLD (other_hold) | ひょうたん島周遊船 | 乗船料は確認したが、受付場所の正式所在地と地図位置が未確定。 |
| HOLD (other_hold) | 新町川水際公園 | 散策施設の紹介と駐車料は確認したが、一般利用の料金区分が未確認。 |
| HOLD (other_hold) | 阿波史跡公園 | 駐車場無料は確認したが、公園一般利用の料金区分が未確認。 |
| DUPLICATE | あすたむらんど子ども科学館 | Existing 6820: あすたむらんど徳島 |
| HOLD (other_hold) | Oboke Activity Park | 施設内容・所在地・料金は公式確認済みだが、確認した所在地に対応する地図位置を確定できない。無関係な検索結果は不採用。 |
| HOLD (other_hold) | 貴彩ガーデン | 施設内容・所在地・料金は公式確認済みだが、確認した所在地に対応する地図位置を確定できない。無関係な検索結果は不採用。 |
| DUPLICATE | 阿波十郎兵衛屋敷 | Existing 6838: 徳島県立阿波十郎兵衛屋敷 |
| HOLD (other_hold) | ニコニコ公園方上 | 市公式本文をWeb取得で確認（通常HTTP取得は404）。一般利用の料金区分が未確認。 |
| DUPLICATE | 海陽町立博物館 | Existing 6853: 阿波海南文化村・海陽町立博物館 |
| DUPLICATE | 妖怪屋敷・石の博物館 | Existing 6860: 道の駅大歩危 妖怪屋敷と石の博物館 |

### yamagata

| Disposition | Facility / listing name | Evidence or reason |
|---|---|---|
| DUPLICATE | 加茂水族館 / 東北エプソンアクアリウムかもすい | Existing 3864: 東北エプソン アクアリウム かもすい（鶴岡市立加茂水族館） |
| ADD 8162 | 東田川文化記念館 | [official 1](https://www.tsuruokakanko.com/spot/1160) |
| ADD 8163 | いでは文化記念館 | [official 1](https://www.tsuruokakanko.com/spot/294) |
| HOLD (other_hold) | 月山あさひ博物村 | 複合施設内の開催中企画料金と常設利用の料金を切り分けて確定できない。 |
| HOLD (other_hold) | 鶴岡公園 | 自治体公式で公園を確認したが、一般利用の料金区分が未確認。 |
| HOLD (other_hold) | 小真木原公園 | 遊具と冬季閉鎖を確認したが、公園一般利用の料金区分が未確認。 |
| HOLD (other_hold) | 鶴岡東公園 | 遊具と冬季閉鎖を確認したが、公園一般利用の料金区分が未確認。 |
| HOLD (other_hold) | 鶴岡南部公園 | 遊具と冬季閉鎖を確認したが、公園一般利用の料金区分が未確認。 |
| HOLD (other_hold) | 鶴岡西部公園 | 自治体公式で公園を確認したが、一般利用の料金区分が未確認。 |
| HOLD (other_hold) | 大山公園 | 自治体公式で公園を確認したが、一般利用の料金区分が未確認。 |
| HOLD (other_hold) | 湯田川公園 | 遊具と冬季閉鎖を確認したが、公園一般利用の料金区分が未確認。 |
| HOLD (other_hold) | 藤島歴史公園 | 自治体公式で公園を確認したが、一般利用の料金区分が未確認。 |
| HOLD (other_hold) | 蝦夷館公園 | 自治体公式で公園を確認したが、一般利用の料金区分が未確認。 |
| HOLD (other_hold) | くわだいさくら公園 | 遊具と冬季閉鎖を確認したが、公園一般利用の料金区分が未確認。 |
| HOLD (other_hold) | 温海公園・バラ園 | 自治体公式で公園を確認したが、一般利用の料金区分が未確認。 |
| HOLD (other_hold) | 瓜割石庭公園 | 県公式URLの本文から所在地・料金等の必要項目を確認できない。 |
| DUPLICATE | 山形城跡・霞城公園 | Existing 3872: 霞城公園（山形城跡） |
| ADD 8164 | 山形県郷土館 文翔館 | [official 1](https://yamagatakanko.com/attractions/detail_2515.html) |
| ADD 8165 | 米沢城址 / 松が岬公園 | [official 1](https://yamagatakanko.com/attractions/detail_2314.html) |
| HOLD (other_hold) | 酒造資料館　東光の酒蔵 | 発見元の公式リンクが404で、現在の展示営業と料金を確定できない。 |
| ADD 8166 | 伝国の杜 米沢市上杉博物館 | [official 1](https://www.denkoku-no-mori.yonezawa.yamagata.jp/top.htm) / [official 2](https://www.denkoku-no-mori.yonezawa.yamagata.jp/uesugi.htm) |
| ADD 8167 | よねざわ昆虫館 | [official 1](https://yonekoncyu.wixsite.com/yonekonkomisui) / [official 2](https://yonekoncyu.wixsite.com/yonekonkomisui/利用案内) |

### aomori

| Disposition | Facility / listing name | Evidence or reason |
|---|---|---|
| ADD 8168 | 弘前忍者屋敷 | [official 1](https://www.hirosaki-kanko.or.jp/edit.html?id=ninja) / [official 2](https://www.hirosaki-kanko.or.jp/details.html?id=CNT00405270933092437) |
| ADD 8169 | 旧弘前市立図書館 | [official 1](https://www.hirosaki-kanko.or.jp/details.html?id=CNT00403281544495284) |
| ADD 8170 | 旧伊東家住宅・旧梅田家住宅 | [official 1](https://www.hirosaki-kanko.or.jp/details.html?id=CNT00403281534289619) |
| HOLD (other_hold) | 旧笹森家住宅 | 公式観光紹介から現在の公開条件・入館料金区分を確定できない。 |
| ADD 8171 | 旧岩田家住宅 | [official 1](https://www.hirosaki-kanko.or.jp/details.html?id=CNT00403281652247984) |
| ADD 8172 | 弘前市立百石町展示館 | [official 1](https://www.hirosaki-kanko.or.jp/details.html?id=CNT00403281723466249) |
| DUPLICATE | 弘前城 | Existing 3908: 弘前公園 |
| HOLD (other_hold) | 藤田記念庭園 | 冬期の無料公開は確認したが、通常期の庭園入園料金が未確認。 |
| HOLD (other_hold) | 弘前れんが倉庫美術館 | 施設内容・所在地・料金は公式確認済みだが、確認した所在地に対応する地図位置を確定できない。無関係な検索結果は不採用。 |
| DUPLICATE | こどもの森 | Existing 3911: 弘前市こどもの森 |
| ADD 8173 | 三沢市歴史民俗資料館 | [official 1](http://kite-misawa.com/rekimin_misawa/) |
| HOLD (other_hold) | 深浦町歴史民俗資料館・美術館 | 名簿の施設URLが町の一般教育ページに移動しており、個別施設の現行情報を確定できない。 |
| HOLD (other_hold) | 新渡戸記念館 | 公式サイトの資料を確認したが、現在の一般公開日・入館料金が未確認。 |
| ADD 8174 | 八戸市博物館 | [official 1](https://hachinohe-city-museum.jp/) / [official 2](https://hachinohe-city-museum.jp/guide_information/) |
| ADD 8175 | 八戸市南郷歴史民俗資料館 | [official 1](https://nango-hf.jp/) / [official 2](https://nango-hf.jp/guide/) |
| HOLD (other_hold) | 櫛引八幡宮国宝館 | 神社本体と国宝館を区別した現行の入館料金・公開条件が未確認。 |
| DUPLICATE | 十和田市馬事公苑称徳館 | Existing 3922: 十和田市馬事公苑 駒っこランド |
| ADD 8176 | 八戸市埋蔵文化財センター 是川縄文館 | [official 1](https://www.korekawa-jomon.jp/) / [official 2](https://www.korekawa-jomon.jp/guide/) |
| HOLD (other_hold) | 円覚寺奉納海上信仰史料収蔵庫 | 寺院と史料収蔵庫を区別した現行の見学料金・条件が未確認。 |
| HOLD (other_hold) | 鶴の舞橋 | 公式県紹介で無料は確認したが、正式所在地と橋の入口位置の突合が未完了。 |
| HOLD (other_hold) | 十二湖／青池 | 自然景勝地の範囲が広く、登録単位・必要な所在地と料金区分が未確定。 |
| HOLD (other_hold) | 市民交流プラザ トワーレ | 2026年10月以降に遊戯部分が休止予定で、2027年再開後の利用条件は未確定。 |
| DUPLICATE | 特別史跡三内丸山遺跡　縄文時遊館 | Existing 3901: 三内丸山遺跡 |
| HOLD (other_hold) | 七戸町立鷹山宇一記念美術館 | 公式利用案内で所在地は確認したが、現行展覧会の料金が未確認。 |

## Existing-facility signals

- **saitama / 488 所沢航空発祥記念館** — 2025-09-01から2027年3月末まで休館予定。既存データにも記載済み。 [Official source](https://tam-web.jsf.or.jp/)
- **hyogo / 7996 姫路市立美術館** — 2026-04-01から2027年12月末まで本館・カフェ休館予定。庭園は開放。既存データに休館記載なし。 [Official source](https://www.city.himeji.lg.jp/art/0000032163.html)
- **hyogo / 1449 神戸アンパンマンこどもミュージアム＆モール** — 館内のバイキンひみつ基地は2027-01-31運営終了予定。施設発行の公式プレスリリースで確認。施設全体の閉館ではない。 [Official source](https://www.atpress.ne.jp/news/609668)
- **toyama / 3387 庄川峡遊覧船** — 8月30日午後から一部便再開、全面的な通常運航は状況次第との公式観光案内。既存データの通常ルート案内には制限記載なし。 [Official source](https://www.takaoka.or.jp/viewpoint/detail_3286.html)

No closure or critical-decision change observed on existing facilities in the other 10 prefectures. Existing facility rows were not edited by this discovery change.

## Verification

- Full `npm run build`: updated `origin/main` (`bdfdc65`) exit 0, 5963 static pages; branch exit 0, 6064 static pages. Build errors 0 → 0. Both report the existing Next.js middleware deprecation warning.
- Data-quality audit: 6115 → 6150 findings. Existing-facility issue counts unchanged. The 35 reviewed exceptions are 33 legacy allowlist flags in authorized prefectures and two official unnumbered park/forest addresses (8090, 8137). No newly introduced tag, description or coordinate issue remains.
- All 5801 baseline rows unchanged. Added IDs 8076–8176 only. Counts, authorized scope and broad prefecture coordinate bounds verified.
- Generated static HTML checked for all 101 new facility names and descriptions.
- Four canon stamps recomputed with Node `SHA256(JSON.stringify(parsedCanon))`; counts are 5902.
- Event-source registry: 101 corresponding rows added; existing rows unchanged. Legacy coverage snapshot remains a separate, older assessment.
- No verified individual bookable offer was found for these additions; no offer added.
- No merge, deploy, monthly runner, rotation-state, private operational ledger, event data, schema or UI change.

PM independently reviews the diff/build, then controls any merge, deploy and production reflection check.

The discovery facility baseline was `639be6f`. Main advanced through event-only PR #91 during this run; the facility change was rebased and both full builds were repeated on the updated baseline. No event-data difference is part of this PR.

Failed/empty entry-point attempts (not credited for coverage): old Fukushima tourism `/jp/spot/` (404), old Toba `/spot/` (404), the former Hyogo association entry (HTTP 200 with meta redirect), and direct Tokushima new-park fetch (404; Web fallback succeeded). The failed Gaikaku access-page fetch (404) was supplemented by working official facility pages. Exact URLs are recorded in the JSON.
