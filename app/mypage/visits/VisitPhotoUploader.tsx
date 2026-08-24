"use client";

import Image from "next/image";
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { createClient } from "@/lib/supabase/client";

const BUCKET = "visit-photos";
export const MAX_PHOTOS_PER_VISIT = 2;
const MAIN_MAX_EDGE = 1600;
const THUMB_MAX_EDGE = 400;
const WEBP_QUALITY = 0.82;
const JPEG_QUALITY = 0.82;
const MAX_SOURCE_BYTES = 20 * 1024 * 1024;
const ACCEPTED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

type OutputFormat = {
  mimeType: "image/webp" | "image/jpeg";
  extension: "webp" | "jpg";
  quality: number;
};

const WEBP_FORMAT: OutputFormat = {
  mimeType: "image/webp",
  extension: "webp",
  quality: WEBP_QUALITY,
};

const JPEG_FORMAT: OutputFormat = {
  mimeType: "image/jpeg",
  extension: "jpg",
  quality: JPEG_QUALITY,
};

type SelectedPhoto = {
  localId: string;
  file: File;
  previewUrl: string;
  takenOn: string | null;
};

type ProcessedPhoto = {
  bodyBlob: Blob;
  thumbBlob: Blob;
  width: number;
  height: number;
  bytes: number;
  format: OutputFormat;
};

export type VisitPhotoUploadResult =
  | { ok: true; uploadedCount: number }
  | { ok: false; error: string };

export type VisitPhotoUploaderHandle = {
  upload: (visitId: string) => Promise<VisitPhotoUploadResult>;
  reset: () => void;
  getSelectedCount: () => number;
};

type VisitPhotoUploaderProps = {
  initialExistingCount: number;
  disabled?: boolean;
  onBusyChange?: (busy: boolean) => void;
};

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "写真の保存に失敗しました";
}

export function validatePhotoFile(file: File): string | null {
  const lowerName = file.name.toLowerCase();
  const isHeic =
    file.type === "image/heic" ||
    file.type === "image/heif" ||
    lowerName.endsWith(".heic") ||
    lowerName.endsWith(".heif");

  if (isHeic) {
    return "HEIC形式には対応していません。JPEG/PNGでお願いします。";
  }
  if (file.size > MAX_SOURCE_BYTES) {
    return "写真は20MB以下のファイルを選択してください。";
  }
  if (
    !ACCEPTED_TYPES.has(file.type) &&
    !/\.(jpe?g|png|webp)$/i.test(file.name)
  ) {
    return "JPEG、PNG、WebPの画像を選択してください。";
  }
  return null;
}

function readAscii(view: DataView, offset: number, length: number): string {
  if (offset < 0 || offset + length > view.byteLength) return "";
  let value = "";
  for (let index = 0; index < length; index += 1) {
    value += String.fromCharCode(view.getUint8(offset + index));
  }
  return value;
}

function normalizeExifDate(value: string | null): string | null {
  if (!value) return null;
  const match = value.match(/^(\d{4}):(\d{2}):(\d{2})[ T]/);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return `${match[1]}-${match[2]}-${match[3]}`;
}

function parseExifDateFromIfd(
  view: DataView,
  tiffStart: number,
  tiffEnd: number,
  ifdOffset: number,
  littleEndian: boolean,
  tags: number[],
): string | null {
  if (ifdOffset < tiffStart || ifdOffset + 2 > tiffEnd) return null;
  const entryCount = view.getUint16(ifdOffset, littleEndian);
  const entriesStart = ifdOffset + 2;
  const entriesEnd = entriesStart + entryCount * 12;
  if (entriesEnd > tiffEnd) return null;

  for (let index = 0; index < entryCount; index += 1) {
    const entryOffset = entriesStart + index * 12;
    const tag = view.getUint16(entryOffset, littleEndian);
    if (!tags.includes(tag)) continue;

    const type = view.getUint16(entryOffset + 2, littleEndian);
    const count = view.getUint32(entryOffset + 4, littleEndian);
    if (type !== 2 || count === 0) continue;

    const valueOffset =
      count <= 4
        ? entryOffset + 8
        : tiffStart + view.getUint32(entryOffset + 8, littleEndian);
    if (valueOffset < tiffStart || valueOffset + count > tiffEnd) continue;

    const date = normalizeExifDate(
      readAscii(view, valueOffset, count).replace(/\0+$/, ""),
    );
    if (date) return date;
  }

  return null;
}

