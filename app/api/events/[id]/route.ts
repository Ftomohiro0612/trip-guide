import { NextResponse } from "next/server";
import {
  getBuildDateString,
  getEventById,
  getNextEventDate,
  toEventView,
} from "@/lib/events";
import type { EventVisitPrefill } from "@/lib/visit-event";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const event = getEventById(id);
  if (!event) {
    return NextResponse.json({ error: "event_not_found" }, { status: 404 });
  }

  const view = toEventView(event);
  if (!view.venueName) {
    return NextResponse.json({ error: "event_venue_not_found" }, { status: 422 });
  }

  const prefill: EventVisitPrefill = {
    id: event.id,
    title: event.title,
    dateLabel: event.date_label,
    timeLabel: event.time_label,
    visitedOn:
      getNextEventDate(event) ?? event.start_date ?? getBuildDateString(),
    venueName: view.venueName,
    prefectureLabel: view.prefectureLabel,
    facilitySlug: view.facilitySlug,
  };

  return NextResponse.json(prefill);
}
