import { withPayload } from "@payloadcms/next/withPayload";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  output: 'standalone',
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: "lkmjfsdfkqqgxv8z.public.blob.vercel-storage.com",
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: "groundedgems.com",
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: "www.groundedgems.com",
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'http',
        hostname: "localhost",
        port: '3000',
        pathname: '/**',
      }
    ]
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb', // Adjust the body size limit as needed
    }
  },
  async headers() {
    return [
      {
        source: '/manifest.json',
        headers: [
          {
            key: 'Content-Type',
            value: 'application/manifest+json',
          },
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/sw.js',
        headers: [
          {
            key: 'Content-Type',
            value: 'application/javascript',
          },
          {
            key: 'Cache-Control',
            value: 'public, max-age=0, must-revalidate',
          },
        ],
      },
    ];
  },
};

export default withPayload(nextConfig);
