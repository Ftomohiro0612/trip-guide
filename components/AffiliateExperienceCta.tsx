import TrackedOutboundLink from "@/components/TrackedOutboundLink";

const RAKUTEN_EXPERIENCE_AFFILIATE_URL = "https://a.r10.to/h5LdGk";
const RAKUTEN_EXPERIENCE_CAMPAIGN_ID = "memorips-experience";

type AffiliatePlacement =
  | "events_index"
  | "events_prefecture"
  | "events_summer";

const LINK_LOCATION = {
  events_index: "events_index_affiliate",
  events_prefecture: "events_prefecture_affiliate",
  events_summer: "events_summer_affiliate",
} as const;

const TOP_MARGIN = {
  events_index: "",
  events_prefecture: "mt-8",
  events_summer: "mt-8",
} as const;

export default function AffiliateExperienceCta({
  placement,
}: {
  placement: AffiliatePlacement;
}) {
  return (
    <aside
      aria-labelledby={`affiliate-experience-${placement}-heading`}
      className={`${TOP_MARGIN[placement]} rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 p-5 sm:flex sm:items-center sm:justify-between sm:gap-6 sm:p-6`}
    >
      <div>
        <div className="flex items-center gap-2">
          <span className="rounded bg-amber-200 px-2 py-0.5 text-[11px] font-bold text-amber-950">
            PR
          </span>
          <p className="text-xs font-bold text-amber-800">
            楽天トラベル観光体験
          </p>
        </div>
        <h2
          id={`affiliate-experience-${placement}-heading`}
          className="mt-2 text-lg font-bold text-slate-900"
        >
          予約できる遊び・体験も探す
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">
          イベントの日程が合わないときは、家族で予約できるチケットや体験を全国から探せます。
        </p>
        <p className="mt-2 text-[11px] leading-relaxed text-slate-500">
          このリンクから予約・利用されると、メモリップに紹介料が入る場合があります。
        </p>
      </div>
      <TrackedOutboundLink
        href={RAKUTEN_EXPERIENCE_AFFILIATE_URL}
        contentType="affiliate"
        contentId={RAKUTEN_EXPERIENCE_CAMPAIGN_ID}
        intentType="affiliate_experience"
        linkLocation={LINK_LOCATION[placement]}
        analyticsEvent="affiliate_outbound_click"
        partner="rakuten_travel_experiences"
        campaignId={RAKUTEN_EXPERIENCE_CAMPAIGN_ID}
        sponsored
        className="mt-4 inline-flex shrink-0 items-center justify-center rounded-lg bg-amber-500 px-5 py-3 text-sm font-bold text-slate-950 transition-colors hover:bg-amber-400 sm:mt-0"
      >
        遊び・体験を見る ↗
      </TrackedOutboundLink>
    </aside>
  );
}
