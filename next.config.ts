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
  // output: 'standalone', // Temporarily disable standalone to fix build issues
  
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
    formats: ['image/webp', 'image/avif'],
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "img-src 'self' lkmjfsdfkqqgxv8z.public.blob.vercel-storage.com groundedgems.com www.groundedgems.com images.unsplash.com localhost:3000 data:; default-src 'self'; script-src 'none'; sandbox;",
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

  },
  
  // Disable static generation to fix build issues
  trailingSlash: false,
  
  // Asset configuration for mobile apps
  assetPrefix: '',
  basePath: '',
  
  // Compression and caching
  compress: true,
  poweredByHeader: false,
  
  // Headers for better mobile performance and caching
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
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
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
