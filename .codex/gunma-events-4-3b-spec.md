# 仕様案: 群馬イベント取得(初回)+ /events/gunma 公開配線(セット)

> 状態: **PM作成の仕様案(オーナーレビュー待ち=GO前)**。実装GO前。役割: 取得・正規化・配線=Codex / PM=レビュー・裏取り・GO判定・push。
> 親仕様(定義の正本): [events-weekly-acquisition-flow-spec.md](events-weekly-acquisition-flow-spec.md) §2(取得期間)・§3(候補)・§4(採用ルール)・§5(正規化)・§6(検証)・§9(県追加コード対応の型)。直近の前例(そのまま踏襲): [ibaraki-events-4-3b-spec.md](ibaraki-events-4-3b-spec.md)。本書は群馬への適用と初回巡回スコープを確定する。
> 前提: 群馬Phase1+2完成(origin/main=`4ce19b2`・施設145・registry gunma=145行・gunma metaは登録済)。正本台帳=[events-source-registry.json](events-source-registry.json)。
> 関連: [[project_events_system_direction]] / [[project_events_build_date_tz]] / [[project_sitemap_committed_static]] / [[feedback_spec_no_min_length]] / [[feedback_address_verification]] / [[project_migration_rollout_gate]](本件はDB migrationなし)。

