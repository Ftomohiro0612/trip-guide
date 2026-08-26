import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const INVENTORY_PATH = resolve(
  ROOT,
  "docs/audits/asoview-facility-candidates-2026-08-26.json",
);
const QUEUE_PATH = resolve(
  ROOT,
  ".codex/research/asoview-action-review-queue-2026-08-26.json",
);
const REGISTRY_PATH = resolve(ROOT, "data/asoview_facility_actions.json");
const AUDIT_PATH = resolve(
  ROOT,
  "docs/audits/asoview-facility-action-audit-2026-08-26.md",
);
const REVERSE_PATH = resolve(
  ROOT,
  "docs/audits/asoview-reverse-discovery-candidates-2026-08-26.json",
);
const ACTION_REVIEW_AUDIT_PATH = resolve(
  ROOT,
  "docs/audits/asoview-facility-action-reviews-2026-08-26.json",
);

const inventory = JSON.parse(await readFile(INVENTORY_PATH, "utf8"));
const queue = JSON.parse(await readFile(QUEUE_PATH, "utf8"));
const reverse = JSON.parse(await readFile(REVERSE_PATH, "utf8"));

if (!inventory.source.catalog_complete || !queue.source_catalog_complete) {
  throw new Error("refusing to finalize from an incomplete public catalog");
}
if (queue.items.some((item) => item.review_state === "pending")) {
  throw new Error("refusing to finalize with pending exact-match reviews");
}
if (
  reverse.schema_version !== 2 ||
  reverse.identities.some(
    (identity) => identity.status === "OFFICIAL_REVIEW_REQUIRED",
  )
) {
  throw new Error("refusing to finalize before reverse discovery is complete");
}

const allAccepted = queue.items.filter(
  (item) => item.review_state === "accepted",
);
const weakIdentity = allAccepted.filter((item) => !hasStrongIdentity(item));
const identityAccepted = allAccepted.filter(hasStrongIdentity);
const unsafe = identityAccepted.filter(isUnsafeProduct);
const accepted = identityAccepted.filter((item) => !isUnsafeProduct(item));
const rejected = queue.items.filter((item) => item.review_state === "rejected");
const urlUseCounts = new Map();
for (const item of accepted) {
  urlUseCounts.set(item.url, (urlUseCounts.get(item.url) ?? 0) + 1);
}

const byFacility = new Map();
for (const item of accepted) {
  if (urlUseCounts.get(item.url) !== 1) continue;
  const bucket = byFacility.get(item.facility_id) ?? [];
  bucket.push(item);
  byFacility.set(item.facility_id, bucket);
}

const selectedItems = [...byFacility.values()].map(
  (items) => items.sort((left, right) => rank(right) - rank(left))[0],
);
const selectedKeys = new Set(selectedItems.map((item) => item.key));
const offers = selectedItems
  .map((item) => ({
    facility_id: item.facility_id,
    facility_slug: item.facility_slug,
    facility_name: item.facility_name,
    action_type: item.kind === "ticket" ? "ticket" : "experience",
    label:
      item.kind === "ticket"
        ? "アソビューでお得にチケットを探す"
        : "アソビューで体験予約を見る",
    url: item.url,
    verified_at: "2026-08-26",
    display_through: "2026-09-25",
    verification: {
      asoview_title: item.title.replace(/｜アソビュー！$/u, ""),
      same_facility_basis: `${item.facility_name}の名称、${item.prefecture}・市区町村、アソビュー掲載identityが一致`,
      availability_basis:
        item.kind === "ticket"
          ? "当日公開中の個別チケットページ、canonical URL、購入案内を確認"
          : "当日公開中の個別体験ページ、canonical URL、予約案内を確認",
    },
  }))
  .sort((left, right) => left.facility_id - right.facility_id);

