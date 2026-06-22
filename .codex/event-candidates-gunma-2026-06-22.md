# 群馬イベント候補抽出 Phase1（案A初回巡回）

- 実確認日: 2026-06-22 JST
- スコープ: `official_event_page` / `official_calendar` 22件 + 高利回り `official_news` 21件 = 43施設
- 判定方針: 日付未定・会期未定・通年・常設・「公式参照」のみは不採用。第三者単独は不採用。迷うものは載せない。
- 変更禁止対象: コード / `data/events_data.json` / `.codex/events-source-registry.json` / `data/facilities_data.json` は未変更。

## 集計

- 巡回施設数: 43
- 採用候補: 12件（11施設）
- 保留: 7件（6施設）
- 不採用: 27施設
- tier downgrade / source見直し候補: 8件

## 採用候補

| facility_id | 施設名 | title | 想定 start_date | 想定 end_date | date_label | age_label | reservation | reservation_label | is_free | price_label | is_indoor | recommended_for_tags | recommended_for_label | official_url | source_checked_at | 判定理由 |
|---:|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1169 | 渋川スカイランドパーク | 7月4日（土）ヒーロージャグリングショー | 2026-07-04 | 2026-07-04 | 2026年7月4日（土）11:00 / 14:00 | どなたでも | not_required | 予約不要 | false | 入園料別（イベント追加料金は公式記載なし） | false | experience | ショーや遊園地が好きな子に | https://www.skyland89.jp/information/ | 2026-06-22 | 公式「お知らせ・イベント」で日時が明確。親子向け遊園地内ショーとして自然。 |
| 1170 | 軽井沢おもちゃ王国（群馬県嬬恋村） | 森の体験広場（木工クラフト・森のクッキング） | 2026-07-18 | 2026-08-30 | 2026年7月18日（土）〜8月30日（日） | 子ども向け（施設全体は幼児から） | unknown | 公式参照 | false | お一人様600円〜（別途入園料等は公式参照） | false | nature, craft, food | 自然素材のクラフトが好きな子に | https://www.omochaoukoku.com/karuizawa/nature/ | 2026-06-22 | 公式ページで夏休み期間・内容・料金が明確。 |
| 1177 | 向井千秋記念子ども科学館 | 巡回展「世界一新しい花崗岩のヒミツ―花崗岩ベイビーを抱っこしよう―」 | 2026-06-06 | 2026-07-05 | 2026年6月6日（土）〜7月5日（日） | 子どもから大人、家族連れ | not_required | 予約不要 | null | 入館料等は公式参照 | true | science, experience, exhibition | 石や実験が好きな子に | https://www.city.tatebayashi.gunma.jp/kagakukan/020/renkeikyou/20250628175328.html | 2026-06-22 | 公式詳細で会期・場所・家族向け体験展示が明確。 |
| 1178 | 群馬県立自然史博物館 | 開館30周年記念企画展「北米ジュラ紀の恐竜たち」 | 2026-07-18 | 2026-12-06 | 2026年7月18日（土）〜12月6日（日）（9/15〜9/18展示入替休止） | どなたでも | not_required | 予約不要 | false | 観覧料は公式参照 | true | dinosaur, exhibition | 恐竜が好きな子に | https://www.gmnh.pref.gunma.jp/event/id11471/ | 2026-06-22 | 公式イベント詳細で長期会期・対象・場所が明確。 |
| 1180 | 群馬県立ぐんま昆虫の森 | 夏の特別展「カブト・クワガタ展」 | 2026-07-11 | 2026-08-30 | 2026年7月11日（土）〜8月30日（日） | 子ども〜大人 | not_required | 予約不要 | false | 入園料は公式参照 | true | animal, exhibition, nature | カブトムシやクワガタが好きな子に | https://www.pref.gunma.jp/site/giw/633932.html | 2026-06-22 | 公式展示計画で会期・内容が明確。子ども人気の昆虫テーマ。 |
| 1180 | 群馬県立ぐんま昆虫の森 | 第23回企画展「あなたの知らない『昆虫』標本の世界」 | 2026-07-11 | 2026-11-03 | 2026年7月11日（土）〜11月3日（火・祝） | 子ども〜大人 | not_required | 予約不要 | false | 入園料は公式参照 | true | animal, exhibition, nature | 昆虫標本や観察が好きな子に | https://www.pref.gunma.jp/site/giw/633932.html | 2026-06-22 | 公式展示計画で会期・内容が明確。 |
| 1181 | 神流町恐竜センター | 化石さがし体験（2026年度版） | 2026-07-19 | 2026-08-16 | 2026年7月19日〜20日、7月25日〜26日、8月8日〜16日 | 小さな子どもは大人付き添い | required | 要予約（当日枠若干あり、公式参照） | false | 500円（入館料別は公式参照） | false | dinosaur, experience | 化石発掘が好きな子に | https://dino-nakasato.org/2022_fossil-excavation/ | 2026-06-22 | 施設公式で夏休み開催日・予約開始・料金・雨天中止が明確。 |
| 1187 | こんにゃくパーク | 7月1日 さしみこんにゃくの日 | 2026-06-20 | 2026-07-05 | 2026年6月20日（土）〜7月5日（日） | どなたでも | not_required | 予約不要 | true | 無料食べ比べあり（限定セット販売あり） | true | food, experience | 食べ比べや工場見学が好きな子に | https://www.konnyaku-park.com/event/7%E6%9C%881%E6%97%A5-%E3%81%95%E3%81%97%E3%81%BF%E3%81%93%E3%82%93%E3%81%AB%E3%82%83%E3%81%8F%E3%81%AE%E6%97%A5/ | 2026-06-22 | 公式詳細で期間・無料食べ比べ企画が明確。 |
| 1198 | ぐんまこどもの国（群馬県立金山総合公園） | カブトムシクイズラリー | 2026-07-01 | 2026-07-01 | 2026年7月1日（水） | どなたでも | unknown | 公式参照 | true | 入園無料（参加条件は公式参照） | false | animal, nature, experience | カブトムシが好きな子に | https://gunma-kodomonokuni.jp/event_all/ | 2026-06-22 | 公式イベント一覧で開催日が明確。詳細条件は公式参照扱い。 |
| 1200 | 群馬県立観音山ファミリーパーク | 夏休み自由学校 | 2026-08-05 | 2026-08-06 | 2026年8月5日（水）・8月6日（木） | 小学4〜6年生 | required | 要予約（抽選、6/24頃開始予定） | null | 公式参照 | null | water_play, craft, experience, nature | 水遊びや木工が好きな子に | https://kfp-tomo.org/archives/9672 | 2026-06-22 | 公式詳細で日程・対象・予約時期・内容が明確。 |
| 1239 | 世界の名犬牧場 | ウルトラわんわん○×クイズ | 2026-07-12 | 2026-07-12 | 2026年7月12日（日）13:00 | どなたでも | not_required | 予約不要 | false | 入場料は公式参照 | false | animal, animal_contact, experience | 犬とのふれあいが好きな子に | https://www.meiken-bokujou.com/ | 2026-06-22 | 公式トップのイベント欄で日時が明確。施設自体も犬ふれあいができ、親子向けとして自然。 |
| 1245 | 群馬県立歴史博物館 | 2026年度 サマーワークショップ | 2026-07-11 | 2026-08-30 | 2026年7月11日〜20日の土日祝、7月22日〜8月30日の開館日 | 小学生以下は保護者同伴 | not_required | 当日館内申込 | false | 無料（当日の観覧券が必要） | true | craft, exhibition, experience | 歴史クラフトが好きな子に | https://grekisi.pref.gunma.jp/wp/wp-content/themes/gunma-rekisi/data/schedule_2026.pdf | 2026-06-22 | 公式2026年度年間予定PDFで開催期間が明確。子ども向けワークショップ枠。 |

