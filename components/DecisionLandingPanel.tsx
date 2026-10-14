import Link from "next/link";
import type { ReactNode } from "react";
import type { DecisionPick, MunicipalityGroup } from "@/lib/discovery-landings";
import { buildPrefectureMunicipalityHref } from "@/lib/discovery-landings";
import type { PrefectureId } from "@/types/facility";

export default function DecisionLandingPanel({
  children,
  eyebrow,
  municipalityGroups = [],
  prefectureId,
  picks,
  summary,
  title,
}: {
  children?: ReactNode;
  eyebrow: string;
  municipalityGroups?: MunicipalityGroup[];
  prefectureId?: PrefectureId;
  picks: DecisionPick[];
  summary: string;
  title: string;
}) {
  return (
    <section
      data-decision-landing-panel
      aria-labelledby="decision-landing-heading"
      className="rounded-2xl border border-sky-100 bg-gradient-to-br from-sky-50 via-white to-emerald-50 p-4 shadow-sm sm:p-6"
    >
      <p className="text-xs font-bold text-sky-700">{eyebrow}</p>
      <h2
        id="decision-landing-heading"
        className="mt-1 text-xl font-bold tracking-tight text-slate-950 sm:text-2xl"
      >
        {title}
      </h2>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-700">{summary}</p>

      {picks.length > 0 ? (
        <div
          className="mt-4 flex snap-x gap-3 overflow-x-auto pb-2 sm:grid sm:grid-cols-3 sm:overflow-visible"
          data-decision-picks
        >
          {picks.map(({ facility, reason }, index) => (
            <Link
              key={facility.id}
              href={`/facilities/${facility.slug}`}
              data-decision-pick
              data-pick-index={index}
              className="group min-w-[16.5rem] snap-start rounded-xl border border-slate-200 bg-white p-3 shadow-sm transition hover:border-sky-300 hover:shadow-md sm:min-w-0"
            >
              <p className="text-xs font-bold text-sky-700">{reason}</p>
              <h3 className="mt-1 line-clamp-2 text-sm font-bold text-slate-900 group-hover:text-brand">
                {facility.name}
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                {facility.prefecture}・{facility.category}
              </p>
            </Link>
          ))}
        </div>
      ) : null}

      {children}

      {prefectureId && municipalityGroups.length > 0 ? (
        <div className="mt-5" data-municipality-groups>
          <h3 className="text-sm font-bold text-slate-900">市区町村から候補を選ぶ</h3>
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {municipalityGroups.slice(0, 8).map((group) => (
              <Link
                key={group.municipality}
                href={buildPrefectureMunicipalityHref(
                  prefectureId,
                  group.municipality,
                )}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm hover:border-brand"
              >
                <span className="block font-bold text-slate-900">
                  {group.municipality}
                </span>
                <span className="text-xs text-slate-500">
                  {group.facilities.length}施設
                </span>
              </Link>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
