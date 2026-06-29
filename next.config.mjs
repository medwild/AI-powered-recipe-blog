/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
      {
        protocol: "https",
        hostname: "lecarnetgourmand.fr",
      },
    ],
  },
  allowedDevOrigins: [
    "3000-firebase-ai-blog-builder-1782152933144.cluster-cbeiita7rbe7iuwhvjs5zww2i4.cloudworkstations.dev",
  ],
}

export default nextConfig
