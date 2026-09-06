import Link from "next/link";
import { CategoryIcon, Empty, PageHeader } from "@/components/ui";
import { Icon } from "@/components/icons";
import { pct } from "@/lib/format";
import { HEALTH_LABELS, projectHealth } from "@/lib/health";
import { canEdit, requireProfile } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { ViewToggle } from "./ViewToggle";
import { PROJECT_CATEGORIES, PROJECT_STATUS_LABELS, type Project, type ProjectStats } from "@/lib/types";

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
  const [{ data: projects }, { data: stats }, { data: taskRows }] = await Promise.all([
    query, supabase.from("project_stats").select("*"), supabase.from("tasks").select("id,project_id,parent_id,budget,customs,vat"),
  ]);
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
  rows.sort((a, b) => { const ka = key(a), kb = key(b); return (ka < kb ? -1 : ka > kb ? 1 : 0) * (dir === "asc" ? 1 : -1); });

  const totalBudget = rows.reduce((t, r) => t + Number(r.p.budget), 0);
  const totalSpent = rows.reduce((t, r) => t + Number(r.s?.spent ?? 0), 0);
  const buckets = PROJECT_CATEGORIES.map((c) => ({ ...c, rows: rows.filter((r) => r.p.category === c.value) })).filter((b) => !sp.category || b.value === sp.category);
  const year = new Date().getFullYear();
  const short = (v: number) => (Math.abs(v) >= 1e9 ? `${(v / 1e9).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} Md FCFA` : Math.abs(v) >= 1e6 ? `${Math.round(v / 1e6).toLocaleString("fr-FR")} M FCFA` : `${Math.round(v / 1e3).toLocaleString("fr-FR")} k FCFA`);
  const wk = (iso: string) => { const d = new Date(iso + "T00:00:00Z"); const day = d.getUTCDay() || 7; d.setUTCDate(d.getUTCDate() + 4 - day); const y0 = new Date(Date.UTC(d.getUTCFullYear(), 0, 1)); const n = Math.ceil(((d.getTime() - y0.getTime()) / 86400000 + 1) / 7); const y = d.getUTCFullYear(); return `S${n}${y !== year ? `/${y}` : ""}`; };
  const STATUS_SHORT: Record<string, string> = { plan: "Planification", cadrage: "Cadrage", approuve: "Approuve", engage: "Engage", execution: "Execution", cloture: "Cloture", hors_perimetre: "Hors perimetre" };
  const rebuiltOf = (r: typeof rows[number]) => (Number(r.s?.task_count ?? 0) > 0 ? Number(r.s?.rebuilt_cost ?? 0) : null);
  const alertOf = (r: typeof rows[number]) => { const rb = rebuiltOf(r), b = Number(r.p.budget); return r.health === "bad" || (b > 0 && rb !== null && rb > b * 1.05) || (b > 0 && Number(r.s?.spent ?? 0) > b); };
  const allRows = rows; const nProj = allRows.length;
  const totalTtc = allRows.reduce((t, r) => t + (ttc.get(r.p.id) ?? 0), 0), totalRebuilt = allRows.reduce((t, r) => t + Number(r.s?.rebuilt_cost ?? 0), 0);
  const gaps = allRows.filter((r) => rebuiltOf(r) !== null && Number(r.p.budget) > 0).map((r) => (rebuiltOf(r) ?? 0) - Number(r.p.budget));
  const totalGap = gaps.reduce((a, b) => a + b, 0);
  const gapPlus = gaps.filter((g) => g > 0), gapMinus = gaps.filter((g) => g < 0);
  const contracted = allRows.filter((r) => Number(r.s?.spent ?? 0) > 0);
  return (
    <>
      <PageHeader title="Projets" subtitle="Pilotage du portefeuille de projets" actions={<>
          <form action="/projects" className="relative"><Icon name="search" className="pointer-events-none absolute left-2.5 top-2 h-3.5 w-3.5 text-ink-faint" /><input name="q" defaultValue={q} placeholder="Rechercher…" className="input !w-48 !pl-8" />{q && <Link href="/projects" className="absolute right-2 top-1.5 text-ink-faint hover:text-ink" aria-label="Effacer">×</Link>}</form>
          <ViewToggle view="list" />{canEdit(profile) && <Link href="/projects/new" className="btn-primary">+ Nouveau projet</Link>}</>} />
      <div className="card mb-4 grid grid-cols-2 divide-line-hair md:grid-cols-4 md:divide-x">
        <div className="px-[15px] py-3"><div className="eyebrow">Cout total TTC</div><div className="mt-1 text-[21px] font-bold tabular-nums text-brand">{short(totalTtc)}</div><div className="hint">{nProj} projets</div></div>
        <div className="px-[15px] py-3"><div className="eyebrow">Enveloppes approuvees</div><div className="mt-1 text-[21px] font-bold tabular-nums">{short(totalBudget)}</div><div className="hint">Cout reconstitue HTVA {short(totalRebuilt)}</div></div>
        <div className="px-[15px] py-3"><div className="eyebrow">Ecart au budget approuve</div><div className={`mt-1 text-[21px] font-bold tabular-nums ${totalGap > 0 ? "text-brand" : ""}`}>{totalGap > 0 ? "+" : "−"}{short(Math.abs(totalGap))}</div><div className="hint">+{short(gapPlus.reduce((a, b) => a + b, 0))} sur {gapPlus.length} · −{short(Math.abs(gapMinus.reduce((a, b) => a + b, 0)))} sur {gapMinus.length}</div></div>
        <div className="px-[15px] py-3"><div className="eyebrow">Part engagee</div><div className="mt-1 text-[21px] font-bold tabular-nums">{pct(totalSpent, totalBudget)} %</div><div className="hint">{short(totalSpent)} sur {contracted.length} projet{contracted.length > 1 ? "s" : ""}</div></div>
      </div>

      {rows.length === 0 ? (
        <Empty title={q || sp.category || sp.status || sp.manager ? "Aucun projet ne correspond" : "Aucun projet"} hint={canEdit(profile) && !q ? "Creez votre premier projet." : undefined} action={canEdit(profile) && !q ? { href: "/projects/new", label: "Creer un projet" } : undefined} />
      ) : (
        <div className="overflow-x-auto pb-2">
          <div className={`grid gap-4 ${buckets.length === 1 ? "max-w-md" : "min-w-[1180px] grid-cols-5"}`}>
            {buckets.map((b) => {
              const bBudget = b.rows.reduce((t, r) => t + Number(r.p.budget), 0), bAlerts = b.rows.filter(alertOf).length;
              return (
                <section key={b.value} className="min-w-0">
                  <div className="border-b border-line-hair pb-2">
                    <div className="flex items-center gap-2"><CategoryIcon category={b.value} className="h-5 w-5" tone="brand" /><h2 className="text-[12.5px] font-bold text-ink">{b.label}</h2></div>
                    <div className="mt-1.5 text-[17px] font-bold tabular-nums text-ink">{short(bBudget)}</div>
                    <div className="text-[10.5px] text-ink-muted">{b.rows.length} projet{b.rows.length > 1 ? "s" : ""} · <span className={bAlerts ? "font-semibold text-brand" : ""}>{bAlerts} en alerte</span></div>
                  </div>
                  <div className="mt-3 space-y-3">
                    {b.rows.map(({ p, s, health }) => {
                      const budget = Number(p.budget), cost = rebuiltOf({ p, s, health }), progress = Number(s?.progress ?? 0), late = Number(s?.late_count ?? 0);
                      const diff = cost !== null && budget > 0 ? Math.round(((cost - budget) / budget) * 100) : null;
                      const alert = alertOf({ p, s, health });
                      const overShare = cost !== null && cost > budget && cost > 0 ? ((cost - budget) / cost) * 100 : 0;
                      const started = progress > 0 || p.status === "execution" || p.status === "engage";
                      return (
                        <Link key={p.id} href={`/projects/${p.id}`} className="card block px-[13px] pb-3 pt-[11px] transition-colors hover:border-line hover:bg-surface-alt">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[10.5px] font-bold text-ink">{p.code}</span>
                            {alert ? <span className="flex h-4 w-4 items-center justify-center rounded-[3px] bg-brand text-[10px] font-bold leading-none text-surface" title={HEALTH_LABELS[health]}>!</span>
                              : late > 0 ? <span className="flex h-4 min-w-4 items-center justify-center rounded-[3px] bg-accent px-1 text-[10px] font-bold leading-none text-ink" title={`${late} tache${late > 1 ? "s" : ""} en retard`}>{late}</span> : null}
                          </div>
                          <div className="mt-2 min-h-[36px] text-[12.5px] font-semibold leading-snug text-ink">{p.name}</div>
                          <div className="mt-3 flex items-baseline gap-2 text-[10px]">
                            <span className="text-[12.5px] font-bold tabular-nums text-ink" title={cost !== null ? `Cout reconstitue HTVA ${short(cost)}` : undefined}>{short(budget)}</span>
                            {diff === null ? <span className="text-ink-faint">sans taches</span> : Math.abs(diff) < 1 ? <span className="font-semibold text-ink-muted">au budget</span> : <span className={`font-semibold tabular-nums ${diff > 0 ? "text-brand" : "text-ink-muted"}`}>{diff > 0 ? "+" : "−"}{Math.abs(diff)} %</span>}
                            <span className="ml-auto whitespace-nowrap tabular-nums text-ink-faint">{wk(p.start_date)} → {wk(p.end_date)}</span>
                          </div>
                          <div className="relative mt-1.5 h-[4px] w-full overflow-hidden rounded-sm" style={{ backgroundImage: started ? undefined : "repeating-linear-gradient(135deg, #374151 0 3px, transparent 3px 6px)", backgroundColor: started ? "#e7e7e7" : undefined }}>
                            {started && <div className="absolute inset-y-0 left-0 bg-ink" style={{ width: `${Math.max(2, progress)}%` }} />}
                            {overShare > 0 && <div className="absolute inset-y-0 right-0 bg-brand" style={{ width: `${Math.max(3, Math.min(60, overShare))}%` }} />}
                          </div>
                          <div className="mt-2 text-[10.5px] font-semibold text-ink-body">{STATUS_SHORT[p.status] ?? PROJECT_STATUS_LABELS[p.status]}</div>
                        </Link>
                      );
                    })}
                    {canEdit(profile) && <Link href="/projects/new" className="block rounded-lg border border-dashed border-line px-3 py-3 text-[10.5px] font-semibold text-ink-muted hover:border-ink-muted hover:text-ink">+ Nouveau projet</Link>}
                  </div>
                </section>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}
