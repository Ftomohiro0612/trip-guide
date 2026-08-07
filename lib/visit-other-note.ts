export function encodeInterestOtherNote(
  value: string,
  selected: boolean,
): string | null {
  if (!selected) return null;
  return value.trim();
}

export function isInterestOtherSelected(
  value: string | null | undefined,
): boolean {
  return value !== null && value !== undefined;
}
