import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import CategoryIcon from "@/components/CategoryIcon";
import DecisionLandingPanel from "@/components/DecisionLandingPanel";
import DiscoveryLandingHero from "@/components/DiscoveryLandingHero";
import FacilitiesSearchCta from "@/components/FacilitiesSearchCta";
import LandingEventPicks from "@/components/LandingEventPicks";
import LandingSeasonalPicks from "@/components/LandingSeasonalPicks";
import ResponsiveDiscoveryMap from "@/components/ResponsiveDiscoveryMap";
import PrefectureDiscoveryFacilityList from "@/components/PrefectureDiscoveryFacilityList";
import {
  categories,
  getFacilitiesByPrefecture,
  getPrefectureMeta,
  prefectures,
} from "@/lib/facilities";
import { prefectureIconImages } from "@/lib/icons";
import { prefectureDescriptions } from "@/lib/descriptions";
import { BreadcrumbJsonLd, ItemListJsonLd } from "@/components/JsonLd";
import type { PrefectureId } from "@/types/facility";
import { isPilotCross } from "@/lib/crossings";
import { haversineDistanceKm, type Coordinate } from "@/lib/distance";
import {
  buildFacilitiesHref,
  getMunicipalityParseCoverage,
  groupFacilitiesByMunicipality,
  isDecisionPickEligible,
  selectDecisionPicks,
} from "@/lib/discovery-landings";
import {
  EVENT_PAGE_MAX_AGE_DAYS,
  getBuildDateString,
  getVisibleEvents,
  toEventView,
} from "@/lib/events";
import { selectSeasonalCandidateFacilities } from "@/lib/seasonal-facilities";

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ page?: string | string[] }>;
}

function getFacilityCentroid(prefectureId: PrefectureId): Coordinate | null {
  const facilities = getFacilitiesByPrefecture(prefectureId);
  const coordinates = facilities.flatMap((facility) =>
    typeof facility.latitude === "number" &&
    typeof facility.longitude === "number"
      ? ([[facility.latitude, facility.longitude]] as Coordinate[])
      : [],
  );
  if (coordinates.length === 0) return null;

  const totals = coordinates.reduce(
    (sum, [latitude, longitude]) => ({
      latitude: sum.latitude + latitude,
      longitude: sum.longitude + longitude,
    }),
    { latitude: 0, longitude: 0 },
  );

  return [
    totals.latitude / coordinates.length,
    totals.longitude / coordinates.length,
  ];
}

function getNearestPrefectures(prefectureId: PrefectureId) {
  const currentCentroid = getFacilityCentroid(prefectureId);
  if (!currentCentroid) return [];

  return prefectures
    .flatMap((prefecture) => {
      if (prefecture.id === prefectureId) return [];
      const facilities = getFacilitiesByPrefecture(prefecture.id);
      const centroid = getFacilityCentroid(prefecture.id);
      if (!centroid) return [];

      return [
        {
          ...prefecture,
          facilityCount: facilities.length,
          distanceKm: haversineDistanceKm(currentCentroid, centroid),
        },
      ];
    })
    .sort(
      (a, b) =>
        a.distanceKm - b.distanceKm || a.id.localeCompare(b.id, "en"),
    )
    .slice(0, 5);
}

