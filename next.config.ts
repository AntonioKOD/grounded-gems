import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  eslint: {
    // Don't run eslint during build for faster builds
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Don't run TypeScript checking during build for faster builds 
    ignoreBuildErrors: true,
  },
  // Use standalone for both web and mobile builds to support API routes
  output: 'standalone',
  images: {
    // Use custom loader for better mobile and Payload CMS compatibility
    loader: 'custom',
    loaderFile: './lib/image-loader.ts',
    unoptimized: false, // Enable optimization with custom loader
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lkmjfsdfkqqgxv8z.public.blob.vercel-storage.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'groundedgems.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'www.groundedgems.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '3000',
        pathname: '/**',
      },
    ],
    deviceSizes: [320, 420, 768, 1024, 1200],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    formats: ['image/webp'],
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "img-src 'self' lkmjfsdfkqqgxv8z.public.blob.vercel-storage.com groundedgems.com www.groundedgems.com images.unsplash.com localhost:3000 data:; default-src 'self'; script-src 'none'; sandbox;",
  },
  
  // Disable static optimization for dynamic routes
  experimental: {
    serverActions: {
      bodySizeLimit: '50mb',
    },
    // Fix for Next.js App Router production issues
    optimisticClientCache: false,
    staleTimes: {
      dynamic: 0,
      static: 0,
    },
  },
  
  // Asset configuration for mobile apps
  assetPrefix: '',
  basePath: '',
  
  // Headers for better mobile performance
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
        ],
      },
    ];
  },
  
  // Webpack configuration for better Capacitor compatibility
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
      };
    }
    return config;
  },
  serverExternalPackages: ['payload'],
  env: {
    // Ensure NEXTAUTH_URL is available in production
    NEXT_PUBLIC_SERVER_URL:
      process.env.NODE_ENV === 'production'
        ? process.env.NEXT_PUBLIC_SERVER_URL || 'https://groundedgems.com'
        : process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000',
    PAYLOAD_PUBLIC_SERVER_URL:
      process.env.NODE_ENV === 'production'
        ? process.env.PAYLOAD_PUBLIC_SERVER_URL || 'https://groundedgems.com'
        : 'http://localhost:3000',
  },
};

export default nextConfig;