function readIfdPointer(
  view: DataView,
  tiffStart: number,
  tiffEnd: number,
  ifdOffset: number,
  littleEndian: boolean,
  pointerTag: number,
): number | null {
  if (ifdOffset < tiffStart || ifdOffset + 2 > tiffEnd) return null;
  const entryCount = view.getUint16(ifdOffset, littleEndian);
  const entriesStart = ifdOffset + 2;
  const entriesEnd = entriesStart + entryCount * 12;
  if (entriesEnd > tiffEnd) return null;

  for (let index = 0; index < entryCount; index += 1) {
    const entryOffset = entriesStart + index * 12;
    const tag = view.getUint16(entryOffset, littleEndian);
    if (tag !== pointerTag) continue;

    const type = view.getUint16(entryOffset + 2, littleEndian);
    const count = view.getUint32(entryOffset + 4, littleEndian);
    if (count !== 1) return null;
    if (type === 4) {
      return tiffStart + view.getUint32(entryOffset + 8, littleEndian);
    }
    if (type === 3) {
      return tiffStart + view.getUint16(entryOffset + 8, littleEndian);
    }
  }

  return null;
}

export type GpsCoordinates = {
  latitude: number;
  longitude: number;
};

function readAsciiEntryValue(
  view: DataView,
  tiffStart: number,
  tiffEnd: number,
  entryOffset: number,
  count: number,
  littleEndian: boolean,
): string | null {
  const valueOffset =
    count <= 4
      ? entryOffset + 8
      : tiffStart + view.getUint32(entryOffset + 8, littleEndian);
  if (valueOffset < tiffStart || valueOffset + count > tiffEnd) return null;
  return readAscii(view, valueOffset, count).replace(/\0+$/, "");
}

function readRationalValue(
  view: DataView,
  offset: number,
  tiffEnd: number,
  littleEndian: boolean,
  signed: boolean,
): number | null {
  if (offset < 0 || offset + 8 > tiffEnd) return null;
  const numerator = signed
    ? view.getInt32(offset, littleEndian)
    : view.getUint32(offset, littleEndian);
  const denominator = signed
    ? view.getInt32(offset + 4, littleEndian)
    : view.getUint32(offset + 4, littleEndian);
  if (denominator === 0) return null;
  return numerator / denominator;
}

function readGpsDmsValue(
  view: DataView,
  tiffStart: number,
  tiffEnd: number,
  entryOffset: number,
  type: number,
  count: number,
  littleEndian: boolean,
): number | null {
  if (count !== 3 || (type !== 5 && type !== 10)) return null;
  const valueOffset = tiffStart + view.getUint32(entryOffset + 8, littleEndian);
  if (valueOffset < tiffStart || valueOffset + 24 > tiffEnd) return null;

  const signed = type === 10;
  const degrees = readRationalValue(
    view,
    valueOffset,
    tiffEnd,
    littleEndian,
    signed,
  );
  const minutes = readRationalValue(
    view,
    valueOffset + 8,
    tiffEnd,
    littleEndian,
    signed,
  );
  const seconds = readRationalValue(
    view,
    valueOffset + 16,
    tiffEnd,
    littleEndian,
    signed,
  );
  if (degrees === null || minutes === null || seconds === null) return null;
  return degrees + minutes / 60 + seconds / 3600;
}

