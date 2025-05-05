import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // for react-pdf
  // experimental: {
  //   turbo: {
  //     resolveAlias: {
  //       canvas: "./empty-module.ts",
  //     },
  //   },
  // },

  images: {
    domains: ["dbnbeqjmkqdrmhxqoybt.supabase.co"],
  },
};

export default nextConfig;
