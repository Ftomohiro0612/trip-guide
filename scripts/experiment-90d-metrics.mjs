import { createClient } from "@supabase/supabase-js";

const EXPERIMENT_STARTED_AT = "2026-07-30T11:56:33.348Z";
const EXPERIMENT_ENDS_AT = "2026-10-28T11:56:33.348Z";
const TEST_ACCOUNT_PATTERN =
  /(test|example|dummy|sample|qa|codex|claude|agent|memorip.*\+|\+memorip)/i;

// 2026-08-06 PM独立受入 (registration/onboarding/age-filter/annual-pass, all
// Claude Fable authored) Owner-specified segmentation. The staged rollout
// window mixes pre- and post-change UX for accounts created mid-deploy and is
// excluded from the primary before/after comparison by Owner instruction —
// it is still reported on its own, never silently dropped.
const FABLE_CHANGES_STAGED_ROLLOUT_STARTED_AT = "2026-08-05T07:43:14.000Z";
const FABLE_CHANGES_FULLY_LIVE_AT = "2026-08-05T09:25:11.000Z";

function fableChangeSegmentFor(isoTimestamp) {
  const t = new Date(isoTimestamp).getTime();
  if (t < new Date(FABLE_CHANGES_STAGED_ROLLOUT_STARTED_AT).getTime()) {
    return "before_fable_changes";
  }
  if (t < new Date(FABLE_CHANGES_FULLY_LIVE_AT).getTime()) {
    return "fable_staged_rollout_excluded_from_primary_comparison";
  }
  return "after_fable_changes_fully_live";
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error(
    "NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.",
  );
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function loadAuthUsers() {
  const users = [];
  for (let page = 1; ; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage: 1000,
    });
    if (error) throw error;
    users.push(...data.users);
    if (data.users.length < 1000) return users;
  }
}

async function selectAll(table, columns) {
  const { data, error } = await supabase.from(table).select(columns);
  if (error) throw new Error(`${table}: ${error.message}`);
  return data ?? [];
}

const [users, visits, children, visitChildren, wishlists, photos] =
  await Promise.all([
    loadAuthUsers(),
    selectAll(
      "visits",
      "id,user_id,facility_slug,status,created_at,updated_at",
    ),
    selectAll("children", "id,user_id,created_at"),
    selectAll("visit_children", "visit_id,child_id,reaction_tags"),
    selectAll("wishlists", "user_id,created_at"),
    selectAll("visit_photos", "user_id,visit_id,created_at"),
  ]);

const experimentStart = new Date(EXPERIMENT_STARTED_AT);
const publishedVisits = visits.filter((visit) => visit.status === "published");
const testAccountIds = new Set(
  users
    .filter((user) => TEST_ACCOUNT_PATTERN.test(user.email ?? ""))
    .map((user) => user.id),
);

// At GO, one non-test household already held all published records. Treat every
// non-test account with a pre-GO published visit as the Owner/baseline cohort.
// This avoids reading or persisting names, emails, or other personal fields.
const baselineHouseholdIds = new Set(
  publishedVisits
    .filter(
      (visit) =>
        !testAccountIds.has(visit.user_id) &&
        new Date(visit.created_at) < experimentStart,
    )
    .map((visit) => visit.user_id),
);
const externalAccountIds = new Set(
  users
    .filter(
      (user) =>
        !testAccountIds.has(user.id) && !baselineHouseholdIds.has(user.id),
    )
    .map((user) => user.id),
);
const externalAccountsCreatedAfterGo = users.filter(
  (user) =>
    externalAccountIds.has(user.id) &&
    new Date(user.created_at) >= experimentStart,
);
const postStartExternalPublishedVisits = publishedVisits.filter(
  (visit) =>
    externalAccountIds.has(visit.user_id) &&
    new Date(visit.created_at) >= experimentStart,
);
const postStartExternalDraftVisits = visits.filter(
  (visit) =>
    visit.status === "draft" &&
    externalAccountIds.has(visit.user_id) &&
    new Date(visit.created_at) >= experimentStart,
);
const postStartExternalVisits = [
  ...postStartExternalPublishedVisits,
  ...postStartExternalDraftVisits,
];

const visitsByExternalUser = new Map();
for (const visit of postStartExternalPublishedVisits) {
  const current = visitsByExternalUser.get(visit.user_id) ?? [];
  current.push(visit);
  visitsByExternalUser.set(visit.user_id, current);
}
for (const rows of visitsByExternalUser.values()) {
  rows.sort((left, right) => new Date(left.created_at) - new Date(right.created_at));
}

