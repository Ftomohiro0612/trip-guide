# Facility Quality Audit Summary

Generated: 2026-07-04

## 全体サマリ

- 施設数: 2180
- issue総数: 10222
- severity内訳: high 1701 / medium 5463 / low 911 / info 2147

## 県別テーブル

| prefecture |施設数 |avg desc字数 |desc<100 |things未整備 |issue総数 |
| --- |--- |--- |--- |--- |--- |
| aichi |125 |93.4 |90 |0 |635 |
| chiba |127 |28.6 |127 |126 |642 |
| fukuoka |125 |83.8 |119 |0 |636 |
| gunma |145 |62.5 |145 |0 |727 |
| hiroshima |122 |107.6 |47 |0 |579 |
| hyogo |123 |92 |71 |0 |543 |
| ibaraki |100 |93 |66 |0 |363 |
| kanagawa |141 |30.4 |140 |139 |724 |
| kyoto |100 |66.9 |99 |0 |503 |
| nagano |123 |66.9 |109 |24 |522 |
| niigata |127 |28.7 |127 |127 |653 |
| osaka |132 |101 |47 |0 |580 |
| saitama |127 |30.7 |127 |126 |646 |
| shizuoka |124 |78.8 |108 |45 |534 |
| tochigi |125 |32.9 |125 |125 |626 |
| tokyo |191 |46.4 |186 |66 |782 |
| yamanashi |123 |90.1 |94 |18 |527 |

## カテゴリ別テーブル

| category |施設数 |avg desc字数 |desc<100 |things未整備 |issue総数 |
| --- |--- |--- |--- |--- |--- |
| aquarium |43 |70.7 |31 |16 |207 |
| art-museum |72 |60.7 |66 |27 |346 |
| athletic |41 |87.2 |27 |16 |171 |
| craft |52 |66.5 |48 |6 |254 |
| experience |201 |54.6 |177 |106 |1044 |
| fruit-picking |15 |78.1 |13 |3 |75 |
| game-center |4 |49.8 |4 |1 |16 |
| hot-spring-pool |57 |52.9 |53 |33 |337 |
| hotel |3 |68.7 |3 |1 |14 |
| indoor-play |175 |64 |152 |71 |880 |
| indoor-theme-park |23 |75.7 |16 |7 |111 |
| museum |304 |60.3 |267 |114 |1505 |
| nature-park |195 |59.6 |178 |78 |939 |
| park |459 |69.8 |361 |151 |1948 |
| scenic |131 |63.7 |107 |55 |617 |
| science-museum |123 |71 |100 |23 |531 |
| ski |30 |55.5 |29 |11 |137 |
| theme-park |81 |81.1 |56 |26 |324 |
| viewpoint |55 |73 |45 |11 |266 |
| zoo |116 |70.9 |94 |40 |500 |

## issue code 別件数

| issue code |count |
| --- |--- |
| desc_under_100 |1827 |
| desc_under_150 |329 |
| desc_no_proper_noun |640 |
| desc_elements_missing |1889 |
| things_missing |796 |
| things_dup_signature |788 |
| things_broken_fragment |745 |
| things_generic |581 |
| template_phrase |16 |
| stale_price_in_desc |13 |
| stale_price_in_fee |653 |
| stale_hours |12 |
| stale_event_name |1 |
| stale_temporal |3 |
| safety_missing |919 |
| official_check_needed |706 |
| flagship_weak_desc |304 |

## 改善レーン

- things_to_do未整備5県: 643
- template cleanup: 16
- stale price/hours/temporal: 28
- safety: 919
- flagship weak desc: 304

### template cleanup 代表例

| id |名前 |県 |score |主要issue |
| --- |--- |--- |--- |--- |
| 1668 |東山動植物園 |aichi |47.6 |desc_under_100, desc_no_proper_noun, things_broken_fragment, things_generic |
| 1719 |南知多ビーチランド |aichi |44.2 |desc_under_150, desc_no_proper_noun, things_broken_fragment, things_generic |
| 1725 |安城産業文化公園デンパーク |aichi |40.8 |desc_under_100, things_broken_fragment, things_generic, template_phrase |
| 1671 |名古屋市科学館 |aichi |37.4 |desc_under_100, things_broken_fragment, template_phrase, flagship_weak_desc |
| 1693 |博物館明治村 |aichi |33 |desc_under_100, things_broken_fragment, template_phrase, flagship_weak_desc |

