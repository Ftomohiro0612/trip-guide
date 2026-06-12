# url調査 サンプル10件 結果

> 調査日: 2026-06-12 / 調査: Claude Code PM（WebSearch・厳格ルール準拠）
> 方針: url-research-policy.md / 状態: オーナー確認待ち（OKなら残り92件へ展開）

## サマリ

| status | 件数 | 該当 |
|---|---|---|
| confirmed | 5 | id6, id36, id100, id107, id139 |
| likely_ok | 2 | id112, id83 |
| needs_web_check | 2 | id32, id145 |
| needs_human_review | 1 | id26 |
| exclude_candidate | 0 | — |

## 個別結果

| id | 施設 | URL | 種別 | status | 備考 |
|---|---|---|---|---|---|
| 6 | ピュアハートキッズランド浜松志都呂 | https://www.nikke-purekids.jp/shop/hamamatsushitoro/ | official(運営ニッケ) | confirmed | 住所完全一致。※カテゴリは実態「屋内遊び場」寄り（別途検討） |
| 26 | 石人の星公園 遊具広場 | https://www.enshunada.com/ | municipal(県営公園) | **needs_human_review** | **施設は浜松市中田島所在なのに登録住所が磐田市岩室1093**。住所誤記 or 別公園混同。URL反映は保留 |
| 32 | 藤枝市民プールキッズパーク | https://rengejikidspark.com/ | municipal | needs_web_check | 住所・内容一致だが**現名称は「れんげじスマイルホール キッズパーク」**（登録名は旧称）。名称更新は別途判断 |
| 36 | AEONモール富士宮 のびっこ | https://www.aeon.jp/sc/fujinomiya/shop/store/service-193.html | parent_facility(モール公式) | confirmed | 名称・フロア・内容一致 |
| 100 | 黒姫高原スノーパーク | https://www.kurohime-kogen.co.jp/ | official | confirmed | 住所完全一致・営業継続確認 |
| 107 | リサとガスパールタウン | https://www.fujiq.jp/area/lisagas/ | official(富士急) | confirmed | 営業中。旧専用ドメインあるが富士急公式内が正本 |
| 112 | 万力公園動物広場 | https://www.city.yamanashi.yamanashi.jp/site/playground/2270.html | municipal(山梨市) | likely_ok | 住所一致。正式名称は「ふれあい動物広場」の可能性。運営者サイトはSSL切れ |
| 83 | ナガノフォレストビレッジ 森の駅Daizahoushi | https://naganoforestvillage.eternal-story.com/morinoeki/ | official | likely_ok | 名称・内容一致。**所在地は長野市飯綱高原（大座法師池畔）と判明**（登録住所「長野県」のみ→住所補完は別タスク・公式確認ベースで） |
| 139 | 富岳風穴 | https://www.mtfuji-cave.com/contents/wind_cave/ | official(富士急系) | confirmed | 住所・電話・営業時間まで完全一致 |
| 145 | ガラス工房りゅう | null | none | needs_web_check | 公式サイトなし（予約サイト・Instagramのみ）。ルール上まとめサイトは採用せず null |

## 代表的な判断例（基準の運用確認）

1. **confirmed の典型**（id6/100/139）: 公式・運営元ページで名称+住所まで一致確認できたもの
2. **likely_ok の典型**（id112）: 自治体ページで住所一致は取れたが、施設個別ページ（動物広場）の一次情報まで届かなかったもの
3. **needs_web_check の典型**（id145）: 実在は複数ソースで裏付けられるが一次情報URLが存在しない → URLなしのまま status のみ記録
4. **needs_human_review の典型**（id26）: 調査で**登録住所の誤り疑い**が発覚 → URL・statusの機械反映はせず、住所修正タスク（公式確認ベース）とセットで人手判断
5. **副産物の扱い**: 名称変更（id32）・住所特定（id83）・カテゴリずれ（id6）は**このタスクでは反映しない**。調査メモとして残し、別タスクで公式確認ルールに従って修正

## 反映ルール（全件展開時）

- confirmed / likely_ok: url（公式施設ページの場合）+ source_urls + source_checked_at + data_quality_status を反映
- needs_web_check: source_urls（あれば）+ status のみ。url 設定は公式ページがある場合のみ
- needs_human_review / exclude_candidate: **JSON反映前に PM→オーナーレビュー必須**
