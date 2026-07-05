# メタデータ汚染 監査 (audit-only / id345型)

- source: `data/facilities_data.json` (2180件)
- findings: **84件** (high 1 / medium 83)
- data無変更・本番反映なし。PMがTP/FP分類→確定後に別トラックで修正判断。

## PM分類結果 (2026-07-05)

- **true_positive: 5件** / false_positive: 79件 / pending: 0
- 既存検出器の穴: `checkNameMemoPollution` はトークン6語(`→/参考/除外/要確認/TODO/(削除`)のみ+**nameしか走査せず**。id345/id353の混入語(`代替/都内ではなく/該当なし/注:/括弧内判断メモ`)を1語も持たず取りこぼした。

### TP一覧(修正候補・別トラック)

| id | 県 | フィールド | 種別 | 内容 |
|---|---|---|---|---|
| **353** | 東京都 | name | id345型(高) | `オービィ横浜(都内代替: 川崎駅近く)/コニカミノルタ プラネタリア TOKYO` — 2施設名+判断メモ残留。addressは有楽町=正 |
| 342 | 東京都 | description | 生成メモ | `(注: 113の同公園内別エリア)` — 内部id参照メモがuser可視 |
| 364 | 東京都 | description | 生成メモ | `(注: 024と同施設のサブプラン…)` — 同上 |
| 1600 | 京都府 | description | 編集メモ | `…施設自前の公式URLへ差し替えています。` — URL出所の編集メモ残留 |
| 1604 | 京都府 | description | 編集メモ | `…施設自前の公式URLへ差し替えています。` — 同上 |

※ id345は本監査時点で修正済みのため findings に非該当(=name/address型の残存はid353のみ)。

### FP(79件・修正不要)
`候補`(55・「世界遺産候補」「〜の候補になります」)/`予定`(19・「オープン予定」「予定に入れやすく」)/`ではないため`(自然な説明prose)/`要確認`(親向けの営業確認アドバイス)。いずれも本文の正当なprose。

## シグナル内訳

| フィールド | 件数 |
|---|---|
| description | 83 |
| name | 2 |

| トークン/種別 | 件数 |
|---|---|
| 候補 | 55 |
| 予定 | 19 |
| ではないため | 3 |
| 代替 | 2 |
| 注: | 2 |
| 差し替え | 2 |
| 要確認 | 2 |

## 候補一覧 (severity→id順)

