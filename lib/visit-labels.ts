export const familyRevisitLabels: Record<string, string> = {
  yes: "また行きたい",
  conditional: "条件次第",
  once_enough: "一度で十分",
  no: "もう行かない",
};

export const fatigueLabels: Record<string, string> = {
  easy: "楽だった",
  normal: "普通",
  tired: "少し疲れた",
  exhausted: "かなり疲れた",
};

export const weatherLabels: Record<string, string> = {
  sunny: "晴れ",
  cloudy: "曇り",
  rainy: "雨",
  snowy: "雪",
  unknown: "覚えていない",
};

export const crowdingLabels: Record<string, string> = {
  empty: "空いていた",
  normal: "普通",
  busy: "混んでいた",
  very_busy: "かなり混んでいた",
  unknown: "覚えていない",
};

export const parkingLabels: Record<string, string> = {
  car_easy: "車：駐車場に余裕あり",
  car_normal: "車：駐車場ふつう",
  car_trouble: "車：駐車場で困った",
  train: "電車で行った",
  bus: "バスで行った",
  walk_bike: "徒歩・自転車で行った",
  easy: "駐車場に余裕",
  normal: "駐車場ふつう",
  difficult: "駐車場が混雑",
  full: "駐車場が満車",
  none: "駐車場なし",
  not_used: "駐車場は使っていない",
};

export const timeWasEnoughLabels: Record<string, string> = {
  enough: "十分だった",
  want_more: "足りなかった",
  too_long: "長かった",
};

export const foodLabels: Record<string, string> = {
  no_meal: "食事なし",
  ate_inside: "施設内で食べた",
  brought_food: "持参した",
  ate_outside: "外で食べた",
  had_trouble: "食事で困った",
  no_food: "食事なし",
  great: "食事に満足",
  ok: "食事は普通",
  poor: "食事に不満",
};

export const expectationLabels: Record<string, string> = {
  exceeded: "期待以上だった",
  met: "期待どおり",
  below: "期待以下",
};

export const satisfactionLabels: Record<string, string> = {
  loved: "大満足",
  enjoyed: "楽しんだ",
  neutral: "普通",
  not_fit: "合わなかった",
  could_not_join: "参加できず",
};

export function visitLabel(
  labels: Record<string, string>,
  value: string | null | undefined,
): string {
  if (!value) return "未記録";
  return labels[value] ?? "未記録";
}
