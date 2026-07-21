import type { Metadata } from "next";
import Link from "next/link";
import FilterSidebar from "@/components/FilterSidebar";
import MobileFilterBar from "@/components/MobileFilterBar";
import SortSelect from "@/components/SortSelect";
import ActiveFilterChips from "@/components/ActiveFilterChips";
import NearbyFilterableFacilityList from "@/components/NearbyFilterableFacilityList";
import PrefectureSelector from "@/components/PrefectureSelector";
import ResponsiveResultsMap from "@/components/ResponsiveResultsMap";
import { visibleFacilities, prefectures, categories } from "@/lib/facilities";
import {
  applyFilters,
  hasActiveFilters,
  parseFilterParams,
  type RawSearchParams,
} from "@/lib/filter";
import { RECOMMENDED_FOR_TAG_HEADLINE } from "@/lib/recommended-tags";
import {
  filterByPrefectureIds,
  resolvePrefectureId,
} from "@/lib/facility-area-filter";
import type { RecommendedForTag } from "@/types/facility";

export const metadata: Metadata = {
  title: "施設一覧",
  description:
    "全国30都府県の子供向け遊び場を、エリア・カテゴリ・雨対応・料金などで絞り込み検索。",
  keywords: ["大阪", "関西", "近畿"],
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

function asSingleParam(value: string | string[] | undefined): string {
  if (!value) return "";
  return Array.isArray(value) ? value[0] ?? "" : value;
}

function isRecommendedForTag(value: string): value is RecommendedForTag {
  return Object.prototype.hasOwnProperty.call(
    RECOMMENDED_FOR_TAG_HEADLINE,
    value,
  );
}

export default async function FacilitiesPage({ searchParams }: Props) {
  const sp = await searchParams;
  const filters = parseFilterParams(sp);
  const recommendedTagParam = asSingleParam(sp.recommended_tag);
  const recommendedTag = isRecommendedForTag(recommendedTagParam)
    ? recommendedTagParam
    : null;
  const selectedPrefectureId = resolvePrefectureId(
    asSingleParam(sp.prefecture),
    prefectures,
  );
  const selectedPrefecture = prefectures.find(
    (prefecture) => prefecture.id === selectedPrefectureId,
  );
  const filtersWithoutArea = { ...filters, prefectures: [] };
  const baseResults = applyFilters(visibleFacilities, filtersWithoutArea);
  const tagFilteredResults = recommendedTag
    ? baseResults.filter((f) =>
        (f.recommended_for_tags ?? []).includes(recommendedTag),
      )
    : baseResults;
  const selectedPrefectureIds = selectedPrefectureId
    ? [selectedPrefectureId]
    : filters.prefectures;
  const results = filterByPrefectureIds(
    tagFilteredResults,
    selectedPrefectureIds,
  );
  const visiblePrefectures = prefectures.map((p) => ({
    ...p,
    count: tagFilteredResults.filter((f) => f.prefecture_id === p.id).length,
  }));
  const visibleCategories = categories.map((c) => ({
    ...c,
    count: visibleFacilities.filter((f) => f.category_id === c.id).length,
  }));
  const active =
    hasActiveFilters(filters) ||
    recommendedTag !== null ||
    selectedPrefectureId !== null;
  const headline = recommendedTag
    ? selectedPrefecture
      ? `${selectedPrefecture.name}の${RECOMMENDED_FOR_TAG_HEADLINE[recommendedTag]}`
      : filters.prefectures.length > 1
        ? `選択したエリアの${RECOMMENDED_FOR_TAG_HEADLINE[recommendedTag]}`
        : RECOMMENDED_FOR_TAG_HEADLINE[recommendedTag]
    : selectedPrefecture
      ? `${selectedPrefecture.name}の施設一覧`
      : filters.prefectures.length > 0
        ? "選択したエリアの施設一覧"
        : "施設一覧";

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <nav aria-label="パンくず" className="text-xs text-slate-500 mb-4">
        <Link href="/" className="hover:text-brand">
          ホーム
        </Link>
        <span className="mx-1.5">/</span>
        <span>施設一覧</span>
      </nav>

      <div className="mb-6" id="facility-results">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
          {headline}
        </h1>
        <PrefectureSelector
          prefectures={visiblePrefectures}
          selectedId={selectedPrefectureId}
          disableEmpty={recommendedTag !== null}
        />
        <p className="mt-3 text-sm text-slate-500" aria-live="polite">
          {filters.q ? (
            <>
              「<span className="font-medium text-slate-700">{filters.q}</span>
              」の検索結果: {results.length} 件
            </>
          ) : recommendedTag ? (
            <>
              {selectedPrefecture ? `${selectedPrefecture.name} / ` : "全国 / "}
              {results.length}件の施設
            </>
          ) : (
            <>全 {visibleFacilities.length} 施設 / 表示中 {results.length} 件</>
          )}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
        <FilterSidebar
          prefectures={visiblePrefectures}
          categories={visibleCategories}
          resultCount={results.length}
        />

        <section>
          <MobileFilterBar
            prefectures={visiblePrefectures}
            categories={visibleCategories}
            resultCount={results.length}
          />
          <ActiveFilterChips
            prefectures={visiblePrefectures}
            categories={visibleCategories}
          />
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-semibold text-slate-800">
              {results.length}
              <span className="font-normal text-slate-500">
                件の施設が見つかりました
              </span>
              {active && (
                <span className="ml-2 text-xs text-sky-600 font-normal">
                  絞り込み中
                </span>
              )}
            </p>
            <div className="hidden lg:block">
              <SortSelect />
            </div>
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
            <NearbyFilterableFacilityList facilities={results} />
          )}
        </section>
      </div>

      {results.length > 0 && <ResponsiveResultsMap facilities={results} />}
    </div>
  );
}
