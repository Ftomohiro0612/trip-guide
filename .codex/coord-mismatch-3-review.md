# coord_pref_mismatch 残3件レビュー

調査日: 2026-06-11

対象: `data/facilities_data.json` の id896 / id898 / id901。  
制約: `facilities_data.json` は未変更。一次情報で住所を確認できたものだけ Nominatim で照会した。

## 現状値

| id | name | prefecture | prefecture_id | address | latitude | longitude | geocode_source | url |
|---:|---|---|---|---|---:|---:|---|---|
| 896 | 荒川公園(熊谷) | 埼玉県 | saitama | 熊谷市河原町 | 38.5853321 | 140.7526324 | nominatim | https://www.city.kumagaya.lg.jp/ |
| 898 | 戸田市スポーツセンター | 埼玉県 | saitama | 戸田市本町1-17-1 | 36.6038412 | 136.6190889 | nominatim | https://www.city.toda.saitama.jp/ |
| 901 | 武甲山資料館 (秩父) | 埼玉県 | saitama | 秩父市大宮6176-1 | 34.7211837 | 135.4189942 | nominatim | https://www.bukoh-museum.jp/ |

監査側の埼玉県 bbox: `minLat=35.7, maxLat=36.3, minLng=138.7, maxLng=139.95`。

## id896 荒川公園(熊谷)

| 項目 | 内容 |
|---|---|
| 公式確認URL | https://www.city.kumagaya.lg.jp/kurashi/bosai/hinanjobasyo/hinanjyo/hinanbasyo-tyuou.html |
| 補助確認URL | https://www.city.kumagaya.lg.jp/about/soshiki/sogo/sportstown/oshirase/arakawaparks.files/kihon.pdf |
| 確認できた住所 | 熊谷市河原町2-173 / 熊谷市河原町二丁目173番 |
| Nominatim確認URL | https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&addressdetails=1&q=%E8%8D%92%E5%B7%9D%E5%85%AC%E5%9C%92%20%E7%86%8A%E8%B0%B7%E5%B8%82 |
| Nominatim確認座標 | 36.1367091, 139.3849507 (`leisure=park`, display_name: 荒川公園, 熊谷, 熊谷市, 埼玉県, 日本) |
| 住所完全一致クエリ | `埼玉県熊谷市河原町2丁目173` と構造化 `2-173 河原町 / 熊谷市 / 埼玉県` は Nominatim では no result |

現データとの差分:

| フィールド | 現データ | 確認結果/候補 | 差分 |
|---|---|---|---|
| address | 熊谷市河原町 | 熊谷市河原町2-173 | 番地欠落 |
| latitude | 38.5853321 | 36.1367091 | -2.4486230 |
| longitude | 140.7526324 | 139.3849507 | -1.3676817 |
| 座標距離 | - | - | 約297.9km |

判定: 修正すべき。住所は番地欠落、座標は埼玉県外に飛んでいる。Nominatim候補は監査bbox内。bbox調整ではない。

修正案:

| フィールド | 候補値 |
|---|---|
| address | 熊谷市河原町2-173 |
| latitude | 36.1367091 |
| longitude | 139.3849507 |
| geocode_source | nominatim |

PM判断が必要な点: 現 `url` は熊谷市トップで粒度が粗い。荒川公園単体ページがない場合、確認に使った避難場所ページまたは再整備PDFを施設URLとして採用するか判断が必要。

## id898 戸田市スポーツセンター

| 項目 | 内容 |
|---|---|
| 公式確認URL | https://www.city.toda.saitama.jp/soshiki/194/bunka-sport-access-todashisportcenter.html |
| 補助確認URL | https://toda-zaidan.org/sportscenter/shisetsu_sc/ |
| 確認できた住所 | 戸田市大字新曽1286番地 / 〒335-0021 埼玉県戸田市新曽1286番地 |
| Nominatim確認URL | https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&addressdetails=1&street=1286%20%E6%96%B0%E6%9B%BD&city=%E6%88%B8%E7%94%B0%E5%B8%82&state=%E5%9F%BC%E7%8E%89%E7%9C%8C&country=%E6%97%A5%E6%9C%AC&postalcode=335-0021 |
| Nominatim確認座標 | 35.8213684, 139.6651830 (`leisure=sports_centre`, display_name: 戸田スポーツセンター, 新曽, 戸田市, 埼玉県, 335-0021, 日本) |
| 備考 | 通常の `q=戸田市スポーツセンター` は近接バス停を返したため、住所の構造化クエリ結果を採用候補にした |

