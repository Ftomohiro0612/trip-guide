import type { Metadata } from "next";
import { FEATURED_FACILITY_IDS } from "@/lib/config";
import { visibleFacilities } from "@/lib/facilities";
import { getGuestInterestTags } from "@/lib/guest-record";
import { getGuestRecordRecommendationCandidates } from "@/lib/guest-record-recommendations";
import TryGuestRecord from "./TryGuestRecord";

export const metadata: Metadata = {
  title: "メモリップをお試し体験 | 思い出カードを作ってみる",
  description:
    "登録なしで、家族のおでかけと子どもの反応を記録。写真は任意。記録から次に合いそうな施設を見つけ、入力を登録後へ引き継げます。",
};

export default function TryMemoripPage() {
  const places = FEATURED_FACILITY_IDS.flatMap((id) => {
    const facility = visibleFacilities.find((item) => item.id === id);
    if (!facility) return [];
    const interestTags = getGuestInterestTags(facility.recommended_for_tags);
    const recommendationCandidates = getGuestRecordRecommendationCandidates(facility);
    if (interestTags.length === 0 || recommendationCandidates.length === 0) return [];
    return [{
      slug: facility.slug,
      name: facility.name,
      prefecture: facility.prefecture,
      interestTags,
      recommendationCandidates,
    }];
  });

  return <TryGuestRecord places={places} />;
}
