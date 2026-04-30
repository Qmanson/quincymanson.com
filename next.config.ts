import type { NextConfig } from "next";

// Pull the Supabase host out of the URL env var so <Image> will load
// images from the Storage CDN. e.g. xxcuollsmddqezfmwmqd.supabase.co
const supabaseHost = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!).hostname
  } catch {
    return null
  }
})()

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // Allow images served from your Supabase Storage bucket
      ...(supabaseHost
        ? [{ protocol: 'https' as const, hostname: supabaseHost }]
        : []),
      // Generic safety net for blog cover URLs hosted elsewhere
      { protocol: 'https', hostname: '**' },
    ],
  },
};

export default nextConfig;
