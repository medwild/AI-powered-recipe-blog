/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
      {
        protocol: "https",
        hostname: "chefaugustin.com",
      },
    ],
  },
  allowedDevOrigins: [
    process.env.NEXT_PUBLIC_SITE_URL ? new URL(process.env.NEXT_PUBLIC_SITE_URL).host : undefined,
    // Cloud Workstations dynamic ports — match any port prefix on the cluster domain
    "*.cluster-cbeiita7rbe7iuwhvjs5zww2i4.cloudworkstations.dev",
  ].filter(Boolean),
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' https://res.cloudinary.com data: blob:",
              "font-src 'self'",
              "connect-src 'self' https://res.cloudinary.com",
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action *",
            ].join("; "),
          },
        ],
      },
    ]
  },
  async rewrites() {
    return [
      {
        source: "/llms.txt",
        destination: "/llm.txt",
      },
    ]
  },
}

export default nextConfig
