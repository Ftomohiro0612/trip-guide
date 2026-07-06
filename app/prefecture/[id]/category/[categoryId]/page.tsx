import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import CategoryIcon from "@/components/CategoryIcon";
import FacilityCard from "@/components/FacilityCard";
import { BreadcrumbJsonLd, ItemListJsonLd } from "@/components/JsonLd";
import MapViewClient from "@/components/MapViewClient";
import { isPilotCross, getPilotCrossParams } from "@/lib/crossings";
import {
  getCategoryMeta,
  getFacilitiesByPrefecture,
  getPrefectureMeta,
} from "@/lib/facilities";
import { prefectureEmoji, prefectureGradients } from "@/lib/icons";
import type { Facility, PrefectureId } from "@/types/facility";

interface Props {
  params: Promise<{ id: string; categoryId: string }>;
}

export const dynamicParams = false;

export function generateStaticParams() {
  return getPilotCrossParams();
}

function sortFacilities(list: Facility[]) {
  return list.slice().sort((a, b) => {
    const score = (f: Facility) =>
      (f.rain_friendly === "◎" ? 2 : 0) + (f.is_free ? 1 : 0);
    return score(b) - score(a) || a.id - b.id;
  });
}

function buildLead(prefName: string, categoryName: string, count: number, firstName: string) {
  return `${prefName}で子どもと楽しめる${categoryName}を${count}件掲載。${firstName}など、家族で行けるスポットをまとめました。`;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id, categoryId } = await params;
  if (!isPilotCross(id, categoryId)) notFound();

  const pref = getPrefectureMeta(id as PrefectureId);
  const category = getCategoryMeta(categoryId);
  if (!pref || !category) notFound();

  const list = sortFacilities(
    getFacilitiesByPrefecture(pref.id).filter(
      (f) => f.category_id === category.id,
    ),
  );
  const title = `${pref.name}の${category.name} ${list.length}選`;
  const description = buildLead(
    pref.name,
    category.name,
    list.length,
    list[0].name,
  );

  return {
    title,
    description,
    alternates: {
      canonical: `/prefecture/${pref.id}/category/${category.id}`,
    },
  };
}

export default async function PrefectureCategoryPage({ params }: Props) {
  const { id, categoryId } = await params;
  if (!isPilotCross(id, categoryId)) notFound();

  const pref = getPrefectureMeta(id as PrefectureId);
  const category = getCategoryMeta(categoryId);
  if (!pref || !category) notFound();

  const list = sortFacilities(
    getFacilitiesByPrefecture(pref.id).filter(
      (f) => f.category_id === category.id,
    ),
  );
  const title = `${pref.name}の${category.name} ${list.length}選`;
  const lead = buildLead(pref.name, category.name, list.length, list[0].name);
  const gradient = prefectureGradients[pref.id];
  const generated = getPilotCrossParams();
  const otherCategories = generated
    .filter((p) => p.id === pref.id && p.categoryId !== category.id)
    .map((p) => getCategoryMeta(p.categoryId))
    .filter((meta): meta is NonNullable<typeof meta> => Boolean(meta));
  const otherPrefectures = generated
    .filter((p) => p.id !== pref.id && p.categoryId === category.id)
    .map((p) => getPrefectureMeta(p.id))
    .filter((meta): meta is NonNullable<typeof meta> => Boolean(meta));

  return (
    <div>
      <BreadcrumbJsonLd
        items={[
          { name: "ホーム", href: "/" },
          { name: pref.name, href: `/prefecture/${pref.id}` },
          { name: category.name },
        ]}
      />
      <ItemListJsonLd
        name={title}
        items={list.map((f) => ({
          name: f.name,
          href: `/facilities/${f.slug}`,
        }))}
      />

      <section className={`relative bg-gradient-to-br ${gradient} text-white`}>
        <div className="absolute inset-0 bg-black/10" />
        <div className="relative mx-auto max-w-5xl px-4 py-10 sm:py-14">
          <nav aria-label="パンくず" className="mb-4 text-xs text-white/90">
            <Link href="/" className="hover:underline">
              ホーム
            </Link>
            <span className="mx-1.5">/</span>
            <Link href={`/prefecture/${pref.id}`} className="hover:underline">
              {pref.name}
            </Link>
            <span className="mx-1.5">/</span>
            <span>{category.name}</span>
          </nav>
          <div className="flex items-start gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/20 backdrop-blur sm:h-20 sm:w-20">
              <CategoryIcon
                categoryId={category.id}
                width={56}
                height={56}
                className="h-12 w-12 drop-shadow sm:h-14 sm:w-14"
              />
            </div>
            <div className="flex-1">
              <p className="text-xs font-medium opacity-95">
                {pref.name}のカテゴリ特集
              </p>
              <h1 className="mt-1 text-2xl font-bold tracking-tight drop-shadow sm:text-4xl">
                {title}
              </h1>
              <p className="mt-3 max-w-2xl text-sm opacity-95 sm:text-base">
                {lead}
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 py-8">
        <section className="mb-8" aria-labelledby="cross-map-heading">
          <h2
            id="cross-map-heading"
            className="mb-3 text-xl font-bold text-slate-900"
          >
            📍 {pref.name}の{category.name}マップ
            <span className="ml-2 text-sm font-normal text-slate-500">
              {list.length}件
            </span>
          </h2>
          <MapViewClient
            facilities={list}
            height={420}
            storageKey={`cross:${pref.id}:${category.id}`}
          />
        </section>

        <p className="max-w-3xl leading-relaxed text-slate-700">{lead}</p>

        <section className="mt-10">
          <h2 className="mb-1 text-xl font-bold">
            {pref.name}の{category.name} 全{list.length}施設
          </h2>
          <p className="mb-4 text-sm text-slate-500">
            おすすめ順（雨対応・無料施設を優先）
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((f) => (
              <FacilityCard key={f.id} facility={f} />
            ))}
          </div>
        </section>

        {(otherCategories.length > 0 || otherPrefectures.length > 0) && (
          <section className="mt-12 grid grid-cols-1 gap-6 lg:grid-cols-2">
            {otherCategories.length > 0 && (
              <div>
                <h2 className="mb-3 text-xl font-bold">
                  {pref.name}の他カテゴリ
                </h2>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {otherCategories.map((c) => (
                    <Link
                      key={c.id}
                      href={`/prefecture/${pref.id}/category/${c.id}`}
                      className="group flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 transition-colors hover:border-brand"
                    >
                      <CategoryIcon
                        categoryId={c.id}
                        width={32}
                        height={32}
                        className="h-8 w-8 shrink-0"
                      />
                      <span className="font-bold text-slate-900 group-hover:text-brand">
                        {pref.name}の{c.name}
                      </span>
                      <span className="ml-auto text-slate-400 group-hover:text-brand">
                        →
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {otherPrefectures.length > 0 && (
              <div>
                <h2 className="mb-3 text-xl font-bold">
                  他エリアの{category.name}
                </h2>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {otherPrefectures.map((p) => (
                    <Link
                      key={p.id}
                      href={`/prefecture/${p.id}/category/${category.id}`}
                      className="group flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 transition-colors hover:border-brand"
                    >
                      <span className="text-3xl" aria-hidden>
                        {prefectureEmoji[p.id]}
                      </span>
                      <span className="font-bold text-slate-900 group-hover:text-brand">
                        {p.name}の{category.name}
                      </span>
                      <span className="ml-auto text-slate-400 group-hover:text-brand">
                        →
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
