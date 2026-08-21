import { buildFacilityPhotoSearchUrl } from "@/lib/facility-photo-search";

interface Props {
  facilityName: string;
  address: string;
  className?: string;
  compact?: boolean;
}

export default function FacilityPhotoSearchLink({
  facilityName,
  address,
  className = "",
  compact = false,
}: Props) {
  return (
    <a
      href={buildFacilityPhotoSearchUrl(facilityName, address)}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
      aria-label={`${facilityName}の写真を外部サイトで確認（新しいタブで開きます）`}
    >
      {compact ? "外部サイトで写真を確認 ↗" : "写真を外部サイトで確認 ↗"}
    </a>
  );
}
