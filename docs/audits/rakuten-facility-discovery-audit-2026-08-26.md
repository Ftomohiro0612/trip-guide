# 楽天トラベル観光体験 施設逆引き discovery 追補監査（2026-08-26）

> 履歴注記（2026-08-27）: child-use evidenceはOwner改定によりcanon採用必須条件ではなく任意metadataとなった。今後のRakuten reverse discoveryはFacilityOps正本のidentity・所在地・現行営業・常設施設適格性を必須条件とする。旧基準の残存14件は[child-use policy再判定監査](./rakuten-child-use-policy-rejudgment-2026-08-27.md)で全件解決した。

## 結論

PR #72 で広く `EVIDENCE_INSUFFICIENT` としていた650 identityを再監査し、楽天詳細取得不能196件と、施設identityが見えていた454件を分離した。後者454件は商品詳細と公式一次情報を全件再レビューし、常設・独立・家族向けで、公式サイト、所在地、現行営業、子ども利用条件を確認できた 87施設（86 identity）を追加した。既存FacilityOps掲載基準は変更していない。

| final status | 件数 | 判定 |
|---|---:|---|
| ADD | 122 | 初回36 identityと追補86 identity。追補は87施設をcanonへ追加 |
| DUPLICATE | 80 | 既存または今回追加したcanonの同一施設 |
| NOT_ELIGIBLE | 434 | ツアー、集合場所、レンタル、飲食、単発体験、期間イベント、付帯商品等 |
| RAKUTEN_DETAIL_UNAVAILABLE | 196 | 楽天詳細APIの継続エラーでidentity自体を取得不能 |
| OFFICIAL_EVIDENCE_INSUFFICIENT | 14 | identityは見えるが、公式一次情報の必要4条件を揃えて確定できず |
| **計** | **846** | 抽出した全identity候補 |

## 650件の分離

- 楽天詳細取得不能: **196件**
- 施設identity可視・公式一次情報レビュー対象: **454件**
- 上記454件の再判定: **ADD 86 / DUPLICATE 7 / NOT_ELIGIBLE 347 / OFFICIAL_EVIDENCE_INSUFFICIENT 14**
- ADD 86 identityから **87施設** をcanonへ追加
- `EVIDENCE_INSUFFICIENT` の未分離残件: **0件**

## 掲載判定

1. 楽天掲載は候補発見とチケット導線にのみ使用し、採用根拠にはしていない。
2. 運営主体、自治体、指定管理者等の公式一次情報で施設名、住所、2026年8月時点の営業、子ども料金・年齢・同伴条件を確認した。
3. ツアー、集合場所、移動、レンタル、飲食のみ、予約制の単発体験、期間イベントはNOT_ELIGIBLEとした。
4. ホテル付帯設備や施設単位が曖昧な商品は、独立した家族向け施設として4条件が揃わない限り追加していない。
5. 同一identityに複数の独立店舗・施設が含まれる場合は施設単位へ分解し、それぞれ公式確認した。

## データ品質

- 追補87施設すべてに公式URL、確認日、公式確認メモ、住所、座標、子ども利用条件を付与した。
- 全846 identityの最終判定と楽天商品URL、canon対応は[候補監査JSON](./rakuten-facility-discovery-candidates-2026-08-26.json)に記録した。
- canonは4,740施設から4,827施設へ増加した。