## 保留

| facility_id | 施設名 | 確認内容 | official_url | 判定 | 理由 |
|---:|---|---|---|---|---|
| 1171 | 群馬サファリパーク | 2026年 県民・都民 感謝ウイーク年間日程 | https://safari.co.jp/news/6624/ | 保留 | 日付は明確だが、居住地条件の料金キャンペーン中心でイベント体験性が弱い。 |
| 1179 | 群馬県立ぐんま天文台 | 定例観望・施設カレンダー | https://www.astron.pref.gunma.jp/ | 保留 | 親子向きだが定例・通年寄りで、今回の採用行にするには個別日程・対象の確定が不足。 |
| 1200 | 群馬県立観音山ファミリーパーク | 月1回 自然の森を歩こう | https://kfp-tomo.org/archives/11150 | 保留 | 「4月〜11月 月1回土曜日」は確認できたが、個別開催日のテキスト確認が不足。 |
| 1200 | 群馬県立観音山ファミリーパーク | 草木染め講座 | https://kfp-tomo.org/archives/10348 | 保留 | 日付は明確だが、参加費2,000円・講座色が強く、子ども向け label がやや弱い。 |
| 1242 | 高崎市少年科学館 | イベント情報 / プラネタリウム | https://www.takasaki-foundation.or.jp/t-kagakukan/ | 保留 | 公式イベント欄は確認。検索で拾える詳細に2025年イベントが混在し、2026年の子ども向け単発日程を確定できず。 |
| 1297 | 中之条ガーデンズ | NATURAL GARDEN WEEKS / 7月ワークショップ群 | https://nakanojo-g.jp/events-all | 保留 | 日付はあるが、園芸・講演・SNS企画中心で子ども向け label が弱いものが多い。 |
| 1228 | 草津温泉スキー場 | グリーンシーズンのイベント一覧 | https://www.932-onsen.com/green/event/?MSTA_NOTRANS= | 保留 | イベント源はあるが、今回確認できたものは大人向け寄り（怪談等）または詳細日程不足。 |

