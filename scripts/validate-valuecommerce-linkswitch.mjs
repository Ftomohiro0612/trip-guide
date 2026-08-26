import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const [layout, component, registry] = await Promise.all([
  readFile(new URL("app/layout.tsx", root), "utf8"),
  readFile(new URL("components/ValueCommerceLinkSwitch.tsx", root), "utf8"),
  readFile(new URL("data/asoview_facility_actions.json", root), "utf8").then(
    JSON.parse,
  ),
]);

assert.equal(
  occurrences(layout, "<ValueCommerceLinkSwitch />"),
  1,
  "LinkSwitch must be mounted exactly once in the root layout",
);
assert.equal(
  occurrences(component, "https://aml.valuecommerce.com/vcdal.js"),
  1,
  "ValueCommerce runtime must be loaded exactly once",
);
assert.equal(
  occurrences(component, "NEXT_PUBLIC_VALUECOMMERCE_PID"),
  1,
  "LinkSwitch must have one public PID input",
);
assert.match(
  component,
  /\^\\d\{9\}\$/,
  "the public PID must fail closed unless it is exactly nine digits",
);

for (const offer of registry.offers) {
  assert.match(
    offer.url,
    /^https:\/\/www\.asoview\.com\//,
    `offer is not a normal Asoview URL: ${offer.facility_slug}`,
  );
  assert.doesNotMatch(
    offer.url,
    /dalr\.valuecommerce\.com|vc_pid|sid=|pid=/iu,
    `handmade affiliate URL found: ${offer.facility_slug}`,
  );
}

const configuredPid = process.env.NEXT_PUBLIC_VALUECOMMERCE_PID?.trim();
if (configuredPid) {
  assert.match(
    configuredPid,
    /^\d{9}$/,
    "NEXT_PUBLIC_VALUECOMMERCE_PID must be the issued nine-digit public PID",
  );
}

console.log(
  `Validated one fail-closed LinkSwitch mount and ${registry.offers.length} normal Asoview URLs.`,
);

function occurrences(value, needle) {
  return value.split(needle).length - 1;
}
