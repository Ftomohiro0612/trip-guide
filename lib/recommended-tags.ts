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

export function getRecommendedForTagMeta(tag: RecommendedForTag) {
  return RECOMMENDED_FOR_TAG_META[tag];
}
