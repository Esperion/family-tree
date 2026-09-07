import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Person photos (Phase 4) are served from a Vercel Blob store.
    remotePatterns: [
      { protocol: "https", hostname: "*.public.blob.vercel-storage.com" },
    ],
  },
};

export default nextConfig;
