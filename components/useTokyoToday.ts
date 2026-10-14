"use client";

import { useEffect, useState } from "react";
import { getTokyoDateString } from "@/lib/event-dates";

export function useTokyoToday(): string | null {
  const [today, setToday] = useState<string | null>(null);

  useEffect(() => {
    const updateToday = () => setToday(getTokyoDateString(new Date()));
    updateToday();

    const interval = window.setInterval(updateToday, 60_000);
    document.addEventListener("visibilitychange", updateToday);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", updateToday);
    };
  }, []);

  return today;
}
