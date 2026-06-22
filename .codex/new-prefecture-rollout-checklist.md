# 新県追加 標準フロー チェックリスト(全国展開用)

> 目的: 1県を「施設~100件 + イベント中身あり公開」まで仕上げる手順を**そのまま次県に流用**するための実務チェックリスト。重い設計書ではなく**作業順＋ゲート**。初号機=茨城(2026-06-22完成・施設100/イベント31/registry755)。
> 役割: 調査・実装=Codex / レビュー・裏取り・GO判定・push=PM(memorips-claude)。実装はGO後・1件ずつ承認しない。
> 関連メモリ: 全国展開フロー / 新県コード波及 / イベント仕組み化 / registryゲート。

---

## 0. 原則
- **粒度はバッチ**。過度な分割・往復をしない(新県初回の事故防止で刻むのは可。慣れたら大きく)。ただし**PM裏取りの要点(下記ゲート)は毎回維持**。
- **本番pushはオーナー明示GO後**。preview/裏取り→GO→PMがpush。doc とコード/データのpushは分ける。
- 公式URL・住所・座標・日付は**推測補完禁止**。公式で確認できたものだけ。

## 1. 候補収集(コード/データに触れない)
- [ ] `RESEARCH_METHODOLOGY.md` の**10STEP網羅収集**で候補ユニバースを作る → `.codex/<pref>-candidates-full-<date>.md`。
- [ ] ★STEP4(まとめサイト+公的サイトのクロスチェック)/ ★STEP6(全市区町村0件チェック)を必ず通す。
- [ ] 磯遊び・海遊び(seaside_play)など県特性テーマも拾う(安全情報は本データ化時に付与)。
- [ ] PMが**4分類**(Phase1採用 / 次回採用候補 / 保留 / 不採用)に整理 → `.codex/<pref>-stepB-review.md`。**候補台帳で止めない**=基準充足は次回採用候補として温存(捨てない)。

## 2. Phase 1(高品質初回バッチを公開)
- [ ] **件数目安 = 50〜80件**(初号機の茨城は保守的に46。標準はもっと厚く)。カテゴリ代表＋県の大物＋雨の日屋内＋観光ランドマーク数件。
- [ ] 本データ化 = `facility-research-workflow.md` §A STEP4〜10。
- [ ] **新県コード波及(必須・新県はデータだけで完結しない)**:PrefectureId型 / `lib/icons.ts` / `MapView` / `lib/descriptions.ts` / 監査script `PREFECTURE_BBOXES`・geocode重心 / `PREFECTURES`配列 / **「N県→N+1県」表記の全箇所** / sitemap再生成。正本=「新県コード波及」メモリ。
- [ ] **アイコンは既存47都道府県シリーズを優先**:原画 `.codex/prefecture_aicon/<pref>.png` を透過256×256へ変換して使う。**Codexにゼロから生成させない**(茨城で生成版をオーナーrejectした教訓)。
- [ ] **registry同梱**(§5)。
- [ ] **本文品質=主力だけ厚く・他は最低限**(§3基準)。
- [ ] PM裏取り(§ゲート)→ GO → push → 本番確認。

## 3. イベント取得 + `/events/<pref>` 公開(Phase 1直後に続けて)
- [ ] registryの巡回対象(`patrol_tier ∈ {weekly,biweekly,monthly,seasonal}`)を1巡 → `.codex/event-candidates-<pref>-<date>.md`(採用/保留/不採用+理由)。
- [ ] **採用は日付確定のみ**:`start_date`/`end_date` が明確なもの。**日付未定・会期未定・通年・常設・「公式参照」のみ=不採用**(古く残るため。例外=公式に明確な開催期間/定期開催条件があるものだけ保留)。今週末/今月＋公式告知済みの先(夏休み等)も可。
- [ ] 採用分のみ `events_data.json` に `EventItem` 正規化(`recommended_for_tags`=統制20語・`source_checked_at`=実確認日JST・status=scheduled/ongoing・official_url=公式http(s))。既存イベントは追記のみで不変。
- [ ] **`/events/<pref>` 配線(山梨§9同型・コード4点)**:
  - `lib/events.ts` の `EventPrefecture` に `<pref>` 追加(型)
  - `data/events_data.json` の `metadata.prefectures` に `<pref>` 追加(→`/events/[prefecture]` が静的生成)
  - `app/events/page.tsx` のハブ `metadata.title`/`description` の**県名列挙に追加**(ハードコード)
  - `next-sitemap.config.js` の `additionalPaths` に `/events/<pref>` 追加 → build で sitemap再生成・commit