function parseGpsFromIfd(
  view: DataView,
  tiffStart: number,
  tiffEnd: number,
  ifdOffset: number,
  littleEndian: boolean,
): GpsCoordinates | null {
  if (ifdOffset < tiffStart || ifdOffset + 2 > tiffEnd) return null;
  const entryCount = view.getUint16(ifdOffset, littleEndian);
  const entriesStart = ifdOffset + 2;
  const entriesEnd = entriesStart + entryCount * 12;
  if (entriesEnd > tiffEnd) return null;

  let latitudeRef: string | null = null;
  let longitudeRef: string | null = null;
  let latitude: number | null = null;
  let longitude: number | null = null;

  for (let index = 0; index < entryCount; index += 1) {
    const entryOffset = entriesStart + index * 12;
    const tag = view.getUint16(entryOffset, littleEndian);
    const type = view.getUint16(entryOffset + 2, littleEndian);
    const count = view.getUint32(entryOffset + 4, littleEndian);

    if (tag === 0x0001 && type === 2 && count > 0) {
      latitudeRef = readAsciiEntryValue(
        view,
        tiffStart,
        tiffEnd,
        entryOffset,
        count,
        littleEndian,
      );
      continue;
    }
    if (tag === 0x0003 && type === 2 && count > 0) {
      longitudeRef = readAsciiEntryValue(
        view,
        tiffStart,
        tiffEnd,
        entryOffset,
        count,
        littleEndian,
      );
      continue;
    }
    if (tag === 0x0002) {
      latitude = readGpsDmsValue(
        view,
        tiffStart,
        tiffEnd,
        entryOffset,
        type,
        count,
        littleEndian,
      );
      continue;
    }
    if (tag === 0x0004) {
      longitude = readGpsDmsValue(
        view,
        tiffStart,
        tiffEnd,
        entryOffset,
        type,
        count,
        littleEndian,
      );
    }
  }

  if (
    latitude === null ||
    longitude === null ||
    !latitudeRef ||
    !longitudeRef
  ) {
    return null;
  }

  const signedLatitude = latitudeRef.toUpperCase().startsWith("S")
    ? -latitude
    : latitude;
  const signedLongitude = longitudeRef.toUpperCase().startsWith("W")
    ? -longitude
    : longitude;

  if (
    signedLatitude < -90 ||
    signedLatitude > 90 ||
    signedLongitude < -180 ||
    signedLongitude > 180
  ) {
    return null;
  }

  return { latitude: signedLatitude, longitude: signedLongitude };
}

function parseTiffForTakenOn(
  view: DataView,
  tiffStart: number,
  tiffEnd: number,
): string | null {
  const endian = readAscii(view, tiffStart, 2);
  const littleEndian = endian === "II";
  if (!littleEndian && endian !== "MM") return null;
  if (view.getUint16(tiffStart + 2, littleEndian) !== 42) return null;

  const firstIfdOffset = tiffStart + view.getUint32(tiffStart + 4, littleEndian);
  const exifIfdOffset = readIfdPointer(
    view,
    tiffStart,
    tiffEnd,
    firstIfdOffset,
    littleEndian,
    0x8769,
  );

  if (exifIfdOffset) {
    const exifDate = parseExifDateFromIfd(
      view,
      tiffStart,
      tiffEnd,
      exifIfdOffset,
      littleEndian,
      [0x9003, 0x9004],
    );
    if (exifDate) return exifDate;
  }

  return parseExifDateFromIfd(
    view,
    tiffStart,
    tiffEnd,
    firstIfdOffset,
    littleEndian,
    [0x0132],
  );
}

function parseTiffForGps(
  view: DataView,
  tiffStart: number,
  tiffEnd: number,
): GpsCoordinates | null {
  const endian = readAscii(view, tiffStart, 2);
  const littleEndian = endian === "II";
  if (!littleEndian && endian !== "MM") return null;
  if (view.getUint16(tiffStart + 2, littleEndian) !== 42) return null;

  const firstIfdOffset = tiffStart + view.getUint32(tiffStart + 4, littleEndian);
  const gpsIfdOffset = readIfdPointer(
    view,
    tiffStart,
    tiffEnd,
    firstIfdOffset,
    littleEndian,
    0x8825,
  );
  if (!gpsIfdOffset) return null;
  return parseGpsFromIfd(view, tiffStart, tiffEnd, gpsIfdOffset, littleEndian);
}

