/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("fs");
const ts = require("typescript");

require.extensions[".ts"] = (module, filename) => {
  const source = fs.readFileSync(filename, "utf8");
  const output = ts.transpileModule(source, {
    compilerOptions: {
      esModuleInterop: true,
      jsx: ts.JsxEmit.ReactJSX,
      module: ts.ModuleKind.CommonJS,
      resolveJsonModule: true,
      target: ts.ScriptTarget.ES2017,
    },
  }).outputText;
  module._compile(output, filename);
};

const { getPilotCrossParams } = require("./lib/crossings.ts");
const facilitiesData = require("./data/facilities_data.json");

// 正本(data/facilities_data.json の metadata.categories)。
// app/category/[id]/page.tsx の generateStaticParams と同じ一覧を参照する。
const categoryIds = facilitiesData.metadata.categories.map((c) => c.id);

/** @type {import('next-sitemap').IConfig} */
module.exports = {
  siteUrl: process.env.SITE_URL || "https://trip-guide.net",
  generateRobotsTxt: true,
  sitemapSize: 5000,
  changefreq: "weekly",
  priority: 0.7,
  exclude: [
    "/server-sitemap.xml",
    "/legal/privacy",
    "/legal/terms",
    "/auth",
    "/auth/*",
    "/mypage",
    "/mypage/*",
    "/opengraph-image",
    "/opengraph-image.png",
    "/manifest.webmanifest",
    "/terms",
    "/privacy",
  ],
  robotsTxtOptions: {
    policies: [
      {
        userAgent: "*",
        allow: "/",
      },
    ],
    additionalSitemaps: [],
  },
  additionalPaths: async (config) => {
    const crossPaths = await Promise.all(
      getPilotCrossParams().map(({ id, categoryId }) =>
        config.transform(config, `/prefecture/${id}/category/${categoryId}`),
      ),
    );

    const categoryPaths = await Promise.all(
      categoryIds.map((id) => config.transform(config, `/category/${id}`)),
    );

    return [
      await config.transform(config, "/facilities"),
      ...categoryPaths,
      await config.transform(config, "/events"),
      await config.transform(config, "/events/summer"),
      await config.transform(config, "/events/tokyo"),
      await config.transform(config, "/events/kanagawa"),
      await config.transform(config, "/events/yamanashi"),
      await config.transform(config, "/events/shizuoka"),
      await config.transform(config, "/events/chiba"),
      await config.transform(config, "/events/saitama"),
      await config.transform(config, "/events/ibaraki"),
      await config.transform(config, "/events/gunma"),
      await config.transform(config, "/events/osaka"),
      await config.transform(config, "/events/hyogo"),
      await config.transform(config, "/events/kyoto"),
      await config.transform(config, "/events/aichi"),
      await config.transform(config, "/events/fukuoka"),
      await config.transform(config, "/events/hiroshima"),
      ...crossPaths,
    ];
  },
  transform: async (config, path) => {
    let priority = config.priority;
    if (path === "/") priority = 1.0;
    else if (/^\/prefecture\/[^/]+\/category\/[^/]+$/.test(path))
      priority = 0.8;
    else if (path.startsWith("/prefecture/") || path.startsWith("/category/"))
      priority = 0.9;
    else if (path === "/events/summer") priority = 0.9;
    else if (path === "/events") priority = 0.85;
    else if (path.startsWith("/events/")) priority = 0.75;
    else if (path === "/facilities") priority = 0.8;
    else if (path.startsWith("/facilities/")) priority = 0.6;
    return {
      loc: path,
      changefreq: config.changefreq,
      priority,
      lastmod: new Date().toISOString(),
    };
  },
};
