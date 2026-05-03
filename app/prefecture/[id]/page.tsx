import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import FacilityCard from "@/components/FacilityCard";
import MapViewClient from "@/components/MapViewClient";
import {
  categories,
  getFacilitiesByPrefecture,
  getPrefectureMeta,
  prefectures,
} from "@/lib/facilities";
import { categoryIcon, prefectureEmoji, prefectureGradients } from "@/lib/icons";
import { prefectureDescriptions } from "@/lib/descriptions";
import { BreadcrumbJsonLd, ItemListJsonLd } from "@/components/JsonLd";
import type { PrefectureId } from "@/types/facility";

interface Props {
  params: Promise<{ id: string }>;
}

export function generateStaticParams() {
  return prefectures.map((p) => ({ id: p.id }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const meta = getPrefectureMeta(id as PrefectureId);
  if (!meta) return { title: "見つかりませんでした" };
  const desc = prefectureDescriptions[meta.id];
  return {
    title: `${meta.name}の子供向け遊び場 ${meta.count}選`,
    description: `${desc.lead} 雨の日OK・無料・年齢別など、家族で楽しめる${meta.count}施設をまとめて掲載。`,
    alternates: { canonical: `/prefecture/${meta.id}` },
  };
}

export default async function PrefecturePage({ params }: Props) {
  const { id } = await params;
  const meta = getPrefectureMeta(id as PrefectureId);
  if (!meta) notFound();

  const desc = prefectureDescriptions[meta.id];
  const list = getFacilitiesByPrefecture(meta.id);
  const gradient = prefectureGradients[meta.id];

  const categoryCounts = categories
    .map((c) => ({
      ...c,
      countInPref: list.filter((f) => f.category_id === c.id).length,
    }))
    .filter((c) => c.countInPref > 0)
    .sort((a, b) => b.countInPref - a.countInPref);

  const rainCount = list.filter((f) => f.rain_friendly === "◎").length;
  const freeCount = list.filter((f) => f.is_free).length;
  const babyCount = list.filter((f) => f.tags.includes("0-3歳OK")).length;

  return (
    <div>
      <BreadcrumbJsonLd
        items={[
          { name: "ホーム", href: "/" },
          { name: meta.name },
        ]}
      />
      <ItemListJsonLd
        name={`${meta.name}の子供向け遊び場`}
        items={list.map((f) => ({
          name: f.name,
          href: `/facilities/${f.slug}`,
        }))}
      />
      <section className={`relative bg-gradient-to-br ${gradient} text-white`}>
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
            <span className="text-5xl sm:text-7xl drop-shadow" aria-hidden>
              {prefectureEmoji[meta.id]}
            </span>
            <div className="flex-1">
              <p className="text-xs font-medium opacity-95">エリア特集</p>
              <h1 className="text-2xl sm:text-4xl font-bold drop-shadow tracking-tight mt-1">
                {meta.name}の子供向け遊び場 {meta.count}選
              </h1>
              <p className="mt-3 text-sm sm:text-base opacity-95 max-w-2xl">
                {desc.lead}
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 py-8">
        {list.length > 0 && (
          <section className="mb-8" aria-labelledby="prefecture-map-heading">
            <h2
              id="prefecture-map-heading"
              className="text-xl font-bold text-slate-900 mb-3"
            >
              📍 {meta.name}内の施設マップ
              <span className="text-sm font-normal text-slate-500 ml-2">
                {list.length}件
              </span>
            </h2>
            <MapViewClient facilities={list} height={420} />
          </section>
        )}

        <p className="text-slate-700 leading-relaxed max-w-3xl">{desc.long}</p>

        <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard
            href={`/facilities?prefectures=${meta.id}`}
            label="全施設"
            count={meta.count}
            emoji="🎈"
          />
          <StatCard
            href={`/facilities?prefectures=${meta.id}&tags=雨の日OK`}
            label="雨でも遊べる"
            count={rainCount}
            emoji="☂️"
          />
          <StatCard
            href={`/facilities?prefectures=${meta.id}&fee=free`}
            label="無料で遊べる"
            count={freeCount}
            emoji="🆓"
          />
          <StatCard
            href={`/facilities?prefectures=${meta.id}&tags=0-3歳OK`}
            label="0-3歳OK"
            count={babyCount}
            emoji="👶"
          />
        </div>

        <section className="mt-10" aria-labelledby="cat-heading">
          <h2 id="cat-heading" className="text-xl font-bold mb-3">
            {meta.name}のカテゴリ別
          </h2>
          <div className="flex flex-wrap gap-2">
            {categoryCounts.map((c) => (
              <Link
                key={c.id}
                href={`/facilities?prefectures=${meta.id}&categories=${c.id}`}
                className="inline-flex items-center gap-1.5 bg-white border border-slate-200 hover:border-brand hover:text-brand rounded-full px-3 py-1.5 text-sm transition-colors"
              >
                <span aria-hidden>{categoryIcon(c.id)}</span>
                {c.name}
                <span className="text-xs text-slate-500">({c.countInPref})</span>
              </Link>
            ))}
          </div>
        </section>

        <section className="mt-10">
          <h2 className="text-xl font-bold mb-1">{meta.name} 全{list.length}施設</h2>
          <p className="text-sm text-slate-500 mb-4">
            おすすめ順（雨対応・無料施設を優先）
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {list
              .slice()
              .sort((a, b) => {
                const score = (f: (typeof list)[number]) =>
                  (f.rain_friendly === "◎" ? 2 : 0) + (f.is_free ? 1 : 0);
                return score(b) - score(a) || a.id - b.id;
              })
              .map((f) => (
                <FacilityCard key={f.id} facility={f} />
              ))}
          </div>
        </section>

        <section className="mt-12">
          <h2 className="text-xl font-bold mb-3">他のエリアもチェック</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {prefectures
              .filter((p) => p.id !== meta.id)
              .map((p) => (
                <Link
                  key={p.id}
                  href={`/prefecture/${p.id}`}
                  className="group flex items-center gap-3 bg-white border border-slate-200 hover:border-brand rounded-2xl p-4 transition-colors"
                >
                  <span className="text-3xl" aria-hidden>
                    {prefectureEmoji[p.id]}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-slate-900 group-hover:text-brand">
                      {p.name}
                    </p>
                    <p className="text-xs text-slate-500">{p.count} 施設</p>
                  </div>
                  <span className="text-slate-400 group-hover:text-brand">
                    →
                  </span>
                </Link>
              ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function StatCard({
  href,
  label,
  count,
  emoji,
}: {
  href: string;
  label: string;
  count: number;
  emoji: string;
}) {
  return (
    <Link
      href={href}
      className="group bg-white border border-slate-200 hover:border-brand rounded-2xl p-3 transition-colors"
    >
      <div className="flex items-center gap-2">
        <span className="text-2xl" aria-hidden>
          {emoji}
        </span>
        <div>
          <p className="text-xs text-slate-500">{label}</p>
          <p className="font-bold text-lg text-slate-900 group-hover:text-brand">
            {count}{" "}
            <span className="text-xs font-normal text-slate-500">施設</span>
          </p>
        </div>
      </div>
    </Link>
  );
}

