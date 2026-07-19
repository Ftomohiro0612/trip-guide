import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import CategoryIcon from "@/components/CategoryIcon";
import FacilityActionButtons from "@/components/FacilityActionButtons";
import FacilityCard from "@/components/FacilityCard";
import FacilityEvents from "@/components/FacilityEvents";
import FacilityNearbySummerEvents from "@/components/FacilityNearbySummerEvents";
import FacilityGallery from "@/components/FacilityGallery";
import FacilityMyRecord from "@/components/FacilityMyRecord";
import FacilityPublicRecordsEmptyCard from "@/components/FacilityPublicRecordsEmptyCard";
import ShareButtons from "@/components/ShareButtons";
import {
  getFacilityBySlug,
  getRelatedFacilities,
  isFacilityVisible,
  visibleFacilities,
} from "@/lib/facilities";
import { prefectureGradients } from "@/lib/icons";
import { getRecommendedForTagMeta } from "@/lib/recommended-tags";
import { getBuildDateString } from "@/lib/events";
import { getSummerCrosslinkData } from "@/lib/summer-crosslink-data";
import { tagHref } from "@/lib/tags";
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
  const desc = facility.description.slice(0, 110);
  return {
    title: `${facility.name} (${facility.prefecture})`,
    description: `${desc} / 対象年齢: ${facility.target_age} / 雨対応: ${facility.rain_friendly}`,
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

  const related = getRelatedFacilities(facility, 3);
  const today = getBuildDateString();
  const nearbySummerEvents =
    getSummerCrosslinkData(today).facilityToEvents[String(facility.id)] ?? [];
  const rain = RAIN_LABELS[facility.rain_friendly] ?? RAIN_FALLBACK;
  const rawUniqueSellingPoint =
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
  const uniqueSellingPoint =
    hasThingsToDo && hasUnsupportedRatingExpression(rawUniqueSellingPoint)
      ? ""
      : rawUniqueSellingPoint;
  const recommendedLead = buildRecommendedLead(
    facility.target_age,
    recommendedForTags,
  );
  const prefecture = facility.prefecture ?? "";
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

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "TouristAttraction",
    name: facility.name,
    description: facility.description,
    address: {
      "@type": "PostalAddress",
      addressRegion: facility.prefecture,
      addressLocality: facility.address,
    },
    isAccessibleForFree: facility.is_free,
    url: facility.url ?? undefined,
    suitableForAges: facility.target_age,
  };

  return (
    <div>
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

      <div
        className={`relative text-white ${
          facility.image
            ? "bg-slate-900 min-h-[300px] sm:min-h-[460px]"
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
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-black/10" />
          </>
        ) : (
          <div className="absolute inset-0 bg-black/10" />
        )}
        {facility.image && facility.image_attribution && (
          <div
            className="absolute top-2 right-2 z-10 text-[10px] text-white/85 bg-black/40 px-1.5 py-0.5 rounded backdrop-blur-sm"
            dangerouslySetInnerHTML={{ __html: `画像: ${facility.image_attribution}` }}
          />
        )}
        <div
          className={`relative mx-auto max-w-5xl px-4 ${
            facility.image
              ? "min-h-[300px] sm:min-h-[460px] pt-6 pb-8 sm:pb-10 flex flex-col justify-between"
              : "py-10 sm:py-14"
          }`}
        >
          <nav aria-label="パンくず" className="text-xs text-white/90 mb-4">
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
          <div className="flex items-start gap-4">
            <CategoryIcon
              categoryId={facility.category_id}
              width={64}
              height={64}
              className="h-14 w-14 shrink-0 drop-shadow-lg sm:h-16 sm:w-16"
            />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium opacity-95 mb-1 drop-shadow">
                {facility.prefecture} · {facility.category}
              </p>
              <h1 className="text-2xl sm:text-4xl font-bold drop-shadow-lg tracking-tight">
                {facility.name}
              </h1>
              <p className="mt-2 text-sm sm:text-base opacity-95 drop-shadow">
                📍 {facility.address}
              </p>
              <div className="flex flex-wrap gap-2 mt-4">
                {facility.is_free && (
                  <span className="bg-emerald-500 text-white text-xs font-bold px-2.5 py-1 rounded-md shadow-sm">
                    🆓 無料
                  </span>
                )}
                <span
                  className={`text-xs font-bold px-2.5 py-1 rounded-md ${rain.color}`}
                >
                  ☂️ {facility.rain_friendly} {rain.label}
                </span>
                <span className="bg-white/30 text-white text-xs font-bold px-2.5 py-1 rounded-md backdrop-blur-sm">
                  👶 {facility.target_age}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 py-8 grid gap-8 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4 lg:hidden">
          <FacilityCtaGroup facility={facility} />
          <QuickCheckCard facility={facility} rain={rain} />
        </div>

        <article>
          <h2 className="text-xl font-bold mb-3">この施設について</h2>
          {uniqueSellingPoint && (
            <blockquote className="mb-4 border-l-4 border-brand bg-sky-50 px-4 py-3 text-slate-700 font-medium leading-relaxed">
              {uniqueSellingPoint}
            </blockquote>
          )}
          <p className="text-slate-700 leading-relaxed whitespace-pre-line">
            {facility.description}
          </p>
          {hasThingsToDo ? (
            <section className="mt-6" aria-labelledby="things-to-do-heading">
              <h3
                id="things-to-do-heading"
                className="text-sm font-bold text-slate-700 mb-3"
              >
                この施設で楽しめそうなこと
              </h3>
              <ul className="grid gap-2 sm:grid-cols-2">
                {thingsToDo.map((thing) => (
                  <li
                    key={thing}
                    className="flex gap-2 rounded-lg border border-emerald-100 bg-emerald-50/60 px-3 py-2 text-sm leading-relaxed text-slate-700"
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
              <h3 className="text-sm font-bold text-slate-700 mb-2">
                この施設で楽しめそうなこと
              </h3>
              {signatureExperiences.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                  {signatureExperiences.map((exp) => (
                    <span
                      key={exp}
                      className="text-sm px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium"
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
                className="text-xl font-bold mb-3"
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
                      href={`/facilities?recommended_tag=${tag}&prefecture=${encodeURIComponent(prefecture)}`}
                      className="text-sm px-3 py-1.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200 font-medium hover:bg-sky-100 transition-colors"
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
                    ? `/facilities?recommended_tag=${tag}&prefecture=${encodeURIComponent(prefecture)}`
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

          <FacilityEvents
            facilityId={facility.id}
            prefectureId={facility.prefecture_id}
          />

          <FacilityNearbySummerEvents recommendations={nearbySummerEvents} />

          <FacilityGallery
            images={galleryImages}
            attributions={galleryAttributions}
            facilityName={facility.name}
          />

          <FacilityPublicRecordsEmptyCard
            facilitySlug={facility.slug}
            facilityName={facility.name}
          />

          <h2 className="text-xl font-bold mt-8 mb-3">基本情報</h2>
          <dl className="bg-white border border-slate-200 rounded-2xl divide-y divide-slate-100 overflow-hidden">
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
            <Row label="対象年齢">{facility.target_age}</Row>
            <Row label="料金区分">
              {facility.is_free ? "無料" : facility.fee_type}
            </Row>
            {!facility.is_free && (
              <>
                <Row label="大人">{facility.adult_fee}</Row>
                <Row label="子供">{facility.child_fee}</Row>
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

          <FacilityNotice className="mt-4 lg:hidden" />

          <h2 className="text-xl font-bold mt-8 mb-3">アクセス</h2>
          <div className="rounded-2xl overflow-hidden border border-slate-200 bg-slate-100">
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

          <div className="mt-8 pt-6 border-t border-slate-200">
            <ShareButtons
              url={`/facilities/${facility.slug}`}
              title={facility.name}
              prefecture={facility.prefecture}
              thingsToDo={thingsToDo}
            />
          </div>
        </article>

        <aside className="hidden space-y-4 lg:block">
          <FacilityCtaGroup facility={facility} />
          <QuickCheckCard facility={facility} rain={rain} />
          <FacilityNotice />
        </aside>
      </div>

      {related.length > 0 && (
        <section className="mx-auto max-w-5xl px-4 pb-12">
          <h2 className="text-xl font-bold mb-4">同じカテゴリ・近隣の施設</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {related.map((f) => (
              <FacilityCard key={f.id} facility={f} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function FacilityCtaGroup({ facility }: { facility: Facility }) {
  return (
    <>
      <FacilityMyRecord facilitySlug={facility.slug} />
      <FacilityActionButtons
        facilityId={facility.id}
        facilitySlug={facility.slug}
        facilityName={facility.name}
      />
      {facility.url && (
        <a
          href={facility.url}
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full rounded-xl border border-slate-200 bg-white py-2.5 text-center text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-800"
        >
          公式サイトを見る ↗
        </a>
      )}
    </>
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
    <div className="bg-white border border-slate-200 rounded-2xl p-4">
      <h3 className="font-bold mb-2">ひと目チェック</h3>
      <ul className="text-sm space-y-1.5 text-slate-700">
        <li>📍 {facility.prefecture}</li>
        <li>🏷️ {facility.category}</li>
        <li>👶 {facility.target_age}</li>
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
      className={`${className ? `${className} ` : ""}bg-amber-50 border border-amber-200 rounded-2xl p-4 text-xs text-amber-800 leading-relaxed`}
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
    <div className="grid grid-cols-[110px_1fr] gap-3 px-4 py-3 text-sm">
      <dt className="text-slate-500 font-medium">{label}</dt>
      <dd className="text-slate-800">{children}</dd>
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

  if (labels.length === 0) {
    return targetAge ? `${targetAge}の子に合いそうです。` : "";
  }

  const age = targetAge ? `${targetAge}、` : "";
  return `${age}特に${labels.join("・")}が好きな子に合いそうです。`;
}

function hasUnsupportedRatingExpression(text: string) {
  return /星\s*\d|星評価|口コミ高評価|最高評価/.test(text);
}
