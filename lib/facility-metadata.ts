const VALID_RAIN_VALUES = new Set(["◎", "△", "×"]);

export function getFacilityTargetAgeForMetadata(
  value: unknown,
): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized && normalized.toLowerCase() !== "unknown"
    ? normalized
    : null;
}

export function getFacilityRainForMetadata(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return VALID_RAIN_VALUES.has(normalized) ? normalized : null;
}

export function buildFacilityMetadataDescription({
  description,
  targetAge,
  rainFriendly,
}: {
  description: string;
  targetAge: unknown;
  rainFriendly: unknown;
}): string {
  const segments = [description.trim()];
  const knownTargetAge = getFacilityTargetAgeForMetadata(targetAge);
  const knownRain = getFacilityRainForMetadata(rainFriendly);

  if (knownTargetAge) segments.push(`対象年齢: ${knownTargetAge}`);
  if (knownRain) segments.push(`雨対応: ${knownRain}`);

  return segments.filter(Boolean).join(" / ");
}
