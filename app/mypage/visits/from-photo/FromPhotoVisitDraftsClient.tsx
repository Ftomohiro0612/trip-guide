"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { PHOTO_UPLOAD_ENABLED } from "@/lib/config";
import { createClient } from "@/lib/supabase/client";
import {
  MAX_PHOTOS_PER_VISIT,
  readPhotoGps,
  readTakenOn,
  uploadPhoto,
  validatePhotoFile,
  type GpsCoordinates,
} from "../VisitPhotoUploader";

export type CandidateFacility = {
  slug: string;
  name: string;
  category: string;
  prefecture: string;
  latitude: number;
  longitude: number;
};

type FacilityChoice = {
  slug: string;
  name: string;
  category: string;
  prefecture: string;
};

type FacilityCandidate = FacilityChoice & {
  distanceKm: number;
};

type DraftPhoto = {
  localId: string;
  file: File;
  previewUrl: string;
  takenOn: string | null;
  hasGps: boolean;
};

type VisitStatus = "draft" | "published";

type ExistingVisitMatch = {
  id: string;
  status: VisitStatus;
  facilitySlug: string;
  facilityName: string;
  visitedOn: string;
  photoCount: number;
};

type VisitDraft = {
  id: string;
  save: boolean;
  visitedOn: string;
  detectedDate: string | null;
  facilitySlug: string;
  facilityName: string;
  candidates: FacilityCandidate[];
  photos: DraftPhoto[];
  selectedPhotoIds: string[];
  searchQuery: string;
  existingMatch: ExistingVisitMatch | null;
  createSeparate: boolean;
};

type SearchState = Record<string, FacilityChoice[]>;

type ExistingVisitRow = {
  id: string;
  status: VisitStatus | string | null;
  facility_slug: string | null;
  facility_name: string | null;
  visited_on: string | null;
  created_at: string | null;
};

const MAX_BATCH_PHOTOS = 10;
const NEARBY_THRESHOLD_KM = 10;
const CLEAR_NEAREST_DISTANCE_KM = 0.5;
const CLEAR_NEAREST_GAP_KM = 1;
const CLEAR_NEAREST_RATIO = 3;
const EARTH_RADIUS_KM = 6371;