- [ ] **空ページを出さない**:採用0件なら公開見送り。中身ありで公開。県ラベル/アイコンは Phase1で解決済(`getPrefectureMeta`)。
- [ ] **ビルド日TZ**:`getBuildDateString` はAsia/Tokyo。デプロイ後 `/events/<pref>` の**掲載中N>0**をJST基準で必ず確認(UTC由来の全非表示事故の再発防止)。

## 4. Phase 2(一次完成ライン ~100件・**上限ではない**)
- [ ] 次回採用候補から**早めに追加して施設~100件前後**へ(後回しにしすぎない)。鹿行/県西のような薄いエリア・seaside_play・体験/牧場/camp系を厚く。
- [ ] **~100は「一次完成ライン」であって掲載上限ではない**(オーナー方針 2026-06-22)。候補量・県の規模・需要が大きい県は**Phase2以降で120〜150件以上まで増やしてよい**。台帳の次回採用候補・保留は拡張母数として温存する。
- [ ] **施設追加と registry行追加は同一バッチ**(別フェーズに切らない)。
- [ ] 本文=主力だけ厚く・他最低限。残りはさらに次回(Phase3台帳)へ温存。
- [ ] PM裏取り → GO → push → 本番確認。

---

## 件数目安
| | 施設 | 備考 |
|---|---|---|
| Phase 1 | **50〜80** | 高品質初回バッチ。県の代表が一目で分かる構成 |
| Phase 2 | **→~100(一次完成ライン)** | 次回採用候補から早めに増やす。**~100は上限でない** |
| 以降 | 台帳から継続(120〜150+も可) | 候補量・規模・需要が大きい県は上積み。基準充足は捨てず温存 |

## 主力 vs 最低限 の判断基準
- **主力(厚く・~10件/県)**=大型・知名度・遊び場性が高い県の看板施設。description濃化＋things_to_do充実＋USP(①体験の具体②対象年齢/季節③立地・規模④親子目線の過ごし方)。
- **その他(最低限)**=公式確認の事実ベースで description 1〜2文＋things_to_do 数点。**詰め物・水増し禁止・下限字数なし**。
- 全件重リライトはしない。主力の最終確定は本データ化時に規模/人気で微調整可(PM報告)。

## registry 同梱ルール
- 新規施設を `facilities_data.json` に追加したら、**同じ `facility_id` の行を `.codex/events-source-registry.json` にも必ず追加**(恒久ゲート)。
- 各行: facility_id / name / prefecture / event_source_type(7種) / patrol_tier(8種) / official_event_url(weekly/biweekly/monthly/seasonal/manual_hard は非null必須・manual_hardはnote理由) / secondary / last_checked_at / note。
- meta更新(total / per_prefecture_count / tier_count)。**既存行は不変=追記のみ**。

## category / tag ルール
- **新カテゴリを作らない**。既存 category_id にremap: `camp`→`nature-park`/`athletic`、`water-play`→`park`/`scenic`/`hot-spring-pool`、磯遊び海岸→`scenic`。
- `rain_friendly` は ◎△× の単一値。「雨の日OK」タグを復活させない。
- `recommended_for_tags` は統制20語のみ。

---

## 必須ゲート(PM裏取り・全バッチ共通)
施設バッチ:
- [ ] **既存県count不変**(全既存県の件数を base と一致確認)
- [ ] **既存施設不変**(既存 facility_id の deep-equal・全県)
- [ ] **events_data不変**(施設バッチでは差分0)
- [ ] **新カテゴリ0**(category_id 既存のみ)・rain単一・tags20語
- [ ] **audit**: `node scripts/audit-data-quality.mjs` で**対象県の high/medium=0**。※`severity_counts` の high/medium は**全県グローバル値**(invalid_address等の既存積み残し)なので、**県単位は issue詳細ファイル(`.codex/*_facilities.json`)を facility_id で突合して判定**(グローバル値を県値と読み違えない=茨城の教訓)。
- [ ] **座標**=対象県bbox内・**重複0**(name/住所/座標近接)・**公式URL/住所**実確認・provenance4点。
- [ ] `npm run lint` / `npx tsc --noEmit` / `npm run build` PASS。
- [ ] **sitemap**: build再生成で対象県+新施設URL(+`/events/<pref>`)が入る。**コミット済み静的ファイル**なので commit必須。next-sitemap は `lastmod` を毎回更新するため、**URL集合の差分(lastmod除外)で0**を確認(timestampドリフトは無視可)。

