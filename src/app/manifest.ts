import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "SEDIMA",
    short_name: "SEDIMA",
    description: "Gestion de projets SEDIMA",
    start_url: "/projects",
    display: "standalone",
    background_color: "#f8fafc",
    theme_color: "#e01818",
    lang: "fr",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
