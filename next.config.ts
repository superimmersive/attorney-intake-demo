import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // pdfkit reads its font metric files from disk at runtime, so it can't be bundled.
  serverExternalPackages: ["pdfkit"],
};

export default nextConfig;