現データとの差分:

| フィールド | 現データ | 確認結果/候補 | 差分 |
|---|---|---|---|
| address | 戸田市本町1-17-1 | 戸田市大字新曽1286番地 | 住所が別地点 |
| latitude | 36.6038412 | 35.8213684 | -0.7824728 |
| longitude | 136.6190889 | 139.6651830 | +3.0460941 |
| 座標距離 | - | - | 約286.8km |

判定: 修正すべき。住所・座標とも実データ側の誤り。Nominatim構造化クエリの候補は監査bbox内。bbox調整ではない。

修正案:

| フィールド | 候補値 |
|---|---|
| address | 戸田市大字新曽1286番地 |
| latitude | 35.8213684 |
| longitude | 139.6651830 |
| geocode_source | nominatim |
| url | https://toda-zaidan.org/sportscenter/ または市公式案内ページ |

PM判断が必要な点: 現 `url` は戸田市トップで粒度が粗い。指定管理者サイトを施設URLにするか、市公式案内ページを優先するか判断が必要。

## id901 武甲山資料館 (秩父)

| 項目 | 内容 |
|---|---|
| 公式確認URL | https://www.bukohzan.jp/ |
| 補助確認URL | https://www.bukohzan.jp/about.html / https://www.city.chichibu.lg.jp/6022.html |
| 確認できた住所 | 〒368-0023 埼玉県秩父市大宮6176 / 埼玉県秩父市大宮6176番地 |
| Nominatim確認URL | https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&addressdetails=1&q=%E6%AD%A6%E7%94%B2%E5%B1%B1%E8%B3%87%E6%96%99%E9%A4%A8%20%E5%9F%BC%E7%8E%89%E7%9C%8C%E7%A7%A9%E7%88%B6%E5%B8%82%E5%A4%A7%E5%AE%AE6176 |
| Nominatim確認座標 | 35.9908906, 139.0919931 (`tourism=museum`, display_name: 武甲山資料館, 秩父市大宮6176, 国道299号, 秩父市, 秩父郡, 埼玉県, 368-0041, 日本) |
| 備考 | Nominatimの郵便番号表示は公式サイトの `368-0023` と異なるが、施設名・住所・座標は埼玉県秩父市内で一致 |

現データとの差分:

| フィールド | 現データ | 確認結果/候補 | 差分 |
|---|---|---|---|
| address | 秩父市大宮6176-1 | 秩父市大宮6176 | 枝番 `-1` は一次情報で確認できず |
| latitude | 34.7211837 | 35.9908906 | +1.2697069 |
| longitude | 135.4189942 | 139.0919931 | +3.6729989 |
| 座標距離 | - | - | 約361.7km |
| url | https://www.bukoh-museum.jp/ | https://www.bukohzan.jp/ | 現URLは今回の一次情報確認に使えず |

判定: 修正すべき。住所は枝番が余分、座標は大阪方面に飛んでいる。Nominatim候補は監査bbox内。bbox調整ではない。

修正案:

| フィールド | 候補値 |
|---|---|
| address | 秩父市大宮6176 |
| latitude | 35.9908906 |
| longitude | 139.0919931 |
| geocode_source | nominatim |
| url | https://www.bukohzan.jp/ |

PM判断が必要な点: 現 `url` の `bukoh-museum.jp` を公式サイトとして維持できる根拠が見つからない。公式サイトとして確認できた `bukohzan.jp` に差し替えるか判断が必要。

## 全体判定

| id | 切り分け | 判定 | bbox調整 |
|---:|---|---|---|
| 896 | 住所表記の問題 + 座標誤り | 修正すべき | 不要 |
| 898 | 実データの誤り（住所・座標） | 修正すべき | 不要 |
| 901 | 実データの誤り（住所・座標・URL候補） | 修正すべき | 不要 |

3件とも、確認できた/Nominatimで返った座標は現行の埼玉県bbox内に入る。今回の検出は bbox が狭いことによる過剰検出ではなく、実データ側の住所・座標不整合として扱うのが妥当。

needs_web_check 候補: なし。ただし、id896 の施設URL粒度、id898 の施設URL選定、id901 のURL差し替えは PM 判断対象。
