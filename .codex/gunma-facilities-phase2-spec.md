# 仕様(実装GO待ち→GO後実装): 群馬県 施設データ追加 Phase 2 一括バッチ(+76件 → 群馬~145件)

> **ステータス: PM作成・オーナーGO済(2026-06-22 スコープ=次回候補76件すべて追加・保留5は後送り)**。役割: 調査・収集・整形・実装=Codex / PM(memorips-claude)=レビュー・裏取り・GO判定・**push**。1件ずつの承認は不要。
> 関連正本: 候補台帳 `.codex/gunma-candidates-full-2026-06-22.md`(150件)/ 4分類 `.codex/gunma-stepB-review.md` / Phase1仕様 `.codex/gunma-facilities-phase1-spec.md`(remap・コード波及の正本) / 前例 `.codex/ibaraki-facilities-phase2-spec.md` / 標準フロー [[project_national_rollout_flow]]。
> 一般手順は `facility-research-workflow.md` §A STEP4〜10 を正本とし、本書は **(a)Phase2採用76件・基準 (b)Phase1で済んだコード波及との差分** を定義する。

---

## 0. 方針(オーナー確定 2026-06-22)
- **台帳の次回採用候補76件すべて**を本データ化して掲載 → 群馬 **69 → ~145件**(本データ化時に落ちた分があれば確定値を報告)。
- **保留5件(No 32/51/58/105/119)は今回入れない**=台帳に温存(別途検証で後送り)。
- **施設追加と registry行追加を同一バッチ**で([[feedback_new_facility_registry_gate]])。
- **本文品質は主力だけ厚く・その他は最低限**(全件重リライト不要・下限字数なし [[feedback_spec_no_min_length]])。
- **camp / water-play / ski-snow / animal-contact は既存 category_id に remap・新カテゴリは作らない**(§2)。
- 既存11県データ(群馬Phase1の69件含む)・既存イベント(events_data)を壊さない。
- これは **Phase1で済んだ新県コード波及の「2回目」ではない**。Phase2は**施設データ追加 + registry追記 + metadata件数更新 + sitemap再生成**が主(§4)。型/icons/MapView/descriptions/audit bbox/geocode重心/sync mapは Phase1(`f75788d`)で追加済=原則再変更不要(§4で再点検のみ)。

---

## 1. 採用76件(台帳のNo指定・この76件だけをPhase2に入れる)

> 元データ(公式URL・住所・親子向き一言)は台帳 `.codex/gunma-candidates-full-2026-06-22.md` の同No行。公式URL・住所は**推測補完禁止・実確認のみ**([[feedback_address_verification]])。

