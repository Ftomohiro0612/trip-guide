import type { Metadata } from "next";
import type { MemoryStory } from "@/app/mypage/memories/MemoryStories";
import MemoryStoryReview from "./MemoryStoryReview";

export const metadata: Metadata = {
  title: "家族の思い出ストーリー 体験確認",
  robots: {
    index: false,
    follow: false,
    googleBot: { index: false, follow: false },
  },
  openGraph: null,
  twitter: null,
};

const reviewStories: MemoryStory[] = [
  {
    id: "review-midaiminami",
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
    detailHref: "/memory-story-preview",
    memoryLabel: "あれから57日",
  },
  {
    id: "review-soleil",
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
    detailHref: "/memory-story-preview",
    memoryLabel: "ふと届いた思い出",
  },
  {
    id: "review-no-photo",
    facilityName: "京王あそびの森 HUG HUG",
    visitedOn: "2026.6.20",
    photoUrls: [],
    note: "写真がない日も、友だちと夢中で遊んだことは残しておきたい。",
    revisit: "また行きたい",
    childLines: ["彩瑛：大満足", "望結：大満足"],
    tags: ["アスレチック", "友だちと遊んだ"],
    detailHref: "/memory-story-preview",
    memoryLabel: null,
  },
];

export default function MemoryStoryPreviewPage() {
  return <MemoryStoryReview stories={reviewStories} />;
}
