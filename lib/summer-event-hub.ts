export type SummerHeroEventType = "fireworks" | "summer_festival";

export interface SummerHeroSelectable {
  id: string;
  event_type?: string;
  start_date: string | null;
  end_date: string | null;
  occurrence_dates?: string[];
  display_priority: number;
}

export interface SummerStructuredDataEvent {
  id: string;
  title: string;
  start_date: string | null;
  end_date: string | null;
  occurrence_dates?: string[];
  official_url: string;
  venue_name: string;
  prefecture_label: string;
}

export function getSummerEventAnchorId(eventId: string): string {
  return `summer-event-${eventId}`;
}

export function selectSummerHeroEventsByType<
  T extends SummerHeroSelectable,
>(
  events: readonly T[],
  heroEventIds: readonly string[],
  eventType: SummerHeroEventType,
  today: string,
  limit = 4,
): T[] {
  const available = events
    .filter(
      (event) =>
        event.event_type === eventType &&
        getNextSelectionDate(event, today) !== null,
    )
    .sort((a, b) => compareByNextDate(a, b, today));
  const heroIds = new Set(heroEventIds);
  const preferred = available.filter((event) => heroIds.has(event.id));
  const fallback = available.filter((event) => !heroIds.has(event.id));

  return [...preferred, ...fallback].slice(0, Math.max(0, limit));
}

export function buildSummerEventListJsonLd(
  events: readonly SummerStructuredDataEvent[],
) {
  const eventItems = events.flatMap((event) => {
    const occurrences =
      event.occurrence_dates && event.occurrence_dates.length > 0
        ? event.occurrence_dates.map((date) => ({
            startDate: date,
            endDate: date,
            occurrenceDate: date,
          }))
        : [
            {
              startDate: event.start_date,
              endDate: event.end_date,
              occurrenceDate: null,
            },
          ];

    return occurrences.map(({ startDate, endDate, occurrenceDate }) => ({
      event,
      startDate,
      endDate,
      occurrenceDate,
    }));
  });

  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "東京・神奈川・千葉・埼玉・山梨・静岡・長野の夏祭り・花火大会2026",
    numberOfItems: eventItems.length,
    itemListElement: eventItems.map(
      ({ event, startDate, endDate, occurrenceDate }, index) => ({
        "@type": "ListItem",
        position: index + 1,
        item: {
          "@type": "Event",
          "@id": `${event.official_url}#event-${encodeURIComponent(event.id)}${occurrenceDate ? `-${occurrenceDate}` : ""}`,
          name: event.title,
          ...(startDate && { startDate }),
          ...(endDate && { endDate }),
          eventAttendanceMode:
            "https://schema.org/OfflineEventAttendanceMode",
          eventStatus: "https://schema.org/EventScheduled",
          location: {
            "@type": "Place",
            name: event.venue_name,
            address: event.prefecture_label,
          },
          url: event.official_url,
        },
      }),
    ),
  };
}

function compareByNextDate<T extends SummerHeroSelectable>(
  a: T,
  b: T,
  today: string,
): number {
  const nextA = getNextSelectionDate(a, today);
  const nextB = getNextSelectionDate(b, today);
  if (nextA === null && nextB === null) {
    return b.display_priority - a.display_priority || a.id.localeCompare(b.id);
  }
  if (nextA === null) return 1;
  if (nextB === null) return -1;
  return (
    nextA.localeCompare(nextB) ||
    b.display_priority - a.display_priority ||
    a.id.localeCompare(b.id)
  );
}

function getNextSelectionDate(
  event: SummerHeroSelectable,
  today: string,
): string | null {
  if (event.occurrence_dates && event.occurrence_dates.length > 0) {
    return event.occurrence_dates.find((date) => date >= today) ?? null;
  }
  if (event.start_date === null) return null;
  const endDate = event.end_date ?? event.start_date;
  if (endDate < today) return null;
  return event.start_date <= today ? today : event.start_date;
}