function parseJpegTakenOn(buffer: ArrayBuffer): string | null {
  const view = new DataView(buffer);
  if (view.byteLength < 4 || view.getUint16(0, false) !== 0xffd8) return null;

  let offset = 2;
  while (offset + 4 <= view.byteLength) {
    if (view.getUint8(offset) !== 0xff) {
      offset += 1;
      continue;
    }

    let markerOffset = offset + 1;
    while (
      markerOffset < view.byteLength &&
      view.getUint8(markerOffset) === 0xff
    ) {
      markerOffset += 1;
    }
    if (markerOffset >= view.byteLength) return null;

    const marker = view.getUint8(markerOffset);
    offset = markerOffset + 1;
    if (marker === 0xda || marker === 0xd9) return null;
    if (marker >= 0xd0 && marker <= 0xd7) continue;
    if (offset + 2 > view.byteLength) return null;

    const segmentLength = view.getUint16(offset, false);
    const segmentStart = offset + 2;
    const segmentEnd = offset + segmentLength;
    if (segmentLength < 2 || segmentEnd > view.byteLength) return null;

    if (
      marker === 0xe1 &&
      segmentLength >= 8 &&
      readAscii(view, segmentStart, 6) === "Exif\0\0"
    ) {
      return parseTiffForTakenOn(view, segmentStart + 6, segmentEnd);
    }

    offset = segmentEnd;
  }

  return null;
}

function parseJpegGps(buffer: ArrayBuffer): GpsCoordinates | null {
  const view = new DataView(buffer);
  if (view.byteLength < 4 || view.getUint16(0, false) !== 0xffd8) return null;

  let offset = 2;
  while (offset + 4 <= view.byteLength) {
    if (view.getUint8(offset) !== 0xff) {
      offset += 1;
      continue;
    }

    let markerOffset = offset + 1;
    while (
      markerOffset < view.byteLength &&
      view.getUint8(markerOffset) === 0xff
    ) {
      markerOffset += 1;
    }
    if (markerOffset >= view.byteLength) return null;

    const marker = view.getUint8(markerOffset);
    offset = markerOffset + 1;
    if (marker === 0xda || marker === 0xd9) return null;
    if (marker >= 0xd0 && marker <= 0xd7) continue;
    if (offset + 2 > view.byteLength) return null;

    const segmentLength = view.getUint16(offset, false);
    const segmentStart = offset + 2;
    const segmentEnd = offset + segmentLength;
    if (segmentLength < 2 || segmentEnd > view.byteLength) return null;

    if (
      marker === 0xe1 &&
      segmentLength >= 8 &&
      readAscii(view, segmentStart, 6) === "Exif\0\0"
    ) {
      return parseTiffForGps(view, segmentStart + 6, segmentEnd);
    }

    offset = segmentEnd;
  }

  return null;
}

export async function readTakenOn(file: File): Promise<string | null> {
  if (
    file.type !== "image/jpeg" &&
    !/\.(jpe?g)$/i.test(file.name)
  ) {
    return null;
  }

  try {
    const header = await file.slice(0, 512 * 1024).arrayBuffer();
    return parseJpegTakenOn(header);
  } catch {
    return null;
  }
}

export async function readPhotoGps(file: File): Promise<GpsCoordinates | null> {
  if (
    file.type !== "image/jpeg" &&
    !/\.(jpe?g)$/i.test(file.name)
  ) {
    return null;
  }

  try {
    const header = await file.slice(0, 512 * 1024).arrayBuffer();
    return parseJpegGps(header);
  } catch {
    return null;
  }
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new window.Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("画像を読み込めませんでした。JPEG/PNGでお願いします。"));
    };
    image.src = url;
  });
}

