#!/usr/bin/env node
// Verifie la connectivite de l'architecture SEDIMA : GitHub, Supabase, Vercel.
// Usage : node scripts/check-connections.mjs   (lit .env.local puis .env)
import { readFileSync, existsSync } from "node:fs";

for (const f of [".env.local", ".env"]) {
  if (!existsSync(f)) continue;
  for (const line of readFileSync(f, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

const results = [];
const ok = (name, detail) => results.push({ name, status: "OK", detail });
const ko = (name, detail) => results.push({ name, status: "ECHEC", detail });
const skip = (name, detail) => results.push({ name, status: "IGNORE", detail });

async function get(url, headers = {}) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 15000);
  try {
    const r = await fetch(url, { headers: { "User-Agent": "sedima-check", Accept: "application/json", ...headers }, signal: ctrl.signal });
    return { status: r.status, body: await r.text() };
  } finally {
    clearTimeout(t);
  }
}

// --- GitHub ---
{
  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPO || "assane-glitch/SEDIMA";
  try {
    const r = await get(`https://api.github.com/repos/${repo}`, token ? { Authorization: `Bearer ${token}` } : {});
    if (r.status === 200) {
      const j = JSON.parse(r.body);
      ok("GitHub", `${j.full_name} accessible (branche par defaut : ${j.default_branch}, push : ${j.permissions?.push ?? "inconnu"})`);
    } else ko("GitHub", `HTTP ${r.status} sur ${repo}`);
  } catch (e) { ko("GitHub", e.message); }
}

// --- Supabase ---
{
  const url = process.env.SUPABASE_URL;
  const anon = process.env.SUPABASE_ANON_KEY;
  if (!url || !anon) skip("Supabase REST", "SUPABASE_URL ou SUPABASE_ANON_KEY manquant");
  else {
    try {
      const r = await get(`${url.replace(/\/$/, "")}/rest/v1/`, { apikey: anon, Authorization: `Bearer ${anon}` });
      if (r.status === 200) ok("Supabase REST", `${url} repond (PostgREST)`);
      else ko("Supabase REST", `HTTP ${r.status} : ${r.body.slice(0, 120)}`);
    } catch (e) { ko("Supabase REST", e.message); }
    try {
      const r = await get(`${url.replace(/\/$/, "")}/auth/v1/health`, { apikey: anon });
      if (r.status === 200) ok("Supabase Auth", "service auth en bonne sante");
      else ko("Supabase Auth", `HTTP ${r.status}`);
    } catch (e) { ko("Supabase Auth", e.message); }
  }
  const dbUrl = process.env.DATABASE_URL;
  if (dbUrl) {
    try {
      const { spawnSync } = await import("node:child_process");
      const p = spawnSync("psql", [dbUrl, "-Atc", "select version()"], { encoding: "utf8", timeout: 20000 });
      if (p.status === 0) ok("Supabase Postgres", p.stdout.trim().split(" ").slice(0, 2).join(" "));
      else ko("Supabase Postgres", (p.stderr || p.error?.message || "psql indisponible").trim().slice(0, 160));
    } catch (e) { ko("Supabase Postgres", e.message); }
  } else skip("Supabase Postgres", "DATABASE_URL manquant (optionnel)");
}

// --- Vercel ---
{
  const token = process.env.VERCEL_TOKEN;
  if (!token) skip("Vercel", "VERCEL_TOKEN manquant");
  else {
    try {
      const r = await get("https://api.vercel.com/v2/user", { Authorization: `Bearer ${token}` });
      if (r.status === 200) {
        const j = JSON.parse(r.body);
        ok("Vercel compte", `connecte en tant que ${j.user?.username ?? j.user?.email ?? "?"}`);
      } else ko("Vercel compte", `HTTP ${r.status}`);
      const pid = process.env.VERCEL_PROJECT_ID;
      if (pid) {
        const p = await get(`https://api.vercel.com/v9/projects/${pid}`, { Authorization: `Bearer ${token}` });
        if (p.status === 200) {
          const j = JSON.parse(p.body);
          const link = j.link ? `${j.link.type}:${j.link.org}/${j.link.repo}` : "aucun depot lie";
          ok("Vercel projet", `${j.name} (framework : ${j.framework ?? "non defini"}, git : ${link})`);
        } else ko("Vercel projet", `HTTP ${p.status}`);
      } else skip("Vercel projet", "VERCEL_PROJECT_ID manquant (optionnel)");
    } catch (e) { ko("Vercel", e.message); }
  }
}

const pad = (s, n) => String(s).padEnd(n);
console.log("\nSEDIMA - verification des connexions\n");
for (const r of results) console.log(`${pad(r.status, 7)} ${pad(r.name, 18)} ${r.detail}`);
const failed = results.filter(r => r.status === "ECHEC").length;
console.log(`\n${failed === 0 ? "Aucun echec." : failed + " echec(s)."}\n`);
process.exit(failed ? 1 : 0);