### stale price/hours/temporal 代表例

| id |名前 |県 |score |主要issue |
| --- |--- |--- |--- |--- |
| 20 |浜名湖体験学習施設ウォット |shizuoka |61.2 |desc_under_100, desc_elements_missing, things_missing, stale_price_in_desc |
| 399 |中禅寺湖機船 遊覧船 |tochigi |36 |desc_under_100, desc_no_proper_noun, desc_elements_missing, things_missing |
| 16 |まかいの牧場 |shizuoka |33.8 |desc_under_100, desc_elements_missing, things_missing, stale_price_in_desc |
| 33 |Mooovi 浜名湖 |shizuoka |31.2 |desc_under_100, desc_elements_missing, things_broken_fragment, stale_price_in_desc |
| 284 |東京臨海広域防災公園 |tokyo |28.6 |desc_under_100, desc_elements_missing, stale_hours, safety_missing |

### safety 代表例

| id |名前 |県 |score |主要issue |
| --- |--- |--- |--- |--- |
| 485 |西武園ゆうえんち |saitama |75.6 |desc_under_100, desc_no_proper_noun, desc_elements_missing, things_missing |
| 882 |千葉県立中央博物館 海の博物館 |chiba |71.4 |desc_under_100, desc_no_proper_noun, desc_elements_missing, things_missing |
| 414 |栃木県子ども総合科学館 |tochigi |68.4 |desc_under_100, desc_elements_missing, things_missing, safety_missing |
| 475 |さいたま市青少年宇宙科学館 |saitama |68.4 |desc_under_100, desc_elements_missing, things_missing, safety_missing |
| 489 |所沢航空記念公園 |saitama |68.4 |desc_under_100, desc_elements_missing, things_missing, safety_missing |

### flagship 代表例

| id |名前 |県 |score |主要issue |
| --- |--- |--- |--- |--- |
| 485 |西武園ゆうえんち |saitama |75.6 |desc_under_100, desc_no_proper_noun, desc_elements_missing, things_missing |
| 882 |千葉県立中央博物館 海の博物館 |chiba |71.4 |desc_under_100, desc_no_proper_noun, desc_elements_missing, things_missing |
| 414 |栃木県子ども総合科学館 |tochigi |68.4 |desc_under_100, desc_elements_missing, things_missing, safety_missing |
| 475 |さいたま市青少年宇宙科学館 |saitama |68.4 |desc_under_100, desc_elements_missing, things_missing, safety_missing |
| 489 |所沢航空記念公園 |saitama |68.4 |desc_under_100, desc_elements_missing, things_missing, safety_missing |

## batch1_proposal

