# 説明文 batch3 候補 (proposal-only / PM分類済)

- source: `.codex/facility_quality_audit.json` (2026-07-04監査) を description軸で再構成
- 除外: 5県(tochigi/niigata/chiba/saitama/kanagawa=things併合トラック) + batch1/2(実装済100件)
- template/stale はbatch3プールに存在せず(batch1/2・5県で消化済)
- 除外後プール1429 → 現desc再突合still-weak1417 → 軸クオータ+県上限12 で候補100件
- **data無変更・本番反映なし**

## PM分類(採用ダイヤル)

| Tier | 件数 | 内容 | 推奨 |
|---|---|---|---|
| T1_must | 80 | 短文<95 / 禁止表現含む / 本文欠落 | **採用** |
| T2_polish | 2 | flagshipだが現95字以上・緊急度低 | 任意 |
| defer | 18 | 現95字以上・flagship外・禁止表現なし=heuristic過検出 | 見送り |

→ **batch3採用推奨 = T1_must 80件**(バケット: flagship43 / safety22 / quality15)

## 禁止表現(断定的高評価/人気)を含む要スクラブ施設

| id | 施設 | 検出表現 |
|---|---|---|
| 88 | 信州新町化石博物館 | 映え |
| 85 | sakumo佐久市子ども未来館 | 満足度, No.1 |
| 108 | 富士すばるランド | 星評価, 評価4, ランキング |
| 222 | 東京都水の科学館 | 人気 |
| 117 | 笛吹川フルーツ公園 | 星評価, 評価4 |
| 69 | 湯川ふるさと公園 | 星評価, 評価4, 人気 |
| 161 | 河口湖自然生活館 | 星評価, 評価4 |
| 86 | 長野市少年科学センター | 人気 |
| 113 | 動物ふれあい広場(まきば公園) | 星評価, 評価4 |

## 採用候補一覧 (T1_must=80・bucket/score順)

