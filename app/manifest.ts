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
      { src: "/icon.png", type: "image/png", sizes: "64x64" },
      { src: "/apple-icon.png", type: "image/png", sizes: "180x180" },
    ],
  }
}
