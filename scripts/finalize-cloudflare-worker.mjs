import { createHash } from "node:crypto";
import { copyFile, mkdir, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(import.meta.dirname, "..");
const datasets = {
  facilitiesData: "facilities_data.json",
  eventsData: "events_data.json",
  summerEventsData: "summer_events_2026.json",
  asoviewFacilityActionsData: "asoview_facility_actions.json",
  rakutenFacilityActionsData: "rakuten_facility_actions.json",
};

async function stageHtmlFile(sourcePath, destinationPath) {
  await mkdir(resolve(destinationPath, ".."), { recursive: true });
  await copyFile(sourcePath, destinationPath);
}

async function stageHtmlTree(sourceDir, destinationDir, prefixSegments = []) {
  await mkdir(destinationDir, { recursive: true });
  const entries = await readdir(sourceDir, { withFileTypes: true });
  for (const entry of entries) {
    const sourcePath = resolve(sourceDir, entry.name);
    if (entry.isDirectory()) {
      await stageHtmlTree(sourcePath, destinationDir, [
        ...prefixSegments,
        entry.name,
      ]);
    } else if (entry.isFile() && entry.name.endsWith(".html")) {
      const destinationPath = resolve(
        destinationDir,
        `${[
          ...prefixSegments,
          entry.name.slice(0, -".html".length),
        ].join("__")}.html`,
      );
      await stageHtmlFile(sourcePath, destinationPath);
    }
  }
}

async function stageDirectStaticPages() {
  const appOutput = resolve(root, ".next/server/app");
  const assetOutput = resolve(root, ".open-next/assets");
  const pageOutput = resolve(assetOutput, "_memorip-pages");
  const rootPages = [
    "index",
    "about",
    "events",
    "guide",
    "map",
    "privacy",
    "terms",
    "try",
  ];

  await rm(pageOutput, { recursive: true, force: true });
  for (const legacyPath of [
    "index.html",
    "about.html",
    "events.html",
    "guide.html",
    "map.html",
    "privacy.html",
    "terms.html",
    "try.html",
    "facilities",
    "events",
    "prefecture",
    "legal",
  ]) {
    await rm(resolve(assetOutput, legacyPath), { recursive: true, force: true });
  }

  for (const page of rootPages) {
    await stageHtmlFile(
      resolve(appOutput, `${page}.html`),
      resolve(pageOutput, `_root__${page}.html`),
    );
  }

  for (const routeGroup of ["facilities", "events", "prefecture", "legal"]) {
    await stageHtmlTree(
      resolve(appOutput, routeGroup),
      pageOutput,
      [routeGroup],
    );
  }

  // An older static-cache configuration may have populated this generated
  // directory. Its packed files can exceed Cloudflare's 25 MiB asset limit.
  await rm(resolve(assetOutput, "cdn-cgi/_next_cache"), {
    recursive: true,
    force: true,
  });

  const eventPages = (await readdir(resolve(appOutput, "events"), {
    withFileTypes: true,
  }))
    .filter((entry) => entry.isFile() && entry.name.endsWith(".html"))
    .map((entry) => entry.name.slice(0, -".html".length));
  const staticProxyRules = [
    "/ /_memorip-pages/_root__index.html 200",
    ...rootPages
      .filter((page) => page !== "index")
      .map((page) => `/${page} /_memorip-pages/_root__${page}.html 200`),
    "/facilities/:slug /_memorip-pages/facilities__:slug.html 200",
    ...eventPages.map(
      (page) => `/events/${page} /_memorip-pages/events__${page}.html 200`,
    ),
    "/prefecture/:id/category/:category /_memorip-pages/prefecture__:id__category__:category.html 200",
    "/prefecture/:id /_memorip-pages/prefecture__:id.html 200",
    "/legal/privacy /_memorip-pages/legal__privacy.html 200",
    "/legal/terms /_memorip-pages/legal__terms.html 200",
  ];
  await writeFile(
    resolve(assetOutput, "_redirects"),
    `${staticProxyRules.join("\n")}\n`,
    "utf8",
  );

  console.log("Staged direct static HTML for public fixed routes.");
}

async function optimizeOversizedStaticImages(directory) {
  const sharp = (await import("sharp")).default;
  const entries = await readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) {
      await optimizeOversizedStaticImages(path);
      continue;
    }
    if (!entry.isFile() || !/\.(?:jpe?g|png|webp)$/iu.test(entry.name)) continue;
    const { size } = await stat(path);
    if (size <= 5 * 1024 * 1024) continue;

    const temporaryPath = `${path}.memorip-optimized`;
    const image = sharp(path)
      .rotate()
      .resize({
        width: 1600,
        height: 1600,
        fit: "inside",
        withoutEnlargement: true,
      });
    if (/\.png$/iu.test(entry.name)) {
      await image.png({ compressionLevel: 9 }).toFile(temporaryPath);
    } else if (/\.webp$/iu.test(entry.name)) {
      await image.webp({ quality: 82 }).toFile(temporaryPath);
    } else {
      await image.jpeg({ quality: 82, mozjpeg: true }).toFile(temporaryPath);
    }
    await copyFile(temporaryPath, path);
    await rm(temporaryPath, { force: true });
    console.log(`Optimized oversized static image ${entry.name}.`);
  }
}