| id | bucket | 県 | 施設 | 現len | 軸 | 採用理由 |
|---|---|---|---|---|---|---|
| 88 | A_flagship | 長野県 | 信州新町化石博物館 | 52 | 短文<100,4要素欠落,固有名詞なし,flagship_weak,event掲載あり | flagship marquee; 短文<95; 禁止表現除去:映え |
| 1187 | A_flagship | 群馬県 | こんにゃくパーク | 74 | 短文<100,4要素欠落,固有名詞なし,flagship_weak,event掲載あり | flagship marquee; 短文<95 |
| 1245 | A_flagship | 群馬県 | 群馬県立歴史博物館 | 56 | 短文<100,4要素欠落,固有名詞なし,flagship_weak,event掲載あり | flagship marquee; 短文<95 |
| 1247 | A_flagship | 群馬県 | 群馬県立館林美術館 | 50 | 短文<100,4要素欠落,固有名詞なし,flagship_weak,event掲載あり | flagship marquee; 短文<95 |
| 1524 | A_flagship | 兵庫県 | 六甲高山植物園 | 73 | 短文<100,4要素欠落,flagship_weak,safety,event掲載あり | flagship marquee; 短文<95 |
| 1531 | A_flagship | 兵庫県 | 尼崎の森中央緑地 | 69 | 短文<100,4要素欠落,flagship_weak,safety,event掲載あり | flagship marquee; 短文<95 |
| 1536 | A_flagship | 兵庫県 | 多木化学海洋文化センター | 73 | 短文<100,4要素欠落,固有名詞なし,flagship_weak,event掲載あり | flagship marquee; 短文<95 |
| 1545 | A_flagship | 兵庫県 | 兵庫県立やしろの森公園 | 77 | 短文<100,4要素欠落,flagship_weak,safety,event掲載あり | flagship marquee; 短文<95 |
| 1554 | A_flagship | 兵庫県 | 兵庫県立国見の森公園 | 73 | 短文<100,4要素欠落,flagship_weak,safety,event掲載あり | flagship marquee; 短文<95 |
| 1559 | A_flagship | 兵庫県 | あさご芸術の森美術館 | 64 | 短文<100,4要素欠落,固有名詞なし,flagship_weak,event掲載あり | flagship marquee; 短文<95 |
| 1609 | A_flagship | 京都府 | アサヒグループ大山崎山荘美術館 | 61 | 短文<100,4要素欠落,固有名詞なし,flagship_weak,event掲載あり | flagship marquee; 短文<95 |
| 1747 | A_flagship | 愛知県 | mozoワンダーシティ | 87 | 短文<100,4要素欠落,固有名詞なし,flagship_weak,event掲載あり | flagship marquee; 短文<95 |
| 1764 | A_flagship | 愛知県 | 新美南吉記念館 | 72 | 短文<100,4要素欠落,固有名詞なし,flagship_weak,event掲載あり | flagship marquee; 短文<95 |
| 1847 | A_flagship | 福岡県 | 福岡県青少年科学館 | 83 | 短文<100,4要素欠落,固有名詞なし,flagship_weak,event掲載あり | flagship marquee; 短文<95 |
| 1875 | A_flagship | 福岡県 | 響灘ビオトープ | 83 | 短文<100,4要素欠落,flagship_weak,safety,event掲載あり | flagship marquee; 短文<95 |
| 2055 | A_flagship | 静岡県 | 富士山かぐや姫ミュージアム | 64 | 短文<100,4要素欠落,固有名詞なし,flagship_weak,event掲載あり | flagship marquee; 短文<95 |
| 2057 | A_flagship | 静岡県 | 竜洋昆虫自然観察公園 | 65 | 短文<100,4要素欠落,固有名詞なし,flagship_weak,event掲載あり | flagship marquee; 短文<95 |
| 2091 | A_flagship | 山梨県 | 山梨県立文学館 | 88 | 短文<100,4要素欠落,固有名詞なし,flagship_weak,event掲載あり | flagship marquee; 短文<95 |
| 2179 | A_flagship | 長野県 | 松本市立博物館 | 48 | 短文<100,4要素欠落,固有名詞なし,flagship_weak,event掲載あり | flagship marquee; 短文<95 |
| 2182 | A_flagship | 長野県 | 松本市四賀化石館 | 44 | 短文<100,4要素欠落,固有名詞なし,flagship_weak,event掲載あり | flagship marquee; 短文<95 |
| 2184 | A_flagship | 長野県 | 安曇野ちひろ美術館 | 56 | 短文<100,4要素欠落,固有名詞なし,flagship_weak,event掲載あり | flagship marquee; 短文<95 |
| 79 | A_flagship | 長野県 | レイクウォーク岡谷 | 59 | 短文<100,4要素欠落,flagship_weak,event掲載あり | flagship marquee; 短文<95 |
| 82 | A_flagship | 長野県 | ながのこども館「ながノビ！」 | 69 | 短文<100,4要素欠落,flagship_weak,event掲載あり | flagship marquee; 短文<95 |
| 85 | A_flagship | 長野県 | sakumo佐久市子ども未来館 | 81 | 短文<100,4要素欠落,flagship_weak,event掲載あり | flagship marquee; 短文<95; 禁止表現除去:満足度/No.1 |
| 99 | A_flagship | 長野県 | 野沢温泉スキー場 | 59 | 短文<100,4要素欠落,flagship_weak,event掲載あり | flagship marquee; 短文<95 |
| 108 | A_flagship | 山梨県 | 富士すばるランド | 82 | 短文<100,4要素欠落,flagship_weak,event掲載あり | flagship marquee; 短文<95; 禁止表現除去:星評価/評価4/ランキング |
| 115 | A_flagship | 山梨県 | 山梨県立富士湧水の里水族館 森の中の水族館 | 68 | 短文<100,4要素欠落,flagship_weak,event掲載あり | flagship marquee; 短文<95 |
| 217 | A_flagship | 東京都 | 東京ジョイポリス | 48 | 短文<100,4要素欠落,flagship_weak,event掲載あり | flagship marquee; 短文<95 |
| 219 | A_flagship | 東京都 | キッザニア東京 | 52 | 短文<100,4要素欠落,flagship_weak,event掲載あり | flagship marquee; 短文<95 |
| 221 | A_flagship | 東京都 | 日本科学未来館 | 68 | 短文<100,4要素欠落,flagship_weak,event掲載あり | flagship marquee; 短文<95 |
| 222 | A_flagship | 東京都 | 東京都水の科学館 | 47 | 短文<100,4要素欠落,flagship_weak,event掲載あり | flagship marquee; 短文<95; 禁止表現除去:人気 |
| 223 | A_flagship | 東京都 | ナンジャタウン | 62 | 短文<100,4要素欠落,flagship_weak,event掲載あり | flagship marquee; 短文<95 |
| 224 | A_flagship | 東京都 | サンシャイン水族館 | 41 | 短文<100,4要素欠落,flagship_weak,event掲載あり | flagship marquee; 短文<95 |
| 226 | A_flagship | 東京都 | 国立科学博物館 | 56 | 短文<100,4要素欠落,flagship_weak,event掲載あり | flagship marquee; 短文<95 |
| 229 | A_flagship | 東京都 | 地下鉄博物館 | 54 | 短文<100,4要素欠落,flagship_weak,event掲載あり | flagship marquee; 短文<95 |
| 233 | A_flagship | 東京都 | 江戸川区自然動物園 | 48 | 短文<100,4要素欠落,flagship_weak,event掲載あり | flagship marquee; 短文<95 |
| 238 | A_flagship | 東京都 | サンリオピューロランド | 54 | 短文<100,4要素欠落,flagship_weak,event掲載あり | flagship marquee; 短文<95 |
| 240 | A_flagship | 東京都 | 多摩動物公園 | 53 | 短文<100,4要素欠落,flagship_weak,event掲載あり | flagship marquee; 短文<95 |
| 1073 | A_flagship | 茨城県 | 日立シビックセンター科学館・天球劇場（サクリエ） | 51 | 短文<100,4要素欠落,flagship_weak,event掲載あり | flagship marquee; 短文<95 |
| 1074 | A_flagship | 茨城県 | 大洗わくわく科学館 | 46 | 短文<100,4要素欠落,flagship_weak,event掲載あり | flagship marquee; 短文<95 |
| 1095 | A_flagship | 茨城県 | かみねレジャーランド | 51 | 短文<100,4要素欠落,flagship_weak,event掲載あり | flagship marquee; 短文<95 |
| 1169 | A_flagship | 群馬県 | 渋川スカイランドパーク | 69 | 短文<100,4要素欠落,flagship_weak,event掲載あり | flagship marquee; 短文<95 |
| 1177 | A_flagship | 群馬県 | 向井千秋記念子ども科学館 | 66 | 短文<100,4要素欠落,flagship_weak,event掲載あり | flagship marquee; 短文<95 |
| 117 | B_safety | 山梨県 | 笛吹川フルーツ公園 | 103 | 薄文<150,4要素欠落,safety,event掲載あり | 禁止表現除去:星評価/評価4 |
| 1144 | B_safety | 茨城県 | YAWARA福岡堰さくら公園 | 86 | 短文<100,4要素欠落,固有名詞なし,safety | 短文<95 |
| 1193 | B_safety | 群馬県 | 小平の里 | 64 | 短文<100,4要素欠落,固有名詞なし,safety | 短文<95 |
| 1197 | B_safety | 群馬県 | 桐生市新里温水プール カリビアンビーチ | 53 | 短文<100,4要素欠落,固有名詞なし,safety | 短文<95 |
| 1201 | B_safety | 群馬県 | 観音山公園 ケルナー広場 | 65 | 短文<100,4要素欠落,固有名詞なし,safety | 短文<95 |
| 1205 | B_safety | 群馬県 | ハイウェイオアシスららん藤岡（道の駅ららん藤岡） | 68 | 短文<100,4要素欠落,固有名詞なし,safety | 短文<95 |
| 1234 | B_safety | 群馬県 | 道の駅 中山盆地・高山ふれあいパーク | 65 | 短文<100,4要素欠落,固有名詞なし,safety | 短文<95 |
| 1296 | B_safety | 群馬県 | 道の駅うえの | 57 | 短文<100,4要素欠落,固有名詞なし,safety | 短文<95 |
| 1420 | B_safety | 大阪府 | りんくうマーブルビーチ | 59 | 短文<100,4要素欠落,固有名詞なし,safety | 短文<95 |
| 2059 | B_safety | 静岡県 | 掛川城公園 | 59 | 短文<100,4要素欠落,固有名詞なし,safety | 短文<95 |
| 2077 | B_safety | 静岡県 | 柿田川公園・柿田川湧水群 | 68 | 短文<100,4要素欠落,固有名詞なし,safety | 短文<95 |
| 22 | B_safety | 静岡県 | 富士山こどもの国 | 89 | 短文<100,4要素欠落,safety | 短文<95 |
| 24 | B_safety | 静岡県 | 島田市ゆめ・みらいパーク | 76 | 短文<100,4要素欠落,safety | 短文<95 |
| 25 | B_safety | 静岡県 | 22世紀の丘公園 | 75 | 短文<100,4要素欠落,safety | 短文<95 |
| 69 | B_safety | 長野県 | 湯川ふるさと公園 | 59 | 短文<100,4要素欠落,safety | 短文<95; 禁止表現除去:星評価/評価4/人気 |
| 161 | B_safety | 山梨県 | 河口湖自然生活館 | 77 | 短文<100,4要素欠落,safety | 短文<95; 禁止表現除去:星評価/評価4 |
| 176 | B_safety | 山梨県 | フレンドパークむかわ | 94 | 短文<100,4要素欠落,safety | 短文<95 |
| 1213 | B_safety | 群馬県 | 榛名湖 | 65 | 短文<100,4要素欠落,safety | 短文<95 |
| 1552 | B_safety | 兵庫県 | グリーンエコー笠形 | 83 | 短文<100,4要素欠落,safety | 短文<95 |
| 1591 | B_safety | 京都府 | アクトパル宇治 | 65 | 短文<100,4要素欠落,safety | 短文<95 |
| 1614 | B_safety | 京都府 | 美山町自然文化村 | 63 | 短文<100,4要素欠落,safety | 短文<95 |
| 1632 | B_safety | 京都府 | 西山公園ジャブジャブ池・子どもの森 | 53 | 短文<100,4要素欠落,safety | 短文<95 |
| 86 | D_quality | 長野県 | 長野市少年科学センター | 39 | 短文<100,4要素欠落,固有名詞なし | 短文<95; 禁止表現除去:人気 |
| 87 | D_quality | 長野県 | 森のおうち絵本美術館 | 55 | 短文<100,4要素欠落,固有名詞なし | 短文<95 |
| 113 | D_quality | 山梨県 | 動物ふれあい広場(まきば公園) | 73 | 短文<100,4要素欠落,固有名詞なし | 短文<95; 禁止表現除去:星評価/評価4 |
| 118 | D_quality | 山梨県 | さかな公園 | 72 | 短文<100,4要素欠落,固有名詞なし | 短文<95 |
| 129 | D_quality | 山梨県 | 猫カフェMOCHA イオンモール甲府昭和店 | 41 | 短文<100,4要素欠落,固有名詞なし | 短文<95 |
| 1079 | D_quality | 茨城県 | 道の駅 グランテラス筑西 | 53 | 短文<100,4要素欠落,固有名詞なし | 短文<95 |
| 1084 | D_quality | 茨城県 | 笠間芸術の森公園 | 51 | 短文<100,4要素欠落,固有名詞なし | 短文<95 |
| 1103 | D_quality | 茨城県 | 笠間工芸の丘 | 51 | 短文<100,4要素欠落,固有名詞なし | 短文<95 |
| 1114 | D_quality | 茨城県 | ふれあい動物園ANIMA | 89 | 短文<100,4要素欠落,固有名詞なし | 短文<95 |
| 1138 | D_quality | 茨城県 | 古河公方公園（古河総合公園） | 70 | 短文<100,4要素欠落,固有名詞なし | 短文<95 |
| 1139 | D_quality | 茨城県 | 西山公園 | 74 | 短文<100,4要素欠落,固有名詞なし | 短文<95 |
| 1140 | D_quality | 茨城県 | 静峰ふるさと公園 | 86 | 短文<100,4要素欠落,固有名詞なし | 短文<95 |
| 1150 | D_quality | 茨城県 | 花園渓谷 | 80 | 短文<100,4要素欠落,固有名詞なし | 短文<95 |
| 1395 | D_quality | 大阪府 | ちきゅうのにわ 堺鉄砲町店 | 71 | 短文<100,4要素欠落,固有名詞なし | 短文<95 |
| 342★ | D_quality | 東京都 | 東白鬚公園 防災広場 | 17 | 短文<100,4要素欠落 | 本文欠落(forced); 短文<95 |

