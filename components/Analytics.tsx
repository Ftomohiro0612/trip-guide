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
          function memoripAnalyticsUrl(value) {
            if (!value) return '';
            try {
              var url = new URL(value, window.location.origin);
              var uuid = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/ig;
              url.pathname = url.pathname.replace(uuid, ':id');
              url.search = url.search.replace(uuid, ':id');
              url.hash = url.hash.replace(uuid, ':id');
              return url.toString();
            } catch (_) {
              return '';
            }
          }
          gtag('js', new Date());
          gtag('config', '${gaId}', {
            anonymize_ip: true,
            page_location: memoripAnalyticsUrl(window.location.href),
            page_referrer: memoripAnalyticsUrl(document.referrer)
          });
        `}
      </Script>
    </>
  );
}
