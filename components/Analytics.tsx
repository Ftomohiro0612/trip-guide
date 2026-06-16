import Script from "next/script";

export default function Analytics() {
  let gaId = process.env.NEXT_PUBLIC_GA_ID ?? "";
  if (gaId.charCodeAt(0) === 0xfeff) gaId = gaId.slice(1);
  gaId = gaId.trim();
  if (!gaId) return null;
  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
        strategy="afterInteractive"
      />
      <Script id="ga4-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${gaId}', { anonymize_ip: true });
        `}
      </Script>
    </>
  );
}
