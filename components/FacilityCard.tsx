"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import CategoryIcon from "@/components/CategoryIcon";
import type { Facility } from "@/types/facility";
import { getRecommendedForTagMeta } from "@/lib/recommended-tags";
import { useFacilityIntentActions } from "@/components/useFacilityIntentActions";

interface Props {
  facility: Facility;
  proximityLabel?: string;
}

const rainStyles: Record<string, string> = {
  "◎": "bg-sky-100 text-sky-700 ring-1 ring-sky-200",
  "△": "bg-amber-100 text-amber-700 ring-1 ring-amber-200",
  "×": "bg-slate-100 text-slate-500 ring-1 ring-slate-200",
};

export default function FacilityCard({ facility, proximityLabel }: Props) {
  const router = useRouter();
  const { handleRecord, handleWishlist, isWishlisted, loadState, toggling } =
    useFacilityIntentActions({
      facilityId: facility.id,
      facilitySlug: facility.slug,
      facilityName: facility.name,
    });
  const hasImage = !!facility.image;
  const recommendedTags = (facility.recommended_for_tags ?? []).slice(0, 3);
  const actionsDisabled = loadState === "loading";

  return (
    <Link
      href={`/facilities/${facility.slug}`}
      className="group flex flex-col bg-white rounded-2xl border border-slate-200 hover:border-brand hover:shadow-lg transition-all overflow-hidden"
    >
      <div className="relative aspect-[16/9] bg-gradient-to-br from-sky-100 via-cyan-50 to-emerald-50 overflow-hidden">
        {hasImage ? (
          <Image
            src={facility.image as string}
            alt={facility.name}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <CategoryIcon
              categoryId={facility.category_id}
              width={64}
              height={64}
              className="h-16 w-16 drop-shadow-sm"
            />
          </div>
        )}
        {facility.is_free && (
          <span className="absolute top-2 left-2 bg-emerald-500 text-white text-xs font-bold px-2 py-1 rounded-md shadow-sm z-10">
            🆓 無料
          </span>
        )}
        <span
          className={`absolute top-2 right-2 text-xs font-bold px-2 py-1 rounded-md z-10 ${rainStyles[facility.rain_friendly]}`}
          title={`雨対応: ${facility.rain_friendly}`}
        >
          ☂️ {facility.rain_friendly}
        </span>
      </div>
      <div className="p-4 flex flex-col flex-1 gap-2">
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <CategoryIcon
            categoryId={facility.category_id}
            width={20}
            height={20}
            className="h-4 w-4 shrink-0 sm:h-5 sm:w-5"
          />
          <span>{facility.prefecture}</span>
          <span aria-hidden>·</span>
          <span>{facility.category}</span>
        </div>
        <h3 className="font-bold text-base sm:text-lg text-slate-900 group-hover:text-brand line-clamp-2">
          {facility.name}
        </h3>
        <p className="text-sm text-slate-600 line-clamp-2 flex-1">
          {facility.description}
        </p>
        {proximityLabel && (
          <p className="text-xs font-bold text-slate-700 bg-blue-50 border border-blue-100 rounded-md px-2 py-1">
            🚗 {proximityLabel}
          </p>
        )}
        <div className="flex flex-wrap gap-1.5 pt-1">
          <span className="text-xs px-2 py-0.5 bg-slate-100 text-slate-600 rounded">
            👶 {facility.target_age}
          </span>
          {!facility.is_free && (
            <span className="text-xs px-2 py-0.5 bg-slate-100 text-slate-600 rounded">
              💴 {facility.fee_type}
            </span>
          )}
        </div>
        {recommendedTags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1" aria-label="こんな遊びが好きな子に">
            {recommendedTags.map((tag) => {
              const meta = getRecommendedForTagMeta(tag);
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    router.push(`/facilities?recommended_tag=${tag}`);
                  }}
                  className="text-xs px-2 py-0.5 bg-sky-100 text-sky-700 rounded-full hover:bg-sky-200 transition-colors cursor-pointer"
                >
                  <span aria-hidden>{meta.icon}</span> {meta.label}
                </button>
              );
            })}
          </div>
        )}
        <div className="mt-2 grid grid-cols-2 gap-2 border-t border-slate-100 pt-3">
          <button
            type="button"
            disabled={actionsDisabled}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              handleRecord();
            }}
            className="min-h-10 rounded-lg bg-emerald-600 px-2 text-xs font-bold text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
          >
            ✓ 行ったことを記録
          </button>
          <button
            type="button"
            disabled={actionsDisabled || toggling}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              handleWishlist();
            }}
            className={`min-h-10 rounded-lg px-2 text-xs font-bold transition-colors disabled:opacity-50 ${
              isWishlisted
                ? "bg-pink-50 border border-pink-300 text-pink-600 hover:bg-pink-100"
                : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            {isWishlisted ? "♥ 行きたい済み" : "♡ 行きたい"}
          </button>
        </div>
      </div>
    </Link>
  );
}
