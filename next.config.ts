import type { NextConfig } from 'next';
import { withPayload } from '@payloadcms/next/withPayload';

const nextConfig: NextConfig = {
  eslint: {
    // Enable ESLint during build for better code quality
    ignoreDuringBuilds: false,
  },
  typescript: {
    // Enable TypeScript checking during build for better type safety
    ignoreBuildErrors: false,
  },
  
  // Enable output standalone for better performance
  output: 'standalone',
  
  // Server external packages (moved from experimental)
  serverExternalPackages: ['payload'],
  
  // Turbopack configuration (moved from experimental)
  turbopack: {
    rules: {
      '*.svg': ['@svgr/webpack'],
    },
  },
  
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
        hostname: 'www.sacavia.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'sacavia.com',
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
        protocol: 'https',
        hostname: 'i.imgur.com',
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
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    formats: ['image/webp', 'image/avif'],
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "img-src 'self' lkmjfsdfkqqgxv8z.public.blob.vercel-storage.com www.sacavia.com sacavia.com images.unsplash.com localhost:3000 data:; default-src 'self'; script-src 'none'; sandbox;",
    // Optimize image quality/size balance
    minimumCacheTTL: 31536000, // 1 year cache
  },
  
  // Performance optimizations
  experimental: {
    serverActions: {
      bodySizeLimit: '50mb',
    },
    // Optimize static generation
    staleTimes: {
      dynamic: 0,
      static: 180, // 3 minutes
    },
    // Enable modern bundling and tree shaking
    optimizePackageImports: [
      'lucide-react',
      'framer-motion',
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-select',
      '@radix-ui/react-popover',
      '@radix-ui/react-tooltip',
      '@radix-ui/react-accordion',
      '@radix-ui/react-alert-dialog',
      '@reduxjs/toolkit',
      'react-redux',
      'date-fns',
    ],
    // Enable server-side rendering improvements
    // moved serverComponentsExternalPackages to top level
  },
  
  // Disable static generation to fix build issues
  trailingSlash: false,
  
  // Asset configuration for mobile apps
  assetPrefix: '',
  basePath: '',
  
  // Compression and caching
  compress: true,
  poweredByHeader: false,
  
  // Enhanced headers for security and performance
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
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(self)',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains',
          },
        ],
      },
      {
        source: '/api/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, no-cache, must-revalidate',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
        ],
      },
      {
        source: '/_next/static/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/media/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
  
  // Webpack configuration for better performance and Capacitor compatibility
  webpack: (config, { dev, isServer }) => {
    // Production optimizations
    if (!dev && !isServer) {
      // Enhanced bundle splitting strategy
      config.optimization.splitChunks = {
        ...config.optimization.splitChunks,
        chunks: 'all',
        cacheGroups: {
          ...config.optimization.splitChunks?.cacheGroups,
          // Separate vendor chunks by functionality
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            chunks: 'all',
            priority: 1,
            reuseExistingChunk: true,
            enforce: true,
          },
          // UI components chunk - lightweight
          ui: {
            test: /[\\/]node_modules[\\/](@radix-ui|lucide-react)[\\/]/,
            chunks: 'all',
            priority: 2,
            name: 'ui-components',
            reuseExistingChunk: true,
            enforce: true,
          },
          // Map components chunk - heavy, load on demand
          maps: {
            test: /[\\/]node_modules[\\/](mapbox-gl|leaflet|react-leaflet)[\\/]/,
            chunks: 'all',
            priority: 3,
            name: 'maps',
            reuseExistingChunk: true,
            enforce: true,
          },
          // Animation libraries - medium size
          animations: {
            test: /[\\/]node_modules[\\/](framer-motion|animejs)[\\/]/,
            chunks: 'all',
            priority: 2,
            name: 'animations',
            reuseExistingChunk: true,
            enforce: true,
          },
          // Redux and state management
          state: {
            test: /[\\/]node_modules[\\/](@reduxjs\/toolkit|react-redux|immer)[\\/]/,
            chunks: 'all',
            priority: 2,
            name: 'state-management',
            reuseExistingChunk: true,
            enforce: true,
          },
        },
      };

      // Minimize bundle size
      config.optimization.usedExports = true;
      config.optimization.sideEffects = false;
    }

    // Tree shaking for large libraries
    config.resolve.alias = {
      ...config.resolve.alias,
      'mapbox-gl$': 'mapbox-gl/dist/mapbox-gl.js',
    };

    // Optimize module resolution
    config.resolve.modules = ['node_modules', ...(config.resolve.modules || [])];
    
    // Performance optimizations for external libraries
    if (config.resolve.alias) {
      config.resolve.alias['lodash'] = 'lodash-es';
    }

    return config;
  },
  
  env: {
    // Ensure NEXTAUTH_URL is available in production
    NEXT_PUBLIC_SERVER_URL:
      process.env.NODE_ENV === 'production'
        ? process.env.NEXT_PUBLIC_SERVER_URL || 'https://www.sacavia.com'
        : process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000',
    PAYLOAD_PUBLIC_SERVER_URL:
      process.env.NODE_ENV === 'production'
        ? process.env.PAYLOAD_PUBLIC_SERVER_URL || 'https://www.sacavia.com'
        : 'http://localhost:3000',
  },
};

export default withPayload(nextConfig);
