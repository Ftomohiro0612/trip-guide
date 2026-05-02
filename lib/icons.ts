export const categoryIcons: Record<string, string> = {
  "theme-park": "🎢",
  zoo: "🦁",
  aquarium: "🐠",
  park: "🌳",
  "indoor-play": "🏠",
  "science-museum": "🔬",
  museum: "🏛️",
  craft: "🎨",
  "fruit-picking": "🍓",
  "hot-spring-pool": "♨️",
  athletic: "🧗",
  "art-museum": "🖼️",
  ski: "⛷️",
  hotel: "🏨",
  experience: "✨",
};

export function categoryIcon(categoryId: string): string {
  return categoryIcons[categoryId] ?? "📍";
}

export const prefectureGradients: Record<string, string> = {
  shizuoka: "from-sky-400 via-cyan-400 to-emerald-400",
  nagano: "from-emerald-500 via-teal-500 to-sky-500",
  yamanashi: "from-fuchsia-400 via-violet-500 to-indigo-500",
};

export const prefectureEmoji: Record<string, string> = {
  shizuoka: "🗻",
  nagano: "🏔️",
  yamanashi: "🍇",
};
