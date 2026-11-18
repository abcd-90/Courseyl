import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Courseyl - Interactive Course Builder",
    short_name: "Courseyl",
    description:
      "Transform any YouTube video or playlist into structured courses with quizzes, interactive notes, and placement tests.",
    start_url: "/",
    display: "standalone",
    background_color: "#0a0f0c",
    theme_color: "#4b5e1e",
    icons: [
      {
        src: "/icon-48.png",
        sizes: "48x48",
        type: "image/png",
      },
      {
        src: "/icon-96.png",
        sizes: "96x96",
        type: "image/png",
      },
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  };
}
