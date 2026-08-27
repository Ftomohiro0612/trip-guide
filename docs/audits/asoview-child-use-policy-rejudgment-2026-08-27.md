# Asoview child-use policy再判定監査（2026-08-27）

## 結論

Owner policy changeに従い、second-pass後に残った538候補を全件再判定した。child-use evidenceはcanon掲載の必須条件から外し、公式情報がなければ`unknown`として記録する。identity・所在地・現行営業・FacilityOps上の常設施設適格性は引き続き必須で、いずれかが不足する候補はfail-closedとした。Asoview掲載自体は採用根拠に使用していない。

## 最終判定

| status | 件数 |
|---|---:|
| ADD | 21 |
| NOT_ELIGIBLE | 7 |
| OFFICIAL_EVIDENCE_INSUFFICIENT | 510 |
| **計** | **538** |

## 残存不足理由

| 不足理由 | 件数 |
|---|---:|
| ADDRESS_INSUFFICIENT | 111 |
| CURRENT_OPERATION_INSUFFICIENT | 24 |
| IDENTITY_INSUFFICIENT | 0 |
| MULTIPLE_EVIDENCE_INSUFFICIENT | 375 |
| **計** | **510** |

## Canon

- before: 5208
- added: 21
- after: 5229

ADDは全件、監査JSONにidentity・address・current_operationの公式一次根拠とFacilityOps適格性根拠を保持する。child-use metadataは公式根拠がない場合`unknown`で、推測による子ども利用可の断定は行わない。
