import { Suspense } from "react";
import Script from "next/script";
import AnalyticsPageView from "@/components/AnalyticsPageView";

export default function Analytics() {
  let gaId = process.env.NEXT_PUBLIC_GA_ID ?? "";
  if (gaId.charCodeAt(0) === 0xfeff) gaId = gaId.slice(1);
  gaId = gaId.trim();
  if (!gaId) return null;
  const gaIdJson = JSON.stringify(gaId);

  return (
    <>
      <Script id="ga4-init" strategy="afterInteractive">
        {`
          (function() {
            var GA_ID = ${gaIdJson};
            var uuid = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/ig;
            var manualPageViewMarker = 'ep.memorip_manual_page_view=1';
            function decodeSafe(value) {
              try {
                return decodeURIComponent(String(value).replace(/\\+/g, ' '));
              } catch (_) {
                return String(value || '');
              }
            }
            function maskText(value) {
              return String(value || '').replace(uuid, ':id');
            }
            function memoripAnalyticsUrl(value) {
              if (!value) return '';
              try {
                var url = new URL(value, window.location.origin);
                url.pathname = maskText(url.pathname);
                url.search = maskText(url.search);
                url.hash = maskText(url.hash);
                return url.toString();
              } catch (_) {
                return '';
              }
            }
            function isGa4CollectUrl(value) {
              try {
                var url = new URL(value, window.location.origin);
                return /(^|\\.)google-analytics\\.com$/i.test(url.hostname) && url.pathname === '/g/collect';
              } catch (_) {
                return false;
              }
            }
            function sanitizedCollectUrl(value) {
              if (!isGa4CollectUrl(value)) return value;
              try {
                var url = new URL(value, window.location.origin);
                url.search = maskText(url.search);
                return url.toString();
              } catch (_) {
                return maskText(value);
              }
            }
            function hasOwn(value, key) {
              return Object.prototype.hasOwnProperty.call(value, key);
            }
            function sanitizedBody(body) {
              if (body == null) return { ok: true, body: body };
              if (typeof body === 'string') return { ok: true, body: maskText(body) };
              if (body instanceof URLSearchParams) {
                var params = new URLSearchParams();
                body.forEach(function(paramValue, key) {
                  params.append(maskText(key), maskText(paramValue));
                });
                return { ok: true, body: params };
              }
              return { ok: false, body: undefined };
            }
            function bodyTextForInspection(body) {
              if (typeof body === 'string') return body;
              if (body instanceof URLSearchParams) return body.toString();
              return '';
            }
            function collectPayloadText(urlValue, body) {
              var query = '';
              try {
                query = new URL(urlValue, window.location.origin).search.slice(1);
              } catch (_) {}
              return decodeSafe(query + '&' + bodyTextForInspection(body));
            }
            function isUnmarkedPageView(urlValue, body) {
              if (!isGa4CollectUrl(urlValue)) return false;
              var text = collectPayloadText(urlValue, body);
              return /(^|&)en=page_view(&|$)/.test(text) && text.indexOf(manualPageViewMarker) === -1;
            }
            function patchGa4Transport() {
              if (window.__memoripGa4TransportPatched) return;
              window.__memoripGa4TransportPatched = true;

              var originalSendBeacon = navigator.sendBeacon && navigator.sendBeacon.bind(navigator);
              if (originalSendBeacon) {
                navigator.sendBeacon = function(url, data) {
                  if (!isGa4CollectUrl(url)) return originalSendBeacon(url, data);
                  var sanitized = sanitizedBody(data);
                  if (!sanitized.ok) return true;
                  if (isUnmarkedPageView(url, data)) return true;
                  return originalSendBeacon(sanitizedCollectUrl(url), sanitized.body);
                };
              }

              var originalFetch = window.fetch && window.fetch.bind(window);
              if (originalFetch) {
                window.fetch = function(input, init) {
                  var isRequest = typeof Request !== 'undefined' && input instanceof Request;
                  var url = isRequest ? input.url : String(input);
                  if (isGa4CollectUrl(url)) {
                    var hasInitBody = !!(init && hasOwn(init, 'body'));
                    var body = hasInitBody ? init.body : undefined;
                    var sanitized = sanitizedBody(body);
                    if ((isRequest && input.body !== null) || !sanitized.ok || isUnmarkedPageView(url, body)) {
                      return Promise.resolve(new Response(null, { status: 204, statusText: 'No Content' }));
                    }
                    var nextInit = init ? Object.assign({}, init) : init;
                    if (hasInitBody) nextInit.body = sanitized.body;
                    if (isRequest) {
                      return originalFetch(new Request(sanitizedCollectUrl(input.url), input), nextInit);
                    }
                    return originalFetch(sanitizedCollectUrl(input), nextInit);
                  }
                  return originalFetch(input, init);
                };
              }

              var originalOpen = XMLHttpRequest.prototype.open;
              var originalSend = XMLHttpRequest.prototype.send;
              XMLHttpRequest.prototype.open = function(method, url) {
                this.__memoripGa4Url = url;
                arguments[1] = sanitizedCollectUrl(url);
                return originalOpen.apply(this, arguments);
              };
              XMLHttpRequest.prototype.send = function(body) {
                if (!isGa4CollectUrl(this.__memoripGa4Url)) return originalSend.call(this, body);
                var sanitized = sanitizedBody(body);
                if (!sanitized.ok) return;
                if (isUnmarkedPageView(this.__memoripGa4Url, body)) return;
                return originalSend.call(this, sanitized.body);
              };

              var imageSrc = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, 'src');
              if (imageSrc && imageSrc.set && imageSrc.get) {
                Object.defineProperty(HTMLImageElement.prototype, 'src', {
                  configurable: true,
                  enumerable: imageSrc.enumerable,
                  get: imageSrc.get,
                  set: function(value) {
                    if (isUnmarkedPageView(value, '')) {
                      return imageSrc.set.call(this, 'data:,');
                    }
                    return imageSrc.set.call(this, sanitizedCollectUrl(value));
                  }
                });
              }
            }

            window.memoripAnalyticsUrl = memoripAnalyticsUrl;
            patchGa4Transport();
            window.dataLayer = window.dataLayer || [];
            window.gtag = window.gtag || function(){window.dataLayer.push(arguments);}
            window.gtag('js', new Date());
            window.gtag('set', {
              page_location: memoripAnalyticsUrl(window.location.href),
              page_referrer: memoripAnalyticsUrl(document.referrer)
            });
            window.gtag('config', GA_ID, {
              anonymize_ip: true,
              send_page_view: false,
              page_location: memoripAnalyticsUrl(window.location.href),
              page_referrer: memoripAnalyticsUrl(document.referrer)
            });
          })();
        `}
      </Script>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
        strategy="afterInteractive"
      />
      <Suspense fallback={null}>
        <AnalyticsPageView gaId={gaId} />
      </Suspense>
    </>
  );
}
