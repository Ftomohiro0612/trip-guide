import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import CategoryIcon from "@/components/CategoryIcon";
import DiscoveryMap from "@/components/DiscoveryMap";
import FacilityActionButtons from "@/components/FacilityActionButtons";
import FacilityClosureBadge from "@/components/FacilityClosureBadge";
import FacilityEvents from "@/components/FacilityEvents";
import FacilityGuestRecordProvider from "@/components/FacilityGuestRecordProvider";
import FacilityNearbySummerEvents from "@/components/FacilityNearbySummerEvents";
import FacilityGallery from "@/components/FacilityGallery";
import FacilityAnnualPass from "@/components/FacilityAnnualPass";
import FacilityMyRecord from "@/components/FacilityMyRecord";
import FacilityPublicRecordsEmptyCard from "@/components/FacilityPublicRecordsEmptyCard";
import FacilityPhotoSearchLink from "@/components/FacilityPhotoSearchLink";
import FacilityRakutenAction from "@/components/FacilityRakutenAction";
import FacilityAsoviewAction from "@/components/FacilityAsoviewAction";
import ShareButtons from "@/components/ShareButtons";
import TrackedOutboundLink from "@/components/TrackedOutboundLink";
import {
  getFacilityBySlug,
  getFacilityNextStops,
  getFacilityPageLinks,
  isFacilityVisible,
  visibleFacilities,
} from "@/lib/facilities";
import { getGuestInterestTags } from "@/lib/guest-record";
import { getGuestRecordRecommendationCandidates } from "@/lib/guest-record-recommendations";
import {
  buildFacilityMetadataDescription,
  getFacilityTargetAgeForMetadata,
} from "@/lib/facility-metadata";
import { prefectureGradients } from "@/lib/icons";
import { getRecommendedForTagMeta } from "@/lib/recommended-tags";
import {
  getBuildDateString,
  getEventById,
  isEventPrefecture,
  SUMMER_HUB_MAX_AGE_DAYS,
} from "@/lib/events";
import { getSummerCrosslinkData } from "@/lib/summer-crosslink-data";
import { tagHref } from "@/lib/tags";
import { toMapFacilities } from "@/lib/map-facilities";
import { getRakutenFacilityAction } from "@/lib/rakuten-facility-actions";
import { getAsoviewFacilityAction } from "@/lib/asoview-facility-actions";
import { BreadcrumbJsonLd } from "@/components/JsonLd";
import type { Facility, RecommendedForTag } from "@/types/facility";

interface Props {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return visibleFacilities.map((f) => ({ slug: f.slug }));
}

export const dynamicParams = false;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const facility = getFacilityBySlug(slug);
  if (!isFacilityVisible(facility)) {
    return { title: "見つかりませんでした" };
  }
  const desc = (facility.description || facility.unique_selling_point || "").slice(
    0,
    110,
  );
  return {
    title: `${facility.name} (${facility.prefecture})`,
    description: buildFacilityMetadataDescription({
      description: desc,
      targetAge: facility.target_age,
      rainFriendly: facility.rain_friendly,
    }),
    alternates: { canonical: `/facilities/${facility.slug}` },
  };
}

const RAIN_LABELS: Record<string, { color: string; label: string }> = {
  "◎": { color: "bg-sky-100 text-sky-700", label: "雨でも快適" },
  "△": { color: "bg-amber-100 text-amber-700", label: "一部OK" },
  "×": { color: "bg-slate-100 text-slate-500", label: "雨は不向き" },
};

const RAIN_FALLBACK = {
  color: "bg-slate-100 text-slate-500",
  label: "情報なし",
};

const WATER_PLAY_BADGES: Record<string, { color: string; label: string }> = {
  "◎": { color: "bg-sky-100 text-sky-700", label: "対応あり" },
  "○": { color: "bg-sky-100 text-sky-700", label: "対応あり" },
  あり: { color: "bg-sky-100 text-sky-700", label: "対応あり" },
  "△": { color: "bg-amber-100 text-amber-700", label: "一部対応" },
  "×": { color: "bg-slate-100 text-slate-500", label: "対応なし" },
  なし: { color: "bg-slate-100 text-slate-500", label: "対応なし" },
};

