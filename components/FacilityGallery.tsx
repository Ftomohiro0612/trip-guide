import Image from "next/image";

interface Props {
  images: string[];
  attributions?: (string | null | undefined)[];
  facilityName: string;
}

export default function FacilityGallery({
  images,
  attributions = [],
  facilityName,
}: Props) {
  const photos = images.filter(Boolean).slice(0, 3);
  if (photos.length === 0) return null;

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
