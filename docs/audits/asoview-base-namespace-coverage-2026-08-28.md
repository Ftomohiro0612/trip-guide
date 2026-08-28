# Asoview base namespace coverage recovery — 2026-08-28

## Outcome

Asoviewの公開施設ページをsitemapだけで収集していたため、sitemapに載らない公開 `base/{id}` がidentity抽出前に脱落していた。これはcanon rejectではなく、reverse-discovery候補台帳へ到達しないpre-ledger intake coverage missである。

観測済みID帯 `1..169999` を再探索し、同じ原因で漏れた公開ページを既存canonとの同一性確認とFacilityOps審査へ通した。563施設をcanonへ追加し、施設数は5,237から5,800になった。canonの意味、独立Facility基準、CTA基準は変更していない。

## Root cause

`scripts/fetch-asoview-public-catalog.mjs` はAsoviewのsitemap URLを固定入力としており、sitemap外の公開 `base/{id}` を探索する経路がなかった。さらに、一時的な403応答を終端結果として扱っていたため、再試行可能な取得失敗もcoverageを狭め得る状態だった。

今回、完了済みbase名前空間スキャンをcatalog入力へ必須で合流し、403を含む一時応答にはbackoff付き再試行を適用した。名前空間スキャンが未完了の場合は通常実行をfail closedにする。

## Exhaustive coverage

| Stage | Count |
| --- | ---: |
| Observed allocation band | 1–169,999 |
| Sitemap entries | 13,043 |
| Off-sitemap targets completed | 156,956 / 156,956 |
| Public off-sitemap base pages | 12,890 |
| Extracted identities | 11,667 |
| Previously reached the candidate ledger | 716 |
| Newly recovered before relevance filtering | 10,951 |
| No family signal | 8,672 |
| Facility-family candidates adjudicated | 2,279 |

機械的な同一性・適格性確認の後、1,868件を公式一次情報によるFacilityOps reviewへ送り、処理エラー・未判定ともに0件で完了した。

| Final disposition for 2,279 candidates | Count |
| --- | ---: |
| ADD | 563 |
| DUPLICATE | 402 |
| NOT_ELIGIBLE | 69 |
| OFFICIAL_EVIDENCE_INSUFFICIENT | 1,245 |

`OFFICIAL_EVIDENCE_INSUFFICIENT` は、同名別施設の混同、自治体・運営者フッター住所の誤採用、運営実体や現況を公式一次情報で確定できないケースを追加せずに閉じた結果を含む。

Machine-readable evidence:

- `docs/audits/asoview-base-namespace-coverage-2026-08-28.json`
- `docs/audits/asoview-base-namespace-facilityops-2026-08-28.json`
- `scripts/data/asoview-base-namespace-facilityops-adjudications-2026-08-28.json`

## Nagashima Spa Land

Asoview `base/155456` は公開・indexableだったがsitemap外であり、従来の候補台帳には一度も到達していなかった。今回のcoverage auditでは `prior_ledger_reached: false` として回収され、既にcanonへ追加済みのナガシマスパーランド（facility ID 7510）との完全一致により `DUPLICATE` となった。これは施設の不採用判定ではなく、intake recovery後のcanon重複判定である。

- Asoview: https://www.asoview.com/base/155456/
- Official: https://www.nagashima-onsen.co.jp/spaland/

## CTA audit

採用または既存canonへ同定できた965 identityについて、1,081 provider pageと紐づく個別商品を再確認した。有効な新規個別商品は0件で、CTA追加も0件だった。ナガシマに紐づいた2商品は、ふるさと納税返礼品、およびナガシマスパーランドとジャンボ海水プールのbundleであり、既存CTAルール上の単独施設向け有効商品には該当しない。

- `docs/audits/asoview-base-namespace-offers-2026-08-28.json`

## Content contract and validation

追加563施設にも既存契約を適用し、hero summaryは施設種別と主要体験を1〜2文で示し、descriptionは具体的な体験・構成・特徴・季節性に限定した。住所・料金・営業時間・対象年齢・確認注意のテンプレート反復は入れていない。

全5,800 Facility detailの最終監査結果は違反0件だった。

- `docs/audits/facility-content-contract-final-2026-08-28.json`
- Recovery validation: 1,868 reviews / 563 additions / 0 errors
- Lint: 0 errors（既存の未使用変数warning 2件のみ）
- Production build: passed（5,962 static pages）

## Policy boundary

今回の変更はintake coverageの修復と既存FacilityOps基準の適用であり、canonの意味、掲載基準、独立Facility identity、seasonal permanent facility、CTA eligibilityの新しいpolicy判断は導入していない。
