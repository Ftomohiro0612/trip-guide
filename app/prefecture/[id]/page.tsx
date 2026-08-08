import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import CategoryIcon from "@/components/CategoryIcon";
import FacilityCard from "@/components/FacilityCard";
import {
  FacilityPaginationControls,
  FacilityPaginationSummary,
} from "@/components/FacilityPagination";
import MapViewClient from "@/components/MapViewClient";
import {
  categories,
  getFacilitiesByPrefecture,
  getPrefectureMeta,
  prefectures,
} from "@/lib/facilities";
import { prefectureGradients, prefectureIconImages } from "@/lib/icons";
import { prefectureDescriptions } from "@/lib/descriptions";
import { BreadcrumbJsonLd, ItemListJsonLd } from "@/components/JsonLd";
import type { PrefectureId } from "@/types/facility";
import { isPilotCross } from "@/lib/crossings";
import { paginateFacilities } from "@/lib/facility-pagination";
import { haversineDistanceKm, type Coordinate } from "@/lib/distance";

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

export default async function PrefecturePage({ params, searchParams }: Props) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const meta = getPrefectureMeta(id as PrefectureId);
  if (!meta) notFound();

  const desc = prefectureDescriptions[meta.id];
  const list = getFacilitiesByPrefecture(meta.id);
  const visibleCount = list.length;
  const gradient = prefectureGradients[meta.id];
  const isNagano = meta.id === "nagano";
  const sortedList = list.slice().sort((a, b) => {
    const score = (facility: (typeof list)[number]) =>
      (facility.rain_friendly === "◎" ? 2 : 0) +
      (facility.is_free ? 1 : 0);
    return score(b) - score(a) || a.id - b.id;
  });
  const page = paginateFacilities(sortedList, sp.page);
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
            <Image
              src={prefectureIconImages[meta.id]}
              alt=""
              width={96}
              height={96}
              unoptimized
              className="h-16 w-16 shrink-0 object-contain drop-shadow-lg sm:h-24 sm:w-24"
              aria-hidden
              priority
            />
            <div className="flex-1">
              <p className="text-xs font-medium opacity-95">エリア特集</p>
              <h1 className="text-2xl sm:text-4xl font-bold drop-shadow tracking-tight mt-1">
                {isNagano
                  ? `長野県の子供の遊び場 ${visibleCount}選`
                  : `${meta.name}の子供向け遊び場 ${visibleCount}選`}
              </h1>
              <p className="mt-3 text-sm sm:text-base opacity-95 max-w-2xl">
                {desc.lead}
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 py-8">
        {isNagano && (
          <section
            className="mb-8 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 sm:p-5"
            aria-labelledby="nagano-playground-guide"
          >
            <h2
              id="nagano-playground-guide"
              className="text-lg font-bold text-slate-900"
            >
              長野県で子どもの遊び場を選ぶポイント
            </h2>
            <p className="mt-2 text-sm leading-7 text-slate-700">
              軽井沢・松本・諏訪・八ヶ岳などエリアが広く、同じ県内でも移動時間が長くなります。先に地図で行きたい地域を確認し、天気や子どもの年齢に合う条件で絞ると候補を選びやすくなります。
            </p>
            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm font-bold">
              <a
                href="#nagano-facility-map"
                className="text-brand hover:text-brand-dark"
              >
                地図から探す ↓
              </a>
              <Link
                href="/facilities?prefecture=nagano&rain=◎"
                className="text-brand hover:text-brand-dark"
              >
                雨でも快適な施設 →
              </Link>
              <Link
                href="/facilities?prefecture=nagano&tags=0-3歳OK"
                className="text-brand hover:text-brand-dark"
              >
                0〜3歳向け施設 →
              </Link>
            </div>
          </section>
        )}
        {list.length > 0 && (
          <section
            id={isNagano ? "nagano-facility-map" : undefined}
            className="mb-8 scroll-mt-24"
            aria-labelledby="prefecture-map-heading"
          >
            <h2
              id="prefecture-map-heading"
              className="text-xl font-bold text-slate-900 mb-3"
            >
              📍 {meta.name}内の施設マップ
              <span className="text-sm font-normal text-slate-500 ml-2">
                {list.length}件
              </span>
            </h2>
            <MapViewClient
              facilities={list}
              height={420}
              storageKey={`prefecture:${meta.id}`}
            />
          </section>
        )}

        <p className="text-slate-700 leading-relaxed max-w-3xl">{desc.long}</p>

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

        <section className="mt-10" aria-labelledby="cat-heading">
          <h2 id="cat-heading" className="text-xl font-bold mb-3">
            {meta.name}のカテゴリ別
          </h2>
          <div className="flex flex-wrap gap-2">
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

        <section
          className="mt-10"
          aria-labelledby="prefecture-facilities-heading"
        >
          <h2
            id="prefecture-facilities-heading"
            tabIndex={-1}
            className="scroll-mt-24 text-xl font-bold mb-1"
          >
            {meta.name} 全{list.length}施設
          </h2>
          <p className="text-sm text-slate-500 mb-4">
            おすすめ順（雨対応・無料施設を優先）
          </p>
          <FacilityPaginationSummary page={page} />
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {page.items.map((f) => (
              <FacilityCard key={f.id} facility={f} />
            ))}
          </div>
          <FacilityPaginationControls
            page={page}
            focusTargetId="prefecture-facilities-heading"
          />
        </section>

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

