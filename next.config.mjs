import path from "node:path";

/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  reactStrictMode: true,
  sassOptions: {
    includePaths: [
      path.join(process.cwd(), "node_modules"),
      path.join(process.cwd(), "styles/scss"),
    ],
  },
  async rewrites() {
    return [{ source: "/auth/:path*", destination: "/api/auth/:path*" }];
  },
};

export default nextConfig;