function scaledSize(width: number, height: number, maxEdge: number) {
  const ratio = Math.min(1, maxEdge / Math.max(width, height));
  return {
    width: Math.max(1, Math.round(width * ratio)),
    height: Math.max(1, Math.round(height * ratio)),
  };
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number,
): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob(
      (blob) => {
        resolve(blob);
      },
      type,
      quality,
    );
  });
}

function renderCanvas(
  image: HTMLImageElement,
  maxEdge: number,
): { canvas: HTMLCanvasElement; width: number; height: number } {
  const sourceWidth = image.naturalWidth;
  const sourceHeight = image.naturalHeight;
  if (!sourceWidth || !sourceHeight) {
    throw new Error("画像サイズを読み取れませんでした。");
  }

  const size = scaledSize(sourceWidth, sourceHeight, maxEdge);
  const canvas = document.createElement("canvas");
  canvas.width = size.width;
  canvas.height = size.height;
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("画像を処理できませんでした。");
  }
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(image, 0, 0, size.width, size.height);

  return { canvas, width: size.width, height: size.height };
}

async function encodeCanvas(
  canvas: HTMLCanvasElement,
  format: OutputFormat,
): Promise<Blob | null> {
  const blob = await canvasToBlob(canvas, format.mimeType, format.quality);
  return blob?.type === format.mimeType ? blob : null;
}

async function processPhoto(file: File): Promise<ProcessedPhoto> {
  const image = await loadImage(file);
  const body = renderCanvas(image, MAIN_MAX_EDGE);
  const thumb = renderCanvas(image, THUMB_MAX_EDGE);

  try {
    let bodyBlob = await encodeCanvas(body.canvas, WEBP_FORMAT);
    let thumbBlob = await encodeCanvas(thumb.canvas, WEBP_FORMAT);
    let format = WEBP_FORMAT;

    if (!bodyBlob || !thumbBlob) {
      // Canvas re-encoding strips source EXIF/GPS metadata for JPEG fallback too.
      bodyBlob = await encodeCanvas(body.canvas, JPEG_FORMAT);
      thumbBlob = await encodeCanvas(thumb.canvas, JPEG_FORMAT);
      format = JPEG_FORMAT;
    }

    if (!bodyBlob || !thumbBlob) {
      throw new Error("画像を変換できませんでした。別の画像でお試しください。");
    }

    return {
      bodyBlob,
      thumbBlob,
      width: body.width,
      height: body.height,
      bytes: bodyBlob.size,
      format,
    };
  } finally {
    body.canvas.width = 0;
    body.canvas.height = 0;
    thumb.canvas.width = 0;
    thumb.canvas.height = 0;
  }
}

export async function uploadPhoto({
  file,
  takenOn,
  visitId,
  userId,
  sortOrder,
}: {
  file: File;
  takenOn: string | null;
  visitId: string;
  userId: string;
  sortOrder: number;
}) {
  const supabase = createClient();
  const processed = await processPhoto(file);
  const photoId = crypto.randomUUID();
  const storagePath = `${userId}/${visitId}/${photoId}.${processed.format.extension}`;
  const thumbPath = `${userId}/${visitId}/${photoId}_thumb.${processed.format.extension}`;
  const uploadedPaths: string[] = [];

  try {
    const { error: bodyUploadError } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, processed.bodyBlob, {
        contentType: processed.format.mimeType,
        upsert: false,
      });
    if (bodyUploadError) throw bodyUploadError;
    uploadedPaths.push(storagePath);

    const { error: thumbUploadError } = await supabase.storage
      .from(BUCKET)
      .upload(thumbPath, processed.thumbBlob, {
        contentType: processed.format.mimeType,
        upsert: false,
      });
    if (thumbUploadError) throw thumbUploadError;
    uploadedPaths.push(thumbPath);

    const { error: insertError } = await supabase.from("visit_photos").insert({
      visit_id: visitId,
      user_id: userId,
      storage_path: storagePath,
      thumb_path: thumbPath,
      width: processed.width,
      height: processed.height,
      bytes: processed.bytes,
      taken_on: takenOn,
      sort_order: sortOrder,
    });
    if (insertError) throw insertError;
  } catch (error) {
    if (uploadedPaths.length > 0) {
      const { error: rollbackError } = await supabase.storage
        .from(BUCKET)
        .remove(uploadedPaths);
      if (rollbackError) {
        throw new Error(
          `${toErrorMessage(error)} Storageロールバックにも失敗しました: ${rollbackError.message}`,
        );
      }
    }
    throw error;
  }
}

