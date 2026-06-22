# 仕様(実装GO済): 群馬県 施設データ追加 Phase 1（新県・コード波及あり）

> **ステータス: 実装GO**（オーナーGO 2026-06-22）。役割: 調査・収集・整形・実装=Codex / PM(memorips-claude)=レビュー・裏取り・GO判定・**push**。
> 関連正本: 候補台帳 `.codex/gunma-candidates-full-2026-06-22.md`（150件）/ 4分類 `.codex/gunma-stepB-review.md` / 標準フロー `.codex/new-prefecture-rollout-checklist.md` / 新県差分の手本 `.codex/ibaraki-facilities-phase1-spec.md`（§3コード波及の正本テンプレ）。
> 一般手順は `facility-research-workflow.md` §A STEP4〜10 を正本とし、本書は **(a)新県ゆえのコード波及 (b)群馬固有の採用69件・基準** を定義する。

---

## 0. 目的・スコープ
- 関東甲信越エリアに **群馬県(`gunma`)** を新規追加。**群馬で関東1都6県(東京/神奈川/千葉/埼玉/茨城/栃木/群馬)が完成**。
- Phase1 = **初回バッチ69件の追加**（台帳150件のPhase1採用69件・No指定は§1）。県の代表が一目で分かる構成（全カテゴリ代表＋県の大物＋雨の日屋内＋ランドマーク）。
- 群馬は `PrefectureId` 等に未登録なので**データだけでなくコード変更を伴う**（§3）。新県は型/icons/MapView/descriptions/監査script/sitemapを入れないと表示崩れ・地図非表示・監査落ちになる。
- 件数の考え方: Phase1=69、Phase2で~100は**一次完成ラインであって上限ではない**。群馬は次回採用候補76＋保留5を拡張母数として温存（捨てない）。

### スコープ外（Phase1ではやらない）
- **イベント公開**: `EventPrefecture` への gunma 追加・`/events/gunma` ルート・ハブtitle県名追加・next-sitemap additionalPaths・週次巡回。→ **Phase1本番化後に別GO**。
- ただし **registry行（69件）はPhase1で同梱**（前向き棚卸し・恒久ゲート §5）。
- 既存10県データの修正（混ぜない）。Phase2の残り施設。

---

## 1. 採用69件（台帳のNo指定・この69件だけをPhase1に入れる）

> 元データ（公式URL・住所・親子向き一言）は台帳 `.codex/gunma-candidates-full-2026-06-22.md` の同No行。公式URL・住所は**推測補完禁止・実確認のみ**。

採用No（台帳No基準・計69）:
- theme-park: **1,2,3,4,6,8,9**（るなぱあく/華蔵寺遊園地/渋川スカイランドパーク/軽井沢おもちゃ王国/群馬サファリパーク/桐生が岡遊園地/めんたいパーク群馬）
- 動物(zoo): **10,11,12**（桐生が岡動物園/伊香保グリーン牧場/神津牧場）
- science-museum: **17,18,19,21,22,23,25**（向井千秋/自然史博物館/ぐんま天文台/ぐんま昆虫の森/神流町恐竜センター/みなかみ水紀行館/前橋児童文化センター）
- museum: **26,27,33**（富岡製糸場/碓氷峠鉄道文化むら/伊香保おもちゃと人形自動車博物館）
- experience・craft: **41,43,45,46,47,48,54,62**（こんにゃくパーク/卯三郎こけし/だるまのふるさと大門屋/たくみの里/たくみの里ガラスの家/モギトーレ/小平の里/神流川清流体験）
- indoor-play・温泉プール: **64,67,69**（こどもの国児童会館/テルメテルメ/カリビアンビーチ）
- park: **70,71,75,76,78,80,83,86,88,89,91,93**（ぐんまこどもの国/ハイノート前橋こども公園/観音山ファミリーパーク/ケルナー広場/群馬の森/華蔵寺公園/つつじが岡公園/ららん藤岡/甘楽総合公園/しんとうふるさと公園/玉村町北部公園/第一三共なかさと公園）
- water(→park/scenic): **96,98**（小平の里親水公園/四万湖）
- nature-park・scenic・viewpoint: **106,108,109,110,111,113,115,117,120,121,123,125,126,127**（赤城大沼/榛名湖/榛名山ロープウェイ/吹割の滝/たんばらラベンダーパーク/めがね橋/なんもく村自然公園/上野スカイブリッジ/野反湖/チャツボミゴケ公園/八ッ場ダム/鬼押出し園/西の河原公園/道の駅あがつま峡）
- camp(→nature-park): **128,130**（川原湯温泉あそびの基地NOA/恐竜王国はこだたみキャンプ場）
- ski: **136,137,138,141,142,144**（草津温泉/丸沼高原/かたしな高原/川場/たんばら/水上高原 各スキー場）
- hot-spring-pool・park: **148,149**（道の駅中山盆地・高山ふれあいパーク/川場田園プラザ）

