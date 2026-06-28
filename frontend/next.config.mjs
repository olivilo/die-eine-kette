const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:3000";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Lint läuft separat (npm run lint); Build nicht daran scheitern lassen.
  eslint: { ignoreDuringBuilds: true },
  // Next NICHT an Trailing-Slashes der /api-Pfade herumredigieren lassen — sonst
  // Redirect-Schleife mit gin (das die Collection-Routen mit Slash erwartet).
  skipTrailingSlashRedirect: true,
  // /api an den Relay-Motor proxen → same-origin im Browser, Session-Cookies funktionieren.
  // gin erwartet Collection-Routen MIT Trailing-Slash; der :path*-Platzhalter verschluckt
  // ihn aber. Darum für diese Routen explizite Rewrites, die den Slash wieder anhängen.
  async rewrites() {
    return [
      { source: "/api/token", destination: `${BACKEND_URL}/api/token/` },
      { source: "/api/channel", destination: `${BACKEND_URL}/api/channel/` },
      { source: "/api/user", destination: `${BACKEND_URL}/api/user/` },
      { source: "/api/:path*", destination: `${BACKEND_URL}/api/:path*` },
    ];
  },
};

export default nextConfig;
