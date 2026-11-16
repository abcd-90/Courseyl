import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = "https://www.courseyl.online";

  const publicAllowedRoutes = [
    "/",
    "/pricing",
    "/about",
    "/support",
    "/community",
    "/courses",
    "/vs-courseit",
    "/llms.txt",
    "/sitemap.xml",
    "/manifest.webmanifest",
  ];

  const privateDisallowedRoutes = [
    "/api/",
    "/admin/",
    "/studio-hub/",
    "/dashboard",
    "/learn/",
    "/settings",
    "/inbox",
    "/notes",
    "/planner",
  ];

  const aiBots = [
    "GPTBot",
    "ChatGPT-User",
    "PerplexityBot",
    "Google-Extended",
    "ClaudeBot",
    "cohere-ai",
  ];

  return {
    rules: [
      {
        userAgent: "*",
        allow: publicAllowedRoutes,
        disallow: privateDisallowedRoutes,
      },
      ...aiBots.map((bot) => ({
        userAgent: bot,
        allow: publicAllowedRoutes,
        disallow: privateDisallowedRoutes,
      })),
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
