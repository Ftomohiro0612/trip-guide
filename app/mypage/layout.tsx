import type { Metadata } from "next";
import BottomNav from "./BottomNav";

export const metadata: Metadata = {
  title: {
    default: "マイページ | メモリップ",
    template: "%s | メモリップ",
  },
  robots: { index: false, follow: false },
};

export default function MypageLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="pb-24 lg:pb-0 min-h-screen">
      {children}
      <BottomNav />
    </div>
  );
}
