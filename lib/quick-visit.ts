import { createClient } from "@/lib/supabase/client";
import { childAgeAtVisit } from "@/lib/child-age";
import { hasQuickReactions, type QuickReactions } from "@/lib/quick-visit-validation";
export { hasQuickReactions, type QuickReactions } from "@/lib/quick-visit-validation";

export type QuickChild = { id: string; nickname: string; birth_year: number; birth_month: number | null };
export type QuickTag = { id: string; label: string };

export async function loadQuickOptions() {
  const supabase = createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) throw new Error("ログインが必要です。");
  const [children, tags] = await Promise.all([
    supabase.from("children").select("id, nickname, birth_year, birth_month").eq("user_id", user.id).order("sort_order"),
    supabase.from("reaction_tags").select("id, label").eq("tag_type", "interest").eq("is_active", true).order("sort_order"),
  ]);
  if (children.error || tags.error) throw new Error("子ども・反応タグを読み込めませんでした。");
  return { children: children.data as QuickChild[], tags: tags.data as QuickTag[] };
}

// Only call for a newly inserted visit; existing records are never merged here.
export async function insertQuickChildren(visitId: string, visitedOn: string, reactions: QuickReactions) {
  const options = await loadQuickOptions();
  if (!hasQuickReactions(reactions) || Object.entries(reactions).some(([childId, tags]) =>
    !options.children.some((child) => child.id === childId)
    || new Set(tags).size !== tags.length
    || tags.some((id) => !options.tags.some((tag) => tag.id === id)))) {
    throw new Error("参加した子どもごとに反応タグを1〜2個選んでください。");
  }
  const supabase = createClient();
  const { data, error } = await supabase.from("visit_children").insert(Object.entries(reactions).map(([childId, tags]) => {
    const child = options.children.find((item) => item.id === childId)!;
    return { visit_id: visitId, child_id: childId, satisfaction: null,
      child_age_at_visit: childAgeAtVisit(visitedOn, child.birth_year, child.birth_month), reaction_tags: tags };
  })).select("id, child_id");
  if (error) throw new Error(error.message);
  const { error: tagError } = await supabase.from("visit_child_tags").insert((data ?? []).flatMap((row) =>
    reactions[row.child_id].map((tagId) => ({ visit_child_id: row.id, tag_id: tagId }))));
  if (tagError) throw new Error(tagError.message);
}
