# Facility Quality Audit Summary

Generated: 2026-07-04

## 全体サマリ

- 施設数: 2180
- issue総数: 9195
- severity内訳: high 1103 / medium 5034 / low 911 / info 2147

## 県別テーブル

| prefecture |施設数 |avg desc字数 |desc<100 |things未整備 |issue総数 |
| --- |--- |--- |--- |--- |--- |
| aichi |125 |93.4 |90 |0 |592 |
| chiba |127 |28.6 |127 |126 |611 |
| fukuoka |125 |83.8 |119 |0 |568 |
| gunma |145 |62.5 |145 |0 |682 |
| hiroshima |122 |107.6 |47 |0 |522 |
| hyogo |123 |92 |71 |0 |444 |
| ibaraki |100 |93 |66 |0 |311 |
| kanagawa |141 |30.4 |140 |139 |672 |
| kyoto |100 |66.9 |99 |0 |409 |
| nagano |123 |66.9 |109 |24 |449 |
| niigata |127 |28.7 |127 |127 |610 |
| osaka |132 |101 |47 |0 |485 |
| saitama |127 |30.7 |127 |126 |603 |
| shizuoka |124 |78.8 |108 |45 |496 |
| tochigi |125 |32.9 |125 |125 |579 |
| tokyo |191 |46.4 |186 |66 |699 |
| yamanashi |123 |90.1 |94 |18 |463 |

## カテゴリ別テーブル

| category |施設数 |avg desc字数 |desc<100 |things未整備 |issue総数 |
| --- |--- |--- |--- |--- |--- |
| aquarium |43 |70.7 |31 |16 |170 |
| art-museum |72 |60.7 |66 |27 |293 |
| athletic |41 |87.2 |27 |16 |147 |
| craft |52 |66.5 |48 |6 |231 |
| experience |201 |54.6 |177 |106 |968 |
| fruit-picking |15 |78.1 |13 |3 |73 |
| game-center |4 |49.8 |4 |1 |13 |
| hot-spring-pool |57 |52.9 |53 |33 |325 |
| hotel |3 |68.7 |3 |1 |10 |
| indoor-play |175 |64 |152 |71 |784 |
| indoor-theme-park |23 |75.7 |16 |7 |97 |
| museum |304 |60.3 |267 |114 |1300 |
| nature-park |195 |59.6 |178 |78 |894 |
| park |459 |69.8 |361 |151 |1732 |
| scenic |131 |63.7 |107 |55 |584 |
| science-museum |123 |71 |100 |23 |454 |
| ski |30 |55.5 |29 |11 |130 |
| theme-park |81 |81.1 |56 |26 |291 |
| viewpoint |55 |73 |45 |11 |244 |
| zoo |116 |70.9 |94 |40 |455 |

## issue code 別件数

| issue code |count |
| --- |--- |
| desc_under_100 |1827 |
| desc_under_150 |329 |
| desc_no_proper_noun |640 |
| desc_elements_missing |1889 |
| things_missing |796 |
| things_dup_signature |788 |
| things_broken_fragment |116 |
| things_generic |581 |
| template_phrase |16 |
| stale_price_in_desc |13 |
| stale_price_in_fee |653 |
| stale_hours |12 |
| stale_event_name |1 |
| stale_temporal |3 |
| safety_missing |521 |
| official_check_needed |706 |
| flagship_weak_desc |304 |

## 改善レーン

- things_to_do未整備5県: 643
- template cleanup: 16
- stale price/hours/temporal: 28
- safety: 521
- flagship weak desc: 304

### template cleanup 代表例

| id |名前 |県 |score |主要issue |
| --- |--- |--- |--- |--- |
| 1668 |東山動植物園 |aichi |47.6 |desc_under_100, desc_no_proper_noun, things_broken_fragment, things_generic |
| 1725 |安城産業文化公園デンパーク |aichi |40.8 |desc_under_100, things_broken_fragment, things_generic, template_phrase |
| 1671 |名古屋市科学館 |aichi |37.4 |desc_under_100, things_broken_fragment, template_phrase, flagship_weak_desc |
| 1693 |博物館明治村 |aichi |33 |desc_under_100, things_broken_fragment, template_phrase, flagship_weak_desc |
| 1719 |南知多ビーチランド |aichi |27.2 |desc_under_150, desc_no_proper_noun, things_broken_fragment, things_generic |

