"use client";

import { useMemo } from "react";
import { unpackEventViews, type EventViewsInput } from "@/lib/event-view-payload";

export function useEventViews(input: EventViewsInput) {
  return useMemo(() => unpackEventViews(input), [input]);
}
