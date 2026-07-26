import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  familyRevisitLabels,
  satisfactionLabels,
  visitLabel,
} from "@/lib/visit-labels";
import MemoryStories, { type MemoryStory } from "./MemoryStories";

export const metadata: Metadata = {
  title: "家族の思い出",
  robots: {
    index: false,
    follow: false,
    googleBot: { index: false, follow: false },
  },
  openGraph: null,
  twitter: null,
};

type VisitRow = {
  id: string;
  facility_name: string;
  visited_on: string | null;
  family_revisit: string | null;
  parent_memo: string | null;
};

type PhotoRow = {
  visit_id: string;
  thumb_path: string | null;
  sort_order: number | null;
};

type ChildTagRow = {
  reaction_tags: { label: string } | { label: string }[] | null;
};

type VisitChildRow = {
  visit_id: string;
  satisfaction: string | null;
  children: { nickname: string } | { nickname: string }[] | null;
  visit_child_tags: ChildTagRow[] | null;
};

function formatDate(value: string | null): string {
  if (!value) return "日付未設定";
  const [year, month, day] = value.split("-");
  return `${year}.${Number(month)}.${Number(day)}`;
}

function nicknameOf(value: VisitChildRow["children"]): string {
  if (Array.isArray(value)) return value[0]?.nickname ?? "子ども";
  return value?.nickname ?? "子ども";
}

function tagLabel(value: ChildTagRow["reaction_tags"]): string | null {
  if (Array.isArray(value)) return value[0]?.label ?? null;
  return value?.label ?? null;
}

function memoryLabel(value: string | null): string | null {
  if (!value) return null;
  const visited = new Date(`${value}T00:00:00+09:00`);
  const today = new Date("2026-07-26T00:00:00+09:00");
  const days = Math.floor((today.getTime() - visited.getTime()) / 86_400_000);
  return days >= 30 ? `あれから${days}日` : null;
}

const demoStories: MemoryStory[] = [
  {
    id: "demo-midaiminami",
    facilityName: "御勅使南公園",
    visitedOn: "2026.5.30",
    photoUrls: [
      "/images/facilities/facility-195.jpg",
      "/images/categories/park.webp",
      "/images/categories/athletic.webp",
    ],
    note: "上の子も下の子も楽しめる遊具があった。遊具が多いのも印象的。",
    revisit: "また行きたい",
    childLines: ["彩瑛：大満足", "望結：大満足"],
    tags: ["遊具", "きょうだい時間"],
    detailHref: "/mypage/memories?demo=1",
    memoryLabel: "あれから57日",
  },
  {
    id: "demo-soleil",
    facilityName: "長井海の手公園 ソレイユの丘",
    visitedOn: "2026.5.9",
    photoUrls: [
      "/images/facilities/facility-801.jpg",
      "/images/categories/zoo.webp",
    ],
    note: "動物にごはんをあげた瞬間、ふたりとも同じ顔で笑ってた。",
    revisit: "条件次第",
    childLines: ["彩瑛：大満足", "望結：大満足"],
    tags: ["エサやり", "遊具"],
    detailHref: "/mypage/memories?demo=1",
    memoryLabel: "ふと届いた思い出",
  },
  {
    id: "demo-no-photo",
    facilityName: "京王あそびの森 HUG HUG",
    visitedOn: "2026.6.20",
    photoUrls: [],
    note: "写真がない日も、友だちと夢中で遊んだことは残しておきたい。",
    revisit: "また行きたい",
    childLines: ["彩瑛：大満足", "望結：大満足"],
    tags: ["アスレチック", "友だちと遊んだ"],
    detailHref: "/mypage/memories?demo=1",
    memoryLabel: null,
  },
];

export default async function MemoriesPage({
  searchParams,
}: {
  searchParams: Promise<{ demo?: string; focus?: string }>;
}) {
  const params = await searchParams;
  if (params.demo === "1") {
    return <MemoryStories stories={demoStories} focusId={params.focus} demo />;
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/auth/login?redirectTo=${encodeURIComponent("/mypage/memories")}`);
  }

  const { data: visitData } = await supabase
    .from("visits")
    .select("id, facility_name, visited_on, family_revisit, parent_memo")
    .eq("user_id", user.id)
    .eq("status", "published")
    .order("visited_on", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(50);
  const visits = (visitData ?? []) as VisitRow[];
  const visitIds = visits.map((visit) => visit.id);

  const [{ data: photoData }, { data: childData }] =
    visitIds.length > 0
      ? await Promise.all([
          supabase
            .from("visit_photos")
            .select("visit_id, thumb_path, sort_order")
            .in("visit_id", visitIds)
            .order("visit_id", { ascending: true })
            .order("sort_order", { ascending: true }),
          supabase
            .from("visit_children")
            .select(
              "visit_id, satisfaction, children(nickname), visit_child_tags(reaction_tags(label))",
            )
            .in("visit_id", visitIds),
        ])
      : [{ data: [] }, { data: [] }];

  const photoPathsByVisit = new Map<string, string[]>();
  for (const photo of (photoData ?? []) as PhotoRow[]) {
    if (!photo.thumb_path) continue;
    const current = photoPathsByVisit.get(photo.visit_id) ?? [];
    if (current.length >= 3) continue;
    current.push(photo.thumb_path);
    photoPathsByVisit.set(photo.visit_id, current);
  }
  const photoPaths = Array.from(
    new Set(Array.from(photoPathsByVisit.values()).flat()),
  );
  const { data: signedPhotos } =
    photoPaths.length > 0
      ? await supabase.storage
          .from("visit-photos")
          .createSignedUrls(photoPaths, 60 * 60)
      : { data: [] };
  const photoUrlByPath = new Map(
    (signedPhotos ?? []).map((row) => [row.path, row.signedUrl]),
  );

  const childrenByVisit = new Map<string, VisitChildRow[]>();
  for (const child of (childData ?? []) as VisitChildRow[]) {
    const current = childrenByVisit.get(child.visit_id) ?? [];
    current.push(child);
    childrenByVisit.set(child.visit_id, current);
  }

  const stories: MemoryStory[] = visits.map((visit) => {
    const visitPhotoPaths = photoPathsByVisit.get(visit.id) ?? [];
    const children = childrenByVisit.get(visit.id) ?? [];
    const tags = Array.from(
      new Set(
        children.flatMap((child) =>
          (child.visit_child_tags ?? [])
            .map((tag) => tagLabel(tag.reaction_tags))
            .filter((label): label is string => Boolean(label)),
        ),
      ),
    ).slice(0, 3);
    const childLines = children
      .filter((child) => Boolean(child.satisfaction))
      .slice(0, 2)
      .map((child) => {
        const label = visitLabel(satisfactionLabels, child.satisfaction);
        return `${nicknameOf(child.children)}：${label}`;
      });
    const revisit = visit.family_revisit
      ? visitLabel(familyRevisitLabels, visit.family_revisit)
      : null;

    return {
      id: visit.id,
      facilityName: visit.facility_name,
      visitedOn: formatDate(visit.visited_on),
      photoUrls: visitPhotoPaths
        .map((path) => photoUrlByPath.get(path) ?? null)
        .filter((url): url is string => Boolean(url)),
      note: visit.parent_memo?.trim() || null,
      revisit: revisit === "未記録" ? null : revisit,
      childLines,
      tags,
      detailHref: `/mypage/visits/${visit.id}`,
      memoryLabel: memoryLabel(visit.visited_on),
    };
  });

  return <MemoryStories stories={stories} focusId={params.focus} />;
}
