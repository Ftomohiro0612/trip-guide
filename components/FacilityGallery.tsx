import Image from "next/image";
import FacilityPhotoSearchLink from "@/components/FacilityPhotoSearchLink";

interface Props {
  images: string[];
  attributions?: (string | null | undefined)[];
  facilityName: string;
  address: string;
}

export default function FacilityGallery({
  images,
  attributions = [],
  facilityName,
  address,
}: Props) {
  const photos = images.filter(Boolean).slice(0, 3);
  if (photos.length === 0) {
    return (
      <section className="mt-8" aria-labelledby="facility-gallery-heading">
        <h2 id="facility-gallery-heading" className="mb-3 text-xl font-bold">
          写真ギャラリー
        </h2>
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-center">
          <p className="font-bold text-slate-700">Memorip掲載写真はありません</p>
          <p className="mt-1 text-xs leading-relaxed text-slate-500">
            外部サイトの検索結果で、最新の施設写真をご確認ください。
          </p>
          <FacilityPhotoSearchLink
            facilityName={facilityName}
            address={address}
            compact
            className="mt-3 inline-flex min-h-11 items-center justify-center rounded-xl border border-sky-300 bg-white px-4 text-sm font-bold text-sky-700 transition-colors hover:bg-sky-50"
          />
        </div>
      </section>
    );
  }

  const credits = Array.from(
    new Set(attributions.filter((a): a is string => !!a)),
  );

  return (
    <section className="mt-8">
      <h2 className="text-xl font-bold mb-3">写真ギャラリー</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {photos.map((src, i) => (
          <div
            key={`${src}-${i}`}
            className="relative aspect-[4/3] rounded-lg overflow-hidden bg-slate-100"
          >
            <Image
              src={src}
              alt={`${facilityName} の写真 ${i + 1}`}
              fill
              sizes="(max-width: 640px) 50vw, 33vw"
              className="object-cover"
            />
          </div>
        ))}
      </div>
      {credits.length > 0 && (
        <p
          className="text-[11px] text-slate-500 mt-2 leading-relaxed"
          dangerouslySetInnerHTML={{
            __html: `画像出典: ${credits.join(" / ")}`,
          }}
        />
      )}
    </section>
  );
}
