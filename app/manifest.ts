import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Rapu",
    short_name: "Rapu",
    description: "Kuva kuitista, ja näet mihin rahat menevät.",
    lang: "fi",
    start_url: "/",
    display: "standalone",
    background_color: "#eaf1f0",
    theme_color: "#1e5b4a",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
  };
}
