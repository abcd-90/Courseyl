import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = "https://courseyl.online";

  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/pricing", "/about", "/support", "/community", "/courses", "/vs-courseit"],
        disallow: [
          "/api/",
          "/admin/",
          "/studio-hub/",
          "/dashboard",
          "/learn/",
          "/settings",
          "/inbox",
          "/notes",
          "/planner",
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
