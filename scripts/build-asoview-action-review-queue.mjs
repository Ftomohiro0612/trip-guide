import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const INVENTORY_PATH = resolve(
  ROOT,
  "docs/audits/asoview-facility-candidates-2026-08-26.json",
);
const OUTPUT_PATH = resolve(
  ROOT,
  ".codex/research/asoview-action-review-queue-2026-08-26.json",
);

const inventory = JSON.parse(await readFile(INVENTORY_PATH, "utf8"));
let priorByKey = new Map();
try {
  const prior = JSON.parse(await readFile(OUTPUT_PATH, "utf8"));
  priorByKey = new Map(prior.items.map((item) => [item.key, item]));
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}

const items = [];
for (const facility of inventory.facility_coverage) {
  for (const candidate of facility.candidates) {
    if (!['ticket', 'activity'].includes(candidate.kind)) continue;
    if (candidate.score < 60) continue;
    const key = `${facility.facility_id}|${candidate.url}`;
    const prior = priorByKey.get(key);
    const reusablePrior =
      prior &&
      prior.title === candidate.title &&
      prior.description === candidate.description &&
      prior.provider_identity === (candidate.provider_identity ?? "") &&
      prior.review?.status !== 0 &&
      !prior.review?.rejection_reasons?.some((reason) =>
        String(reason).startsWith("fetch_error:"),
      );
    items.push({
      key,
      facility_id: facility.facility_id,
      facility_slug: facility.facility_slug,
      facility_name: facility.facility_name,
      prefecture: facility.prefecture,
      address: facility.address,
      kind: candidate.kind,
      url: candidate.url,
      title: candidate.title,
      description: candidate.description,
      provider_identity: candidate.provider_identity ?? "",
      candidate_score: candidate.score,
      review_state: reusablePrior ? prior.review_state : "pending",
      review: reusablePrior ? prior.review : undefined,
    });
  }
}

const output = {
  schema_version: 1,
  generated_at: new Date().toISOString(),
  source_catalog_complete: inventory.source.catalog_complete,
  item_count: items.length,
  pending_count: items.filter((item) => item.review_state === "pending").length,
  items,
};

await writeFile(OUTPUT_PATH, `${JSON.stringify(output, null, 2)}\n`, "utf8");
console.log(
  `review queue items=${output.item_count} pending=${output.pending_count} catalog_complete=${output.source_catalog_complete}`,
);
