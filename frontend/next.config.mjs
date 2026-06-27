const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:3000";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Lint läuft separat (npm run lint); Build nicht daran scheitern lassen.
  eslint: { ignoreDuringBuilds: true },
  // /api an den Relay-Motor proxen → same-origin im Browser, Session-Cookies funktionieren.
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${BACKEND_URL}/api/:path*` }];
  },
};

export default nextConfig;
