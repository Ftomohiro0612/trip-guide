export type QuickReactions = Record<string, string[]>;

export function hasQuickReactions(value: QuickReactions): boolean {
  const selections = Object.values(value);
  return selections.length > 0 && selections.every((tags) =>
    tags.length >= 1 && tags.length <= 2 && new Set(tags).size === tags.length);
}
