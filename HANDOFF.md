# trip-guide.net プロジェクト 引継ぎメモ

このメモは、Claude(チャット相棒)に状況を引き継ぐためのものです。
新しいセッションで「このメモを読んで状況を把握してください」と最初に伝えれば、続きから相談できます。

## ⏩ 2026-06-26 最新状態(ここが最新・最優先で読む)

**全国展開フェーズ進行中**。直近の主題=人気観光地ラインの施設追加＋イベント取得(正本フロー=`.codex/new-prefecture-rollout-checklist.md`・詳細は永続メモリ `project_national_rollout_flow` / `project_events_system_direction` が自動ロード)。

**到達状況**:
- 関東1都6県=**茨城・群馬とも完成**(施設＋イベント両方)。
- **大阪Phase1=本番LIVE**(12都府県目・施設80件 facility-1312〜1391・registry980・地域表記は「全国12都府県」へ恒久移行)。
- **/events/osaka=本番LIVE完了(2026-06-23・origin/main=`a7d011c`・8県目のイベント対象県・25件/18施設)**。Codex本番Playwright=GO(掲載中25・フィルタ6種・ハブ大阪カード・施設イベント節・既存県退行なし・console/pageerror 0)。USJは見送り(自前集客が強い)。クラフトパーク1387除外・鶴見緑地1356見送り。正本=`.codex/event-candidates-osaka-2026-06-23.md`。
- **大阪Phase2(施設+52件)=本番LIVE完了(2026-06-23・origin/main=`1eb818f`)**。大阪80→**132**・total1381→**1433**・registry980→**1032**(新規ID 1392〜1443の52件)。採用案正本=`.codex/osaka-phase2-review.md`(主力10厚く＋他42最低限・registry同梱・**コード波及なし=データ+registry+sitemapのみ**)。PM裏取り全PASS=既存80大阪/他11県の施設が意味的に無変更・events_data不変・registry既存980行無変更・新カテゴリ0・audit大阪high/medium0(新52件はlow1=短文のみ)・bbox外0・必須欠落0/slug重複0・lint/build PASS・sitemap新52ページ掲載(URL集合は再生成と完全一致)。**本番検証GO**(PM curl + Codex本番Playwright PC1280/SP375突合): served=1eb818f・/prefecture/osaka「132選」施設リンク132・/map大阪マーカー132/全体1428施設(=1433−exclude5)・新規3施設200本文正常・tokyo191/ibaraki100/gunma145/yamanashi69 退行なし・console/pageerror 0。

- **兵庫(hyogo)Phase1=本番LIVE完了(2026-06-24・origin/main=`9c9c68d`・13都府県目)**。施設**75件**(新規ID 1444〜1518・主力10=神戸どうぶつ王国/須磨シーワールド/王子動物園/六甲GREENIA/キッザニア甲子園/姫路セントラルパーク/明石公園/東条湖おもちゃ王国/城崎マリンワールド/淡路イングランドの丘)・total1433→**1508**・registry1032→**1107**。候補240→PM4分類(`.codex/hyogo-stepB-review.md`:採用75/次回74/保留88/不採用3)→実装スペック`.codex/hyogo-facilities-phase1-spec.md`。**新県コード波及**(PrefectureId/icons+原画webp/MapView/descriptions/audit bbox・geocode重心/「12→13都府県」7ファイル/sitemap)。events_data不変・**/events/hyogo は未公開(後続)**。PM裏取りで2点修正(①category表示ラベル49件を正規名へ統一 ②牧場系4件=六甲山牧場/ヨーデルの森/但馬牧場公園/イングランドの丘を park→zoo に整合=マザー牧場precedent)。全ゲートGREEN(既存12都府県/既存施設不変・events不変・registry既存1032不変・新カテゴリ0・兵庫audit high/medium0・bbox外0・lint/tsc/build)。**本番検証GO**(PM curl+Codex Playwright PC/SP突合): /prefecture/hyogo「75選」リンク75・/map兵庫マーカー75/全体1503(=1508−exclude5)・/category/動物園にイングランドの丘+六甲山牧場・既存退行なし(osaka132/tokyo191)・全国13都府県・console/pageerror 0。

- **/events/hyogo イベント公開=本番LIVE完了(2026-06-24・origin/main=`54d213e`・9県目のイベント対象県)**。巡回38件→候補抽出(`.codex/event-candidates-hyogo-2026-06-24.md`:採用29/保留2/不採用17施設)→PMレビュー+オーナー全採用GO→正規化(events_data 92→**121**件)+配線4点(EventPrefecture+hyogo / metadata.prefectures / ハブtitle・description「・兵庫」 / next-sitemap + sitemap-0.xml再生成)。**コード波及なし**(facilities_data/registry 不変)。PM裏取り全GREEN(可視29・既存8県deep-equal不変・タグ統制20語・title整理[1450星空ウォッチング/1498ビーバーお誕生日会]・status scheduled25/ongoing4)→push→**Codex本番Playwright GO**(/events/hyogo掲載中29 PC1280/SP375・フィルタ[兵庫29/今週末41/今月43/屋内69/無料19/予約不要45/好き科学30]・既存osaka25/gunma12退行なし・施設節1461=2件/1495=3件/1444=非表示・console/pageerror 全0)。保留=手塚治虫記念館(マクロスΔ展=大人寄り)/明石海峡公園サマーフェスタ(日付・詳細弱い→夏前再確認)。

- **兵庫Phase2 施設拡張=本番LIVE完了(2026-06-24・origin/main=`d8eefaa`・兵庫=施設123+イベント29で一次完成)**。採用案50(`.codex/hyogo-phase2-review.md`・PM選定:エリア偏り是正で北播磨丹波/但馬/西播磨を厚く・乗り物テーマ強化・水遊びは管理3施設のみ・砂浜海水浴/潮干狩りは保留Phase3)→Codex本データ化で**48件採用**(facility-1519〜1566・公式確認で2件除外=スカイランドHARADA[公式住所が大阪府豊中市]/柳田國男記念館[既存1499辻川山公園と同住所重複])。兵庫75→**123**・total1508→**1556**・registry1107→**1155**。**コード波及なし**(データ+registry+sitemap)。PM裏取り全GREEN(既存75兵庫+12都府県deep-equal不変・新カテゴリ0・牧場系=zoo・公式URL/住所/座標/bbox全件・**兵庫audit issue総数0**・施設↔registry名称一致)。**PM裏取りで名称defect検出→修正**: facility-1537初版「たんようウェルネスパーク」をWebFetchで公式確認(kakogawawellness.jp=「加古川ウェルネスパーク」正式名称・「たんよう」愛称併記)→オーナー指示で正式名先頭「加古川ウェルネスパーク（たんよう）」に統一(name-only・3コミット a2353b4→701eaa7→d8eefaa)。**Codex本番Playwright GO**(/map兵庫123・全体1551[=1556−exclude5]・既存osaka132/tokyo191/gunma145/ibaraki100退行なし・/prefecture/hyogo123選PC/SP・1537正式名先頭表示・console/pageerror 全10ページ0)。

- **大阪Phase2追加52施設のイベント再巡回=本番LIVE完了(2026-06-25・origin/main=`687166f`・commit「Add Osaka Phase2 events (18) to /events/osaka」)**。registry巡回対象43件(monthly20/seasonal23・not_suitable9除外。母数はPMが`.codex/_phase2_osaka_patrol_worklist.json`へ機械抽出)→Codex読み取り専用巡回→候補doc`.codex/event-candidates-osaka-phase2-2026-06-25.md`(採用22/保留1/不採用28施設)→PMレビュー+オーナーGOで**18件採用/13施設**。**除外4件=会期が長すぎ実質常設のものをfreshness観点で落とす**(今城塚 勾玉づくり182日/hu+gMUSEUM XR体験302日/クレヨンしんちゃんキッチン207日/樽井サザンビーチ ミャクミャク像=撮影スポット参加性弱)+SUP保留1。events_data 121→**139**(osaka可視25→**43**)・**配線不要**(/events/osaka既存)・facilities/registry/コード diff0・既存121件deep-equal不変。PM裏取り全GREEN(統制20語0逸脱・source_checked_at未来日0・第三者URL0・id重複0・終了済み0)→push(`5edd8f9..687166f`クリーンFF)→Codex本番Playwright **GO**(PC1280/SP375: /events/osaka掲載中43・全リンク別タブ・施設節1437=1/1405=2/1428=2・ハブ大阪43/今週末3[竹水鉄砲6/28含む]/フィルタ件数変化・既存hyogo29/gunma12/ibaraki31/osaka132選 退行なし・console/pageerror 0。デプロイ反映~73秒)。**大阪=施設132+イベント43で完全クローズ**。

