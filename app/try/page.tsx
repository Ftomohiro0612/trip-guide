import type { Metadata } from "next";
import type { MemoryStory } from "@/app/mypage/memories/MemoryStories";
import MemoryStoryReview from "@/app/memory-story-preview/MemoryStoryReview";

export const metadata: Metadata = {
  title: "メモリップをお試し体験 | 思い出カードを作ってみる",
  description:
    "登録なしで、家族のおでかけの思い出カード作りを30秒で体験できます。写真は保存されません。",
};

const sampleStories: MemoryStory[] = [
  {
    id: "try-midaiminami",
    facilityName: "御勅使南公園",
    visitedOn: "2026.5.30",
    photoUrls: [
      "/images/facilities/facility-195.jpg",
      "/images/categories/park.webp",
      "/images/categories/athletic.webp",
    ],
    note: "上の子も下の子も楽しめる遊具があった。遊具が多いのも印象的。",
    revisit: "また行きたい",
    childLines: ["彩瑛：大満足", "望結：大満足"],
    tags: ["遊具", "きょうだい時間"],
    detailHref: "/try",
    memoryLabel: "あれから57日",
  },
  {
    id: "try-soleil",
    facilityName: "長井海の手公園 ソレイユの丘",
    visitedOn: "2026.5.9",
    photoUrls: [
      "/images/facilities/facility-801.jpg",
      "/images/categories/zoo.webp",
    ],
    note: "動物にごはんをあげた瞬間、ふたりとも同じ顔で笑ってた。",
    revisit: "条件次第",
    childLines: ["彩瑛：大満足", "望結：大満足"],
    tags: ["エサやり", "遊具"],
    detailHref: "/try",
    memoryLabel: "ふと届いた思い出",
  },
  {
    id: "try-no-photo",
    facilityName: "京王あそびの森 HUG HUG",
    visitedOn: "2026.6.20",
    photoUrls: [],
    note: "写真がない日も、友だちと夢中で遊んだことは残しておきたい。",
    revisit: "また行きたい",
    childLines: ["彩瑛：大満足", "望結：大満足"],
    tags: ["アスレチック", "友だちと遊んだ"],
    detailHref: "/try",
    memoryLabel: null,
  },
];

export default function TryMemoripPage() {
  return (
    <MemoryStoryReview
      stories={sampleStories}
      signupCtaHref="/auth/register?redirectTo=%2Fmypage%2Fonboarding"
    />
  );
}
