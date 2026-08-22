# Memorip Data / SEO Operation Runbook v1.0

> 作成: 2026-07-07 / Claude Code PM ／ v1.0: Fable 上位レビュー(2026-07-07)反映
> 目的: 県追加・things_to_do・description・official_url・SEO crossing pages を **毎回同じ安全手順**で回すための恒久運用ルール。
> 位置づけ: これは**正本(source of truth)**。個別トラックの spec/proposal はこの Runbook のゲートに従う。永続メモリはこの doc へのポインタにする。
> v0.1→v1.0 差分: [H]値レベル忠実性突合 / reviewed copy 凍結による TOCTOU 封じ / §4.0 県追加ゲート新設 / clean-sync 定義(git clean 禁止)/ §1・§6 直列ルール一本化(排他は git 段階のみ)。

---

## 0. 前提とスコープ

- 本番 = `origin/main`(Vercel が main push で自動ビルド。doc-only push でも本番ビルドが1本走る → doc と code/data の push は分ける)。
- 作業コピーは **単一**。PM(Claude Code)と Codex ワーカーが**同じ作業ツリーを共有**する。さらに**複数の PM セッション**が同じワーカー・同じ main を共有しうる。
- Codex = 実装・生成担当。PM = 仕様作成・レビュー・GO/NO-GO・git 反映指示。PM はコードを自分で書かない(レビューと反映指示に徹する)。
- 対象トラック: ①県追加(施設+registry+イベント)②things_to_do 穴埋め ③description 改善 ④official_url 修正 ⑤SEO crossing pages。

---

## 1. 恒久フロー(全トラック共通)

```
[A] 棚卸し・スコープ確定(PM・実データ実測)+ base commit 記録
      │
[B] 仕様書作成(PM・proposal-only 明記・base commit 記録)
      │
[C] Codex へ proposal-only で発注(+ watchdog 同時起動)
      │
[D] PM が全件レビュー(機械チェック + 目視)
      │
[E] reviewed copy を凍結 + sha256 記録(§2)
      │
[F] オーナーへ採用セット提示 → オーナー GO
      │
[G] apply 直前確認(reviewed copy sha256 + base 以降の対象データ変更なし)→ data 反映
      │       ※反映入力は reviewed copy のみ。元 proposal パスは参照しない。
[H] apply 後の差分レビュー(値レベル忠実性突合を含む・§5)
      │
[I] push 前にオーナー GO → push → Vercel 本番確認 → clean/sync
```

**原則**:
1. **[A]〜[F] までは data/code を一切変更しない**(proposal-only。成果物は `.codex/*.json` と spec のみ)。
2. **1 ディスパッチ = 1 コミット(原子的)**。多段タスクを1メッセージに束ねない(途中 HOLD が効かなくなる)。
3. **排他が必要なのは git 段階([G]〜[I])のみ**。git 段階は全トラック・全セッションで常に**単独(同時に1つ)**。proposal 段([A]〜[F])は、いかなるトラックも git 段階に入っていない場合に限り並行可。→ オーナー GO 待ちでパイプライン全停止しないための一本化(§6)。
4. **base commit を spec に記録**([A]/[B])。オーナー GO が日を跨いだら、[G] 直前に「base commit 以降、対象データファイルに変更があれば [A] へ戻って再実測」。

---

## 2. proposal hash ゲート(二重実行・差し替わり事故対策)

Codex 二重実行・proposal の意図しない上書き・別セッションの混線を検出するための**reviewed copy 凍結 + ハッシュ確認**。

1. **[C] 生成時**: Codex に「生成 JSON の sha256 を完了報告に含める」ことを spec で義務化(生成物 = `.codex/<track>-<pref>-batch<N>.json`)。
2. **[E] レビュー確定時(TOCTOU 封じの要)**:
   - PM がレビューを通した JSON(PM 手直しがあれば手直し後)を **`.codex/reviewed/<track>-<pref>-batch<N>.json` へコピーして凍結**する。
   - コピー作成と同時に sha256 を記録(コピー先パス + ハッシュ)。
   - **reviewed copy と sha256 記録への書き込みは PM のみ**。Codex spec に `.codex/reviewed/` や sha256 ファイルへの書き込みを**含めない**(第三者=二重実行 Codex・別セッションが上書きできる場所に置かない)。
3. **[G] apply**:
   - **反映入力は必ず reviewed copy** とし、元の proposal パス(`.codex/<track>...json`)は**以後一切参照しない**(= 確認〜反映の隙間で元パスが書き換わっても無関係にする)。
   - apply 直前に reviewed copy の sha256 を再検証(コピー自体の破損・改変検出)。
   - **apply は冪等な置換型で設計**する。things_to_do/description は id ごと置換で冪等。**events 追加のような append 型は、適用前に id 重複チェックを義務化**(二重 apply で重複投入を防ぐ)。
