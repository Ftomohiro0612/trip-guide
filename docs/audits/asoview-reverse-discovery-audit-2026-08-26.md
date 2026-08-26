# アソビュー！施設逆引き discovery 監査（2026-08-26）

## 結論

アソビュー公開カタログのprovider identityを全件prefilterし、家族向け常設施設のsignalがある 1,653 identityを施設単位で再確認した。アソビュー掲載は候補発見にだけ使い、既存FacilityOps掲載基準は変更していない。運営主体・自治体等の公式一次情報で施設identity、所在地、現行営業、子どもの利用条件を確認できた 224施設だけをcanonへ追加した。

| final status | 件数 | 判定 |
|---|---:|---|
| ADD | 224 | 公式一次情報の4条件を確認しcanonへ追加 |
| DUPLICATE | 448 | 既存canonの同一施設へ解決 |
| NOT_ELIGIBLE | 240 | ツアー、集合場所、飲食、ホテル付帯、単発・期間イベント等 |
| ASOVIEW_DETAIL_UNAVAILABLE | 0 | 公開詳細を取得できず安全側に除外 |
| OFFICIAL_EVIDENCE_INSUFFICIENT | 741 | 公式一次情報の必要4条件が揃わず追加しない |
| **計** | **1653** | 家族向け施設signalを持つ全identity候補 |

## 掲載判定

1. アソビュー掲載、商品名、割引表記はcanon採用根拠にしていない。
2. 公式の現行店舗・施設ページで正式名称、住所、営業時間または現行営業案内、子ども料金・年齢・同伴条件を確認した。
3. 同一チェーンでも店舗ごとにidentityと住所を照合し、公式現行店舗一覧にない店舗は追加していない。
4. ツアー集合場所、レンタルのみ、飲食・宿泊のみ、単発・期間限定イベントはcanonへ追加していない。
5. 全identityの最終判定、アソビューURL、canon対応、公式根拠は[候補監査JSON](./asoview-reverse-discovery-candidates-2026-08-26.json)に記録した。

## セキュリティ

公開ページだけを未認証で確認した。ValueCommerce/アソビューのログイン、パスワード、Cookie、session、認証トークンは使用・保存していない。