## T2_polish(任意・2件)
- #1813 福岡県 到津の森公園 (len96)
- #1820 福岡県 スペースLABO（北九州市科学館） (len98)

## defer(18件・見送り)
- #1720 愛知県 南知多おもちゃ王国 (len111)
- #1738 愛知県 ラグーナテンボス（ラグナシア） (len120)
- #1355 大阪府 服部緑地 (len123)
- #1931 広島県 広島市安佐動物公園 (len107)
- #2017 広島県 ふくやま美術館 (len100)
- #136 山梨県 山梨県立科学館 (len125)
- #174 山梨県 フォレストアドベンチャー・フジ (len128)
- #183 長野県 かざこし子どもの森公園 (len119)
- #186 静岡県 三島スカイウォーク (len128)
- #1326 大阪府 堺・緑のミュージアム ハーベストの丘 (len117)
- #1337 大阪府 大阪市立自然史博物館 (len111)
- #1340 大阪府 国立民族学博物館 (len114)
- #1358 大阪府 寝屋川公園 (len115)
- #1359 大阪府 山田池公園 (len120)
- #1363 大阪府 長居公園 (len119)
- #1368 大阪府 蜻蛉池公園 (len118)
- #1679 愛知県 メタウォーター下水道科学館なごや (len100)
- #1683 愛知県 大高緑地 (len118)

★=本文欠落(強制include)