4. **[H] apply 直後(§5 の値レベル突合)**: data に反映された対象施設の各フィールド値が **reviewed copy の対応値と機械照合で完全一致**することを確認(hash はファイル同一性しか守らない。値の忠実転写はここで守る)。

> **なぜ reviewed copy 凍結か**: 「元パスの hash 確認 → 元パスから反映」は確認と反映の間に競合窓が残る(古典的 TOCTOU)。[E] で別パスに凍結し apply をそのコピーからのみ行えば、競合窓そのものが消える。

---

## 3. トラック分離(data / code / audit / doc / sitemap)

**同一コミットに種類の違う変更を混ぜない**。

| 種類 | 対象 | コミット単位 | Vercel 影響 |
|---|---|---|---|
| data | `data/facilities_data.json` / `data/events_data.json` / **events-source-registry** | トラック×県×batch で1コミット | 本番反映あり |
| code | `app/` `lib/` `components/` 等 | 機能単位で1コミット | 本番反映あり |
| audit | `scripts/audit-*.mjs` + 監査結果 JSON | 監査単位で1コミット | 影響なし(実行物) |
| doc | `docs/` `.codex/*.md` `HANDOFF.md` 等 | doc 単位で1コミット | ビルドは走るが site 無変更 |
| sitemap | `public/sitemap-0.xml`(build 生成物・コミット必須) | **新規 URL を生んだ当該 data/code コミットに同梱** | 本番反映あり |

ルール:
- **data 反映コミットに doc/spec/proposal JSON を混ぜない**(`.codex/*` は原則コミットしない)。
- **県追加時は facilities 追加と registry(同 facility_id 行+巡回区分)を同一 data コミット**(欠落 NG・恒久ルール)。
- official_url 修正(data)と things_to_do 穴埋め(data)は**別コミット**(切り戻し単位を分ける)。
- 監査スクリプトの結果 JSON は「audit コミット」。それを使った data 修正は「data コミット」。混ぜない。
- **新規ページを生む変更は sitemap 再生成を同梱**(「ページはあるが sitemap に無い」不整合ウィンドウを作らない)。
- proposal JSON(`.codex/*-batch*.json`)と reviewed copy(`.codex/reviewed/*`)は**生成物・レビュー資産**でリポジトリ正本ではない → **untracked のまま**(再現は spec + reviewed hash で担保)。**他トラック・他セッションの資産なので削除しない**(§6 clean/sync)。

---

## 4. トラック別ゲート

### 4.0 県追加(施設+registry+イベント)※最も波及が大きい・フルゲート
- **registry 同梱必須**: facilities 追加と `events-source-registry` の同 facility_id 行+巡回区分を**同一 data コミット**(欠落 NG)。
- **コード波及面チェックリスト**(データだけでは済まない): PrefectureID 型 / icons / MapView / descriptions / 監査 script の BBOX 等 / geocode 重心。**正本 = `.codex/ibaraki-facilities-phase1-spec.md` §3**。
- **sitemap 再生成 → 当該コミットに同梱**。
- **prod 検証の期待値は可視件数**(raw − exclude_candidate)。raw 件数で誤 NO-GO しない。
- **イベントは source_checked_at と build TZ(Asia/Tokyo)整合を確認**。UTC ビルドだと age=-1 で全イベント非表示になる罠 → デプロイ後に県ハブ「掲載中 N 件」を必ず確認。
- 施設公開県 ≠ events 公開県 を混同しない。

### 4.1 things_to_do 穴埋め
- **可視ベース**で gap を実測(`data_quality_status !== "exclude_candidate"` を除外・[lib/facilities.ts])。raw 件数で数えない。
- **季節施設は据え置き**(スキー・海水浴・花/果物狩り・花火・祭り等)。恒久 things が誤誘導になるものは対象外にし id を明記。
- 記述基準: 各施設 3〜5 項目・動詞止め・1項目35字以内・具体額/時刻/営業時間/運用情報/マーケ語 禁止・数値/強表現は素材明記時のみ・各項目に `basis_text`(素材引用)必須。
- **3項目を安全に出せない施設は付与せず skip + skip_reason を記録(創作で埋めない)**。下限3項目は skip 逃げ道とセットで初めて水増しを防ぐ。
- **安全注記はハウススタイル固定**: 独立項目・主語「保護者」・括弧で本文に括らない・1施設1回・水辺/高所/自然地形限定・屋内施設には付けない。
- 変更フィールドは `things_to_do` **のみ**。description/category/url/name/address には触れない。
- **PM 検査の必須項目**: 体言止め0・禁止語0・**定型締めフィラーの共通性を全件集計**(薄い素材からの厚化は LLM が同一締め文で水増しする)・安全注記スコープ・素材裏づけ(basis 引用の実在)。

