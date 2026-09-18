import type { PrefectureId } from "@/types/facility";

interface RegionPrefecture {
  id: PrefectureId;
  name: string;
}

export const REGIONS = [
  {
    id: "hokkaido_tohoku",
    name: "北海道・東北",
    prefectures: [
      { id: "hokkaido", name: "北海道" },
      { id: "aomori", name: "青森県" },
      { id: "iwate", name: "岩手県" },
      { id: "miyagi", name: "宮城県" },
      { id: "akita", name: "秋田県" },
      { id: "yamagata", name: "山形県" },
      { id: "fukushima", name: "福島県" },
    ],
  },
  {
    id: "kanto",
    name: "関東",
    prefectures: [
      { id: "tokyo", name: "東京都" },
      { id: "kanagawa", name: "神奈川県" },
      { id: "chiba", name: "千葉県" },
      { id: "saitama", name: "埼玉県" },
      { id: "ibaraki", name: "茨城県" },
      { id: "tochigi", name: "栃木県" },
      { id: "gunma", name: "群馬県" },
    ],
  },
  {
    id: "koshinetsu_hokuriku",
    name: "甲信越・北陸",
    prefectures: [
      { id: "yamanashi", name: "山梨県" },
      { id: "nagano", name: "長野県" },
      { id: "niigata", name: "新潟県" },
      { id: "toyama", name: "富山県" },
      { id: "ishikawa", name: "石川県" },
      { id: "fukui", name: "福井県" },
    ],
  },
  {
    id: "tokai",
    name: "東海",
    prefectures: [
      { id: "shizuoka", name: "静岡県" },
      { id: "aichi", name: "愛知県" },
      { id: "gifu", name: "岐阜県" },
      { id: "mie", name: "三重県" },
    ],
  },
  {
    id: "kansai",
    name: "関西",
    prefectures: [
      { id: "osaka", name: "大阪府" },
      { id: "hyogo", name: "兵庫県" },
      { id: "kyoto", name: "京都府" },
      { id: "shiga", name: "滋賀県" },
      { id: "nara", name: "奈良県" },
      { id: "wakayama", name: "和歌山県" },
    ],
  },
  {
    id: "chugoku_shikoku",
    name: "中国・四国",
    prefectures: [
      { id: "okayama", name: "岡山県" },
      { id: "hiroshima", name: "広島県" },
      { id: "yamaguchi", name: "山口県" },
      { id: "tottori", name: "鳥取県" },
      { id: "shimane", name: "島根県" },
      { id: "kagawa", name: "香川県" },
      { id: "tokushima", name: "徳島県" },
      { id: "ehime", name: "愛媛県" },
      { id: "kochi", name: "高知県" },
    ],
  },
  {
    id: "kyushu_okinawa",
    name: "九州・沖縄",
    prefectures: [
      { id: "fukuoka", name: "福岡県" },
      { id: "saga", name: "佐賀県" },
      { id: "nagasaki", name: "長崎県" },
      { id: "kumamoto", name: "熊本県" },
      { id: "oita", name: "大分県" },
      { id: "miyazaki", name: "宮崎県" },
      { id: "kagoshima", name: "鹿児島県" },
      { id: "okinawa", name: "沖縄県" },
    ],
  },
] as const satisfies readonly {
  id: string;
  name: string;
  prefectures: readonly RegionPrefecture[];
}[];

export type RegionId = (typeof REGIONS)[number]["id"];
export type RegionDefinition = (typeof REGIONS)[number];

const regionById = new Map<RegionId, RegionDefinition>(
  REGIONS.map((region) => [region.id, region]),
);
const regionIdByPrefectureId = new Map<PrefectureId, RegionId>();
const regionIdByPrefectureName = new Map<string, RegionId>();

for (const region of REGIONS) {
  for (const prefecture of region.prefectures) {
    regionIdByPrefectureId.set(prefecture.id, region.id);
    regionIdByPrefectureName.set(prefecture.name, region.id);
  }
}

const prefectureEntryCount = REGIONS.reduce(
  (total, region) => total + region.prefectures.length,
  0,
);

if (
  prefectureEntryCount !== 47 ||
  regionIdByPrefectureId.size !== 47 ||
  regionIdByPrefectureName.size !== 47
) {
  throw new Error("地域区分は47都道府県を重複なく含む必要があります。");
}

export function isRegionId(value: string): value is RegionId {
  return regionById.has(value as RegionId);
}

export function getRegion(regionId: RegionId): RegionDefinition {
  const region = regionById.get(regionId);
  if (!region) throw new Error(`Unknown region: ${regionId}`);
  return region;
}

export function getRegionIdByPrefectureId(
  prefectureId: PrefectureId,
): RegionId {
  const regionId = regionIdByPrefectureId.get(prefectureId);
  if (!regionId) throw new Error(`Unknown prefecture id: ${prefectureId}`);
  return regionId;
}

export function getRegionIdByPrefectureName(
  prefectureName: string,
): RegionId | undefined {
  return regionIdByPrefectureName.get(prefectureName);
}
