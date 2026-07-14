# Summer Festivals & Fireworks Hub 2026 v1 — Research Owner Review

調査基準日: 2026-07-14（JST）

Track: `Summer Festivals & Fireworks Hub 2026 v1`
提出時状態: **OPEN / RESEARCH COMPLETE / OWNER ADOPTION REVIEW / IMPLEMENTATION HOLD**

## 1. Executive decision request

Researchの結果、次の採用案をOwnerへ提出する。

| 判定対象 | 採用案 |
|---|---:|
| 主役候補（花火大会・夏祭り） | 43件 |
| うち新規データ候補 | 41件 |
| うち既存データで再利用 | 2件（金沢まつり花火大会、辻の盆） |
| LIVE 16件のHub採用 | 15件 |
| LIVE 16件のHub対象外 | 1件（森のサマースクール） |
| Hub全体のユニーク採用案 | 57件 |
| Hero・トップ優先候補 | 12件 |

Ownerへの推奨判定は次のとおり。

1. 公式一次情報を確認できた主役43件を `ADOPT` とする
2. 既存データから、主役2件と補助14件の計16件をHub対象にする
3. LIVE 16件は汎用 `/events` に維持し、15件だけをHubへ採用、1件をHub対象外とする
4. 新規41件のデータ作成と既存16件への分類付与は、Owner採用GO後のDフェーズで行う
5. Hero・トップ優先候補12件と、季節導線終了日時案 `2026-09-28T00:00:00+09:00` を承認対象とする
6. 終了制御は「予定再build／redeployを正規手段、実行時hard stopを安全弁」とするHybrid案を第一推奨とする

この資料の作成時点では、データ、型、Hub、ナビ、Production、hot memory、main、release branch、Phase Cを変更していない。

Research baselineは次のまま維持されている。

- 製品HEAD: `1725f4459e8a0b876169de4349a68507ecf7b25e`
- `data/events_data.json` blob: `efd60996848143cc7f4e6f54c1584307b417fbe7`
- 管理方法: mainへ未反映・未commitのResearch資料

## 2. Research gateと方法

### 掲載候補の時点条件

- 2026-07-14時点で開催中、または今後開催される催事を採用候補として優先した
- 2026-07-13以前に終了した主要催事は、網羅確認と除外記録には残すが掲載目標件数へ算入しない
- 開催期間は承認済み定義どおり2026年6月〜9月とし、10月以降へ移動した催事は夏Hub対象外とした
- 個別の公式日程を確認できない候補は、規模や知名度にかかわらず `HOLD` とした

### 一次情報の採用順

1. 主催者・実行委員会の公式個別ページ
2. 自治体の公式個別ページまたは公式PDF
3. 会場・施設の公式個別ページ
4. 主催者として運営する公式観光協会・DMOの個別ページ

まとめサイト、検索結果、ニュース、SNS、チケット販売ページは正本URLにしていない。

### 既存766件の棚卸し

| 段階 | 件数 | 結果 |
|---|---:|---|
| `events_data.json` 全体 | 766 | 読み取りのみ |
| 東京・神奈川・千葉・埼玉 | 213 | 対象都県 |
| 2026-07-14時点で開催中／今後 | 169 | 東京37、神奈川40、千葉51、埼玉41 |
| 季節語で抽出した確認候補 | 36 | 花火、夏祭り、祭り、盆踊り、縁日、灯籠、風鈴、夜、ナイト、七夕 |
| 既存データからのHub採用案 | 16 | 主役2、補助14 |
| 既存候補のHOLD | 10 | 主役性・構成比・施設内企画のためv1では保留 |
| 既存候補の除外 | 11 | 季節語候補10とLIVEのサマースクール1 |

季節語36件には、実物の花火でない「花火アクアリウム」、展示、工作、施設内ミニ企画が混在した。したがってタイトル・タグ検索は棚卸しの候補出しにだけ使い、Hub抽出条件には使わない。

## 3. 主役43件の採用候補

全件、2026-07-14時点で開催中または今後で、2026年の開催日を公式一次情報から確認した。判定はすべて `ADOPT proposal` であり、Owner採用GOまではデータへ反映しない。

### 東京 — 12件（花火6 / 夏祭り6）

