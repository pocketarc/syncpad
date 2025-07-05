import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    output: "export",
    images: {
        unoptimized: true,
    },
};

// biome-ignore lint/style/noDefaultExport: Using default export for Next.js configuration.
export default nextConfig;
