import { readFile, writeFile } from "node:fs/promises";

const facilitiesData = JSON.parse(
  await readFile(new URL("../data/facilities_data.json", import.meta.url)),
);
const evidence = JSON.parse(
  await readFile(new URL("../data/craft_category_evidence.json", import.meta.url)),
);
const reclassifications = JSON.parse(
  await readFile(
    new URL("../data/craft_category_reclassifications.json", import.meta.url),
  ),
);
const visible = facilitiesData.facilities.filter(
  (facility) => facility.data_quality_status !== "exclude_candidate",
);
const byId = new Map(visible.map((facility) => [facility.id, facility]));
const reclassifiedByPrefecture = new Map();
for (const record of reclassifications.records) {
  const prefectureId = byId.get(record.facility_id)?.prefecture_id;
  if (!prefectureId) continue;
  reclassifiedByPrefecture.set(
    prefectureId,
    (reclassifiedByPrefecture.get(prefectureId) ?? 0) + 1,
  );
}
const exclusionIds = [
  ...evidence.audit_exclusions.display_only,
  ...evidence.audit_exclusions.temporary_only,
  ...evidence.audit_exclusions.misclassified_or_no_evidence,
  ...evidence.audit_exclusions.cross_category_reviewed.map(
    ({ facility_id }) => facility_id,
  ),
];

const sparseExplanations = {
  fukushima:
    "可視120施設を横断したが、抽出できた美術館候補は展示または開催日依存で、通常・反復制作の公式根拠を確認できなかった。県内に実施設が存在しないという意味ではなく、現行可視データの施設収録範囲には追加調査余地がある。",
  fukuoka:
    "通常制作を確認できた上野焼陶芸館と大川テラッツァを採用。ほかの工作候補は展示、単発ワークショップ、開催確認案内に留まった。",
  hiroshima:
    "湯来交流体験センターと筆の里工房を採用。食品づくり、工場見学、展示、単発企画だけの候補は契約に従って除外した。",
};

const prefectures = facilitiesData.metadata.prefectures.map((prefecture) => {
  const currentPrimaryCraft = visible.filter(
    (facility) =>
      facility.prefecture_id === prefecture.id &&
      facility.category_id === "craft",
  ).length;
  const before =
    currentPrimaryCraft + (reclassifiedByPrefecture.get(prefecture.id) ?? 0);
  const publicRecords = evidence.records.filter(
    (record) => byId.get(record.facility_id)?.prefecture_id === prefecture.id,
  );
  const craftTypes = Object.fromEntries(
    evidence.craft_types.map((type) => [
      type,
      publicRecords.filter((record) => record.craft_types.includes(type)).length,
    ]),
  );
  const excluded = exclusionIds.filter(
    (id) => byId.get(id)?.prefecture_id === prefecture.id,
  ).length;
  const crossCategoryAdded = publicRecords.filter(
    (record) => byId.get(record.facility_id)?.category_id !== "craft",
  ).length;
  const after = publicRecords.length;

  return {
    prefecture_id: prefecture.id,
    prefecture_name: prefecture.name,
    before_primary_craft_visible: before,
    after_verified_public: after,
    delta: after - before,
    added_from_non_craft_primary: crossCategoryAdded,
    excluded_or_rejected_candidates: excluded,
    primary_category_reclassifications: reclassifiedByPrefecture.get(prefecture.id) ?? 0,
    craft_types: craftTypes,
    sparse_result_explanation:
      after <= 2
        ? sparseExplanations[prefecture.id] ??
          "全可視施設を横断し、通常・反復制作の公式根拠を確認できた施設だけを採用した結果。未採用候補は展示、単発、食品、見学、または根拠不足として記録した。"
        : null,
  };
});

const output = {
  audited_at: evidence.audited_at,
  visible_facilities_scanned: visible.length,
  prefectures_scanned: facilitiesData.metadata.prefectures.length,
  planned_count_before_required_refinement: 193,
  final_verified_count: evidence.records.length,
  count_change_reason:
    "Ownerの全都府県再確認要件を受け、全3,732可視施設の候補抽出を再実施し、他カテゴリ内で通常・反復制作を公式情報から確認できた32施設を追加した。",
  prefectures,
};

await writeFile(
  new URL("../data/craft_category_prefecture_audit.json", import.meta.url),
  `${JSON.stringify(output, null, 2)}\n`,
  "utf8",
);

const header = [
  "# クラフト体験 全都府県L2実装監査",
  "",
  `- 監査日: ${output.audited_at}`,
  `- 横断対象: 可視${output.visible_facilities_scanned.toLocaleString("ja-JP")}施設 / ${output.prefectures_scanned}都府県`,
  `- 公開件数: ${output.final_verified_count}件（計画193件から+${output.final_verified_count - 193}件）`,
  `- 件数変更理由: ${output.count_change_reason}`,
  "",
  "craft_typesは複数付与のため、種類別件数の合計は公開施設数と一致しない。",
  "",
  "| 都府県 | 改善前 | 公開後 | 差分 | 他主カテゴリ追加 | 除外・棄却 | 主カテゴリ再分類 | 工作・アート | 陶芸 | ガラス | 木工 | 染め・織り | 紙・印刷 | アクセサリー・小物 | 伝統工芸 |",
  "|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|",
];
const rows = prefectures.map((row) =>
  [
    row.prefecture_name,
    row.before_primary_craft_visible,
    row.after_verified_public,
    row.delta,
    row.added_from_non_craft_primary,
    row.excluded_or_rejected_candidates,
    row.primary_category_reclassifications,
    row.craft_types["工作・アート"],
    row.craft_types["陶芸"],
    row.craft_types["ガラス"],
    row.craft_types["木工"],
    row.craft_types["染め・織り"],
    row.craft_types["紙・印刷"],
    row.craft_types["アクセサリー・小物"],
    row.craft_types["伝統工芸"],
  ].join(" | "),
).map((row) => `| ${row} |`);
const sparse = prefectures
  .filter((row) => row.sparse_result_explanation)
  .flatMap((row) => [
    `### ${row.prefecture_name}（${row.after_verified_public}件）`,
    "",
    row.sparse_result_explanation,
    "",
  ]);
await writeFile(
  new URL("../docs/craft-category-prefecture-audit.md", import.meta.url),
  `${[...header, ...rows, "", "## 0件・少数県の説明", "", ...sparse].join("\n")}\n`,
  "utf8",
);

console.log(JSON.stringify({ prefectures: prefectures.length, public: evidence.records.length }));