**次回送り（Phase1に入れない）= 台帳の上記以外（次回採用候補76＋保留5）**。台帳に温存（削除しない）。

### category_id remap（確定・新カテゴリを作らない）
台帳のcategory_id案に**現行データに存在しない値**がある。本データ化時に既存IDへ寄せる:
- `ski-snow`(No 136,137,138,141,142,144) → **`ski`**（既存16件）
- `camp`(No 128,130) → **`nature-park`**
- `water-play` → No 96小平の里親水公園=**`park`** / No 98四万湖=**`scenic`** / No 62神流川清流体験=**`scenic`**
- `animal-contact`(No 11グリーン牧場/12神津牧場) → **`zoo`**（オーナー確定）。ふれあいは recommended_for_tags(animal_contact/animal_feed)・things_to_do・description で補完
- その他（theme-park/zoo/science-museum/museum/experience/craft/indoor-play/hot-spring-pool/park/nature-park/scenic/viewpoint）は既存IDあり=そのまま。
- 最終 category_id は**既存20カテゴリのいずれか**（park/museum/experience/indoor-play/nature-park/scenic/zoo/theme-park/science-museum/hot-spring-pool/art-museum/athletic/aquarium/craft/viewpoint/ski/indoor-theme-park/fruit-picking/hotel/game-center）。

---

## 2. データ項目
正本型=`types/facility.ts` の `Facility`。新フィールド作らない。`facilities` 配列末尾に69オブジェクト追加。
- `id`=既存最大+1から連番（衝突厳禁）/ `slug`=既存命名規則 / `prefecture`=`"群馬県"` / `prefecture_id`=`"gunma"`（§3で型追加）。
- `rain_friendly`=**◎/△/× 単一値**（「雨の日OK」タグ復活させない [[project_rain_tag_consolidation]]）。
- `tags`=`FacilityTag` 統制語彙のみ / `recommended_for_tags`=統制20語のみ（根拠語彙ベース・[recommended_for_tags_rules.md]）。
- **provenance全件必須**: `source_urls`/`source_checked_at`(未来日なし・JST実確認日)/`data_quality_status`(採用分は原則`confirmed`)/`source_notes`。
- `latitude`/`longitude`=Nominatim(1req/s)→**群馬bbox内**検証（§3-D追加後）。bbox外は確定せず`needs_web_check`。
- 内陸県=海なし。summer_water_play等は川遊び/親水公園/温泉プール/噴水へ寄せる（磯遊び/seaside_playなし）。

---

## 3. コード波及（★新県ゆえ必須・`ibaraki-facilities-phase1-spec.md` §3 を正本テンプレに、gunma値で全箇所実施）

**現状値（2026-06-22実測）**: 施設データ=**10県/1,156件**。本バッチで**11県/1,225件**へ。表示文言は「関東甲信越**10県**」→「**11県**」。