### 4.2 description 改善
- 4要素充足(①一言でどんな施設②具体的に何ができる③年齢の実感④親目線の使い勝手)。
- **字数は上限のみ指定(上限300)。目安下限を spec に書かない**(下限指定は水増しを誘発。「目安 120–180」も裏口になるため書かない)。
- 既存 verified 素材のみ再構成(**創作禁止**)。マーケ表現/捏造評価/季節ピーク断定/具体額/時刻/イベント名 除去。
- 変更フィールドは description(+必要なら USP/things/signature)。fee 欄・座標・id・official_url は不変。
- **PM 検査**: 変更件数ちょうど・非対象 deep-equal・**最終文(締め)の共通性・重複を集計**・カタカナ/数値の新規混入・マーケ/季節スクラブの before/after 確認。

### 4.3 official_url 修正
- **audit-only** と **fix** を分離。fix は**ドメインクラスタ単位**だが、**1件ずつ実ページ検証**(同一 path/同一移転先を仮定しない)。
- proposal 各行に **`verified_url` + `checked_at`(実際に開いて確認した URL と確認日)を必須フィールド化**(「1件ずつ検証」を検証可能にする・住所確認と同じ URL 添付必須思想)。
- timeout/ssl 等は**ブラウザ UA で生存**しうる(FP 多数)→ 確定死(dns/not_found)を優先し、要再検証は目視。
- things_to_do / description とは**別コミット**。

### 4.4 SEO crossing pages
- **単一真実源**(`lib/crossings.ts`)にページ集合を定義。ルート実装は真実源から生成。
- **dynamicParams = false + ガード二重**(パイロット外を生成しない)。doorway/薄いページ量産を回避(閾値 ≥8 施設等)。
- **sitemap は静的コミットファイル**(`public/sitemap-0.xml`)。新ページは `npm run build` で再生成 → **commit 必須**(config 変更/CDN purge だけでは反映されない)。
- 反映後は **GSC 監視**(数日)。**合否基準**: 対象 URL が順次 index 登録され、カバレッジの「ソフト404/重複除外」の増加がゼロなら次バッチ GO。増加検知時は当該バッチ URL を特定し原因分析まで**拡大凍結**。
- auth 系は noindex。sitemap ノイズ(非公開/認証ページ)を除去。
- **data トラックとの結合点**: 施設の追加/exclude 変更で交差ページの施設数が閾値(8)を跨ぐと生成ページ集合が変わりうる → data トラックの [H] に「crossing ページ集合への影響有無」を1行チェックとして足す。

### 4.5 固定施設を持たない主催者のイベント発見レーン

- **位置づけ**: Peatix、こくちーずプロ等のイベントプラットフォームを候補発見に使う補助レーン。施設公式サイト起点の `events-source-registry` tier 運用とは別に実施し、既存 tier・施設収集・source trust の基準を変更しない。プラットフォーム掲載だけを理由に採用しない。
- **巡回頻度**: 公開中の都道府県を4分割し、毎週1バッチ（目安12都道府県）を検索して4週間で全国を一巡する。採用歴のある出張型主催者の主催者ページは毎週確認する。大型連休・春休み・夏休み・冬休みの6週間前からは対象期間の検索を週1回追加する。
- **検索面**: 各プラットフォーム内検索とWeb検索の両方を使う。Peatixでは `site:peatix.com/event/ "{都道府県名または市区町村名}" (親子 OR 子ども OR キッズ) (工作 OR ものづくり OR ワークショップ OR 絵の具 OR アート OR 科学 OR 自然体験)` を基本形とし、プラットフォーム内でも地域名と同じ語群を検索する。類似プラットフォーム追加時も同じ語群・確認ゲートを使い、プラットフォーム専用の採用基準は作らない。
- **候補の一次判定**: 子どもが主体的に参加・体験でき、既存の掲載対象に合うものだけを候補化する。大人向け中心、販売会のみ、オンラインのみ、対象年齢不明、開催済み、中止・延期、会場未確定のものは採用しない。候補から外す場合も、確認日と理由をレビュー記録に残す。
- **掲載前の一次情報確認**: 主催者が公開した当該イベントページ、主催者公式サイト、または会場公式告知を実際に開き、開催日・時間・会場名と所在地・料金・予約方法・対象年齢／保護者同伴条件・開催状態・注意事項を確認する。`official_url` と `source_urls`、`source_checked_at`、`source_notes` は既存ルールどおり必須とし、まとめ記事や検索結果スニペットだけでは掲載しない。ページが取得できない、必須情報が不足する、または中止状態を否定できない場合は HOLD とする。
- **重複と会場モデル**: 追加前に `data/events_data.json` と `data/summer_events_2026.json` を、id・正規化URL・タイトル＋会場＋開催日で突合する。既存施設での開催を一次情報から同定できる場合だけその `facility_id` を使う。固定施設を持たない主催者や一時会場で、既存施設との対応を確定できない場合は、通年一般イベントでも `facility_id: null` と正式な `venue_name` を設定する。施設レコードや registry tier を発見レーンの都合で新設しない。
- **反映後ゲート**: `npm run events:regular:test`、`npm run events:validate`、`npm run events:regular:validate`、`npm run build` を通す。イベント追加はid重複を先に確認し、既存イベントの値を変更しない。

