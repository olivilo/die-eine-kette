/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Lint läuft separat (npm run lint); Build nicht daran scheitern lassen.
  eslint: { ignoreDuringBuilds: true },
};

export default nextConfig;