const registry = {
  schema_version: 1,
  coverage: {
    audited_at: "2026-08-26",
    facility_canon_count: inventory.facility_canon.count,
    facility_canon_sha256: inventory.facility_canon.sha256,
    asoview_activity_page_count:
      inventory.source.expected_catalog_counts.activity,
    asoview_ticket_page_count: inventory.source.expected_catalog_counts.ticket,
    asoview_base_page_count: inventory.source.expected_catalog_counts.base,
    asoview_public_page_count: Object.values(
      inventory.source.expected_catalog_counts,
    ).reduce((sum, count) => sum + count, 0),
    asoview_terminal_unavailable_page_count: Object.values(
      inventory.source.terminal_unavailable_counts,
    ).reduce((sum, count) => sum + count, 0),
    asoview_actionable_public_page_count:
      inventory.source.actionable_public_page_count,
    candidate_facility_count:
      inventory.reconciliation.candidate_facility_count,
    reviewed_unique_product_count: new Set(
      queue.items.map((item) => item.url),
    ).size,
    reverse_discovery_identity_count:
      inventory.reconciliation.family_reverse_discovery_identity_count,
    reverse_discovery_prefilter_identity_count:
      inventory.reconciliation.reverse_discovery_prefilter_identity_count,
    reverse_discovery_no_family_signal_count:
      inventory.reconciliation.reverse_discovery_no_family_signal_count,
    reverse_discovery_add_count: reverse.coverage.status_counts.ADD,
  },
  offers,
};

await writeFile(REGISTRY_PATH, `${JSON.stringify(registry, null, 2)}\n`, "utf8");

const sharedUrls = [...urlUseCounts.entries()].filter(([, count]) => count > 1);
const actionReviewAudit = {
  schema_version: 1,
  audited_at: "2026-08-26",
  source_catalog_complete: queue.source_catalog_complete,
  item_count: queue.items.length,
  items: queue.items.map((item) => ({
    facility_id: item.facility_id,
    facility_slug: item.facility_slug,
    facility_name: item.facility_name,
    kind: item.kind,
    url: item.url,
    title: item.title,
    description: item.description,
    provider_identity: item.provider_identity,
    candidate_score: item.candidate_score,
    publication_disposition:
      item.review_state === "rejected"
        ? "REJECTED_EXACT_MATCH_OR_AVAILABILITY_GATE"
        : !hasStrongIdentity(item)
          ? "REJECTED_WEAK_PRODUCT_IDENTITY"
          : isUnsafeProduct(item)
          ? "REJECTED_TEMPORARY_OR_BUNDLED_PRODUCT"
          : urlUseCounts.get(item.url) > 1
            ? "REJECTED_SHARED_NON_INDIVIDUAL_URL"
            : selectedKeys.has(item.key)
              ? "PUBLISHED"
              : "QUALIFIED_ALTERNATE_NOT_SELECTED",
    review: item.review,
  })),
};
const audit = `# アソビュー！施設導線監査（2026-08-26）

## Coverage

- Facility canon: ${inventory.facility_canon.count.toLocaleString("ja-JP")}件（SHA-256: \`${inventory.facility_canon.sha256}\`）
- アソビュー公開sitemap: activity ${inventory.source.expected_catalog_counts.activity.toLocaleString("ja-JP")}件 / ticket ${inventory.source.expected_catalog_counts.ticket.toLocaleString("ja-JP")}件 / base ${inventory.source.expected_catalog_counts.base.toLocaleString("ja-JP")}件 / 合計 ${Object.values(inventory.source.expected_catalog_counts).reduce((sum, count) => sum + count, 0).toLocaleString("ja-JP")}件
- 上記のうちHTTP上の利用不可を終端確認: ${Object.values(inventory.source.terminal_unavailable_counts).reduce((sum, count) => sum + count, 0).toLocaleString("ja-JP")}件（候補から除外）
- 正常取得できた公開ページ: ${inventory.source.actionable_public_page_count.toLocaleString("ja-JP")}件
- Identity候補施設: ${inventory.reconciliation.candidate_facility_count.toLocaleString("ja-JP")}件
- 個別商品再確認: ${queue.items.length.toLocaleString("ja-JP")}組
- identity/location/販売中gate通過: ${allAccepted.length.toLocaleString("ja-JP")}組
- 商品title/description/provider identityの強一致不通過: ${weakIdentity.length.toLocaleString("ja-JP")}組
- 期間限定・bundle等の安全側除外: ${unsafe.length.toLocaleString("ja-JP")}組
- exact-match CTA採用: ${offers.length.toLocaleString("ja-JP")}施設
- HTTP/canonical/identity/location/availability gate不通過: ${rejected.length.toLocaleString("ja-JP")}組
- 複数canonに共有される非個別URLの除外: ${sharedUrls.length.toLocaleString("ja-JP")} URL
- Reverse discovery provider identity prefilter: ${inventory.reconciliation.reverse_discovery_prefilter_identity_count.toLocaleString("ja-JP")}件（家族向け施設signalあり ${inventory.reconciliation.family_reverse_discovery_identity_count.toLocaleString("ja-JP")} / signalなし ${inventory.reconciliation.reverse_discovery_no_family_signal_count.toLocaleString("ja-JP")}）
- Reverse discovery最終判定: ADD ${reverse.coverage.status_counts.ADD} / DUPLICATE ${reverse.coverage.status_counts.DUPLICATE} / NOT_ELIGIBLE ${reverse.coverage.status_counts.NOT_ELIGIBLE} / ASOVIEW_DETAIL_UNAVAILABLE ${reverse.coverage.status_counts.ASOVIEW_DETAIL_UNAVAILABLE} / OFFICIAL_EVIDENCE_INSUFFICIENT ${reverse.coverage.status_counts.OFFICIAL_EVIDENCE_INSUFFICIENT}

## Publication contract

- 通常の \`https://www.asoview.com/\` 個別商品URLだけを保存し、query/hash/手作りaffiliate URLは保存しない。
- 施設名、都道府県、市区町村、canonical URL、当日の購入・予約案内が一致したものだけを採用する。
- 期間限定、特別展、イベント、交通・周遊bundle、複数施設共通URLは期限を安全に管理できないため不採用とする。
- CTAはLinkSwitch非動作時も通常URLへ遷移する。全採用商品に再監査期限 \`display_through: 2026-09-25\` を設定し、期限後は自動的に非表示へ倒す。
- 候補・不採用を含む全canon reconciliationは \`docs/audits/asoview-facility-candidates-2026-08-26.json\` を正本とする。
- 個別商品のHTTP/canonical/identity/location/販売中判定と最終publication dispositionは \`docs/audits/asoview-facility-action-reviews-2026-08-26.json\` に記録する。

## Security

- 公開sitemapと未認証の公開商品ページだけを使用した。ValueCommerce/アソビューのログイン、パスワード、Cookie、session、認証トークンは使用・保存していない。
`;
await writeFile(AUDIT_PATH, audit, "utf8");
await writeFile(
  ACTION_REVIEW_AUDIT_PATH,
  `${JSON.stringify(actionReviewAudit, null, 2)}\n`,
  "utf8",
);

