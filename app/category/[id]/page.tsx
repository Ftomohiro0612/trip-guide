import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import CategoryIcon from "@/components/CategoryIcon";
import FacilityCard from "@/components/FacilityCard";
import MapViewClient from "@/components/MapViewClient";
import {
  categories,
  getCategoryMeta,
  getFacilitiesByCategory,
  prefectures,
} from "@/lib/facilities";
import { categoryDescriptions } from "@/lib/descriptions";
import { prefectureEmoji } from "@/lib/icons";
import { BreadcrumbJsonLd, ItemListJsonLd } from "@/components/JsonLd";
import { isPilotCross } from "@/lib/crossings";

interface Props {
  params: Promise<{ id: string }>;
}

export function generateStaticParams() {
  return categories.map((c) => ({ id: c.id }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const meta = getCategoryMeta(id);
  if (!meta) return { title: "見つかりませんでした" };
  const desc = categoryDescriptions[meta.id] ?? "";
  const visibleCount = getFacilitiesByCategory(meta.id).length;
  return {
    title: `${meta.name} ${visibleCount}選 (全国)`,
    description: `${desc} 全国30都府県の${meta.name}を${visibleCount}施設まとめて掲載。`,
    alternates: { canonical: `/category/${meta.id}` },
  };
}

export default async function CategoryPage({ params }: Props) {
  const { id } = await params;
  const meta = getCategoryMeta(id);
  if (!meta) notFound();

  const list = getFacilitiesByCategory(meta.id);
  const visibleCount = list.length;
  const desc = categoryDescriptions[meta.id] ?? "";

  const byPref = prefectures.map((p) => ({
    ...p,
    items: list.filter((f) => f.prefecture_id === p.id),
  }));

  const rainCount = list.filter((f) => f.rain_friendly === "◎").length;
  const freeCount = list.filter((f) => f.is_free).length;

  return (
    <div>
      <BreadcrumbJsonLd
        items={[{ name: "ホーム", href: "/" }, { name: meta.name }]}
      />
      <ItemListJsonLd
        name={meta.name}
        items={list.map((f) => ({
          name: f.name,
          href: `/facilities/${f.slug}`,
        }))}
      />
      <section className="relative bg-gradient-to-br from-orange-400 via-amber-400 to-yellow-400 text-white">
        <div className="absolute inset-0 bg-black/10" />
        <div className="relative mx-auto max-w-5xl px-4 py-10 sm:py-14">
          <nav aria-label="パンくず" className="text-xs text-white/90 mb-4">
            <Link href="/" className="hover:underline">
              ホーム
            </Link>
            <span className="mx-1.5">/</span>
            <span>{meta.name}</span>
          </nav>
          <div className="flex items-start gap-4">
            <CategoryIcon
              categoryId={meta.id}
              width={80}
              height={80}
              className="h-16 w-16 shrink-0 drop-shadow sm:h-20 sm:w-20"
            />
            <div className="flex-1">
              <p className="text-xs font-medium opacity-95">カテゴリ特集</p>
              <h1 className="text-2xl sm:text-4xl font-bold drop-shadow tracking-tight mt-1">
                {meta.name} {visibleCount}選
              </h1>
              <p className="mt-3 text-sm sm:text-base opacity-95 max-w-2xl">
                {desc}
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 py-8">
        {list.length > 0 && (
          <section className="mb-8" aria-labelledby="category-map-heading">
            <h2
              id="category-map-heading"
              className="text-xl font-bold text-slate-900 mb-3"
            >
              📍 地図で見る
              <span className="text-sm font-normal text-slate-500 ml-2">
                {list.length}件
              </span>
            </h2>
            <MapViewClient
              facilities={list}
              height={420}
              storageKey={`category:${meta.id}`}
            />
          </section>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Stat label="全施設" count={visibleCount} emoji="🎈" />
          <Stat label="雨でも遊べる" count={rainCount} emoji="☂️" />
          <Stat label="無料" count={freeCount} emoji="🆓" />
          <Stat label="エリア数" count={byPref.filter((p) => p.items.length > 0).length} emoji="📍" />
        </div>

        {byPref.map((p) =>
          p.items.length === 0 ? null : (
            <section key={p.id} className="mt-10" aria-labelledby={`pref-${p.id}`}>
              <div className="flex flex-col gap-2 mb-3 sm:flex-row sm:items-end sm:justify-between">
                <h2
                  id={`pref-${p.id}`}
                  className="text-xl font-bold text-slate-900 flex items-center gap-2"
                >
                  <span aria-hidden>{prefectureEmoji[p.id]}</span>
                  {p.name}の{meta.name}
                  <span className="text-sm font-normal text-slate-500">
                    {p.items.length}件
                  </span>
                </h2>
                <div className="flex flex-wrap gap-x-4 gap-y-1">
                  {isPilotCross(p.id, meta.id) && (
                    <Link
                      href={`/prefecture/${p.id}/category/${meta.id}`}
                      className="text-sm text-brand hover:text-brand-dark"
                    >
                      {p.name}の{meta.name}だけ見る →
                    </Link>
                  )}
                  <Link
                    href={`/prefecture/${p.id}`}
                    className="text-sm text-brand hover:text-brand-dark"
                  >
                    {p.name}全体を見る →
                  </Link>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {p.items.map((f) => (
                  <FacilityCard key={f.id} facility={f} />
                ))}
              </div>
            </section>
          ),
        )}

        <section className="mt-12">
          <h2 className="text-xl font-bold mb-3">他のカテゴリもチェック</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {categories
              .filter((c) => c.id !== meta.id)
              .map((c) => (
                <Link
                  key={c.id}
                  href={`/category/${c.id}`}
                  className="group flex items-center gap-3 bg-white border border-slate-200 hover:border-brand rounded-2xl p-3 transition-colors"
                >
                  <CategoryIcon
                    categoryId={c.id}
                    width={32}
                    height={32}
                    className="h-8 w-8 shrink-0"
                  />
                  <div className="min-w-0">
                    <p className="font-bold text-sm text-slate-900 group-hover:text-brand line-clamp-1">
                      {c.name}
                    </p>
                    <p className="text-xs text-slate-500">
                      {getFacilitiesByCategory(c.id).length} 施設
                    </p>
                  </div>
                </Link>
              ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function Stat({
  label,
  count,
  emoji,
}: {
  label: string;
  count: number;
  emoji: string;
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-3">
      <div className="flex items-center gap-2">
        <span className="text-2xl" aria-hidden>
          {emoji}
        </span>
        <div>
          <p className="text-xs text-slate-500">{label}</p>
          <p className="font-bold text-lg text-slate-900">
            {count}{" "}
            <span className="text-xs font-normal text-slate-500">施設</span>
          </p>
        </div>
      </div>
    </div>
  );
}