### stale price/hours/temporal 代表例

| id |名前 |県 |score |主要issue |
| --- |--- |--- |--- |--- |
| 20 |浜名湖体験学習施設ウォット |shizuoka |44.2 |desc_under_100, desc_elements_missing, things_missing, stale_price_in_desc |
| 16 |まかいの牧場 |shizuoka |26 |desc_under_100, desc_elements_missing, things_missing, stale_price_in_desc |
| 399 |中禅寺湖機船 遊覧船 |tochigi |26 |desc_under_100, desc_no_proper_noun, desc_elements_missing, things_missing |
| 165 |山中湖長池親水公園 |yamanashi |24 |desc_under_100, desc_elements_missing, things_generic, stale_hours |
| 32 |藤枝市民プールキッズパーク |shizuoka |19.2 |desc_under_100, desc_elements_missing, things_missing, stale_hours |

### safety 代表例

| id |名前 |県 |score |主要issue |
| --- |--- |--- |--- |--- |
| 489 |所沢航空記念公園 |saitama |68.4 |desc_under_100, desc_elements_missing, things_missing, safety_missing |
| 1023 |大和ゆとりの森 |kanagawa |68.4 |desc_under_100, desc_elements_missing, things_missing, safety_missing |
| 667 |関川村 大したもん蛇まつり |niigata |66 |desc_under_100, desc_no_proper_noun, desc_elements_missing, things_missing |
| 515 |川口グリーンセンター |saitama |64.6 |desc_under_100, desc_elements_missing, things_missing, safety_missing |
| 837 |県立秦野戸川公園 |kanagawa |64.6 |desc_under_100, desc_elements_missing, things_missing, safety_missing |

### flagship 代表例

| id |名前 |県 |score |主要issue |
| --- |--- |--- |--- |--- |
| 489 |所沢航空記念公園 |saitama |68.4 |desc_under_100, desc_elements_missing, things_missing, safety_missing |
| 1023 |大和ゆとりの森 |kanagawa |68.4 |desc_under_100, desc_elements_missing, things_missing, safety_missing |
| 667 |関川村 大したもん蛇まつり |niigata |66 |desc_under_100, desc_no_proper_noun, desc_elements_missing, things_missing |
| 485 |西武園ゆうえんち |saitama |64.8 |desc_under_100, desc_no_proper_noun, desc_elements_missing, things_missing |
| 515 |川口グリーンセンター |saitama |64.6 |desc_under_100, desc_elements_missing, things_missing, safety_missing |

## batch1_proposal

