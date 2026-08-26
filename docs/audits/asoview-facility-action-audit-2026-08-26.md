# アソビュー！施設導線監査（2026-08-26）

## Coverage

- Facility canon: 5,051件（SHA-256: `dea178c38bb6572e66fb05c97c0486d4992e35452efea6f0dfc4ae2f597e2257`）
- アソビュー公開sitemap: activity 27,406件 / ticket 9,712件 / base 13,037件 / 合計 50,155件
- 上記のうちHTTP上の利用不可を終端確認: 242件（候補から除外）
- 正常取得できた公開ページ: 49,913件
- Identity候補施設: 1,066件
- 個別商品再確認: 3,731組
- identity/location/販売中gate通過: 3,437組
- 商品title/description/provider identityの強一致不通過: 8組
- 期間限定・bundle等の安全側除外: 1,346組
- exact-match CTA採用: 658施設
- HTTP/canonical/identity/location/availability gate不通過: 294組
- 複数canonに共有される非個別URLの除外: 74 URL
- Reverse discovery provider identity prefilter: 12,533件（家族向け施設signalあり 1,653 / signalなし 10,880）
- Reverse discovery最終判定: ADD 224 / DUPLICATE 448 / NOT_ELIGIBLE 240 / ASOVIEW_DETAIL_UNAVAILABLE 0 / OFFICIAL_EVIDENCE_INSUFFICIENT 741

## Publication contract

- 通常の `https://www.asoview.com/` 個別商品URLだけを保存し、query/hash/手作りaffiliate URLは保存しない。
- 施設名、都道府県、市区町村、canonical URL、当日の購入・予約案内が一致したものだけを採用する。
- 期間限定、特別展、イベント、交通・周遊bundle、複数施設共通URLは期限を安全に管理できないため不採用とする。
- CTAはLinkSwitch非動作時も通常URLへ遷移する。全採用商品に再監査期限 `display_through: 2026-09-25` を設定し、期限後は自動的に非表示へ倒す。
- 候補・不採用を含む全canon reconciliationは `docs/audits/asoview-facility-candidates-2026-08-26.json` を正本とする。
- 個別商品のHTTP/canonical/identity/location/販売中判定と最終publication dispositionは `docs/audits/asoview-facility-action-reviews-2026-08-26.json` に記録する。

## Security

- 公開sitemapと未認証の公開商品ページだけを使用した。ValueCommerce/アソビューのログイン、パスワード、Cookie、session、認証トークンは使用・保存していない。