| id |名前 |県 |score |selection_reason |
| --- |--- |--- |--- |--- |
| 485 |西武園ゆうえんち |saitama |75.6 |event-backed flagship with weak description |
| 882 |千葉県立中央博物館 海の博物館 |chiba |71.4 |event-backed flagship with weak description |
| 414 |栃木県子ども総合科学館 |tochigi |68.4 |event-backed flagship with weak description |
| 475 |さいたま市青少年宇宙科学館 |saitama |68.4 |event-backed flagship with weak description |
| 489 |所沢航空記念公園 |saitama |68.4 |event-backed flagship with weak description |
| 514 |川口市立科学館 |saitama |68.4 |event-backed flagship with weak description |
| 572 |新潟県立自然科学館 |niigata |68.4 |event-backed flagship with weak description |
| 589 |国営越後丘陵公園 |niigata |68.4 |event-backed flagship with weak description |
| 680 |千葉県立現代産業科学館 |chiba |68.4 |event-backed flagship with weak description |
| 684 |鴨川シーワールド |chiba |68.4 |event-backed flagship with weak description |
| 813 |新江ノ島水族館 |kanagawa |68.4 |event-backed flagship with weak description |
| 1023 |大和ゆとりの森 |kanagawa |68.4 |event-backed flagship with weak description |
| 425 |栃木県立博物館 |tochigi |67.2 |event-backed flagship with weak description |
| 462 |壬生町おもちゃ博物館 |tochigi |67.2 |event-backed flagship with weak description |
| 472 |埼玉県立歴史と民俗の博物館 |saitama |67.2 |event-backed flagship with weak description |
| 479 |川越市立博物館 |saitama |67.2 |event-backed flagship with weak description |
| 576 |新潟県立植物園 |niigata |67.2 |event-backed flagship with weak description |
| 596 |燕市産業史料館 |niigata |67.2 |event-backed flagship with weak description |
| 626 |イヨボヤ会館 |niigata |67.2 |event-backed flagship with weak description |
| 679 |千葉県立中央博物館 |chiba |67.2 |event-backed flagship with weak description |
| 844 |シルク博物館 |kanagawa |67.2 |event-backed flagship with weak description |
| 920 |新潟県立万代島美術館 |niigata |67.2 |event-backed flagship with weak description |
| 988 |神奈川県立 生命の星・地球博物館 |kanagawa |67.2 |event-backed flagship with weak description |
| 667 |関川村 大したもん蛇まつり |niigata |66 |event-backed flagship with weak description |
| 387 |なかがわ水遊園 |tochigi |64.6 |event-backed flagship with weak description |
| 388 |大田原市ふれあいの丘 天文館 |tochigi |64.6 |event-backed flagship with weak description |
| 442 |佐野市こどもの国 |tochigi |64.6 |event-backed flagship with weak description |
| 513 |SKIPシティ 彩の国ビジュアルプラザ |saitama |64.6 |event-backed flagship with weak description |
| 515 |川口グリーンセンター |saitama |64.6 |event-backed flagship with weak description |
| 522 |越谷市科学技術体験センター ミラクル |saitama |64.6 |event-backed flagship with weak description |
| 604 |上越市立水族博物館 うみがたり |niigata |64.6 |event-backed flagship with weak description |
| 653 |長岡市科学博物館 |niigata |64.6 |event-backed flagship with weak description |
| 676 |千葉市科学館 Qiball |chiba |64.6 |event-backed flagship with weak description |
| 723 |千葉こどもの国 KidsDom |chiba |64.6 |event-backed flagship with weak description |
| 728 |内浦山県民の森(鴨川) |chiba |64.6 |event-backed flagship with weak description |
| 740 |千葉市子ども交流館 |chiba |64.6 |event-backed flagship with weak description |
| 764 |大房岬自然公園 |chiba |64.6 |event-backed flagship with weak description |
| 776 |三菱みなとみらい技術館 |kanagawa |64.6 |event-backed flagship with weak description |
| 781 |はまぎんこども宇宙科学館 |kanagawa |64.6 |event-backed flagship with weak description |
| 793 |かわさき宙(そら)と緑の科学館 |kanagawa |64.6 |event-backed flagship with weak description |
| 832 |相模川ふれあい科学館 アクアリウムさがみはら |kanagawa |64.6 |event-backed flagship with weak description |
| 837 |県立秦野戸川公園 |kanagawa |64.6 |event-backed flagship with weak description |
| 839 |茅ヶ崎里山公園 |kanagawa |64.6 |event-backed flagship with weak description |
| 904 |県立辻堂海浜公園 |kanagawa |64.6 |event-backed flagship with weak description |
| 1423 |貝塚市立自然遊学館・近木川河口学習 |osaka |64.6 |event-backed flagship with weak description |

## batch2_proposal

- 件数: 50
- 傾向: desc_under_100: 50 / flagship_weak_desc: 50 / desc_elements_missing: 49 / safety_missing: 48 / things_missing: 41

## ヒューリスティック判定の注意

- 4要素判定と固有名詞判定は機械推定です。最終判断はPM/人間レビューで行ってください。
- この監査は公式確認ではなく、変わりやすい情報・安全注記・予約条件の確認候補を抽出するものです。
