# Facility Data Quality Report

Generated: 2026-06-11
Total facilities: 1032
Total issues: 1989

## Category Counts

| category | severity | count | needs_web_check |
| --- | --- | ---: | ---: |
| address_pref_mismatch | - | 0 | 0 |
| prefecture_missing_in_address | info | 879 | 0 |
| invalid_address | high | 205 | 205 |
| invalid_coordinates | - | 0 | 0 |
| coord_pref_mismatch | high | 4 | 4 |
| tag_category_conflict | medium | 31 | 31 |
| missing_experience | medium | 261 | 261 |
| thin_description | medium | 3 | 3 |
| short_description | low | 606 | 606 |

## Severity Counts

| severity | count |
| --- | ---: |
| high | 209 |
| medium | 295 |
| low | 606 |
| info | 879 |

## Warnings

_警告なし_

## Top 10 Issues

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
| 7 | サープラ富士あそびタウン | 静岡県 | address に都道府県名が含まれていない |
| 8 | 体感型動物園iZoo(イズー) | 静岡県 | address に都道府県名が含まれていない |
| 9 | 体感型カエル館KawaZoo(カワズー) | 静岡県 | address に都道府県名が含まれていない |
| 10 | 日本平動物園 | 静岡県 | address に都道府県名が含まれていない |

### invalid_address

| id | name | prefecture | reason |
| --- | --- | --- | --- |
| 15 | 屋内型ふれあい動物園 アニタッチ | 静岡県 | address に数字・丁目・番・号・番地・ハイフンが含まれていない |
| 27 | 雄踏総合公園(亀崎ファミリーランドプール) | 静岡県 | address に数字・丁目・番・号・番地・ハイフンが含まれていない |
| 28 | 豊田ラブリバー公園 | 静岡県 | address に数字・丁目・番・号・番地・ハイフンが含まれていない |
| 51 | ホテルテルメ温水プール | 静岡県 | address に数字・丁目・番・号・番地・ハイフンが含まれていない |
| 52 | 白樺リゾート 池の平ファミリーランド | 長野県 | address に数字・丁目・番・号・番地・ハイフンが含まれていない |
| 55 | 小諸市児童遊園地 | 長野県 | address に数字・丁目・番・号・番地・ハイフンが含まれていない |
| 57 | フォレストアドベンチャー・タテシナ | 長野県 | address に数字・丁目・番・号・番地・ハイフンが含まれていない |
| 58 | フォレストアドベンチャー・松川 | 長野県 | address に数字・丁目・番・号・番地・ハイフンが含まれていない |
| 68 | 子供冒険広場(アルプス公園) | 長野県 | address に数字・丁目・番・号・番地・ハイフンが含まれていない |
| 71 | 佐久平駅南口大型遊具 | 長野県 | address に数字・丁目・番・号・番地・ハイフンが含まれていない |

### invalid_coordinates

_該当なし_

### coord_pref_mismatch

| id | name | prefecture | reason |
| --- | --- | --- | --- |
| 896 | 荒川公園(熊谷) | 埼玉県 | latitude / longitude が 埼玉県 の粗いbbox外 |
| 898 | 戸田市スポーツセンター | 埼玉県 | latitude / longitude が 埼玉県 の粗いbbox外 |
| 901 | 武甲山資料館 (秩父) | 埼玉県 | latitude / longitude が 埼玉県 の粗いbbox外 |
| 929 | アクアマリンふくしま→該当県外(参考) | 新潟県 | latitude / longitude が 新潟県 の粗いbbox外 |

### tag_category_conflict

| id | name | prefecture | reason |
| --- | --- | --- | --- |
| 357 | カンドゥー | 千葉県 | category(indoor-play)に対してcoretags(playground,character,craft,vehicle)が付与されていない |
| 368 | 那須りんどう湖レイクビュー | 栃木県 | category(nature-park)に対してcoretags(nature,wide_space,running)が付与されていない |
| 439 | あしかがフラワーパーク | 栃木県 | category(nature-park)に対してcoretags(nature,wide_space,running)が付与されていない |
| 530 | 行田市古代蓮の里 | 埼玉県 | category(nature-park)に対してcoretags(nature,wide_space,running)が付与されていない |
| 546 | 越生梅林 | 埼玉県 | category(nature-park)に対してcoretags(nature,wide_space,running)が付与されていない |
| 548 | 伊奈町立伊奈町記念公園(バラ園) | 埼玉県 | category(nature-park)に対してcoretags(nature,wide_space,running)が付与されていない |
| 552 | 鴻巣市花久の里 | 埼玉県 | category(nature-park)に対してcoretags(nature,wide_space,running)が付与されていない |
| 576 | 新潟県立植物園 | 新潟県 | category(nature-park)に対してcoretags(nature,wide_space,running)が付与されていない |
| 694 | 佐倉ふるさと広場 | 千葉県 | category(nature-park)に対してcoretags(nature,wide_space,running)が付与されていない |
| 720 | 印旛沼サンセットヒルズ | 千葉県 | category(nature-park)に対してcoretags(nature,wide_space,running)が付与されていない |

### missing_experience

| id | name | prefecture | reason |
| --- | --- | --- | --- |
| 3 | ちびまる子ちゃんランド | 静岡県 | description に子ども向け体験への言及がない |
| 7 | サープラ富士あそびタウン | 静岡県 | description に子ども向け体験への言及がない |
| 47 | 修善寺虹の郷 | 静岡県 | description に子ども向け体験への言及がない |
| 78 | ファミリーモール and LIFE 木育ひろばぬくもく | 長野県 | description に子ども向け体験への言及がない |
| 107 | リサとガスパールタウン | 山梨県 | description に子ども向け体験への言及がない |
| 115 | 山梨県立富士湧水の里水族館 森の中の水族館 | 山梨県 | description に子ども向け体験への言及がない |
| 125 | 大石公園 | 山梨県 | description に子ども向け体験への言及がない |
| 142 | 白石ガラス工房 | 山梨県 | description に子ども向け体験への言及がない |
| 151 | ストロベリーファム石原 | 山梨県 | description に子ども向け体験への言及がない |
| 160 | 河口湖美術館 | 山梨県 | description に子ども向け体験への言及がない |

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
