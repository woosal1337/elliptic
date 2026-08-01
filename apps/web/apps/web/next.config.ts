import path from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

const dirname = path.dirname(fileURLToPath(import.meta.url));
const isVercel = !!process.env.VERCEL;
const backendOrigin = process.env.BACKEND_ORIGIN ?? "http://localhost:8000";

const realtimeUrl =
  process.env.NEXT_PUBLIC_REALTIME_URL ?? backendOrigin.replace(/^http/, "ws");

const nextConfig: NextConfig = {
  // The standalone output and the ../.. tracing root are for the self-host Docker
  // image. On Vercel both break the deploy: standalone output is rejected, and the
  // wider tracing root places the function entry where `next` can't be resolved.
  // Fall back to Next's defaults there.
  output: isVercel ? undefined : "standalone",
  outputFileTracingRoot: isVercel ? undefined : path.join(dirname, "../.."),
  transpilePackages: ["@elliptic/ui"],
  env: {
    NEXT_PUBLIC_REALTIME_URL: realtimeUrl,
  },
  // The blog slug changed with the rename; keep the published URL working.
  async redirects() {
    return [
      {
        source: "/blog/introducing-companyos",
        destination: "/blog/introducing-elliptic",
        permanent: true,
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${backendOrigin}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
