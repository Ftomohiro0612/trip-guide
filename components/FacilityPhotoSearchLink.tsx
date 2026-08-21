import { buildFacilityPhotoSearchUrl } from "@/lib/facility-photo-search";

interface Props {
  facilityName: string;
  address: string;
  className?: string;
  compact?: boolean;
  purpose?: "confirm" | "more";
}

export default function FacilityPhotoSearchLink({
  facilityName,
  address,
  className = "",
  compact = false,
  purpose = "confirm",
}: Props) {
  const label =
    purpose === "more"
      ? "外部サイトでほかの写真を見る ↗"
      : compact
        ? "外部サイトで写真を確認 ↗"
        : "写真を外部サイトで確認 ↗";

  return (
    <a
      href={buildFacilityPhotoSearchUrl(facilityName, address)}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
      aria-label={
        purpose === "more"
          ? `${facilityName}のほかの写真を外部サイトで見る（新しいタブで開きます）`
          : `${facilityName}の写真を外部サイトで確認（新しいタブで開きます）`
      }
    >
      {label}
    </a>
  );
}
