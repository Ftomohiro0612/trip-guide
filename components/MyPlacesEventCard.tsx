import Link from "next/link";
import type { MyPlacesEvent } from "@/lib/my-places-events";

export default function MyPlacesEventCard({
  item,
}: {
  item: MyPlacesEvent;
}) {
  const isWishlist = item.origin === "wishlist";

  return (
    <article
      className="flex h-full flex-col rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200/80 transition-all hover:-translate-y-0.5 hover:ring-brand/30"
      data-my-places-event-card
      data-origin={item.origin}
      data-event-id={item.event.id}
      data-facility-slug={item.facility.slug}
    >
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-bold ${
            isWishlist
              ? "bg-accent/10 text-slate-700 ring-1 ring-accent/20"
              : "bg-success/10 text-slate-700 ring-1 ring-success/20"
          }`}
        >
          {isWishlist ? "♥ 行きたい場所" : "👣 行った場所"}
        </span>
      </div>
      <h3 className="line-clamp-2 min-h-[2.75rem] text-sm font-bold leading-snug text-slate-900">
        {item.event.title}
      </h3>
      <p className="mt-2 text-xs font-bold text-slate-600">
        {item.event.date_label}
      </p>
      <div className="mt-3 flex flex-1 flex-col justify-end gap-2">
        <Link
          href={`/facilities/${item.facility.slug}`}
          className="text-xs font-bold text-brand hover:text-brand-dark hover:underline"
        >
          {item.facility.name}
        </Link>
        <a
          href={item.event.official_url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex w-fit items-center text-xs font-bold text-slate-700 hover:text-slate-900 hover:underline"
        >
          詳しく見る →
        </a>
      </div>
    </article>
  );
}
