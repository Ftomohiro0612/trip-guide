import ChildAvatar from "@/components/ChildAvatar";
import { childAgeAtVisitInMonths } from "@/lib/child-age";
import { isInterestOtherSelected } from "@/lib/visit-other-note";
import { satisfactionLabels } from "@/lib/visit-labels";

export type ChildProfile = {
  nickname: string;
  birth_year: number;
  birth_month: number | null;
  avatar_url: string | null;
};

export type VisitChildCardData = {
  id: string;
  child_id: string;
  child_age_at_visit: number | null;
  satisfaction: string | null;
  interest_other_note: string | null;
  behavior_other_note: string | null;
  children: ChildProfile | ChildProfile[] | null;
  visit_child_tags: VisitChildTagData[] | null;
};

export type VisitChildTagData = {
  tag_id: string;
  reaction_tags: { label: string } | { label: string }[] | null;
};

export type VisitChildReactionTag = {
  id: string;
  label: string;
  icon: string;
};

const satisfactionMeta: Record<string, { label: string; stars: string }> = {
  loved: { label: "大満足", stars: "★★★★★" },
  enjoyed: { label: "楽しんだ", stars: "★★★★☆" },
  neutral: { label: "普通", stars: "★★★☆☆" },
  not_fit: { label: "合わなかった", stars: "★★☆☆☆" },
  could_not_join: { label: "参加できず", stars: "☆☆☆☆☆" },
};

const reactionTagIcons: Record<string, string> = {
  animal: "🐾",
  animal_contact: "🤲",
  animal_feed: "🥕",
  water_play: "💧",
  pool: "🏊",
  playground: "🛝",
  athletic: "🧗",
  slide: "🛝",
  running: "🏃",
  wide_space: "🌿",
  vehicle: "🚂",
  craft: "✂️",
  experience: "🌾",
  exhibition: "🔭",
  science: "🔬",
  dinosaur: "🦕",
  character: "⭐",
  nature: "🌲",
  food: "🍓",
  played_with_friends: "👫",
  played_with_siblings: "👦",
  first_time: "✨",
  did_alone: "🙌",
  brave_challenge: "💪",
  other: "✍️",
};

export function getVisitChildProfile(child: VisitChildCardData["children"]) {
  if (Array.isArray(child)) return child[0] ?? null;
  return child;
}

function ageAtVisit(
  visitedOn: string | null,
  child: ChildProfile,
  childAgeAtVisit: number | null,
): string {
  const months = childAgeAtVisitInMonths(
    visitedOn,
    child.birth_year,
    child.birth_month,
  );
  if (months !== null) {
    const ageYears = Math.floor(months / 12);
    const ageMonths = months % 12;
    if (ageYears === 0) return `${ageMonths}か月`;
    if (ageMonths === 0) return `${ageYears}歳`;
    return `${ageYears}歳${ageMonths}か月`;
  }

  if (typeof childAgeAtVisit === "number") {
    return `${childAgeAtVisit}歳ごろ`;
  }

  return "訪問日未設定";
}

function reactionTagLabel(tag: VisitChildTagData): string | null {
  if (Array.isArray(tag.reaction_tags)) {
    return tag.reaction_tags[0]?.label ?? null;
  }
  return tag.reaction_tags?.label ?? null;
}

export function visitChildAgeLabel(
  row: VisitChildCardData,
  visitedOn: string | null,
): string {
  const child = getVisitChildProfile(row.children);
  if (!child) return "未記録";
  return ageAtVisit(visitedOn, child, row.child_age_at_visit);
}

export function getVisitChildReactionTags(
  row: VisitChildCardData,
): VisitChildReactionTag[] {
  return (row.visit_child_tags ?? [])
    .map((tag) => ({
      id: tag.tag_id,
      label: reactionTagLabel(tag),
      icon: reactionTagIcons[tag.tag_id] ?? "🏷️",
    }))
    .filter((tag): tag is VisitChildReactionTag => Boolean(tag.label));
}

export function VisitChildCard({
  row,
  visitedOn,
  avatarUrl,
}: {
  row: VisitChildCardData;
  visitedOn: string | null;
  avatarUrl: string | null;
}) {
  const child = getVisitChildProfile(row.children);
  if (!child) return null;

  const satisfaction = row.satisfaction
    ? satisfactionMeta[row.satisfaction] ?? {
        label: satisfactionLabels[row.satisfaction] ?? "未記録",
        stars: "★★★☆☆",
      }
    : null;
  const tags = getVisitChildReactionTags(row);
  const interestOtherSelected = isInterestOtherSelected(
    row.interest_other_note,
  );
  const otherNotes = [row.interest_other_note, row.behavior_other_note]
    .map((note) => note?.trim())
    .filter((note): note is string => Boolean(note));

  return (
    <article className="bg-white border border-slate-200 rounded-2xl px-4 py-4 space-y-3 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <ChildAvatar
            childId={row.child_id}
            nickname={child.nickname}
            avatarUrl={avatarUrl}
            size="md"
          />
          <div className="min-w-0">
            <h3 className="font-bold text-slate-900 truncate">{child.nickname}</h3>
            <p className="text-xs text-slate-400">
              訪問時 {visitChildAgeLabel(row, visitedOn)}
            </p>
          </div>
        </div>
        {satisfaction && (
          <div className="text-right shrink-0">
            <p className="text-xs tracking-wide text-amber-500">
              {satisfaction.stars}
            </p>
            <p className="text-xs font-bold text-slate-700">
              {satisfaction.label}
            </p>
          </div>
        )}
      </div>

      {(tags.length > 0 || interestOtherSelected) && (
        <div className="flex flex-wrap gap-1.5">
          {interestOtherSelected && (
            <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2.5 py-1 text-xs font-medium text-sky-700 ring-1 ring-sky-100">
              <span aria-hidden>✍️</span>
              その他
            </span>
          )}
          {tags.map((tag) => (
            <span
              key={tag.id}
              className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2.5 py-1 text-xs font-medium text-sky-700 ring-1 ring-sky-100"
            >
              <span aria-hidden>{tag.icon}</span>
              {tag.label}
            </span>
          ))}
        </div>
      )}

      {otherNotes.length > 0 && (
        <div className="space-y-1 border-t border-slate-100 pt-2">
          {otherNotes.map((note, index) => (
            <p
              key={`${index}-${note}`}
              className="text-sm leading-relaxed text-slate-700"
            >
              <span className="font-bold text-slate-500">その他:</span> {note}
            </p>
          ))}
        </div>
      )}
    </article>
  );
}
