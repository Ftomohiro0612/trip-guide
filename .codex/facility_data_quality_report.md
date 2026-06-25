# Facility Data Quality Report

Generated: 2026-06-25
Total facilities: 1628
Total issues: 2077

## Category Counts

| category | severity | count | needs_web_check |
| --- | --- | ---: | ---: |
| name_memo_pollution | high | 0 | 0 |
| out_of_scope_prefecture | high | 0 | 0 |
| url_na_or_empty | medium | 5 | 5 |
| prefecture_id_mismatch | high | 0 | 0 |
| address_pref_mismatch | high | 0 | 0 |
| prefecture_missing_in_address | info | 854 | 0 |
| invalid_address | high | 195 | 195 |
| invalid_coordinates | high | 0 | 0 |
| coord_pref_mismatch | high | 0 | 0 |
| tag_category_conflict | medium | 34 | 34 |
| missing_experience | medium | 264 | 264 |
| thin_description | medium | 3 | 3 |
| short_description | low | 722 | 722 |

## Severity Counts

| severity | count |
| --- | ---: |
| high | 195 |
| medium | 306 |
| low | 722 |
| info | 854 |

## Warnings

_警告なし_

## Category Samples

### url_na_or_empty

| id | name | reason |
| --- | --- | --- |
| 32 | 藤枝市民プールキッズパーク | url が未入力 |
| 51 | ホテルテルメ温水プール | url が未入力 |
| 83 | ナガノフォレストビレッジ 森の駅Daizahoushi | url が未入力 |
| 145 | ガラス工房りゅう | url が未入力 |
| 163 | Trick Art Museum 富士河口湖 | url が http(s):// で始まらない |

### prefecture_missing_in_address

| id | name | reason |
| --- | --- | --- |
| 1 | ぐりんぱ | address に都道府県名が含まれていない |
| 2 | 浜名湖パルパル | address に都道府県名が含まれていない |
| 3 | ちびまる子ちゃんランド | address に都道府県名が含まれていない |
| 4 | 伊豆ぐらんぱる公園 | address に都道府県名が含まれていない |
| 5 | ららぽーと沼津 リトルプラネット | address に都道府県名が含まれていない |

### invalid_address

| id | name | reason |
| --- | --- | --- |
| 15 | 屋内型ふれあい動物園 アニタッチ | address に数字・丁目・番・号・番地・ハイフンが含まれていない |
| 27 | 雄踏総合公園(亀崎ファミリーランドプール) | address に数字・丁目・番・号・番地・ハイフンが含まれていない |
| 28 | 豊田ラブリバー公園 | address に数字・丁目・番・号・番地・ハイフンが含まれていない |
| 29 | 遊具広場(長浜海浜公園) | address に数字・丁目・番・号・番地・ハイフンが含まれていない |
| 51 | ホテルテルメ温水プール | address に数字・丁目・番・号・番地・ハイフンが含まれていない |

### tag_category_conflict

| id | name | reason |
| --- | --- | --- |
| 129 | 猫カフェMOCHA イオンモール甲府昭和店 | category(experience)に対してcoretags(experience,craft)が付与されていない |
| 357 | カンドゥー | category(indoor-play)に対してcoretags(playground,character,craft,vehicle)が付与されていない |
| 368 | 那須りんどう湖レイクビュー | category(nature-park)に対してcoretags(nature,wide_space,running)が付与されていない |
| 439 | あしかがフラワーパーク | category(nature-park)に対してcoretags(nature,wide_space,running)が付与されていない |
| 530 | 行田市古代蓮の里 | category(nature-park)に対してcoretags(nature,wide_space,running)が付与されていない |

### missing_experience

| id | name | reason |
| --- | --- | --- |
| 3 | ちびまる子ちゃんランド | description に子ども向け体験への言及がない |
| 7 | サープラ富士あそびタウン | description に子ども向け体験への言及がない |
| 12 | 掛川花鳥園 | description に子ども向け体験への言及がない |
| 47 | 修善寺虹の郷 | description に子ども向け体験への言及がない |
| 78 | ファミリーモール and LIFE 木育ひろばぬくもく | description に子ども向け体験への言及がない |

### thin_description

