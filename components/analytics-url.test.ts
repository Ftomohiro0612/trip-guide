import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import vm from "node:vm";

const analyticsModulePath = "./analytics-url.ts";

const visitUuid = "123e4567-e89b-12d3-a456-426614174000";
const gaCollectUrl = `https://www.google-analytics.com/g/collect?v=2&dl=https%3A%2F%2Ftrip-guide.net%2Fmypage%2Fvisits%2F${visitUuid}`;

function readAnalyticsInitScript(): string {
  const source = readFileSync(join(process.cwd(), "components", "Analytics.tsx"), "utf8");
  const match = source.match(
    /<Script id="ga4-init" strategy="afterInteractive">\s*\{`\r?\n([\s\S]*?)\r?\n\s*`\}\s*<\/Script>/,
  );

  assert.ok(match, "ga4-init inline script should be extractable");
  return match[1].replaceAll("${gaIdJson}", '"G-TEST"').replaceAll("\\\\", "\\");
}

type TransportCall = {
  kind: "beacon" | "fetch" | "xhr" | "image";
  url?: string;
  body?: unknown;
  input?: unknown;
  init?: RequestInit;
};

function bodyText(value: unknown): string {
  if (typeof value === "string") return value;
  if (value instanceof URLSearchParams) return value.toString();
  if (value && typeof value === "object" && "url" in value) {
    return String((value as { url: string }).url);
  }
  return "";
}

function assertNoRawUuid(calls: TransportCall[]) {
  for (const call of calls) {
    const text = [
      call.url,
      bodyText(call.body),
      bodyText(call.input),
      bodyText(call.init?.body),
    ].join("&");

    assert.equal(text.includes(visitUuid), false, JSON.stringify(call));
  }
}

function makeAnalyticsEnvironment() {
  const calls: TransportCall[] = [];

  class FakeResponse {
    status: number;
    statusText: string;

    constructor(_body: BodyInit | null, init: ResponseInit = {}) {
      this.status = init.status ?? 200;
      this.statusText = init.statusText ?? "";
    }
  }

  class FakeRequest {
    url: string;
    body: unknown;
    method: string;

    constructor(input: string | FakeRequest, init: RequestInit = {}) {
      this.url = input instanceof FakeRequest ? input.url : String(input);
      this.method = init.method ?? (input instanceof FakeRequest ? input.method : "GET");
      if (Object.prototype.hasOwnProperty.call(init, "body")) {
        this.body = init.body == null ? null : {};
      } else {
        this.body = input instanceof FakeRequest ? input.body : null;
      }
    }
  }

  class FakeXMLHttpRequest {
    __memoripGa4Url?: string;
    openedUrl = "";

    open(_method: string, url: string) {
      this.openedUrl = url;
    }

    send(body?: XMLHttpRequestBodyInit | null) {
      calls.push({ kind: "xhr", url: this.openedUrl, body });
    }
  }

  class FakeImage {
    value = "";
  }

  Object.defineProperty(FakeImage.prototype, "src", {
    configurable: true,
    enumerable: true,
    get(this: FakeImage) {
      return this.value;
    },
    set(this: FakeImage, value: string) {
      this.value = value;
      calls.push({ kind: "image", url: value });
    },
  });

  const window = {
    location: {
      href: `https://trip-guide.net/mypage/visits/${visitUuid}`,
      origin: "https://trip-guide.net",
    },
    fetch(input: unknown, init?: RequestInit) {
      calls.push({ kind: "fetch", input, init, url: bodyText(input) });
      return Promise.resolve(new FakeResponse(null, { status: 200 }));
    },
    dataLayer: [] as unknown[],
  };

  const navigator = {
    sendBeacon(url: string, body?: BodyInit | null) {
      calls.push({ kind: "beacon", url, body });
      return true;
    },
  };

  const sandbox = {
    window,
    navigator,
    document: { referrer: `https://trip-guide.net/mypage/visits/${visitUuid}` },
    XMLHttpRequest: FakeXMLHttpRequest,
    HTMLImageElement: FakeImage,
    Request: FakeRequest,
    Response: FakeResponse,
    URL,
    URLSearchParams,
  };

  vm.runInNewContext(readAnalyticsInitScript(), sandbox);

  return {
    calls,
    window: window as typeof window & {
      fetch: (input: unknown, init?: RequestInit) => Promise<FakeResponse>;
    },
    navigator,
    XMLHttpRequest: FakeXMLHttpRequest,
    Image: FakeImage,
    Request: FakeRequest,
  };
}

test("maskAnalyticsUrl masks UUIDs in visit path, query, and hash", async () => {
  const { maskAnalyticsUrl } = await import(analyticsModulePath);
  const masked = maskAnalyticsUrl(
    `https://trip-guide.net/mypage/visits/${visitUuid}?next=/mypage/visits/${visitUuid}#${visitUuid}`,
  );

  assert.equal(
    masked,
    "https://trip-guide.net/mypage/visits/:id?next=/mypage/visits/:id#:id",
  );
  assert.equal(masked.includes(visitUuid), false);
});

test("maskAnalyticsUrl masks relative URLs against the current origin", async () => {
  const { maskAnalyticsUrl } = await import(analyticsModulePath);
  const masked = maskAnalyticsUrl(
    `/mypage/visits/${visitUuid}`,
    "https://trip-guide.net",
  );

  assert.equal(masked, "https://trip-guide.net/mypage/visits/:id");
});

