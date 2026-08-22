export type PostgrestErrorLike = {
  code?: string | null;
  message?: string | null;
};

const VISIT_COORDINATE_COLUMNS = ["place_latitude", "place_longitude"];

export function isMissingVisitCoordinateColumnError(
  error: PostgrestErrorLike | null | undefined,
): boolean {
  if (!error) return false;

  const message = error.message?.toLowerCase() ?? "";
  const mentionsCoordinateColumn = VISIT_COORDINATE_COLUMNS.some((column) =>
    message.includes(column),
  );
  if (!mentionsCoordinateColumn) return false;

  return (
    error.code === "PGRST204" ||
    error.code === "42703" ||
    message.includes("could not find") ||
    message.includes("does not exist")
  );
}