| 分類 | 催事 | 開催日 | 公式一次情報 | 判定メモ |
|---|---|---|---|---|
| 花火 | 第49回隅田川花火大会 | 7/25 | [実行委員会](https://www.sumidagawa-hanabi.com/about/index.html) | 東京の代表大会、主役 |
| 花火 | 立川まつり国営昭和記念公園花火大会 | 7/25 | [実行委員会](https://hanabi.tokyo-tachikawa.org/news/news-611/) | 多摩地域の主要大会 |
| 花火 | 第60回葛飾納涼花火大会 | 7/28 | [葛飾区](https://www2.city.katsushika.lg.jp/tourism/1000064/1000065/1031830.html) | 約2万発、主役 |
| 花火 | 第51回江戸川区花火大会 | 8/1 | [江戸川区](https://www.city.edogawa.tokyo.jp/e004/kuseijoho/kohokocho/press/2026/04/0408.html) | 19:15〜20:20、約1.4万発 |
| 花火 | 八王子花火大会 | 8/1 | [八王子市](https://www.city.hachioji.tokyo.jp/kankobunka/001/001/p003249.html) | 多摩地域の主要大会 |
| 花火 | 第67回いたばし花火大会 | 8/1 | [実行委員会](https://itabashihanabi.jp/overview/) | 荒川対岸大会と連携する主要大会 |
| 夏祭り | 第52回神楽坂まつり | 7/22〜7/25 | [GO TOKYO](https://www.gotokyo.org/jp/spot/ev038/index.html) | ほおずき市・阿波踊り |
| 夏祭り | 第23回新宿エイサーまつり | 7/25 | [実行委員会](https://www.shinjuku-eisa.com/) | 地域回遊型の主要夏祭り |
| 夏祭り | 八王子まつり | 8/7〜8/9 | [八王子市](https://www.city.hachioji.tokyo.jp/kankobunka/001/001/p003251.html) | 市内最大、山車・みこし |
| 夏祭り | 第70回阿佐谷七夕まつり | 8/7〜8/11 | [阿佐谷商店街振興組合](https://www.asagaya.or.jp/) | 東京の代表的七夕祭り |
| 夏祭り | 深川八幡祭り（本祭り） | 8/12〜8/16 | [GO TOKYO](https://www.gotokyo.org/jp/spot/ev093/index.html) | 2026年本祭り、主要伝統祭 |
| 夏祭り | 第67回東京高円寺阿波おどり | 8/29〜8/30 | [主催者](https://www.koenji-awaodori.com/about/about01.html) | 東京を代表する阿波踊り |

### 神奈川 — 10件（花火5 / 夏祭り5）

| 分類 | 催事 | 開催日 | 公式一次情報 | 判定メモ |
|---|---|---|---|---|
| 花火 | 湯河原温泉海上花火大会 | 8/3 | [湯河原町公式年間行事PDF](https://www.town.yugawara.kanagawa.jp/uploaded/attachment/16718.pdf) | 約2,000発、海上大会 |
| 花火 | 第52回金沢まつり花火大会 | 8/22 | [横浜市金沢区](https://www.city.yokohama.lg.jp/kanazawa/kurashi/kyodo_manabi/kyodo_shien/chiiki/kanazawamaturi/maturi2026/hanabi.html) | 既存ID、19:00〜20:00、約3,500発 |
| 花火 | みなとみらいスマートフェスティバル2026 | 8/24 | [主催者](https://www.mmsf.yokohama/) | 音楽と花火の大規模催事 |
| 花火 | 第53回相模原納涼花火大会 | 9/5 | [実行委員会](https://sagamiharahanabi.com/overview/) | 19:00開始、約8,000発 |
| 花火 | よこすか開国花火大会2026 | 9/27 | [横須賀市](https://www.city.yokosuka.kanagawa.jp/2150/nagekomi/hanabi2026.html) | 18:00〜18:30、約1万発 |
| 夏祭り | 第20回辻堂かいひん盆踊り「辻の盆」 | 7/18〜7/19 | [県立辻堂海浜公園公式予定表PDF](https://kanagawa-park.or.jp/tujidou/eventschedule.pdf) | 既存ID、地域盆踊り |
| 夏祭り | 茅ヶ崎海岸浜降祭 | 7/20 | [茅ヶ崎市観光協会](https://www.chigasaki-kankou.org/topics/1478/) | 海の日の代表的な地域祭礼 |
| 夏祭り | 湯河原やっさまつり | 8/2〜8/3 | [湯河原町公式年間行事PDF](https://www.town.yugawara.kanagawa.jp/uploaded/attachment/16718.pdf) | 町の主要夏祭り |
| 夏祭り | 第74回橋本七夕まつり | 8/7〜8/9 | [相模原市緑区](https://midori.city.sagamihara.kanagawa.jp/2026/07/14/hashimoto-tanabata-matsuri-74th-20260807-20260809/) | 商店街回遊型の主要七夕祭り |
| 夏祭り | 第17回みなとみらい大盆踊り | 8/28〜8/29 | [横浜市観光情報](https://www.welcome.city.yokohama.jp/eventinfo/ev_detail.php?bid=yw10025) | 16:30〜20:30、親子で参加可能 |

### 千葉 — 10件（花火5 / 夏祭り5）

| 分類 | 催事 | 開催日 | 公式一次情報 | 判定メモ |
|---|---|---|---|---|
| 花火 | 幕張ビーチ花火フェスタ2026 | 8/1 | [千葉市](https://www.city.chiba.jp/keizainosei/keizai/kanko/2025_chiba_hanabi.html) | 19:30〜20:30、約2.4万発 |
| 花火 | 市川市民納涼花火大会 | 8/1 | [市川市](https://www.city.ichikawa.lg.jp/page/3681.html) | 江戸川対岸と同時開催 |
| 花火 | 松戸花火大会2026 | 8/1 | [松戸市](https://www.city.matsudo.chiba.jp/miryoku/kankoumiryokubunka/matsuri/summer/matsudohanabi.html) | 19:15〜20:20、約1.2万発 |
| 花火 | 手賀沼花火大会2026 | 8/1 | [我孫子市](https://www.city.abiko.chiba.jp/event/event_moyooshi/hanabi2026.html) | 手賀沼周辺の主要大会 |
| 花火 | 第79回木更津港まつり花火大会 | 8/15 | [木更津市](https://www.city.kisarazu.lg.jp/event/omatsuri_moyoshi/kisarazuminatomatsuri/14590.html) | 19:05〜20:30、港まつり主催 |
| 夏祭り | 第72回茂原七夕まつり | 7/24〜7/26 | [茂原市公式広報PDF](https://www.city.mobara.chiba.jp/cmsfiles/contents/0000009/9496/2026-06-01-04.pdf) | 関東有数の七夕祭り |
| 夏祭り | やっさいもっさい踊り大会 | 8/14 | [木更津市](https://www.city.kisarazu.lg.jp/event/omatsuri_moyoshi/kisarazuminatomatsuri/index.html) | 港まつりの踊り主催日 |
| 夏祭り | 第51回千葉の親子三代夏祭り | 8/15〜8/16 | [千葉市](https://www.city.chiba.jp/shimin/shimin/jichi/bikai_event.html) | 親子を明示する市中心部の主要祭り |
| 夏祭り | 第19回あびこカッパまつり | 8/29 | [我孫子市](https://www.city.abiko.chiba.jp/event/event_moyooshi/abikokappamatsuri.html) | 10:00〜21:00、地域参加型 |
| 夏祭り | 2026柏まつり | 9/19〜9/20 | [柏市](https://www.city.kashiwa.lg.jp/chiiki-community/kashiwamatsuri/kashiwamatsuri2026-3.html) | 暑熱対策で9月開催、公式に2026日程確定 |

### 埼玉 — 11件（花火5 / 夏祭り6）

| 分類 | 催事 | 開催日 | 公式一次情報 | 判定メモ |
|---|---|---|---|---|
| 花火 | 越谷花火大会 | 7/25 | [越谷市観光協会](https://www.koshigaya-sightseeing.jp/news/%E8%B6%8A%E8%B0%B7%E8%8A%B1%E7%81%AB%E5%A4%A7%E4%BC%9A/) | 19:00〜20:30、約5,000発 |
| 花火 | さいたま市花火大会 大和田公園会場 | 7/25 | [さいたま市](https://www.city.saitama.lg.jp/006/014/008/003/015/003/p131231.html) | 19:30開始、荒天中止 |
| 花火 | 第73回戸田橋花火大会 | 8/1 | [主催者](https://www.todabashi-hanabi.jp/) | 19:00〜20:30、約7,500発 |
| 花火 | さいたま市花火大会 東浦和大間木公園会場 | 8/8 | [さいたま市](https://www.city.saitama.lg.jp/006/014/008/003/015/003/p131231.html) | 19:30開始、荒天中止 |
| 花火 | さいたま市花火大会 岩槻文化公園会場 | 8/22 | [さいたま市](https://www.city.saitama.lg.jp/006/014/008/003/015/003/p131231.html) | 19:30開始、荒天中止 |
| 夏祭り | 与野夏祭り | 7/18〜7/19 | [さいたま市](https://www.city.saitama.lg.jp/006/014/008/003/015/003/p131231.html) | みこし渡御を中心とする地域祭り |
| 夏祭り | 秩父川瀬祭 | 7/19〜7/20 | [秩父市](https://navi.city.chichibu.lg.jp/p_festival/1273/) | 秩父を代表する夏の祭礼 |
| 夏祭り | 熊谷うちわ祭 | 7/20〜7/22 | [熊谷市](https://www.city.kumagaya.lg.jp/shicho/kaiken/r8/R80630kishakaiken.html) | 関東一の祇園、市公式が2026日程確認 |
| 夏祭り | 第45回川越百万灯夏まつり | 7/25〜7/26 | [川越商工会議所・主催者](https://www.kawagoe.or.jp/natsumatsuri/?vm=r) | 川越中心部の主要夏祭り |
| 夏祭り | 第43回朝霞市民まつり「彩夏祭」 | 7/31〜8/2 | [朝霞市公式案内PDF](https://www.city.asaka.lg.jp/uploaded/attachment/110100.pdf) | 市民まつり、花火要素はタグで補足 |
| 夏祭り | 狭山市入間川七夕まつり | 8/1〜8/2 | [狭山市](https://www.city.sayama.saitama.jp/kankou/kanko/tanabata/) | 関東有数の七夕祭り |

## 4. 都県・分類別件数とCoverage gate

### 主役43件

| 都県 | 花火目標 | 花火候補 | 夏祭り目標 | 夏祭り候補 | 主役計 | ギャップ |
|---|---:|---:|---:|---:|---:|---|
| 東京 | 5 | 6 | 5 | 6 | 12 | なし |
| 神奈川 | 5 | 5 | 5 | 5 | 10 | なし |
| 千葉 | 5 | 5 | 5 | 5 | 10 | なし |
| 埼玉 | 5 | 5 | 5 | 6 | 11 | なし |
| 合計 | 20 | 21 | 20 | 22 | 43 | 40件目標を+3件で達成 |

件数目標を満たすために一次情報の弱い候補を採用していない。全43件に2026年の公式日程があり、終了済み催事は含めていない。

### Hub全体57件の構成案

主役43件に、既存データの補助14件を重複なく加える。

| 都県 | 花火 | 夏祭り | 縁日・灯籠・風鈴 | 夜のおでかけ | 計 |
|---|---:|---:|---:|---:|---:|
| 東京 | 6 | 8 | 1 | 1 | 16 |
| 神奈川 | 6 | 5 | 1 | 3 | 15 |
| 千葉 | 6 | 5 | 0 | 1 | 12 |
| 埼玉 | 6 | 6 | 1 | 1 | 14 |
| 合計 | 24 | 24 | 3 | 6 | 57 |

- `fireworks + summer_festival`: 48/57 = **84.2%**（基準70%以上を充足）
- `night_outing`: 6/57 = **10.5%**（目安20%以下を充足）
- 全都県で花火・夏祭りの両分類を確保
- 夜間開園、展示、ワークショップをHeroの主役へ混在させない

## 5. 主要イベント網羅確認

主要性は、自治体・主催者が代表催事として扱うこと、継続性、地域横断の集客性を基準に確認した。

### 採用候補に含めた主要催事

- 東京: 隅田川、葛飾、江戸川、いたばし、立川、八王子の花火、神楽坂、八王子、高円寺、深川、阿佐谷の祭り
- 神奈川: 金沢、相模原、横須賀、みなとみらい、湯河原の花火、浜降祭、橋本七夕、湯河原やっさ、辻の盆
- 千葉: 幕張、市川、松戸、手賀沼、木更津の花火、茂原七夕、木更津港まつり、親子三代、柏、あびこカッパ
- 埼玉: 越谷、戸田橋、さいたま市3会場の花火、熊谷うちわ、川越百万灯、秩父川瀬、狭山七夕、彩夏祭

### 終了・期間外・延期・未確定の主要候補

| 都県 | 催事 | 判定 | 理由 / 公式一次情報 |
|---|---|---|---|
| 東京 | 第48回足立の花火 | EXCLUDE | 5/30終了、掲載目標へ算入しない。[足立区](https://www.city.adachi.tokyo.jp/hodo/topics/2026fireworks.html) |
| 東京 | 大田区平和祈念花火 | EXCLUDE | 11/14予定で夏期間外。[大田区](https://www.city.ota.tokyo.jp/kanko/topics/heiwakinenhanabi.html) |
| 東京 | 神宮外苑花火大会 | HOLD | 7/14時点で2026年の主催者個別日程を確認できず、件数合わせで採らない |
| 神奈川 | 鎌倉花火大会 | EXCLUDE | 7/10終了、網羅記録だけ残す。[鎌倉市](https://www.city.kamakura.kanagawa.jp/kankou/hanabitaikai.html) |
| 神奈川 | 久里浜ペリー祭花火大会 | EXCLUDE | 7/11終了、網羅記録だけ残す。[横須賀市](https://www.city.yokosuka.kanagawa.jp/event/2754/202606151805.html) |
| 神奈川 | あつぎ鮎まつり | EXCLUDE | 2026年は10/10〜10/11へ移動し夏期間外。[厚木市](https://www.city.atsugi.kanagawa.jp/event/47949.html) |
| 神奈川 | 小田原酒匂川花火大会 | HOLD | 7/14時点で2026年個別日程の一次情報を確定できず |
| 神奈川 | サザンビーチちがさき花火大会 | HOLD | 7/14時点で2026年個別日程の一次情報を確定できず |
| 千葉 | 成田祇園祭 | EXCLUDE | 7/10〜7/12終了。[成田市](https://www.city.narita.chiba.jp/kanko/page0117_00121.html) |
| 千葉 | 佐原の大祭 夏祭り | EXCLUDE | 7/10〜7/12終了。[香取市](https://www.city.katori.lg.jp/sightseeing/matsuri/introduction/natsu.html) |
| 千葉 | 佐倉市民花火大会 | EXCLUDE | 会場整備のため2029年まで延期。[佐倉市](https://www.city.sakura.lg.jp/tourism/3/20431.html) |
| 千葉 | 館山湾花火大会 | HOLD | 7/14時点の公式個別ページは2025年情報で、2026年日程を確定できず |
| 千葉 | 南房総白浜海女まつり | HOLD | 2026年は「7月中旬予定」までで、個別日程と開催条件が未確定 |
| 埼玉 | あげお花火大会 | EXCLUDE | 公式に休止継続を確認、開催候補へ算入しない。[上尾市](https://www.city.ageo.lg.jp/page/ageohanabitaikai-kyuusi.html) |
| 埼玉 | 熊谷花火大会 | HOLD | 7/14時点で2026年の公式個別日程を確認できず、うちわ祭だけを採用 |

主要催事の件数ギャップはない。上表のHOLD候補は、Owner採用GO後も公式発表が出た場合だけ差分Reviewし、自動追加しない。

## 6. LIVE 16件の確定再分類案

Production上の16件は維持する。ここでの「Hub対象外」は削除やロールバックではなく、`summer-2026` を付けないという意味に限定する。

| ID | 催事 | 都県 | 確定分類案 | Hub | 役割 |
|---|---|---|---|---|---|
| `evt-326-202607-01` | うえの夏まつり2026 | 東京 | `summer_festival` | ADOPT | 補助 |
| `evt-243-202607-01` | グッド＆ラッキーの夏祭り2026 | 東京 | `summer_festival` | ADOPT | 補助・施設型 |
| `evt-230-202608-01` | 水族園で夕涼み | 東京 | `night_outing` | ADOPT | 補助枠のみ |
| `evt-976-202607-01` | 江戸の夏を歩く―変化朝顔と風鈴回廊― | 東京 | `summer_tradition` | ADOPT | 補助 |
| `evt-1009-202607-01` | 森のサマースクール | 東京 | 対象外 | EXCLUDE | 学習企画で採用定義外 |
| `evt-771-202608-01` | ナイトズーラシア | 神奈川 | `night_outing` | ADOPT | 補助枠のみ |
| `evt-772-202608-03` | ナイトのげやま2026 | 神奈川 | `night_outing` | ADOPT | 補助枠のみ |
| `evt-773-202608-01` | ナイト金沢ZOO | 神奈川 | `night_outing` | ADOPT | 補助枠のみ |
| `evt-802-202608-01` | 第52回金沢まつり花火大会 | 神奈川 | `fireworks` | ADOPT | 主役43件にも算入 |
| `evt-816-202608-01` | 江の島灯籠2026 | 神奈川 | `summer_tradition` | ADOPT | 補助 |
| `evt-774-202607-01` | 花火シンフォニア（2026年夏） | 神奈川 | `fireworks` | ADOPT | 施設型花火、主力Hero外 |
| `evt-674-202607-02` | トワイライトZOO | 千葉 | `night_outing` | ADOPT | 補助枠のみ |
| `evt-685-202607-02` | サマーナイトファーム | 千葉 | `fireworks` | ADOPT | 施設型花火、主力Hero外 |
| `evt-526-202607-01` | サマーナイトZOO 2026 | 埼玉 | `night_outing` | ADOPT | 補助枠のみ |
| `evt-494-202607-01` | メッツァの北欧花火2026 | 埼玉 | `fireworks` | ADOPT | 施設型花火、主力Hero外 |
| `evt-481-202606-01` | 川越氷川神社 縁むすび風鈴 | 埼玉 | `summer_tradition` | ADOPT | 補助 |

主役43件に含めるLIVEイベントは金沢まつり花火大会だけである。既存の `evt-904-202607-01` 辻の盆はLIVE 16件より前のデータだが、主役43件へ算入する。

## 7. 既存季節語候補のHOLD / EXCLUDE

### HOLD — 10件

公式情報があっても、v1の主役性、補助枠の比率、施設内企画との線引きから今回は採用しない。将来採用は別Reviewとする。

| 都県 | 催事 | 理由 |
|---|---|---|
| 千葉 | 「水族館探検プラン」＆「ナイトアドベンチャー」 | 夜間体験だが補助枠は既存採用で十分 |
| 千葉 | むらの縁日・夕涼み | 施設内の短期小規模企画、主役性が弱い |
| 神奈川 | 箱根小涌園 沖縄ハイサイ！祭り | 商業施設型で地域の夏祭りと同列にしない |
| 神奈川 | えのすい夜市 | 施設内夜市、補助枠の比率を優先 |
| 埼玉 | ホタル解説ナイト | 夜間自然観察で主役4分類との距離がある |
| 埼玉 | 大夏祭り 2026（西武園） | 商業施設型で公共・地域祭りを優先 |
| 東京 | ピューロランドネオナツマツリIII | 屋内商業施設型、地域祭りと同列にしない |
| 東京 | 夜間限定営業 ツクヨミアクアリウム | 夜間営業だが補助枠の比率を優先 |
| 東京 | 夜間特別開園 たてもの園 下町夕涼み | 補助候補としては適合するがv1の比率を優先 |
| 東京 | サマーナイト＠Tama Zoo 2026 | 補助候補としては適合するが既存採用6件で十分 |

### EXCLUDE — 11件

| 都県 | 催事 | 理由 |
|---|---|---|
| 東京 | 森のサマースクール | 夏休み学習企画で採用定義外 |
| 東京 | 夜間限定 体験型謎解き 館長からの挑戦状 | 謎解き企画で採用定義外 |
| 東京 | 花火アクアリウム by NAKED | 実物の打上花火ではない |
| 東京 | 30周年の幕開け 7月は祭イベント | 施設内キャンペーンで地域祭りではない |
| 神奈川 | 竹灯籠を作ってみよう | ワークショップ |
| 神奈川 | 小学生以下対象「お蚕様の縁日」 | 館内ミニ企画 |
| 神奈川 | 親子で楽しむ！小さな生きもの見つけ方講座 | 学習講座 |
| 埼玉 | 企画展示「アンモナイト」 | 展示 |
| 埼玉 | 夜の自然観察会 | 単発学習企画 |
| 埼玉 | こども体験教室「ミニ灯籠を作ろう」 | ワークショップ |
| 埼玉 | 自然に親しむイベントデー「夜森ミュージアム」 | 学習プログラム |

## 8. Hero・トップ優先候補 — 12件

優先候補は全都県3件ずつ、花火と夏祭りだけで構成する。`night_outing` と施設型の補助花火・夏祭りは含めない。

| 優先 | 都県 | 催事 | 分類 | 選定理由 |
|---:|---|---|---|---|
| 1 | 神奈川 | 茅ヶ崎海岸浜降祭 | 夏祭り | 7/20、調査基準日から最も近い主要祭礼 |
| 2 | 埼玉 | 熊谷うちわ祭 | 夏祭り | 7/20〜7/22、地域代表性が高い |
| 3 | 東京 | 隅田川花火大会 | 花火 | 東京を代表する大会、7/25 |
| 4 | 千葉 | 茂原七夕まつり | 夏祭り | 7/24〜7/26、千葉の主要七夕祭り |
| 5 | 埼玉 | 川越百万灯夏まつり | 夏祭り | 7/25〜7/26、親子で内容が理解しやすい |
| 6 | 東京 | 葛飾納涼花火大会 | 花火 | 7/28、約2万発、日付順の次の主役 |
| 7 | 千葉 | 幕張ビーチ花火フェスタ | 花火 | 8/1、約2.4万発、県代表性が高い |
| 8 | 埼玉 | 戸田橋花火大会 | 花火 | 8/1、県南部の主要大会 |
| 9 | 東京 | 深川八幡祭り（本祭り） | 夏祭り | 2026年本祭り、伝統性と希少性が高い |
| 10 | 千葉 | 木更津港まつり花火大会 | 花火 | 港まつりと連続して楽しめる県南部の主役 |
| 11 | 神奈川 | みなとみらいスマートフェスティバル | 花火 | 横浜の大規模主役候補、8/24 |
| 12 | 神奈川 | 相模原納涼花火大会 | 花火 | 9/5、夏後半の主役を確保 |

実装時は固定順位をそのまま表示順にせず、共通の候補リストから「今日以降の次回開催日」を優先し、終了した候補を自動的に外す。トップCTAの写真・文言は1イベントだけに依存させない。

## 9. 確定データ設計案

### Eventの最小追加項目

```ts
type FeatureHubId = "summer-2026";

type SummerEventType =
  | "fireworks"
  | "summer_festival"
  | "summer_tradition"
  | "night_outing";

type EventItem = {
  // existing fields
  facility_id: number | null;
  venue_name?: string;
  event_type?: SummerEventType;
  feature_hubs?: FeatureHubId[];
  occurrence_dates?: string[];
};
```

### Hub共通設定

Hero優先IDと季節導線の有効期間は、イベントレコードへ散在させずHub設定で管理する。

```ts
type FeatureHubConfig = {
  id: FeatureHubId;
  path: "/events/summer";
  startsAt: string; // JST offset付きISO 8601
  endsAt: string;   // 排他的終了日時
  navLabel: string;
  ctaTitle: string;
  heroEventIds: string[];
};
```

2026年案:

```ts
{
  id: "summer-2026",
  path: "/events/summer",
  startsAt: "<採用GO後の公開日時>",
  endsAt: "2026-09-28T00:00:00+09:00",
  navLabel: "🎆 夏祭り・花火",
  ctaTitle: "夏祭り・花火大会2026",
  heroEventIds: [/* Owner承認済み候補 */]
}
```

`endsAt` は最後の主役候補「よこすか開国花火大会」9/27終了後の翌日0時を提案する。終了後も `/events/summer` のアーカイブURL自体は保持できるが、PC／スマホヘッダーとトップ大型CTAは通常導線へ戻す。

### Validation rules

1. `feature_hubs` は許可済み年付きIDだけを受け付け、重複を拒否する
2. `summer-2026` を含む場合、`event_type` を必須にする
3. `occurrence_dates` は `YYYY-MM-DD`、昇順、重複なし、`start_date`〜`end_date` 内を必須にする
4. 非連続日程は `occurrence_dates` の今日以降最小日を並び順・今週末判定へ使う
5. `facility_id` が数値なら実在する公開施設IDを必須にする
6. `facility_id=null` ならtrim後に空でない `venue_name` を必須にする
7. 架空の施設IDや「施設情報確認中」による代替を許さない
8. `end_date >= start_date`、公式URL、確認日、公開鮮度を既存条件と合わせて検証する

## 10. 実装影響範囲（D/H/N/QはHOLD）

Researchで読み取り確認した影響範囲を、Owner採用GO後の設計入力として固定する。

| 対象 | 現状 | 必要対応 |
|---|---|---|
| `lib/events.ts` / `EventItem` | `facility_id: number` 必須 | nullable、`venue_name`、分類、Hub ID、非連続日を型へ追加 |
| visibility | 有効な施設IDとの一致が必須 | 有効施設ID、またはnull施設+有効会場名のどちらでも通過 |
| 並び順 / 今週末 | `start_date`〜`end_date` の連続期間として判定 | `occurrence_dates` がある場合は実開催日だけで判定 |
| `toEventView` | 施設がなければ会場情報なし | `venue_name` をViewへ引き継ぐ |
| `EventCard` | 施設なしは「施設情報確認中」 | 会場名を表示し、null施設では施設リンクも確認中表示も出さない |
| `EventFilterBar` | 都県、今週末、月、屋内、無料、予約不要 | Hubでは種別を追加し、既存条件を再利用 |
| `/events` | 汎用一覧 | Hub採用イベントも掲載可能、null施設を表示可能にする |
| `/events/[prefecture]` | 都県別汎用一覧 | null施設イベントも都県フィールドで掲載する |
| `/events/summer` | 未実装 | 年付きHub ID抽出、分類セクション、次回日順、SEO、JSON-LD |
| `Header` | PCのみ汎用イベント導線、スマホ季節導線なし | 共通期間中だけPC/SPの1タップ季節導線を表示 |
| トップ | 小型の汎用季節リンク | Hero直下に大型CTA、共通期間終了後は通常導線へ復帰 |
| `lib/my-places-events.ts` | 数値の施設IDで照合 | null施設の街イベントは「いつもの場所」候補から安全に除外 |
| `FacilityEvents` | 施設ID一致で表示 | 数値施設イベントだけを従来どおり表示 |
| JSON検証 | 新項目・null施設の相関検証なし | 上記Validationをbuild前に失敗させる検証を追加 |

既存766件は新項目未設定でも汎用一覧の表示を維持する。全件一括分類はしない。

## 11. 季節導線の終了制御方式

### Option A — 実行時server判定

共通設定をサーバーで毎リクエスト評価し、Next.js 16のrequest-time境界で季節導線を切り替える。

- 利点: static build後も終了時刻で自動終了し、再deployに依存しない
- 留意: 共通Headerを動的境界にすると全ページのキャッシュ・描画設計へ影響する
- 留意: Partial Prerendering相当の境界、Suspense fallback、終了瞬間のHTML一貫性を設計する必要がある
- 適合: 終了時刻の厳密性を最優先し、request-timeコストを受け入れる場合

### Option B — 終了日時の自動build / redeploy

共通設定をbuild時に評価し、開始・終了日時にCIスケジュールからbuild／deployする。

- 利点: 現在の静的shellとキャッシュ特性を維持し、全ページで同じHTMLを配信できる
- 留意: スケジュール、CI、deployのいずれかが失敗すると季節導線が残る
- 留意: 失敗監視と手動リトライ手順が必須
- 適合: 静的配信・性能・単純な運用を優先する場合

### Option C — Hybrid（推奨）

Option Bを正規の切替手段とし、同じ `endsAt` を読む小さなclient/runtime判定で期限後の季節導線を非表示にする。

- 予定build／deployでHTML、SEO、通常導線を正式に戻す
- deploy失敗時もruntime hard stopでPC／スマホヘッダーとトップCTAを隠す
- hard stop用コンポーネントはlayout shiftを起こさない領域設計にする
- client判定は安全弁であり、通常導線の正式復帰と検索向けHTML更新はscheduled deployで行う
- 監視は終了deploy成功、正規ドメインのHeader/CTA非表示、`/events/summer` 自体の到達性を確認する

Research推奨はOption C。終了時刻の瞬間からSSR HTMLにも季節文言を一切残せないことが必須なら、Option Aを選び、Headerだけの動的境界による性能影響をDフェーズで計測する。

## 12. 公開前の再確認条件

一次情報は2026-07-14時点のResearch結果であり、採用GO後も以下をRelease gateとする。

1. 公開直前7日以内に主役候補の開催日、時刻、中止、会場、料金、予約要否を再確認する
2. 7/18〜7/25の直近催事は、実装着手時点ですでに終了していればHeroと掲載目標から外し、終了記録へ移す
3. 荒天中止・延期の更新を公式個別ページで確認し、SNSだけで判定しない
4. 非連続開催日は `occurrence_dates` を個別に確定する
5. 新規41件のうち街路・河川敷・複数会場は `facility_id=null` とし、実会場名を確定する
6. 主役比率70%以上、夜のおでかけ20%以下を最終データで再集計する

## 13. Owner adoption gate

次の5点を次回Owner判定対象とする。

1. 主役43件、既存補助14件、計57件の採用案
2. LIVE 16件の確定再分類案（15採用、1対象外）
3. Hero・トップ優先12件
4. 最小データ設計と影響範囲
5. 季節導線の終了日時案とHybrid方式

Owner採用GOまでは、次を継続HOLDする。

- `data/events_data.json` の変更
- 型、visibility、EventCard、JSON検証の変更
- `/events/summer` の実装
- トップ、PC／スマホヘッダーの変更
- commitのmain反映、Production deploy
- hot memory、所有権、release branch、Phase C
- D / H / N / Qフェーズへの移行

Ownerが採用GOを出すまで、Trackは **OPEN / RESEARCH COMPLETE / IMPLEMENTATION HOLD** とする。
