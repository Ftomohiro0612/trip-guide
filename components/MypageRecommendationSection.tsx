import Link from "next/link";
import type {
  MypageRecommendations,
  RecommendationReason,
} from "@/lib/mypage-recommendations";

function RecommendationReasonLine({
  reason,
}: {
  reason: RecommendationReason;
}) {
  const tagLabels = reason.matchingTags.map((tag) => tag.label).join("・");

  return (
    <p className="text-xs leading-relaxed text-slate-700">
      <span className="font-bold">
        {reason.childNickname}（{reason.age}歳）
      </span>
      の「{tagLabels}」に合う
      {reason.ageCompatibility === "matched" ? "・対象年齢にも合いそう" : ""}
    </p>
  );
}

export default function MypageRecommendationSection({
  prefectureNames,
  recommendations,
}: {
  prefectureNames: readonly string[];
  recommendations: MypageRecommendations;
}) {
  const hasPrefectures = prefectureNames.length > 0;
  const hasRecommendations =
    recommendations.events.length > 0 || recommendations.facilities.length > 0;

  return (
    <section
      className="space-y-4 rounded-[1.75rem] bg-gradient-to-br from-brand/10 via-white to-accent/10 p-4 shadow-sm ring-1 ring-brand/15 sm:p-5"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold tracking-[0.16em] text-brand">
            NEXT OUTING
          </p>
          <h2 className="mt-1 text-lg font-black text-slate-900">
            次のおでかけ、おすすめ
          </h2>
          {hasPrefectures && (
            <p className="mt-1 text-xs leading-relaxed text-slate-500">
              {prefectureNames.join("・")} × 子どもの年齢と「好き」から選びました
            </p>
          )}
        </div>
        <Link
          href="/mypage/settings#recommendation-prefectures"
          className="shrink-0 rounded-full bg-white px-3 py-1.5 text-xs font-bold text-brand shadow-sm ring-1 ring-brand/20 transition-colors hover:bg-brand/10"
        >
          地域設定
        </Link>
      </div>

      {!hasPrefectures ? (
        <div className="rounded-2xl border border-dashed border-brand/25 bg-white/80 p-4">
          <p className="text-sm font-bold text-slate-800">
            おすすめが欲しい都道府県を選んでください
          </p>
          <p className="mt-1 text-xs leading-relaxed text-slate-500">
            よく行く地域や次に行きたい地域を複数登録できます。
          </p>
          <Link
            href="/mypage/settings#recommendation-prefectures"
            className="mt-3 inline-flex rounded-xl bg-brand px-4 py-2 text-sm font-bold text-white shadow-sm transition-colors hover:bg-brand-dark"
          >
            おすすめ地域を設定する →
          </Link>
        </div>
      ) : !recommendations.hasInterestProfile ? (
        <div className="rounded-2xl border border-dashed border-brand/25 bg-white/80 p-4">
          <p className="text-sm font-bold text-slate-800">
            子どもの「好き」が見えてくると、ここに候補が並びます
          </p>
          <p className="mt-1 text-xs leading-relaxed text-slate-500">
            「大満足」か「楽しんだ」おでかけで同じ興味タグが2回以上たまると、その好みに一致する候補だけをご案内します。
          </p>
          <Link
            href="/mypage/visits/new"
            className="mt-3 inline-flex text-sm font-bold text-brand hover:underline"
          >
            おでかけを記録する →
          </Link>
        </div>
      ) : !hasRecommendations ? (
        <div className="rounded-2xl border border-dashed border-brand/25 bg-white/80 p-4">
          <p className="text-sm font-bold text-slate-800">
            今は条件に一致する候補がありません
          </p>
          <p className="mt-1 text-xs leading-relaxed text-slate-500">
            希望地域・年齢・蓄積済みの「好き」が一致する候補だけを表示しています。地域を変えるか、また後日ご確認ください。
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          <div className="space-y-3">
            <div>
              <h3 className="text-sm font-black text-slate-800">近日イベント</h3>
              <p className="mt-0.5 text-[11px] text-slate-500">
                現在公開中で、日程と情報鮮度を確認できるイベントです
              </p>
            </div>
            {recommendations.events.length > 0 ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {recommendations.events.map((item) => (
                  <article
                    key={item.event.id}
                    className="flex flex-col rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200/80"
                  >
                    <div className="flex flex-wrap gap-1.5 text-[11px] font-bold">
                      <span className="rounded-full bg-brand/10 px-2 py-1 text-brand">
                        {item.prefectureLabel}
                      </span>
                      <span className="rounded-full bg-accent/10 px-2 py-1 text-slate-700 ring-1 ring-accent/20">
                        {item.event.date_label}
                      </span>
                    </div>
                    <h4 className="mt-2 text-sm font-black leading-snug text-slate-900">
                      {item.event.title}
                    </h4>
                    <p className="mt-1 text-xs text-slate-500">
                      {item.facilityName ?? item.venueName ?? "会場は公式情報を確認"}
                    </p>
                    <div className="mt-3 space-y-1 rounded-xl bg-brand/5 px-3 py-2 ring-1 ring-brand/10">
                      {item.reasons.map((reason) => (
                        <RecommendationReasonLine
                          key={reason.childId}
                          reason={reason}
                        />
                      ))}
                    </div>
                    {item.event.age_label && (
                      <p className="mt-2 text-[11px] leading-relaxed text-slate-500">
                        対象目安: {item.event.age_label}
                      </p>
                    )}
                    <div className="mt-3 flex flex-wrap items-center gap-3">
                      {item.facilitySlug && (
                        <Link
                          href={`/facilities/${item.facilitySlug}`}
                          className="text-xs font-bold text-brand hover:underline"
                        >
                          施設を見る
                        </Link>
                      )}
                      <a
                        href={item.event.official_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-bold text-slate-700 hover:underline"
                      >
                        公式情報 →
                      </a>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <p className="rounded-lg bg-white/70 px-3 py-2 text-xs text-slate-500">
                条件に一致する近日イベントは現在ありません。
              </p>
            )}
          </div>

          <div className="space-y-3 border-t border-brand/15 pt-4">
            <div>
              <h3 className="text-sm font-black text-slate-800">まだ行っていない施設</h3>
              <p className="mt-0.5 text-[11px] text-slate-500">
                家族のおでかけ記録にない施設から選びました
              </p>
            </div>
            {recommendations.facilities.length > 0 ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {recommendations.facilities.map((item) => (
                  <Link
                    key={item.facility.id}
                    href={`/facilities/${item.facility.slug}`}
                    className="group rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200/80 transition-all hover:-translate-y-0.5 hover:ring-brand/30"
                  >
                    <div className="flex flex-wrap gap-1.5 text-[11px] font-bold">
                      <span className="rounded-full bg-success/10 px-2 py-1 text-slate-700 ring-1 ring-success/20">
                        未訪問
                      </span>
                      <span className="rounded-full bg-brand/10 px-2 py-1 text-brand">
                        {item.facility.prefecture}・{item.facility.category}
                      </span>
                    </div>
                    <h4 className="mt-2 text-sm font-black text-slate-900 group-hover:text-brand">
                      {item.facility.name}
                    </h4>
                    <div className="mt-3 space-y-1 rounded-xl bg-brand/5 px-3 py-2 ring-1 ring-brand/10">
                      {item.reasons.map((reason) => (
                        <RecommendationReasonLine
                          key={reason.childId}
                          reason={reason}
                        />
                      ))}
                    </div>
                    <p className="mt-2 text-[11px] leading-relaxed text-slate-500">
                      対象目安: {item.facility.target_age}
                    </p>
                    <span className="mt-3 inline-flex text-xs font-bold text-brand">
                      施設を見る →
                    </span>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="rounded-lg bg-white/70 px-3 py-2 text-xs text-slate-500">
                条件に一致する未訪問施設は現在ありません。
              </p>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
