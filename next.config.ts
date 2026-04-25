import path from "path";
import { execSync } from "child_process";
import type { NextConfig } from "next";

const projectRoot = path.resolve(__dirname);
const projectNodeModules = path.join(projectRoot, "node_modules");

function readGitInfo() {
  try {
    const commit = execSync("git rev-parse --short HEAD", { cwd: projectRoot, stdio: ["ignore", "pipe", "ignore"] })
      .toString()
      .trim();
    const branch = execSync("git rev-parse --abbrev-ref HEAD", { cwd: projectRoot, stdio: ["ignore", "pipe", "ignore"] })
      .toString()
      .trim();
    return { commit, branch };
  } catch {
    return { commit: "unknown", branch: "unknown" };
  }
}

const { commit: BUILD_COMMIT, branch: BUILD_BRANCH } = readGitInfo();

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: projectRoot,
  env: {
    NEXT_PUBLIC_BUILD_COMMIT: process.env.NEXT_PUBLIC_BUILD_COMMIT ?? BUILD_COMMIT,
    NEXT_PUBLIC_BUILD_BRANCH: process.env.NEXT_PUBLIC_BUILD_BRANCH ?? BUILD_BRANCH,
    NEXT_PUBLIC_BUILD_LABEL: process.env.NEXT_PUBLIC_BUILD_LABEL ?? "Audit final runtime check",
  },
  transpilePackages: [
    "recharts",
    "react-redux",
    "react-hook-form",
    "immer",
    "@reduxjs/toolkit",
    "redux",
    "reselect",
    "redux-thunk",
  ],
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },
  turbopack: {
    root: projectRoot,
  },
  webpack(config) {
    config.resolve ??= {};
    config.resolve.modules = [
      projectNodeModules,
      ...(config.resolve.modules ?? []),
    ];
    config.resolve.alias = {
      ...(config.resolve.alias ?? {}),
      "react-redux": path.join(projectNodeModules, "react-redux"),
      "react-hook-form": path.join(projectNodeModules, "react-hook-form"),
      immer: path.join(projectNodeModules, "immer"),
      "@reduxjs/toolkit": path.join(projectNodeModules, "@reduxjs", "toolkit"),
      redux: path.join(projectNodeModules, "redux"),
      reselect: path.join(projectNodeModules, "reselect"),
      "redux-thunk": path.join(projectNodeModules, "redux-thunk"),
    };

    return config;
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "origin-when-cross-origin",
          },
          {
            key: "Content-Security-Policy",
            value:
              "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self' ws:; frame-ancestors 'none'",
          },
          {
            key: "X-DNS-Prefetch-Control",
            value: "off",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
  async redirects() {
    return [
      {
        source: "/home",
        destination: "/dashboard",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
