"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";

const VALUECOMMERCE_PID_PATTERN = /^\d{9}$/;

export default function ValueCommerceLinkSwitch() {
  const shared = usePathname().startsWith("/soudan/");
  const pid = process.env.NEXT_PUBLIC_VALUECOMMERCE_PID?.trim() ?? "";

  if (shared || !VALUECOMMERCE_PID_PATTERN.test(pid)) return null;

  return (
    <>
      <Script id="valuecommerce-linkswitch-pid" strategy="afterInteractive">
        {`var vc_pid = ${JSON.stringify(pid)};`}
      </Script>
      <Script
        id="valuecommerce-linkswitch-runtime"
        src="https://aml.valuecommerce.com/vcdal.js"
        strategy="afterInteractive"
      />
    </>
  );
}
