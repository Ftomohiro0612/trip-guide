import Link from "next/link";
import type {
  MypageRecommendations,
  RecommendationReason,
} from "@/lib/mypage-recommendations";

function ChildRecommendationReason({
  reason,
}: {
  reason: RecommendationReason;
}) {
  const tagLabels = reason.matchingTags.map((tag) => tag.label).join("・");

  return (
    <p className="text-xs font-medium leading-relaxed text-slate-700">
      「{tagLabels}」をよく楽しんでいるから
    </p>
  );
}

export default function ChildRecommendationSection({
  childNickname,
  recommendations,
}: {
  childNickname: string;
  recommendations: MypageRecommendations;
}) {
  return (
    <section
      className="space-y-3 border-t border-slate-100 pt-4"
      aria-label={`${childNickname}に合いそうなおでかけ`}
    >
      <div>
        <p className="text-[10px] font-bold tracking-[0.14em] text-brand">
          FOR {childNickname}
        </p>
        <h3 className="mt-0.5 text-base font-black tracking-tight text-slate-900">
          {childNickname}に合いそう
        </h3>
      </div>

      {recommendations.events.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-bold text-slate-600">近日イベント</p>
          <div className="space-y-2">
            {recommendations.events.map((item) => (
              <article
                key={item.event.id}
                className="rounded-2xl bg-accent/10 p-3 ring-1 ring-accent/20"
              >
                <div className="flex flex-wrap gap-1.5 text-[10px] font-bold">
                  <span className="rounded-full bg-white/80 px-2 py-1 text-brand">
                    {item.prefectureLabel}
                  </span>
                  <span className="rounded-full bg-white/80 px-2 py-1 text-slate-600">
                    {item.event.date_label}
                  </span>
                </div>
                <h4 className="mt-2 text-sm font-black leading-snug text-slate-900">
                  {item.event.title}
                </h4>
                <p className="mt-0.5 text-[11px] text-slate-500">
                  {item.facilityName ?? item.venueName ?? "会場は公式情報を確認"}
                </p>
                <div className="mt-2 rounded-xl bg-white/70 px-3 py-2">
                  {item.reasons.map((reason) => (
                    <ChildRecommendationReason
                      key={reason.childId}
                      reason={reason}
                    />
                  ))}
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  {item.facilitySlug && (
                    <Link
                      href={`/facilities/${item.facilitySlug}`}
                      className="inline-flex min-h-9 items-center rounded-lg text-xs font-bold text-brand hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                    >
                      施設を見る
                    </Link>
                  )}
                  <a
                    href={item.event.official_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-9 items-center rounded-lg text-xs font-bold text-slate-700 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                  >
                    公式情報 →
                  </a>
                </div>
              </article>
            ))}
          </div>
        </div>
      )}

      {recommendations.facilities.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-bold text-slate-600">まだ行っていない施設</p>
          <div className="space-y-2">
            {recommendations.facilities.map((item) => (
              <Link
                key={item.facility.id}
                href={`/facilities/${item.facility.slug}`}
                className="group block rounded-2xl bg-brand/5 p-3 ring-1 ring-brand/15 transition-colors hover:bg-brand/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
              >
                <div className="flex flex-wrap gap-1.5 text-[10px] font-bold">
                  <span className="rounded-full bg-success/10 px-2 py-1 text-slate-700 ring-1 ring-success/20">
                    未訪問
                  </span>
                  <span className="rounded-full bg-white/80 px-2 py-1 text-brand">
                    {item.facility.prefecture}・{item.facility.category}
                  </span>
                </div>
                <h4 className="mt-2 text-sm font-black leading-snug text-slate-900 group-hover:text-brand">
                  {item.facility.name}
                </h4>
                <div className="mt-2 rounded-xl bg-white/70 px-3 py-2">
                  {item.reasons.map((reason) => (
                    <ChildRecommendationReason
                      key={reason.childId}
                      reason={reason}
                    />
                  ))}
                </div>
                <p className="mt-2 text-[11px] leading-relaxed text-slate-500">
                  対象目安: {item.facility.target_age}
                </p>
                <span className="mt-2 inline-flex text-xs font-bold text-brand">
                  施設を見る →
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
