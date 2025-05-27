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
      },
      {
        protocol: 'https',
        hostname: "images.unsplash.com",
        port: '',
        pathname: '/**',
      }
    ]
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb', // Adjust the body size limit as needed
    },
  },
  serverExternalPackages: ['payload'],
  env: {
    // Ensure NEXTAUTH_URL is available in production
    NEXTAUTH_URL: process.env.NEXTAUTH_URL || (
      process.env.VERCEL_URL 
        ? `https://${process.env.VERCEL_URL}` 
        : 'http://localhost:3000'
    ),
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
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, max-age=0',
          },
        ],
      },
    ];
  },
};

export default withPayload(nextConfig);