---

## 5. PM 差分レビュー([H])共通手順

**旧コミット版 vs 新版を実照合**(自己申告を信じない):
1. 総件数不変(例 2180)。
2. **変更件数がちょうど target 件数**(proposal id 集合と完全一致)。
3. **対象フィールドのみ差分**・非対象施設は **deep-equal**(1件も動いていない)。
   - **3.5(値レベル忠実性突合・必須)**: 対象施設の変更後フィールド値が **reviewed copy の対応値と機械照合で完全一致**すること(jq/スクリプトで文字列比較。**1文字でも差異があれば NO-GO・[D] へ戻す**)。← apply 経路(Codex の再解釈)での未レビュー文混入を閉じる死角ガード。
4. 除外/据え置き id が**不変**。
5. 禁止語(具体額/時刻/イベント名/マーケ/捏造)の新規混入0。
6. トラック固有チェック(§4)。

**本番 curl 検証の罠(既知)**:
- URL は必ず `/facilities/<slug>`。slug は**データの slug フィールドを実引き**(自作しない)。**低 id はゼロ埋め3桁**(`facility-026`)、高 id は非パディング(`facility-2041`)。誤ると generic フォールバックを「未反映」と誤診する。
- **近隣おすすめカード/things_to_do の埋込 RSC** に別施設のテキストが混入 → grep が別施設由来で FP。**判定はメイン節(heading 直後の該当ブロック)のみ抽出**。
- **meta description は施設自身の値**=近隣カード FP を回避できる清潔な検証シグナル。
- **CSR 化ページ(useSearchParams 等)は curl 生 HTML に出ない** → Playwright か JS チャンク grep。SSR ページ(register 等)は curl 可。
- **push 後の本番確認は新値確認までリトライ**(SSG/CDN 伝播込みで数十秒空振りしうる)。**10分超で未反映ならデプロイ失敗を疑い Vercel 側確認へエスカレーション**。`git ls-remote origin refs/heads/main` は **push 検知でありビルド完了検知ではない**。

---

## 6. 単一 main への直列運用

**恒久ルール(2026-07-06 オーナー確定 / v1.0 で明確化)**: **排他が必要なのは git 段階([G]〜[I])のみ**。git 段階は全トラック・全セッションで常に単独。proposal 段([A]〜[F])は、いかなるトラックも git 段階に入っていない限り並行可(§1 原則3)。

- **別セッション検知**: `from=memorips-claude` でも**自分が送っていない** agmsg メッセージがあれば別 PM セッションが活動中(team が別=cauvix 等は無関係)。ワーカーの親プロセスが**別の claude.exe**なら別セッションが起動・維持している。
- **他トラックが git 段階中**: PM 側の dispatch / commit / fetch をしない(read-only の status/ls-remote/curl は可)。
- git 破壊系(reset --hard 等)の前に `git rev-parse --abbrev-ref HEAD` で現在 branch を確認(ワーカーが共有 HEAD を別 branch に置いていることがある)。
- PM の doc commit は**ディスパッチ前**に済ませるか、ワーカーの `Processed` 後に行う(Running 中の共有作業コピーで git 操作しない)。

**[I] clean/sync の定義**:
1. `git status` で当該トラックの変更が全てコミット済みであること。
2. ローカル main を `origin/main` へ **ff-only 同期**。
3. ビルド生成物の掃除が必要でも **`git clean` は使用禁止**(`.next` 等の個別 `rm -rf` のみ)。**`.codex/` 配下の untracked ファイルは他トラック・他セッションの資産(proposal / reviewed copy / sha256)であり削除しない**。