### 3-A 自動対応（データのみ）
- `data/facilities_data.json` `metadata.prefectures` に `{ "id":"gunma","name":"群馬県","count":69 }` 追加＋`total_facilities` 1156→1225。`metadata.site_description` 「関東甲信越10県…」→「11県…」。→ `/prefecture/gunma`・県別/カテゴリ/タグページ・sitemap県別URLが自動生成。

### 3-B 型・定数（コード必須）
- `types/facility.ts` `PrefectureId` に `| "gunma"`（無いと型エラー全滅）。
- `lib/icons.ts` `prefectureGradients`/`prefectureIconImages`/`prefectureEmoji` に `gunma` 追加。
- `lib/descriptions.ts` `prefectureDescriptions["gunma"]`（lead/long/highlights）追加。
- `components/MapView.tsx` `PREF_COLORS`/`PREF_LABELS`(例「♨️ 群馬」=温泉県。最終はPM確認)/`DEFAULT_PREFS`(`gunma:true`) 追加。

### 3-C アイコン資産
- **原画 `.codex/prefecture_aicon/gumma.png`（在庫あり・旧ローマ字gumma）を透過256×256へ変換し `public/images/prefectures/gunma.webp` に配置**（既存47都道府県シリーズと同方式）。**ゼロ生成しない**（茨城reject教訓）。資産名・id・パスは全て `gunma` で統一。

### 3-D ハードコード配列・SEO文言（コード必須）
- `app/facilities/page.tsx` `PREFECTURES` 配列: **「栃木県」の直後に「群馬県」を挿入**（関東を固める並び）。
- 「関東甲信越**10県**」→「**11県**」を全箇所: `app/layout.tsx`(L22,L58,L64 description)・`app/facilities/page.tsx`(L22)・`app/map/page.tsx`(L8)・`app/tag/[slug]/page.tsx`・`app/category/[id]/page.tsx`（grep `10県` で全件置換）。keywords に「群馬」追加。

### 3-E スクリプト（監査・座標。無いと監査が群馬を弾く）
- `scripts/audit-data-quality.mjs`: `PREFECTURE_BBOXES["群馬県"]`（粗いbbox。目安 lat 35.98–37.08 / lon 138.39–139.67・公式境界でCodex確定）/ `TARGET_PREFECTURES` / `PREFS` / `PREFECTURE_ID_BY_PREFECTURE` に群馬追加。
- `scripts/geocode.mjs` `PREFECTURE_CENTROIDS` に群馬重心（無いとshizuokaへ誤フォールバック）。
- `scripts/sync-from-sheet.ts` `PREFECTURE_MAP` に `群馬県:"gunma"`。

### 3-F sitemap（コミット済み静的ファイル）
- `npm run build` で `public/sitemap-0.xml` 再生成→**commit必須**（`/prefecture/gunma`＋新施設URL）。lastmodは毎回ドリフトするのでURL集合差分で確認。

---

## 4. 本文品質（主力だけ厚く・他は最低限）
- **主力10件**（description濃化＋things_to_do充実＋USP4観点①体験の具体②対象年齢/季節③立地・規模④親子目線）:
  ぐんまこどもの国(No70) / 群馬サファリパーク(No6) / 観音山ファミリーパーク(No75) / るなぱあく(No1) / 軽井沢おもちゃ王国(No4) / 伊香保グリーン牧場(No11) / こんにゃくパーク(No41) / 神流町恐竜センター(No22) / 碓氷峠鉄道文化むら(No27) / 川場田園プラザ(No149)。
- **残り59件=最低限品質**（公式確認の事実ベースで description 1〜2文＋things_to_do 数点）。**詰め物・水増し・下限字数なし** [[feedback_spec_no_min_length]]。
- 主力は規模/人気での微調整可（変えたらPM報告）。

---

