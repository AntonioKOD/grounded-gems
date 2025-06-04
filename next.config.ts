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
    ],
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "img-src 'self' lkmjfsdfkqqgxv8z.public.blob.vercel-storage.com groundedgems.com www.groundedgems.com images.unsplash.com data:; default-src 'self'; script-src 'none'; sandbox;",
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '50mb', // Increased from 10mb to 50mb for video uploads
    },
    // Fix for Next.js App Router production issues
    optimisticClientCache: false,
    staleTimes: {
      dynamic: 0,
      static: 0,
    },
  },
  serverExternalPackages: ['payload'],
  env: {
    // Ensure NEXTAUTH_URL is available in production
    NEXTAUTH_URL: process.env.NEXTAUTH_URL || (
      process.env.NODE_ENV === 'production' 
        ? 'https://groundedgems.com'
        : process.env.VERCEL_URL 
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
          // CORS headers for mobile app support
          {
            key: 'Access-Control-Allow-Origin',
            value: process.env.NODE_ENV === 'development' ? '*' : 'https://groundedgems.com',
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type, Authorization, X-Requested-With',
          },
          {
            key: 'Access-Control-Allow-Credentials',
            value: 'true',
          },
          {
            key: 'Access-Control-Max-Age',
            value: '86400', // 24 hours
          },
        ],
      },
      // Add headers to prevent authentication caching issues
      {
        source: '/api/users/me',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, no-cache, must-revalidate, proxy-revalidate',
          },
          {
            key: 'Pragma',
            value: 'no-cache',
          },
          {
            key: 'Expires',
            value: '0',
          },
        ],
      },
      {
        source: '/api/users/login',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, no-cache, must-revalidate, proxy-revalidate',
          },
          {
            key: 'Pragma',
            value: 'no-cache',
          },
          {
            key: 'Expires',
            value: '0',
          },
        ],
      },
    ];
  },
};

export default withPayload(nextConfig);