## 不採用（施設・源泉単位）

| facility_id | 施設名 | registry type/tier | 確認URL | 判定理由 |
|---:|---|---|---|---|
| 1167 | 前橋市中央児童遊園 るなぱあく | official_event_page / weekly | https://lunapark.maebashi-park.com/ | 直近で確認できた日付明確イベントは成人向け街コン。誕生日特典は通年寄りのため不採用。 |
| 1168 | Auto Mirai 華蔵寺遊園地 | official_calendar / monthly | https://kezoujiyuenchi.com/ | 日付明確な親子向け単発イベントを確認できず。 |
| 1172 | アースケア桐生が岡遊園地 | official_event_page / weekly | https://gunma-kanko.jp/spots/75 | 公式施設イベントページとしては弱く、日付明確イベントを確認できず。 |
| 1173 | めんたいパーク群馬 | official_calendar / monthly | https://mentai-park.com/gunma/ | 日付明確な親子向け公式イベントを確認できず。 |
| 1174 | 桐生が岡動物園 | official_news / biweekly | https://www.city.kiryu.lg.jp/zoo/ | 園内ニュースは確認できるが、直近は誕生個体・お知らせ中心で採用条件を満たす日付明確イベントなし。 |
| 1175 | 伊香保グリーン牧場 | official_news / biweekly | https://www.greenbokujo.jp/ | シープドッグショー等は通常営業・通年寄り。日付明確な期間イベントは春フェア等終了済み。 |
| 1182 | 道の駅みなかみ水紀行館（水産学習館） | official_calendar / monthly | https://gunma-kanko.jp/spots/400 | 公式観光スポットページ中心で、施設公式の今後イベント日程を確認できず。 |
| 1183 | 前橋市児童文化センター | official_news / biweekly | https://www.city.maebashi.gunma.jp/soshiki/kyoiku/jidobunkasenta/index.html | 公式ニュース起点は確認。今回の条件を満たす未来イベントを抽出できず。 |
| 1185 | 碓氷峠鉄道文化むら | official_news / biweekly | https://www.usuitouge.com/bunkamura/events/2847/ | 「お座敷列車で旅気分」は車両貸出（3時間25名まで40,000円）で、一般親子向けイベント表示には不向き。 |
| 1186 | 伊香保おもちゃと人形 自動車博物館 | official_calendar / monthly | https://gunma-kanko.jp/spots/10 | 観光スポットページ中心で、日付明確な公式イベントを確認できず。 |
| 1188 | 卯三郎こけし | official_calendar / monthly | https://www.usaburo.com/ | 体験・販売中心。日付明確な公式イベントを確認できず。 |
| 1190 | たくみの里 | official_news / biweekly | https://takuminosato.jp/category/event/ | 直近のイベントは5月以前・春企画中心。未来の親子向け日付明確イベントなし。 |
| 1192 | みなかみフルーツランド モギトーレ | official_calendar / monthly | https://www.mogitore.jp/ | 果物狩り・営業案内中心。会期明確な公式イベントではなく施設体験寄り。 |
| 1195 | ぐんまこどもの国児童会館 | official_calendar / monthly | https://www.pref.gunma.jp/page/1806.html | 児童会館側の個別イベント日程を今回の巡回で採用水準まで確認できず。 |
| 1235 | 道の駅 川場田園プラザ | official_calendar / monthly | https://gunma-kanko.jp/spots/112 | 観光スポットページ中心で、施設公式の未来イベント日程を確認できず。 |
| 1236 | ロックハート城 | official_news / monthly | https://lockheart.info/information/ | お知らせは確認。今回条件を満たす子ども向け日付明確イベントなし。 |
| 1240 | ジャパンスネークセンター | official_news / monthly | https://www.snake-center.com/ | 常設・曜日別イベントやGW終了済み中心。日付要件上、今回は不採用。 |
| 1241 | 草津熱帯圏 | official_news / monthly | https://nettaiken.com/ | 6月イベント告知は確認したが、対象期間の未来日付・詳細を採用水準で確定できず。 |
| 1244 | かみつけの里博物館 | official_news / monthly | https://www.city.takasaki.gunma.jp/site/cultural-assets/1407.html | 公式情報は確認。子ども向け日付明確イベントを抽出できず。 |
| 1246 | 群馬県立近代美術館 | official_news / monthly | https://mmag.pref.gunma.jp/ | 2026年9月中旬まで設備更新工事で休館予定。夏の採用候補なし。 |
| 1247 | 群馬県立館林美術館 | official_news / monthly | https://gmat.pref.gunma.jp/ | 展覧会・一般向け中心。子ども向け label が自然な日付明確イベントを抽出できず。 |
| 1254 | 富弘美術館 | official_news / monthly | https://www.city.midori.gunma.jp/tomihiro/ | 展示・美術館情報中心で、親子向けイベントとしての自然な採用候補なし。 |
| 1255 | ガトーフェスタ ハラダ本社工場見学 | official_event_page / manual_hard | https://www.gateaufesta-harada.com/tour | 工場見学案内が主。日付明確なイベントではなく常設見学。 |
| 1268 | キッズーナ高崎店 | official_event_page / manual_hard | https://www.fantasy.co.jp/kidzoona/shoplist/shop3525/ | 店舗案内中心。日付明確な公式イベントを確認できず。 |
| 1269 | あそびパーク namcoけやきウォーク前橋店 | official_event_page / manual_hard | https://bandainamco-am.co.jp/kids/asobipark/ | ブランドページ中心。店舗別日付イベントなし。 |
| 1271 | 前橋総合運動公園 | official_news / monthly | https://gunma-kanko.jp/spots/1321 | 観光スポット/施設情報中心。子ども向け日付明確イベントを確認できず。 |
| 1272 | 敷島公園 | official_news / seasonal | https://gunma-kanko.jp/spots/1326 | 観光スポット/公園情報中心。日付明確な公式イベントを確認できず。 |