const VisitPhotoUploader = forwardRef<
  VisitPhotoUploaderHandle,
  VisitPhotoUploaderProps
>(function VisitPhotoUploader(
  { initialExistingCount, disabled = false, onBusyChange },
  ref,
) {
  const inputRef = useRef<HTMLInputElement>(null);
  const selectedRef = useRef<SelectedPhoto[]>([]);
  const [existingCount, setExistingCount] = useState(initialExistingCount);
  const [selectedPhotos, setSelectedPhotos] = useState<SelectedPhoto[]>([]);
  const [preparing, setPreparing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const remainingSlots = Math.max(
    0,
    MAX_PHOTOS_PER_VISIT - existingCount - selectedPhotos.length,
  );
  const busy = preparing || uploading;

  useEffect(() => {
    setExistingCount(initialExistingCount);
  }, [initialExistingCount]);

  useEffect(() => {
    selectedRef.current = selectedPhotos;
  }, [selectedPhotos]);

  useEffect(() => {
    onBusyChange?.(busy);
  }, [busy, onBusyChange]);

  useEffect(() => {
    return () => {
      selectedRef.current.forEach((photo) => URL.revokeObjectURL(photo.previewUrl));
    };
  }, []);

  function removeSelected(localId: string) {
    setSelectedPhotos((current) => {
      const target = current.find((photo) => photo.localId === localId);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return current.filter((photo) => photo.localId !== localId);
    });
    setError(null);
  }

  function clearSelected() {
    setSelectedPhotos((current) => {
      current.forEach((photo) => URL.revokeObjectURL(photo.previewUrl));
      return [];
    });
  }

  function removeUploadedSelections(localIds: string[]) {
    const uploaded = new Set(localIds);
    setSelectedPhotos((current) => {
      const remaining: SelectedPhoto[] = [];
      current.forEach((photo) => {
        if (uploaded.has(photo.localId)) {
          URL.revokeObjectURL(photo.previewUrl);
        } else {
          remaining.push(photo);
        }
      });
      return remaining;
    });
  }

  async function handleFileInputChange(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (files.length === 0 || preparing || uploading) return;

    const openSlots = Math.max(
      0,
      MAX_PHOTOS_PER_VISIT - existingCount - selectedPhotos.length,
    );
    if (openSlots <= 0) {
      setError("無料プランは1回のおでかけにつき2枚までです。");
      return;
    }

    setPreparing(true);
    setError(null);
    const accepted: SelectedPhoto[] = [];
    const errors: string[] = [];

    try {
      for (const file of files) {
        if (accepted.length >= openSlots) {
          errors.push("無料プランは1回のおでかけにつき2枚までです。");
          continue;
        }

        const validationError = validatePhotoFile(file);
        if (validationError) {
          errors.push(validationError);
          continue;
        }

        const takenOn = await readTakenOn(file);
        accepted.push({
          localId: crypto.randomUUID(),
          file,
          previewUrl: URL.createObjectURL(file),
          takenOn,
        });
      }

      if (accepted.length > 0) {
        setSelectedPhotos((current) => [...current, ...accepted]);
      }
      if (errors.length > 0) {
        setError(Array.from(new Set(errors))[0]);
      }
    } catch (caughtError) {
      accepted.forEach((photo) => URL.revokeObjectURL(photo.previewUrl));
      setError(toErrorMessage(caughtError));
    } finally {
      setPreparing(false);
    }
  }

  useImperativeHandle(
    ref,
    () => ({
      async upload(visitId: string) {
        if (!visitId) {
          return { ok: false, error: "訪問記録IDがありません。" };
        }
        if (preparing) {
          return {
            ok: false,
            error: "写真の準備が終わってから保存してください。",
          };
        }
        if (selectedPhotos.length === 0) {
          return { ok: true, uploadedCount: 0 };
        }
        if (selectedPhotos.length > MAX_PHOTOS_PER_VISIT - existingCount) {
          const message = "無料プランは1回のおでかけにつき2枚までです。";
          setError(message);
          return { ok: false, error: message };
        }

        setUploading(true);
        setError(null);
        const uploadedLocalIds: string[] = [];

        try {
          const supabase = createClient();
          const {
            data: { user },
            error: userError,
          } = await supabase.auth.getUser();

          if (userError || !user) {
            throw new Error("ログインが必要です。");
          }

          for (const [index, photo] of selectedPhotos.entries()) {
            await uploadPhoto({
              file: photo.file,
              takenOn: photo.takenOn,
              visitId,
              userId: user.id,
              sortOrder: existingCount + index,
            });
            uploadedLocalIds.push(photo.localId);
          }

          removeUploadedSelections(uploadedLocalIds);
          setExistingCount((current) => current + uploadedLocalIds.length);
          return { ok: true, uploadedCount: uploadedLocalIds.length };
        } catch (caughtError) {
          if (uploadedLocalIds.length > 0) {
            removeUploadedSelections(uploadedLocalIds);
            setExistingCount((current) => current + uploadedLocalIds.length);
          }
          const message = toErrorMessage(caughtError);
          setError(message);
          return { ok: false, error: message };
        } finally {
          setUploading(false);
        }
      },
      reset() {
        clearSelected();
        setError(null);
      },
      getSelectedCount() {
        return selectedRef.current.length;
      },
    }),
    [existingCount, preparing, selectedPhotos],
  );

  return (
    <section className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-bold text-slate-600">
            写真（あと{remainingSlots}枚）
          </p>
          <p className="mt-1 text-xs leading-relaxed text-slate-400">
            位置情報などのメタデータはアップロード前に削除されます。
          </p>
        </div>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={disabled || busy || remainingSlots <= 0}
          className="shrink-0 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-40"
        >
          {preparing ? "準備中..." : "写真を選択"}
        </button>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        disabled={disabled || busy || remainingSlots <= 0}
        onChange={handleFileInputChange}
        className="hidden"
      />

      {selectedPhotos.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          {selectedPhotos.map((photo) => (
            <div
              key={photo.localId}
              className="overflow-hidden rounded-lg border border-slate-200 bg-white"
            >
              <div className="relative aspect-square bg-slate-100">
                <Image
                  src={photo.previewUrl}
                  alt="アップロード予定の写真"
                  fill
                  sizes="160px"
                  className="object-cover"
                  unoptimized
                />
                <button
                  type="button"
                  onClick={() => removeSelected(photo.localId)}
                  disabled={disabled || busy}
                  aria-label="選択した写真を外す"
                  className="absolute right-1.5 top-1.5 h-7 w-7 rounded-full bg-white/90 text-sm font-bold text-slate-600 shadow-sm transition-colors hover:bg-white disabled:opacity-50"
                >
                  ×
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {remainingSlots <= 0 && (
        <p className="text-xs text-slate-500">
          無料プランは1回のおでかけにつき2枚までです。
        </p>
      )}

      {uploading && (
        <p className="text-xs font-medium text-slate-500">
          写真を変換して保存しています...
        </p>
      )}

      {error && <p className="text-xs text-red-600">{error}</p>}
    </section>
  );
});

export default VisitPhotoUploader;