| id | severity | 県 | name | 検出フィールド | 検出シグナル |
|---|---|---|---|---|---|
| 353 | high | 東京都 | オービィ横浜(都内代替: 川崎駅近く)/コニカミノルタ プラネタリア TOKYO | name | name:代替 / name:代替 |
| 38 | medium | 静岡県 | 静岡科学館る・く・る | description | description:予定 |
| 44 | medium | 静岡県 | 熱海クラフト工房 | description | description:予定 |
| 90 | medium | 長野県 | 軽井沢ガラス工房 | description | description:予定 |
| 101 | medium | 長野県 | 池の平スノーパーク | description | description:予定 |
| 110 | medium | 山梨県 | 遊亀公園附属動物園 | description | description:予定 |
| 143 | medium | 山梨県 | 自在ガラス体験工房&ギャラリー | description | description:予定 |
| 152 | medium | 静岡県 | 伊豆テディベア・ミュージアム | description | description:予定 |
| 156 | medium | 山梨県 | 河口湖猿まわし劇場 | description | description:予定 |
| 342 | medium | 東京都 | 東白鬚公園 防災広場 | description | description:注: |
| 355 | medium | 東京都 | 東京メトロポリタンプラネタリウム(コスモプラネタリウム渋谷) | description | description:予定 |
| 364 | medium | 東京都 | サンリオピューロランドアンサンブル(団体プラン) | description | description:注: |
| 488 | medium | 埼玉県 | 所沢航空発祥記念館 | description | description:予定 |
| 618 | medium | 新潟県 | 佐渡金山(史跡 佐渡金山) | description | description:候補 |
| 1067 | medium | 茨城県 | 霞ケ浦 どうぶつとみんなのいえ | description | description:予定 |
| 1114 | medium | 茨城県 | ふれあい動物園ANIMA | description | description:予定 |
| 1129 | medium | 茨城県 | キッズユーエスランド 茨城守谷店 | description | description:予定 |
| 1172 | medium | 群馬県 | アースケア桐生が岡遊園地 | description | description:予定 |
| 1179 | medium | 群馬県 | 群馬県立ぐんま天文台 | description | description:予定 |
| 1186 | medium | 群馬県 | 伊香保おもちゃと人形 自動車博物館 | description | description:候補 |
| 1196 | medium | 群馬県 | 草津温泉 ホテルヴィレッジ テルメテルメ | description | description:候補 |
| 1213 | medium | 群馬県 | 榛名湖 | description | description:予定 |
| 1229 | medium | 群馬県 | 丸沼高原スキー場 | description | description:候補 |
| 1230 | medium | 群馬県 | かたしな高原スキー場 | description | description:候補 |
| 1258 | medium | 群馬県 | ヤマキ みなかみ工場 | description | description:候補 |
| 1259 | medium | 群馬県 | 岩秀織物 | description | description:候補 |
| 1260 | medium | 群馬県 | USUI AKIKO GALLERY | description | description:候補 |
| 1276 | medium | 群馬県 | 境御嶽山自然の森公園 | description | description:候補 |
| 1282 | medium | 群馬県 | ふるさとの広場 ちびっこベース | description | description:候補 |
| 1286 | medium | 群馬県 | バラギ湖 | description | description:候補 |
| 1299 | medium | 群馬県 | 町営温川キャンプ場 | description | description:候補 |
| 1301 | medium | 群馬県 | グリーンパークふきわれ | description | description:候補 |
| 1305 | medium | 群馬県 | オグナほたかスキー場 | description | description:候補 |
| 1306 | medium | 群馬県 | ホワイトワールド尾瀬岩鞍 | description | description:候補 |
| 1316 | medium | 大阪府 | ATCあそびマーレ | description | description:候補 |
| 1323 | medium | 大阪府 | ピュアハートキッズランド フレスポしんかな | description | description:候補 |
| 1331 | medium | 大阪府 | ワールド牧場 | description | description:候補 |
| 1350 | medium | 大阪府 | 造幣博物館 | description | description:候補 |
| 1357 | medium | 大阪府 | 箕面公園 | description | description:候補 |
| 1364 | medium | 大阪府 | 長居植物園 | description | description:候補 |
| 1374 | medium | 大阪府 | 原山公園 | description | description:候補 |
| 1380 | medium | 大阪府 | 星のブランコ（府民の森 ほしだ園地） | description | description:候補 |
| 1382 | medium | 大阪府 | せんなん里海公園 さとうみ磯浜 | description | description:候補 |
| 1383 | medium | 大阪府 | ぴちぴちビーチ（箱作海水浴場） | description | description:候補 |
| 1386 | medium | 大阪府 | 堺伝匠館 | description | description:候補 |
| 1390 | medium | 大阪府 | 永楽ゆめの森公園 | description | description:候補 |
| 1428 | medium | 大阪府 | 堺市博物館 | description | description:予定 |
| 1598 | medium | 京都府 | 文化パルク城陽 | description | description:候補 |
| 1600 | medium | 京都府 | 京田辺市野外活動センター 竜王こどもの王国 | description | description:差し替え |
| 1604 | medium | 京都府 | 大正池グリーンパーク | description | description:差し替え |
| 1613 | medium | 京都府 | ハピろー！の森 京都（府民の森ひよし） | description | description:候補 |
| 1629 | medium | 京都府 | サープラ京都あそびタウン | description | description:候補 |
| 1637 | medium | 京都府 | 綾部市天文館パオ | description | description:予定 |
| 1674 | medium | 愛知県 | 名古屋港シートレインランド | description | description:候補 |
| 1684 | medium | 愛知県 | 有松・鳴海絞会館 | description | description:候補 |
| 1698 | medium | 愛知県 | こまきこども未来館 | description | description:候補 |
| 1741 | medium | 愛知県 | 香嵐渓 | description | description:候補 |
| 1744 | medium | 愛知県 | エコパルなごや | description | description:候補 |
| 1754 | medium | 愛知県 | 文化のみち二葉館 | description | description:候補 |
| 1774 | medium | 愛知県 | 知立神社・知立公園 | description | description:ではないため |
| 1879 | medium | 福岡県 | JOYPOLIS SPORTS 北九州 | description | description:候補 |
| 1898 | medium | 福岡県 | 諏訪公園 | description | description:候補 |
| 1906 | medium | 福岡県 | 高田濃施山公園 | description | description:候補 |
| 1911 | medium | 福岡県 | 遠賀総合運動公園 | description | description:候補 |
| 1924 | medium | 広島県 | 広島市森林公園 | description | description:候補 |
| 1933 | medium | 広島県 | THE OUTLETS HIROSHIMA | description | description:候補 |
| 1943 | medium | 広島県 | ベイサイドビーチ坂・親水公園 | description | description:候補 |
| 1951 | medium | 広島県 | 東広島運動公園 | description | description:候補 |
| 1959 | medium | 広島県 | 千光寺山ロープウェイ | description | description:候補 |
| 1961 | medium | 広島県 | 尾道市立美術館 | description | description:候補 |
| 1975 | medium | 広島県 | 平田観光農園 | description | description:候補 |
| 1978 | medium | 広島県 | ひろしま県民の森 | description | description:候補 |
| 1981 | medium | 広島県 | 神楽門前湯治村 | description | description:要確認 |
| 1983 | medium | 広島県 | 道の駅豊平どんぐり村 | description | description:候補 |
| 1986 | medium | 広島県 | 宮島ロープウエー・弥山 | description | description:要確認 |
| 1987 | medium | 広島県 | 峰高公園 | description | description:候補 |
| 1991 | medium | 広島県 | 晴海臨海公園 | description | description:候補 |
| 2000 | medium | 広島県 | イオンモール広島祇園 | description | description:予定 |
| 2018 | medium | 広島県 | ばら公園 | description | description:ではないため |
| 2035 | medium | 広島県 | Flower village 花夢の里 | description | description:ではないため |
| 2099 | medium | 山梨県 | 韮崎大村美術館 | description | description:候補 |
| 2106 | medium | 山梨県 | 平山郁夫シルクロード美術館 | description | description:候補 |
| 2109 | medium | 山梨県 | スパティオ体験工房 | description | description:候補 |
| 2133 | medium | 山梨県 | 新湯治場 秋山温泉 | description | description:候補 |
