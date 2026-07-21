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
  prefectures,
} from "@/lib/facilities";
import {
  CRAFT_TYPE_OPTIONS,
  getFacilitiesForCategoryPage,
} from "@/lib/category-page-facilities";
import { categoryDescriptions } from "@/lib/descriptions";
import { prefectureEmoji } from "@/lib/icons";
import { BreadcrumbJsonLd, ItemListJsonLd } from "@/components/JsonLd";
import { isPilotCross } from "@/lib/crossings";
import type { RawSearchParams } from "@/lib/filter";
import { groupFacilityPageByPrefecture } from "@/lib/facility-pagination";

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<RawSearchParams>;
}

function asSingleParam(value: string | string[] | undefined): string {
  if (!value) return "";
  return Array.isArray(value) ? value[0] ?? "" : value;
}

function craftTypeHref(prefectureId: string, craftTypeId: string | null) {
  const params = new URLSearchParams();
  if (prefectureId) params.set("prefecture", prefectureId);
  if (craftTypeId) params.set("craft_type", craftTypeId);
  params.set("page", "1");
  return `?${params.toString()}`;
}

export function generateStaticParams() {
  return categories.map((category) => ({ id: category.id }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const meta = getCategoryMeta(id);
  if (!meta) return { title: "見つかりませんでした" };
  const desc = categoryDescriptions[meta.id] ?? "";
  const result = getFacilitiesForCategoryPage({ categoryId: meta.id });
  const visibleCount = result.page.totalItems;
  const title = `${meta.name} ${visibleCount}選 (全国)`;
  const description = `${desc} 全国30都府県の${meta.name}を${visibleCount}施設まとめて掲載。`;
  return {
    title,
    description,
    alternates: { canonical: `/category/${meta.id}` },
    openGraph: {
      title,
      description,
      url: `/category/${meta.id}`,
    },
  };
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const { id } = await params;
  const sp = await searchParams;
  const meta = getCategoryMeta(id);
  if (!meta) notFound();

  const result = getFacilitiesForCategoryPage({
    categoryId: meta.id,
    prefectureId: asSingleParam(sp.prefecture),
    craftTypeId: asSingleParam(sp.craft_type),
    page: sp.page,
  });
  const selectedPrefectureId = result.selectedPrefectureId;
  const selectedPrefecture = prefectures.find(
    (prefecture) => prefecture.id === selectedPrefectureId,
  );
  const selectedCraftType = CRAFT_TYPE_OPTIONS.find(
    (option) => option.id === result.selectedCraftTypeId,
  );
  const prefectureOptions = prefectures.map((prefecture) => ({
    ...prefecture,
    count: result.prefectureCounts.get(prefecture.id) ?? 0,
  }));
  const desc = categoryDescriptions[meta.id] ?? "";
  const pageTitle = [
    selectedPrefecture?.name,
    selectedCraftType?.label,
    meta.name,
  ]
    .filter(Boolean)
    .join("の");
  const showDiversifiedNationwideGrid =
    meta.id === "craft" &&
    !result.selectedPrefectureId &&
    !result.selectedCraftTypeId;
  const visibleSections = showDiversifiedNationwideGrid
    ? [
        {
          id: "nationwide",
          name: "全国",
          items: result.page.items,
          currentPageContinuesPrefecture: false,
        },
      ]
    : groupFacilityPageByPrefecture(
        result.page.items,
        prefectures,
        result.orderedFacilities[result.page.startIndex - 1]?.prefecture_id,
      );
  const rainCount = result.filteredFacilities.filter(
    (facility) => facility.rain_friendly === "◎",
  ).length;
  const freeCount = result.filteredFacilities.filter(
    (facility) => facility.is_free,
  ).length;
  const areaCount = new Set(
    result.filteredFacilities.map((facility) => facility.prefecture_id),
  ).size;

  return (
    <div>
      <BreadcrumbJsonLd
        items={[{ name: "ホーム", href: "/" }, { name: meta.name }]}
      />
      <ItemListJsonLd
        name={pageTitle}
        items={result.jsonLdFacilities.map((facility) => ({
          name: facility.name,
          href: `/facilities/${facility.slug}`,
        }))}
      />
      <section className="relative bg-gradient-to-br from-orange-400 via-amber-400 to-yellow-400 text-white">
        <div className="absolute inset-0 bg-black/10" />
        <div className="relative mx-auto max-w-5xl px-4 py-10 sm:py-14">
          <nav aria-label="パンくず" className="mb-4 text-xs text-white/90">
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
              <h1 className="mt-1 text-2xl font-bold tracking-tight drop-shadow sm:text-4xl">
                {pageTitle}
              </h1>
              <p className="mt-3 max-w-2xl text-sm opacity-95 sm:text-base">
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
        {meta.id === "craft" && (
          <section
            className="mt-5"
            aria-labelledby="craft-type-filter-heading"
          >
            <h2
              id="craft-type-filter-heading"
              className="text-sm font-bold text-slate-800"
            >
              作りたいものから探す
            </h2>
            <div className="mt-2 flex max-w-full flex-wrap gap-2">
              <Link
                href={craftTypeHref(result.selectedPrefectureId ?? "", null)}
                aria-current={!result.selectedCraftTypeId ? "page" : undefined}
                className={`rounded-full border px-3 py-2 text-sm font-bold transition-colors ${
                  !result.selectedCraftTypeId
                    ? "border-brand bg-brand text-white"
                    : "border-slate-200 bg-white text-slate-700 hover:border-brand hover:text-brand"
                }`}
              >
                すべて
              </Link>
              {CRAFT_TYPE_OPTIONS.map((option) => {
                const count = result.craftTypeCounts.get(option.id) ?? 0;
                const selected = result.selectedCraftTypeId === option.id;
                return (
                  <Link
                    key={option.id}
                    href={craftTypeHref(
                      result.selectedPrefectureId ?? "",
                      option.id,
                    )}
                    aria-current={selected ? "page" : undefined}
                    className={`rounded-full border px-3 py-2 text-sm font-bold transition-colors ${
                      selected
                        ? "border-brand bg-brand text-white"
                        : "border-slate-200 bg-white text-slate-700 hover:border-brand hover:text-brand"
                    }`}
                  >
                    {option.label}
                    <span className="ml-1 text-xs opacity-80">{count}</span>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        <div className="mt-5" id="facility-results">
          <h2
            id="facility-results-heading"
            tabIndex={-1}
            className="mb-2 scroll-mt-24 text-xl font-bold text-slate-900 outline-none"
          >
            {selectedPrefecture ? `${selectedPrefecture.name}の` : ""}
            施設一覧
          </h2>
          <FacilityPaginationSummary page={result.page} />
        </div>

        {result.mapFacilities.length > 0 && (
          <section className="mb-8" aria-labelledby="category-map-heading">
            <h2
              id="category-map-heading"
              className="mb-3 mt-6 text-xl font-bold text-slate-900"
            >
              📍 このページの施設を地図で見る
              <span className="ml-2 text-sm font-normal text-slate-500">
                {result.mapFacilities.length}件
              </span>
            </h2>
            <MapViewClient facilities={result.mapFacilities} height={420} />
          </section>
        )}

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="該当施設" count={result.page.totalItems} emoji="🎈" />
          <Stat label="雨でも快適" count={rainCount} emoji="☂️" />
          <Stat label="無料" count={freeCount} emoji="🆓" />
          <Stat label="エリア数" count={areaCount} emoji="📍" />
        </div>

        {result.filteredFacilities.length === 0 && (
          <div className="mt-8 rounded-2xl border border-slate-200 bg-white py-14 text-center">
            <p className="font-bold text-slate-800">
              条件に合う施設がありません
            </p>
            <p className="mt-1 text-sm text-slate-500">
              別の都府県または種類を選んでください。
            </p>
          </div>
        )}

        {visibleSections.map((section) => (
          <section
            key={section.id}
            className="mt-10"
            aria-labelledby={`pref-${section.id}`}
            data-prefecture-section={section.id}
          >
            <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <h2
                id={`pref-${section.id}`}
                className="flex flex-wrap items-center gap-2 text-xl font-bold text-slate-900"
              >
                <span aria-hidden>
                  {section.id === "nationwide"
                    ? "🗾"
                    : prefectureEmoji[section.id]}
                </span>
                {section.name}の{meta.name}
                {section.currentPageContinuesPrefecture && (
                  <span className="rounded-full bg-sky-50 px-2 py-0.5 text-xs font-bold text-sky-700">
                    {section.name}の続き
                  </span>
                )}
                <span className="text-sm font-normal text-slate-500">
                  {section.items.length}件
                </span>
              </h2>
              {section.id !== "nationwide" && (
                <div className="flex flex-wrap gap-x-4 gap-y-1">
                  {isPilotCross(section.id, meta.id) && (
                    <Link
                      href={`/prefecture/${section.id}/category/${meta.id}`}
                      className="text-sm text-brand hover:text-brand-dark"
                    >
                      {section.name}の{meta.name}だけ見る →
                    </Link>
                  )}
                  <Link
                    href={`/prefecture/${section.id}`}
                    className="text-sm text-brand hover:text-brand-dark"
                  >
                    {section.name}全体を見る →
                  </Link>
                </div>
              )}
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {section.items.map((facility) => (
                <FacilityCard key={facility.id} facility={facility} />
              ))}
            </div>
          </section>
        ))}

        <FacilityPaginationControls page={result.page} />

        <section className="mt-12">
          <h2 className="mb-3 text-xl font-bold">他のカテゴリもチェック</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {categories
              .filter((category) => category.id !== meta.id)
              .map((category) => {
                const count = getFacilitiesForCategoryPage({
                  categoryId: category.id,
                }).page.totalItems;
                return (
                  <Link
                    key={category.id}
                    href={`/category/${category.id}`}
                    className="group flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 transition-colors hover:border-brand"
                  >
                    <CategoryIcon
                      categoryId={category.id}
                      width={32}
                      height={32}
                      className="h-8 w-8 shrink-0"
                    />
                    <div className="min-w-0">
                      <p className="line-clamp-1 text-sm font-bold text-slate-900 group-hover:text-brand">
                        {category.name}
                      </p>
                      <p className="text-xs text-slate-500">{count} 施設</p>
                    </div>
                  </Link>
                );
              })}
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
    <div className="rounded-2xl border border-slate-200 bg-white p-3">
      <div className="flex items-center gap-2">
        <span className="text-2xl" aria-hidden>
          {emoji}
        </span>
        <div>
          <p className="text-xs text-slate-500">{label}</p>
          <p className="text-lg font-bold text-slate-900">
            {count}{" "}
            <span className="text-xs font-normal text-slate-500">施設</span>
          </p>
        </div>
      </div>
    </div>
  );
}
