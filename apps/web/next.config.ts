import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  experimental: {
    serverActions: {
      // Lambda Function URL host differs from the public domain when behind CloudFront.
      // Allowlist the public domain so Next.js doesn't reject Server Action POSTs.
      allowedOrigins: ['oripanow.app', '*.oripanow.app'],
    },
  },
};

export default nextConfig;