export async function finalizeCloudflareWorker() {
  await stageDirectStaticPages();
  await optimizeOversizedStaticImages(resolve(root, ".open-next/assets/images"));

  const canon = {};
  for (const [exportName, fileName] of Object.entries(datasets)) {
    canon[exportName] = JSON.parse(
      await readFile(resolve(root, "data", fileName), "utf8"),
    );
  }

  const assetDir = resolve(root, ".open-next/assets/_memorip-runtime");
  await rm(assetDir, { recursive: true, force: true });
  await mkdir(assetDir, { recursive: true });

  const manifest = {
    facilitiesMetadataPath: "",
    facilityChunkPaths: [],
    datasetPaths: {},
  };
  const facilitiesData = canon.facilitiesData;
  const facilitiesMetadata = JSON.stringify({
    ...facilitiesData,
    facilities: undefined,
  });
  const metadataDigest = createHash("sha256")
    .update(facilitiesMetadata)
    .digest("hex")
    .slice(0, 16);
  const metadataName = `facilities-metadata-${metadataDigest}.json`;
  manifest.facilitiesMetadataPath = `/_memorip-runtime/${metadataName}`;
  await writeFile(resolve(assetDir, metadataName), facilitiesMetadata, "utf8");

  const facilityChunkSize = 650;
  for (
    let start = 0;
    start < facilitiesData.facilities.length;
    start += facilityChunkSize
  ) {
    const serialized = JSON.stringify(
      facilitiesData.facilities.slice(start, start + facilityChunkSize),
    );
    const digest = createHash("sha256")
      .update(serialized)
      .digest("hex")
      .slice(0, 16);
    const name = `facilities-${String(start / facilityChunkSize).padStart(2, "0")}-${digest}.json`;
    manifest.facilityChunkPaths.push(`/_memorip-runtime/${name}`);
    await writeFile(resolve(assetDir, name), serialized, "utf8");
  }

  for (const [exportName, value] of Object.entries(canon)) {
    if (exportName === "facilitiesData") continue;
    const serialized = JSON.stringify(value);
    const digest = createHash("sha256")
      .update(serialized)
      .digest("hex")
      .slice(0, 16);
    const name = `${exportName}-${digest}.json`;
    manifest.datasetPaths[exportName] = `/_memorip-runtime/${name}`;
    await writeFile(resolve(assetDir, name), serialized, "utf8");
  }

  const template = await readFile(resolve(root, "cloudflare/worker.js"), "utf8");
  if (!template.includes("__MEMORIP_RUNTIME_CANON_MANIFEST__")) {
    throw new Error("Cloudflare Worker template is missing the runtime canon manifest placeholder.");
  }
  await writeFile(
    resolve(root, ".open-next/worker.js"),
    template.replace(
      '"__MEMORIP_RUNTIME_CANON_MANIFEST__"',
      JSON.stringify(manifest),
    ),
    "utf8",
  );

  console.log(
    `Staged runtime canon in ${manifest.facilityChunkPaths.length + Object.keys(manifest.datasetPaths).length + 1} files.`,
  );
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  await finalizeCloudflareWorker();
}