- **京都(kyoto)Phase1=本番LIVE完了(2026-06-25・origin/main=`ed25984`・14都府県目)**。候補180(`.codex/kyoto-candidates-full-2026-06-25.md`・Codex 10STEP・全市町村0件なし)→PM4分類(`.codex/kyoto-phase1-review.md`:採用61/次回~38/保留~15/不採用~66)→実装スペック(`.codex/kyoto-facilities-phase1-spec.md`)→Codex本データ化で**72件確定**(基準61+保留再確認で11追加・けいはんなプラザ1件は公式URL/住所/運営が揃わず除外・新規ID **1567〜1638**)。total1556→**1628**・registry1155→**1227**。**寺社偏り回避**(寺社44候補→Phase1は公園/自然/乗り物兼用の約6件のみ・金閣寺/清水寺/平等院等の拝観中心弱価値は不採用で台帳温存)。主力10=京都水族館/京都鉄道博物館/京都市動物園/梅小路公園/宝が池子どもの楽園/太秦映画村/青少年科学センター/嵯峨野トロッコ/丹波自然運動公園/天橋立ビューランド。**親子重複ルール(オーナー新指示)**=同一敷地の分解要素は独立価値ある場合のみ別施設化・内部要素は親things_to_doに吸収(すざくゆめ広場/SLスチーム号/宝が池親/太陽が丘プール/ローラースライダー/丹波こどもの広場/緑化植物園=親に吸収・福知山動物園/児童科学館=独立)。**新県コード波及**(hyogo §4同型: PrefectureId/icons[原画kyoto.png→webp・絵文字⛩️・色#b91c1c]/MapView/descriptions/geocode重心/audit bbox/「13→14都府県」7ファイル/sitemap)。events_data不変・**/events/kyoto未公開(後続)**。お茶の京都DMO URL2件(竜王こどもの王国→ryuoh-kodomo.com・大正池→taishoike.com)を施設自前URLへ差替。PM裏取り全GREEN(既存13都府県count不変・既存施設deep-equal・events diff0・registry既存1155不変・新カテゴリ0・モンキーパーク/綾部ふれあい牧場=zoo・京都audit high/medium0・bbox外0・slug重複0・PM自身でtsc/lint PASS再実行)→push(`f131128..ed25984`クリーンFF)→**Codex本番Playwright GO**(PC1280/SP375: /prefecture/kyoto「72選」72カード・/map京都72/全体1623[=1628−exclude5]・主力詳細・/category/zooにモンキーパーク+綾部ふれあい牧場+両動物園・既存osaka132/hyogo123/tokyo191退行なし・全国14都府県・events京都404・console/pageerror0・横スクロールなし)。

- **/events/kyoto イベント公開=本番LIVE完了(2026-06-25・origin/main=`32eb170`・10県目のイベント対象県)**。registry巡回70件(weekly5/monthly43/seasonal21/manual_hard1)→Codex読み取り巡回→候補doc`.codex/event-candidates-kyoto-2026-06-25.md`(採用35/保留4/不採用49施設・寺社ガード効=二条城/御苑/石清水/長岡天満宮/天橋立/植物園ライトアップ全て不採用)→PMトリム3件(京エコロジー タイ体験[受付6/26締切]/ダンボール迷路[7/1終了]/宇治植物公園 園長と散歩[子ども訴求弱])→オーナーGOで**32件採用/18施設**。1592太陽が丘プールは1件限定再確認も2026料金未確定で不採用(32維持)。1597ロケットend_date=仮8/31→確定7/29補正。events_data139→**171**(kyoto可視32・scheduled31/ongoing1)+**配線4点**(EventPrefecture+kyoto / metadata.prefectures+kyoto / app/events/page.tsxハブtitle・desc「京都」/ next-sitemap+/events/kyoto)+sitemap再生成。PM裏取り全GREEN(既存139件deep-equal不変・facilities/registry diff0・統制20語0逸脱・未来日0・第三者URL0・PM自身でtsc/lint PASS)→push(`d03c2ff..32eb170`クリーンFF)→**Codex本番Playwright GO**(/events/kyoto掲載中32 PC/SP・公式リンク別タブ・ハブ京都32絞り込み・既存osaka43/hyogo29/gunma12/ibaraki31退行なし・console/pageerror0・横スクロールなし・TZ罠回避)。**★検証教訓=施設ページのイベント節は設計上最大3件**(getVisibleEventsByFacility limit=3)→施設1602/1637(各4件)が施設ページ3件表示で一旦誤NO-GO・実際はハブに4件目も出てGO。今後の検証依頼は施設ページ期待=min(実数,3)。**京都=施設72+イベント32で施設・イベント両用に到達**。

- **京都Phase2 施設拡張=本番LIVE完了(2026-06-25・origin/main=`ae7f27a`・京都=施設100+イベント32で一次完成)**。採用案`.codex/kyoto-phase2-review.md`(+28基準・全件公式URL確認済・寺社4件のみ[糺の森/伏見稲荷/美山かやぶき/福知山城]・地方部補強・要確認17は保留)→Codex本データ化で**+28確定**(★安全ゲート未充足で160天橋立海水浴/174本庄浜海水浴を除外・保留から33船岡山公園/113勝竜寺城公園を公式確認で補充・173泊海水浴/122保津川下り/114サントリー工場は公式安全条件確認済)。新規ID **1639〜1666**・京都72→**100**・total1628→**1656**・registry1227→**1255**。**コード波及なし**(データ+registry+sitemapの3面のみ・大阪/兵庫Phase2同型)。親子重複=1647ボウケンノモリ太陽が丘(既存1592太陽が丘と別運営)/1649石清水八幡宮参道ケーブル(=男山ケーブル公式名・既存1599と別)を独立採用。PM裏取り全GREEN(既存京都72+14都府県deep-equal不変・events_data不変・registry既存1227不変・新カテゴリ0・京都audit high/medium0・bbox外0・slug重複0)→push(`68eed78..ae7f27a`・**★環境DNS不調でpush4回失敗→バックグラウンド再試行18回目で成功**。git/Playwright両方が一時的にgithub.com/trip-guide.net解決不能=環境起因。Codexは--host-resolver-rulesで回避)→**Codex本番Playwright GO**(PC/SP: /prefecture/kyoto100選・施設カード100・/map京都100/全体1651[=1656−exclude5]・主力詳細[福知山城/傘松/京都国立博物館/岡崎公園]・退行なし[/events/kyoto32・osaka132/hyogo123/tokyo191/全国14都府県]・console/pageerror0・横スクロールなし)。**京都=施設100+イベント32で一次完成**(大阪132・兵庫123に次ぐ3番目規模)。

- **愛知(aichi)Phase1=本番LIVE完了(2026-06-26・origin/main=`b6f1e3c`・15都府県目・人気観光地ライン最後)**。候補186(`.codex/aichi-candidates-full-2026-06-25.md`・Codex 10STEP・全68市区町村0件なし・大物29/29・県境除外=なばなの里/ナガシマ/鈴鹿[三重]・アクアトトぎふ/河川環境楽園[岐阜]・浜名湖系[静岡])→PM4分類(`.codex/aichi-stepB-review.md`:採用75/次回~67/保留~38/不採用~6)→実装スペック(`.codex/aichi-facilities-phase1-spec.md`)→Codex本データ化**75件**(新規ID 1667〜1741)・total1656→**1731**・registry1255→**1330**。主力10=名古屋港水族館/東山動植物園/レゴランド/リニア鉄道館/名古屋市科学館/トヨタ産業技術記念館/ジブリパーク(+モリコロ)/のんほいパーク/南知多ビーチランド/博物館明治村。ものづくり体験を最重点(10件)。コード波及7面(色#16a34a/絵文字🏮/原画aichi.png→透過webp/audit bbox 34.55-35.45・136.65-137.85/geocode重心35.18,136.91/「14→15都府県」7ファイル)。**親子吸収**=戸田川緑地→とだがわこどもランド・フラワープラザ→名古屋城(独立施設化せず)。**ジブリパーク(1704)本文に「完全予約制・有料・モリコロと別運営/別チケット」明記**(オーナー指示・別施設だが親子導線はセット説明)。events_data不変・**/events/aichi未公開(後続)**。**+おまけ修正=施設一覧の県プルダウン`PREFECTURES`に京都府も追加**(京都Phase1以降の既存漏れをCodexが一緒に補修。このプルダウンはJP県名ハードコードで新県ごと手当て要)。PM裏取り全GREEN(既存14都府県count不変・既存施設1656 deep-equal・events diff0・registry既存1255不変・新カテゴリ0[牧場系=zoo]・愛知audit high/medium0[id突合]・bbox外0・slug重複0・統制20語逸脱0・PM自身でtsc/lint PASS)→push(`b657942..b6f1e3c`クリーンFF・DNS問題なし)→**Codex本番Playwright + PM curl 両方GO**(/prefecture/aichi75選/75カード/75マーカー・/map愛知75/全体**1726**[=生1731−exclude5]・主力詳細[1667/1671/1704/1719/1731]・ジブリ予約制本文・/category/zooに愛知牧場/delaふぁーむ/サンテパルク/モンキーセンター・既存osaka132/hyogo123/kyoto100/tokyo191/gunma145/ibaraki100退行なし・全国15都府県・events/aichi404・console/pageerror0・横スクロールなし)。**愛知=施設75で公開・人気観光地ライン4県完(大阪132/兵庫123/京都100/愛知75)**。

- **/events/aichi イベント公開=本番LIVE完了(2026-06-26・origin/main=`2a50c13`・11県目のイベント対象県)**。registry巡回75施設(weekly11/biweekly17/monthly25/seasonal22・母数はPMが`_aichi_events_patrol_worklist.json`へ機械抽出)→Codex読み取り巡回→候補doc`.codex/event-candidates-aichi-2026-06-26.md`→PMレビュー(4トリム=1734赤塚山招待制/1680東谷山サマースクール・カブトムシ/1688 138タワー親子自然工作)→オーナーGO「46で確定」で**採用46件/31施設**。events_data 171→**217**(aichi可視46)+配線4点(EventPrefecture+aichi/metadata.prefectures+aichi/ハブtitle・desc「…京都・愛知」/next-sitemap+/events/aichi)+sitemap再生成。**facilities_data/registry不変**(events-onlyバッチ)。PM裏取り全GREEN(既存171件deep-equal・facilities/registry diff0・46件 facility_id実在/prefecture/official_url/status/日付/source_checked_at=2026-06-26/タグ統制・終了済み0・`getVisibleEventsByPrefecture('aichi')=46`・tsc/lint PASS)→push(`350731e..2a50c13`クリーンFF)→**Codex本番Playwright+PM curl両GO**(掲載中46 PC/SP・TZ罠なし・フィルタ[県216→46/今週末8/今月8/屋内17/無料10/予約不要24/好きテーマ4]・ハブ愛知カード・デンパーク1725=施設3件/ハブ4件・既存osaka43/hyogo29/kyoto32/gunma12/ibaraki31退行なし・console/pageerror0・横スクロールなし)。**★教訓=候補docはサマリ件数でなく『採用候補テーブルの実行数』と『最終events_data投入数』を機械照合**(愛知でサマリ「50採用」だが実55行→Codexが4トリム+独自5間引きで46に到達。落ちた5件[1689プラネ×2/1700馬ごはん/1707 SUMMER SPLASH重複/1726ゲーム]は妥当・オーナー判断で46確定)。**愛知=施設75+イベント46で施設・イベント両用に到達。人気観光地ライン4県(大阪・兵庫・京都・愛知)が施設もイベントも完了**。

- **愛知Phase2 施設拡張=本番LIVE完了(2026-06-26・origin/main=`e32a992`・愛知=施設125+イベント46で施設バッチ一次完成)**。オーナー方針=大阪132/兵庫123のpeerに揃える(愛知は人気ライン中で大阪に次ぐ規模)→**+50で総計125**。採用案`.codex/aichi-phase2-review.md`(母数=次回採用候補67/保留38から地方部・海/川を厚く50選定・名古屋13に抑制[既存21]・知多+6/西三河+5/東三河+9/海川+8・寺社1[知立神社]/商業モール1[mozo]のみ・SEA LIFE Nagoya/ディノアドベンチャーは別運営で独立採用)。**保留15=差し替え候補(上乗せ禁止・125大きく超えるなら別GO)**だったが**差し替えなし・採用50がそのまま全採用・保留15未使用**。Codex本データ化で新規ID **1742〜1791**・愛知75→**125**・total1731→**1781**・registry1330→**1380**。**コード波及なし**(Phase1で県コード対応済=データ+registry+sitemapの3面のみ)。dispatch=`.codex/_dispatch_aichi_phase2.txt`。PM独立裏取り32項目全PASS(既存75愛知+15都府県deep-equal不変・events_data217不変[コミット対象外]・registry既存1330行deep-equal・新カテゴリ0・タグ統制内・rain単一・座標bbox内・必須欠落0・**audit愛知high/medium/low/info全0**[issue詳細を愛知IDで突合・独立実行]・sitemap+50/-0・コード無変更ゆえtsc/lint不変・build成果=sitemap再生成で確証)。座標近接の唯一検知1671名古屋市科学館↔1743名古屋市美術館は**白川公園内co-location**(約48m・別カテゴリ・別公式URL)で正当。push(`58f3dcd..e32a992`クリーンFF・DNS問題なし)→**PM curl + Codex本番Playwright両GO**(/prefecture/aichi125選PC/SP・カード125・SP375横はみ出しなし[scrollWidth=clientWidth=375]・/map愛知125/total**1776**[=生1781−exclude5の罠回避]・愛知フィルタ動作・新規詳細4件[1745 SEA LIFE Nagoya/1765常滑やきもの散歩道/1784日間賀島/1750ディノアドベンチャー]本文/カテゴリ/地図正常・**1784日間賀島に遊泳期間7/1-8/31・監視救護・海況確認の安全注記**・console/pageerror0×PC/SP・osaka132/kyoto100/tokyo191/gunma145/hyogo123/events-aichi46退行なし)。**愛知=施設125+イベント46で施設バッチ一次完成**(大阪132・兵庫123に次ぐ規模)。

- **愛知Phase2追加50施設(ID1742〜1791)のイベント再巡回=本番LIVE完了(2026-06-26・origin/main=`24146e0`・愛知=施設125+イベント55で完全クローズ)**。registry巡回対象**42件**(weekly1/biweekly6/monthly11/seasonal24・PMが`.codex/_aichi_phase2_patrol_worklist.json`へ機械抽出・not_suitable4+no_event_source4除外)→Codex読み取り専用巡回→候補doc`.codex/event-candidates-aichi-phase2-2026-06-26.md`(Codex採用13/保留1/不採用31施設)→**PMレビューで3降格**→オーナーGO「9件で確定」で**採用9件/8施設**(1743名古屋市美術館/1745 SEA LIFE いきもの工房/1747 mozo つなぐの森ハリプー/1755大野極楽寺×2[ザリガニ・昆虫]/1760小牧山城親子講座/1764新美南吉ごんぎつね/1770ちびっこプラネタリウム/1782白谷海水浴場[安全注記付])。**PM降格3件**=①**1781ココナッツビーチ伊良湖×2を不採用**(facility-1781「伊良湖岬・恋路ヶ浜」のsignatureが『遊泳は公式海水浴場の期間と監視条件を確認して別管理にする』=別ビーチ。データに伊良湖海水浴場の独立施設なし→別施設イベント混入NG)②**1786花ひろばひまわり見頃(6/13-12/31)を不採用**(6.5ヶ月会期=実質常設・施設側扱い・大阪Phase2前例)③**1776ジオスペース館を保留**(official_urlが市広報PDF・料金予約未確認→施設公式で再裏取れたら後続小バッチ)。events_data 217→**226**(aichi可視46→**55**)・**配線不要**(events-onlyバッチ・facilities/registry/コード diff0)・既存217件deep-equal不変。dispatch=`.codex/_dispatch_aichi_phase2_events_impl.txt`(実装)/`_dispatch_aichi_phase2_events_prodverify.txt`(検証)。**実装/検証を2ディスパッチに分離**(原子commit→push と LIVE限定Playwrightを別タスク化=report-hang予防)。PM独立データ検証全GREEN(既存217 deep-equal[0変更0削除]・タグ逸脱0・終了済み0・id重複0・不採用/保留の混入0・他10県±0・件数照合=Codex採用13→PMトリム→投入9)→push(`ed17cbd..24146e0`クリーンFF)→**Codex本番Playwright+PM curl両GO**(/events/aichi掲載中**55**・追加9/9表示・施設節1755=2/1745=1/1782=1・ハブ愛知カード掲載中55/登録125・既存osaka43/kyoto32/hyogo29/ibaraki31/gunma12退行なし・console/pageerror PC1280+SP375=0・dev server不使用)。**★教訓(非自明・恒久)=海岸/岬/島など『エリア名・ランドマーク名』の施設にイベントを紐づける時は、イベントの実会場が施設の実体定義(住所・signature)と一致するか必ず確認**(1781は施設自身が遊泳を別管理と明記=別ビーチのイベントは紐づけ不可。`feedback_address_verification`の施設紐づけ版)。**愛知=施設125+イベント55で完全クローズ。人気観光地ライン4県(大阪132+43/兵庫123+29/京都100+32/愛知125+55)すべて施設+イベント完全クローズ**。

- **兵庫/京都Phase2追加分のイベント再巡回=本番LIVE完了(2026-06-26・origin/main=`89e6f2a`・人気観光地ライン4県を真の完全クローズへ)**。背景=大阪/愛知は「Phase2施設拡張の後」にイベント再巡回まで済んでいたが、**兵庫/京都は「イベント取得がPhase2拡張より前」だったためPhase2追加施設(兵庫1519〜1566/京都1639〜1666)が一度も巡回されていなかった**(=PMがこのギャップを発見し、オーナー選択(b)で着手)。PMが registry から巡回対象を機械抽出(兵庫34=monthly19/seasonal15・京都27=monthly13/seasonal14・計61・weekly/biweekly無し)→`.codex/_hyogo_phase2_patrol_worklist.json`/`_kyoto_phase2_patrol_worklist.json`→Codex読み取り専用巡回→候補doc`.codex/event-candidates-hyogo-kyoto-phase2-2026-06-26.md`(兵庫採用18/京都採用6=計24・件数3点突合をPM自前カウントで一致確認)→PMレビューで全24基準クリア(統制20タグ逸脱0/終了済み0/施設3件上限超過0/会場一致=京都1648友愛の丘[実会場が別施設]をCodexが正しく除外)→オーナーGO「全24」→Codex実装(ブランチ`hyogo-kyoto-phase2-events`・`data/events_data.json`単独)→**PMデータ裏取り全GREEN**(既存226件deep-equal 削除0変更0・新24=hyogo18/kyoto6・total_events 226→**250**・hyogo29→47/kyoto32→38・タグ逸脱0/終了済み0/id重複0/公式URL不備0/他県不変)→PMがpush(events`89e6f2a`)→**Codex本番Playwright+PM curl両GO**(/events/hyogo掲載中**47**・/events/kyoto掲載中**38**・施設節1546=3/1644=2・既存osaka43/aichi55/gunma12/ibaraki31退行なし・console/pageerror0・横スクロールなし・PC1280/SP375)。dispatch=`.codex/_dispatch_hyogo_kyoto_phase2_events.txt`(巡回)/`_dispatch_hyogo_kyoto_phase2_events_impl.txt`(実装)/`_dispatch_hyogo_kyoto_cta_prodverify.txt`(本番検証)。**★恒久ルール=県を「完全クローズ」と呼ぶ前にPhase2追加分のイベント再巡回まで済んでいるか確認する(「イベント→Phase2」の順で進んだ県はPhase2追加分が未巡回のまま残る。標準フローはこの順なのでPhase2の後に毎回この再巡回を1タスク挟むのが正)**。

- **トップページに `/events` 導線追加=本番LIVE完了(2026-06-26・origin/main=`d5a29e5`・`app/page.tsx` 1ファイル+34行)**。施設検索・地図が主役のまま、イベントをサブ導線として追加。①ヒーローにサブCTA「🎪 季節のイベントを見る」(2大ボタン[遊び場を探す/メモリップでできること]より一段軽いゴーストチップ)②「テーマで探す」直後にスリムな中段カード「季節・週末のイベントから探す」(本文「公式情報をもとに、親子向けの日付確定イベントを掲載しています。週末や夏休みのおでかけ先選びにどうぞ。」)。両方とも→`/events`。**データ/registry/型は不変**。lint/tsc/build PASS・PC1280/SP375横スクロールなし・console0・既存トップ導線の退行なし(両者GO)。CTA文言は短く汎用(エバーグリーン)・「週末・夏休み」は中段カード本文のみで補足(オーナー確定)。events/CTAは別ブランチ別コミットに分離し events→CTA の順でpush(CTAは2本目=origin/mainにrebaseしてからpush)。

- **福岡(fukuoka)Phase1=本番LIVE完了(2026-06-26・origin/main=`626df00`・16都府県目・九州初)**。人気観光地ライン後の新県第一弾(オーナー方針=北海道/沖縄より先に中規模人気県)。候補208(`.codex/fukuoka-candidates-full-2026-06-26.md`・Codex 10STEP・全72単位[福岡市7区+北九州市7区+58市町村]0件なし・大物全収録・県境/閉園除外)→PM4分類+Phase1採用75案(`.codex/fukuoka-phase1-review.md`)→**オーナーが実装前に75リスト+高リスク抜粋[工場見学/海川/県境閉園/親子重複]を確認(差し替えなし)**→Codex本データ化75件(新規ID1792〜1866)・total1781→**1856**・registry1380→**1455**(福岡75)・prefectures15→**16**。主力10=マリンワールド海の中道/海の中道海浜公園/福岡市動植物園/福岡市科学館/のこのしまアイランドパーク/到津の森公園/響灘緑地グリーンパーク/北九州市立いのちのたび博物館/九州国立博物館/大牟田市動物園。コード波及7面(metadata.prefectures/PrefectureId型/lib/icons[原画`.codex/prefecture_aicon/fukuoka.png`→`public/images/prefectures/fukuoka.webp`・絵文字🍜・色#7c3aed=既存と重複なし]/MapView/descriptions/geocode重心+audit bbox/「15→16都府県」7ファイル+`app/facilities/page.tsx`PREFECTURESプルダウン+sitemap)。**強条件適用=海/川/工場見学は公式の安全/開設期間/子ども参加条件が取れねば不採用**: `199 日産自動車九州`は一般工場見学一時休止で**次回送り→同じ苅田町の`苅田町歴史資料館`で補充(75維持・京都Phase2の補充と同型)**。海3件(海の中道/ももち/芦屋)+源じいの森/あまぎ水の文化村/五ケ山クロスに安全注記。**PM独立裏取り全GREEN**(既存15都府県・既存施設`id<=1791`deep-equal不変・`events_data`250不変・既存registry1380不変・新カテゴリ0・**audit福岡high/medium0=全75を直接判定[invalid_address/prefecture_id/coordinates/missing_experience/short_desc/url/category全0]・グローバル総issue2077不変=福岡寄与0**・bbox外0・slug/name/座標重複0・sitemap+75/-0)→push(`cbb24d0..626df00`クリーンFF)→**Codex本番Playwright+PM curl両GO**(/prefecture/fukuoka75選/カード75/マーカー75・新規施設1792〜200・/map福岡75/全体**1851**[=raw1856−exclude_candidate5の罠回避]・トップ「全国16都府県」・/facilities福岡県プルダウン・**/events/fukuoka=404未公開維持**・既存tokyo191/osaka132/aichi125/hyogo123/kyoto100退行なし・events osaka43/aichi55…不変・console/pageerror0・横スクロールなし・PC1280/SP375)。dispatch=`.codex/_dispatch_fukuoka_10step.txt`(収集)/`_dispatch_fukuoka_phase1.txt`(実装)/`_dispatch_fukuoka_phase1_prodverify.txt`(検証)。**★学び=新県本データ化で強条件(工場見学の子ども参加可否・受付状況/海川の安全)該当施設は公式で取れねば落として次回採用候補から同エリア・同テーマで補充し件数維持。実装前にオーナーへ採用リスト+高リスク抜粋を提示するとreject往復を防げる**。**福岡=施設75で公開。次=STEP8 福岡イベント取得+`/events/fukuoka`配線(標準フロー継続)**。

**本番 HEAD = origin/main = `626df00`**(福岡Phase1施設+75・16都府県目。直下=`d5a29e5` トップ/events導線CTA→`89e6f2a` 兵庫/京都Phase2イベント+24)。**人気観光地ライン4県(大阪132+43/兵庫123+47/京都100+38/愛知125+55)完全クローズ + 福岡Phase1施設75公開(イベント未取得・次STEP8)**。

**将来タスク(温存・オーナー確定 2026-06-25)**: MapViewの地図マーカー色重複2組(#a855f7・#0ea5e9)+絵文字🌊重複は**既存県どうしの問題(京都由来でない)**。今は触らず「地図視認性改善タスク」として残す。

**次の一手**:
1. ✅ 大阪Phase2・兵庫Phase1 push→本番検証=完了(GO)。
2. ✅ **兵庫のイベント取得+`/events/hyogo`配線=完了(2026-06-24・29件/19施設・`54d213e`)**。
3. ✅ **兵庫Phase2施設拡張=完了(2026-06-24・+48→兵庫123・`d8eefaa`)**。
4. ✅ **大阪Phase2追加52施設(ID1392〜1443)のイベント再巡回=完了(2026-06-25・採用18→大阪イベント43・`687166f`)**。
5. ✅ **京都(kyoto)Phase1=完了(2026-06-25・候補180→採用72・新規ID1567〜1638・`ed25984`・14都府県目)**。詳細は上記「京都Phase1」節。
6. ✅ **京都イベント `/events/kyoto`=完了(2026-06-25・採用32/18施設・10県目・`32eb170`)**。詳細は上記「/events/kyoto」節。
7. ✅ **京都Phase2施設拡張=完了(2026-06-25・+28→京都100・`ae7f27a`)。京都=施設100+イベント32で一次完成**。詳細は上記「京都Phase2」節。
8. ✅ **愛知(aichi)Phase1=完了(2026-06-26・候補186→採用75・新規ID1667〜1741・`b6f1e3c`・15都府県目)。愛知=施設75で公開**。詳細は上記「愛知Phase1」節。
9. ✅ **愛知イベント `/events/aichi`=完了(2026-06-26・採用46件/31施設・11県目・`2a50c13`)。愛知=施設75+イベント46で両用到達**。詳細は上記「/events/aichi」節。
10. ✅ **愛知Phase2施設拡張=完了(2026-06-26・+50→愛知125・`e32a992`)。愛知=施設125+イベント46で施設バッチ一次完成**。詳細は上記「愛知Phase2」節。
11. ✅ **愛知Phase2追加50施設のイベント再巡回=完了(2026-06-26・採用9→愛知イベント55・`24146e0`)。愛知=施設125+イベント55で完全クローズ=人気観光地ライン4県すべて施設+イベント完全クローズ**。詳細は上記「愛知Phase2追加50施設のイベント再巡回」節。
12.5 ✅ **兵庫/京都Phase2追加分のイベント再巡回=完了(2026-06-26・採用24[兵庫18→hyogo47/京都6→kyoto38]・`89e6f2a`)**。上記(b)を実施。**人気観光地ライン4県すべてPhase2施設のイベント再巡回まで含めて真の完全クローズ**。詳細は上記「兵庫/京都Phase2追加分のイベント再巡回」節。
12.6 ✅ **トップページに `/events` 導線追加=完了(2026-06-26・`d5a29e5`・ヒーローサブCTA+中段カード・app/page.tsxのみ)**。詳細は上記「トップページに `/events` 導線追加」節。
13. **▶次=新たな主題/県をオーナーと相談**。人気観光地ライン(大阪/兵庫/京都/愛知)が施設もイベントもPhase2再巡回まで完全クローズ。候補=(a)新県へ展開(北海道/沖縄は面積・季節・離島で重い「大型県」=後ろ。他の中規模県を先に)・(c)別主題=年間おでかけレポート無料ミニ版の仕様化(長期北極星`project_product_north_star`)。((b)既存県取りこぼしイベント再巡回は今回兵庫/京都で消化済)。保留=愛知1776ジオスペース館・1779竹島潮干狩りは施設公式で再裏取れたら後続小バッチ候補。**着手は次のオーナーGO待ち**。
12. **★再発防止(イベント候補doc照合・恒久)**: 候補docはサマリ件数を信じず、**採用候補テーブルの実行数 と 最終events_data投入数 を機械照合**する(愛知eventsでサマリ「50採用」だが実テーブル55行→件数基数がズレた)。PM裏取りで「候補表の実行数=承認件数+トリム=最終投入数」が一致するか必ず確認。

**運用の要点(永続メモリに詳細)**:
- 役割=実装/調査Codex・レビュー/裏取り/GO判定/push PM(`feedback_role_split`)。実装はGO後・1件ずつ承認しない。
- 本番pushはオーナー明示GO後。preview/裏取り→GO→PMがpush。docとコード/データのpushは分ける(`project_vercel_autodeploy`: main pushでVercel自動デプロイ・webhook取りこぼし時は空コミット再push)。
- ★map検証の罠: /mapの件数は可視(生total−exclude_candidate)。検証の期待値を生totalにすると誤NO-GO(大阪で実例。現exclude_candidate=5件=山梨2/長野3)。
- Codexワーカー運用・report-hang対処=`project_codex_worker_ops`。新規施設→registryゲート=`feedback_new_facility_registry_gate`。worker Running中はPMが共有作業コピーでgit操作しない。
- **新ハマり(2026-06-24)**: Codex自動アップデートで稼働中ワーカーがキャッシュした codex.exe パスが陳腐化し全タスク起動失敗(`...codex.exe is not recognized`)→**ワーカークリーン再起動で復旧**(新インスタンスが最新bin hashを再検出)。失敗タスクは失敗時に既読化されるので**再送が必要**。詳細=`project_codex_worker_ops`。
- **新県コード波及の正本**=`project_new_prefecture_code_surfaces`。データ駆動の要点: 県一覧は `facilities_data.json` の `metadata.prefectures`(これで /prefecture 静的生成+top「全国N都府県」が動的更新)。`category` 表示ラベルは `metadata.categories` の正規名に必ず合わせる(独自表記NG=兵庫で49件修正の教訓)。牧場/ファーム系は既存precedent=`zoo`。

---

## ⏩ 2026-06-19 セッション後半(以下は過去ログ)

**本番 HEAD = origin/main = `cbe534b`**。線形・履歴破壊なし: …`e99c205` → `d96fe80`(docs) → `4e6c510`(docs: HANDOFF) → `e3adfbb`(feat: Events Step2) → `2635c6d`(雨の日 code) → `cbe534b`(雨の日 data)。

**1) ✅ データ衛生ミニバッチ=本番リリース済み**(`8b79898`+`e99c205`・下の「施設データ衛生」節に詳細)。id801/485 旧URL(404)→公式へ差替・id488 長期休館注記・EventCard PDF表記。本番7観点PASS。**重要教訓(メモリ`feedback_address_verification`追記済)**: 404 URLの差替先は「200が返る」だけで採用せず施設名/運営者まで実体確認(id485で`seibuen-yuuenchi.jp`=消費者金融の詐称ドメインを回避・正=`seibuen-amusement-park.jp`)。

**2) ✅ Events Step2(施設ページのイベント表示)= 本番リリース完了(2026-06-19)= `e3adfbb`**
- 正本仕様: `.codex/events-step2-facility-display-spec.md`。配置=「どんな子に合いそう？」の後・写真ギャラリー前。カード=コンパクト(日付/イベント名/summary2行/🎯recommended_for_label/公式リンクのみ・PDFは「公式PDFを見る」)。0件施設は非表示・最大3件。施設名リンク/県/確認日/タグ群は出さない。
- 実装4ファイル: `lib/events.ts`(getVisibleEventsByFacility)・`components/FacilityEvents.tsx`(新規)・`app/facilities/[slug]/page.tsx`(挿入)・`components/EventCard.tsx`(isPdfOfficialUrl共有化)。**commitは4ファイル限定**(.codex/未追跡の混入なし)。
- スクショ(オーナー見た目GO済み): `.codex/screenshots/agmsg-1884-step2-preview/`。本番裏取りPASS: facility-471=「公式PDFを見る」/813=「公式で詳細を見る」/001=節非表示。lint/build PASS・Vercel READY。
- イベント紐づき8施設: 245/247/471/519/675/684/781/813(各1件)。

**3) ✅ 雨の日ページ rain_friendly 一本化 = 本番リリース完了(2026-06-19)= `2635c6d`(code)+ `cbe534b`(data)**
- 正本仕様: `.codex/rainy-day-tag-consolidation-spec.md`。掲載判定を `tags`文字列「雨の日OK」→ **`rain_friendly==="◎"`** に切替・**△は載せない**・「雨の日OK」タグ完全引退。TAG_METAにページ定義は残し`getTagFacilities`+`match: f=>f.rain_friendly==="◎"`を正本。詳細/カードの雨バッジは`rain_friendly`で不変。
- **Commit A=コード6ファイル**(lib/tags.ts に match?+getTagFacilities / tag page metadata+本体を getTagFacilities 経由 / FilterSidebar・MobileFilterBar から「雨の日OK」option削除 / トップ件数 countByFacilityTag→rain◎ / 県page `?tags=雨の日OK`→`?rain=◎` / long文言)。types/facility.ts は不変(最小差分)。lib/filter.ts 旧URL互換シムは省略(内部リンクを ?rain=◎ に直したため不要)。
- **Commit B=データ**: facilities_data.json の tags から「雨の日OK」除去(**144施設ちょうど**)。意味的deep-diff=タグ以外の変更0・他施設0・件数1056不変。
- 本番裏取り全PASS: **/tag/rainy-day=511選/511施設**(142→正常化)・**HUGHUG(facility-241)掲載**(元バグ解消)・三島スカイウォーク等△/×は0件非掲載・/facilities フィルタ二重解消(「雨天対応◎/△/×」のみ・footer動線は維持)・トップカード件数511。raw◎513−exclude_candidate◎2件(id135/id146)=visible511。

**ワーカー(教訓・最重要)**: 本セッションで msg `1884`(Step2 preview)が「Running のまま Processed 出ない凍結」に。真因=**preview撮影用 Next dev サーバ(port3024)＋孤児codexが `& codex` の出力ファイルハンドルを保持**しワーカーが永久ブロック(report hang ではない)。復旧=1884既読化→handle保持者だけスコープkill→クリーン全再起動(新PID36920)。**作業ツリーの未コミット変更はプロセスkillでは消えない**。教訓は永続メモリ`project_codex_worker_ops`に詳細記録。**現ワーカー=PID36920(健全・1本)**。デプロイ系の完了裏取りは worker ログでなく origin/main前進＋本番curl(SSGは数十秒の伝播ラグあり・再curlで反映)。

---

## 🆕 新セッション即時引き継ぎ(2026-06-19・最重要・ここを最初に読む)

**本番 HEAD = origin/main = `f53281e`**(線形: …24c8022 → `c789278`(feat: events hub) → `10131bf`(fix: sitemap config) → `f53281e`(Update generated sitemap))。履歴破壊なし・facilities_data.json 無変更。

**✅ イベント仕組み化 Step1 = 本番リリース完了(2026-06-19)**:
- `/events` を「県カードだけの入口」→ **イベントハブ**へ格上げ。構成: Hero → 県カード → 全アクティブイベント一覧(開催日順) → フィルタ(都道府県/今週末/今月/屋内/無料/予約不要/**好き**=recommended_for_tags)。`/events/[県]`(tokyo/kanagawa/chiba/saitama)は共通 `EventCard` で県別表示。h1=「子どもと行けるイベントを、エリアや"好き"から探す」。
- データ: `data/events_data.json`(公式一次情報のみ・4県×2=8件)。各イベントに `recommended_for_tags`(既存 `RecommendedForTag` 語彙に統一＋`space`新規追加=星/宇宙)/`recommended_for_label`/`recommended_for_note`(非断定「〜に合いそう」)/`is_free`/`is_indoor`/`reservation`。`isVisibleEvent` の**5条件フィルタ不変**(終了/鮮度切れ30日/official_url無/施設未紐づき/draft・cancelled 非表示)。
- 正本仕様: `.codex/events-step1-spec.md` + `.codex/events-step1-hub-spec.md`。実装はCodex・PM裏取り全PASS(本番直接grep: /events+4県200・他県404・sitemapに/events+4県・公式リンク別タブ8・施設リンク8・console0)。
- 任意の後磨き(未対応): 鉄道博物館の公式リンクがPDF → カードで「公式PDF」表記(必須でない)。

**★今回の重要教訓(永続メモリ化済み)**:
- **`project_sitemap_committed_static`**: `public/sitemap-0.xml` はコミット済み静的ファイルを本番が配信。新ページをsitemapに載せるには `npm run build` で再生成 → **public/sitemap-0.xml を commit 必須**(next-sitemap.config.js の設定変更だけ/CDN purge/`vercel --prod --force` では本番に出ない)。squashで再生成sitemapが脱落して/eventsが出ず、`f53281e`で解決。
- **Codexワーカー**: deploy系タスク(commit+push+vercel)で**報告ステップのハングが頻発**。実装・push・vercel自体は成功し報告だけ固まる→**報告を待たずPMが git/本番で直接裏取り**。復旧手順は `codex-worker-ops`。

**⚠️ HANDOFF.md は今セッション中に巻き戻った(2026-06-16〜06-18 の詳細が消失)**:
- 原因=Codexがデプロイ用にツリーをクリーン化した際、**未コミットだった docs(HANDOFF.md / MEMORIPS_AI_ROLES.md / RESEARCH_METHODOLOGY.md)の編集が破棄**された。コード/本番は無影響。
- **直近の戦略コンテキストは永続メモリに健在**(自動ロード): `project_friday_release_plan`(金曜リリース→継続育成へ転換)/`project_top_guide_roles`(トップ=探す入口・/guide=価値LP、round2本番反映`cb484ab`)/`project_events_system_direction`/`feedback_*`各種。直近コミットは `git log --oneline` 参照(featured6=`6d40e61`/`24c8022`、/guide後半軽量化=`11fc4bd`、/facilities画像400修正=`f836c5d`、top/guide round2=`cb484ab`)。
- **教訓**: 重要な docs 編集は早めに commit する(Codexのデプロイ前ツリークリーンで未コミット doc が飛ぶ)。

**✅ 施設データ衛生ミニバッチ + イベントPDF表記 = 本番リリース完了(2026-06-19)**:
- 本番 HEAD=`e99c205`(`8b79898` fix: refresh facility URLs and add closure note (id801/id485/id488) → `e99c205` feat: label PDF official links on event cards)。線形・履歴破壊なし(親=…f53281e→0a69adf→8b79898→e99c205)。facilities件数1056不変・変更は id485/488/801 の3施設のみ。
- id801 ソレイユの丘: 旧url `seibu-la.co.jp/soleil-park/`(404)→ 公式 `soleil-park.jp`。id485 西武園ゆうえんち: 旧url `seibu-leisure.co.jp/amusementpark/`(404)→ 公式 `seibuen-amusement-park.jp`(**★差替候補 `seibuen-yuuenchi.jp` は消費者金融の詐称ドメインで不採用=URL補完禁止ルールが効いた事例**)。id488 所沢航空発祥記念館: description末尾に「※2025/9/1〜2027/3末(予定)リニューアル工事のため長期休館中」注記(url不変・掲載継続・閉館表現なし)。各 provenance(source_urls/source_checked_at/source_notes)整備。
- EventCard: `official_url` がPDF(?/#除去→.pdf)のとき右上ボタンを「公式PDFを見る」表記(データ駆動・非PDFは「公式で詳細を見る」維持)。鉄道博物館イベント evt-471 で適用。
- PM裏取り全PASS: 構造diff(変更=id485/488/801のみ・件数不変)・lint/build PASS・本番7観点(各リンク先URL差替・詐称ドメイン不在・休館注記・PDF表記・他イベント通常表記維持)。正本仕様 `.codex/facility-url-hygiene-spec.md`。
- 任意(別バッチ判断): id675 アンデルセン公園「TripAdvisor日本1位」は年・出典欠落の断定(2015年実績)→今回スコープ外。後続で年・出典付与か表現緩和を判断。
- 教訓(メモリ `feedback_address_verification` 追記済み): 404URLの差替先は「200が返る」だけで採用せず施設名/所在地/運営者まで実体確認する(類似ドメインに別運営の詐称サイトが居る)。

**🔜 次の一手**: **Events Step2(施設ページへのイベント表示)**=オーナー次の本命。並行で残る継続運用の仕組み化(週次 水取得/木裏取り/金 県別X投稿/土日 反応確認)・トップ掲載・X告知。設計=`.codex/events-system-design-spec.md`。

---

## 🔄 新セッション即時引き継ぎ(2026-06-15 時点・最重要)

**進行中タスク: なし(Codexワーカーはアイドル・lockのPIDが生きていれば再利用/死んでいれば必要時のみ再起動)**。直近の依頼はすべて本番反映・PM検証・**オーナー実機確認済み**。下記「待ち行列」に仕様確定済みの未着手あり(#5写真からおでかけ記録ほか)。

**2026-06-15 完了: Memorips記録まわりの不具合つぶし(enum＋写真)を実機確認まで完走**。①enum不整合(`2651f41`)=新規/編集で駐車場・食事が日本語表示＋保存OK(オーナー実機確認済み)。②`visits_parking_check`違反=migration008が本番DB適用済みをSQL(`pg_get_constraintdef`に`car_easy`含有)で確認・フォーム送信値は全て008の許可集合内→再発なし。③写真がスマホで「WebP変換に対応していません」エラー=WebP非対応ブラウザでJPEGフォールバック対応(`7904df0`＋migration009)・オーナー実機で写真添付保存OK確認済み。

**新セッション開始手順(教訓 メモリ `codex-worker-ops`)**: ①agmsg monitor起動(SessionStart hookどおり) ②Codexワーカー(memorips)死活確認=lockのPIDを`Get-Process`・ログ末尾。**ハングなら kill→lock削除→pwsh(PS7)で再起動**。再起動前に未処理(read_at IS NULL)の自分→codexメッセージを sqlite3 で既読化し再実行を防ぐ ③現セッション以外のmonitor(watch.sh)はkill(pidfile信用せず実プロセスのCommandLineで判定・パスは`/c/...`形式) ④agmsg履歴(`scripts/history.sh memorips`)でセッション切替の隙に届いたCodex報告の取りこぼし確認。**`send.sh`本文にbacktick禁止**(bashがコマンド置換し黙って欠落)＋PowerShellパス展開でも本文破損し得る(2026-06-14に本文破損→Codexが自己再送で復旧)。正本: `Ftomohiro0612/ai-agent-control-center` の `docs/agmsg-cross-agent-workflow.md`。

**2026-06-15 にデプロイ済み(最新セッション)**:
- **写真アップロードをWebP非対応ブラウザでJPEGフォールバック対応** = `7904df0`(`app/mypage/visits/VisitPhotoUploader.tsx`＋`supabase/migrations/009`)。スマホのアプリ内ブラウザ等で `canvas.toBlob('image/webp')` がWebPを返さず(PNGに化ける)、旧コードが「このブラウザではWebP変換に対応していません。」を投げて写真添付が失敗していた。修正: WebP優先・本体/サムネのどちらかでもWebP生成不可なら**両方JPEGに揃えて**再エンコード(`encodeCanvas`が`blob.type!==mimeType`でnull→フォールバック)、`storage_path`/`thumb_path`の拡張子と`contentType`を実フォーマット連動(`.webp`/`.jpg`)。canvas再エンコードでJPEGでもEXIF/GPS除去は維持。表示側([visits/[id]/page.tsx])はDBの`storage_path`を署名URL化で拡張子ハードコードなし→JPEG保存も表示OK。DB前提: Storageバケット`visit-photos`の`allowed_mime_types`が`image/webp`のみ(006)→**009で`image/webp`+`image/jpeg`に拡張をオーナーがSupabase SQL Editorで適用済み**。テーブルCHECKはパス先頭のみ検査で拡張子不問。PM独立検証: コードレビュー(フォールバック判定・表示側に.webpハードコード無し)・tsc/lint/build PASS・本番リダイレクト/overlay/console 0。**オーナー実機確認済み(スマホで写真添付保存OK)**。

**2026-06-14 にデプロイ済み**:
- **おでかけ記録のenum不整合修正＋編集フォーム施設サジェスト＋DB制約008** = `2651f41`(`lib/visit-labels.ts`新規＋`app/mypage/visits`配下5ファイル＋`supabase/migrations/008`)。編集フォームが旧enum(parking=easy/difficult系・food=great系)のまま放置→詳細で英語生値(difficult/great)漏れ。編集フォームを新enum(parking=car_easy/.../walk_bike・food=no_meal/...)に統一・詳細/履歴は新enum=日本語/旧値=レガシー読み替え/未知=「未記録」で英語生値ゼロ化・編集フォームに `/api/facilities/search` 施設サジェスト追加(御勅使南公園など施設リンク貼り直し可)。DB前提: visits.parking/food_ratingのCHECK制約(003)が旧値のみ→新フォーム保存失敗の問題があり、008(新値＋旧値＋NULL許可のスーパーセットCHECK)をオーナーがSupabase SQL Editorで適用済み。PM独立検証: tsc/build/lint PASS・本番で`/mypage/visits/new`・`/edit`が`/auth/login`へ正常リダイレクト＋`/api/facilities/search?q=御勅使`が御勅使南公園(id195)返却・Next overlay/console 0。**オーナー実機確認済み(新規作成・既存編集で駐車場/食事が日本語表示＋保存OK)**。また`visits_parking_check`違反は008適用確認で再発なし(上記2026-06-15サマリ参照)。
- **共有文に楽しめそうなこと(things_to_do最大5件)追加＋先頭行=都道府県｜施設名** = `3b4dc17`(ShareButtons.tsx＋facilities/[slug]/page.tsx)。X/LINE/OSシェアの共有文を「{都道府県}｜{施設名}」＋「楽しめそうなこと：」＋things最大5件＋ブランド行「メモリップ | 子どもの“好き”が見える、おでかけ記録サービス」＋URL(別枠)に。空ならブロック省略・都道府県なしは施設名単独・新規生成なし・車時間なし。LINE/OS最大5、Xは本文250字超で3件化＋末尾…。先頭行は当初「{施設名}、子どもと行きたい。」だったがオーナー指示で「{都道府県}｜{施設名}」へ変更(感情代弁を避ける)。PM独立検証: tsc PASS・コードでブランド行/フォールバック/X抑制確認。
- **地図のズーム/表示位置保持を全フィルタ地図へ拡張** = `3af7892`(カテゴリ/タグ/県/施設一覧の MapViewClient に一意 storageKey を付与=`category:${id}`/`tag:${slug}`/`prefecture:${id}`/施設一覧は searchParams 署名 `facilities:rt=...`。MapView.tsx/MapViewClient.tsx は無改修)。トップ/mapと同様に往復でズーム保持・復元時fitBounds抑止。本番6観点PASS(category/tag/prefecture/facilities往復復元・playground↔water_play独立・トップ/map非破壊)。/category/animal は無効id(animalはrecommended_tag・カテゴリは zoo)。PM独立検証: tsc/build PASS・コードでsignatureにrecommended_tag含むことを確認。
- **山梨軽量サブバッチ** = `5658298d`(URL差替9件[id198/197/195/194/176/159/141/116/132]＋water_play追加3件[id193/118/117]＋provenance整備)。旧独自ドメイン7件がDNS解決不可(ENOTFOUND)→公式/自治体公式の施設個別ページへ差替・全9件200。water_playはrecommended_for_tagsへの追加のみ(category/summer_water_play不変)。**id145ガラス工房りゅうは要調査で分離・不変**。PM独立検証(URL4件スポット=verga.info[べるが]/wellnesspark.jp/midaiminamikoen.com/fkchannel facility-05 すべて施設名+山梨一致)＋本番facility-198で公式リンク=verga.info確認。差分=12件+provenanceのみ・id145/metadata不変・audit/往復diff/lint/tsc/build全PASS・クリーンworktreeでデプロイ。
  - **後続マイクロ修正候補(未対応)**: ①id118さかな公園=water_play追加済だが summer_water_play が×のまま(別途○/◎へ揃える) ②id193万力公園=water_play根拠ページ(yamanashi-fruitpark.co.jp)のHTTPS証明書期限切れ(施設本体URLには影響なし)
  - git状態: origin/main=`5658298d`。ローカルmainは docs commit `6c03cce`(.codex/*.md・未push)を上にrebase済みで線形・クリーン。

**2026-06-14 にデプロイ済み(前セッション)**:
- 山梨データ品質**第2弾(判断系9件)** = `4f29834`(カテゴリ3[id156/129/111]・タグ4[id165/161/148/147]・id135杜の8を非表示[ttdをid134へ移植]・id149バギー軸・metadata categories count再計算)
- **id149 鮮度修正** = `573471b` + `ca54576`(things_to_do以外の description/USP/signature/料金からも休止中の二輪系を除去・source_notes追記)
- **地図機能(現在地表示＋表示状態保持)** = `abf3e83`(トップ/mapで sessionStorage に center/zoom/フィルタ保存・往復復元・FitBounds抑止)
- **トップ固定キュレーション＋地図UX強化** = `37d2520`(`FEATURED_FACILITY_IDS=[801,675,245,782,518,136]`・見出し「子どもの"好き"が見つかるおすすめ施設」・現在地ボタンを全地図化＋説明文「「📍 現在地」を押すと、現在地を表示できます。」・ポップアップに🚗車目安[直線距離概算・レンジ＋目安]＋できそうなこと[ttd最大3])
- **現在地マーカーのセッション保持＋詳細ページ表示順入替** = `b13ee4e`(現在地を `mapview:currentLocation` で往復後も保持・復元時は地図を動かさない/詳細ページを「この施設で楽しめそうなこと→どんな子に合いそう？」の順に)

**重要な訂正(2026-06-14)**: 写真アップロードは**本番公開済み**(`PHOTO_UPLOAD_ENABLED=true`・`f074a4d` 2026-06-12)。旧文書の「未公開」は誤り。詳細は本ファイル「写真機能の現状」。写真→日付/GPSでおでかけ履歴ドラフト自動作成は**将来候補**(本ファイル「将来候補(Phase 4.x〜5)」)。

新セッションでまずやること:
1. agmsg monitor を起動(SessionStart hook どおり)。Codexワーカー(memorips)の死活確認(lock PID `Get-Process`・ログ末尾)。**ワーカーがハングしたら kill→lock削除→pwsh(PS7)で再起動**。再起動前に未処理(read_at IS NULL)の自分→codexメッセージを sqlite3 で read_at セットし再実行を防ぐ(教訓: メモリ `codex-worker-ops`)。**send.sh の本文に backtick を入れない**(bashがコマンド置換し黙って欠落)。
2. 下記の待ち行列から着手。

**待ち行列(オーナー確定の順)**:
- ~~山梨軽量サブバッチ~~ = **2026-06-14 デプロイ済み `5658298d`**(上記)。
- ~~地図のズーム/表示位置保持を全フィルタ地図へ拡張~~ = **2026-06-14 デプロイ済み `3af7892`**(上記)。
- ~~共有文に things_to_do 最大5件追加~~ = **2026-06-14 デプロイ済み `3b4dc17`**(上記。先頭行は最終的に「{都道府県}｜{施設名}」)。
- **(プラン作成済・着手前)写真からおでかけ記録を作る**(.codex/photo-to-visit-draft-spec.md): 専用画面新設(/mypage/visits/from-photo)・GPSで近い施設最大3件提案・まず1枚→1記録。EXIF撮影日(既存)＋GPS(新規・一時読み取り)→haversine近接3件→記録プリフィル。プライバシー: GPSは端末内で提案のみ・送信/保存/ログ禁止・使ったら破棄、保存画像はcanvas再エンコードでEXIF/GPS除去(既存)。新規核=EXIF GPS IFDパーサ＋近接3件＋プリフィル受け渡し。オーナーにプラン提示済・OK待ち。
- **(進行中)id123 富士見ふれあいの森公園 単独データ更新**(.codex/facility-123-update-plan.md をCodexが作成→PMレビュー→実装): 所在地は市川三郷町岩間3965へ修正済み。公式/自治体で現行情報確認しURL/provenance/description/category/recommended_for_tags/things_to_do を精度向上。料金/駐車場/トイレ/遊具/水遊び/ベビーカー等は公式確認できるものだけ。新規創作禁止・他施設不可・差分はid123+provenanceのみ。プラン先出し→PMレビュー→実装→デプロイ(PMレビュー後すぐ)。
- **id145 ガラス工房りゅう 要調査**(公式不明・分離済み): 公式URL判明すれば url/provenance を確定。判明しなければ needs_web_check 据置。
- **NHR C群裁定**(id51 + id163 Trick Art Museum): 公式確認不可なら raw残置のまま `exclude_candidate` 非表示。
- 神奈川監査(山梨の型・住所精度ルール適用) → 神奈川修正 → 第6バッチ things_to_do。
- 後続マイクロ修正候補: id118 summer_water_play 揃え / id193 根拠ページ証明書(任意)。

**未コミットのローカル変更**: コード(地図/詳細)は `b13ee4e` で commit 済み・クリーン。ただし `data/facilities_data.json` と `.codex/*` 監査レポートに作業前からの未コミット差分が残ることあり(audit再生成分・本番デプロイには未関与)。

---

**最終更新**: 2026-06-14 / **2026-06-14デプロイ(5件)**: 山梨第2弾`4f29834`・id149鮮度`573471b`/`ca54576`・地図機能`abf3e83`・トップキュレーション/地図UX`37d2520`・現在地保持/詳細順入替`b13ee4e`(詳細は冒頭「即時引き継ぎ」) / 本番=**第5バッチ＋exclude非表示化＋山梨P0第1弾デプロイ済み**(**公開対象1,026施設 / raw1,030維持**・**things_to_do 228施設**=パイロット5+静岡25+長野50+山梨49+東京99[第4:50+第5:49]・A群所在地修正+exclude・住所修正12件・県count長野74/山梨71・1,030施設) / 第5バッチ単独デプロイ: **80da5f6**(things_to_do 第5バッチ東京49件・skip id305ボーネルンド系1件・id269/311/313は埋め草除去で3項目化・差分はthings_to_doキーのみ49件・audit/往復SHA256同一/build/lint/スクショ全PASS・Vercel Ready・本番facility-265で実表示確認済み) / 2026-06-13午前デプロイ3コミット: 4c7c93dd(A群: 住所修正4+県移管id114山梨→長野+exclude4[id146岩手移転・id167/168/172群馬所在])・577ee54(第4バッチ東京50件200項目)・b78c850(同名混同3件差し替え[id26石人の星公園に改名・id29熱海側・id123市川三郷町]+B群番地ズレ9件) / **確定原則: 県・住所・座標は実所在県を正、観光圏でprefectureを曲げない**(.codex/nhr-group-a-decision-memo.md) / things_to_do次=**第6バッチ(東京残り or 関東他県、50件単位)**・東京未適用は残り約65件・教訓: batch-3水増し定型に加え batch-4-5 で「仕様に字数下限を書くと詰め物(じっくり50件)が発生」「施設名プレフィックス禁止」「同一ブランド類似チェック(3項目以上同義NG)」「大型公園の『広い園内を歩く』系埋め草を固有要素へ/根拠なければ3項目に減らす」をチェックリスト反映済み / NHR残: C群2(id51/163実体不明)+D群3(id32/83/132名称・カテゴリ) / 運営者=合同会社アルゴリズム・mail@memorips.com / キャラ=案1確定(SVG未) / **exclude_candidate 4件 非表示化=本番反映済み(411d7c1・公開UIのみvisibleFacilities/raw1030維持/total表示1026/直アクセス404/検索API個別除外/sitemap1026/マイページFB・案Bライブ算出・本番4件404確認済み)** / **県別データ品質監査レーン(.codex/data-quality-audit-spec.md): ①山梨監査=完了(指摘36件 P0=12/P1=20/P2=4・findings:.codex/data-quality-yamanashi-findings.json)→②山梨P0第1弾=本番反映済み(36bc2cb・住所7件公式+再ジオコード/id110休園/id105ド・ドドンパ削除)→残: 山梨P1重点レビュー・山梨第2弾(id135杜の8=id134へttd移植後に非表示候補/id149=休止中の二輪系をttdから外す。.codex/data-quality-yamanashi-stage2-plan.md)→③神奈川監査(住所精度ルール=番地・建物名一致/座標一致ならP0→P1適用)→④神奈川修正→⑤第6バッチthings_to_do。重い判断(exclude候補/同名混同/カテゴリ/タグ変更)は修正時PMレビュー対象** / 残課題: **NHR C群裁定=id51+id163 Trick Art Museum(実体不明・公式確認不可なら exclude_candidate非表示。.codex/data-quality-yamanashi-stage2-plan.md)**・**id275 上千葉砂原公園とid317 同交通公園の重複疑い(別タスク)**・status機械付与・invalid_address 202件・missing_experience 259件・旧/legal/*308化・RLS/写真E2E恒久テスト化

---

## ユーザーについて

- **役割**: trip-guide.net (子供向け遊び場検索サイト)のオーナー兼開発者
- **技術レベル**: Node.js / Git / Next.js などの基礎は初体験スタートだったが、デプロイまで一通り完走済み
- **環境**: Windows 11、PowerShell、Node.js v24.15.0、npm 11.12.1、Claude Code v2.1.126
- **作業ディレクトリ**: `C:\Users\tomo-\projects\trip-guide`
- **GitHub アカウント**: `Ftomohiro0612`
- **メールアドレス**: info@fic-investment.biz

## プロジェクト概要

- **サイト名**: trip-guide.net
- **目的**: 子供向け遊び場(関東甲信越9県、施設968件)の検索サイト
- **スタック**: Next.js 16 (App Router) + TypeScript + Tailwind CSS v4 + Turbopack
- **ホスティング**: Vercel
- **データ**: `data/facilities_data.json` (968施設、全件緯度経度入り、画像350件)
- **県別**: 静岡 68 / 長野 73 / 山梨 72 / 東京 155 / 栃木 118 / 埼玉 118 / 新潟 120 / 千葉 115 / 神奈川 124
- **データ運用**: Google スプレッドシート(マスター) ⇄ JSON 同期スクリプト + **Sheets API 直接書き込み**(append-to-sheet / push-to-sheet)
- **詳細仕様**: `HANDOFF.md`(プロジェクトの完全な仕様書、データ運用フローも記載)

## 公開状況 (LIVE)

| 項目 | 値 |
|---|---|
| **本番URL** | https://trip-guide.net (SSL有効、独自ドメイン稼働中) |
| **Vercel preview** | https://trip-guide-nine.vercel.app |
| **GitHub** | https://github.com/Ftomohiro0612/trip-guide |
| **DNS** | Xserver管理(A レコードのみ Vercel 216.198.79.1 に変更、TXT/NS/MX は Xserver のまま) |
| **メール** | Xserver 側でそのまま継続(SPF/DKIM保護) |

---

## 現在の進捗

### ✅ Phase 1 MVP (完了)
- Next.js 16 + TypeScript + Tailwind v4 + Turbopack でセットアップ
- ヒーロー / クイックフィルタ / エリアカード / カテゴリカード / ピックアップ
- 施設一覧(サイドバーフィルタ + ソート + 空状態)
- 施設詳細(JSON-LD `TouristAttraction` + Google Maps embed + 関連施設)
- 大型 Leaflet 地図(151マーカー、県別カラー、フィルタ、自動 fitBounds)
- データアクセス・フィルタ・アイコンの lib モジュール

### ✅ Phase 2 SEO (完了)
- 県別ページ `/prefecture/[id]` × 3
- カテゴリ別ページ `/category/[id]` × 15
- タグページ `/tag/[slug]` × 10 (ロングテールSEO)
- About / 404 / Loading / error / global-error ページ
- next-sitemap (188 URL) + robots.txt
- 自動生成 OGP 画像(トップ・県・カテゴリ・タグ・施設詳細)、Noto Sans JP埋め込み
- Twitter Cards / OGP / robots / keywords / format-detection / viewport / theme-color
- favicon / apple-icon / PWA manifest
- BreadcrumbList + WebSite SearchAction + ItemList JSON-LD
- canonical URL を全主要ページに付与
- 適用中フィルタチップ(× ボタンで個別解除)
- スキップリンク / フォーカススタイル / 動きを抑制設定

### ✅ データ充実 (完了)
- **施設数 968件** — 全件緯度経度入り
  - V3:151 → V4:+22 → V5:+18 → V6:+23 → V7 東京 +150 → V8 関東5県 +506 → V9 第2弾 +68 → V10 audit補完 +35 → 削除 5 (重複) = **968**
- **9県カバー**: 静岡 68 / 長野 73 / 山梨 72 / 東京 155 / 栃木 118 / 埼玉 118 / 新潟 120 / 千葉 115 / 神奈川 124
- **施設写真 350件**(36%)— Wikipedia 完全一致のみ採用、却下292件はブラックリスト管理(`data/wiki-image-blacklist.json`)
- **カテゴリ数 20**(15既存 + 5新規:nature-park / viewpoint / scenic / indoor-theme-park / game-center)
- スキーマ 22列(V5で signature_experiences / unique_selling_point / experience_tags / summer_water_play 追加)
- ヘルパースクリプト: `geocode.ts` / `geocode.mjs` / `fetch-wiki-images.ts` / `optimize-images.mjs` / **`export-to-csv.ts`** / **`sync-from-sheet.ts`** / **`append-to-sheet.ts`** / **`push-to-sheet.ts`**
- バックアップ: `data/facilities_data.json.bak.*` — gitignore 対象

### ✅ 体験向上 (完了)
- シェアボタン(X / LINE / Facebook / リンクコピー / OS標準シェア)
- GA4 / Search Console 連携の組み込み枠 (env で有効化)
- アクセシビリティ強化(skip link, focus-visible, prefers-reduced-motion)

---

## ✅ 今セッションで完了した作業

### GitHub / Vercel 本番デプロイ
- GitHub リポジトリ作成 + push 成功
- Vercel デプロイ完了、本番稼働中: https://trip-guide.net (SSL有効)
- Vercel CLI セットアップ完了(v53.1.0、`ftomohiro0612` でログイン済み、プロジェクトリンク済み)

### Google Analytics 4 セットアップ完了
- 測定ID: `G-1V6K1ZJH6S`
- Vercel 環境変数 `NEXT_PUBLIC_GA_ID` 登録済み(Production / Development)
- Preview 環境のみ未登録(将来 feature branch 運用時に手動追加する想定)
- 本番HTMLでGA4タグ埋め込み確認済み
- リアルタイムレポートで動作確認済み

---

## ✅ 追加で完了した作業: Google Search Console + Sitemap

- プロパティ追加済み: `https://trip-guide.net`(URL プレフィックス方式)
- 所有権確認方式: **HTML ファイル方式** を採用(`public/google53d37859cb4831ab.html`)
- 認証完了: 「所有権が確認されました」を取得
- Sitemap 提出済み: `/sitemap.xml`(サイトマップ インデックス、子に `sitemap-0.xml`、186 URL)
- ステータス: **「成功しました」** を確認(検出ページ数の反映は数日〜数週間)

### メモ
- HTML タグ方式 (`NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION`) は使わなかった → 今回はその環境変数は未設定のままで OK
- メモ帳に保存していた meta タグの content 値は捨てて問題なし

---

## ✅ V4 拡張 + 運用パイプライン構築 (2026-05-03 完了)

### 22施設追加(id 152〜173)
- 静岡 3 / 山梨 12 / 長野 7 件、主に河口湖・山中湖・軽井沢周辺の美術館 / 体験施設 / 自然系
- 全件 緯度経度補完済み(例外: id=167 軽井沢おもちゃ王国は群馬県嬬恋村が長野県表記でジオコード結果がズレ)
- 新カテゴリ3つ追加: `nature-park` 公園・自然 / `viewpoint` 展望台 / `scenic` 自然・絶景
- アイコン・説明文も `lib/icons.ts` / `lib/descriptions.ts` に追加済み

### Google スプレッドシート ⇄ JSON 同期運用化
- スプレッドシートID: `1p4bqL1Oq89k5c-9Wa0REXd8BojzUBBXfF5-iSYEeeH4`
- 「全件一覧」タブが先頭、18列(id / 県 / カテゴリ / 施設名 / 所在地 / 屋内・屋外 / 雨天対応 / 料金タイプ / 大人料金目安 / 子供料金目安 / おすすめポイント詳細 / 対象年齢 / URL/参考 / lat / lng / image / image_credit / tags)
- 通常運用: シート編集 → `npm run sync-sheet` → JSON 反映
- **重要な落とし穴**: シートに id 空のまま新規行追加 → 同期 → 自動採番されるが、**シートに id を書き戻さないと次回また新規扱いで重複**する
  - 対策: 同期後 `npm run export-csv` → `data/facilities_master.csv` をシートに再インポート
  - sync スクリプトは「added > 0 かつ orphaned > 0」を検知すると警告を出す
  - 詳細手順は HANDOFF.md「データ運用フロー」セクション
- バグ修正済み: `is_free` の startsWith("無料") 判定 / カテゴリ count 自動更新

### 詳細ページ UX 改修
- ヒーロー画像のフル不透明度化(以前は60%+グラデオーバーレイで写真が見えなかった)
- 「写真ギャラリー」セクション新設(基本情報 直上、3列 PC / 2列 SP、4:3 比率)
  - 配列前提のコンポーネント `FacilityGallery.tsx` で書いてあるので、将来 `images: string[]` に拡張可能
  - 画像なし施設はセクションごと非表示

### Wikipedia 自動取得の精査(strict-match policy)
- fetch-wiki はファジー検索で別施設・別概念をしばしば返すので、**Wikipedia 記事タイトルが施設名と完全一致するもののみ採用**が確立した運用方針
- 却下されたid群は `data/wiki-image-blacklist.json` に登録され、`npm run fetch-wiki` で次回以降スキップされる(無限再取得防止)
- 採用例: 155 河口湖音楽と森の美術館 / 171 八ヶ岳自然文化園 / 173 上高地 / 192 富士川クラフトパーク / 208 熱海城 など
- 却下例: 152 伊豆テディベア・ミュージアム ← テディベア(概念)/ 150 あすなろ園 ← 青木あすなろ建設(建設会社)など

### id=167 軽井沢おもちゃ王国 修正済み
- 嬬恋村は実は群馬県だが「軽井沢エリア」として長野県表記している → ジオコーダが混乱
- 施設名のみで再検索して正しい座標を取得・直接書き込み(`geocode_source: "manual"`)

---

## ✅ V5 + V6 拡張 + Sheets API 双方向化 (2026-05-03 完了)

### V5: スキーマ4列追加 + 18施設追加(id 174〜191)
- 新列: `signature_experiences`(配列)/ `unique_selling_point`(文字列)/ `experience_tags`(配列)/ `summer_water_play`(◎△×)
- 18施設追加(主に Forest Adventure シリーズ、三島スカイウォーク、チビッ子忍者村など)
- 22列スキーマで sync / export / type / 取り込み全て対応

### V6: 23施設追加(id 192〜214)
- 大型遊具公園が中心(山梨9 / 長野7 / 静岡7)
- 富士川クラフトパーク、万力公園、熱海城、はままつフラワーパークなど
- 全件 lat/lng 補完済み(13 Nominatim + 10 Google)、画像7件採用

### Google Sheets API による双方向書き込み(運用革命)
- **問題**: 旧フローでは新規行に id 空のまま sync すると毎回新規扱いで重複地獄
- **解決**: サービスアカウント `trip-guide-bot@trip-guide-495213.iam.gserviceaccount.com` を作成 + シート編集権限付与 + JSON キー(`data/.gcp-sheets-credentials.json`、gitignore済)
- **新スクリプト**:
  - `npm run append-to-sheet -- file.csv` → 末尾追記
  - `npm run push-to-sheet` → JSON 状態を全列フル書き戻し
- **新フロー**: シート編集 → `sync-sheet` → `push-to-sheet` で id 自動書き戻し完了。重複事故ゼロ
- **スプレッドシート初期化用 CSV** (`data/facilities_master.csv`) は、Sheets API 経由なら `push-to-sheet` で代替可能

### 残課題(優先度低)
- **画像カバレッジ向上**: 残り 618 件を Google Places API (New) で取得検討。無料枠($200/月)で約 $5 程度
- **fetch-wiki の自動 strict フィルタ**(現状は `scripts/.tmp-strict-wiki-filter.mjs` をその都度作成 → 1 コマンド化したい)
- **V10 audit 追加分(id 941-975)の説明文・料金の精査**(Web検索ベースの暫定値、シートで磨ける)
- **インデックス進捗の確認**: 1〜2週間後に Search Console「カバレッジ」または `site:trip-guide.net` で実際にインデックスされた URL 数を確認

---

## ✅ V7-V10 追加履歴 (2026-05-04)

### V7 東京都 +150件(id 215-364)
- 新カテゴリ2つ追加:`indoor-theme-park` 屋内テーマパーク / `game-center` ゲームセンター
- rain_friendly が「雨天OK / 雨天NG / 雨天一部OK」のテキストで、prerender 全落ち事故 → 正規化 + RAIN_FALLBACK で復旧

### V8 関東5県 +506件(id 365-870)
- **栃木 / 埼玉 / 新潟 / 千葉 / 神奈川**(各国 100件前後)を一括追加
- PrefectureId 型 / 県別アイコン・色・説明文 / sync の PREFECTURE_MAP / MapView の PREF_COLORS &  LABELS / metadata.prefectures をそれぞれ 5県分拡張

### V9 第2弾 +68件(id 871-940)
- 6県横断の70件 CSV から、既存と同名2件(府中の森公園 / コニカミノルタ満天)を skip して 68件追加

### V10 audit補完 +35件(id 941-975)
- 9県完成度 audit(WebSearch ベース)で見つかった漏れ施設を補完
- 静岡 5 / 長野 1 / 栃木 2 / 埼玉 8 / 新潟 7 / 千葉 3 / 神奈川 9
- 神奈川キドキドは ラゾーナ川崎 / たまプラーザ / 武蔵小杉 / みなとみらい / 湘南 の 5店を追加
- 説明文・料金は web 検索ベースの暫定値、要シート精査

### MapView 同座標オフセット
- キポキポ(id=131)と恩賜林庭園(id=200)が同じ住所内施設で完全同座標 → マーカー重なって片方しか見えない問題を解決
- 同座標グループを ~40m 半径で円形に微小ジッタ、現在 27 組の親子施設すべて個別クリック可能に

### 整合性チェックでの修正
- 県外ジオコード 6件(京都・福岡・東京に飛んでいた栃木・千葉施設)を再ジオコード
- indoor_outdoor「屋内・屋外」表記 7件 → 「両方」に正規化
- 同名重複 5件削除(870 → 865)、その後 V9 / V10 で増加

---

## ⚠️ データ取り込み時の予防策(Tokyo 拡張で踏んだ罠)

新しい県や大量データを追加したら、**取り込み後の本番デプロイ前に**以下を必ずチェック。

### 1. 値の正規化(列ごとに想定形式が決まっている)
- `rain_friendly`: **`◎` / `△` / `×` の3記号のみ**(東京拡張で「雨天OK / 雨天NG / 雨天一部OK」が混入し prerender が全件落ちた)
- `indoor_outdoor`: `屋内` / `屋外` / `両方`
- `summer_water_play`: `◎` / `△` / `×` (rain_friendly と同じ記法)
- `料金タイプ`: 「無料」または「有料」始まり(`is_free` は `startsWith("無料")` で判定)
- `県`: 静岡県 / 長野県 / 山梨県 / 東京都 / 栃木県 / 埼玉県 / 新潟県 / 千葉県 / 神奈川県(他県は新規追加マッピング必要)

### 2. ローカルビルド検証
大量追加 + sync 完了後、commit する**前に**:
```powershell
npm run build
```
- `Generating static pages` フェーズで全ページの prerender が走り、未知の列値による型エラーがあれば即発見できる
- これを飛ばして push すると Vercel ビルド失敗 → production が古いまま静かに固定される(エラーバナーは出ないので気付きにくい)

### 3. デプロイ後の即時確認
push 後 1-2 分で Vercel ビルド結果を確認:
```powershell
vercel inspect https://trip-guide.net | grep status
```
status が `Error` なら最新の URL で `vercel inspect <URL>` してログ追跡。production が更新されていなくても DNS は古いビルドを返すので「変わらない」=「失敗してる」。

---

## 次回セッションの推奨開始順（2026-06-11 オーナー確定）

1. **規約・プライバシーポリシー v0.2 確認**（.codex/terms-privacy-draft.md）— 運営者正式表記・問い合わせ先・匿名集計/写真/オプトアウト文言 → 本番掲載可否判断
2. **未デプロイ分のデプロイ判断** — 監査v3(70e60a8)・coord修正(6d591cd)・docs類。表示影響は地図ピン正常化が主で基本GO寄り
3. **Sheets 同期4列対応** — provenance 4フィールド（source_urls / source_checked_at / data_quality_status / source_notes）を sync-sheet / append-to-sheet / push-to-sheet に対応させる
4. **既存1,030件への data_quality_status 機械付与** — 一括 confirmed 禁止。likely_ok / needs_web_check / needs_human_review / exclude_candidate の機械分類（.codex/facility-data-quality-status-policy.md）
5. **写真機能の公開前レビュー** — 規約掲載後に `PHOTO_UPLOAD_ENABLED=true` の判断（公開条件: .codex/phase4-photo-upload.md）【2026-06-13 訂正: **実施済み**。`f074a4d "Enable photo uploads in production"`(2026-06-12 13:40)で flag=true 化・本番公開済み。下記「写真機能の現状」参照】

既知残課題: url未入力102件 / invalid_address 202件 / missing_experience 259件 ／ ~~写真本番公開・規約正式掲載は未実施~~ → **訂正: 写真本番公開＝実施済み（2026-06-12 `f074a4d` flag=true）／規約・プライバシー本番掲載済み（/terms・/privacy=200）**

---

## 写真機能の現状（2026-06-13 確認・文書訂正）

**事実確認の結果、写真アップロードは本番公開済み**（過去文書 .codex/phase4-photo-upload.md 等が false のまま未更新で混乱の元。以後はこちらを正とする）。

- `lib/config.ts` の `PHOTO_UPLOAD_ENABLED = true`（**origin/main にコミット済み**・コミット `f074a4d` 2026-06-12 13:40 "Enable photo uploads in production"）。以後の本番デプロイに含まれ反映済み。
- 規約 `/terms`・プライバシー `/privacy` とも本番 200（掲載済み）。
- Phase A（DB/Storage・RLS全PASS ec0f45e）/ Phase B（アップロードUI・EXIF除去 cd2b285）/ Phase C（詳細表示・削除・visit削除時cleanup e373403）すべて実装済み。
- UI は `PHOTO_UPLOAD_ENABLED` フラグ配下（/mypage/visits/new・[id]/edit・[id]）。flag=true なのでログインユーザーに表示・利用可。
- `app/mypage/visits/VisitPhotoUploader.tsx` に EXIF 日付読み取り処理あり（将来のドラフト機能で流用可能）。
- ※本セッションでは認証フローの実アップロード/削除までは未再現（確認はコード+git+規約ページ200まで）。本番での実アップロード/表示/削除の最終目視は別途推奨。

## 将来候補（Phase 4.x〜5・オーナー確認済み 2026-06-13／今は着手しない）

**写真アップロード → 日付＋推定場所で「おでかけ履歴」ドラフト自動作成**

- 概要: 写真をアップロードすると、撮影日付と推定場所（近い候補施設を最大3つ提示）から訪問記録のドラフトを自動生成。候補は既存施設の緯度経度DB＋地図の距離計算を流用すれば実現可能。
- **プライバシー方針（オーナー賛成・確定）**: EXIF の撮影日時・GPS は**ブラウザ側でアップロード前に一時的に読み取り、日付と近くの候補施設の提案にのみ使用**。**画像保存時には EXIF/GPS を除去し、GPS 生データは保存しない**（[[freshness-all-fields]] とは別件。写真の EXIF 除去方針＝feedback-pm-operation-rules と整合）。
- 既存資産: VisitPhotoUploader に EXIF 日付読み取りが既にある。GPS 読み取り＋近接施設マッチングが追加実装ポイント。
- 優先度: 現行優先（①id149 hotfix ②地図機能 ③山梨軽量サブバッチ/NHR C群 ④神奈川監査）の後。仕様書はまだ作らない（記録のみ）。

---

## 直近の作業ログ

| 日付 | 主なできごと |
|---|---|
| 2026-05-02 早い時間 | Phase 1 MVP 実装、ジオコーディング(Nominatim)、地図ビュー追加 |
| 〃 | Phase 2 SEO実装(県/カテゴリ/タグ/About/404/OGP/sitemap/robots) |
| 〃 | Google Geocoding API でフォールバック68件を再ジオコード(完璧化) |
| 〃 | 施設写真 73→54件取得・最適化(Wikipedia + sharp) |
| 〃 | favicon / manifest / 構造化データ追加 |
| 〃 | GitHub リポジトリ作成・初回 push |
| 〃 | Vercel デプロイ、preview URL `trip-guide-nine.vercel.app` 公開 |
| 〃 | Xserver 側で A レコード書き換え(@ → 216.198.79.1) |
| 〃 | DNS 反映確認、SSL 自動発行成功、`https://trip-guide.net` 200 OK |
| 〃 | シェアボタン / canonical / ItemList JSON-LD / a11y 追加 push |
| 〃 | GA4 (`G-1V6K1ZJH6S`) を Vercel 環境変数に登録、本番で稼働確認 |
| 〃 | Vercel CLI セットアップ(v53.1.0、プロジェクトリンク済み) |
| 〃 | Search Console プロパティ追加・HTML ファイル方式で所有権確認完了 |
| 〃 | `public/google53d37859cb4831ab.html` を配置、`/sitemap.xml` 提出 → 「成功しました」確認 |
| 〃 | 詳細ページ:ヒーロー画像をフル不透明度に変更、写真ギャラリーセクション新設 |
| 〃 | データ運用を Google スプレッドシート→JSON 同期に切替(`npm run export-csv` / `npm run sync-sheet`) |
| 2026-05-03 | V4 22件追加(id 152-173)、3新カテゴリ(nature-park / viewpoint / scenic) |
| 〃 | sync-from-sheet バグ修正(is_free, カテゴリ count, 重複 id 警告)|
| 〃 | Nominatim + Google で V4 全件ジオコード、id=167 軽井沢おもちゃ王国 を手動再検索で修正 |
| 〃 | Wikipedia ファジーマッチ 28件却下、完全一致3件のみ採用 → 画像57件 |
| 〃 | V5: 22列スキーマ移行(signature_experiences ほか3列追加)+ 18施設追加(id 174-191) |
| 〃 | V5 全件ジオコード + 4件画像採用、`wiki-image-blacklist.json` 機構導入 |
| 〃 | **Sheets API 双方向書き込み構築**(サービスアカウント、append-to-sheet / push-to-sheet) |
| 〃 | V6: 23施設追加(id 192-214)、大型遊具公園中心 + 7件画像採用、計214件で本日着地 |
| 2026-05-04 | フィルタページ(タグ/カテゴリ/県/検索結果)上部に Leaflet 地図追加 |
| 〃 | V7 東京都 150件追加(id 215-364)、4県運用に拡張、20カテゴリ(+ indoor-theme-park / game-center) |
| 〃 | rain_friendly のテキスト値混入で prerender 全落ち → 正規化 + RAIN_FALLBACK で復旧 |
| 〃 | キポキポ + 恩賜林庭園 のジオコード/住所統合(同一住所内施設、(35.4548, 138.7942) で一致)|
| 〃 | 整合性 audit:県外ジオコード 6件再修復、indoor_outdoor 7件正規化、同名重複 5件削除 |
| 〃 | MapView の同座標オフセット実装(40m 半径、27 組の親子施設が個別クリック可能に)|
| 〃 | V8 関東5県(栃木/埼玉/新潟/千葉/神奈川)506件追加(id 365-870)、9県運用に拡張 |
| 〃 | V9 第2弾 68件追加(id 871-940)、夜遅く |
| 〃 | 9県完成度 audit(WebSearch ベース)→ V10 35件追加(id 941-975)、計 968 件で着地 |

---

---

## ✅ Memorips（マイページ機能）実装状況 (2026-06-09)

### サービス概要

trip-guide.net に組み込んだ **「メモリップ by Trip Guide」** — 家族のおでかけ記録機能。
詳細設計は `product-direction.md` 参照。

### 技術スタック追加分

| 項目 | 内容 |
|---|---|
| DB | Supabase（trip-guide プロジェクト） |
| 認証 | Google OAuth + メール認証（Supabase Auth） |
| SSR認証 | `@supabase/ssr` + cookie ベース |
| デプロイ | Vercel CLI（`npx vercel --prod`）— GitHub webhook は旧リポジトリ紐付けのため |

### Supabase 手動作業済み（ダッシュボードで実行）

- `001_phase1_schema.sql`: profiles / children テーブル + RLS + GRANT
- `002_phase2_schema.sql`: visits / visit_children / wishlists テーブル + RLS + GRANT
- Authentication → Providers → Google: OAuth Client ID/Secret 設定済み
- Authentication → URL Configuration: `https://trip-guide.net/auth/callback` 登録済み

### Phase 1 完了 ✅

| 機能 | ルート |
|---|---|
| 認証（メール + Google OAuth） | `/auth/register`, `/auth/login`, `/auth/callback` |
| マイページ | `/mypage` |
| 子どもプロフィール登録・編集 | `/mypage/children` |
| BottomNav（モバイル） | `components/BottomNav.tsx` |

### Phase 2 完了 ✅

| 機能 | ルート |
|---|---|
| 訪問記録フォーム（30秒入力） | `/mypage/visits/new` |
| おでかけ履歴一覧 | `/mypage/visits` |
| 行きたいリスト | `/mypage/wishlist` |

### 既知のポイント・ハマりどころ

- **GRANT は RLS と別**: `ENABLE ROW LEVEL SECURITY` だけでは 403 が出る。`GRANT ... TO authenticated;` が必須
- **Google OAuth クライアントは「ウェブアプリケーション」型**で作る（デスクトップ型は `redirect_uri` が `localhost` になり使えない）
- **Vercel は CLI デプロイ**: `npx vercel --prod --yes --token <token>`（token は `.codex/.sandbox-secrets/vercel.json`）
- **package.json に `@supabase/supabase-js` と `@supabase/ssr` が必要**（ない場合 Vercel ビルド失敗）

### Phase 3 完了 ✅ (2026-06-09)

| 機能 | ルート |
|---|---|
| 施設詳細ページ → 「行きたい♡」「行ったよ✓」ボタン | `components/FacilityActionButtons.tsx` |
| facility_slug と facilities_data.json の紐付け | visits/new クエリパラメータ対応 |
| 訪問記録の編集 | `/mypage/visits/[id]/edit` |
| 訪問記録の削除 | `DeleteVisitButton.tsx` |

### 優先方針（2026-06-09 オーナー確認済み）

**「自分の家族の記録が気持ちよく見える」を最優先。他ユーザー集計は件数が十分になるまで非表示。**

優先順位:
1. **オーナー自身で10件記録してUX確認**（30秒以内・保存後の振り返り体験）
2. **記録保存後の振り返りカード改善**（マイページの「自分の記録」表示を充実）
3. **memorips.com 簡易LP + 事前登録フォーム**
4. **施設ページへ「自分の記録」を還流**（他ユーザー集計ではなく自分の訪問歴）
5. **匿名集計・再訪率の表示**（一定件数たまってから）

### Phase 3 追加実装候補

#### 訪問記録 任意項目追加（visits テーブル拡張）
- 滞在時間（目安: 1時間未満 / 1〜2時間 / 2〜4時間 / 半日 / 終日）
- 時間は足りたか（十分 / ちょうど / 足りなかった）
- 食事・売店評価（なし / あり・満足 / あり・不満）

#### マイページ おでかけマップ（`/mypage/visits/map`）
- 行った場所（訪問済み施設ピン）
- 行きたい場所（wishlist ピン）
- また行きたい場所（family_revisit=yes のピン）
- 既存 Leaflet コンポーネントを流用

#### 地図ピンから自分の記録をポップアップ表示
- 訪問回数
- 子どもごとの満足度
- また行きたいか
- 親の疲れ度
- 滞在時間（任意項目追加後）
- 食事評価（任意項目追加後）

---

---

## ✅ Phase 4 実装状況 (2026-06-10)

### Phase 4-1 完了 ✅ デプロイ済み
- 反応タグ機能（Migration 005: reaction_tags / visit_child_tags テーブル）
- 訪問記録フォームに per-child タグ UI
- 施設詳細ページに反応タグ表示

### Phase 4-2 / 4-2b 完了 ✅ デプロイ済み
- フォーム改善（temp_feeling 削除・滞在時間4択・食事5択・満足度4択・アクセス6択）

### recommended_for_tags タグ付け 完了 ✅
- 全1032施設に AI タグ付け完了（Codex レビュー GO 済み）
- 使用タグ19個: animal/animal_contact/animal_feed/water_play/pool/playground/athletic/slide/running/wide_space/vehicle/craft/experience/exhibition/science/dinosaur/character/nature/food
- 生成ファイル: `.codex/all_tagged_facilities.json`（1032件）/ `needs_web_check_facilities.json`（421件）/ `needs_human_review_facilities.json`（10件）
- タグルール: `.codex/recommended_for_tags_rules.md`

### Migration 006 手動実行済み ✅
- `supabase/migrations/006_add_pool_reaction_tag.sql` — reaction_tags に pool を追加

### Phase 4-3 完了 ✅ デプロイ済み
- `data/facilities_data.json` に recommended_for_tags 反映済み（全1032件）
- `types/facility.ts` に `RecommendedForTag` 型追加
- `lib/recommended-tags.ts` 新規作成
- `components/FacilityCard.tsx` にチップ表示（最大3件）追加
- `app/facilities/[slug]/page.tsx` に「こんな遊びが好きな子に 🎯」セクション追加

### Phase 4-4 完了 ✅ デプロイ済み
- チップを Link 化（FacilityCard / 施設詳細）
- `RECOMMENDED_FOR_TAG_HEADLINE` マップ追加
- `/facilities` に recommended_tag + prefecture フィルター実装
- 都道府県ボタン行（全国/各県）を recommended_tag 指定時に表示

### Phase 4-5 完了 ✅ デプロイ済み（commit `2877943b`, 2026-06-10）
仕様書: `.codex/phase4-5-filter-ui-improve.md`
- `ActiveFilterChips.tsx`: recommended_tag チップ + prefecture（単一）チップ追加
- `FilterSidebar.tsx`: 「おすすめタイプ」折りたたみセクション追加（全19タグ、単一選択）
- `FilterSidebar.tsx`: 都道府県を折りたたみチェックボックスに変更（複数選択は維持）
- `app/facilities/[slug]/page.tsx`: タグチップ下にテキストリンク追加（最大3件）
- **ブラウザ確認: ユーザー待ち**

### Phase 5 カンドゥー修正 完了 ✅（commit `43c613c`）
- カンドゥー（id=357）修正済み（**公式住所で確認済み**）:
  - `prefecture`: 千葉県
  - `prefecture_id`: chiba
  - `address`: 千葉県千葉市美浜区豊砂1-5 イオンモール幕張新都心 エキマエ3階
  - `latitude`: 35.6575832 / `longitude`: 140.0251269（Nominatim直接ヒット）
  - `recommended_for_tags`: ["experience"]
  - `description`: 職業体験施設として更新（イクスピアリ記述削除）
- **インシデント記録**: `.codex/kandu-address-incident-report.md`
  - 原因: AI学習データから旧イクスピアリ店舗住所を公式確認なしで記入
  - 再発防止: 住所修正は公式URL確認必須・座標も再ジオコード必須（memory保存済み）

### Phase 4-6 完了 ✅ デプロイ済み（commit `3a62ecd`）
仕様書: `.codex/phase4-6-prefecture-filter-fix.md`
- `FilterSidebar.tsx`: `togglePrefecture()` 追加（サイドバーで県チェック時に `prefecture` を `prefectures` に吸収してから削除）
- `page.tsx`: `allSelectedPrefNames` で単一+複数の統合リスト、OR 条件フィルター
- 見出し: 0県 / 1県 / 複数県の3パターン対応
- **ブラウザ確認: ユーザー待ち**

### Phase 5 監査スクリプト 暫定完了（改善は別タスク）
スクリプト: `scripts/audit-data-quality.mjs`
レポート: `.codex/facility_data_quality_report.json` ほか3ファイル

**現在の検出結果と判断**:
| 問題 | 件数 | 判断 |
|---|---|---|
| 都道府県ミスマッチ | 881件 | **過剰検出**（ロジック要改善） |
| 説明文80字未満 | 948件 | **過剰検出**（閾値と基準要見直し） |
| タグ×カテゴリ矛盾 | 30件 | **有効**、次フェーズで確認対象 |

**監査ロジック改善方針（次タスク用）**:
- 都道府県: `prefecture_mismatch`（別県名明記）/ `invalid_address`（架空表現）/ `prefecture_missing_in_address`（都道府県名なし市区町村始まり、エラーでなく補完候補扱い）に分類
- 説明文: 文字数だけでなく内容で判定 — `short_description`（60字未満）/ `thin_description`（何ができる施設か不明）/ `missing_experience`（体験・設備・対象年齢情報不足）の3カテゴリに分類
- タグ矛盾30件: 職業体験なのにplayground / 水族館にanimal不在 / 科学館にscience不在 / 公園にwater_play根拠不明 を精査

---

## 今後やるべき残タスク（施設情報サイト側）

### Phase 3 候補(優先順)
1. **V10 audit追加分(id 941-975)の説明文・料金精査**(暫定値で取り込んだのでシートで磨ける)
2. **fetch-wiki の自動 strict フィルタ**(都度 `.tmp-strict-wiki-filter.mjs` を作っているので `--strict` フラグで1コマンド化)
3. **Google Places API で残り 618 件の画像取得**(無料枠内、約 $5)
4. **新4列のフロントエンド表示**(signature_experiences / unique_selling_point / experience_tags / summer_water_play は データに入っただけで UI 未対応、SEO 強化に効きそう)
5. **www → 非www リダイレクト** (現在 `www.trip-guide.net` は SSL エラー)
6. **お気に入り機能** (localStorage、軽量)
7. **検索機能の強化**(現在は単純な部分一致)
8. **群馬県の追加検討**(嬬恋村が長野県扱いで 3件混入しており、独立県化したい候補)

### コンテンツ拡充
- 季節特集ページ(春の桜、夏の水遊び、秋の紅葉、冬のスキー)
- 関東他県(茨城・群馬)/ 東北・北陸への拡大
- ブログ記事(fic-investment.biz の Make パイプライン応用)

---

## 役割分担

- **チャット相棒の Claude (claude.ai)**: 戦略相談、手順案内、エラー翻訳、学習サポート
- **実装担当の Claude Code**: コード作成、修正、テスト、デプロイコマンド実行

ユーザーは「黒い画面(CLI)」より「チャット相棒との会話」を好むため、計画はチャット側で固めて、Claude Code には1つのまとまった指示を投げる流れが理想。

## ユーザーへの接し方

- 専門用語は最小限に。使うときは必ず一言で噛み砕く
- 手順は番号付きで、コピペできる形で提示
- 画面のスクショを送ってくることが多いので、それを見て状況判断 → 次の一手を案内
- 「Yes / Enter / 矢印キーで↓」など具体的に
- できたら一度区切って「次どうする?」と相談する

## 参考ファイル(同フォルダ内)

- `HANDOFF.md` — このファイル（引継ぎメモ）
- `SPEC.md` — プロジェクト初期仕様書（旧 HANDOFF.md）
- `product-direction.md` — プロダクト方針書・実装進捗
- `CLAUDE_CODE_QUICKSTART.md` — 初期セットアップ手順
- `data/facilities_data.json` — 214施設の最新データ(全件緯度経度入り、68件画像付き)
- `data/facilities_data.json.bak.*` — タイムスタンプ付きバックアップ(gitignore)
- `data/wiki-image-blacklist.json` — Wikipedia ファジーマッチ却下済み id 一覧(40件)
- `data/.gcp-sheets-credentials.json` — Sheets API サービスアカウント鍵(gitignore)
- `scripts/` — geocode.ts(Google fallback)/ geocode.mjs(Nominatim 一次)/ fetch-wiki-images.ts(blacklist対応済)/ optimize-images.mjs / **export-to-csv.ts** / **sync-from-sheet.ts** / **append-to-sheet.ts** / **push-to-sheet.ts**

## 環境変数 / 認証ファイル

| 名前 | 用途 | 場所 |
|---|---|---|
| `GOOGLE_GEOCODING_API_KEY` | Geocoding API(2026-05-03 鍵更新済み)| `.env.local` |
| `NEXT_PUBLIC_GA_ID` | GA4 測定 ID (`G-1V6K1ZJH6S`) | Vercel Settings(Prod / Dev) |
| `data/.gcp-sheets-credentials.json` | Sheets API サービスアカウント鍵 | ローカルのみ(.gitignore済) |
| `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` | (未使用 — HTML ファイル方式で認証完了) | — |

---

## 次セッション再開時のプロンプト例

```
trip-guide.net は 9県968施設で公開稼働中です(関東甲信越カバー、Sheets API 双方向書き込み運用)。
HANDOFF.md を読んで現状を把握してください。
今日は Phase 3 の「[進めたい項目]」を進めたいです。
```

データ追加をしたい時(V11+):
```
data/v11_additions_for_sheet.csv を作りました。標準フローで取り込んでください。
```
→ Claude が以下を順次実行:
1. `npm run append-to-sheet -- data/v11_additions_for_sheet.csv`
2. `npm run sync-sheet`(自動採番、warning 出ればカテゴリ正規化)
3. `npm run push-to-sheet`(id 書き戻し)
4. `node scripts/geocode.mjs` → `npm run geocode`(Nominatim → Google fallback)
5. `npm run fetch-wiki` + 厳格フィルタ(`.tmp-strict-wiki-filter.mjs` をその都度作成)+ ブラックリスト追加
6. **`npm run build`** で prerender 検証(これ抜かすと Vercel が静かに失敗する)
7. もう一度 `push-to-sheet` で完全同期
8. commit & push

---

新セッションで取りかかりやすいクイック作業:
- **V10 追加分(id 941-975)の説明文・料金を精査**(WebSearch ベース暫定値、シートで magic で磨く)
- **新4列(signature_experiences ほか)を施設詳細ページに表示**(SEO とロングテール強化に効く)
- **Places API 写真取得**(Cloud Console で API 有効化 + `npm run fetch-images` 実行、約 $5)
