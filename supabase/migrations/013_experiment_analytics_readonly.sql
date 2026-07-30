-- 90-day experiment: least-privilege aggregate inputs for service_role.
-- Free text, profile details, birth data, and Storage paths remain unreadable.
GRANT SELECT (id, user_id, facility_slug, status, created_at, updated_at)
  ON public.visits TO service_role;

GRANT SELECT (id, user_id, created_at)
  ON public.children TO service_role;

GRANT SELECT (visit_id, child_id, reaction_tags)
  ON public.visit_children TO service_role;

GRANT SELECT (user_id, created_at)
  ON public.wishlists TO service_role;

GRANT SELECT (user_id, visit_id, created_at)
  ON public.visit_photos TO service_role;