const WATER_PLAY_FALLBACK = {
  color: "bg-slate-100 text-slate-500",
  label: "確認中",
};

export default async function FacilityDetailPage({ params }: Props) {
  const { slug } = await params;
  const facility = getFacilityBySlug(slug);
  if (!isFacilityVisible(facility)) notFound();

  const seoFacilityLinks = getFacilityPageLinks(facility, 3);
  const nextStops = getFacilityNextStops(facility, 4);
  const nextStopFacilities = nextStops.candidates.map(
    (candidate) => candidate.facility,
  );
  const highlightedMapPoint = toMapFacilities([facility])[0];
  const guestInterestTags = getGuestInterestTags(facility.recommended_for_tags);
  const guestRecommendationCandidates =
    getGuestRecordRecommendationCandidates(facility);
  const today = getBuildDateString();
  const nearbySummerEvents =
    getSummerCrosslinkData(today).facilityToEvents[String(facility.id)] ?? [];
  const nearbySummerEventDates = Object.fromEntries(
    nearbySummerEvents.flatMap((recommendation) => {
      const event = getEventById(recommendation.eventId);
      return event ? [[recommendation.eventId, event] as const] : [];
    }),
  );
  const rain = RAIN_LABELS[facility.rain_friendly] ?? RAIN_FALLBACK;
  const heroSummary =
    typeof facility.unique_selling_point === "string"
      ? facility.unique_selling_point.trim()
      : "";
  const signatureExperiences = Array.isArray(facility.signature_experiences)
    ? facility.signature_experiences
        .map((experience) =>
          typeof experience === "string" ? experience.trim() : "",
        )
        .filter((experience) => experience.length > 0)
    : [];
  const experienceTags = Array.isArray(facility.experience_tags)
    ? facility.experience_tags
        .map((tag) => (typeof tag === "string" ? tag.trim() : ""))
        .filter((tag) => tag.length > 0)
    : [];
  const recommendedForTags = facility.recommended_for_tags ?? [];
  const thingsToDo = Array.isArray(facility.things_to_do)
    ? facility.things_to_do
        .map((thing) => (typeof thing === "string" ? thing.trim() : ""))
        .filter((thing) => thing.length > 0)
    : [];
  const hasThingsToDo = thingsToDo.length > 0;
  const recommendedLead = buildRecommendedLead(
    facility.target_age,
    recommendedForTags,
  );
  const prefecture = facility.prefecture ?? "";
  const hasKnownTargetAge = hasKnownDisplayValue(facility.target_age);
  const hasKnownChildFee = hasKnownDisplayValue(facility.child_fee);
  const summerWaterPlay =
    typeof facility.summer_water_play === "string"
      ? facility.summer_water_play.trim()
      : "";
  const summerWaterPlayBadge = summerWaterPlay
    ? WATER_PLAY_BADGES[summerWaterPlay] ?? WATER_PLAY_FALLBACK
    : null;
  const galleryImages =
    facility.images && facility.images.length > 0
      ? facility.images
      : facility.image
        ? [facility.image]
        : [];
  const galleryAttributions =
    facility.image_attributions && facility.image_attributions.length > 0
      ? facility.image_attributions
      : facility.image_attribution
        ? [facility.image_attribution]
        : [];
  const gradient =
    prefectureGradients[facility.prefecture_id] ??
    "from-sky-400 to-emerald-400";
  const mapQuery = encodeURIComponent(`${facility.name} ${facility.address}`);
  const mapEmbedSrc = `https://www.google.com/maps?q=${mapQuery}&output=embed`;
  const targetAgeForMetadata = getFacilityTargetAgeForMetadata(
    facility.target_age,
  );
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "TouristAttraction",
    name: facility.name,
    description: facility.description || heroSummary,
    address: {
      "@type": "PostalAddress",
      addressRegion: facility.prefecture,
      addressLocality: facility.address,
    },
    isAccessibleForFree: facility.is_free,
    url: facility.url ?? undefined,
    ...(targetAgeForMetadata
      ? { suitableForAges: targetAgeForMetadata }
      : {}),
  };

  return (
    <FacilityGuestRecordProvider
      facilityId={facility.id}
      facilitySlug={facility.slug}
      facilityName={facility.name}
      interestTags={guestInterestTags}
      recommendationCandidates={guestRecommendationCandidates}
    >
      <div className="min-h-screen bg-[#fffaf3] pb-2">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <BreadcrumbJsonLd
        items={[
          { name: "ホーム", href: "/" },
          {
            name: facility.prefecture,
            href: `/prefecture/${facility.prefecture_id}`,
          },
          {
            name: facility.category,
            href: `/category/${facility.category_id}`,
          },
          { name: facility.name },
        ]}
      />

      <div className="mx-auto max-w-5xl px-4 pt-4 sm:pt-8">
      <section
        className={`relative overflow-hidden rounded-[2rem] text-white shadow-2xl ${
          facility.image
            ? "min-h-[30rem] bg-slate-900 sm:min-h-[35rem]"
            : `bg-gradient-to-br ${gradient}`
        }`}
      >
        {facility.image ? (
          <>
            <Image
              src={facility.image}
              alt={facility.name}
              fill
              priority
              sizes="100vw"
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/5 to-black/90" />
          </>
        ) : (
          <div className="absolute inset-0 bg-black/10" />
        )}
        {facility.image && facility.image_attribution && (
          <div
            className="absolute right-4 top-4 z-10 rounded-full bg-black/35 px-3 py-1.5 text-[10px] text-white/85 backdrop-blur-sm"
            dangerouslySetInnerHTML={{ __html: `画像: ${facility.image_attribution}` }}
          />
        )}
        <div
          className={`relative flex px-5 sm:px-8 ${
            facility.image
              ? "min-h-[30rem] flex-col justify-between pb-7 pt-5 sm:min-h-[35rem] sm:pb-10 sm:pt-7"
              : "min-h-[30rem] flex-col justify-between py-7 sm:min-h-[35rem] sm:py-10"
          }`}
        >
          <nav aria-label="パンくず" className="mr-28 text-xs font-bold text-white/90">
            <Link href="/" className="hover:underline">
              ホーム
            </Link>
            <span className="mx-1.5">/</span>
            <Link
              href={`/prefecture/${facility.prefecture_id}`}
              className="hover:underline"
            >
              {facility.prefecture}
            </Link>
            <span className="mx-1.5">/</span>
            <Link
              href={`/category/${facility.category_id}`}
              className="hover:underline"
            >
              {facility.category}
            </Link>
          </nav>
          <div className="flex items-end gap-3 sm:gap-5">
            <CategoryIcon
              categoryId={facility.category_id}
              width={64}
              height={64}
              className="mb-1 h-12 w-12 shrink-0 drop-shadow-lg sm:h-16 sm:w-16"
            />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold tracking-[0.16em] text-white/65 drop-shadow">
                FAMILY OUTING GUIDE
              </p>
              <p className="mt-2 text-xs font-bold text-white/85 drop-shadow">
                {facility.prefecture} · {facility.category}
              </p>
              <h1 className="mt-1 text-[clamp(1.75rem,7vw,3rem)] font-black leading-tight tracking-tight [overflow-wrap:anywhere] drop-shadow-lg">
                {facility.name}
              </h1>
              {heroSummary && (
                <p className="mt-3 max-w-2xl border-l-2 border-amber-300 pl-3 text-sm font-medium leading-relaxed text-white/95 drop-shadow sm:text-base">
                  {heroSummary}
                </p>
              )}
              <p className="mt-3 text-sm font-bold text-white/90 drop-shadow sm:text-base">
                📍 {facility.address}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {facility.is_free && (
                  <span className="rounded-full bg-emerald-500 px-3 py-1.5 text-xs font-black text-white shadow-sm">
                    🆓 無料
                  </span>
                )}
                <span
                  className={`rounded-full px-3 py-1.5 text-xs font-black ${rain.color}`}
                >
                  ☂️ {facility.rain_friendly} {rain.label}
                </span>
                {hasKnownTargetAge && (
                  <span className="rounded-full bg-black/35 px-3 py-1.5 text-xs font-black text-white backdrop-blur-sm">
                    👶 {facility.target_age}
                  </span>
                )}
                <FacilityClosureBadge status={facility.closure_status} />
              </div>
              {facility.closure_status && facility.closure_note && (
                <p className="mt-3 rounded-lg bg-black/60 px-3 py-2 text-sm leading-relaxed text-white">
                  {facility.closure_note}
                </p>
              )}
              {facility.image && (
                <FacilityPhotoSearchLink
                  facilityName={facility.name}
                  address={facility.address}
                  purpose="more"
                  className="mt-4 inline-flex min-h-10 items-center justify-center rounded-full border border-white/40 bg-black/25 px-4 text-xs font-bold text-white backdrop-blur-sm transition-colors hover:bg-black/40"
                />
              )}
              {!facility.image && (
                <div className="mt-4 rounded-2xl border border-white/40 bg-white/15 p-4 backdrop-blur-sm">
                  <p className="text-xs font-bold text-white">
                    Memorip掲載写真はありません
                  </p>
                  <FacilityPhotoSearchLink
                    facilityName={facility.name}
                    address={facility.address}
                    compact
                    className="mt-2 inline-flex min-h-11 items-center justify-center rounded-xl border border-white/70 bg-white px-4 text-sm font-black text-sky-700 shadow-sm transition-colors hover:bg-sky-50"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
      </div>

      <div className="mx-auto grid max-w-5xl gap-8 px-4 py-8 sm:py-12 lg:grid-cols-[1fr_320px]">
        <div className="space-y-5 lg:hidden">
          <FacilityCtaGroup facility={facility} today={today} />
          <QuickCheckCard facility={facility} rain={rain} />
        </div>

        <article className="min-w-0 space-y-8">
          <section className="rounded-[2rem] bg-white p-5 shadow-sm ring-1 ring-amber-100 sm:p-8">
          <p className="text-xs font-black tracking-[0.18em] text-amber-600">ABOUT THIS PLACE</p>
          <h2 className="mt-1 text-2xl font-black text-slate-950">この施設について</h2>
          {facility.description && (
            <p className="text-slate-700 leading-relaxed whitespace-pre-line">
              {facility.description}
            </p>
          )}
          {hasThingsToDo ? (
            <section className="mt-6" aria-labelledby="things-to-do-heading">
              <h3
                id="things-to-do-heading"
                className="mb-3 text-base font-black text-slate-950"
              >
                この施設で楽しめそうなこと
              </h3>
              <ul className="grid gap-2 sm:grid-cols-2">
                {thingsToDo.map((thing) => (
                  <li
                    key={thing}
                    className="flex gap-2 rounded-2xl bg-emerald-50/70 px-4 py-3 text-sm font-medium leading-relaxed text-slate-700 ring-1 ring-emerald-100"
                  >
                    <span
                      className="mt-0.5 font-bold text-emerald-600"
                      aria-hidden
                    >
                      ✓
                    </span>
                    <span>{thing}</span>
                  </li>
                ))}
              </ul>
              {experienceTags.length > 0 && (
                <p className="mt-3 text-xs text-slate-500">
                  体験タイプ：{experienceTags.join(" / ")}
                </p>
              )}
            </section>
          ) : (
            (signatureExperiences.length > 0 || experienceTags.length > 0) && (
            <div className="mt-6">
              <h3 className="mb-3 text-base font-black text-slate-950">
                この施設で楽しめそうなこと
              </h3>
              {signatureExperiences.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                  {signatureExperiences.map((exp) => (
                    <span
                      key={exp}
                    className="rounded-full bg-emerald-50 px-3 py-1.5 text-sm font-bold text-emerald-700 ring-1 ring-emerald-200"
                    >
                      {exp}
                    </span>
                  ))}
                </div>
              )}
              {experienceTags.length > 0 && (
                <p className="text-xs text-slate-500">
                  体験タイプ：{experienceTags.join(' / ')}
                </p>
              )}
            </div>
            )
          )}
          {recommendedForTags.length > 0 && (
            <section className="mt-6" aria-labelledby="recommended-for-heading">
              <h2
                id="recommended-for-heading"
                className="mb-3 text-xl font-black text-slate-950"
              >
                {hasThingsToDo ? "どんな子に合いそう？" : "こんな遊びが好きな子に 🎯"}
              </h2>
              {hasThingsToDo && recommendedLead && (
                <p className="mb-3 text-sm leading-relaxed text-slate-600">
                  {recommendedLead}
                </p>
              )}
              <div className="flex flex-wrap gap-2">
                {recommendedForTags.map((tag) => {
                  const meta = getRecommendedForTagMeta(tag);
                  return (
                    <Link
                      key={tag}
                      href={`/facilities?recommended_tag=${tag}&prefecture=${facility.prefecture_id}`}
                      className="rounded-full bg-sky-50 px-3 py-1.5 text-sm font-bold text-sky-700 ring-1 ring-sky-200 transition-colors hover:bg-sky-100"
                    >
                      <span aria-hidden>{meta.icon}</span> {meta.label}
                    </Link>
                  );
                })}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {recommendedForTags.slice(0, 3).map((tag) => {
                  const meta = getRecommendedForTagMeta(tag);
                  if (!meta) return null;
                  const href = prefecture
                    ? `/facilities?recommended_tag=${tag}&prefecture=${facility.prefecture_id}`
                    : `/facilities?recommended_tag=${tag}`;
                  return (
                    <Link
                      key={tag}
                      href={href}
                      className="text-xs text-sky-600 hover:text-sky-800 hover:underline"
                    >
                      {prefecture
                        ? `${prefecture}の${meta.label}が好きな子におすすめの施設をもっと見る`
                        : `${meta.label}が好きな子におすすめの施設をもっと見る`}{" "}
                      →
                    </Link>
                  );
                })}
              </div>
            </section>
          )}
          </section>

          <FacilityEvents
            facilityId={facility.id}
            prefectureId={facility.prefecture_id}
          />

          <FacilityNearbySummerEvents
            recommendations={nearbySummerEvents}
            eventDatesById={nearbySummerEventDates}
            maxAgeDays={SUMMER_HUB_MAX_AGE_DAYS}
          />

          <FacilityGallery
            images={galleryImages}
            attributions={galleryAttributions}
            facilityName={facility.name}
            address={facility.address}
          />

          <FacilityPublicRecordsEmptyCard
            facilityId={facility.id}
            facilitySlug={facility.slug}
            facilityName={facility.name}
          />

          <section>
          <p className="text-xs font-black tracking-[0.18em] text-amber-600">PLAN YOUR DAY</p>
          <h2 className="mt-1 mb-4 text-2xl font-black text-slate-950">基本情報</h2>
          <dl className="divide-y divide-slate-100 overflow-hidden rounded-[2rem] bg-white shadow-sm ring-1 ring-amber-100">
            <Row label="カテゴリ">
              <Link
                href={`/category/${facility.category_id}`}
                className="text-brand hover:underline"
              >
                {facility.category}
              </Link>
            </Row>
            <Row label="エリア">
              <Link
                href={`/prefecture/${facility.prefecture_id}`}
                className="text-brand hover:underline"
              >
                {facility.prefecture}
              </Link>
            </Row>
            <Row label="所在地">{facility.address}</Row>
            <Row label="屋内 / 屋外">{facility.indoor_outdoor}</Row>
            <Row label="雨天対応">
              {facility.rain_friendly} ({rain.label})
            </Row>
            {summerWaterPlayBadge && (
              <Row label="夏の水遊び">
                <span
                  className={`inline-flex items-center rounded-md px-2.5 py-1 text-xs font-bold ${summerWaterPlayBadge.color}`}
                >
                  {summerWaterPlay} {summerWaterPlayBadge.label}
                </span>
              </Row>
            )}
            {hasKnownTargetAge && (
              <Row label="対象年齢">{facility.target_age}</Row>
            )}
            <Row label="料金区分">
              {facility.is_free ? "無料" : facility.fee_type}
            </Row>
            {!facility.is_free && (
              <>
                <Row label="大人">{facility.adult_fee}</Row>
                {hasKnownChildFee && <Row label="子供">{facility.child_fee}</Row>}
              </>
            )}
            {facility.tags.length > 0 && (
              <Row label="タグ">
                <div className="flex flex-wrap gap-1.5">
                  {facility.tags.map((t) => {
                    const href =
                      tagHref(t) ?? `/facilities?tags=${encodeURIComponent(t)}`;
                    return (
                      <Link
                        key={t}
                        href={href}
                        className="text-xs px-2 py-1 bg-slate-100 hover:bg-sky-100 hover:text-brand rounded text-slate-700 transition-colors"
                      >
                        #{t}
                      </Link>
                    );
                  })}
                </div>
              </Row>
            )}
          </dl>
          </section>

          <FacilityNotice className="mt-4 lg:hidden" />

          <section>
          <p className="text-xs font-black tracking-[0.18em] text-amber-600">ACCESS</p>
          <h2 className="mt-1 mb-4 text-2xl font-black text-slate-950">アクセス</h2>
          <div className="overflow-hidden rounded-[2rem] bg-slate-100 shadow-sm ring-1 ring-amber-100">
            <iframe
              title={`${facility.name} の地図`}
              src={mapEmbedSrc}
              width="100%"
              height="320"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              className="w-full"
            />
          </div>
          <p className="text-xs text-slate-500 mt-2">
            ※ 地図は施設名と住所からのGoogleマップ検索です。正確な位置は公式サイトでご確認ください。
          </p>
          </section>

          <div className="rounded-[2rem] bg-white p-5 shadow-sm ring-1 ring-amber-100">
            <ShareButtons
              url={`/facilities/${facility.slug}`}
              title={facility.name}
              prefecture={facility.prefecture}
              thingsToDo={thingsToDo}
            />
          </div>
        </article>

        <aside className="hidden space-y-5 lg:block">
          <FacilityCtaGroup facility={facility} today={today} />
          <QuickCheckCard facility={facility} rain={rain} />
          <FacilityNotice />
        </aside>
      </div>

      <section className="mx-auto max-w-5xl px-4 pb-14">
        <p className="text-xs font-black tracking-[0.18em] text-amber-600">PLAN THE NEXT STOP</p>
        <h2 className="mt-1 text-2xl font-black text-slate-950">この施設と一緒に行ける周辺スポット</h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          直線距離を優先し、年齢の合いやすさ・家族での使いやすさ・違う遊び方も加えて選んでいます。
        </p>
        {nextStops.candidates.length > 0 ? (
          <>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {nextStops.candidates.map(({ facility: candidate, distanceKm }) => (
                <Link
                  key={candidate.id}
                  href={`/facilities/${candidate.slug}`}
                  className="group rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:border-brand hover:shadow-md"
                >
                  <div className="flex items-start gap-3">
                    <CategoryIcon
                      categoryId={candidate.category_id}
                      width={40}
                      height={40}
                      className="h-10 w-10 shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-slate-500">
                        {candidate.prefecture} · {candidate.category}
                      </p>
                      <h3 className="mt-0.5 font-black leading-snug text-slate-900 group-hover:text-brand">
                        {candidate.name}
                      </h3>
                      <p className="mt-2 inline-flex rounded-full bg-sky-50 px-2.5 py-1 text-xs font-black text-sky-700 ring-1 ring-sky-100">
                        直線距離 約{formatDistanceKm(distanceKm)}km
                      </p>
                      <div className="mt-2 flex flex-wrap gap-1.5 text-xs text-slate-600">
                        {candidate.is_free && (
                          <span className="rounded bg-emerald-50 px-2 py-0.5 text-emerald-700">無料</span>
                        )}
                        {candidate.rain_friendly === "◎" && (
                          <span className="rounded bg-sky-50 px-2 py-0.5 text-sky-700">雨でも快適</span>
                        )}
                        {hasKnownDisplayValue(candidate.target_age) && (
                          <span className="rounded bg-slate-100 px-2 py-0.5">{candidate.target_age}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
            <div className="mt-5 overflow-hidden rounded-[2rem] bg-white p-2 shadow-sm ring-1 ring-amber-100 sm:p-3">
              <DiscoveryMap
                points={toMapFacilities(nextStopFacilities)}
                highlightedPoint={highlightedMapPoint}
                expectedCount={nextStopFacilities.length + 1}
                height={360}
              />
            </div>
          </>
        ) : (
          <p className="mt-5 rounded-2xl bg-white p-4 text-sm text-slate-600 ring-1 ring-slate-200">
            直線距離100km以内で、条件に合う周辺スポットは見つかりませんでした。
          </p>
        )}
        {seoFacilityLinks.length > 0 && (
          <div className="mt-5 rounded-2xl bg-white px-4 py-3 ring-1 ring-slate-200">
            <p className="text-xs font-bold text-slate-500">同じ地域の施設リンク</p>
            <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-2 text-sm">
              {seoFacilityLinks.map((candidate) => (
                <li key={candidate.id}>
                  <Link
                    href={`/facilities/${candidate.slug}`}
                    className="font-bold text-brand hover:text-brand-dark hover:underline"
                  >
                    {candidate.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
        <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2">
          <Link
            href={`/prefecture/${facility.prefecture_id}`}
            className="text-sm font-bold text-brand hover:text-brand-dark hover:underline"
          >
            {facility.prefecture}の子ども向け遊び場をもっと見る
          </Link>
          {isEventPrefecture(facility.prefecture_id) && (
            <Link
              href={`/events/${facility.prefecture_id}`}
              className="text-sm font-bold text-brand hover:text-brand-dark hover:underline"
            >
              {facility.prefecture}の子ども向けイベント
            </Link>
          )}
        </div>
      </section>
      </div>
    </FacilityGuestRecordProvider>
  );
}

function FacilityCtaGroup({
  facility,
  today,
}: {
  facility: Facility;
  today: string;
}) {
  const rakutenAction = getRakutenFacilityAction(facility, today);
  const asoviewAction = getAsoviewFacilityAction(facility, today);

  return (
    <section className="space-y-4 rounded-[2rem] bg-white p-5 shadow-sm ring-1 ring-amber-100">
      <div>
        <p className="text-xs font-black tracking-[0.18em] text-amber-600">SAVE THE MEMORY</p>
        <h2 className="mt-1 text-xl font-black text-slate-950">この場所を家族の記録に</h2>
      </div>
      <FacilityMyRecord facilitySlug={facility.slug} />
      <FacilityAnnualPass facilitySlug={facility.slug} facilityName={facility.name} />
      <FacilityActionButtons
        facilityId={facility.id}
        facilitySlug={facility.slug}
        facilityName={facility.name}
      />
      {rakutenAction && <FacilityRakutenAction action={rakutenAction} />}
      {asoviewAction && <FacilityAsoviewAction action={asoviewAction} />}
      {facility.image ? (
        <FacilityPhotoSearchLink
          facilityName={facility.name}
          address={facility.address}
          purpose="more"
          className="flex min-h-10 w-full items-center justify-center rounded-xl border border-slate-200 bg-slate-50 px-3 text-center text-xs font-medium text-slate-600 transition-colors hover:border-sky-200 hover:bg-sky-50 hover:text-sky-700"
        />
      ) : (
        <FacilityPhotoSearchLink
          facilityName={facility.name}
          address={facility.address}
          compact
          className="flex min-h-11 w-full items-center justify-center rounded-xl border border-sky-300 bg-sky-50 px-3 text-center text-sm font-bold text-sky-700 transition-colors hover:bg-sky-100"
        />
      )}
      {facility.url && (
        <div className="border-t border-slate-100 pt-4">
        <p className="mb-2 text-xs font-black tracking-[0.18em] text-amber-600">OFFICIAL INFORMATION</p>
        <TrackedOutboundLink
          href={facility.url}
          contentType="facility"
          contentId={String(facility.id)}
          intentType="facility_detail"
          linkLocation="facility_sidebar"
          className="block w-full rounded-xl border border-slate-200 bg-white py-3 text-center text-sm font-bold text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-800"
        >
          公式サイトを見る ↗
        </TrackedOutboundLink>
        </div>
      )}
    </section>
  );
}

function QuickCheckCard({
  facility,
  rain,
}: {
  facility: Facility;
  rain: { label: string };
}) {
  return (
    <div className="rounded-[2rem] bg-white p-5 shadow-sm ring-1 ring-amber-100">
      <p className="text-xs font-black tracking-[0.18em] text-amber-600">OUTING CHECK</p>
      <h3 className="mt-1 mb-3 text-xl font-black text-slate-950">ひと目チェック</h3>
      <ul className="space-y-2 text-sm font-medium text-slate-700">
        <li>📍 {facility.prefecture}</li>
        <li>🏷️ {facility.category}</li>
        {hasKnownDisplayValue(facility.target_age) && (
          <li>👶 {facility.target_age}</li>
        )}
        <li>
          {facility.is_free ? "🆓 無料で楽しめる" : `💴 ${facility.fee_type}`}
        </li>
        <li>
          ☂️ 雨対応 {facility.rain_friendly} ({rain.label})
        </li>
      </ul>
    </div>
  );
}

function FacilityNotice({ className = "" }: { className?: string }) {
  return (
    <div
      className={`${className ? `${className} ` : ""}rounded-[2rem] bg-amber-50 p-5 text-xs leading-relaxed text-amber-800 ring-1 ring-amber-200`}
    >
      ⚠️ 料金・営業時間・対象年齢は変更されることがあります。
      お出かけ前に公式サイトで最新情報をご確認ください。
    </div>
  );
}

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-[110px_1fr] gap-3 px-5 py-4 text-sm">
      <dt className="font-bold text-slate-500">{label}</dt>
      <dd className="font-medium text-slate-800">{children}</dd>
    </div>
  );
}

function buildRecommendedLead(
  targetAge: string,
  recommendedForTags: RecommendedForTag[],
) {
  const labels = recommendedForTags
    .map((tag) => getRecommendedForTagMeta(tag))
    .filter((meta): meta is NonNullable<typeof meta> => Boolean(meta))
    .map((meta) => meta.label)
    .slice(0, 2);

  const knownTargetAge = hasKnownDisplayValue(targetAge) ? targetAge : "";

  if (labels.length === 0) {
    return knownTargetAge ? `${knownTargetAge}の子に合いそうです。` : "";
  }

  const age = knownTargetAge ? `${knownTargetAge}、` : "";
  return `${age}特に${labels.join("・")}が好きな子に合いそうです。`;
}

function hasKnownDisplayValue(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.trim().length > 0 &&
    value.trim().toLowerCase() !== "unknown"
  );
}

function formatDistanceKm(distanceKm: number) {
  return distanceKm < 10 ? distanceKm.toFixed(1) : Math.round(distanceKm).toString();
}
