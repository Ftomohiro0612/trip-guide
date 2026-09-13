import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// All known SSG routes are copied to Workers Static Assets after the build.
// Dynamic routes do not use time-based ISR, so a persistence binding (R2/KV)
// is unnecessary. OpenNext therefore has no incremental or tag cache to
// populate or upload.
export default defineCloudflareConfig();
