import Link from "next/link";
import { CategoryIcon, Empty, PageHeader } from "@/components/ui";
import { ProjectCard, isAlert, rebuiltOf, shortMoney } from "@/components/projects/ProjectCard";
import { Icon } from "@/components/icons";
import { pct } from "@/lib/format";
import { projectHealth } from "@/lib/health";
import { canEdit, requireProfile } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { ViewToggle } from "./ViewToggle";
import { PROJECT_CATEGORIES, type Project, type ProjectStats } from "@/lib/types";

export const metadata = { title: "Projets" };

type Params = { q?: string; category?: string; status?: string; manager?: string; sort?: string; dir?: string };
const SORTS = ["code", "name", "start_date", "end_date", "progress", "budget", "spent", "status"] as const;

export default async function ProjectsPage({ searchParams }: { searchParams: Promise<Params> }) {
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const sort = (SORTS as readonly string[]).includes(sp.sort ?? "") ? sp.sort! : "code";
  const dir = sp.dir === "asc" ? "asc" : sp.dir === "desc" ? "desc" : sort === "name" || sort === "code" ? "asc" : "desc";
  const profile = await requireProfile();
  const supabase = await createClient();
  let query = supabase.from("projects").select("*");
  if (sp.category) query = query.eq("category", sp.category);
  if (sp.status) query = query.eq("status", sp.status);
  if (sp.manager) query = query.eq("manager_id", sp.manager);
  if (q) query = query.or(`name.ilike.%${q.replace(/[%,()]/g, "")}%,code.ilike.%${q.replace(/[%,()]/g, "")}%`);
  const [{ data: projects }, { data: stats }, { data: taskRows }, { data: favRows }] = await Promise.all([
    query, supabase.from("project_stats").select("*"), supabase.from("tasks").select("id,project_id,parent_id,budget,customs,vat"),
    supabase.from("user_favorites").select("project_id").eq("user_id", profile.id),
  ]);
  const favorites = new Set((favRows ?? []).map((f) => f.project_id));
  // Cout reconstitue TTC par projet = somme des taches feuilles (HTVA + douanes + TVA)
  const parents = new Set((taskRows ?? []).filter((t) => t.parent_id).map((t) => t.parent_id!));
  const ttc = new Map<string, number>();
  for (const t of taskRows ?? []) if (!parents.has(t.id)) ttc.set(t.project_id, (ttc.get(t.project_id) ?? 0) + Number(t.budget) + Number(t.customs ?? 0) + Number(t.vat ?? 0));
  const statMap = new Map(((stats ?? []) as ProjectStats[]).map((s) => [s.project_id, s]));
  const rows = ((projects ?? []) as Project[]).map((p) => ({ p, s: statMap.get(p.id), health: projectHealth(p, statMap.get(p.id)) }));
  const key = (r: typeof rows[number]) => {
    switch (sort) {
      case "code": return r.p.code;
      case "name": return r.p.name.toLowerCase();
      case "progress": return Number(r.s?.progress ?? 0);
      case "budget": return Number(r.p.budget);
      case "spent": return Number(r.s?.spent ?? 0);
      case "status": return r.p.status;
      case "end_date": return r.p.end_date;
      default: return r.p.start_date;
    }
  };
  rows.sort((a, b) => { const fa = favorites.has(a.p.id) ? 0 : 1, fb = favorites.has(b.p.id) ? 0 : 1; if (fa !== fb) return fa - fb; const ka = key(a), kb = key(b); return (ka < kb ? -1 : ka > kb ? 1 : 0) * (dir === "asc" ? 1 : -1); });

  const totalBudget = rows.reduce((t, r) => t + Number(r.p.budget), 0);
  const totalSpent = rows.reduce((t, r) => t + Number(r.s?.spent ?? 0), 0);
  const buckets = PROJECT_CATEGORIES.map((c) => ({ ...c, rows: rows.filter((r) => r.p.category === c.value) })).filter((b) => !sp.category || b.value === sp.category);
  const short = shortMoney;
  const alertOf = isAlert;
  const allRows = rows; const nProj = allRows.length;
  const totalTtc = allRows.reduce((t, r) => t + (ttc.get(r.p.id) ?? 0), 0), totalRebuilt = allRows.reduce((t, r) => t + Number(r.s?.rebuilt_cost ?? 0), 0);
  const gaps = allRows.filter((r) => rebuiltOf(r) !== null && Number(r.p.budget) > 0).map((r) => (rebuiltOf(r) ?? 0) - Number(r.p.budget));
  const totalGap = gaps.reduce((a, b) => a + b, 0);
  const gapPlus = gaps.filter((g) => g > 0), gapMinus = gaps.filter((g) => g < 0);
  const contracted = allRows.filter((r) => Number(r.s?.spent ?? 0) > 0);
  return (
    <>
      <div className="sticky top-[52px] z-20 -mx-4 -mt-1 border-b border-line-hair bg-[#e9eaed] px-4 pt-3 md:top-[60px] md:-mx-2 md:px-2">
      <PageHeader title="Projets" subtitle="Pilotage du portefeuille de projets" actions={<>
          <form action="/projects" className="relative"><Icon name="search" className="pointer-events-none absolute left-2.5 top-2 h-3.5 w-3.5 text-ink-faint" /><input name="q" defaultValue={q} placeholder="Rechercher…" className="input !w-48 !pl-8" />{q && <Link href="/projects" className="absolute right-2 top-1.5 text-ink-faint hover:text-ink" aria-label="Effacer">×</Link>}</form>
          <ViewToggle view="list" />{canEdit(profile) && <Link href="/projects/new" className="btn-primary">+ Nouveau projet</Link>}</>} />
      <div className="card mb-3 grid grid-cols-2 divide-line-hair md:grid-cols-4 md:divide-x">
        <div className="px-[15px] py-3"><div className="eyebrow">Cout total TTC</div><div className="mt-1 text-[21px] font-bold tabular-nums text-brand">{short(totalTtc)}</div><div className="hint">{nProj} projets</div></div>
        <div className="px-[15px] py-3"><div className="eyebrow">Enveloppes approuvees</div><div className="mt-1 text-[21px] font-bold tabular-nums">{short(totalBudget)}</div><div className="hint">Cout reconstitue HTVA {short(totalRebuilt)}</div></div>
        <div className="px-[15px] py-3"><div className="eyebrow">Ecart au budget approuve</div><div className={`mt-1 text-[21px] font-bold tabular-nums ${totalGap > 0 ? "text-brand" : ""}`}>{totalGap > 0 ? "+" : "−"}{short(Math.abs(totalGap))}</div><div className="hint">+{short(gapPlus.reduce((a, b) => a + b, 0))} sur {gapPlus.length} · −{short(Math.abs(gapMinus.reduce((a, b) => a + b, 0)))} sur {gapMinus.length}</div></div>
        <div className="px-[15px] py-3"><div className="eyebrow">Part engagee</div><div className="mt-1 text-[21px] font-bold tabular-nums">{pct(totalSpent, totalBudget)} %</div><div className="hint">{short(totalSpent)} sur {contracted.length} projet{contracted.length > 1 ? "s" : ""}</div></div>
      </div>

        {rows.length > 0 && (
          <div className={`grid gap-4 pb-2 ${buckets.length === 1 ? "max-w-md" : "min-w-[1180px] grid-cols-5"}`}>
            {buckets.map((b) => {
              const bBudget = b.rows.reduce((t, r) => t + Number(r.p.budget), 0), bAlerts = b.rows.filter(alertOf).length;
              return (
                <div key={b.value} className="min-w-0 border-b-2 border-line pb-2">
                  <div className="flex items-center gap-2"><CategoryIcon category={b.value} className="h-5 w-5" tone="brand" /><h2 className="text-[12.5px] font-bold text-ink">{b.label}</h2></div>
                  <div className="mt-1 text-[17px] font-bold tabular-nums text-ink">{short(bBudget)}</div>
                  <div className="text-[10.5px] text-ink-muted">{b.rows.length} projet{b.rows.length > 1 ? "s" : ""} · <span className={bAlerts ? "font-semibold text-brand" : ""}>{bAlerts} en alerte</span></div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      <div className="pt-3">
      {rows.length === 0 ? (
        <Empty title={q || sp.category || sp.status || sp.manager ? "Aucun projet ne correspond" : "Aucun projet"} hint={canEdit(profile) && !q ? "Creez votre premier projet." : undefined} action={canEdit(profile) && !q ? { href: "/projects/new", label: "Creer un projet" } : undefined} />
      ) : (
        <div className={`grid gap-4 ${buckets.length === 1 ? "max-w-md" : "min-w-[1180px] grid-cols-5"}`}>
          {buckets.map((b) => (
            <section key={b.value} className="min-w-0 space-y-3">
              {b.rows.map((r) => <ProjectCard key={r.p.id} row={r} favorite={favorites.has(r.p.id)} />)}
              {canEdit(profile) && <Link href="/projects/new" className="block rounded-lg border border-dashed border-line px-3 py-3 text-[10.5px] font-semibold text-ink-muted hover:border-ink-muted hover:text-ink">+ Nouveau projet</Link>}
            </section>
          ))}
        </div>
      )}
      </div>
    </>
  );
}