function todayString(): string {
  const date = new Date();
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function toRadians(degrees: number) {
  return (degrees * Math.PI) / 180;
}

function haversineDistanceKm(
  from: GpsCoordinates,
  to: Pick<CandidateFacility, "latitude" | "longitude">,
) {
  const deltaLat = toRadians(to.latitude - from.latitude);
  const deltaLng = toRadians(to.longitude - from.longitude);
  const lat1 = toRadians(from.latitude);
  const lat2 = toRadians(to.latitude);
  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c;
}

function formatDistance(distanceKm: number): string {
  if (distanceKm < 1) return `約${Math.round(distanceKm * 1000)}m`;
  return `約${distanceKm.toFixed(distanceKm < 10 ? 1 : 0)}km`;
}

function nearestCandidates(
  gps: GpsCoordinates,
  facilities: CandidateFacility[],
): FacilityCandidate[] {
  const nearby = facilities
    .map((facility) => ({
      slug: facility.slug,
      name: facility.name,
      category: facility.category,
      prefecture: facility.prefecture,
      distanceKm: haversineDistanceKm(gps, facility),
    }))
    .filter((facility) => facility.distanceKm <= NEARBY_THRESHOLD_KM)
    .sort((a, b) => a.distanceKm - b.distanceKm);

  const first = nearby[0];
  if (!first) return [];

  const second = nearby[1];
  if (
    first.distanceKm <= CLEAR_NEAREST_DISTANCE_KM &&
    (!second ||
      second.distanceKm - first.distanceKm >= CLEAR_NEAREST_GAP_KM ||
      second.distanceKm / Math.max(first.distanceKm, 0.01) >=
        CLEAR_NEAREST_RATIO)
  ) {
    return [first];
  }

  return nearby.slice(0, 3);
}

function makeManualFacilitySlug(name: string): string {
  const encoded = Array.from(name.trim())
    .map((char) => char.codePointAt(0)?.toString(36) ?? "")
    .filter(Boolean)
    .join("-");
  return `manual-${encoded.slice(0, 120) || Date.now().toString(36)}`;
}

function createDrafts(
  photosWithGps: (DraftPhoto & { gps: GpsCoordinates | null })[],
  facilities: CandidateFacility[],
): VisitDraft[] {
  const draftsByKey = new Map<string, VisitDraft>();
  const fallbackDate = todayString();

  for (const photo of photosWithGps) {
    const candidates = photo.gps ? nearestCandidates(photo.gps, facilities) : [];
    const inferredFacility = candidates[0] ?? null;
    const dateKey = photo.takenOn ?? "unknown";
    const facilityKey = inferredFacility?.slug ?? "unresolved";
    const key = `${dateKey}:${facilityKey}`;

    const draftPhoto: DraftPhoto = {
      localId: photo.localId,
      file: photo.file,
      previewUrl: photo.previewUrl,
      takenOn: photo.takenOn,
      hasGps: photo.hasGps,
    };
    const existing = draftsByKey.get(key);

    if (existing) {
      existing.photos.push(draftPhoto);
      existing.selectedPhotoIds = existing.photos
        .slice(0, MAX_PHOTOS_PER_VISIT)
        .map((item) => item.localId);
      if (existing.candidates.length === 0 && candidates.length > 0) {
        existing.candidates = candidates;
      }
      continue;
    }

    draftsByKey.set(key, {
      id: crypto.randomUUID(),
      save: true,
      visitedOn: photo.takenOn ?? fallbackDate,
      detectedDate: photo.takenOn,
      facilitySlug: inferredFacility?.slug ?? "",
      facilityName: inferredFacility?.name ?? "",
      candidates,
      photos: [draftPhoto],
      selectedPhotoIds: [draftPhoto.localId],
      searchQuery: "",
      existingMatch: null,
      createSeparate: false,
    });
  }

  return Array.from(draftsByKey.values());
}

function withUpdatedDraft(
  drafts: VisitDraft[],
  draftId: string,
  updater: (draft: VisitDraft) => VisitDraft,
) {
  return drafts.map((draft) => (draft.id === draftId ? updater(draft) : draft));
}

function isStoredFacilitySlug(slug: string) {
  return Boolean(slug) && !slug.startsWith("manual-");
}

function getAttachLimit(draft: VisitDraft): number {
  if (draft.existingMatch && !draft.createSeparate) {
    return Math.max(0, MAX_PHOTOS_PER_VISIT - draft.existingMatch.photoCount);
  }
  return MAX_PHOTOS_PER_VISIT;
}

function normalizeSelectedPhotoIds(draft: VisitDraft): string[] {
  const selected = new Set(draft.selectedPhotoIds);
  const validSelected = draft.photos
    .filter((photo) => selected.has(photo.localId))
    .map((photo) => photo.localId);
  if (validSelected.length > 0) {
    return validSelected.slice(0, getAttachLimit(draft));
  }
  return draft.photos.slice(0, getAttachLimit(draft)).map((photo) => photo.localId);
}

function selectedPhotosForDraft(draft: VisitDraft): DraftPhoto[] {
  const selected = new Set(draft.selectedPhotoIds);
  return draft.photos.filter((photo) => selected.has(photo.localId));
}

function isPersistableDraft(draft: VisitDraft): boolean {
  return (
    draft.visitedOn.length > 0 &&
    draft.facilityName.trim().length > 0 &&
    getAttachLimit(draft) > 0 &&
    selectedPhotosForDraft(draft).length > 0
  );
}

function matchesExistingVisit(draft: VisitDraft, visit: ExistingVisitRow): boolean {
  if (!visit.visited_on || visit.visited_on !== draft.visitedOn) return false;

  if (isStoredFacilitySlug(draft.facilitySlug)) {
    return visit.facility_slug === draft.facilitySlug;
  }

  const draftName = draft.facilityName.trim();
  const visitName = visit.facility_name?.trim() ?? "";
  return draftName.length > 0 && draftName === visitName;
}

async function resolveExistingMatches(
  drafts: VisitDraft[],
  userId: string,
): Promise<VisitDraft[]> {
  const dates = Array.from(
    new Set(drafts.map((draft) => draft.visitedOn).filter(Boolean)),
  );
  if (dates.length === 0) return drafts;

  const supabase = createClient();
  const { data: visitRows, error: visitError } = await supabase
    .from("visits")
    .select("id, status, facility_slug, facility_name, visited_on, created_at")
    .eq("user_id", userId)
    .in("visited_on", dates)
    .order("created_at", { ascending: false });

  if (visitError) throw new Error(visitError.message);

  const visits = (visitRows ?? []) as ExistingVisitRow[];
  const matchedIds = Array.from(
    new Set(
      drafts
        .map((draft) => visits.find((visit) => matchesExistingVisit(draft, visit))?.id)
        .filter((id): id is string => Boolean(id)),
    ),
  );

  const photoCountByVisit = new Map<string, number>();
  if (matchedIds.length > 0) {
    const { data: photoRows, error: photoError } = await supabase
      .from("visit_photos")
      .select("visit_id")
      .in("visit_id", matchedIds);
    if (photoError) throw new Error(photoError.message);
    for (const row of (photoRows ?? []) as { visit_id: string }[]) {
      photoCountByVisit.set(row.visit_id, (photoCountByVisit.get(row.visit_id) ?? 0) + 1);
    }
  }

  return drafts.map((draft) => {
    const visit = visits.find((row) => matchesExistingVisit(draft, row));
    const existingStatus: VisitStatus =
      visit?.status === "draft" ? "draft" : "published";
    const existingMatch: ExistingVisitMatch | null = visit?.visited_on
      ? {
          id: visit.id,
          status: existingStatus,
          facilitySlug: visit.facility_slug ?? "",
          facilityName: visit.facility_name ?? draft.facilityName,
          visitedOn: visit.visited_on,
          photoCount: photoCountByVisit.get(visit.id) ?? 0,
        }
      : null;
    const nextDraft: VisitDraft = {
      ...draft,
      existingMatch,
    };
    const selectedPhotoIds = normalizeSelectedPhotoIds(nextDraft);
    const noMergeSlots =
      Boolean(existingMatch) &&
      !nextDraft.createSeparate &&
      getAttachLimit(nextDraft) === 0;
    return {
      ...nextDraft,
      selectedPhotoIds,
      save: noMergeSlots ? false : draft.save,
    };
  });
}

function shouldSkipConfirmation(drafts: VisitDraft[]): boolean {
  if (drafts.length !== 1) return false;
  const draft = drafts[0];
  const isMerge = Boolean(draft.existingMatch) && !draft.createSeparate;
  const facilityConfirmed = isMerge || draft.candidates.length === 1;
  return (
    Boolean(draft.detectedDate) &&
    facilityConfirmed &&
    draft.photos.length <= getAttachLimit(draft) &&
    isPersistableDraft(draft)
  );
}

export default function FromPhotoVisitDraftsClient({
  facilities,
}: {
  facilities: CandidateFacility[];
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const draftsRef = useRef<VisitDraft[]>([]);
  const [drafts, setDrafts] = useState<VisitDraft[]>([]);
  const [preparing, setPreparing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<SearchState>({});
  const [searchingDraftId, setSearchingDraftId] = useState<string | null>(null);

  useEffect(() => {
    draftsRef.current = drafts;
  }, [drafts]);

  useEffect(() => {
    return () => {
      draftsRef.current.forEach((draft) => {
        draft.photos.forEach((photo) => URL.revokeObjectURL(photo.previewUrl));
      });
    };
  }, []);

  const selectedDrafts = drafts.filter((draft) => draft.save);
  const canSave =
    selectedDrafts.length > 0 &&
    selectedDrafts.every(isPersistableDraft) &&
    !preparing &&
    !saving;

  const photoCount = useMemo(
    () => drafts.reduce((sum, draft) => sum + draft.photos.length, 0),
    [drafts],
  );
  const matchSignature = useMemo(
    () =>
      drafts
        .map(
          (draft) =>
            `${draft.id}:${draft.visitedOn}:${draft.facilitySlug}:${draft.facilityName}:${draft.createSeparate ? "1" : "0"}`,
        )
        .join("|"),
    [drafts],
  );

  useEffect(() => {
    if (drafts.length === 0 || preparing || saving) return;
    let active = true;

    async function refreshExistingMatches() {
      try {
        const supabase = createClient();
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();
        if (userError || !user) return;

        const resolved = await resolveExistingMatches(draftsRef.current, user.id);
        if (!active) return;
        setDrafts((current) =>
          current.map((draft) => {
            const next = resolved.find((item) => item.id === draft.id);
            return next
              ? {
                  ...draft,
                  existingMatch: next.existingMatch,
                  selectedPhotoIds: next.selectedPhotoIds,
                  save: next.save,
                }
              : draft;
          }),
        );
      } catch (caughtError) {
        if (!active) return;
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "既存記録の確認に失敗しました。",
        );
      }
    }

    refreshExistingMatches();
    return () => {
      active = false;
    };
  }, [drafts.length, matchSignature, preparing, saving]);

  function replaceDrafts(nextDrafts: VisitDraft[]) {
    draftsRef.current.forEach((draft) => {
      draft.photos.forEach((photo) => URL.revokeObjectURL(photo.previewUrl));
    });
    draftsRef.current = nextDrafts;
    setSearchResults({});
    setDrafts(nextDrafts);
  }

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const selectedFiles = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (selectedFiles.length === 0) return;

    setPreparing(true);
    setError(null);
    setNotice(null);

    const files = selectedFiles.slice(0, MAX_BATCH_PHOTOS);
    if (selectedFiles.length > MAX_BATCH_PHOTOS) {
      setNotice(`最大${MAX_BATCH_PHOTOS}枚までです。先頭${MAX_BATCH_PHOTOS}枚だけ読み取りました。`);
    }

    const accepted: (DraftPhoto & { gps: GpsCoordinates | null })[] = [];
    const errors: string[] = [];
    let draftsWereReplaced = false;

    try {
      for (const file of files) {
        const validationError = validatePhotoFile(file);
        if (validationError) {
          errors.push(validationError);
          continue;
        }

        const [takenOn, gps] = await Promise.all([
          readTakenOn(file),
          readPhotoGps(file),
        ]);
        accepted.push({
          localId: crypto.randomUUID(),
          file,
          previewUrl: URL.createObjectURL(file),
          takenOn,
          gps,
          hasGps: Boolean(gps),
        });
      }

      if (accepted.length === 0) {
        replaceDrafts([]);
        setError(errors[0] ?? "読み取れる写真がありませんでした。");
        return;
      }

      const baseDrafts = createDrafts(accepted, facilities);
      const supabase = createClient();
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error("ログインが必要です。");
      }

      const resolvedDrafts = await resolveExistingMatches(baseDrafts, user.id);
      replaceDrafts(resolvedDrafts);
      draftsWereReplaced = true;
      if (shouldSkipConfirmation(resolvedDrafts)) {
        setSaving(true);
        const visitId = await persistDraft(resolvedDrafts[0], user.id);
        replaceDrafts([]);
        router.push(`/mypage/visits/${visitId}/edit`);
        return;
      }
      if (errors.length > 0) setError(Array.from(new Set(errors))[0]);
    } catch (caughtError) {
      if (!draftsWereReplaced) {
        accepted.forEach((photo) => URL.revokeObjectURL(photo.previewUrl));
      }
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "写真の読み取りに失敗しました。",
      );
      setSaving(false);
    } finally {
      setPreparing(false);
    }
  }

  function selectFacility(draftId: string, facility: FacilityChoice) {
    setDrafts((current) =>
      withUpdatedDraft(current, draftId, (draft) => ({
        ...draft,
        facilitySlug: facility.slug,
        facilityName: facility.name,
      })),
    );
  }

  function togglePhoto(draftId: string, photoId: string) {
    setDrafts((current) =>
      withUpdatedDraft(current, draftId, (draft) => {
        const selected = draft.selectedPhotoIds.includes(photoId);
        if (selected) {
          return {
            ...draft,
            selectedPhotoIds: draft.selectedPhotoIds.filter((id) => id !== photoId),
          };
        }
        if (draft.selectedPhotoIds.length >= getAttachLimit(draft)) return draft;
        return {
          ...draft,
          selectedPhotoIds: [...draft.selectedPhotoIds, photoId],
        };
      }),
    );
  }

  function setCreateSeparate(draftId: string, createSeparate: boolean) {
    setDrafts((current) =>
      withUpdatedDraft(current, draftId, (draft) => {
        const nextDraft = { ...draft, createSeparate };
        const selectedPhotoIds = normalizeSelectedPhotoIds(nextDraft);
        return {
          ...nextDraft,
          selectedPhotoIds,
          save: getAttachLimit(nextDraft) > 0 ? true : false,
        };
      }),
    );
  }

  async function searchFacility(draft: VisitDraft) {
    const query = draft.searchQuery.trim();
    if (query.length < 2) {
      setSearchResults((current) => ({ ...current, [draft.id]: [] }));
      return;
    }

    setSearchingDraftId(draft.id);
    setError(null);
    try {
      const response = await fetch(
        `/api/facilities/search?q=${encodeURIComponent(query)}`,
      );
      if (!response.ok) throw new Error("施設検索に失敗しました。");
      const data = (await response.json()) as { results?: FacilityChoice[] };
      setSearchResults((current) => ({
        ...current,
        [draft.id]: data.results ?? [],
      }));
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "施設検索に失敗しました。",
      );
    } finally {
      setSearchingDraftId(null);
    }
  }

  async function persistDraft(draft: VisitDraft, userId: string): Promise<string> {
    const effectiveDraft = draft.createSeparate
      ? draft
      : (await resolveExistingMatches([draft], userId))[0];
    const selectedPhotos = selectedPhotosForDraft(effectiveDraft).slice(
      0,
      getAttachLimit(effectiveDraft),
    );

    if (selectedPhotos.length === 0) {
      throw new Error("添付できる写真がありません。");
    }

    if (effectiveDraft.existingMatch && !effectiveDraft.createSeparate) {
      const startOrder = effectiveDraft.existingMatch.photoCount;
      for (const [index, photo] of selectedPhotos.entries()) {
        await uploadPhoto({
          file: photo.file,
          takenOn: photo.takenOn,
          visitId: effectiveDraft.existingMatch.id,
          userId,
          sortOrder: startOrder + index,
        });
      }
      return effectiveDraft.existingMatch.id;
    }

    const supabase = createClient();
    const visitedDate = new Date(`${effectiveDraft.visitedOn}T00:00:00`);
    const visitedYear = visitedDate.getFullYear();
    const visitedMonth = visitedDate.getMonth() + 1;
    const today = todayString();
    const facilityName = effectiveDraft.facilityName.trim();

    const { data: visit, error: visitError } = await supabase
      .from("visits")
      .insert({
        user_id: userId,
        facility_slug:
          effectiveDraft.facilitySlug || makeManualFacilitySlug(facilityName),
        facility_name: facilityName,
        status: "draft",
        visited_on: effectiveDraft.visitedOn,
        visited_year: visitedYear,
        visited_month: visitedMonth,
        date_precision: "exact",
        is_past_entry: effectiveDraft.visitedOn < today,
        family_revisit: "conditional",
        parent_fatigue: "normal",
      })
      .select("id")
      .single();

    if (visitError || !visit) {
      throw new Error(visitError?.message ?? "記録の保存に失敗しました。");
    }

    if (PHOTO_UPLOAD_ENABLED) {
      for (const [sortOrder, photo] of selectedPhotos.entries()) {
        await uploadPhoto({
          file: photo.file,
          takenOn: photo.takenOn,
          visitId: visit.id,
          userId,
          sortOrder,
        });
      }
    }

    return visit.id;
  }

  async function saveDrafts() {
    if (!canSave) return;
    setSaving(true);
    setError(null);

    try {
      const supabase = createClient();
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        throw new Error("ログインが必要です。");
      }

      for (const draft of selectedDrafts) {
        await persistDraft(draft, user.id);
      }

      replaceDrafts([]);
      router.push("/mypage/visits");
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "一括作成に失敗しました。",
      );
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 space-y-5">
      <Link
        href="/mypage"
        className="text-slate-400 hover:text-slate-600 transition-colors"
      >
        ← マイページ
      </Link>

      <div className="space-y-1">
        <h1 className="text-xl font-bold text-slate-900">
          写真からおでかけ記録を作る
        </h1>
        <p className="text-sm leading-relaxed text-slate-500">
          複数写真の撮影日と位置情報から候補を作り、確認してからまとめて保存します。
        </p>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <p className="text-sm font-bold text-slate-800">写真を選択</p>
            <p className="text-xs leading-relaxed text-slate-500">
              最大{MAX_BATCH_PHOTOS}枚。選択時点ではアップロードしません。
              位置情報は端末内で候補提案にのみ使い、保存しません。
            </p>
          </div>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={preparing || saving}
            className="shrink-0 rounded-lg bg-brand px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-brand-dark disabled:opacity-50"
          >
            {preparing ? "読み取り中..." : "写真を選ぶ"}
          </button>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          disabled={preparing || saving}
          onChange={handleFileChange}
        />
        {notice && (
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
            {notice}
          </p>
        )}
        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
            {error}
          </p>
        )}
        {photoCount > 0 && (
          <p className="text-xs text-slate-500">
            {photoCount}枚から{drafts.length}件の候補を作成しました。
          </p>
        )}
      </section>

      {drafts.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
          写真を選ぶと、ここに確認用のドラフトが表示されます。
        </div>
      ) : (
        <div className="space-y-4">
          {drafts.map((draft, index) => {
            const attachLimit = getAttachLimit(draft);
            const isMerge = Boolean(draft.existingMatch) && !draft.createSeparate;
            const isFullMerge = isMerge && attachLimit === 0;
            return (
            <article
              key={draft.id}
              className="rounded-xl border border-slate-200 bg-white p-4 space-y-4"
            >
              <div className="flex items-start justify-between gap-3">
                <label className="flex min-w-0 items-center gap-2">
                  <input
                    type="checkbox"
                    checked={draft.save}
                    disabled={isFullMerge}
                    onChange={() =>
                      setDrafts((current) =>
                        withUpdatedDraft(current, draft.id, (item) => ({
                          ...item,
                          save: !item.save,
                        })),
                      )
                    }
                    className="h-4 w-4 accent-brand"
                  />
                  <span className="font-bold text-slate-900">
                    候補 {index + 1}
                  </span>
                  {isMerge && (
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-700">
                      写真追加
                    </span>
                  )}
                  {draft.createSeparate && (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-700">
                      新規下書き
                    </span>
                  )}
                </label>
                <span className="shrink-0 text-xs text-slate-400">
                  写真 {draft.photos.length}枚
                </span>
              </div>

              {draft.existingMatch && (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs leading-relaxed text-emerald-800">
                  <p className="font-bold">
                    この日の記録はすでにあります。写真だけ追加できます。
                  </p>
                  <p className="mt-1">
                    既存写真 {draft.existingMatch.photoCount}枚 / 追加可能{" "}
                    {Math.max(0, MAX_PHOTOS_PER_VISIT - draft.existingMatch.photoCount)}
                    枚。公開状態は既存記録のままです。
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Link
                      href={`/mypage/visits/${draft.existingMatch.id}`}
                      className="font-bold text-emerald-700 underline underline-offset-2"
                    >
                      既存記録を開く
                    </Link>
                    <button
                      type="button"
                      onClick={() => setCreateSeparate(draft.id, !draft.createSeparate)}
                      className="font-bold text-emerald-700 underline underline-offset-2"
                    >
                      {draft.createSeparate
                        ? "既存記録に写真追加へ戻す"
                        : "別の記録として作成"}
                    </button>
                  </div>
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-[180px_1fr]">
                <section className="space-y-2">
                  <label className="block text-xs font-bold text-slate-600">
                    訪問日
                  </label>
                  <input
                    type="date"
                    value={draft.visitedOn}
                    onChange={(event) =>
                      setDrafts((current) =>
                        withUpdatedDraft(current, draft.id, (item) => ({
                          ...item,
                          visitedOn: event.target.value,
                        })),
                      )
                    }
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-brand"
                  />
                  <p className="text-[11px] text-slate-400">
                    {draft.detectedDate
                      ? `EXIF撮影日: ${draft.detectedDate}`
                      : "撮影日なし: 今日を仮入力"}
                  </p>
                </section>

                <section className="space-y-2">
                  <p className="text-xs font-bold text-slate-600">施設</p>
                  {draft.candidates.length > 0 ? (
                    <div className="space-y-2">
                      {draft.candidates.map((candidate) => (
                        <label
                          key={candidate.slug}
                          className="flex items-start gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm"
                        >
                          <input
                            type="radio"
                            name={`facility-${draft.id}`}
                            checked={draft.facilitySlug === candidate.slug}
                            onChange={() => selectFacility(draft.id, candidate)}
                            className="mt-0.5 h-4 w-4 accent-brand"
                          />
                          <span className="min-w-0">
                            <span className="block font-semibold text-slate-800">
                              {candidate.name}
                            </span>
                            <span className="block text-xs text-slate-400">
                              {candidate.prefecture} / {candidate.category} /{" "}
                              {formatDistance(candidate.distanceKm)}
                            </span>
                          </span>
                        </label>
                      ))}
                    </div>
                  ) : (
                    <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
                      位置情報なし、または近い施設を特定できませんでした。施設名で検索してください。
                    </p>
                  )}

                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={draft.searchQuery}
                      onChange={(event) =>
                        setDrafts((current) =>
                          withUpdatedDraft(current, draft.id, (item) => ({
                            ...item,
                            searchQuery: event.target.value,
                          })),
                        )
                      }
                      placeholder="施設名を検索"
                      className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-brand"
                    />
                    <button
                      type="button"
                      onClick={() => searchFacility(draft)}
                      disabled={searchingDraftId === draft.id}
                      className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-50"
                    >
                      {searchingDraftId === draft.id ? "検索中" : "検索"}
                    </button>
                  </div>

                  {(searchResults[draft.id] ?? []).length > 0 && (
                    <div className="rounded-lg border border-slate-200 bg-white py-1">
                      {(searchResults[draft.id] ?? []).map((result) => (
                        <button
                          key={result.slug}
                          type="button"
                          onClick={() => selectFacility(draft.id, result)}
                          className="block w-full px-3 py-2 text-left transition-colors hover:bg-slate-50"
                        >
                          <span className="block text-sm font-medium text-slate-800">
                            {result.name}
                          </span>
                          <span className="block text-xs text-slate-400">
                            {result.prefecture} / {result.category}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}

                  {draft.facilityName && (
                    <p className="text-xs font-medium text-emerald-700">
                      選択中: {draft.facilityName}
                    </p>
                  )}
                </section>
              </div>

              <section className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-bold text-slate-600">添付写真</p>
                  <p className="text-[11px] text-slate-400">
                    {draft.selectedPhotoIds.length}/{attachLimit}枚
                  </p>
                </div>
                {draft.photos.length > attachLimit && attachLimit > 0 && (
                  <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
                    添付は{attachLimit}枚までです。残り
                    {draft.photos.length - attachLimit}
                    枚は記録に添付されません。
                  </p>
                )}
                {isFullMerge && (
                  <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
                    既存記録の写真が上限に達しているため、この候補では追加できません。
                  </p>
                )}
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {draft.photos.map((photo) => {
                    const selected = draft.selectedPhotoIds.includes(photo.localId);
                    const cannotAdd =
                      !selected &&
                      draft.selectedPhotoIds.length >= attachLimit;
                    return (
                      <label
                        key={photo.localId}
                        className={`overflow-hidden rounded-lg border bg-white ${
                          selected ? "border-brand" : "border-slate-200"
                        } ${cannotAdd ? "opacity-60" : ""}`}
                      >
                        <div className="relative aspect-square bg-slate-100">
                          <Image
                            src={photo.previewUrl}
                            alt="添付候補の写真"
                            fill
                            sizes="180px"
                            className="object-cover"
                            unoptimized
                          />
                        </div>
                        <div className="flex items-start gap-2 px-2 py-1.5">
                          <input
                            type="checkbox"
                            checked={selected}
                            disabled={cannotAdd}
                            onChange={() => togglePhoto(draft.id, photo.localId)}
                            className="mt-0.5 h-4 w-4 accent-brand"
                          />
                          <span className="min-w-0 text-[11px] leading-relaxed text-slate-500">
                            {photo.takenOn ?? "撮影日なし"}
                            <br />
                            {photo.hasGps ? "位置情報あり" : "位置情報なし"}
                          </span>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </section>
            </article>
            );
          })}

          <div className="sticky bottom-3 rounded-xl border border-slate-200 bg-white/95 p-3 shadow-sm backdrop-blur">
            <button
              type="button"
              onClick={saveDrafts}
              disabled={!canSave}
              className="w-full rounded-xl bg-brand py-3 text-sm font-bold text-white transition-colors hover:bg-brand-dark disabled:opacity-40 disabled:hover:bg-brand"
            >
              {saving
                ? "保存中..."
                : `チェックした${selectedDrafts.length}件を一括作成`}
            </button>
            <p className="mt-2 text-center text-[11px] text-slate-400">
              保存時に写真を再エンコードし、位置情報などのメタデータを削除します。
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