## 5. registry 同梱（恒久ゲート・69行を同一バッチで追加）
- `.codex/events-source-registry.json` に69施設の行を追加: facility_id / name / prefecture=`"gunma"` / event_source_type(6種: official_event_page/official_news/official_calendar/third_party_dependent/sns_only/none) / patrol_tier(8種: weekly/biweekly/monthly/seasonal/manual_hard/no_event_source/not_suitable/on_hold) / official_event_url(weekly/biweekly/monthly/seasonal/manual_hard は**非null必須**・manual_hardはnote理由) / official_event_url_secondary / last_checked_at(JST) / note。
- **巡回tier目安**（stepB §6・Codexが公式イベントページ実確認で確定）: weekly~8 / biweekly~8 / monthly~10 / seasonal~18 / 残り~25は no_event_source・not_suitable。巡回対象（weekly〜seasonal+manual_hard）= 約44件。
- meta更新: `total` 755→~824 / `per_prefecture_count.gunma`=69 / `tier_count` 加算 / `prefectures` に "gunma" 追加。**既存755行は不変=追記のみ**。
- ※registryの `prefectures` 追加と、`/events/gunma` 公開用の `EventPrefecture`/`metadata.prefectures(events_data)` 追加は別物。**後者はPhase1で触らない**（events公開は別GO）。

---

## 6. 検証ゲート（PM裏取り・標準チェックリスト §必須ゲート準拠）
施設バッチ:
- [ ] 既存10県count不変（全県base一致）・既存施設deep-equal不変・events_data差分0。
- [ ] 新カテゴリ0（既存20のみ）・rain単一・tags/recommended統制語彙のみ。
- [ ] `node scripts/audit-data-quality.mjs` で**群馬分の high/medium=0**。※severity_countsは全県グローバル値なので、**県単位は issue詳細ファイルを facility_id で突合**（茨城教訓2）。
- [ ] 座標=群馬bbox内・重複0（既存全件と name/住所/座標近接）・公式URL/住所実確認・provenance4点全件・詐称ドメインなし。
- [ ] `npm run lint` / `npx tsc --noEmit` / `npm run build` PASS（PrefectureId漏れは型エラーで即検知）。
- [ ] sitemap再生成で `/prefecture/gunma`＋新施設URL混入・commit。URL集合差分で確認（lastmod除外）。
registry:
- [ ] 既存755行不変（追記のみ）・他県不変・meta整合（total/per_pref/tier_count/prefectures）。
- [ ] 69行 facility_id実在・prefecture="gunma"・必須tierのofficial_url非null・http(s)・last_checked_at未来日なし。
本番確認（PM push後・Codex実機Playwright）:
- [ ] `/prefecture/gunma` が69件表示。`/map` に群馬マーカー（色/ラベル/アイコン・「N施設」一致）。
- [ ] `app/facilities` 県プルダウンに群馬。タグ/カテゴリ県別セクションに群馬。文言「11県」反映。
- [ ] 既存10県・既存イベントに退行なし。console/pageerror 0（PC1280/SP375）。
- [ ] served hash=origin/main=期待commit。total施設1225・群馬69・registry~824 を報告。

---

## 7. 進め方（GO後・段取り）
- 起点 = `git checkout -B gunma-facilities-phase1 origin/main`（最新main＝docコミット反映後）。**push禁止**（PMレビュー→オーナー後追い→PMがpush）。
- **1ディスパッチ=このバッチ一括**（細切れにしない）。最終化前に**スクショ用dev server等を残さない**（report-hang予防 [[project_codex_worker_ops]]）。
- 段取り: §1の69件を `facility-research-workflow.md` §A STEP4〜10で本データ化（remap適用・provenance・座標bbox検証・タグ統制）→ §3 全コード波及 → §3-C アイコン変換 → §5 registry同梱 → audit/lint/tsc/build/sitemap → §6 検証 → PM報告。
- 完了報告に必ず: ①total施設・群馬count・registry件数 ②audit群馬high/medium=0の詳細突合 ③lint/tsc/build結果 ④sitemap差分 ⑤branch名とcommit。
