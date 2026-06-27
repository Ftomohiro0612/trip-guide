import type { Metadata } from "next";
import Link from "next/link";
import FilterSidebar from "@/components/FilterSidebar";
import MobileFilterBar from "@/components/MobileFilterBar";
import SortSelect from "@/components/SortSelect";
import ActiveFilterChips from "@/components/ActiveFilterChips";
import MapViewClient from "@/components/MapViewClient";
import NearbyFilterableFacilityList from "@/components/NearbyFilterableFacilityList";
import { visibleFacilities, prefectures, categories } from "@/lib/facilities";
import {
  applyFilters,
  hasActiveFilters,
  parseFilterParams,
  type RawSearchParams,
} from "@/lib/filter";
import { RECOMMENDED_FOR_TAG_HEADLINE } from "@/lib/recommended-tags";
import type { RecommendedForTag } from "@/types/facility";

export const metadata: Metadata = {
  title: "施設一覧",
  description:
    "全国17都府県の子供向け遊び場を、エリア・カテゴリ・雨対応・料金などで絞り込み検索。",
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

const PREFECTURES = [
  "全国",
  "東京都",
  "神奈川県",
  "千葉県",
  "埼玉県",
  "茨城県",
  "栃木県",
  "群馬県",
  "静岡県",
  "愛知県",
  "山梨県",
  "長野県",
  "新潟県",
  "大阪府",
  "兵庫県",
  "京都府",
  "福岡県",
  "広島県",
];

function asSingleParam(value: string | string[] | undefined): string {
  if (!value) return "";
  return Array.isArray(value) ? value[0] ?? "" : value;
}

const MAP_SIGNATURE_KEYS = [
  "categories",
  "category",
  "fee",
  "indoor",
  "prefecture",
  "prefectures",
  "q",
  "rain",
  "recommended_tag",
  "tags",
] as const;

const MAP_SIGNATURE_KEY_ALIASES: Record<
  (typeof MAP_SIGNATURE_KEYS)[number],
  string
> = {
  categories: "cats",
  category: "cat",
  fee: "fee",
  indoor: "in",
  prefecture: "pref",
  prefectures: "prefs",
  q: "q",
  rain: "rain",
  recommended_tag: "rt",
  tags: "tags",
};

function asSignatureValues(value: string | string[] | undefined): string[] {
  if (!value) return [];
  const values = Array.isArray(value) ? value : [value];
  return values
    .flatMap((item) => item.split(","))
    .map((item) => item.trim())
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b, "ja"));
}

function buildFacilitiesMapStorageKey(sp: RawSearchParams): string {
  const signature = MAP_SIGNATURE_KEYS.map((key) => {
    const values = asSignatureValues(sp[key]);
    if (values.length === 0) return null;
    return `${MAP_SIGNATURE_KEY_ALIASES[key]}=${values
      .map(encodeURIComponent)
      .join(",")}`;
  }).filter((entry): entry is string => Boolean(entry));

  return signature.length > 0
    ? `facilities:${signature.join("&")}`
    : "facilities:all";
}

function isRecommendedForTag(value: string): value is RecommendedForTag {
  return Object.prototype.hasOwnProperty.call(
    RECOMMENDED_FOR_TAG_HEADLINE,
    value,
  );
}

function buildPrefectureHref(tag: RecommendedForTag, prefecture: string) {
  const params = new URLSearchParams({ recommended_tag: tag });
  if (prefecture !== "全国") {
    params.set("prefecture", prefecture);
  }
  return `/facilities?${params.toString()}`;
}

export default async function FacilitiesPage({ searchParams }: Props) {
  const sp = await searchParams;
  const mapStorageKey = buildFacilitiesMapStorageKey(sp);
  const filters = parseFilterParams(sp);
  const recommendedTagParam = asSingleParam(sp.recommended_tag);
  const recommendedTag = isRecommendedForTag(recommendedTagParam)
    ? recommendedTagParam
    : null;
  const prefectureParam = asSingleParam(sp.prefecture);
  const selectedPrefecture = PREFECTURES.includes(prefectureParam)
    ? prefectureParam
    : "全国";
  const sidebarPrefString = asSingleParam(sp.prefectures);
  const sidebarPrefIds = sidebarPrefString
    ? sidebarPrefString.split(",").filter(Boolean)
    : [];
  const sidebarPrefNames = sidebarPrefIds
    .map((id) => prefectures.find((p) => p.id === id)?.name)
    .filter((name): name is string => Boolean(name));
  const allSelectedPrefNames =
    selectedPrefecture !== "全国"
      ? [selectedPrefecture, ...sidebarPrefNames]
      : sidebarPrefNames;
  const baseResults = applyFilters(visibleFacilities, filters);
  const tagFilteredResults = recommendedTag
    ? baseResults.filter((f) =>
        (f.recommended_for_tags ?? []).includes(recommendedTag),
      )
    : baseResults;
  const results =
    allSelectedPrefNames.length > 0
      ? tagFilteredResults.filter((f) =>
          allSelectedPrefNames.includes(f.prefecture ?? ""),
        )
      : tagFilteredResults;
  const visiblePrefectures = prefectures.map((p) => ({
    ...p,
    count: visibleFacilities.filter((f) => f.prefecture_id === p.id).length,
  }));
  const visibleCategories = categories.map((c) => ({
    ...c,
    count: visibleFacilities.filter((f) => f.category_id === c.id).length,
  }));
  const active =
    hasActiveFilters(filters) ||
    recommendedTag !== null ||
    allSelectedPrefNames.length > 0;
  const headline = recommendedTag
    ? allSelectedPrefNames.length === 1
      ? `${allSelectedPrefNames[0]}の${RECOMMENDED_FOR_TAG_HEADLINE[recommendedTag]}`
      : allSelectedPrefNames.length > 1
        ? `選択したエリアの${RECOMMENDED_FOR_TAG_HEADLINE[recommendedTag]}`
        : RECOMMENDED_FOR_TAG_HEADLINE[recommendedTag]
    : null;
  const highlightedPrefecture =
    sidebarPrefIds.length === 0 ? selectedPrefecture : "";

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
          {headline ?? "施設一覧"}
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          {filters.q ? (
            <>
              「<span className="font-medium text-slate-700">{filters.q}</span>
              」の検索結果: {results.length} 件
            </>
          ) : (
            <>全 {visibleFacilities.length} 施設 / 表示中 {results.length} 件</>
          )}
        </p>
        {recommendedTag && (
          <div className="mt-4" aria-label="都道府県で絞り込み">
            <div className="flex gap-2 overflow-x-auto pb-1">
              {PREFECTURES.map((prefecture) => {
                const selected = prefecture === highlightedPrefecture;
                return (
                  <Link
                    key={prefecture}
                    href={buildPrefectureHref(recommendedTag, prefecture)}
                    className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                      selected
                        ? "bg-sky-600 text-white"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                  >
                    {prefecture}
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {results.length > 0 && (
        <section className="mb-8" aria-labelledby="facilities-map-heading">
          <h2 id="facilities-map-heading" className="sr-only">
            検索結果の地図
          </h2>
          <MapViewClient
            facilities={results}
            height={420}
            storageKey={mapStorageKey}
          />
        </section>
      )}

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
    </div>
  );
}
