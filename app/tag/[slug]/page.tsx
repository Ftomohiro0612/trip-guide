import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import FacilityCard from "@/components/FacilityCard";
import PrefectureSelector from "@/components/PrefectureSelector";
import ResponsiveResultsMap from "@/components/ResponsiveResultsMap";
import { visibleFacilities, prefectures } from "@/lib/facilities";
import {
  TAG_META,
  buildTagFacilityFilterHref,
  getTagFacilities,
  getTagMetaBySlug,
} from "@/lib/tags";
import { resolvePrefectureId } from "@/lib/facility-area-filter";
import { prefectureEmoji } from "@/lib/icons";
import { BreadcrumbJsonLd, ItemListJsonLd } from "@/components/JsonLd";
import type { RawSearchParams } from "@/lib/filter";

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<RawSearchParams>;
}

function asSingleParam(value: string | string[] | undefined): string {
  if (!value) return "";
  return Array.isArray(value) ? value[0] ?? "" : value;
}

export function generateStaticParams() {
  return TAG_META.map((t) => ({ slug: t.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const meta = getTagMetaBySlug(slug);
  if (!meta) return { title: "見つかりませんでした" };
  const list = getTagFacilities(meta, visibleFacilities);
  return {
    title: `${meta.title} ${list.length}選 (全国)`,
    description: `${meta.lead} 全国30都府県で${meta.title}を${list.length}施設掲載。`,
    alternates: {
      canonical: `/tag/${meta.slug}`,
    },
  };
}

export default async function TagPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const sp = await searchParams;
  const meta = getTagMetaBySlug(slug);
  if (!meta) notFound();

  const list = getTagFacilities(meta, visibleFacilities);
  const selectedPrefectureId = resolvePrefectureId(
    asSingleParam(sp.prefecture),
    prefectures,
  );
  const selectedPrefecture = prefectures.find(
    (prefecture) => prefecture.id === selectedPrefectureId,
  );
  const filteredList = selectedPrefectureId
    ? list.filter(
        (facility) => facility.prefecture_id === selectedPrefectureId,
      )
    : list;
  const prefectureOptions = prefectures.map((prefecture) => ({
    ...prefecture,
    count: list.filter(
      (facility) => facility.prefecture_id === prefecture.id,
    ).length,
  }));
  const byPref = prefectures.map((p) => ({
    ...p,
    items: filteredList.filter((f) => f.prefecture_id === p.id),
  }));
  const pageTitle = selectedPrefecture
    ? `${selectedPrefecture.name}の${meta.title}`
    : meta.title;

  return (
    <div>
      <BreadcrumbJsonLd
        items={[
          { name: "ホーム", href: "/" },
          { name: "タグ", href: "/" },
          { name: meta.title },
        ]}
      />
      <ItemListJsonLd
        name={pageTitle}
        items={filteredList.map((f) => ({
          name: f.name,
          href: `/facilities/${f.slug}`,
        }))}
      />
      <section className="relative bg-gradient-to-br from-sky-400 via-cyan-400 to-emerald-400 text-white">
        <div className="absolute inset-0 bg-black/10" />
        <div className="relative mx-auto max-w-5xl px-4 py-10 sm:py-14">
          <nav aria-label="パンくず" className="text-xs text-white/90 mb-4">
            <Link href="/" className="hover:underline">
              ホーム
            </Link>
            <span className="mx-1.5">/</span>
            <span>タグ</span>
            <span className="mx-1.5">/</span>
            <span>{meta.title}</span>
          </nav>
          <div className="flex items-start gap-4">
            <span className="text-5xl sm:text-7xl drop-shadow" aria-hidden>
              {meta.emoji}
            </span>
            <div className="flex-1">
              <p className="text-xs font-medium opacity-95">タグ特集</p>
              <h1 className="text-2xl sm:text-4xl font-bold drop-shadow tracking-tight mt-1">
                {pageTitle}
              </h1>
              <p className="mt-3 text-sm sm:text-base opacity-95 max-w-2xl">
                {meta.lead}
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 py-8">
        <PrefectureSelector
          prefectures={prefectureOptions}
          selectedId={selectedPrefectureId}
          disableEmpty
        />
        <p
          id="facility-results"
          className="mt-3 text-sm font-semibold text-slate-700"
          aria-live="polite"
        >
          {selectedPrefecture ? `${selectedPrefecture.name} / ` : "全国 / "}
          {filteredList.length}件の施設
        </p>
        <p className="text-slate-700 leading-relaxed max-w-3xl">{meta.long}</p>

        {filteredList.length === 0 && (
          <div className="mt-8 rounded-2xl border border-slate-200 bg-white py-14 text-center">
            <p className="font-bold text-slate-800">
              この都府県には該当する施設がありません
            </p>
            <p className="mt-1 text-sm text-slate-500">
              別の都府県または全国を選んでください。
            </p>
          </div>
        )}

        {byPref.map((p) =>
          p.items.length === 0 ? null : (
            <section
              key={p.id}
              className="mt-10"
              aria-labelledby={`pref-${p.id}`}
              data-prefecture-section={p.id}
            >
              <div className="flex items-end justify-between mb-3">
                <h2
                  id={`pref-${p.id}`}
                  className="text-xl font-bold text-slate-900 flex items-center gap-2"
                >
                  <span aria-hidden>{prefectureEmoji[p.id]}</span>
                  {p.name}の{meta.title}
                  <span className="text-sm font-normal text-slate-500">
                    {p.items.length}件
                  </span>
                </h2>
                <Link
                  href={buildTagFacilityFilterHref(meta, p.id)}
                  className="text-sm text-brand hover:text-brand-dark"
                >
                  絞り込みで見る →
                </Link>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {p.items.map((f) => (
                  <FacilityCard key={f.id} facility={f} />
                ))}
              </div>
            </section>
          ),
        )}

        {filteredList.length > 0 && (
          <ResponsiveResultsMap facilities={filteredList} />
        )}

        <section className="mt-12">
          <h2 className="text-xl font-bold mb-3">他のテーマもチェック</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {TAG_META.filter((t) => t.slug !== meta.slug).map((t) => (
              <Link
                key={t.slug}
                href={`/tag/${t.slug}`}
                className="group flex items-center gap-2 bg-white border border-slate-200 hover:border-brand rounded-2xl p-3 transition-colors"
              >
                <span className="text-2xl shrink-0" aria-hidden>
                  {t.emoji}
                </span>
                <p className="font-bold text-sm text-slate-900 group-hover:text-brand line-clamp-1">
                  {t.title}
                </p>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