const externalUsersWithOne = [...visitsByExternalUser.values()].filter(
  (rows) => rows.length >= 1,
);
const externalUsersWithTwo = externalUsersWithOne.filter(
  (rows) => rows.length >= 2,
);
const secondVisitWithinSevenDays = externalUsersWithTwo.filter(
  (rows) =>
    new Date(rows[1].created_at) - new Date(rows[0].created_at) <=
    7 * 24 * 60 * 60 * 1000,
);
const secondVisitAfterTwentyFourHours = externalUsersWithTwo.filter(
  (rows) =>
    new Date(rows[1].created_at) - new Date(rows[0].created_at) >=
    24 * 60 * 60 * 1000,
);

const externalVisitIds = new Set(
  postStartExternalPublishedVisits.map((visit) => visit.id),
);
const externalReactionRows = visitChildren.filter((row) =>
  externalVisitIds.has(row.visit_id),
);
const externalValidReactionRows = externalReactionRows.filter(
  (row) =>
    Array.isArray(row.reaction_tags) &&
    row.reaction_tags.some(
      (tag) => tag && !/(覚えていない|まだわからない)/u.test(tag),
    ),
);

function countForExternal(rows) {
  return rows.filter((row) => externalAccountIds.has(row.user_id)).length;
}

function countForExternalAfterGo(rows) {
  return rows.filter(
    (row) =>
      externalAccountIds.has(row.user_id) &&
      new Date(row.created_at) >= experimentStart,
  ).length;
}

function distinctExternalUsers(rows) {
  return new Set(
    rows
      .filter((row) => externalAccountIds.has(row.user_id))
      .map((row) => row.user_id),
  ).size;
}

function percentage(numerator, denominator) {
  return denominator === 0
    ? null
    : Number(((numerator / denominator) * 100).toFixed(1));
}

// Segment external accounts by which onboarding/registration UX they were
// funneled through at signup time (account created_at), not by when each
// individual visit happened afterward — the thing under test is the
// onboarding funnel itself.
//
// 2026-08-06 Owner correction: the segment population must be restricted to
// accounts created inside the experiment window itself. Without this, a
// non-baseline account that simply predates the experiment (dormant, never
// part of the pre-GO baseline household, never test-flagged) would fall
// into before_fable_changes purely because its created_at is early — it was
// never actually part of this experiment's before/after comparison.
const experimentEnd = new Date(EXPERIMENT_ENDS_AT);
const externalAccountsInExperimentWindow = users.filter(
  (user) =>
    externalAccountIds.has(user.id) &&
    new Date(user.created_at) >= experimentStart &&
    new Date(user.created_at) < experimentEnd,
);

const externalAccountIdsBySegment = {
  before_fable_changes: new Set(),
  fable_staged_rollout_excluded_from_primary_comparison: new Set(),
  after_fable_changes_fully_live: new Set(),
};
for (const user of externalAccountsInExperimentWindow) {
  externalAccountIdsBySegment[fableChangeSegmentFor(user.created_at)].add(
    user.id,
  );
}

function buildCohortMetrics(cohortIds) {
  const cohortPublishedVisits = postStartExternalPublishedVisits.filter(
    (visit) => cohortIds.has(visit.user_id),
  );
  const cohortAllVisits = postStartExternalVisits.filter((visit) =>
    cohortIds.has(visit.user_id),
  );
  const cohortDraftVisits = postStartExternalDraftVisits.filter((visit) =>
    cohortIds.has(visit.user_id),
  );

  const byUser = new Map();
  for (const visit of cohortPublishedVisits) {
    const current = byUser.get(visit.user_id) ?? [];
    current.push(visit);
    byUser.set(visit.user_id, current);
  }
  for (const rows of byUser.values()) {
    rows.sort((left, right) => new Date(left.created_at) - new Date(right.created_at));
  }
  const withOne = [...byUser.values()].filter((rows) => rows.length >= 1);
  const withTwo = withOne.filter((rows) => rows.length >= 2);
  const secondWithin7d = withTwo.filter(
    (rows) =>
      new Date(rows[1].created_at) - new Date(rows[0].created_at) <=
      7 * 24 * 60 * 60 * 1000,
  );

  const cohortCount = (rows) =>
    rows.filter((row) => cohortIds.has(row.user_id)).length;
  const cohortDistinctUsers = (rows) =>
    new Set(
      rows.filter((row) => cohortIds.has(row.user_id)).map((row) => row.user_id),
    ).size;

  return {
    accounts_in_segment: cohortIds.size,
    visits_any_status: cohortAllVisits.length,
    users_with_any_visit: new Set(cohortAllVisits.map((v) => v.user_id)).size,
    draft_visits: cohortDraftVisits.length,
    published_visits: cohortPublishedVisits.length,
    users_with_1plus_visit: withOne.length,
    users_with_2plus_visits: withTwo.length,
    users_with_3plus_visits: withOne.filter((rows) => rows.length >= 3).length,
    second_visit_within_7d_users: secondWithin7d.length,
    seven_day_second_visit_rate_pct: percentage(
      secondWithin7d.length,
      withOne.length,
    ),
    activation_rate_pct: percentage(withOne.length, cohortIds.size),
    child_profiles: cohortCount(children),
    users_with_child_profile: cohortDistinctUsers(children),
    wishlist_items: cohortCount(wishlists),
    photo_rows: cohortCount(photos),
  };
}

