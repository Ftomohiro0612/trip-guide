"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";

/** Keep URL-dependent behavior below Suspense; preserve the detail page's static HTML. */
export default function GuestRecordAutoOpen({ openGuestRecord }: { openGuestRecord: () => void }) {
  const params = useSearchParams();
  const requested = params.get("record") === "1";

  useEffect(() => {
    if (requested) openGuestRecord();
  }, [requested, openGuestRecord]);

  return null;
}