| id | name | reason |
| --- | --- | --- |
| 42 | 静岡ホビースクエア | description が施設名・住所・営業情報中心で体験語彙が乏しい |
| 104 | 佐久平PA直結スキー場 | description が施設名・住所・営業情報中心で体験語彙が乏しい |
| 127 | AEON MALL Kofu Showa(キッズコーナー) | description が施設名・住所・営業情報中心で体験語彙が乏しい |

### short_description

| id | name | reason |
| --- | --- | --- |
| 39 | ディスカバリーパーク焼津 | description が 58文字（60文字未満） |
| 41 | ふじのくに地球環境史ミュージアム | description が 57文字（60文字未満） |
| 44 | 熱海クラフト工房 | description が 56文字（60文字未満） |
| 45 | 伊豆クラフトハウス | description が 52文字（60文字未満） |
| 46 | 伊豆アート体験さくら坂 | description が 55文字（60文字未満） |

## Top 10 Issues

### name_memo_pollution

_該当なし_

### out_of_scope_prefecture

_該当なし_

### url_na_or_empty

| id | name | prefecture | reason |
| --- | --- | --- | --- |
| 32 | 藤枝市民プールキッズパーク | 静岡県 | url が未入力 |
| 51 | ホテルテルメ温水プール | 静岡県 | url が未入力 |
| 83 | ナガノフォレストビレッジ 森の駅Daizahoushi | 長野県 | url が未入力 |
| 145 | ガラス工房りゅう | 山梨県 | url が未入力 |
| 163 | Trick Art Museum 富士河口湖 | 山梨県 | url が http(s):// で始まらない |

### prefecture_id_mismatch

_該当なし_

### address_pref_mismatch

_該当なし_

### prefecture_missing_in_address

| id | name | prefecture | reason |
| --- | --- | --- | --- |
| 1 | ぐりんぱ | 静岡県 | address に都道府県名が含まれていない |
| 2 | 浜名湖パルパル | 静岡県 | address に都道府県名が含まれていない |
| 3 | ちびまる子ちゃんランド | 静岡県 | address に都道府県名が含まれていない |
| 4 | 伊豆ぐらんぱる公園 | 静岡県 | address に都道府県名が含まれていない |
| 5 | ららぽーと沼津 リトルプラネット | 静岡県 | address に都道府県名が含まれていない |
| 6 | ピュアハートキッズランド浜松志都呂 | 静岡県 | address に都道府県名が含まれていない |
| 8 | 体感型動物園iZoo(イズー) | 静岡県 | address に都道府県名が含まれていない |
| 9 | 体感型カエル館KawaZoo(カワズー) | 静岡県 | address に都道府県名が含まれていない |
| 10 | 日本平動物園 | 静岡県 | address に都道府県名が含まれていない |
| 11 | 伊豆アニマルキングダム | 静岡県 | address に都道府県名が含まれていない |

### invalid_address

| id | name | prefecture | reason |
| --- | --- | --- | --- |
| 15 | 屋内型ふれあい動物園 アニタッチ | 静岡県 | address に数字・丁目・番・号・番地・ハイフンが含まれていない |
| 27 | 雄踏総合公園(亀崎ファミリーランドプール) | 静岡県 | address に数字・丁目・番・号・番地・ハイフンが含まれていない |
| 28 | 豊田ラブリバー公園 | 静岡県 | address に数字・丁目・番・号・番地・ハイフンが含まれていない |
| 29 | 遊具広場(長浜海浜公園) | 静岡県 | address に数字・丁目・番・号・番地・ハイフンが含まれていない |
| 51 | ホテルテルメ温水プール | 静岡県 | address に数字・丁目・番・号・番地・ハイフンが含まれていない |
| 52 | 白樺リゾート 池の平ファミリーランド | 長野県 | address に数字・丁目・番・号・番地・ハイフンが含まれていない |
| 55 | 小諸市児童遊園地 | 長野県 | address に数字・丁目・番・号・番地・ハイフンが含まれていない |
| 57 | フォレストアドベンチャー・タテシナ | 長野県 | address に数字・丁目・番・号・番地・ハイフンが含まれていない |
| 58 | フォレストアドベンチャー・松川 | 長野県 | address に数字・丁目・番・号・番地・ハイフンが含まれていない |
| 68 | 子供冒険広場(アルプス公園) | 長野県 | address に数字・丁目・番・号・番地・ハイフンが含まれていない |

### invalid_coordinates

_該当なし_

### coord_pref_mismatch

_該当なし_

