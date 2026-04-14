/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  async rewrites() {
    // Override the API URL in production (e.g. Vercel) using NEXT_PUBLIC_BACKEND_URL
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "https://alpha.innosolve.in/certiforge";

    return [
      {
        source: "/api/:path*",
        destination: `${backendUrl}/api/:path*`,
      },
      // New Certiforge rewrite
      {
        source: "/certiforge/:path*",
        destination: `${backendUrl}/:path*`,
      },
    ];
  },
}

export default nextConfig