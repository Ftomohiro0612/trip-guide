import { createClient } from "@supabase/supabase-js";

const EXPERIMENT_STARTED_AT = "2026-07-30T11:56:33.348Z";
const EXPERIMENT_ENDS_AT = "2026-10-28T11:56:33.348Z";
const TEST_ACCOUNT_PATTERN =
  /(test|example|dummy|sample|qa|codex|claude|agent|memorip.*\+|\+memorip)/i;

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
};

console.log(JSON.stringify(output, null, 2));
