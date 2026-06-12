/** @type {import('next-sitemap').IConfig} */
module.exports = {
  siteUrl: process.env.SITE_URL || "https://trip-guide.net",
  generateRobotsTxt: true,
  sitemapSize: 5000,
  changefreq: "weekly",
  priority: 0.7,
  exclude: ["/server-sitemap.xml", "/legal/privacy", "/legal/terms"],
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
    return [
      await config.transform(config, "/facilities"),
    ];
  },
  transform: async (config, path) => {
    let priority = config.priority;
    if (path === "/") priority = 1.0;
    else if (path.startsWith("/prefecture/") || path.startsWith("/category/"))
      priority = 0.9;
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
