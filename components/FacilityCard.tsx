"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Facility } from "@/types/facility";
import { categoryIcon } from "@/lib/icons";
import { getRecommendedForTagMeta } from "@/lib/recommended-tags";

interface Props {
  facility: Facility;
}

const rainStyles: Record<string, string> = {
  "◎": "bg-sky-100 text-sky-700 ring-1 ring-sky-200",
  "△": "bg-amber-100 text-amber-700 ring-1 ring-amber-200",
  "×": "bg-slate-100 text-slate-500 ring-1 ring-slate-200",
};

export default function FacilityCard({ facility }: Props) {
  const router = useRouter();
  const hasImage = !!facility.image;
  const recommendedTags = (facility.recommended_for_tags ?? []).slice(0, 3);

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
            <span className="text-5xl drop-shadow-sm" aria-hidden>
              {categoryIcon(facility.category_id)}
            </span>
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
          <span aria-hidden>{categoryIcon(facility.category_id)}</span>
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
      </div>
    </Link>
  );
}
