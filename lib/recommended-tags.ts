import type { RecommendedForTag } from "@/types/facility";

type RecommendedForTagMeta = {
  label: string;
  icon: string;
};

export const RECOMMENDED_FOR_TAG_META: Record<
  RecommendedForTag,
  RecommendedForTagMeta
> = {
  animal: { label: "動物", icon: "🐾" },
  animal_contact: { label: "ふれあい", icon: "🤲" },
  animal_feed: { label: "えさやり", icon: "🥕" },
  water_play: { label: "水遊び", icon: "💧" },
  pool: { label: "プール", icon: "🏊" },
  playground: { label: "遊具", icon: "🛝" },
  athletic: { label: "アスレチック", icon: "🧗" },
  slide: { label: "すべり台", icon: "🎿" },
  running: { label: "かけっこ", icon: "🏃" },
  wide_space: { label: "広い場所", icon: "🌿" },
  vehicle: { label: "乗り物", icon: "🚂" },
  craft: { label: "工作", icon: "✂️" },
  experience: { label: "体験", icon: "🌾" },
  exhibition: { label: "展示・見学", icon: "🔭" },
  science: { label: "科学", icon: "🔬" },
  dinosaur: { label: "恐竜", icon: "🦕" },
  character: { label: "キャラクター", icon: "⭐" },
  nature: { label: "自然", icon: "🌲" },
  food: { label: "食べ物", icon: "🍓" },
};

export const RECOMMENDED_FOR_TAG_HEADLINE: Record<RecommendedForTag, string> = {
  animal: "動物が好きな子におすすめの施設",
  animal_contact: "動物とふれあいたい子におすすめの施設",
  animal_feed: "動物にエサをあげたい子におすすめの施設",
  water_play: "水遊びが好きな子におすすめの施設",
  pool: "プールで遊びたい子におすすめの施設",
  playground: "遊具で遊ぶのが好きな子におすすめの施設",
  athletic: "アスレチックが好きな子におすすめの施設",
  slide: "すべり台が好きな子におすすめの施設",
  running: "走り回るのが好きな子におすすめの施設",
  wide_space: "広い場所が好きな子におすすめの施設",
  vehicle: "乗り物が好きな子におすすめの施設",
  craft: "工作・ものづくりが好きな子におすすめの施設",
  experience: "体験・農業に興味がある子におすすめの施設",
  exhibition: "展示・見学が好きな子におすすめの施設",
  science: "科学・実験が好きな子におすすめの施設",
  dinosaur: "恐竜が好きな子におすすめの施設",
  character: "キャラクターが好きな子におすすめの施設",
  nature: "自然が好きな子におすすめの施設",
  food: "食べ物・収穫体験が好きな子におすすめの施設",
};

export function getRecommendedForTagMeta(tag: RecommendedForTag) {
  return RECOMMENDED_FOR_TAG_META[tag];
}
