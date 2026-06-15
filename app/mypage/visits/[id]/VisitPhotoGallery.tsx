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
}: {
  visitId: string;
  initialPhotos: VisitPhotoGalleryPhoto[];
  title?: string;
  onPhotosChange?: (count: number) => void;
}) {
  const router = useRouter();
  const [photos, setPhotos] = useState(initialPhotos);
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

  return (
    <section className="space-y-3">
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
                <button
                  type="button"
                  onClick={() => deletePhoto(photo)}
                  disabled={deleting}
                  aria-label="写真を削除"
                  className="absolute right-1.5 top-1.5 rounded-full bg-white/95 px-2 py-1 text-xs font-bold text-red-600 shadow-sm transition-colors hover:bg-red-50 disabled:opacity-50"
                >
                  {deleting ? "..." : "削除"}
                </button>
              </div>
              {photo.takenOn && (
                <p className="truncate px-2 py-1.5 text-[11px] text-slate-500">
                  撮影日 {photo.takenOn}
                </p>
              )}
            </div>
          );
        })}
      </div>

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
