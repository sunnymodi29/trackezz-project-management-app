import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  // Parent folder has its own package-lock.json; pin Turbopack to this app.
  turbopack: {
    root: projectRoot,
  },
};

export default nextConfig;
