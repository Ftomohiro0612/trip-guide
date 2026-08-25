import type { RakutenFacilityAction } from "@/lib/rakuten-facility-actions";

export default function FacilityRakutenAction({
  action,
}: {
  action: RakutenFacilityAction;
}) {
  return (
    <section
      aria-label="チケット・予約"
      className="rounded-2xl border border-rose-200 bg-rose-50/70 p-4"
    >
      <p className="mb-1 text-xs font-bold text-rose-700">チケット・予約</p>
      <p className="mb-3 text-xs leading-relaxed text-slate-600">
        この施設で使える楽天トラベル観光体験のプランです。
      </p>
      <a
        href={action.url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex w-full items-center justify-center gap-1 rounded-xl bg-rose-600 px-4 py-3 text-center text-sm font-bold text-white transition-colors hover:bg-rose-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-600"
      >
        <span>{action.label}</span>
        <span aria-hidden>↗</span>
      </a>
      <p className="mt-2 text-[11px] leading-relaxed text-slate-500">
        料金・空き状況・利用条件はリンク先でご確認ください。
      </p>
    </section>
  );
}