---

## 7. Codex ワーカー運用(骨子・詳細は正本参照)

> **正本 = 永続メモリ `codex-worker-ops`**(凍結5型・セッション衛生・send.sh 引数順・backtick 罠・復旧手順の全文)。本節は骨子のみ。

**dispatch 前チェック(毎回・4項目)**:
1. ワーカー死活は **`Get-CimInstance`(CommandLine 判定)** で行う(Bash `tasklist` は見落とす)。
2. `-Team memorips` + `codex-worker.ps1` で絞り、**自セッションの claude.exe 由来(ppid=自分)を除外**(検索文字列が自分のコマンドに含まれ自己マッチする)。lock 変数名に `$pid` を使わない。
3. **ワーカー個数 = 1・lock PID 一致**を確認。複数なら重複(二重実行の温床)。ただし**別セッションが維持する worker は勝手に kill しない**(respawn ループになる)。
4. **再送ポリシー**: クリーン再起動時は**未読(read_at NULL)msg は自動再実行=再送不要**、**read 済みで失敗した msg のみ手動再送**。誤再送=二重実行の主要因。

**dispatch 直後に watchdog Monitor を必ず起動**(発注とセットで1アクション):
- 発火条件 = 「worker ログに `Processed message id=N`」or「worker 子 codex.exe が消えた」。
- 死活判定の正 = lock PID の `Get-Process` + `ParentProcessId=<workerPID>` の子 codex.exe(`@(...)` で配列化)+ rollout jsonl 更新。**CommandLine 文字列マッチ単独は使わない**。

**完了の正本**:
- agmsg 報告は**ドロップしうる**(共有 SQLite の WAL ロック競合。孤児 watch.sh/tail 累積が主因)。
- 完了の正本 = worker ログ `Processed id=N` + **git コミット/`origin/main` 前進 + 本番反映**。デプロイ検知は `git ls-remote origin refs/heads/main` の 30s ポーリング Monitor が agmsg 非依存で確実。
- セッション開始時に**現セッション以外の monitor(watch.sh)を kill**(累積すると DB ロック競合)。

---

## 8. 「重くなりすぎない」ための段階化(小粒改修)

全部にフルゲートを課すと回らない。**変更の破壊力でゲートを段階化**:

- **小粒 UI/文言(code, 低リスク)**: proposal-only を省略可。PM レビュー合格を条件にデプロイ GO を PM 委譲(オーナー後追い)。
- **data 一括(things/desc/url)**: フルゲート([A]〜[I]・reviewed copy 凍結・値レベル突合)必須。件数が多く自己申告で穴が出やすい。
- **県追加・crossing 拡大(構造変化)**: フルゲート + §4.0 波及面チェック + GSC 監視。

判断基準: **「本番の既存ページを壊しうるか」「切り戻し単位が明確か」**。壊しうる/曖昧ならフルゲート、無害で局所ならライト。

---

## 9. チェックリスト(dispatch〜push の1枚)

- [ ] [A] 可視ベースで実測・スコープ id 確定・除外 id 明記・**base commit 記録**
- [ ] [B] spec に proposal-only 明記・変更フィールド限定・house-style 注記・base commit
- [ ] [C] ワーカー個数=1・lock 一致を確認 → dispatch → **watchdog 起動**
- [ ] [D] PM 機械チェック + 目視(§4 固有)・締めフィラー集計
- [ ] [E] **reviewed copy を `.codex/reviewed/` へ凍結 + sha256 記録**
- [ ] [F] オーナーへ提示 → GO
- [ ] [G] apply 直前に reviewed copy sha256 + base 以降変更なしを確認 → **reviewed copy から**反映(冪等置換)
- [ ] [H] apply 直後に **値レベル忠実性突合** + 件数/deep-equal/除外不変/禁止語0
- [ ] [I] push 前オーナー GO → push → 本番 curl(slug 実引き・メイン節抽出・リトライ)→ clean/sync(**git clean 禁止**)
- [ ] git 段階が他トラック・他セッションと交錯していない

---

## 付録: 関連正本
- Codex ワーカー詳細: 永続メモリ `codex-worker-ops`
- 施設ページ品質: `.codex/facility-page-info-design-review.md` / `.codex/facility_quality_audit.json`
- SEO: `.codex/seo_p1_crossing_pages_proposal.md` / `lib/crossings.ts`
- 全国展開フロー: 永続メモリ `national-rollout-flow` / `.codex/ibaraki-facilities-phase1-spec.md`
- 県追加コード波及: `.codex/ibaraki-facilities-phase1-spec.md` §3
