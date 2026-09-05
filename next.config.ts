import type { NextConfig } from "next";

// Vercel et l'environnement cloud exposent SUPABASE_URL / SUPABASE_ANON_KEY.
// Le navigateur a besoin des variantes NEXT_PUBLIC_*, on les derive ici au build.
const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? "")
  .replace(/\/(rest|auth|storage)\/v1\/?$/, "")
  .replace(/\/$/, "");
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY ?? "";

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_SUPABASE_URL: supabaseUrl,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: supabaseKey,
  },
  async headers() {
    return [
      { source: "/sw.js", headers: [{ key: "Cache-Control", value: "no-cache" }] },
    ];
  },
};

export default nextConfig;
