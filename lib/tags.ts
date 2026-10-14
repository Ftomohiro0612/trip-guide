import type {
  Facility,
  FacilityTag,
  PrefectureId,
  RecommendedForTag,
} from "@/types/facility";

export interface TagMeta {
  slug: string;
  tag?: FacilityTag;
  recommendedTag?: RecommendedForTag;
  match?: (f: Facility) => boolean;
  emoji: string;
  title: string;
  lead: string;
  long: string;
  whyNow: string;
}

export const TAG_META: TagMeta[] = [
  {
    slug: "rainy-day",
    match: (f) => f.rain_friendly === "◎",
    emoji: "☂️",
    title: "雨の日でも遊べるスポット",
    lead: "急な雨でもがっかりしない。屋根のある屋内施設や雨でも快適に過ごせる遊び場をピックアップ。",
    long: "予定の日にあいにくの雨…そんな時こそ屋内遊び場・水族館・科学館・博物館の出番。子供は退屈知らず、親もゆったり。雨でも快適(◎)な全施設を県別にチェックできます。",
    whyNow: "天気予報が変わっても予定を立て直しやすい、雨でも快適◎の施設から選べます。",
  },
  {
    slug: "free",
    tag: "無料",
    match: (f) => f.is_free,
    emoji: "🆓",
    title: "無料で遊べるスポット",
    lead: "入場料0円で1日中楽しめる、家族のお財布にやさしい遊び場。",
    long: "公園・遊具広場・公共施設など、入場料・利用料が無料で気軽に立ち寄れる場所をまとめました。アスレチック付きの大型公園や動物とふれあえるスポットも。",
    whyNow: "入場・利用無料の施設なら、短時間のおでかけや予定変更にも組み込みやすくなります。",
  },
  {
    slug: "all-indoor",
    tag: "完全屋内",
    emoji: "🏢",
    title: "完全屋内の遊び場",
    lead: "天候・気温に左右されず安定して楽しめる、完全屋内のスポット。",
    long: "ショッピングモール内のキッズスペースやインドアパーク、屋内アクティビティ施設など、空調完備で過ごしやすい場所。",
    whyNow: "暑さ・寒さや雨を避けて、屋内で過ごせる候補を比べられます。",
  },
  {
    slug: "outdoor",
    tag: "屋外",
    emoji: "🌳",
    title: "屋外で思いっきり遊べる",
    lead: "自然の中で体を動かす、開放感たっぷりの屋外スポット。",
    long: "公園・アスレチック・動物園・テーマパーク・スキー場など、外でしかできない体験を子供と。",
    whyNow: "外で体を動かしたい日に、屋外の遊び方がある施設から選べます。",
  },
  {
    slug: "indoor-outdoor",
    tag: "屋内外両方",
    emoji: "🌗",
    title: "屋内外どちらも楽しめる施設",
    lead: "雨でも晴れでも、状況に応じて遊び方を変えられる柔軟な施設。",
    long: "屋根付きエリアと屋外エリアが両立する施設なら、当日の天気に合わせて遊び方を調整できます。",
    whyNow: "天気や気温に合わせて、屋内外の過ごし方を切り替えられる候補です。",
  },
  {
    slug: "kids-0-3",
    tag: "0-3歳OK",
    emoji: "👶",
    title: "0-3歳の子と楽しめる",
    lead: "ベビー連れでも安心して過ごせる、未就学児向けの施設。",
    long: "ベビーカー対応・授乳室完備・小さな子向けエリアありなど、0-3歳ファミリーにやさしい施設をピックアップ。",
    whyNow: "0〜3歳OKの既存表示がある施設から、雨・無料なども見ながら選べます。",
  },
  {
    slug: "elementary",
    tag: "小学生向け",
    emoji: "🧒",
    title: "小学生と楽しめるスポット",
    lead: "本格的なアトラクション・自然体験・知育系まで、小学生の知的好奇心を満たす施設。",
    long: "アスレチック・科学館・体験工房・スポーツ施設など、小学生がアクティブに楽しめる場所。",
    whyNow: "小学生向けの既存表示がある施設から、学び・運動・体験の行き先を決められます。",
  },
  {
    slug: "water-play",
    recommendedTag: "water_play",
    match: (f) =>
      f.recommended_for_tags?.includes("water_play") === true,
    emoji: "💦",
    title: "水遊びを楽しめるスポット",
    lead: "水遊びが好きな子と行きたい施設を、既存の遊び情報からまとめて比較。",
    long: "水遊びのおすすめ表示がある施設を掲載しています。利用時期は、施設詳細に期間の記載がある場合だけ確認できます。",
    whyNow: "水遊び◎の表示や、既存文に明記された利用時期を確認しながら候補を選べます。",
  },
  {
    slug: "playground",
    recommendedTag: "playground",
    match: (f) =>
      f.recommended_for_tags?.includes("playground") === true,
    emoji: "🛝",
    title: "大型遊具で遊べるスポット",
    lead: "すべり台や複合遊具など、体を動かして遊びたい日の候補を比較。",
    long: "大型遊具のおすすめ表示がある施設を掲載しています。無料や年齢なども合わせて確認できます。",
    whyNow: "大型遊具のおすすめ表示がある施設から、無料・年齢条件も見て行き先を決められます。",
  },
  {
    slug: "winter",
    tag: "冬季限定",
    emoji: "⛄",
    title: "冬季限定の遊び場",
    lead: "雪と氷の季節だけ楽しめる、特別なスポット。",
    long: "スキー場・スノーパーク・かまくら体験など、冬にしかできない雪遊びの施設をまとめました。",
    whyNow: "冬季限定の既存表示がある施設から、雪の季節の候補を比べられます。",
  },
  {
    slug: "seasonal",
    tag: "季節限定",
    emoji: "🌸",
    title: "季節限定で楽しめる施設",
    lead: "春の花、夏の水遊び、秋の収穫、冬の雪…季節ごとの楽しみがある施設。",
    long: "果物狩り・水遊び場・季節のイベントなど、訪れる時期で表情が変わるスポット。",
    whyNow: "施設の既存文に今月の時期が明記されている候補だけを、季節枠で案内します。",
  },
];