イベントバッチ追加:
- [ ] 既存イベント(他県)不変・facilities_data/registry不変。
- [ ] 採用イベント全件 facility_id実在・prefecture一致・official_url http(s)・status scheduled/ongoing・日付確定・source_checked_at未来日なし。
- [ ] `getVisibleEventsByPrefecture(<pref>)` が **N>0**(JST)。

本番確認(push後):
- [ ] `/prefecture/<pref>` が想定件数(~100)で表示。
- [ ] `/map` に対象県マーカー描画(「N施設を表示中」・マーカー数一致)。
- [ ] `/events/<pref>` 200・掲載中N>0、`/events` ハブに県カード。
- [ ] 既存県/既存イベント退行なし。
- [ ] **console / pageerror 0**(`/prefecture/<pref>`・`/map`・新規/既存施設ページ・`/events/<pref>` × PC1280/SP375。PMはブラウザ非保有→Codex本番Playwright)。※判定は **error/warning + pageerror**。施設詳細のGoogle Maps埋め込み(`init_embed.js`「Search endpoint requested!」)が出す **`console.debug` は全県共通・第三者由来でブロッカーでない**(群馬で厳密解釈の誤NO-GO実例)。
- [ ] served hash = origin/main = 期待commit。total施設数・対象県件数・registry件数を報告。

---

## 茨城で起きた事故・教訓(次県で先回りする)
1. **Phase0 registryがmainから消失(orphan化)**:県追加でlocal mainを作り直した際、registryを載せた旧コミット(`c756589`)が迷子化。**registryはmain上の正本かを着手前に確認**(`git ls-files`)。消えていたら `git show <orphan>:path` で復元して再コミット。
2. **audit高中の読み違え**:`severity_counts.high/medium` は**全県グローバル**(invalid_address等の既存backlog)。県単位は issue詳細ファイルを facility_id で突合して判定する。グローバル値を県値と誤認してブロッカー化しない。
3. **イベントの日付要件**:通年/会期未定/「公式参照」のみは古く残るので**不採用**。一覧は start/end 明確のみ。
4. **ビルド日TZ**:SSGの鮮度判定はビルドサーバTZ依存(VercelはUTC)。`getBuildDateString`=JST固定。デプロイ後に掲載中N>0を必ず確認。
5. **sitemapは静的コミットファイル**:config変更/CDN purge/--force では反映されない。build再生成→commit必須。`/events/<pref>` は `additionalPaths` 明示追加が必要。lastmod は毎回ドリフトするのでURL集合で比較。
6. **`/events/[prefecture]` 自動生成だがハブtitleと sitemap additionalPaths はハードコード**:県追加時に手当て必要。
7. **アイコン**:Codex生成版はrejectされやすい。**既存47都道府県シリーズの原画**から透過変換を優先。
8. **Codex自己申告は必ずコードで裏取り**(「audit 0」も詳細突合で確認した)。
9. **ワーカー運用**:死活は `Get-CimInstance`(CommandLine)で判定し**個数=1**(lock PID一致)。二重起動は二重コミット危険→投入前に解消。完了の正本は**worker ログ `Processed id=N` ＋ branch commit**(agmsg報告はDBロック競合で落ちることがある)。report-hang(commit出るがProcessed出ない)は孤児codex子/dev serverのハンドル保持が真因。最終化前にdev server停止。
10. **新規施設→registryゲート**を毎回履行(欠落NG)。

---

## 次県の入口(テンプレ)
1. PMが `<pref>` の10STEP候補収集を Codex に投入(コード/データ触らない・候補台帳のみ)。
2. PM 4分類レビュー → Phase1件数(50〜80)確定 → 実装GO。
3. Phase1(コード波及+アイコン+registry同梱)→ 裏取り → push。
4. イベント取得+`/events/<pref>`配線 → 裏取り(N>0/TZ)→ push。
5. Phase2 ~100件(一次完成ライン・上限でない。規模次第で120〜150+) → 裏取り → push。
6. 各段で必須ゲート全クリアを確認してから次へ。
