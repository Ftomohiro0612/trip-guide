"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const BUCKET = "visit-photos";

export type VisitPhotoGalleryPhoto = {
  id: string;
  storagePath: string;
  thumbPath: string;
  thumbUrl: string | null;
  fullUrl: string | null;
  takenOn: string | null;
};

export default function VisitPhotoGallery({
  visitId,
  initialPhotos,
  title = "写真",
  onPhotosChange,
  deletable = true,
  variant = "grid",
}: {
  visitId: string;
  initialPhotos: VisitPhotoGalleryPhoto[];
  title?: string;
  onPhotosChange?: (count: number) => void;
  deletable?: boolean;
  variant?: "large" | "grid";
}) {
  const router = useRouter();
  const [photos, setPhotos] = useState(initialPhotos);
  const [featuredPhotoIndex, setFeaturedPhotoIndex] = useState(0);
  const [activePhoto, setActivePhoto] =
    useState<VisitPhotoGalleryPhoto | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (!activePhoto) return;

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setActivePhoto(null);
      }
    }

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [activePhoto]);

  async function deletePhoto(photo: VisitPhotoGalleryPhoto) {
    if (!window.confirm("この写真を削除しますか？")) return;

    setDeletingId(photo.id);
    const storagePath = photo.storagePath;
    const thumbPath = photo.thumbPath;
    const pathsToRemove = Array.from(new Set([storagePath, thumbPath]));
    const supabase = createClient();

    const { error: deleteError } = await supabase
      .from("visit_photos")
      .delete()
      .eq("id", photo.id)
      .eq("visit_id", visitId);

    if (deleteError) {
      window.alert(deleteError.message);
      setDeletingId(null);
      return;
    }

    const nextPhotos = photos.filter((item) => item.id !== photo.id);
    setPhotos(nextPhotos);
    onPhotosChange?.(nextPhotos.length);
    if (activePhoto?.id === photo.id) {
      setActivePhoto(null);
    }

    const { error: removeError } = await supabase.storage
      .from(BUCKET)
      .remove(pathsToRemove);
    if (removeError) {
      console.warn("visit photo storage remove failed", removeError);
    }

    setDeletingId(null);
    router.refresh();
  }

  if (photos.length === 0) return null;

  const featuredPhoto = photos[featuredPhotoIndex] ?? photos[0];
  const featuredPhotoUrl = featuredPhoto.fullUrl ?? featuredPhoto.thumbUrl;

  return (
    <section className={variant === "large" ? "bg-black" : "space-y-3"}>
      {variant === "large" ? (
        <div className="relative h-[68dvh] min-h-[26rem] max-h-[42rem] overflow-hidden bg-black shadow-2xl">
          <h2 className="sr-only">{title}</h2>
          <button
            type="button"
            onClick={() => {
              if (featuredPhoto.fullUrl) setActivePhoto(featuredPhoto);
            }}
            disabled={!featuredPhoto.fullUrl}
            className="absolute inset-0 block h-full w-full bg-black disabled:cursor-default focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-white"
            aria-label={`${featuredPhotoIndex + 1}枚目の写真を拡大表示`}
          >
            {featuredPhotoUrl ? (
              // The detail hero keeps using the 1600px signed asset when available.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={featuredPhotoUrl}
                alt={`おでかけの写真 ${featuredPhotoIndex + 1}`}
                className="h-full w-full object-cover"
                loading="eager"
              />
            ) : (
              <span className="flex h-full w-full items-center justify-center px-4 text-sm text-white/75">
                写真を表示できません
              </span>
            )}
          </button>

          <div
            className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/45"
            aria-hidden="true"
          />

          {photos.length > 1 && (
            <div
              className="absolute right-5 bottom-5 z-20 flex max-w-[calc(100%-2.5rem)] justify-end gap-2 touch-pan-y"
              role="group"
              aria-label="おでかけの写真を選ぶ"
            >
              {photos.map((photo, photoIndex) => {
                const thumbnailUrl = photo.thumbUrl ?? photo.fullUrl;
                return (
                  <button
                    key={photo.id}
                    type="button"
                    onClick={() => setFeaturedPhotoIndex(photoIndex)}
                    className={`relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-black/40 shadow-lg transition-transform focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${
                      photoIndex === featuredPhotoIndex
                        ? "scale-105 ring-2 ring-white"
                        : "ring-1 ring-white/70"
                    }`}
                    aria-label={`${photoIndex + 1}枚目の写真を表示`}
                    aria-pressed={photoIndex === featuredPhotoIndex}
                  >
                    {thumbnailUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={thumbnailUrl}
                        alt=""
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <span
                        className="flex h-full w-full items-center justify-center text-xs font-bold text-white/80"
                        aria-hidden="true"
                      >
                        {photoIndex + 1}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-bold text-slate-800">{title}</h2>
            <span className="text-xs text-slate-400">{photos.length}枚</span>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {photos.map((photo) => {
              const deleting = deletingId === photo.id;
              return (
                <div
                  key={photo.id}
                  className="overflow-hidden rounded-lg border border-slate-200 bg-white"
                >
                  <div className="relative aspect-square bg-slate-100">
                    <button
                      type="button"
                      onClick={() => {
                        if (photo.fullUrl) setActivePhoto(photo);
                      }}
                      disabled={!photo.fullUrl || deleting}
                      className="block h-full w-full disabled:cursor-default"
                      aria-label="写真を拡大表示"
                    >
                      {photo.thumbUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={photo.thumbUrl}
                          alt="おでかけの写真"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span className="flex h-full w-full items-center justify-center px-2 text-xs text-slate-400">
                          写真を表示できません
                        </span>
                      )}
                    </button>
                    {deletable && (
                      <button
                        type="button"
                        onClick={() => deletePhoto(photo)}
                        disabled={deleting}
                        aria-label="写真を削除"
                        className="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-white/95 text-sm font-bold text-red-600 shadow-sm transition-colors hover:bg-red-50 disabled:opacity-50"
                      >
                        {deleting ? "..." : "×"}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {activePhoto?.fullUrl && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
          onClick={() => setActivePhoto(null)}
        >
          <div
            className="relative max-h-full max-w-full"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setActivePhoto(null)}
              aria-label="写真を閉じる"
              className="absolute right-2 top-2 z-10 rounded-full bg-white/95 px-3 py-1.5 text-sm font-bold text-slate-700 shadow-sm hover:bg-white"
            >
              閉じる
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={activePhoto.fullUrl}
              alt="おでかけの写真"
              className="max-h-[85vh] max-w-full rounded-lg object-contain"
            />
          </div>
        </div>
      )}
    </section>
  );
}
