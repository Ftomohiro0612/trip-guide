"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavItem = { href: string; label: string; icon: string; exact?: boolean };

const items: NavItem[] = [
  { href: "/mypage/visits/new", label: "記録する", icon: "✏️" },
  { href: "/mypage/wishlist", label: "行きたい", icon: "⭐" },
  { href: "/mypage/visits", label: "履歴", icon: "📖" },
  { href: "/mypage", label: "マイページ", icon: "👤", exact: true },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="マイページナビゲーション"
      className="fixed bottom-0 left-0 right-0 z-20 bg-white border-t border-slate-200 flex safe-bottom"
    >
      {items.map((item) => {
        const active = item.exact
          ? pathname === item.href
          : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex-1 flex flex-col items-center py-2 gap-0.5 text-xs transition-colors ${
              active
                ? "text-brand font-bold"
                : "text-slate-500 hover:text-slate-700"
            }`}
            aria-current={active ? "page" : undefined}
          >
            <span className="text-xl leading-none">{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
