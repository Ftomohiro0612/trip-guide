# アソビュー！施設逆引き discovery 監査（2026-08-27 second-pass）

> 履歴注記（2026-08-27）: 本監査時点の4条件判定は、同日Owner改定によりchild-useを任意metadataへ変更した。残存538件の再判定結果は `asoview-child-use-policy-rejudgment-2026-08-27.md` を正とする。

## 結論

初回監査で `OFFICIAL_EVIDENCE_INSUFFICIENT` だった741施設候補を全件second-passした。アソビュー掲載は候補発見にだけ使用し、FacilityOpsの4条件（施設identity、所在地、現行営業、子ども利用条件）は変更していない。同一公式ドメインの施設ページ、店舗一覧、料金、FAQ、予約、利用案内、公式PDF、自治体ページまで再探索し、4条件が公式一次情報で揃った157施設だけをcanonへ追加した。

## 741件の初回不足理由

| 不足理由 | 件数 |
|---|---:|
| IDENTITY_INSUFFICIENT | 19 |
| ADDRESS_INSUFFICIENT | 415 |
| CURRENT_OPERATION_INSUFFICIENT | 8 |
| CHILD_USE_INSUFFICIENT | 5 |
| MULTIPLE_EVIDENCE_INSUFFICIENT | 294 |
| **計** | **741** |

## Second-pass最終判定

| final status | 件数 | 判定 |
|---|---:|---|
| ADD | 157 | 公式一次情報の4条件を確認しcanonへ追加 |
| DUPLICATE | 11 | 既存canonの同一施設へ解決 |
| NOT_ELIGIBLE | 35 | ツアー、集合場所、飲食・宿泊のみ、単発・期間イベント等 |
| OFFICIAL_EVIDENCE_INSUFFICIENT | 538 | 4条件の一部が公式一次情報で揃わずfail-closed |
| **計** | **741** | 全件review complete |

残存538件の不足理由は、住所86件、現行営業11件、子ども利用30件、複数条件411件。identity単独不足は0件である。

## Canon反映

- second-pass前: 5,051施設
- second-pass追加: 157施設
- second-pass後: 5,208施設
- discovery全体のADD: 381施設
- discovery全体の最終内訳: ADD 381 / DUPLICATE 459 / NOT_ELIGIBLE 275 / OFFICIAL_EVIDENCE_INSUFFICIENT 538

## 証拠と掲載判定

1. ADD全施設について、identity・住所・現行営業・子ども料金／年齢／同伴条件の4証拠を公式URLと抜粋付きで記録した。
2. アソビュー、Google Maps、旅行・口コミ・まとめサイト、第三者SNS投稿はcanon採用根拠に使用していない。
3. 別店舗・類似名称・系列施設の住所や条件は流用せず、exact facilityで揃わない候補は不足理由付きで非採用とした。
4. 741件の最終判定は[second-pass最終監査JSON](./asoview-reverse-discovery-second-pass-final-2026-08-27.json)、全1,653件の統合結果は[候補監査JSON](./asoview-reverse-discovery-candidates-2026-08-26.json)に記録した。

## セキュリティ

公開ページだけを未認証で確認した。ValueCommerce/アソビューのログイン、パスワード、Cookie、session、認証トークンは使用・保存していない。
