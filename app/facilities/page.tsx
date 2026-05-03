import type { Metadata } from "next";
import Link from "next/link";
import FacilityCard from "@/components/FacilityCard";
import FilterSidebar from "@/components/FilterSidebar";
import SortSelect from "@/components/SortSelect";
import ActiveFilterChips from "@/components/ActiveFilterChips";
import MapViewClient from "@/components/MapViewClient";
import { facilities, prefectures, categories } from "@/lib/facilities";
import {
  applyFilters,
  hasActiveFilters,
  parseFilterParams,
  type RawSearchParams,
} from "@/lib/filter";

export const metadata: Metadata = {
  title: "施設一覧",
  description:
    "静岡・長野・山梨の子供向け遊び場を、エリア・カテゴリ・雨対応・料金などで絞り込み検索。",
  alternates: { canonical: "/facilities" },
  robots: {
    // Don't index filtered variants
    index: true,
    follow: true,
  },
};

interface Props {
  searchParams: Promise<RawSearchParams>;
}

export default async function FacilitiesPage({ searchParams }: Props) {
  const sp = await searchParams;
  const filters = parseFilterParams(sp);
  const results = applyFilters(facilities, filters);
  const active = hasActiveFilters(filters);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <nav aria-label="パンくず" className="text-xs text-slate-500 mb-4">
        <Link href="/" className="hover:text-brand">
          ホーム
        </Link>
        <span className="mx-1.5">/</span>
        <span>施設一覧</span>
      </nav>

      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
          施設一覧
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          {filters.q ? (
            <>
              「<span className="font-medium text-slate-700">{filters.q}</span>
              」の検索結果: {results.length} 件
            </>
          ) : (
            <>全 {facilities.length} 施設 / 表示中 {results.length} 件</>
          )}
        </p>
      </div>

      {results.length > 0 && (
        <section className="mb-8" aria-labelledby="facilities-map-heading">
          <h2 id="facilities-map-heading" className="sr-only">
            検索結果の地図
          </h2>
          <MapViewClient facilities={results} height={420} />
        </section>
      )}

      <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
        <FilterSidebar
          prefectures={prefectures}
          categories={categories}
          resultCount={results.length}
        />

        <section>
          <ActiveFilterChips
            prefectures={prefectures}
            categories={categories}
          />
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-slate-600">
              {results.length} 件{active && " ※ 絞り込み中"}
            </p>
            <SortSelect />
          </div>

          {results.length === 0 ? (
            <div className="text-center py-16 bg-white border border-slate-200 rounded-2xl">
              <p className="text-4xl mb-2" aria-hidden>
                😢
              </p>
              <p className="text-slate-700 font-medium">
                条件に合う施設が見つかりませんでした
              </p>
              <p className="text-sm text-slate-500 mt-1">
                条件を絞り込みすぎていないか、ご確認ください。
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {results.map((f) => (
                <FacilityCard key={f.id} facility={f} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
