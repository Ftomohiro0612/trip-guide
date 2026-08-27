# Rakuten Travel Experiences child-use policy再判定監査（2026-08-27）

## 結論

Owner policy changeをRakuten reverse discoveryへ適用し、従来`OFFICIAL_EVIDENCE_INSUFFICIENT`だった14件を全件再判定した。child-use evidenceは任意metadataとし、identity・所在地・現行営業・FacilityOps上の常設施設適格性は必須のまま維持した。`RAKUTEN_DETAIL_UNAVAILABLE` 196件、既確定のADD・DUPLICATE・NOT_ELIGIBLEは対象外。

## 旧不足理由

| 旧不足理由 | 件数 |
|---|---:|
| child-use情報だけ | 2 |
| identity不足 | 4 |
| address不足 | 0 |
| current operation不足 | 1 |
| 複数条件不足 | 7 |
| **計** | **14** |

## 最終判定

| status | 件数 |
|---|---:|
| ADD | 6 |
| NOT_ELIGIBLE | 5 |
| OFFICIAL_EVIDENCE_INSUFFICIENT | 3 |
| **計** | **14** |

残存不足は `IDENTITY_INSUFFICIENT` 3件、`CURRENT_OPERATION_INSUFFICIENT` 0件。child-use不足だけを理由に残した候補は0件。

## Child-use metadata

- confirmed: 7
- unknown: 4
- restricted: 2
- not_allowed: 1
- ADD施設のunknown: 1

`restricted` / `not_allowed` は既存の家族向け推薦ガードに従う。

## Canon

- before: 5229
- added: 6
- after: 5235

ADD全件について、監査JSONにidentity・address・current_operationの公式一次根拠、FacilityOps適格性、child-use metadataを保持する。