const SLUG_INDEX = new Map(TAG_META.map((t) => [t.slug, t]));
const TAG_INDEX = new Map(
  TAG_META.flatMap((meta) => (meta.tag ? [[meta.tag, meta] as const] : [])),
);

export function getTagMetaBySlug(slug: string): TagMeta | undefined {
  return SLUG_INDEX.get(slug);
}

export function getTagMetaByTag(tag: FacilityTag): TagMeta | undefined {
  return TAG_INDEX.get(tag);
}

export function getTagFacilities(
  meta: TagMeta,
  facilities: Facility[],
): Facility[] {
  if (meta.match) return facilities.filter(meta.match);
  if (!meta.tag) return [];
  const tag = meta.tag;
  return facilities.filter((f) => f.tags.includes(tag));
}

export function tagHref(tag: FacilityTag): string | null {
  const m = TAG_INDEX.get(tag);
  return m ? `/tag/${m.slug}` : null;
}

export function buildTagFacilityFilterHref(
  meta: TagMeta,
  prefectureId: PrefectureId,
): string {
  const params = new URLSearchParams({ prefecture: prefectureId });
  for (const [key, value] of Object.entries(getTagFacilityFilterParams(meta))) {
    params.set(key, value);
  }
  return `/facilities?${params.toString()}`;
}

export function getTagFacilityFilterParams(
  meta: TagMeta,
): Record<string, string> {
  if (meta.slug === "rainy-day") return { rain: "◎" };
  if (meta.slug === "free") return { fee: "free" };
  if (meta.recommendedTag) return { recommended_tag: meta.recommendedTag };
  if (meta.tag) return { tags: meta.tag };
  return {};
}
