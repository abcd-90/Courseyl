import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://courseyl.online";

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/admin/",
          "/studio-hub/",
          "/dashboard",
          "/settings",
          "/inbox",
          "/notes",
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}

