import type { MetadataRoute } from "next"

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Chef Augustin — Easy Weeknight Dinners for Two",
    short_name: "Chef Augustin",
    description:
      "Simple small-batch dinner recipes for two people. Practical weeknight meals from a French-trained chef.",
    start_url: "/",
    display: "standalone",
    background_color: "#faf7f2",
    theme_color: "#c2683f",
    icons: [
      { src: "/icon.svg", type: "image/svg+xml", sizes: "any" },
      { src: "/icon-light-32x32.png", type: "image/png", sizes: "32x32" },
      { src: "/icon-dark-32x32.png", type: "image/png", sizes: "32x32" },
      { src: "/apple-icon.png", type: "image/png", sizes: "180x180" },
    ],
  }
}
