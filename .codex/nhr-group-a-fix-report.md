# needs_human_review A群 反映レポート

作業日: 2026-06-13

## タスク1 反映内容

- 変更施設数: 8件
- 県count変動: 長野県 73 -> 74、山梨県 72 -> 71
- data_quality_status: confirmed 4件、exclude_candidate 4件
- 住所・座標修正: id205、id137、id150、id114
- 県移管: id114 山梨県/yamanashi -> 長野県/nagano
- url/source_urls/source_checked_at/source_notes 更新: 8件

## 公式URL一覧

- id146 GlassHouseねん: https://www.gem-glass.jp/%E3%82%A4%E3%83%99%E3%83%B3%E3%83%88/
- id205 KOMOROBI Athletic & Camp: https://komorobi.com/
- id137 山梨いちごの王さまミュージアム: https://strawberryk-museum.com/access/
- id150 あすなろ園: https://asunaroen.com/
- id114 八ヶ岳アルパカ牧場: https://www.alpaca-farm.net/
- id167 軽井沢おもちゃ王国: https://www.omochaoukoku.com/karuizawa/access/
- id168 わくわく大冒険の森: https://www.omochaoukoku.com/karuizawa/nature/adventure/
- id172 浅間牧場: https://www.pref.gunma.jp/soshiki/145/

## 再ジオコード

- id205: 長野県小諸市甲4717 -> 36.3460816, 138.4401832
- id137: 山梨県甲斐市竜王新町1860-4 -> 35.6767937, 138.5115782
- id150: 山梨県甲州市勝沼町等々力1825-1 -> 35.6709279, 138.7152514
- id114: 長野県諏訪郡富士見町落合13505-1 -> 35.930288, 138.235682

## タスク2 調査のみ

### id29 遊具広場(長浜海浜公園)

- 判定: 同名別施設の混同。既存登録住所の下田市須崎1428-2では、長浜海浜公園の実体を公式・自治体ソースで確認できない。
- 根拠: 熱海市公式が長浜海浜公園を静岡県熱海市上多賀とし、大型遊具・海底都市・海賊船等を掲載。
- 提出案: 既存登録を「長浜海浜公園」に差し替え。住所は静岡県熱海市上多賀、公式URLは https://www.city.atami.lg.jp/shisetsu/bunka/1002057/1002072.html

### id123 富士見ふれあいの森公園

- 判定: 同名別施設の混同。登録住所の南巨摩郡富士川町青柳町539ではなく、市川三郷町の公園として実体確認。
- 根拠: 市川三郷町公式が富士見ふれあいの森公園を掲載し、80mローラー滑り台・フィールドアスレチック等を記載。市川三郷町ネーミングライツ資料では住所を市川三郷町岩間3965番地として掲載。
- 提出案: 住所を山梨県西八代郡市川三郷町岩間3965番地に修正し、公式URLは https://www.town.ichikawamisato.yamanashi.jp/50sightsee/50guide/fujimihureainomori.html

### id26 石人の星公園 遊具広場

- 判定: 別施設混同。石人の星公園は浜松市所在で、既存登録の磐田市岩室1093は公式ソース上の公園実体と一致しない。
- 根拠: 静岡県環境学習ポータルが遠州灘海浜公園(愛称: 石人の星公園)を浜松市中央区江之島町1706として掲載。公式サイトも石人の星公園/静岡県営都市公園 遠州灘海浜公園として運営。
- 提出案: 既存登録を「石人の星公園(遠州灘海浜公園 中田島北地区)」に差し替え。住所は静岡県浜松市中央区江之島町1706、公式URLは https://www.enshunada.com/

## 検証

- `node scripts/audit-data-quality.mjs`: PASS。県リストは対象9県のまま。prefecture_id_mismatch/address_pref_mismatch/coord_pref_mismatch は0。県countは長野+1、山梨-1のみ。
- `npm run push-to-sheet`: PASS。1030施設を全件書き込み。
- `npm run sync-sheet`: PASS。`JSON write skipped: no facility changes` により往復diffゼロ。
- `npm run build`: PASS。
