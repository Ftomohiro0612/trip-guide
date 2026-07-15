# Summer Festivals & Fireworks Hub 2026 v1 — Clean v2 Implementation Owner Review

## 1. Review state

```text
OPEN / IMPLEMENTATION OWNER REVIEW — CLEAN V2 SUBMITTED / PRODUCTION HOLD
```

This document reviews the clean v2 product candidate at the following immutable revision.

| Item | Value |
|---|---|
| Product branch | `codex/summer-festivals-fireworks-hub-2026-v1-release` |
| Candidate commit | [`386fad7b9abbec79e262f0f21320fb02c9cce310`](https://github.com/Ftomohiro0612/trip-guide/commit/386fad7b9abbec79e262f0f21320fb02c9cce310) |
| Base / parent | `1725f4459e8a0b876169de4349a68507ecf7b25e` |
| Commits ahead of base | 1 |
| Previous rejected candidate | `440a7b1b55ddddb922a9a96ecfd02bcd7c2757e8` — **not an ancestor** |
| Product changed files | 23 |
| Product diff | 3,613 insertions / 119 deletions |
| Product worktree after push | clean; local and remote SHA identical |
| Vercel target | Preview only; Ready |
| Production | HOLD |

The evidence branch containing this document and the ZIP is intentionally separate from the product branch. It must not be merged into `main` or the product release branch.

## 2. Submission outcome

Clean v2 implements the adopted summer hub and all subsequent Owner changes:

- `/events/summer` special feature hub.
- 57 adopted candidates across Tokyo, Kanagawa, Chiba, and Saitama.
- Top-page and `/events` large seasonal CTA slots.
- PC and SP seasonal header navigation.
- Shared fail-closed `summer-2026` active-period control with same-size normal fallback slots.
- Generic `/events` event-type filters.
- Generic `/events` and `/events/[prefecture]` pagination at 20 items per page.
- Independent fireworks and summer-festival Hero selection.
- Correct non-contiguous-date JSON-LD and real venue names.
- Row-level 2026-07-15 source recheck and refreeze.
- Product-only clean history; Review Markdown and generated sitemap output are not in the product commit.

No Owner adoption, `main` merge, Production deployment, scheduled workflow activation, hot-memory update, ownership return, release-branch deletion, or Phase C restart is claimed by this submission.

## 3. Previous Owner changes required — resolution

### 3.1 Review material removed from the product history

**Owner issue:** the previous candidate contained Implementation Owner Review, Owner Review, and Research Owner Review Markdown files. Deleting them in a descendant commit would still leave them in product history.

**Clean v2 resolution:** the candidate was rebuilt from base `1725f445...` as one product-only commit. Commit `440a7b1...` is not an ancestor. No path matching Review Markdown exists in the 23-file allowlist.

### 3.2 Hero selection now independently guarantees each category

**Owner issue:** the previous implementation sliced a mixed 12-item pool before splitting types, so one category could lose its four available entries.

**Clean v2 resolution:** fireworks and summer festivals are selected independently:

1. approved Hero candidates of that category, ordered by next occurrence;
2. other approved candidates of the same category, ordered by next occurrence;
3. maximum four for that category only;
4. no cross-category filling when fewer than four exist.

The date-crossing tests cover `2026-07-15`, `2026-07-27`, `2026-08-17`, and `2026-09-01`. The local Production screen on 2026-07-15 rendered four fireworks and four summer festivals.

### 3.3 Non-contiguous occurrence JSON-LD and venue names corrected

**Owner issue:** events with `occurrence_dates` could be emitted as one continuous Event from `start_date` through `end_date`; some venue names could fall back to `公式会場`.

**Clean v2 resolution:** each non-contiguous occurrence is emitted as an individual Event inside an ItemList, with the occurrence date used as both `startDate` and `endDate`. Continuous events retain their true period. Venue names use `venue_name` or the actual linked facility name. `公式会場` is not emitted as a structured-data substitute.

### 3.4 2026-07-15 due source rechecked row by row

The previous freeze had one row due on 2026-07-15. Only that row was updated. See section 7.

### 3.5 Generated sitemap output excluded

`next-sitemap.config.js` contains the `/events/summer` route. `public/sitemap-0.xml`, `public/sitemap.xml`, and `public/robots.txt` were restored after build and are not in the candidate diff. Deployment `postbuild` remains responsible for generation.

## 4. Additional Owner conditions — resolution

### 4.1 Generic event-type filters

`/events` contains a separate `イベントの種類` group:

- `🎆 花火大会`
- `🏮 夏祭り・盆踊り`
- `🎐 縁日・灯籠・風鈴`
- `🌙 夜のおでかけ`

Within a group, multiple selections are OR. Across prefecture, event type, condition, and child-preference groups, the combination is AND. Legacy events without `event_type` remain visible when no type is selected and are excluded only when a type filter is active. `好き` remains the child-preference group. `全解除` clears every group and resets the page to 1.

### 4.2 `/events` large CTA

The large bordered CTA is between the `/events` Hero/description and prefecture cards. It links to:

- main: `/events/summer`
- weekend: `/events/summer?quick=weekend#summer-filters`
- fireworks: `/events/summer?type=fireworks#summer-filters`
- summer festival: `/events/summer?type=summer_festival#summer-filters`

### 4.3 Top-page large CTA

`SummerSeasonalCta` is immediately below the top Hero and before map/theme discovery. PC and SP use a wide bordered seasonal slot.

### 4.4 Shared seasonal end control

Top CTA, `/events` CTA, and PC/SP header all read the shared `summer-2026` period. Outside the period, the normal event CTA/header is server-selected without rendering an operable summer CTA first. The same-size slot is retained to avoid layout shift. Boundary and expired-state screenshots are in the ZIP.

## 5. Generic event pagination

### 5.1 Scope

- Applied to `/events`.
- Applied to `/events/[prefecture]` through the shared `EventFilterBar` component.
- Not applied to `/events/summer`; browser inspection confirmed no pagination navigation there.

### 5.2 Rendering and counts

- Page size: 20.
- Only `filteredViews.slice(startIndex, startIndex + 20)` is rendered as `EventCard` DOM.
- Candidate actual generic total: 603 = prior 562 + 41 new null-facility events.
- Actual pages: 31.
- Page 1: `1〜20件を表示 / 全603件`.
- Page 2: `21〜40件を表示 / 全603件`.
- Final page: `601〜603件を表示 / 全603件`, three cards.
- Synthetic Owner example: 562 items = 29 pages; final page 561–562.
- Fireworks: 24 = 20 + 4.
- Summer festivals: 24 = 20 + 4.
- `/events/tokyo`: 49 = three pages.
- Zero results: `0件を表示 / 該当0件`, no page navigation.
- One page: no page navigation.

### 5.3 Filter and navigation behavior

- Any event-type, prefecture, condition, or preference change resets to page 1.
- `全解除` resets to page 1.
- A page request outside the valid range is clamped to the valid final page.
- `前へ` is truly disabled on page 1.
- `次へ` is truly disabled on the final page.
- After page movement, `開催中・これからのイベント` receives focus and scrolls to approximately 72 px below the sticky header.

### 5.4 Accessibility and responsive QA

- Navigation label: `aria-label="イベント一覧のページ"`.
- Current status uses `aria-live`, `aria-atomic`, `aria-current="page"`, and screen-reader-only `現在` text.
- Actual button height in PC and SP browser QA: approximately 43.997 px.
- PC 1280 CSS px and SP 375 CSS px horizontal overflow: 0.
- Browser console errors: 0.

## 6. Candidate data composition after refreeze

```json
{
  "today": "2026-07-15",
  "base_events": 766,
  "new_events": 41,
  "existing_classifications": 16,
  "adopted_candidates": 57,
  "type_counts": {
    "fireworks": 24,
    "summer_festival": 24,
    "summer_tradition": 3,
    "night_outing": 6
  },
  "prefecture_type_counts": {
    "tokyo": { "fireworks": 6, "summer_festival": 8, "summer_tradition": 1, "night_outing": 1, "total": 16 },
    "kanagawa": { "fireworks": 6, "summer_festival": 5, "summer_tradition": 1, "night_outing": 3, "total": 15 },
    "chiba": { "fireworks": 6, "summer_festival": 5, "summer_tradition": 0, "night_outing": 1, "total": 12 },
    "saitama": { "fireworks": 6, "summer_festival": 6, "summer_tradition": 1, "night_outing": 1, "total": 14 }
  },
  "main_ratio_percent": 84.2,
  "night_ratio_percent": 10.5,
  "null_facility_events": 41,
  "occurrence_dates_events": 9,
  "free_filter_events": 23,
  "no_reservation_filter_events": 25,
  "hero_pool": 12,
  "max_end_date": "2026-09-27",
  "ends_at": "2026-09-28T00:00:00+09:00",
  "next_source_review_due": "2026-07-16",
  "warnings": 0,
  "errors": 0
}
```

Classification totals equal 57. The primary-category ratio is `(24 + 24) / 57 = 84.2%`. The active Hero presentation is four fireworks plus four summer festivals, selected from the approved 12-item Hero pool with same-category fallback.

## 7. 2026-07-15 source recheck

### 7.1 Rows due

The previous 2026-07-14 freeze produced exactly one 2026-07-15 due row:

| Event ID | Event | Previous check | Due reason |
|---|---|---:|---|
| `evt-326-202607-01` | うえの夏まつり2026 | `2026-07-14` | weather-immediate / one-day cadence; event already active |

No other row was due on 2026-07-15. The other 56 rows were not bulk-updated.

### 7.2 Official-source result

| Field | Confirmed result |
|---|---|
| Official feature page | [うえの夏まつり2026](https://enjoy.ueno.or.jp/summer2026/) |
| Official update source | [上野観光連盟 official X status](https://x.com/uenokanko/status/2076876132469924111) |
| Main period | `2026-07-10` through `2026-08-11` |
| Main venue | 上野公園・不忍池周辺 / 不忍池畔蓮見デッキ |
| Weather condition | relevant programs state 荒天中止 or 雨天中止; official X is the update channel |
| Immediate program checked | とうろう流し: `2026-07-17 19:00`, 荒天中止 |
| Cancellation | no cancellation announcement found at check time |
| Postponement | no postponement announcement found at check time |
| Date change | no change to the recorded main period found |
| Data interpretation | not every sub-program is treated as occurring every day |

### 7.3 Row update

```json
{
  "id": "evt-326-202607-01",
  "source_checked_at": "2026-07-15",
  "source_urls": [
    "https://enjoy.ueno.or.jp/summer2026/",
    "https://x.com/uenokanko/status/2076876132469924111"
  ],
  "source_notes": "2026-07-15に公式特設ページで7月10日〜8月11日の会期、上野公園不忍池周辺の会場、荒天時条件を再確認。公式Xの直近投稿でも7月17日のとうろう流しを開催予定として案内しており、中止・延期告知なし。全企画が毎日開催とは扱わない。"
}
```

After this row-level update, its next due date is `2026-07-16`. No event was removed, postponed, or date-adjusted by this recheck, so the final candidate remains 57.

## 8. Commands and validation result

| Command / check | Result |
|---|---|
| `npm run events:summer:audit -- --today=2026-07-15` | PASS; errors 0, warnings 0 |
| `npm run events:summer:freeze -- --today=2026-07-15` | PASS; `freeze_check=true`, errors 0, warnings 0 |
| `npm run events:validate -- --today=2026-07-15` | PASS; errors 0, warnings 0 |
| `npx tsc --noEmit` | PASS |
| `npm run lint` | PASS; error 0, one pre-existing warning at `scripts/audit-facility-quality.mjs:617` |
| `npm run build` | PASS; Next.js 16.2.4; 2,279 pages generated; postbuild sitemap generation completed |
| `git diff --check` | PASS |
| `npm run events:summer:test` | PASS; 12/12 |
| PC 1280 / SP 375 browser QA | PASS; overflow 0; console error 0 |
| hard-stop / expired fallback | PASS |
| Vercel Preview deployment | Ready |

### 8.1 Twelve automated tests

1. `Hero selection independently keeps four fireworks and four festivals across dates` — PASS
2. `Hero selection falls back within each category as approved events end` — PASS
3. `Hero selection does not fill a short category from the other category` — PASS
4. `non-contiguous occurrence dates become separate Event entries` — PASS
5. `continuous events retain their true start and end dates` — PASS
6. `feature hub hard-stops exactly at endsAt` — PASS
7. `generic event type filters match the frozen candidate counts` — PASS
8. `generic event types are OR while filter groups combine with AND` — PASS
9. `unclassified legacy events remain only when no event type is selected` — PASS
10. `generic event pagination slices 562 items on first, second, and final pages` — PASS
11. `24 fireworks and 24 festivals paginate as 20 plus 4` — PASS
12. `combined prefecture, type, condition, and preference filters keep correct pages` — PASS

## 9. Vercel Preview

| Item | Result |
|---|---|
| URL | [trip-guide-robba2beg-ftomohiro0612s-projects.vercel.app](https://trip-guide-robba2beg-ftomohiro0612s-projects.vercel.app) |
| Deployment ID | `dpl_Ferf1zgGzfJDQeqLrvjirnSdBxNq` |
| Target | Preview |
| Status | Ready |
| Created | 2026-07-15 10:22 JST |
| Production alias/deploy | not performed |

`vercel inspect --wait` completed with exit code 0. The visual evidence was captured against the final local Production build; the hosted gate asserted here is successful Vercel Preview build/deployment readiness.

## 10. Codex Diff Audit — final output

```text
Candidate: 386fad7b9abbec79e262f0f21320fb02c9cce310
Parent:    1725f4459e8a0b876169de4349a68507ecf7b25e
Commits from base: 1
Previous 440a7b1 candidate ancestor: NO
Product changed files: 23
Review Markdown in product diff: 0
public/sitemap-0.xml in product diff: 0
public/sitemap.xml in product diff: 0
public/robots.txt in product diff: 0
data/events_data.json blob:
  efd60996848143cc7f4e6f54c1584307b417fbe7 (unchanged)
git diff --check: PASS
Product worktree after push: clean
Local product SHA == remote product SHA: YES
```

The evidence branch has one additional evidence-only commit and is not the product candidate.

## 11. Product allowlist / changed-file scope

| File | Allowed purpose |
|---|---|
| `app/events/page.tsx` | `/events` seasonal CTA placement and generic type-filter exposure |
| `app/events/summer/page.tsx` | new summer feature hub, Hero sections, JSON-LD, metadata |
| `app/globals.css` | shared seasonal slot styling / no-flash runtime support |
| `app/layout.tsx` | shared feature-hub runtime state wiring |
| `app/page.tsx` | top Hero-adjacent seasonal CTA placement |
| `components/EventCard.tsx` | null-facility venue rendering and facility-link suppression |
| `components/EventFilterBar.tsx` | type filters, shared 20-item pagination, focus/scroll/a11y |
| `components/Header.tsx` | PC/SP seasonal navigation slot |
| `components/HeaderAuthButton.tsx` | mobile header seasonal navigation integration |
| `components/JsonLd.tsx` | structured-data escaping hardening |
| `components/SummerEventExplorer.tsx` | special-hub filters and listing |
| `components/SummerSeasonalCta.tsx` | top and `/events` large CTA with normal fallback |
| `data/summer_events_2026.json` | separate 57-candidate overlay, source/freshness metadata |
| `lib/event-filter.ts` | type-filter semantics and reusable pagination helper |
| `lib/events.ts` | data overlay, nullable facility, Hub visibility and Hero integration |
| `lib/feature-hub-runtime.ts` | server/runtime active-period calculation |
| `lib/feature-hubs.ts` | shared `summer-2026` startsAt/endsAt configuration |
| `lib/my-places-events.ts` | nullable-facility-compatible generic event integration |
| `lib/summer-event-hub.ts` | independent Hero selection and corrected JSON-LD builder |
| `next-sitemap.config.js` | `/events/summer` sitemap route only |
| `package.json` | audit/freeze/test script registration and build validation gate |
| `scripts/test-summer-hub.mjs` | 12 regression tests |
| `scripts/validate-events.mjs` | correlation, composition, freshness, freeze, and endsAt validation |

Explicitly outside the allowlist:

- all Owner / Research / Implementation Review Markdown;
- `public/sitemap-0.xml`, `public/sitemap.xml`, `public/robots.txt` generated output;
- `data/events_data.json`;
- deployment and scheduled-workflow changes;
- hot memory / HANDOFF ownership changes.

## 12. Visual evidence ZIP

Download: [`clean-v2-visual-evidence-33-images.zip`](./clean-v2-visual-evidence-33-images.zip)

The ZIP contains all 14 pagination screenshots plus 19 previously required feature/seasonal screenshots, 33 PNG files total (approximately 8.8 MB before compression).

### 12.1 Seasonal / feature evidence — 19 images

```text
feature/pc-01-home-hero-seasonal-cta.png
feature/pc-02-events-hero-cta-prefectures.png
feature/pc-03-events-type-filter.png
feature/pc-04-events-fireworks-selected.png
feature/pc-05-events-festival-selected.png
feature/pc-06-summer-hero-4-fireworks-4-festivals.png
feature/pc-07-header-seasonal.png
feature/pc-09-expired-standard-cta-header.png
feature/pc-09b-expired-events-standard-cta.png
feature/pc-10-events-combined-filter.png
feature/sp-01-home-hero-seasonal-cta.png
feature/sp-02-events-hero-cta-prefectures.png
feature/sp-03-events-type-filter.png
feature/sp-04-events-fireworks-selected.png
feature/sp-05-events-festival-selected.png
feature/sp-06-summer-hero-4-fireworks-4-festivals.png
feature/sp-08-header-seasonal.png
feature/sp-09-expired-standard-cta-header.png
feature/sp-09b-expired-events-standard-cta.png
```

### 12.2 Pagination evidence — 14 images

```text
pagination/pc-01-events-page1.png
pagination/pc-02-events-page2.png
pagination/pc-03-events-last-page.png
pagination/pc-04-fireworks-page1.png
pagination/pc-05-fireworks-page2.png
pagination/pc-06-prefecture-type-compound.png
pagination/pc-07-events-tokyo-pagination.png
pagination/sp-01-events-page1.png
pagination/sp-02-events-page2.png
pagination/sp-03-events-last-page.png
pagination/sp-04-fireworks-page1.png
pagination/sp-05-fireworks-page2.png
pagination/sp-06-prefecture-type-compound.png
pagination/sp-07-events-tokyo-pagination.png
```

The specifically requested views are present: top CTA, `/events` CTA and type filter, all-event page 1/2/final, fireworks page 1/2, SP seasonal header, `/events/summer` four-plus-four Hero, and expired normal CTA/header.

## 13. Remaining HOLD before `main` / Production

| Operation | Gate |
|---|---|
| Owner adoption of candidate `386fad7...` | pending Owner decision |
| Merge to `main` | HOLD |
| Production deploy | HOLD |
| Enable scheduled Production workflow | HOLD |
| Hot-memory update | HOLD |
| Ownership return | HOLD |
| Delete release branch | HOLD |
| Restart Phase C | HOLD |

If Owner review continues beyond the next freshness due time, only the newly due rows must be opened and rechecked, followed by another freeze. `source_checked_at` must never be bulk-updated.
