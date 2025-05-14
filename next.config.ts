import { withPayload } from "@payloadcms/next/withPayload";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
  }
};

export default withPayload(nextConfig);
