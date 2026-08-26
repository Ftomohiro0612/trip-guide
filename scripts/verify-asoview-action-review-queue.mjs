import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const QUEUE_PATH = resolve(
  ROOT,
  ".codex/research/asoview-action-review-queue-2026-08-26.json",
);
const USER_AGENT =
  "MemoripExactMatchAudit/1.0 (+https://trip-guide.net; public-pages-only)";
const SPACING_MS = 650;

const queue = JSON.parse(await readFile(QUEUE_PATH, "utf8"));
const pending = queue.items.filter((item) => item.review_state === "pending");
let reviewed = 0;
let nextRequestAt = Date.now();

for (const item of pending) {
  const wait = Math.max(0, nextRequestAt - Date.now());
  if (wait) await delay(wait);
  nextRequestAt = Date.now() + SPACING_MS;

  item.review = await verify(item);
  item.review_state = item.review.accepted ? "accepted" : "rejected";
  reviewed += 1;

  if (reviewed % 25 === 0 || reviewed === pending.length) {
    queue.generated_at = new Date().toISOString();
    queue.pending_count = queue.items.filter(
      (candidate) => candidate.review_state === "pending",
    ).length;
    await writeFile(QUEUE_PATH, `${JSON.stringify(queue, null, 2)}\n`, "utf8");
    console.log(
      `reviewed=${reviewed}/${pending.length} pending=${queue.pending_count} accepted=${queue.items.filter((candidate) => candidate.review_state === "accepted").length}`,
    );
  }
}

async function verify(item) {
  const verifiedAt = new Date().toISOString();
  try {
    const response = await fetchWithRetry(item.url);
    const html = await response.text();
    const visibleText = decodeHtml(
      html
        .replace(/<script[\s\S]*?<\/script>/gi, " ")
        .replace(/<style[\s\S]*?<\/style>/gi, " ")
        .replace(/<[^>]+>/g, " "),
    ).replace(/\s+/g, " ");
    const canonical =
      html.match(/<link[^>]+rel=["']canonical["'][^>]*>/i)?.[0]
        ?.match(/href=["']([^"']+)["']/i)?.[1] ?? "";
    const pageIdentity = normalize(`${item.title} ${item.description} ${visibleText}`);
    const facilityIdentity = normalize(item.facility_name);
    const providerIdentity = normalize(item.provider_identity);
    const municipality = municipalityToken(item.prefecture, item.address ?? "");
    const identityMatched =
      pageIdentity.includes(facilityIdentity) ||
      (providerIdentity.length >= 4 &&
        (providerIdentity.includes(facilityIdentity) ||
          facilityIdentity.includes(providerIdentity)));
    const prefectureMatched = visibleText.includes(item.prefecture);
    const municipalityMatched = !municipality || visibleText.includes(municipality);
    const canonicalMatched = canonical === item.url;
    const unavailable =
      visibleText.match(
        /完売|売り切れ|SOLD\s*OUT|販売終了|販売期間外|予約受付終了|受付を終了|現在(?:は)?(?:購入|予約)できません|このチケットは現在販売していません/i,
      )?.[0] ?? "";
    const availabilityMatched =
      !unavailable &&
      (item.kind === "ticket"
        ? /購入するなら|24時間いつでも購入/.test(item.description)
        : /予約するなら/.test(item.description));
    const accepted =
      response.ok &&
      response.url === item.url &&
      canonicalMatched &&
      identityMatched &&
      prefectureMatched &&
      municipalityMatched &&
      availabilityMatched;

    return {
      accepted,
      verified_at: verifiedAt,
      status: response.status,
      final_url: response.url,
      canonical_url: canonical,
      identity_matched: identityMatched,
      prefecture_matched: prefectureMatched,
      municipality_matched: municipalityMatched,
      availability_matched: availabilityMatched,
      unavailable_marker: unavailable,
      rejection_reasons: [
        !response.ok && `http_${response.status}`,
        response.url !== item.url && "redirected",
        !canonicalMatched && "canonical_mismatch",
        !identityMatched && "identity_mismatch",
        !prefectureMatched && "prefecture_not_confirmed",
        !municipalityMatched && "municipality_not_confirmed",
        !availabilityMatched && "not_currently_actionable",
      ].filter(Boolean),
    };
  } catch (error) {
    return {
      accepted: false,
      verified_at: verifiedAt,
      status: 0,
      rejection_reasons: [
        `fetch_error:${error instanceof Error ? error.message : String(error)}`,
      ],
    };
  }
}

async function fetchWithRetry(url) {
  let lastError;
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    try {
      const response = await fetch(url, {
        redirect: "follow",
        headers: {
          Accept: "text/html,application/xhtml+xml",
          "User-Agent": USER_AGENT,
        },
      });
      if (response.status !== 429 && response.status < 500) return response;
      lastError = new Error(`HTTP ${response.status}: ${url}`);
      await response.body?.cancel();
    } catch (error) {
      lastError = error;
    }
    if (attempt < 4) await delay(attempt * 1_000);
  }
  throw lastError ?? new Error(`fetch failed: ${url}`);
}

function municipalityToken(prefecture, address) {
  const remainder = String(address).replace(prefecture, "");
  return remainder.match(/^(.+?[市区町村])/u)?.[1] ?? "";
}

function normalize(value) {
  return String(value ?? "")
    .normalize("NFKC")
    .toLocaleLowerCase("ja")
    .replace(/[\s\u3000・･·\/／\\|｜:：,，.。\-‐‑–—―_()（）\[\]【】「」『』!！?？'"`®™]/g, "")
    .trim();
}

function decodeHtml(value) {
  return value
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function delay(milliseconds) {
  return new Promise((resolveDelay) => setTimeout(resolveDelay, milliseconds));
}
