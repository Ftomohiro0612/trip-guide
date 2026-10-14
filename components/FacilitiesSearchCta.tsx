import Link from "next/link";

export default function FacilitiesSearchCta({
  href,
  conditionLabel,
}: {
  href: string;
  conditionLabel: string;
}) {
  return (
    <section
      data-facilities-search-cta
      className="mt-10 rounded-2xl border border-sky-200 bg-sky-50 p-5 text-center"
    >
      <h2 className="text-lg font-bold text-slate-900">
        {conditionLabel}を保ったまま、もっと細かく探す
      </h2>
      <p className="mt-1 text-sm text-slate-600">
        エリア・無料・雨の日・年齢などの条件を組み合わせられます。
      </p>
      <Link
        href={href}
        className="mt-4 inline-flex min-h-11 items-center justify-center rounded-full bg-blue-600 px-6 text-sm font-bold text-white shadow-sm hover:bg-blue-700"
      >
        さらに条件を組み合わせて探す →
      </Link>
    </section>
  );
}
