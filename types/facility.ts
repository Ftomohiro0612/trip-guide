export type PrefectureId =
  | "shizuoka"
  | "nagano"
  | "yamanashi"
  | "tokyo"
  | "tochigi"
  | "saitama"
  | "niigata"
  | "chiba"
  | "kanagawa"
  | "ibaraki"
  | "gunma"
  | "osaka"
  | "hyogo"
  | "kyoto"
  | "aichi"
  | "fukuoka"
  | "hiroshima"
  | "miyagi"
  | "kagawa";

export type RainFriendly = "◎" | "△" | "×";

export type IndoorOutdoor = "屋内" | "屋外" | "両方";

export type FeeType = "無料" | "有料";

export type FacilityTag =
  | "雨の日OK"
  | "雨でも遊べる"
  | "無料"
  | "完全屋内"
  | "屋外"
  | "屋内外両方"
  | "0-3歳OK"
  | "小学生向け"
  | "冬季限定"
  | "季節限定";

export type RecommendedForTag =
  | "animal"
  | "animal_contact"
  | "animal_feed"
  | "water_play"
  | "pool"
  | "playground"
  | "athletic"
  | "slide"
  | "running"
  | "wide_space"
  | "vehicle"
  | "craft"
  | "experience"
  | "exhibition"
  | "science"
  | "space"
  | "dinosaur"
  | "character"
  | "nature"
  | "food";

export type DataQualityStatus =
  | "confirmed"
  | "likely_ok"
  | "needs_web_check"
  | "needs_human_review"
  | "exclude_candidate";

export interface Facility {
  id: number;
  slug: string;
  name: string;
  prefecture: string;
  prefecture_id: PrefectureId;
  category: string;
  category_id: string;
  address: string;
  indoor_outdoor: IndoorOutdoor;
  rain_friendly: RainFriendly;
  is_free: boolean;
  fee_type: FeeType;
  adult_fee: string;
  child_fee: string;
  description: string;
  target_age: string;
  url: string | null;
  tags: FacilityTag[];
  latitude?: number | null;
  longitude?: number | null;
  geocode_source?: "nominatim" | "fallback" | "manual" | "google";
  image?: string | null;
  image_attribution?: string | null;
  images?: string[] | null;
  image_attributions?: string[] | null;
  image_source?: "google-places" | "manual" | null;
  place_id?: string | null;
  signature_experiences?: string[] | null;
  unique_selling_point?: string | null;
  experience_tags?: string[] | null;
  summer_water_play?: RainFriendly | null;
  recommended_for_tags?: RecommendedForTag[];
  things_to_do?: string[];
  source_urls?: string;
  source_checked_at?: string;
  data_quality_status?: DataQualityStatus;
  source_notes?: string;
}

export interface PrefectureMeta {
  id: PrefectureId;
  name: string;
  count: number;
}

export interface CategoryMeta {
  id: string;
  name: string;
  count: number;
}

export interface FacilitiesMetadata {
  site_name: string;
  site_description: string;
  total_facilities: number;
  prefectures: PrefectureMeta[];
  categories: CategoryMeta[];
  filters: {
    rain_friendly: RainFriendly[];
    indoor_outdoor: IndoorOutdoor[];
    tags: FacilityTag[];
  };
}

export interface FacilitiesData {
  metadata: FacilitiesMetadata;
  facilities: Facility[];
}