## 巡回対象メモ

### official_event_page / official_calendar（22件）

- 採用あり: 1169, 1170, 1177, 1187, 1198, 1200
- 保留: 1171, 1179, 1242
- 不採用: 1167, 1168, 1172, 1173, 1182, 1186, 1188, 1192, 1195, 1235, 1255, 1268, 1269

### 高利回り official_news（21件）

- 採用あり: 1178, 1180, 1181, 1239, 1245
- 保留: 1228, 1297
- 不採用: 1174, 1175, 1183, 1185, 1190, 1236, 1240, 1241, 1244, 1246, 1247, 1254, 1271, 1272

## tier downgrade / source見直し候補（registry本体は未変更）

| facility_id | 施設名 | 現状 | 候補 | 理由 |
|---:|---|---|---|---|
| 1172 | アースケア桐生が岡遊園地 | official_event_page / weekly | official_news or no_event_source | `gunma-kanko.jp/spots/75` は施設イベント源というより観光スポットページ。施設公式イベント日程が取れない。 |
| 1182 | 道の駅みなかみ水紀行館（水産学習館） | official_calendar / monthly | no_event_source | `gunma-kanko.jp` スポットページ中心で、イベントカレンダーとして機能していない。 |
| 1186 | 伊香保おもちゃと人形 自動車博物館 | official_calendar / monthly | no_event_source | `gunma-kanko.jp` スポットページ中心で、イベントカレンダーとして機能していない。 |
| 1192 | みなかみフルーツランド モギトーレ | official_calendar / monthly | seasonal or no_event_source | 果物狩り・通常体験中心。日付イベント源としては弱い。 |
| 1235 | 道の駅 川場田園プラザ | official_calendar / monthly | official_news or no_event_source | `gunma-kanko.jp` スポットページ中心で、公式イベント日程が取れない。 |
| 1246 | 群馬県立近代美術館 | official_news / monthly | on_hold | 設備更新工事で2026年9月中旬まで休館予定。 |
| 1255 | ガトーフェスタ ハラダ本社工場見学 | official_event_page / manual_hard | no_event_source | 工場見学案内は常設見学で、イベント化対象ではない。 |
| 1269 | あそびパーク namcoけやきウォーク前橋店 | official_event_page / manual_hard | no_event_source | ブランドページ中心で店舗別イベント日程を取れない。 |
