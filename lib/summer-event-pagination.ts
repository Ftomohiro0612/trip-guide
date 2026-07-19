const SUMMER_EVENT_ANCHOR_PREFIX = "summer-event-";

interface SummerEventAnchorItem {
  event: {
    id: string;
    event_type?: string;
  };
}

export function getSummerEventIdFromHash(hash: string): string | null {
  const rawAnchor = hash.startsWith("#") ? hash.slice(1) : hash;
  let anchor: string;

  try {
    anchor = decodeURIComponent(rawAnchor);
  } catch {
    return null;
  }

  if (!anchor.startsWith(SUMMER_EVENT_ANCHOR_PREFIX)) return null;
  const eventId = anchor.slice(SUMMER_EVENT_ANCHOR_PREFIX.length);
  return eventId.length > 0 ? eventId : null;
}

export function getSummerEventPageForHash<T extends SummerEventAnchorItem>(
  items: readonly T[],
  hash: string,
  pageSize: number,
): number | null {
  const eventId = getSummerEventIdFromHash(hash);
  if (!eventId) return null;

  const index = items.findIndex((item) => item.event.id === eventId);
  return getPageForIndex(index, pageSize);
}

export function getSummerEventTypePage<T extends SummerEventAnchorItem>(
  items: readonly T[],
  eventType: string,
  pageSize: number,
): number | null {
  const index = items.findIndex(
    (item) => item.event.event_type === eventType,
  );
  return getPageForIndex(index, pageSize);
}

function getPageForIndex(index: number, pageSize: number): number | null {
  if (index < 0) return null;
  const safePageSize =
    Number.isFinite(pageSize) && pageSize > 0 ? Math.floor(pageSize) : 1;
  return Math.floor(index / safePageSize) + 1;
}
