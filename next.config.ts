import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ["@napi-rs/canvas", "tesseract.js", "pdfjs-dist"],
};

export default nextConfig;
