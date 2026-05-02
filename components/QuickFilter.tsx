import Link from "next/link";

interface QuickFilterItem {
  href: string;
  emoji: string;
  label: string;
  sub: string;
  bg: string;
  hover: string;
}

const items: QuickFilterItem[] = [
  {
    href: "/tag/rainy-day",
    emoji: "☂️",
    label: "今日は雨",
    sub: "雨でも楽しめる",
    bg: "from-sky-100 to-blue-100",
    hover: "hover:ring-sky-400",
  },
  {
    href: "/tag/free",
    emoji: "🆓",
    label: "お金をかけずに",
    sub: "無料で遊ぶ",
    bg: "from-emerald-100 to-teal-100",
    hover: "hover:ring-emerald-400",
  },
  {
    href: "/tag/kids-0-3",
    emoji: "👶",
    label: "0-3歳の子と",
    sub: "未就学児OK",
    bg: "from-pink-100 to-rose-100",
    hover: "hover:ring-pink-400",
  },
  {
    href: "/tag/elementary",
    emoji: "🧒",
    label: "小学生と",
    sub: "本格アクティビティ",
    bg: "from-orange-100 to-amber-100",
    hover: "hover:ring-orange-400",
  },
  {
    href: "/tag/winter",
    emoji: "⛄",
    label: "冬の雪遊び",
    sub: "スキー場・雪",
    bg: "from-indigo-100 to-violet-100",
    hover: "hover:ring-indigo-400",
  },
];

export default function QuickFilter() {
  return (
    <section aria-label="クイックフィルタ" className="mt-8">
      <h2 className="sr-only">クイックフィルタ</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-col items-center justify-center rounded-2xl bg-gradient-to-br ${item.bg} p-4 text-center ring-2 ring-transparent ${item.hover} hover:scale-[1.02] active:scale-[0.99] transition-all shadow-sm`}
          >
            <span className="text-3xl sm:text-4xl mb-1.5" aria-hidden>
              {item.emoji}
            </span>
            <span className="font-bold text-sm sm:text-base text-slate-900">
              {item.label}
            </span>
            <span className="text-xs text-slate-600 mt-0.5">{item.sub}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