## 0. 位置づけと方針
群馬の registry(巡回台帳)は Phase1+2 で揃った(gunma 145行)。本タスクは **実イベントを取得して `/events/gunma` を"中身あり"で公開**する。空ページを先に出さないため **取得(#4)→ 配線・公開(#3b)を1セット**で進める(茨城と同方針)。

### 実行フロー(2段ゲート・GOは別々・茨城踏襲)
- **Phase 1(#4-a 候補抽出)= Codex**: registry の群馬巡回対象(§1で確定)を1巡し、公式確認できたイベントを `.codex/event-candidates-gunma-2026-06-XX.md` に「採用/保留/不採用+理由」で出す。**この段階ではコードもevents_data.jsonも触らない**。→ **PMレビュー**(採用ルール§2)→ **オーナーに採用案を提示**。
- **Phase 2(#4-b 正規化 + #3b 配線・公開)= Codex**(Phase 1のPM採用確定後に別GO): 採用分のみ `data/events_data.json` に正規化追記 + `/events/gunma` 配線(§6)+ sitemap再生成 →(ローカルbuild確認)→ **PM裏取り(§9)**→ オーナーGO →**PMがpush**。

> Phase 1 は「データを見ない判断はしない」ため先行。1ディスパッチ=1まとまり(原子的)で投げる([[project_codex_worker_ops]])。

### オーナー確定の継承(2026-06-22)
- **日付要件の厳格化(最重要・茨城と同じ)**: 日付未定・会期未定・通年・常設・「公式参照」のみは**原則 不採用**。一覧に載せるのは `start_date`/`end_date` が明確なものに限定。通年/常設は施設情報に寄せる(イベント化すると古く残る)。**例外**=公式に明確な開催期間 or 定期開催条件があるものだけ PM判断で保留/採用検討。
- 件数の下限なし([[feedback_spec_no_min_length]])。質優先。**採用0件なら #3b 公開は見送り**(空ページを出さない)→ オーナー相談。

## 1. 初回巡回スコープ(★群馬は茨城より母数が大きい=要バウンド)

群馬 registry 145行の内訳(実測):
- tier: weekly 8 / biweekly 8 / monthly 21 / seasonal 59 / manual_hard 26 / no_event_source 17 / not_suitable 5 / on_hold 1。**patrol対象(w/bw/m/seasonal/manual_hard)= 122**(茨城は32)。
- type: official_event_page 11 / official_calendar 11 / official_news 77 / third_party_dependent 23 / none 22 / sns_only 1。
- patrol内訳(tier/type): weekly/official_event_page 8・biweekly/official_news 8・monthly/official_calendar 11・monthly/official_news 10・seasonal/official_news 59・manual_hard/official_event_page 3・**manual_hard/third_party_dependent 23**。

**除外(初回巡回しない)**:
- `no_event_source`17 / `not_suitable`5 / `on_hold`1 / type=`none`/`sns_only` = イベント源泉なし。
- **`third_party_dependent`23(=manual_hardの大半)**: 採用ルール上「第三者まとめ・SNS単独は採用しない」([[feedback_address_verification]])ため、公式URLでの確認ができず採用に至らない。初回は巡回対象外(将来公式源が見つかれば再分類)。
- → 残る**公式源 patrol = 約99**(official_event_page11 + official_calendar11 + official_news77)。

**初回巡回スコープ案(PM推奨=A。最終はオーナー§11で確定)**:
- **A(推奨・高利回り先行)= 専用イベント源 + 県大物**: `official_event_page`(11)+ `official_calendar`(11)= **22施設**(専用イベント/カレンダー=日付付きイベントが取れる確度が最も高い)+ 県大物/主力で `official_news`(seasonal/monthly)のうち約15〜25施設(草津温泉/伊香保グリーン牧場/ぐんまこどもの国/群馬サファリ/観音山ファミリーパーク/川場田園プラザ/るなぱあく/敷島公園/中之条ガーデンズ 等)。**初回 ≈ 40件前後**(茨城32と同規模・1ディスパッチで完走可能)。**「40件前後」は固定上限でなく初回ディスパッチの目安=明らかに高利回りの県大物 official_news が近接して見つかればPM判断で多少増やしてよい**(オーナー確定 2026-06-22)。残り `official_news` ロングテール(~50)は次の巡回波で。
- B(網羅一括)= 公式源99を一括巡回。網羅的だが大型1パス=長時間・report-hangリスク・候補docが肥大。
- いずれも採用は日付要件で絞られる(巡回数≠採用数)。

> **registry tier再検証を兼ねる**: 巡回した源が実際にはイベントを出さない/日付が取れない場合、Codexは候補docに「tier downgrade候補(seasonal→no_event_source 等)」を理由付きで記録(将来の巡回効率化。registry本体の書換は本タスクではしない=別途PM判断)。

## 2. 採用基準(親仕様§4-1・茨城と同一)
採用 = 次を**すべて**満たす: ①既存 `facility_id`(群馬の新旧145件のいずれか)に紐づく ②**公式URL**で内容確認できる(第三者のみ不可) ③子ども・親子向き ④開催日が明確(`start_date`/`end_date`が引ける、または会期が公式明示) ⑤表示期間に該当(親仕様§2) ⑥`recommended_for_label`が自然に書ける。
不採用/保留: 受付終了・大人向け=不採用 / **日付未定・会期未定・通年・常設・「公式参照」のみ=不採用** / 第三者のみ=不採用 / label不自然=保留。**迷ったら載せない**。

## 3. 単日 / 期間イベントの扱い(茨城§3と同一)
- 単日: `start_date=end_date="YYYY-MM-DD"`。期間: 会期を `start_date`/`end_date`。**`end_date`が自動非表示の主キー**。会期未定/通年/常設=原則不採用。
- 表示可視性は `isVisibleEvent`(lib/events.ts): `status∈{scheduled,ongoing}` かつ `end_date`未来orNull かつ `source_checked_at`が新しい(県別=30日以内)かつ `official_url`がhttp(s) かつ `facility_id`実在。未来の確定イベント(7月・夏休み)は表示OK(クイックフィルタ該当外になるだけ)。

## 4. 確認項目(候補1件ごと・親仕様§3/§5・茨城§4と同一)
公式URL(一覧+詳細・PDF告知可)/ 開催日 / 対象年齢(`age_label`)/ 予約要否(`reservation`/`reservation_label`)/ 料金(`is_free`/`price_label`)/ 屋内外(`is_indoor`)/ 雨天中止有無 / 変わりやすい情報は断定しない(labelで「公式参照」)。

## 5. events_data.json へ入れる条件(採用分のみ・親仕様§5-1・実装準拠 `lib/events.ts` の `EventItem`)
`id`(`evt-<facility_id>-<YYYYMM>-<連番>`・一意)/ `facility_id`(実在)/ `prefecture`(**"gunma"**)/ `title` / `summary`(親子目線1〜2文・誇張NG)/ `start_date`・`end_date` / `date_label` / `time_label` / `price_label` / `reservation_label` / `age_label` / `recommended_for_tags`(統制20語のみ=types/facility.ts `RecommendedForTag`)/ `recommended_for_label`(必須)/ `recommended_for_note` / `is_free` / `is_indoor` / `reservation` / `tags` / `official_url`(公式・http(s)・第三者禁止)/ `source_urls` / `source_checked_at`(**実確認日=JST・未来日にしない**)/ `source_notes` / `status`(scheduled/ongoing)/ `display_priority`(既定50)/ `image`(原則 null)。
- `metadata.total_events` 加算(現 **55** → +採用数)。`metadata.prefectures` に **"gunma"** 追加(§6)。
- **既存イベント(6県・現55件)は変更しない**(追記のみ)。
- ⚠️**ビルド日TZ**([[project_events_build_date_tz]]): `getBuildDateString()` は Asia/Tokyo 固定で修正済(`lib/events.ts`)。だが**デプロイ後に /events/gunma の「掲載中N件」が想定どおり出るか必ず確認**(N=0なら鮮度/TZを疑う)。`source_checked_at` をデプロイ当日JSTにしても age>=0 になる(修正済)が、念のため確認。

## 6. /events/gunma 配線の範囲(#3b・コード確定リスト・茨城§6と同型)
現コード実測に基づく**最小変更点**(各リストで群馬は ibaraki の次に追加):
1. `lib/events.ts`(L16付近)— `EventPrefecture = Extract<PrefectureId, ...>` に **`"gunma"` を追加**(型)。
2. `data/events_data.json` — `metadata.prefectures`(現 `["tokyo","kanagawa","yamanashi","chiba","saitama","ibaraki"]`)に **`"gunma"` を追加**(→ `/events/[prefecture]` の `generateStaticParams` が `/events/gunma` を静的生成。`dynamicParams=false`)。
3. `app/events/page.tsx`(L20・L22)— ハブの `title`/`description` の県名列挙「東京・神奈川・山梨・千葉・埼玉・茨城」に **「群馬」を追加**。県カードは `eventPrefectures` 反復で**自動追加**(アイコン `prefectureIconImages["gunma"]` は Phase1で存在)。
4. `next-sitemap.config.js`(L27の次)— `additionalPaths` に **`await config.transform(config, "/events/gunma"),` を追加**。
5. **sitemap再生成 + commit**(§7)。
- 県ラベル「群馬県」は `getPrefectureMeta("gunma")` で自動解決(Phase1で meta 存在)。`isEventPrefecture("gunma")` は metadata 追加で true(施設ページ「群馬のイベントをもっと見る→」表示条件)。**ラベル/アイコンの新規追加は不要**。

## 7. sitemap 更新([[project_sitemap_committed_static]])
`public/sitemap-0.xml` は本番が直接配信する**コミット済み静的ファイル**。`/events/gunma` 追加には §6-4 追記 + `npm run build`(postbuildでnext-sitemap)→ 生成 `public/sitemap-0.xml` を **commit** 必須。config変更だけ/CDN purge/--forceでは反映されない。commit対象は `public/sitemap-0.xml`(他生成物に差分が出たら確認)。

## 8. 施設ページへの表示影響(コード変更不要)
採用イベントを持つ群馬施設の詳細に「🎪 この施設の今後のイベント」節(最大3件)が**自動表示**(`components/FacilityEvents.tsx`・県非依存)。0件施設は非表示。節下部に「群馬県のイベントをもっと見る →」(`isEventPrefecture` true)。公式リンク別タブ・PDFは「公式PDFを見る↗」。

## 9. 公開後の確認(PM裏取り・親仕様§6・茨城§9準拠)
1. 全 `facility_id` が facilities_data に実在(群馬 join切れなし)。
2. `official_url` 有効(http(s)・公式ドメイン・第三者でない・開ける・詐称ドメインなし)。
3. 終了済み(`end_date<today`)非表示。`source_checked_at` 未来日なし。
4. **`/events/gunma` 200・「掲載中N件」想定どおり(N>0)**(TZ事故再発チェック)。
5. `/events` ハブに群馬カード(掲載中件数)・ハブtitleに群馬。
6. 採用施設の施設ページにイベント節表示。0件施設は非表示。
7. クイックフィルタ(今週末/今月/屋内/無料/予約不要/好き)が動く。
8. **既存6県のイベント(現55件)が不変**(構造diff・新規追加分のみ差分)。
9. `sitemap-0.xml` に `/events/gunma` を含む。
10. `data/facilities_data.json` 不変(eventsは別ファイル)。registry(900件)不変。
11. `npm run lint` / `npm run build` PASS。
12. console/pageerror 0(/events・/events/gunma・採用施設ページ・PC1280/SP375。Google Maps embed の console.debug は除外)。

## 10. スコープ外(やらない)
- 継続的な週次運用サイクルの定常化(初回1巡+公開まで)。
- 群馬以外の新規イベント。registry の再分類(本体書換)。tier downgrade は候補docに記録のみ。
- 施設データ(facilities_data.json)の修正。
- events_data.json と #3b 配線4ファイル以外への変更。
- 公式画像/ロゴ/キャラクターの転載(`image` は原則 null)。
- DB migration(本件は events_data.json=静的データのみ。Supabase不要 [[project_migration_rollout_gate]])。

## 11. オーナー確認ポイント(本仕様GO前)
1. **2段ゲート**(Phase 1 候補抽出→PMレビュー→採用提示 / Phase 2 正規化+配線+公開)で進めてよいか。
2. **初回巡回スコープ=案A(専用イベント源22 + 県大物 official_news ≈ 計40前後・推奨)** でよいか。それとも **案B(公式源99を網羅一括)** か。third_party_dependent 23 と no_event_source/not_suitable/none は初回除外でよいか。
3. 初回公開は**件数下限なし・質優先・採用0件なら公開見送り**でよいか。
4. 表示は「**未来の確定イベント(夏休み/7月含む)も載せる**」(今週末/今月に限定しない)でよいか。
5. #3b 配線範囲(§6の4点+sitemap)でよいか。
6. Phase 1 から Codex 投入してよいか(投入はGO後)。
