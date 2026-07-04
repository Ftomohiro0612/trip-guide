# タスク: official_url(url フィールド)リンク健全性監査 — 全2,180施設

## 背景・きっかけ

千葉「富津公園」(id 885)の登録 URL `https://www.cga-park.or.jp/futtsu/` が
アクセス不能。PM 側で確認したところ **`www.cga-park.or.jp` は NXDOMAIN(存在しない
ドメイン=失効/移転)** で、同ドメインは千葉県立公園クラスタ計9件が依存している:

- id 682 幕張海浜公園 / 683 稲毛海浜公園プール / 702 柏の葉公園 / 710 蓮沼ウォーター
  ガーデン / 721 館山運動公園 / 735 千葉ポートパーク / 738 行田公園 / 755 千葉市花の
  美術館 / 885 富津公園

これは単発ではなく **`url`(旧指定管理者URL・移転済み・404/5xx/SSL不良・リダイレクト
切れ)の横断的なリンク健全性問題**の可能性が高い。まず全施設を機械監査して規模を可視化する。

## 今回のスコープ(厳守)

- **audit-only / docs-only。`data/facilities_data.json` は一切変更しない。**
- URL 差し替えは別バッチ・別コミット・別レビュー(本タスクではやらない)。
- 千葉 `things_to_do` トラックとは混ぜない(別コミット)。
- 成果物は下記3点のみ。

## 成果物(3点)

1. `scripts/audit-official-url-health.mjs` — 新規監査スクリプト(Node単体・依存追加なし・
   既存 `scripts/audit-facility-quality.mjs` / `scripts/audit-data-quality.mjs` の流儀に合わせる)
2. `.codex/official_url_health_audit.json` — 監査結果の正本(構造化JSON)
3. `.codex/official_url_health_audit_summary.md` — 人間向けサマリ

入力: `data/facilities_data.json` の各施設 `url` フィールド(全2,180件が保持)。
**このタスクはネットワークアクセスが必要**(前タスクの品質監査と異なる点)。

## スクリプト要件

### リクエスト方式
- 各 `url` に対し HTTP GET(HEAD は日本のサイトで非対応が多く不正確なので使わない)。
- リダイレクトは追従し、**最終 URL・リダイレクト回数**を記録。
- User-Agent を通常ブラウザ相当に設定(素の fetch UA だと弾くサイトがある)。
- タイムアウト 15秒。**同時実行は20並列程度に制限**(全サイトへ礼儀正しく)。
- 一過性失敗(タイムアウト/5xx/接続断)は **1回だけリトライ**。
- レスポンス本文は `<title>` 抽出のため先頭 ~64KB までで打ち切ってよい(全文DL不要)。
- ネットワークは非決定的なので、meta に「実行日時・非決定性・再実行で結果が変わりうる」旨を明記。

### 分類(classification / 1施設1つ)
以下のいずれかを判定して記録:
- `ok_200` — 最終ステータス 200
- `redirect_ok` — 3xx を経て最終 200(同一ドメイン or 妥当な移転先)
- `redirect_to_toppage` — 元 URL にパスがある(例 `/futtsu/`)のに最終がドメイン直下 `/`
  に着地(= 個別ページ消失の疑い)。**要注意フラグ**
- `redirect_offsite` — 最終ドメインが元ドメインと別(移転の可能性・要目視)
- `not_found` — 404 / 410
- `server_error` — 5xx
- `dns_error` — 名前解決不可(ENOTFOUND / NXDOMAIN 等)
- `ssl_error` — 証明書エラー(期限切れ・ホスト名不一致等)
- `conn_error` — 接続拒否/リセット等その他ネットワーク失敗
- `timeout` — タイムアウト
- `no_url` — `url` が空(想定 0件だが枠は用意)

### 各施設レコードに記録するフィールド
`id, slug, name, prefecture, category, url, status_code, final_url, redirect_count,
same_domain(bool), classification, http_ok(bool), title, title_ok(bool), notes`

### 集計(JSON の summary セクション & summary.md)
- classification 別件数
- **broken 総数**(= ok_200/redirect_ok 以外の合計)
- **ドメイン別ロールアップ**(broken を host でグルーピング。cga-park のようなクラスタが
  一目で分かるように件数降順)
- 県別 broken 件数
- 修正優先度タグ `fix_priority`(high/medium/low)を各 broken 施設に付与。優先度ルール:
  1. **high**: `not_found` / `server_error` / `ssl_error` / `timeout` / `dns_error`
     かつ 施設ページに url が表示されている(下記確認); または県立/市立/大型主力施設
     (name に「県立」「市立」「国営」「公園」「動物園」「水族館」「博物館」「科学館」
     等を含む); または千葉県対象。
  2. **medium**: 上記以外の broken で `redirect_to_toppage` / `redirect_offsite`。
  3. **low**: それ以外(軽微・要目視のみ)。
  ※ url が施設詳細ページに実際に表示されているかを `app/`(施設詳細コンポーネント)で
  確認し、表示有無を meta に記載。表示されている前提で high 判定してよいが、事実は確認する。

### 差し替え先の優先順位(summary.md の運用メモに明記・今回は提案のみ)
1. 施設本人または指定管理者の公式ページ
2. 自治体・都道府県の公式ページ
3. 観光協会など公的に近いページ
4. 民間口コミ/予約/まとめサイトは原則 official_url にしない

## 完了報告(agmsg で PM=memorips-claude 宛)
- broken 総数 / classification 別内訳 / ドメイン別 broken 上位
- 修正優先候補(high)の件数と代表例(**富津公園 id 885 を含む cga-park クラスタ9件**を明示)
- 実行コマンド・所要時間・失敗/未実行があればその旨
- **push は不要**(audit-only・ローカル生成物のみ)。commit するかは PM が判断するので、
  作業ツリーに生成物を置いた状態で報告すること。