console.log(
  `finalized offers=${offers.length} safe_accepted_pairs=${accepted.length} rejected_pairs=${rejected.length} unsafe_pairs=${unsafe.length}`,
);

function rank(item) {
  const preferred = /前売り|入場|入館|1日|ワンデー|チケット/u.test(item.title)
    ? 30
    : 0;
  return (
    (item.kind === "ticket" ? 200 : 100) +
    item.candidate_score +
    preferred -
    Math.min(40, item.title.length / 8)
  );
}

function isUnsafeProduct(item) {
  const text = `${item.title} ${item.description}`;
  const retailComplexCanon = /^(?:イオンモール|三井ショッピングパーク|ららぽーと|[^\s]+アウトレット)/u.test(
    item.facility_name,
  );
  return (
    retailComplexCanon ||
    /完売|売り切れ|SOLD\s*OUT|特別展|企画展|期間限定|イベント|花火|ナイト(?:パス|チケット)?|コンサート|公演|夏休み|冬休み|クリスマス|コラボ|シーズン券|限定|キャンペーン|サンクスデー|WELCOMEデー|県民|早割|周遊|エリアパスポート|人気スポット\d+施設|共通(?:入園)?券|セット券|セットチケット|乗車券|食事券?付|バスセット|電車セット|Subway|複数施設|\d{1,2}\/\d{1,2}|\d{1,2}月\d{1,2}日|20\d{2}年/iu.test(
      text,
    )
  );
}

function hasStrongIdentity(item) {
  const facility = normalizeIdentity(item.facility_name);
  const product = normalizeIdentity(`${item.title} ${item.description}`);
  const provider = normalizeIdentity(item.provider_identity);
  return (
    facility.length >= 4 &&
    (product.includes(facility) ||
      (provider.length >= 4 &&
        (provider.includes(facility) || facility.includes(provider))))
  );
}

function normalizeIdentity(value) {
  return String(value ?? "")
    .normalize("NFKC")
    .toLocaleLowerCase("ja")
    .replace(/[\s\p{P}\p{S}]/gu, "");
}
