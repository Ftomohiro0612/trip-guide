"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import ChildAvatar from "@/components/ChildAvatar";

export default function ChildAvatarUploader({
  childId,
  nickname,
  avatarUrl,
}: {
  childId: string;
  nickname: string;
  avatarUrl: string | null;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleFileChange(nextFile: File | null) {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setError(null);
    setFile(nextFile);
    setPreviewUrl(nextFile ? URL.createObjectURL(nextFile) : null);
  }

  async function save() {
    if (!file || saving) return;
    setSaving(true);
    setError(null);
    const formData = new FormData();
    formData.set("file", file);

    const response = await fetch(`/api/children/${childId}/avatar`, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;
      setError(body?.error ?? "写真の保存に失敗しました");
      setSaving(false);
      return;
    }

    handleFileChange(null);
    setSaving(false);
    router.refresh();
  }

  async function remove() {
    if (saving) return;
    setSaving(true);
    setError(null);

    const response = await fetch(`/api/children/${childId}/avatar`, {
      method: "DELETE",
    });

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;
      setError(body?.error ?? "写真の削除に失敗しました");
      setSaving(false);
      return;
    }

    setSaving(false);
    router.refresh();
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        {previewUrl ? (
          <span className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full">
            <Image
              src={previewUrl}
              alt={`${nickname}の写真プレビュー`}
              fill
              sizes="64px"
              className="object-cover"
              unoptimized
            />
          </span>
        ) : (
          <ChildAvatar
            childId={childId}
            nickname={nickname}
            avatarUrl={avatarUrl}
            size="lg"
          />
        )}

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="px-3 py-1.5 border border-slate-300 text-slate-600 rounded-lg text-xs font-medium hover:bg-slate-50 transition-colors"
          >
            写真を変更
          </button>
          {file && (
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="px-3 py-1.5 bg-brand text-white rounded-lg text-xs font-bold hover:bg-brand-dark transition-colors disabled:opacity-50"
            >
              {saving ? "保存中..." : "保存"}
            </button>
          )}
          {avatarUrl && !file && (
            <button
              type="button"
              onClick={remove}
              disabled={saving}
              className="px-3 py-1.5 border border-red-200 text-red-500 rounded-lg text-xs font-medium hover:bg-red-50 transition-colors disabled:opacity-50"
            >
              {saving ? "削除中..." : "写真を削除"}
            </button>
          )}
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={(event) => handleFileChange(event.target.files?.[0] ?? null)}
        className="hidden"
      />

      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
