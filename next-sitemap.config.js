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
      await config.transform(config, "/events"),
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
    ];
  },
  transform: async (config, path) => {
    let priority = config.priority;
    if (path === "/") priority = 1.0;
    else if (path.startsWith("/prefecture/") || path.startsWith("/category/"))
      priority = 0.9;
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
