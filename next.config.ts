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
      }
    ]
  }
};

export default withPayload(nextConfig);