採用No(台帳No基準・計76):
- **theme-park(2)**: 5 ロックハート城 / 7 草津温泉BanZip TENGU
- **動物→zoo(4)**: 13 浅間牧場茶屋(animal-contact→zoo) / 14 世界の名犬牧場(animal-contact→zoo) / 15 ジャパンスネークセンター(zoo) / 16 草津熱帯圏(zoo)
- **science-museum(2)**: 20 高崎市少年科学館 / 24 みどり市大間々博物館(コノドント館)
- **museum(11)**: 28 かみつけの里博物館 / 29 群馬県立歴史博物館 / 30 群馬県立近代美術館 / 31 群馬県立館林美術館 / 34 桐生明治館 / 35 高山社跡 / 36 楽山園 / 37 中之条町歴史と民俗の博物館ミュゼ / 38 玉村町歴史資料館 / 39 わたらせ自然館 / 40 富弘美術館
- **experience・craft(13)**: 42 ガトーフェスタハラダ本社工場見学 / 44 地球屋ハルナグラス / 49 群馬まいたけセンター / 50 ヤマキみなかみ工場 / 52 岩秀織物 / 53 USUI AKIKO GALLERY / 55 榛東村ぶどう郷フルーツ狩り / 56 小倉ぶどう郷 / 57 昭和村旬野菜収穫体験(道の駅あぐりーむ昭和) / 59 群馬の水郷揚舟 谷田川めぐり / 60 赤岩渡船 / 61 千代田町サイクリングロード / 63 草木湖カヌー・カヤックツアー
- **indoor-play(3)**: 65 キッズーナ高崎店 / 66 あそびパーク namcoけやきウォーク前橋店 / 68 あいのやまの湯
- **park(14)**: 72 前橋総合運動公園 / 73 敷島公園 / 74 環境システム荻窪公園 / 77 浜川運動公園 / 79 倉渕せせらぎ公園 / 81 境御嶽山自然の森公園 / 82 東部運動公園 / 84 県立多々良沼公園 / 85 小野池あじさい公園 / 87 ふじの咲く丘 / 90 吉岡町城山みはらし公園 / 92 ふるさとの広場ちびっこベース / 94 御正作公園 / 95 邑楽町シンボルタワー未来MiRAi(→viewpoint)
- **water-play→remap(7)**: 97 四万甌穴(scenic) / 99 バラギ湖(→nature-park) / 100 相俣ダム赤谷湖(→scenic) / 101 諏訪峡(scenic) / 102 道の駅月夜野矢瀬親水公園(→park) / 103 磯部簗(→scenic) / 104 大輪公園(park)
- **nature-park・scenic(7)**: 107 覚満淵 / 112 桜山公園 / 114 妙義山 / 116 道の駅オアシスなんもく / 118 道の駅うえの / 122 中之条ガーデンズ(→park) / 124 道の駅八ッ場ふるさと館
- **camp→nature-park(6)**: 129 町営温川キャンプ場 / 131 みかぼ高原オートキャンプ場 / 132 グリーンパークふきわれ / 133 榛名湖オートキャンプ場 / 134 あづま森林公園キャンプ場 / 135 休暇村嬬恋鹿沢キャンプ場
- **ski-snow→ski(6)**: 139 オグナほたか / 140 ホワイトワールド尾瀬岩鞍 / 143 ノルンみなかみ / 145 奥利根スノーパーク / 146 パルコール嬬恋リゾート / 147 万座温泉スキー場
- **川場補完(1)**: 150 青龍山 吉祥寺(→nature-park)

**= 計76件**(theme2 + zoo4 + science2 + museum11 + exp/craft13 + indoor3 + park14 + water7 + nature/scenic7 + camp6 + ski6 + 川場1)。掲載 群馬 69+76 = **~145**。

**今回入れない=保留5件**: No 32 原美術館ARC / 51 朝倉染布 / 58 インターナショナルタウン体験 / 105 いずみ総合公園 / 119 森林セラピー(上野村)。台帳に温存(削除しない)。

---

## 2. category_id remap(確定・新カテゴリを作らない)
台帳のcategory_id案に**現行データに存在しない値**がある。本データ化時に既存20カテゴリへ寄せる(Phase1と同方針):
- `ski-snow`(No 139,140,143,145,146,147) → **`ski`**(既存)
- `camp`(No 129,131,132,133,134,135) → **`nature-park`**(athletic設備が主なら athletic 可・変えたらPM報告)
- `animal-contact`(No 13 浅間牧場茶屋 / 14 世界の名犬牧場) → **`zoo`**。ふれあいは recommended_for_tags(animal_contact/animal_feed)・things_to_do・description で補完
- `water-play` → No 99 バラギ湖=**`nature-park`** / No 100 相俣ダム=**`scenic`** / No 102 矢瀬親水公園=**`park`** / No 103 磯部簗=**`scenic`**(No 97四万甌穴=scenic・101諏訪峡=scenic・104大輪公園=park は台帳案が既存IDのためそのまま)
- `viewpoint`(No 95 未来MiRAi) → **`viewpoint`**(既存)
- 既存IDがある案(theme-park/zoo/science-museum/museum/experience/craft/indoor-play/park/nature-park/scenic/viewpoint)はそのまま。
- 最終 category_id は**既存20カテゴリのいずれか**(park/museum/experience/indoor-play/nature-park/scenic/zoo/theme-park/science-museum/hot-spring-pool/art-museum/athletic/aquarium/craft/viewpoint/ski/indoor-theme-park/fruit-picking/hotel/game-center)。**新カテゴリ禁止**。

---

