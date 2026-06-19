import type { Facility, FacilityTag } from "@/types/facility";

interface TagMeta {
  slug: string;
  tag: FacilityTag;
  match?: (f: Facility) => boolean;
  emoji: string;
  title: string;
  lead: string;
  long: string;
}

export const TAG_META: TagMeta[] = [
  {
    slug: "rainy-day",
    tag: "雨の日OK",
    match: (f) => f.rain_friendly === "◎",
    emoji: "☂️",
    title: "雨の日でも遊べるスポット",
    lead: "急な雨でもがっかりしない。屋根のある屋内施設や雨でも快適に過ごせる遊び場をピックアップ。",
    long: "予定の日にあいにくの雨…そんな時こそ屋内遊び場・水族館・科学館・博物館の出番。子供は退屈知らず、親もゆったり。雨でも快適(◎)な全施設を県別にチェックできます。",
  },
  {
    slug: "indoor-rainy",
    tag: "雨でも遊べる",
    emoji: "🏠",
    title: "雨でも遊べる施設",
    lead: "屋内・半屋内など、天候を気にせず楽しめる施設を集めました。",
    long: "梅雨の時期や夏の夕立、冬の寒い日など、屋外が厳しい日に頼れる施設の一覧。",
  },
  {
    slug: "free",
    tag: "無料",
    emoji: "🆓",
    title: "無料で遊べるスポット",
    lead: "入場料0円で1日中楽しめる、家族のお財布にやさしい遊び場。",
    long: "公園・遊具広場・公共施設など、入場料・利用料が無料で気軽に立ち寄れる場所をまとめました。アスレチック付きの大型公園や動物とふれあえるスポットも。",
  },
  {
    slug: "all-indoor",
    tag: "完全屋内",
    emoji: "🏢",
    title: "完全屋内の遊び場",
    lead: "天候・気温に左右されず安定して楽しめる、完全屋内のスポット。",
    long: "ショッピングモール内のキッズスペースやインドアパーク、屋内アクティビティ施設など、空調完備で過ごしやすい場所。",
  },
  {
    slug: "outdoor",
    tag: "屋外",
    emoji: "🌳",
    title: "屋外で思いっきり遊べる",
    lead: "自然の中で体を動かす、開放感たっぷりの屋外スポット。",
    long: "公園・アスレチック・動物園・テーマパーク・スキー場など、外でしかできない体験を子供と。",
  },
  {
    slug: "indoor-outdoor",
    tag: "屋内外両方",
    emoji: "🌗",
    title: "屋内外どちらも楽しめる施設",
    lead: "雨でも晴れでも、状況に応じて遊び方を変えられる柔軟な施設。",
    long: "屋根付きエリアと屋外エリアが両立する施設なら、当日の天気に合わせて遊び方を調整できます。",
  },
  {
    slug: "kids-0-3",
    tag: "0-3歳OK",
    emoji: "👶",
    title: "0-3歳の子と楽しめる",
    lead: "ベビー連れでも安心して過ごせる、未就学児向けの施設。",
    long: "ベビーカー対応・授乳室完備・小さな子向けエリアありなど、0-3歳ファミリーにやさしい施設をピックアップ。",
  },
  {
    slug: "elementary",
    tag: "小学生向け",
    emoji: "🧒",
    title: "小学生と楽しめるスポット",
    lead: "本格的なアトラクション・自然体験・知育系まで、小学生の知的好奇心を満たす施設。",
    long: "アスレチック・科学館・体験工房・スポーツ施設など、小学生がアクティブに楽しめる場所。",
  },
  {
    slug: "winter",
    tag: "冬季限定",
    emoji: "⛄",
    title: "冬季限定の遊び場",
    lead: "雪と氷の季節だけ楽しめる、特別なスポット。",
    long: "スキー場・スノーパーク・かまくら体験など、冬にしかできない雪遊びの施設をまとめました。",
  },
  {
    slug: "seasonal",
    tag: "季節限定",
    emoji: "🌸",
    title: "季節限定で楽しめる施設",
    lead: "春の花、夏の水遊び、秋の収穫、冬の雪…季節ごとの楽しみがある施設。",
    long: "果物狩り・水遊び場・季節のイベントなど、訪れる時期で表情が変わるスポット。",
  },
];

const SLUG_INDEX = new Map(TAG_META.map((t) => [t.slug, t]));
const TAG_INDEX = new Map(TAG_META.map((t) => [t.tag, t]));

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
  return facilities.filter((f) => f.tags.includes(meta.tag));
}

export function tagHref(tag: FacilityTag): string | null {
  const m = TAG_INDEX.get(tag);
  return m ? `/tag/${m.slug}` : null;
}