test("maskAnalyticsPath returns a masked path suitable for page_path", async () => {
  const { maskAnalyticsPath } = await import(analyticsModulePath);
  const masked = maskAnalyticsPath(
    `https://trip-guide.net/mypage/visits/${visitUuid}?from=${visitUuid}`,
  );

  assert.equal(masked, "/mypage/visits/:id?from=:id");
});

test("maskAnalyticsText masks collect payload text before GA transport", async () => {
  const { maskAnalyticsText } = await import(analyticsModulePath);
  const masked = maskAnalyticsText(
    `dl=https://trip-guide.net/mypage/visits/${visitUuid}&dr=https://trip-guide.net/mypage/visits/${visitUuid}`,
  );

  assert.equal(masked.includes(visitUuid), false);
  assert.equal((masked.match(/:id/g) ?? []).length, 2);
});

test("GA4 transport masks string and URLSearchParams bodies synchronously", async () => {
  const env = makeAnalyticsEnvironment();
  env.calls.length = 0;

  env.navigator.sendBeacon(gaCollectUrl, `dl=https://trip-guide.net/mypage/visits/${visitUuid}`);
  await env.window.fetch(gaCollectUrl, {
    method: "POST",
    body: new URLSearchParams([
      [`ep.${visitUuid}`, `https://trip-guide.net/mypage/visits/${visitUuid}`],
    ]),
  });

  assert.equal(env.calls.length, 2);
  assert.equal(bodyText(env.calls[0].body).includes(":id"), true);
  assertNoRawUuid(env.calls);
});

test("GA4 transport fail-closes unsupported BodyInit values", async () => {
  const env = makeAnalyticsEnvironment();
  env.calls.length = 0;

  const unsupportedBodies: BodyInit[] = [
    new Blob([`dl=https://trip-guide.net/mypage/visits/${visitUuid}`]),
    new TextEncoder().encode(`dl=https://trip-guide.net/mypage/visits/${visitUuid}`).buffer,
    new Uint8Array(new TextEncoder().encode(`dl=${visitUuid}`)),
    new FormData(),
  ];
  if (typeof ReadableStream !== "undefined") {
    unsupportedBodies.push(new ReadableStream() as BodyInit);
  }

  for (const body of unsupportedBodies) {
    env.navigator.sendBeacon(gaCollectUrl, body);
    const response = await env.window.fetch(gaCollectUrl, { method: "POST", body });
    assert.equal(response.status, 204);
  }

  assert.equal(env.calls.length, 0);
});

test("GA4 fetch(Request) with a Request-owned body fail-closes", async () => {
  const env = makeAnalyticsEnvironment();
  env.calls.length = 0;

  const request = new env.Request(gaCollectUrl, {
    method: "POST",
    body: `dl=https://trip-guide.net/mypage/visits/${visitUuid}`,
  });
  const response = await env.window.fetch(request);

  assert.equal(response.status, 204);
  assert.equal(env.calls.length, 0);
});

test("GA4 XHR masks inspectable bodies and fail-closes Blob bodies", () => {
  const env = makeAnalyticsEnvironment();
  env.calls.length = 0;

  const xhr = new env.XMLHttpRequest();
  xhr.open("POST", gaCollectUrl);
  xhr.send(`dl=https://trip-guide.net/mypage/visits/${visitUuid}`);

  const blobXhr = new env.XMLHttpRequest();
  blobXhr.open("POST", gaCollectUrl);
  blobXhr.send(new Blob([visitUuid]));

  assert.equal(env.calls.length, 1);
  assert.equal(bodyText(env.calls[0].body).includes(":id"), true);
  assertNoRawUuid(env.calls);
});

test("non-GA transports pass unsupported bodies through unchanged", async () => {
  const env = makeAnalyticsEnvironment();
  env.calls.length = 0;

  const blob = new Blob([visitUuid]);
  const arrayBuffer = new TextEncoder().encode(visitUuid).buffer;
  const xhrBlob = new Blob([visitUuid]);

  env.navigator.sendBeacon("https://example.com/collect", blob);
  await env.window.fetch("https://example.com/collect", { method: "POST", body: arrayBuffer });
  const xhr = new env.XMLHttpRequest();
  xhr.open("POST", "https://example.com/collect");
  xhr.send(xhrBlob);

  assert.equal(env.calls.length, 3);
  assert.equal(env.calls[0].body, blob);
  assert.equal(env.calls[1].init?.body, arrayBuffer);
  assert.equal(env.calls[2].body, xhrBlob);
});

test("GA4 unmarked page_view is blocked and manual page_view is sent", () => {
  const env = makeAnalyticsEnvironment();
  env.calls.length = 0;

  const unmarked = `${gaCollectUrl}&en=page_view`;
  const manual = `${unmarked}&ep.memorip_manual_page_view=1`;

  assert.equal(env.navigator.sendBeacon(unmarked, ""), true);
  assert.equal(env.calls.length, 0);

  assert.equal(env.navigator.sendBeacon(manual, `dl=https://trip-guide.net/mypage/visits/${visitUuid}`), true);
  assert.equal(env.calls.length, 1);
  assertNoRawUuid(env.calls);
});

test("GA4 image src masks URLs and blocks unmarked page_view", () => {
  const env = makeAnalyticsEnvironment();
  env.calls.length = 0;

  const image = new env.Image();
  const imageElement = image as unknown as { src: string };
  imageElement.src = gaCollectUrl;
  imageElement.src = `${gaCollectUrl}&en=page_view`;

  assert.equal(env.calls.length, 2);
  assert.equal(env.calls[1].url, "data:,");
  assertNoRawUuid(env.calls);
});