### tag_category_conflict

| id | name | prefecture | reason |
| --- | --- | --- | --- |
| 129 | 猫カフェMOCHA イオンモール甲府昭和店 | 山梨県 | category(experience)に対してcoretags(experience,craft)が付与されていない |
| 357 | カンドゥー | 千葉県 | category(indoor-play)に対してcoretags(playground,character,craft,vehicle)が付与されていない |
| 368 | 那須りんどう湖レイクビュー | 栃木県 | category(nature-park)に対してcoretags(nature,wide_space,running)が付与されていない |
| 439 | あしかがフラワーパーク | 栃木県 | category(nature-park)に対してcoretags(nature,wide_space,running)が付与されていない |
| 530 | 行田市古代蓮の里 | 埼玉県 | category(nature-park)に対してcoretags(nature,wide_space,running)が付与されていない |
| 546 | 越生梅林 | 埼玉県 | category(nature-park)に対してcoretags(nature,wide_space,running)が付与されていない |
| 548 | 伊奈町立伊奈町記念公園(バラ園) | 埼玉県 | category(nature-park)に対してcoretags(nature,wide_space,running)が付与されていない |
| 552 | 鴻巣市花久の里 | 埼玉県 | category(nature-park)に対してcoretags(nature,wide_space,running)が付与されていない |
| 576 | 新潟県立植物園 | 新潟県 | category(nature-park)に対してcoretags(nature,wide_space,running)が付与されていない |
| 694 | 佐倉ふるさと広場 | 千葉県 | category(nature-park)に対してcoretags(nature,wide_space,running)が付与されていない |

### missing_experience

| id | name | prefecture | reason |
| --- | --- | --- | --- |
| 3 | ちびまる子ちゃんランド | 静岡県 | description に子ども向け体験への言及がない |
| 7 | サープラ富士あそびタウン | 静岡県 | description に子ども向け体験への言及がない |
| 12 | 掛川花鳥園 | 静岡県 | description に子ども向け体験への言及がない |
| 47 | 修善寺虹の郷 | 静岡県 | description に子ども向け体験への言及がない |
| 78 | ファミリーモール and LIFE 木育ひろばぬくもく | 長野県 | description に子ども向け体験への言及がない |
| 107 | リサとガスパールタウン | 山梨県 | description に子ども向け体験への言及がない |
| 115 | 山梨県立富士湧水の里水族館 森の中の水族館 | 山梨県 | description に子ども向け体験への言及がない |
| 125 | 大石公園 | 山梨県 | description に子ども向け体験への言及がない |
| 142 | 白石ガラス工房 | 山梨県 | description に子ども向け体験への言及がない |
| 151 | ストロベリーファム石原 | 山梨県 | description に子ども向け体験への言及がない |

### thin_description

| id | name | prefecture | reason |
| --- | --- | --- | --- |
| 42 | 静岡ホビースクエア | 静岡県 | description が施設名・住所・営業情報中心で体験語彙が乏しい |
| 104 | 佐久平PA直結スキー場 | 長野県 | description が施設名・住所・営業情報中心で体験語彙が乏しい |
| 127 | AEON MALL Kofu Showa(キッズコーナー) | 山梨県 | description が施設名・住所・営業情報中心で体験語彙が乏しい |

### short_description

| id | name | prefecture | reason |
| --- | --- | --- | --- |
| 39 | ディスカバリーパーク焼津 | 静岡県 | description が 58文字（60文字未満） |
| 41 | ふじのくに地球環境史ミュージアム | 静岡県 | description が 57文字（60文字未満） |
| 44 | 熱海クラフト工房 | 静岡県 | description が 56文字（60文字未満） |
| 45 | 伊豆クラフトハウス | 静岡県 | description が 52文字（60文字未満） |
| 46 | 伊豆アート体験さくら坂 | 静岡県 | description が 55文字（60文字未満） |
| 53 | チロルの森 | 長野県 | description が 59文字（60文字未満） |
| 59 | 野沢温泉スポーツパーク | 長野県 | description が 58文字（60文字未満） |
| 60 | 富士見パノラマリゾート(MTB) | 長野県 | description が 59文字（60文字未満） |
| 63 | わくわくどうぶつ王国 | 長野県 | description が 44文字（60文字未満） |
| 64 | 飯田市立動物園 | 長野県 | description が 57文字（60文字未満） |
