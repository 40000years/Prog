import type { NextConfig } from "next";

const config: NextConfig = {
  ...(process.env.SITE_STATIC_EXPORT === "1" ? { output: "export" } : { output: "standalone" }),
  images: { unoptimized: true },
  turbopack: { root: process.cwd() },
  poweredByHeader: false,
};

export default config;
