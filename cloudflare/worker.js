//@ts-expect-error: Resolved by the Wrangler build
import { handleCdnCgiImageRequest, handleImageRequest } from "./cloudflare/images.js";
//@ts-expect-error: Resolved by the Wrangler build
import { runWithCloudflareRequestContext } from "./cloudflare/init.js";
//@ts-expect-error: Resolved by the Wrangler build
import { maybeGetSkewProtectionResponse } from "./cloudflare/skew-protection.js";
//@ts-expect-error: Resolved by the Wrangler build
export { DOQueueHandler } from "./.build/durable-objects/queue.js";
//@ts-expect-error: Resolved by the Wrangler build
export { DOShardedTagCache } from "./.build/durable-objects/sharded-tag-cache.js";
//@ts-expect-error: Resolved by the Wrangler build
export { BucketCachePurge } from "./.build/durable-objects/bucket-cache-purge.js";

const runtimeCanonManifest = "__MEMORIP_RUNTIME_CANON_MANIFEST__";
let runtimeCanonPromise;

// This worker skips the generated middleware on public routes, including its
// next.config headers. Enforce the same boundary on every shared response.
function applySoudanHeaders(response, pathname) {
  if (
    pathname !== "/soudan" && !pathname.startsWith("/soudan/") &&
    pathname !== "/api/soudan" && !pathname.startsWith("/api/soudan/")
  ) return response;
  const headers = new Headers(response.headers);
  headers.set("Referrer-Policy", "no-referrer");
  headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
  headers.set("Cache-Control", "private, no-store");
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

function getConfiguredRedirect(url) {
  // OpenNext normally evaluates next.config redirects in its middleware
  // bundle. These are kept here so unrelated routes can avoid loading that
  // bundle while retaining the exact public URL behavior.
  if (url.pathname.length > 1 && url.pathname.endsWith("/")) {
    const destination = new URL(url);
    destination.pathname = url.pathname.slice(0, -1);
    return Response.redirect(destination, 308);
  }
  if (url.pathname === "/tag/indoor-rainy") {
    return Response.redirect(new URL("/tag/rainy-day", url), 308);
  }
  if (
    url.hostname === "trip-guide.net" ||
    url.hostname === "www.trip-guide.net" ||
    url.hostname === "www.memorips.com"
  ) {
    const destination = new URL(url);
    destination.protocol = "https:";
    destination.hostname = "memorips.com";
    return Response.redirect(destination, 301);
  }
}

async function runMiddlewareWhenNeeded(request, env, ctx, pathname) {
  if (pathname !== "/mypage" && !pathname.startsWith("/mypage/")) {
    return request;
  }

  // Keep the Supabase middleware out of public API cold starts. OpenNext emits
  // it as a separate module, so importing it only for protected pages avoids
  // parsing the Next/Supabase middleware graph for unrelated requests.
  // @ts-expect-error: Resolved by the Wrangler build
  const { handler: middlewareHandler } = await import(
    "./middleware/handler.mjs"
  );
  return middlewareHandler(request, env, ctx);
}

function requestNeedsRuntimeCanon(pathname) {
  return !(
    pathname === "/api/soudan/respond" || pathname === "/api/soudan/destinations" ||
    pathname === "/auth/callback" ||
    pathname === "/mypage/children" ||
    pathname === "/mypage/onboarding" ||
    pathname === "/mypage/settings" ||
    /^\/api\/children\/[^/]+\/avatar\/?$/.test(pathname)
  );
}

async function readRuntimeJson(env, requestUrl, path) {
  const assetUrl = new URL(path, requestUrl);
  const response = await env.ASSETS.fetch(new Request(assetUrl));
  if (!response.ok) {
    throw new Error(`Unable to load Memorip runtime canon (${response.status})`);
  }
  return response.json();
}

async function ensureRuntimeCanon(env, requestUrl) {
  if (globalThis.__MEMORIP_RUNTIME_CANON__) return;

  if (!runtimeCanonPromise) {
    runtimeCanonPromise = (async () => {
      const [facilitiesMetadata, facilityChunks, datasetEntries] =
        await Promise.all([
          readRuntimeJson(
            env,
            requestUrl,
            runtimeCanonManifest.facilitiesMetadataPath,
          ),
          Promise.all(
            runtimeCanonManifest.facilityChunkPaths.map((path) =>
              readRuntimeJson(env, requestUrl, path),
            ),
          ),
          Promise.all(
            Object.entries(runtimeCanonManifest.datasetPaths).map(
              async ([name, path]) => [
                name,
                await readRuntimeJson(env, requestUrl, path),
              ],
            ),
          ),
        ]);
      globalThis.__MEMORIP_RUNTIME_CANON__ = {
        facilitiesData: {
          ...facilitiesMetadata,
          facilities: facilityChunks.flat(),
        },
        ...Object.fromEntries(datasetEntries),
      };
    })().catch((error) => {
      runtimeCanonPromise = undefined;
      throw error;
    });
  }

  await runtimeCanonPromise;
}

const worker = {
  async fetch(request, env, ctx) {
    const response = await runWithCloudflareRequestContext(request, env, ctx, async () => {
      const skewResponse = maybeGetSkewProtectionResponse(request);
      if (skewResponse) return skewResponse;

      const url = new URL(request.url);
      const redirectResponse = getConfiguredRedirect(url);
      if (redirectResponse) return redirectResponse;

      // The canon is an implementation asset, not a public API.
      if (
        url.pathname.startsWith("/_memorip-runtime/") ||
        url.pathname.startsWith("/_memorip-pages/")
      ) {
        return new Response("Not Found", { status: 404 });
      }

      if (url.pathname.startsWith("/cdn-cgi/image/")) {
        return handleCdnCgiImageRequest(url, env);
      }
      if (
        url.pathname ===
        `${globalThis.__NEXT_BASE_PATH__}/_next/image${globalThis.__TRAILING_SLASH__ ? "/" : ""}`
      ) {
        return handleImageRequest(url, request.headers, env);
      }

      const reqOrResp = await runMiddlewareWhenNeeded(
        request,
        env,
        ctx,
        url.pathname,
      );
      if (reqOrResp instanceof Response) return reqOrResp;

      if (requestNeedsRuntimeCanon(url.pathname)) {
        await ensureRuntimeCanon(env, request.url);
      }
      // @ts-expect-error: Resolved by the Wrangler build
      const { handler } = await import("./server-functions/default/handler.mjs");
      return handler(reqOrResp, env, ctx, request.signal);
    });
    return applySoudanHeaders(response, new URL(request.url).pathname);
  },
};

export default worker;
