import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // this wasn't working as expected
    remotePatterns: [
      {
        protocol: "https",
        hostname: "productify-ai.vercel.app",
        pathname: "/api/**",
      },
      {
        protocol: "http",
        hostname: "localhost",
        port: "3000",
        pathname: "/api/**",
      },
    ],
    // Disable image optimization warnings
    dangerouslyAllowSVG: true,
    contentDispositionType: "attachment",
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  /* config options here */
  reactStrictMode: true,
  // Suppress React DevTools warning
  devIndicators: {
    buildActivity: false,
  },
  // Suppress specific warnings
  // logging: {
  //   level: "error", // Only show errors, not warnings
  // },
};

export default nextConfig;
