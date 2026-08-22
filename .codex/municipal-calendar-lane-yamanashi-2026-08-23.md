# 自治体公式・公式観光カレンダーレーン 山梨県試行 evidence

- 確認日: 2026-08-23（JST）
- 対象季節: 2026年夏（6〜8月）
- 対象母集団: 山梨県公式「山梨県内市町村イベント情報」に掲載された全27市町村
- データ基準: `data/events_data.json` 1,651件 / `data/summer_events_2026.json` 484件
- 読取時blob: `events_data.json` = `97a0d84c0e87d154ae46a73071c5ed2cfe3744fd`、`summer_events_2026.json` = `629ac12f800760aa0f603b472a9f3371829f09d6`
- 目的: 発見レーンが「第67回笛吹川県下納涼花火大会」を候補として surface できるかを検証する。全件終了済みのため本番データへの追加は行わない。

## 走査面

1. [山梨県内市町村イベント情報](https://www.pref.yamanashi.jp/shichoson/ibennto_jyouhou.html)で全27市町村と公式・観光協会導線を母集団化した。
2. [富士の国やまなし観光ネット イベントカレンダー](https://www.yamanashi-kankou.jp/search/event.php?d=21&m=07&mode=event&y=2026)と[花火大会／火祭りカレンダー](https://www.yamanashi-kankou.jp/special/fireworks.html)をサイト内カレンダー面として走査した。
3. 各市町村の公式ドメインに対して `site:{公式ドメイン} 2026 (花火 OR 夏祭り OR 納涼 OR 盆踊り OR 灯籠流し)` をWeb検索し、候補0件の自治体も同じ検索で再確認した。別表記の `灯ろう流し`、`火祭り`、`大文字焼`、`縁日`、`山開き` と、`親子 OR 子ども OR キッズ OR ファミリー` も確認した。
4. 検索結果は対象年の自治体・公式観光・観光協会ページを開いて確認した。個別ページが取得不能、対象年・開催日・子ども適合が不足するものは候補へ昇格させず、HOLD観測として残した。

## 市区町村カバレッジ

| 区分 | 市区町村 | 結果 |
|---|---|---|
| 未収録候補あり | 山梨市(2)、大月市(1)、北杜市(2)、笛吹市(2)、上野原市(1)、甲州市(1)、中央市(1)、早川町(1)、身延町(5)、西桂町(1)、富士河口湖町(3) | 候補20件を下表へ記録 |
| 既存一致のみ | 甲府市、富士吉田市、韮崎市、南アルプス市、市川三郷町、南部町、道志村、忍野村、山中湖村 | 既存イベントと突合し新規候補化しない |
| 追加検索後も候補昇格0 | 都留市、甲斐市、富士川町、昭和町、鳴沢村、小菅村、丹波山村 | 公式ドメインWeb検索を追加実施。対象期間外、対象年不明、個別開催情報不足、または子ども適合不明のhitはHOLD観測へ |

母集団27市町村 = 候補あり11 + 既存一致のみ9 + 候補昇格0が7。未走査自治体0。

## 未収録候補

重複ゲートは両JSONに対して id、正規化URL、タイトル＋会場＋開催日で実施した。試行用candidate keyはすべて既存idと不一致、下表の公式URL（共通一覧を含む20 URL）は既存 `official_url` / `source_urls` 2,117正規化URLと一致0、タイトル一致も20件すべて0だった。会場・開催日を加えた一致も0。全件が確認日時点で終了済みのため、`REJECT_ENDED / next-season watch` とし、2026年本番データには追加しない。

| # | 市区町村 | surface した候補（2026年日付・会場） | 確認した公式URL | 結果 |
|---:|---|---|---|---|
| 1 | 山梨市 | **第67回笛吹川県下納涼花火大会**（7/25、笛吹川・万力大橋付近） | [山梨市公式個別](https://www.city.yamanashi.yamanashi.jp/soshiki/17/19482.html) / [県公式観光カレンダー](https://www.yamanashi-kankou.jp/special/fireworks.html) | **surface確認**。終了済み。来季は対象年・開催状態・子ども適合を再確認 |
| 2 | 山梨市 | Yamanashi City 夏をどり Festival（7/25、旧山梨市役所前通り） | [山梨市公式個別](https://www.city.yamanashi.yamanashi.jp/soshiki/16/1769.html) | 終了済み。花火大会との内包／別イベント判定を来季再確認 |
| 3 | 大月市 | 第43回かがり火市民祭り（8/1、大月東小学校校庭・市道大月西本通り線） | [大月市公式イベント情報](https://www.city.otsuki.yamanashi.jp/kanko/ibentojoho.html) | 終了済み。対象年齢等は来季個別確認 |
| 4 | 北杜市 | 第26回 北杜市明野ふるさと納涼まつり（8/14、明野中学校校庭） | [北杜市公式個別](https://www.city.hokuto.yamanashi.jp/docs/34998.html) | 終了済み。子どもから大人までと公式記載 |
| 5 | 北杜市 | 第14回北杜市大泉ふるさと夏祭り（2026年夏） | [北杜市公式個別](https://www.city.hokuto.yamanashi.jp/docs/34884.html) | 終了済み。確認時404のため、来季は取得可能な個別一次情報が出るまでHOLD |
| 6 | 笛吹市 | 石和温泉鵜飼花火（7/20〜8/16の指定日、笛吹市役所前笛吹川河川敷） | [ふえふき観光ナビ公式](https://www.fuefuki-kanko.jp/scontents/summerfes/1011/index.html) / [県公式観光個別](https://www.yamanashi-kankou.jp/fuefuki/event/isawa_ukaihanabi.html) | 終了済み。複数開催日を来季再確認 |
| 7 | 笛吹市 | 甲斐いちのみや大文字焼き（8/16、いちのみや桃の里ふれあい文化館周辺） | [ふえふき観光ナビ公式](https://www.fuefuki-kanko.jp/detail/23/index.html) | 終了済み。子ども適合等は来季個別確認 |
| 8 | 上野原市 | うえのはら盆踊り（8/15、上野原市文化ホール） | [上野原市公式個別](https://www.city.uenohara.yamanashi.jp/site/shiminkatsudo/1021060.html) | 終了済み。盆太鼓体験・子ども向け企画を確認 |
| 9 | 甲州市 | 大菩薩夏休みファミリートレッキング（7/30、上日川峠〜大菩薩峠） | [山梨県公式市町村イベント情報](https://www.pref.yamanashi.jp/shichoson/ibennto_jyouhou.html) / [甲州市公式観光の季節一覧](https://www.koshu-kankou.jp/soshiki/1/seasons.html) | 終了済み。小学生を含むファミリー対象を確認 |
| 10 | 中央市 | 盆ぼん夏まつり（2026年夏） | [中央市公式案内PDF](https://www.city.chuo.yamanashi.jp/material/files/group/31/2026_07_kairan_04.pdf) / [掲載元](https://www.city.chuo.yamanashi.jp/soshiki/seisaku/hisho/kohochuo/kouhou2026/14776.html) | 終了済み。個別必須情報は来季再確認 |
| 11 | 早川町 | 雨畑湖上祭（8/15、ヴィラ雨畑グラウンド） | [早川町公式個別](https://www.town.hayakawa.yamanashi.jp/tour/event/amehata.html) | 終了済み。対象年齢等は来季個別確認 |
| 12 | 身延町 | 下部温泉郷「宿花火2026」（8/10、下部温泉郷リバーサイドパーク） | [身延町公式 夏まつり一覧](https://www.town.minobu.lg.jp/page/10704.html) | 終了済み。個別必須情報は来季再確認 |
| 13 | 身延町 | 西嶋2026BON祭りin道の駅にしじま（8/14、道の駅にしじま和紙の里かみすきパーク） | [身延町公式 夏まつり一覧](https://www.town.minobu.lg.jp/page/10704.html) | 終了済み。盆踊り・縁日・花火を確認 |
| 14 | 身延町 | 飯富 日朝堂祭典（8/14、日朝堂広場） | [身延町公式 夏まつり一覧](https://www.town.minobu.lg.jp/page/10704.html) | 終了済み。対象年齢等は来季個別確認 |
| 15 | 身延町 | 愛宕祭典煙火大会（8/16、下山新町区内） | [身延町公式 夏まつり一覧](https://www.town.minobu.lg.jp/page/10704.html) / [県公式観光カレンダー](https://www.yamanashi-kankou.jp/special/fireworks.html) | 終了済み。対象年齢等は来季個別確認 |
| 16 | 身延町 | 峡南の夏まつり（8/22、富士川クラフトパーク） | [身延町公式 夏まつり一覧](https://www.town.minobu.lg.jp/page/10704.html) / [身延町公式カレンダー](https://www.town.minobu.lg.jp/calendar/) | 終了済み。水鉄砲・盆踊りを確認 |
| 17 | 西桂町 | 三つ峠ふるさと夏まつり2026（8/15、西桂中学校グラウンド） | [西桂町公式開催告知](https://www.town.nishikatsura.yamanashi.jp/coopnotification/923) / [県公式観光カレンダー](https://www.yamanashi-kankou.jp/special/fireworks.html) | 終了済み。ヨーヨー釣り・花火を確認 |
| 18 | 富士河口湖町 | 富士山・河口湖山開きまつり花火大会（7/4、河口湖） | [富士河口湖町観光連盟公式](https://fujisan.ne.jp/feature/804/) / [県公式観光カレンダー](https://www.yamanashi-kankou.jp/special/fireworks.html) | 終了済み。個別必須情報は来季再確認 |
| 19 | 富士河口湖町 | 奥河口湖ふるさとまつり（8/15、長浜地区） | [富士河口湖町公式2026観光ガイドPDF](https://www.town.fujikawaguchiko.lg.jp/upload/file/Coco_/COCO_2026.pdf) / [県公式観光カレンダー](https://www.yamanashi-kankou.jp/special/fireworks.html) | 終了済み。対象年齢等は来季個別確認 |
| 20 | 富士河口湖町 | 富士河口湖灯籠流し（8/16、河口湖畔） | [富士河口湖町公式2026観光ガイドPDF](https://www.town.fujikawaguchiko.lg.jp/upload/file/Coco_/COCO_2026.pdf) | 終了済み。個別必須情報は来季再確認 |

## 既存一致として除外できた例

- `武田陣没将士供養会＆武田の里にらさき花火大会2026` → `evt-tier1-yamanashi-202608-02`
- `第9回 水源の郷道志「清流の花火大会」` → `evt-yamanashi-202608-01`
- 富士五湖4大会、神明の花火、石和温泉花火、忍野八海祭り、南部の火祭り、吉田の火祭り、小江戸甲府の夏祭り等も既存タイトル／URL／日付で一致したため、新規候補化していない。

## HOLD観測（候補件数には含めない）

- 甲斐市の `万才東 納涼会` / `名取区 納涼祭` は市公式マスコット活動予定では確認できたが、主催者の個別開催ページ、対象、開催状態の確認が不足。
- 昭和町の検索hitは対象年を公式個別ページで確定できず、2026候補にしない。
- 鳴沢村の `フェスタなるさわ2026` は運営業務の公募だけが surface し、開催日・会場・子ども適合が未確定。
- 都留市の八朔祭、富士河口湖町の秋イベント等は試行対象の6〜8月外。小菅村・丹波山村は対象年の夏候補を公式ページで確認できなかった。

## 結論

`笛吹川県下納涼花火大会` は、県公式観光の花火カレンダーから名称・日付・自治体が surface し、山梨市公式個別ページで2026年の日時・会場・開催状態まで確認できた。したがって本レーンは今回の coverage gap を塞ぐ。ただし2026年7月25日に終了済みのため、両データJSONには追加せず、他19件とともに次季の先行走査対象として残す。