const segmentMetrics = {
  before_fable_changes: buildCohortMetrics(
    externalAccountIdsBySegment.before_fable_changes,
  ),
  fable_staged_rollout_excluded_from_primary_comparison: buildCohortMetrics(
    externalAccountIdsBySegment
      .fable_staged_rollout_excluded_from_primary_comparison,
  ),
  after_fable_changes_fully_live: buildCohortMetrics(
    externalAccountIdsBySegment.after_fable_changes_fully_live,
  ),
};

const fableChangeSegments = {
  note:
    "2026-08-06 Owner instruction: primary_comparison contrasts before_fable_changes vs after_fable_changes_fully_live only. fable_staged_rollout is reported for completeness but excluded from the primary comparison — it mixes pre/post UX for accounts created mid-deploy. Population is restricted to externalAccountIds created inside [EXPERIMENT_STARTED_AT, EXPERIMENT_ENDS_AT) — pre-existing dormant non-baseline accounts are excluded from all three segments' denominators.",
  boundaries: {
    staged_rollout_started_at: FABLE_CHANGES_STAGED_ROLLOUT_STARTED_AT,
    fully_live_at: FABLE_CHANGES_FULLY_LIVE_AT,
  },
  population: {
    external_accounts_total: externalAccountIds.size,
    external_accounts_in_experiment_window:
      externalAccountsInExperimentWindow.length,
    external_accounts_excluded_outside_window:
      externalAccountIds.size - externalAccountsInExperimentWindow.length,
  },
  segments: segmentMetrics,
  primary_comparison: {
    before_fable_changes: segmentMetrics.before_fable_changes,
    after_fable_changes_fully_live: segmentMetrics.after_fable_changes_fully_live,
    activation_rate_delta_pct:
      segmentMetrics.before_fable_changes.activation_rate_pct != null &&
      segmentMetrics.after_fable_changes_fully_live.activation_rate_pct != null
        ? Number(
            (
              segmentMetrics.after_fable_changes_fully_live.activation_rate_pct -
              segmentMetrics.before_fable_changes.activation_rate_pct
            ).toFixed(1),
          )
        : null,
  },
};

const output = {
  window: {
    started_at: EXPERIMENT_STARTED_AT,
    ends_at: EXPERIMENT_ENDS_AT,
    as_of: new Date().toISOString(),
  },
  baseline: {
    auth_accounts: users.length,
    test_like_accounts_excluded: testAccountIds.size,
    owner_or_pre_go_households_excluded: baselineHouseholdIds.size,
    owner_or_pre_go_published_visits: publishedVisits.filter((visit) =>
      baselineHouseholdIds.has(visit.user_id),
    ).length,
    external_accounts_in_scope: externalAccountIds.size,
    external_accounts_created_at_or_after_go:
      externalAccountsCreatedAfterGo.length,
  },
  activation: {
    external_visits_any_status_after_go: postStartExternalVisits.length,
    external_users_with_any_visit_after_go: new Set(
      postStartExternalVisits.map((visit) => visit.user_id),
    ).size,
    external_draft_visits_after_go: postStartExternalDraftVisits.length,
    external_published_visits_after_go:
      postStartExternalPublishedVisits.length,
    external_users_with_1plus_visit: externalUsersWithOne.length,
    external_users_with_2plus_visits: externalUsersWithTwo.length,
    external_users_with_3plus_visits: externalUsersWithOne.filter(
      (rows) => rows.length >= 3,
    ).length,
    second_visit_within_7d_users: secondVisitWithinSevenDays.length,
    second_visit_after_24h_users: secondVisitAfterTwentyFourHours.length,
    seven_day_second_visit_rate_pct: percentage(
      secondVisitWithinSevenDays.length,
      externalUsersWithOne.length,
    ),
  },
  supporting_behavior: {
    external_child_profiles: countForExternal(children),
    external_child_profiles_created_at_or_after_go:
      countForExternalAfterGo(children),
    external_users_with_child_profile: distinctExternalUsers(children),
    external_wishlist_items: countForExternal(wishlists),
    external_wishlist_items_created_at_or_after_go:
      countForExternalAfterGo(wishlists),
    external_photo_rows: countForExternal(photos),
    external_photo_rows_created_at_or_after_go:
      countForExternalAfterGo(photos),
    external_visit_child_rows_after_go: externalReactionRows.length,
    external_valid_reaction_rows_after_go: externalValidReactionRows.length,
    external_valid_reaction_rate_pct: percentage(
      externalValidReactionRows.length,
      externalReactionRows.length,
    ),
  },
  fable_change_segments: fableChangeSegments,
};

console.log(JSON.stringify(output, null, 2));