| id |名前 |県 |score |selection_reason |
| --- |--- |--- |--- |--- |
| 1200 |群馬県立観音山ファミリーパーク |gunma |51 |high severity safety note gap / event-backed flagship with weak description |
| 1533 |西猪名公園ウォーターランド |hyogo |47.6 |high severity safety note gap / event-backed flagship with weak description |
| 1628 |ビバスクエア京都 キッズウォーターパーク |kyoto |47.6 |high severity safety note gap / event-backed flagship with weak description |
| 1668 |東山動植物園 |aichi |47.6 |template_phrase cleanup / event-backed flagship with weak description |
| 10 |日本平動物園 |shizuoka |46.8 |event-backed flagship with weak description |
| 1126 |城里町健康増進施設 ホロルの湯 |ibaraki |45 |high severity safety note gap / event-backed flagship with weak description |
| 2046 |浜名湖ガーデンパーク |shizuoka |45 |high severity safety note gap / event-backed flagship with weak description |
| 1403 |長野公園 |osaka |44.8 |event-backed flagship with weak description |
| 20 |浜名湖体験学習施設ウォット |shizuoka |44.2 |stale wording cleanup / event-backed flagship with weak description |
| 1725 |安城産業文化公園デンパーク |aichi |40.8 |template_phrase cleanup / event-backed flagship with weak description |
| 1671 |名古屋市科学館 |aichi |37.4 |template_phrase cleanup / event-backed flagship with weak description |
| 1693 |博物館明治村 |aichi |33 |template_phrase cleanup / event-backed flagship with weak description |
| 1719 |南知多ビーチランド |aichi |27.2 |template_phrase cleanup |
| 1731 |のんほいパーク（豊橋総合動植物公園） |aichi |27.2 |template_phrase cleanup |
| 16 |まかいの牧場 |shizuoka |26 |stale wording cleanup |
| 165 |山中湖長池親水公園 |yamanashi |24 |stale wording cleanup / high severity safety note gap |
| 32 |藤枝市民プールキッズパーク |shizuoka |19.2 |stale wording cleanup |
| 70 |こだまの森 |nagano |19.2 |stale wording cleanup |
| 126 |Ventforet Oshiroland(ボーネルンド系) |yamanashi |19.2 |stale wording cleanup |
| 325 |チームラボプラネッツ TOKYO DMM |tokyo |19.2 |template_phrase cleanup |
| 44 |熱海クラフト工房 |shizuoka |18 |stale wording cleanup |
| 1667 |名古屋港水族館 |aichi |17 |template_phrase cleanup |
| 1669 |レゴランド・ジャパン |aichi |17 |template_phrase cleanup |
| 158 |河口湖木ノ花美術館(猫のダヤン) |yamanashi |16 |stale wording cleanup |
| 202 |アウルアドベンチャー |nagano |16 |template_phrase cleanup |
| 875 |そなエリア東京(東京臨海広域防災公園) |tokyo |16 |stale wording cleanup |
| 284 |東京臨海広域防災公園 |tokyo |15.6 |stale wording cleanup |
| 1728 |愛知こどもの国 |aichi |15 |template_phrase cleanup |
| 6 |ピュアハートキッズランド浜松志都呂 |shizuoka |14.4 |stale wording cleanup |
| 33 |Mooovi 浜名湖 |shizuoka |14.4 |stale wording cleanup |
| 62 |城山動物園 |nagano |14.4 |stale wording cleanup |
| 110 |遊亀公園附属動物園 |yamanashi |14.4 |stale wording cleanup |
| 170 |カルプリの森 軽井沢あそびの森 |nagano |14.4 |stale wording cleanup |
| 1167 |前橋市中央児童遊園 るなぱあく |gunma |14.4 |stale wording cleanup |
| 1722 |刈谷ハイウェイオアシス/岩ケ池公園 |aichi |14.4 |template_phrase cleanup |
| 96 |朝日村クラフト体験館 |nagano |14 |stale wording cleanup |
| 156 |河口湖猿まわし劇場 |yamanashi |14 |stale wording cleanup |
| 242 |京王れーるランド |tokyo |13.2 |stale wording cleanup |
| 90 |軽井沢ガラス工房 |nagano |12 |stale wording cleanup |
| 143 |自在ガラス体験工房&ギャラリー |yamanashi |12 |stale wording cleanup |
| 144 |体験工房アントヴ |yamanashi |12 |stale wording cleanup |
| 1670 |リニア・鉄道館 |aichi |12 |template_phrase cleanup |
| 116 |笛吹市八代ふるさと公園 |yamanashi |12 |stale wording cleanup |
| 1703 |愛・地球博記念公園（モリコロパーク） |aichi |12 |template_phrase cleanup |
| 1069 |アクアワールド茨城県大洗水族館 |ibaraki |10.2 |stale wording cleanup |
| 152 |伊豆テディベア・ミュージアム |shizuoka |10 |stale wording cleanup |
| 1676 |トヨタ産業技術記念館 |aichi |10 |template_phrase cleanup |
| 2032 |ちゅーピーアスレチックSOLAE（ちゅーピーパーク） |hiroshima |10 |stale wording cleanup |
| 215 |レゴランド・ディスカバリー・センター東京 |tokyo |8 |template_phrase cleanup |
| 2012 |久井運動公園 |hiroshima |8 |stale wording cleanup |

## batch2_proposal

- 件数: 50
- 傾向: desc_under_100: 50 / flagship_weak_desc: 50 / desc_elements_missing: 49 / desc_no_proper_noun: 27 / things_generic: 25

## ヒューリスティック判定の注意

- 4要素判定と固有名詞判定は機械推定です。最終判断はPM/人間レビューで行ってください。
- この監査は公式確認ではなく、変わりやすい情報・安全注記・予約条件の確認候補を抽出するものです。