## 3. データ項目(全件・厳守)
正本型=`types/facility.ts` の `Facility`。新フィールド作らない。`facilities` 配列末尾に76オブジェクト追加。
- `id`=既存最大+1から連番(衝突厳禁) / `slug`=既存命名規則 / `prefecture`=`"群馬県"` / `prefecture_id`=`"gunma"`(Phase1で型追加済)。
- `rain_friendly`=**◎/△/× 単一値**(「雨の日OK」タグを復活させない [[project_rain_tag_consolidation]])。
- `tags`=`FacilityTag` 統制語彙のみ / `recommended_for_tags`=統制20語のみ([recommended_for_tags_rules.md])。
- **provenance全件必須**: `source_urls` / `source_checked_at`(未来日なし・JST実確認日) / `data_quality_status`(採用分は原則`confirmed`・bbox外/公式確認できないものは`needs_web_check`で座標確定しない) / `source_notes`。
- `latitude`/`longitude`=Nominatim(1req/s)等→**群馬bbox内**検証(Phase1で audit bbox 追加済)。bbox外は確定せず`needs_web_check`。
- 内陸県=海なし。水系は川遊び/親水公園/温泉プール/噴水/湖畔へ寄せる(磯遊び/seaside_playなし)。

---

## 4. コード波及(Phase1で大半完了済=本Phase2は差分のみ)
群馬は Phase1(`f75788d`)で PrefectureId / icons 3辞書 / descriptions / MapView(PREF_COLORS/PREF_LABELS/DEFAULT_PREFS) / audit bbox / geocode重心 / sync map / 「11県」文言 / アイコン資産 をすべて追加済。**Phase2でこれらの再追加は不要**。Phase2で必要なのは:

### 4-A データ(metadata件数更新)
- `data/facilities_data.json` `metadata.prefectures` の群馬を `count: 69 → 145`(本データ化確定数)。`total_facilities` `1225 → ~1301`(確定数)。
- **県数表現「11県」は不変**(県は増えない)=site_description等の文言変更なし。
- descriptions.ts の群馬 highlights 等に件数の直書きがあれば更新(原則なし=確認のみ)。

### 4-B sitemap(コミット済み静的ファイル [[project_sitemap_committed_static]])
- `npm run build` で `public/sitemap-0.xml` 再生成→**commit必須**(新施設76 URL)。lastmodは毎回ドリフトするのでURL集合差分で確認(+76・-0)。

### 4-C 再点検のみ(変更が出たらPM報告)
- `scripts/audit-data-quality.mjs` の群馬bbox/TARGET/PREFS/ID_BY_PREFECTURE は Phase1追加済=再追加不要。audit実行で群馬76件が拾われることだけ確認。
- `app/facilities/page.tsx` `PREFECTURES` に群馬は追加済=再追加不要。

---

## 5. 本文品質(主力だけ厚く・他は最低限)
- **主力~10件**(description濃化＋things_to_do充実＋USP4観点①体験の具体②対象年齢/季節③立地・規模④親子目線)。提案リスト(規模・人気・遊び場性で選定。最終はCodexが微調整可・変えたらPM報告):
  - No 73 敷島公園(前橋・ボート池/ばら園/大規模) / No 72 前橋総合運動公園(アスレチック/プール/水遊び) / No 79 倉渕せせらぎ公園(高崎・県内最大級ループ式ローラーすべり台) / No 5 ロックハート城(高山村・テーマ観光) / No 15 ジャパンスネークセンター(太田・ユニーク人気) / No 16 草津熱帯圏(草津・雨天屋内動物園) / No 20 高崎市少年科学館(高崎・雨天プラネタリウム) / No 122 中之条ガーデンズ(大規模ガーデン) / No 84 県立多々良沼公園(館林・邑楽/沼畔大型自然公園) / No 102 道の駅月夜野矢瀬親水公園(みなかみ・遺跡/遊具/BBQ/ホタル)
- **残り~66件=最低限品質**(公式確認の事実ベースで description 1〜2文＋things_to_do 数点)。**詰め物・水増し・下限字数なし** [[feedback_spec_no_min_length]]。同一ブランド類似(3項目以上同義NG)・大型公園の埋め草系を固有要素へ。
- 道の駅/工場見学/ぶどう狩り/渓谷/スキー場など観光寄り施設も「親子で何ができるか」を1〜2文で事実ベースに。断定的な順位・受賞は年・出典がなければ書かない。

---

