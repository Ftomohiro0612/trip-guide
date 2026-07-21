import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import CategoryIcon from "@/components/CategoryIcon";
import FacilityCard from "@/components/FacilityCard";
import {
  FacilityPaginationControls,
  FacilityPaginationSummary,
} from "@/components/FacilityPagination";
import MapViewClient from "@/components/MapViewClient";
import PrefectureSelector from "@/components/PrefectureSelector";
import {
  categories,
  getCategoryMeta,
  getFacilitiesByCategory,
  prefectures,
} from "@/lib/facilities";
import {
  filterByPrefectureIds,
  resolvePrefectureId,
} from "@/lib/facility-area-filter";
import { categoryDescriptions } from "@/lib/descriptions";
import { prefectureEmoji } from "@/lib/icons";
import { BreadcrumbJsonLd, ItemListJsonLd } from "@/components/JsonLd";
import { isPilotCross } from "@/lib/crossings";
import type { RawSearchParams } from "@/lib/filter";
import {
  groupFacilityPageByPrefecture,
  orderFacilitiesByPrefecture,
  paginateFacilities,
} from "@/lib/facility-pagination";

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<RawSearchParams>;
}

function asSingleParam(value: string | string[] | undefined): string {
  if (!value) return "";
  return Array.isArray(value) ? value[0] ?? "" : value;
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

export default async function CategoryPage({ params, searchParams }: Props) {
  const { id } = await params;
  const sp = await searchParams;
  const meta = getCategoryMeta(id);
  if (!meta) notFound();

  const list = getFacilitiesByCategory(meta.id);
  const selectedPrefectureId = resolvePrefectureId(
    asSingleParam(sp.prefecture),
    prefectures,
  );
  const selectedPrefecture = prefectures.find(
    (prefecture) => prefecture.id === selectedPrefectureId,
  );
  const filteredList = filterByPrefectureIds(
    list,
    selectedPrefectureId ? [selectedPrefectureId] : [],
  );
  const orderedList = orderFacilitiesByPrefecture(filteredList, prefectures);
  const facilityPage = paginateFacilities(
    orderedList,
    asSingleParam(sp.page),
  );
  const prefectureOptions = prefectures.map((prefecture) => ({
    ...prefecture,
    count: list.filter(
      (facility) => facility.prefecture_id === prefecture.id,
    ).length,
  }));
  const visibleCount = filteredList.length;
  const desc = categoryDescriptions[meta.id] ?? "";
  const pageTitle = selectedPrefecture
    ? `${selectedPrefecture.name}の${meta.name}`
    : meta.name;

  const visiblePrefectureSections = groupFacilityPageByPrefecture(
    facilityPage.items,
    prefectures,
    orderedList[facilityPage.startIndex - 1]?.prefecture_id,
  );

  const rainCount = filteredList.filter(
    (facility) => facility.rain_friendly === "◎",
  ).length;
  const freeCount = filteredList.filter((facility) => facility.is_free).length;
  const resultPrefectureCount = new Set(
    filteredList.map((facility) => facility.prefecture_id),
  ).size;

  return (
    <div>
      <BreadcrumbJsonLd
        items={[{ name: "ホーム", href: "/" }, { name: meta.name }]}
      />
      <ItemListJsonLd
        name={pageTitle}
        items={facilityPage.items.map((f) => ({
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
                {pageTitle}
              </h1>
              <p className="mt-3 text-sm sm:text-base opacity-95 max-w-2xl">
                {desc}
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
        <div className="mt-5" id="facility-results">
          <h2
            id="facility-results-heading"
            tabIndex={-1}
            className="mb-2 scroll-mt-24 text-xl font-bold text-slate-900 outline-none"
          >
            {selectedPrefecture ? selectedPrefecture.name + "の" : ""}
            施設一覧
          </h2>
          <FacilityPaginationSummary page={facilityPage} />
        </div>

        {filteredList.length > 0 && (
          <section className="mb-8" aria-labelledby="category-map-heading">
            <h2
              id="category-map-heading"
              className="mt-6 text-xl font-bold text-slate-900 mb-3"
            >
              📍 地図で見る
              <span className="text-sm font-normal text-slate-500 ml-2">
                {facilityPage.items.length}件
              </span>
            </h2>
            <MapViewClient facilities={facilityPage.items} height={420} />
          </section>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Stat label="全施設" count={visibleCount} emoji="🎈" />
          <Stat label="雨でも快適" count={rainCount} emoji="☂️" />
          <Stat label="無料" count={freeCount} emoji="🆓" />
          <Stat
            label="エリア数"
            count={resultPrefectureCount}
            emoji="📍"
          />
        </div>

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

        {visiblePrefectureSections.map((p) =>
          p.items.length === 0 ? null : (
            <section
              key={p.id}
              className="mt-10"
              aria-labelledby={`pref-${p.id}`}
              data-prefecture-section={p.id}
            >
              <div className="flex flex-col gap-2 mb-3 sm:flex-row sm:items-end sm:justify-between">
                <h2
                  id={`pref-${p.id}`}
                  className="flex flex-wrap items-center gap-2 text-xl font-bold text-slate-900"
                >
                  <span aria-hidden>{prefectureEmoji[p.id]}</span>
                  {p.name}の{meta.name}
                  {p.currentPageContinuesPrefecture && (
                    <span className="rounded-full bg-sky-50 px-2 py-0.5 text-xs font-bold text-sky-700">
                      {p.name}の続き
                    </span>
                  )}
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

        <FacilityPaginationControls page={facilityPage} />

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
