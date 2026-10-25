import type { Metadata } from "next";

export const metadata: Metadata = { title: "おでかけ相談", robots: { index: false, follow: false } };

export default function SoudanLayout({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto max-w-2xl space-y-5 px-4 py-6 text-slate-900">{children}</div>;
}