## 6. registry 同梱(恒久ゲート・76行を同一バッチで追加 [[feedback_new_facility_registry_gate]])
- `.codex/events-source-registry.json` に76施設の行を追加(824 → **~900**)。
- 各行: facility_id / name / prefecture=`"gunma"` / event_source_type(6種: official_event_page/official_news/official_calendar/third_party_dependent/sns_only/none) / patrol_tier(8種: weekly/biweekly/monthly/seasonal/manual_hard/no_event_source/not_suitable/on_hold) / official_event_url(weekly/biweekly/monthly/seasonal/manual_hard は**非null必須**・manual_hardはnote理由) / official_event_url_secondary / last_checked_at(JST) / note。Phase1/3aと同方法。
- **巡回tier目安**(Codexが公式イベントページ実確認で確定): 道の駅/大型公園/テーマ施設/スキー場は seasonal〜monthly、観光・渓谷・キャンプ場は no_event_source/not_suitable に寄りやすい。実確認で確定。
- meta更新: `total` 824→~900 / `per_prefecture_count.gunma` 69→~145 / `tier_count` 加算 / `prefectures` の "gunma" は既存(再追加不要)。**既存824行は不変=追記のみ**。
- ※registry追記は **/events/gunma 公開とは別物**。EventPrefecture型・events_data の metadata.prefectures・ハブtitle・next-sitemap additionalPaths は **Phase2で触らない**(events公開=次の別GO)。

---

## 7. 検証ゲート(PM裏取り・標準チェックリスト準拠)
施設バッチ:
- [ ] 既存11県count不変(群馬以外の10県base一致: 静岡73/長野71/山梨69/東京191/千葉127/栃木125/埼玉127/新潟127/神奈川141/茨城100)・**既存群馬69件含む既存施設 deep-equal 不変**・events_data差分0。
- [ ] 新カテゴリ0(既存20のみ)・rain単一・tags/recommended統制語彙のみ。
- [ ] `node scripts/audit-data-quality.mjs` で**群馬分の high/medium=0**。※severity_countsは全県グローバル値なので、**県単位は issue詳細ファイルを facility_id で突合**(茨城教訓)。
- [ ] 座標=群馬bbox内・重複0(既存全件と name/住所/座標近接。既存Phase1の69件との重複も確認)・公式URL/住所実確認・provenance4点全件・詐称ドメインなし。
- [ ] `npm run lint` / `npx tsc --noEmit` / `npm run build` PASS。
- [ ] sitemap再生成で新施設76 URL混入・commit。URL集合差分で確認(+76/-0・lastmod除外)。
registry:
- [ ] 既存824行不変(追記のみ)・他県不変・meta整合(total/per_pref.gunma/tier_count)。
- [ ] 76行 facility_id実在・prefecture="gunma"・必須tierのofficial_url非null・http(s)・last_checked_at未来日なし。
本番確認(PM push後・Codex実機Playwright・読み取り専用):
- [ ] `/prefecture/gunma` が~145件表示。`/map` に群馬マーカー数が「N施設」表記と一致(群馬~145)。
- [ ] 既存10県・既存イベント・群馬Phase1施設に退行なし。console error/pageerror 0(PC1280/SP375。Google Maps embed の `console.debug` はブロッカー除外 `abf5438`)。
- [ ] served=origin/main=期待commit。total施設~1301・群馬~145・registry~900 を報告。

---

## 8. 進め方(GO後・段取り)
- 起点 = `git checkout -B gunma-facilities-phase2 origin/main`(最新main=`abf5438`)。**push禁止**(PMレビュー→オーナー後追い→PMがpush)。
- **1ディスパッチ=このバッチ一括**(細切れにしない)。最終化前に**スクショ/dev server等を残さない**(report-hang予防 [[project_codex_worker_ops]])。
- 段取り: §1の76件を `facility-research-workflow.md` §A STEP4〜10で本データ化(§2 remap適用・provenance・座標bbox検証・タグ統制)→ §4 metadata件数更新・sitemap再生成・コード再点検 → §6 registry同梱 → audit/lint/tsc/build → §7 検証 → PM報告。
- 役割=実装Codex/レビューPM([[feedback_role_split]])。報告経路のDB競合・report-hangは [[project_codex_worker_ops]]。
- 完了報告に必ず: ①total施設・群馬count・registry件数(各確定値) ②audit群馬high/medium=0の詳細突合 ③lint/tsc/build結果 ④sitemap差分(+N/-N) ⑤既存10県count不変+群馬Phase1 69件不変の確認 ⑥branch名とcommit hash ⑦push していないこと。