export function generateStaticParams() {
  return prefectures.map((p) => ({ id: p.id }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const meta = getPrefectureMeta(id as PrefectureId);
  if (!meta) return { title: "見つかりませんでした" };
  const desc = prefectureDescriptions[meta.id];
  const visibleCount = getFacilitiesByPrefecture(meta.id).length;
  const isNagano = meta.id === "nagano";
  return {
    title: isNagano
      ? `長野県の子供の遊び場 ${visibleCount}選｜雨の日・無料・年齢別`
      : `${meta.name}の子供向け遊び場 ${visibleCount}選`,
    description: isNagano
      ? `長野県の子供の遊び場を、軽井沢・松本・諏訪・八ヶ岳などから探せます。家族で楽しめる${visibleCount}施設を地図、雨の日、無料、0〜3歳の条件で比較できます。`
      : `${desc.lead} 雨の日でも遊べる施設・無料施設・年齢別など、家族で楽しめる${visibleCount}施設をまとめて掲載。`,
    alternates: { canonical: `/prefecture/${meta.id}` },
  };
}

export default async function PrefecturePage({ params }: Props) {
  const { id } = await params;
  const meta = getPrefectureMeta(id as PrefectureId);
  if (!meta) notFound();

  const desc = prefectureDescriptions[meta.id];
  const list = getFacilitiesByPrefecture(meta.id);
  const visibleCount = list.length;
  const isNagano = meta.id === "nagano";
  const sortedList = list.slice().sort((a, b) => {
    const score = (facility: (typeof list)[number]) =>
      (facility.rain_friendly === "◎" ? 2 : 0) +
      (facility.is_free ? 1 : 0);
    return score(b) - score(a) || a.id - b.id;
  });
  const nearestPrefectures = getNearestPrefectures(meta.id);

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
  const decisionPicks = selectDecisionPicks(list, { type: "prefecture" });
  const municipalityGroups = groupFacilitiesByMunicipality(list, meta.name);
  const municipalityCoverage = getMunicipalityParseCoverage(list, meta.name);
  const referenceDate = getBuildDateString();
  const targetFacilityIds = new Set(list.map((facility) => facility.id));
  const linkedEventViews = getVisibleEvents(
    referenceDate,
    EVENT_PAGE_MAX_AGE_DAYS,
  )
    .filter(
      (event) =>
        event.facility_id !== null && targetFacilityIds.has(event.facility_id),
    )
    .slice(0, 12)
    .map((event) => toEventView(event, referenceDate));
  const seasonalCandidates = selectSeasonalCandidateFacilities(
    list.filter(isDecisionPickEligible),
    3,
    "category",
  );
  const facilitiesHref = buildFacilitiesHref({ prefectures: meta.id });

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
      <DiscoveryLandingHero
        imageSrc={`/images/landing/prefecture/${meta.id}.webp`}
        breadcrumb={meta.name}
        eyebrow="エリア特集"
        title={
          isNagano
            ? `長野県の子供の遊び場 ${visibleCount}選`
            : `${meta.name}の子供向け遊び場 ${visibleCount}選`
        }
        description={desc.lead}
        icon={
          <Image
            src={prefectureIconImages[meta.id]}
            alt=""
            width={96}
            height={96}
            unoptimized
            className="h-12 w-12 shrink-0 object-contain drop-shadow-lg sm:h-24 sm:w-24"
            aria-hidden
          />
        }
      />

      <div className="mx-auto max-w-6xl px-4 py-8">
        <DecisionLandingPanel
          eyebrow="このエリアで今決める"
          title={`${meta.name}のおすすめ候補`}
          summary={`${visibleCount}施設から、天気・小さな子・料金と、市区町村ごとの行き先を先に比べられます。`}
          picks={decisionPicks}
          municipalityGroups={municipalityGroups}
          prefectureId={meta.id}
        >
          <LandingEventPicks
            heading="今週末・これからの施設イベント"
            views={linkedEventViews}
            referenceDate={referenceDate}
            maxAgeDays={EVENT_PAGE_MAX_AGE_DAYS}
          />
          <LandingSeasonalPicks
            facilities={seasonalCandidates}
            referenceDate={referenceDate}
            diversity="category"
            heading="既存情報に今月の時期が明記された候補"
          />
          <p
            className="mt-4 text-xs text-slate-500"
            data-municipality-coverage={`${municipalityCoverage.parsed}/${municipalityCoverage.total}`}
          >
            住所から市区町村を抽出できた施設: {municipalityCoverage.parsed}/
            {municipalityCoverage.total}（{municipalityCoverage.percent.toFixed(1)}%）
          </p>
        </DecisionLandingPanel>

        <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard
            href={`/facilities?prefecture=${meta.id}`}
            label="全施設"
            count={visibleCount}
            emoji="🎈"
          />
          <StatCard
            href={`/facilities?prefecture=${meta.id}&rain=◎`}
            label="雨でも快適"
            count={rainCount}
            emoji="☂️"
          />
          <StatCard
            href={`/facilities?prefecture=${meta.id}&fee=free`}
            label="無料で遊べる"
            count={freeCount}
            emoji="🆓"
          />
          <StatCard
            href={`/facilities?prefecture=${meta.id}&tags=0-3歳OK`}
            label="0-3歳OK"
            count={babyCount}
            emoji="👶"
          />
        </div>

        {list.length > 0 && (
          <div
            id={isNagano ? "nagano-facility-map" : undefined}
            className="scroll-mt-24"
          >
            <ResponsiveDiscoveryMap
              dataHref={`/api/discovery-map?scope=prefecture&prefecture=${meta.id}`}
              heading={`${meta.name}内の施設マップ`}
              totalItems={list.length}
              height={420}
              storageKey={`prefecture:${meta.id}`}
            />
          </div>
        )}

        <section className="mt-10" aria-labelledby="cat-heading">
          <h2 id="cat-heading" className="text-xl font-bold mb-3">
            {meta.name}のカテゴリ別
          </h2>
          <div className="flex flex-wrap gap-2 lg:pr-2">
            {categoryCounts.map((c) => (
              <Link
                key={c.id}
                href={
                  isPilotCross(meta.id, c.id)
                    ? `/prefecture/${meta.id}/category/${c.id}`
                    : `/facilities?prefecture=${meta.id}&categories=${c.id}`
                }
                className="inline-flex items-center gap-1.5 bg-white border border-slate-200 hover:border-brand hover:text-brand rounded-full px-3 py-1.5 text-sm transition-colors"
              >
                <CategoryIcon
                  categoryId={c.id}
                  width={24}
                  height={24}
                  className="h-6 w-6 shrink-0"
                />
                {c.name}
                <span className="text-xs text-slate-500">({c.countInPref})</span>
              </Link>
            ))}
          </div>
        </section>

        <div className="mt-10">
          <PrefectureDiscoveryFacilityList
            facilities={sortedList}
            prefectureName={meta.name}
          />
        </div>

        <FacilitiesSearchCta
          href={facilitiesHref}
          conditionLabel={meta.name}
        />

        <section className="mt-12">
          <h2 className="text-xl font-bold mb-3">近くのエリアもチェック</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {nearestPrefectures.map((p) => (
              <Link
                key={p.id}
                href={`/prefecture/${p.id}`}
                className="group flex items-center gap-3 bg-white border border-slate-200 hover:border-brand rounded-2xl p-4 transition-colors"
              >
                <Image
                  src={prefectureIconImages[p.id]}
                  alt=""
                  width={40}
                  height={40}
                  unoptimized
                  className="h-10 w-10 shrink-0 object-contain"
                  aria-hidden
                />
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-slate-900 group-hover:text-brand">
                    {p.name}
                  </p>
                  <p className="text-xs text-slate-500">
                    {p.facilityCount} 施設
                  </p>
                </div>
                <span className="text-slate-400 group-hover:text-brand">→</span>
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

