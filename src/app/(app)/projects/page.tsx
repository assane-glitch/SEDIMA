import Link from "next/link";
import { Badge, CategoryIcon, Empty, PageHeader, ProgressBar } from "@/components/ui";
import { Icon } from "@/components/icons";
import { formatDate, formatMoney, pct } from "@/lib/format";
import { HEALTH_DOT, HEALTH_LABELS, projectHealth } from "@/lib/health";
import { canEdit, requireProfile } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { ViewToggle } from "./ViewToggle";
import { PROJECT_CATEGORIES, PROJECT_STATUS_LABELS, PROJECT_STATUS_TONE, type Profile, type Project, type ProjectStats } from "@/lib/types";

export const metadata = { title: "Projets" };

type Params = { q?: string; category?: string; status?: string; manager?: string; sort?: string; dir?: string };
const SORTS = ["name", "start_date", "end_date", "progress", "budget", "spent", "status"] as const;

export default async function ProjectsPage({ searchParams }: { searchParams: Promise<Params> }) {
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const sort = (SORTS as readonly string[]).includes(sp.sort ?? "") ? sp.sort! : "start_date";
  const dir = sp.dir === "asc" ? "asc" : sp.dir === "desc" ? "desc" : sort === "name" ? "asc" : "desc";
  const profile = await requireProfile();
  const supabase = await createClient();
  let query = supabase.from("projects").select("*");
  if (sp.category) query = query.eq("category", sp.category);
  if (sp.status) query = query.eq("status", sp.status);
  if (sp.manager) query = query.eq("manager_id", sp.manager);
  if (q) query = query.or(`name.ilike.%${q.replace(/[%,()]/g, "")}%,code.ilike.%${q.replace(/[%,()]/g, "")}%`);
  const [{ data: projects }, { data: stats }, { data: people }] = await Promise.all([
    query, supabase.from("project_stats").select("*"), supabase.from("profiles").select("id,email,full_name,role").order("full_name"),
  ]);
  const statMap = new Map(((stats ?? []) as ProjectStats[]).map((s) => [s.project_id, s]));
  const peopleList = (people ?? []) as Profile[];
  const peopleMap = new Map(peopleList.map((p) => [p.id, p]));
  const rows = ((projects ?? []) as Project[]).map((p) => ({ p, s: statMap.get(p.id), health: projectHealth(p, statMap.get(p.id)) }));
  const key = (r: typeof rows[number]) => {
    switch (sort) {
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
  const managers = peopleList.filter((x) => x.role === "admin" || x.role === "manager");
  const link = (patch: Partial<Params>) => {
    const u = new URLSearchParams();
    const merged = { ...sp, ...patch } as Record<string, string | undefined>;
    for (const [k, v] of Object.entries(merged)) if (v) u.set(k, v);
    const s = u.toString();
    return `/projects${s ? `?${s}` : ""}`;
  };
  const SORT_LABELS: Record<typeof SORTS[number], string> = { name: "Nom", start_date: "Date de debut", end_date: "Date de fin", progress: "Avancement", budget: "Budget", spent: "Depense", status: "Statut" };
  const buckets = PROJECT_CATEGORIES.map((c) => ({ ...c, rows: rows.filter((r) => r.p.category === c.value) })).filter((b) => b.rows.length > 0);
  return (
    <>
      <PageHeader title="Projets" subtitle={`${rows.length} projet${rows.length > 1 ? "s" : ""} · budget ${formatMoney(totalBudget)} · depense ${formatMoney(totalSpent)} (${pct(totalSpent, totalBudget)} %)`}
        actions={<><ViewToggle view="list" />{canEdit(profile) && <Link href="/projects/new" className="btn-primary">+ Nouveau projet</Link>}</>} />

      <form className="mb-3 flex flex-wrap items-center gap-2" action="/projects">
        {sp.category && <input type="hidden" name="category" value={sp.category} />}
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Icon name="search" className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-ink-faint" />
          <input name="q" defaultValue={q} placeholder="Rechercher un projet ou un code" className="input !pl-9" />
        </div>
        <select name="status" defaultValue={sp.status ?? ""} className="input !w-auto">
          <option value="">Tous les statuts</option>
          {Object.entries(PROJECT_STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <select name="manager" defaultValue={sp.manager ?? ""} className="input !w-auto">
          <option value="">Tous les chefs de projet</option>
          {managers.map((m) => <option key={m.id} value={m.id}>{m.full_name || m.email}</option>)}
        </select>
        <select name="sort" defaultValue={sort} className="input !w-auto">{SORTS.map((k) => <option key={k} value={k}>Trier par {SORT_LABELS[k].toLowerCase()}</option>)}</select>
        <select name="dir" defaultValue={dir} className="input !w-auto"><option value="asc">Croissant</option><option value="desc">Decroissant</option></select>
        <button className="btn-secondary">Filtrer</button>
        {(q || sp.status || sp.manager || sp.category) && <Link href="/projects" className="text-[10px] text-ink-muted hover:text-ink">Effacer</Link>}
      </form>
      <div className="mb-4 flex flex-wrap gap-2">
        <Link href={link({ category: undefined })} className={`filter-chip ${!sp.category ? "filter-chip-active" : ""}`}>Toutes les categories</Link>
        {PROJECT_CATEGORIES.map((c) => (
          <Link key={c.value} href={link({ category: c.value })} className={`filter-chip ${sp.category === c.value ? "filter-chip-active" : ""}`}>
            <CategoryIcon category={c.value} className={`h-3.5 w-3.5 ${sp.category === c.value ? "invert" : ""}`} />{c.label}
          </Link>
        ))}
      </div>

      {rows.length === 0 ? (
        <Empty title={q || sp.category || sp.status || sp.manager ? "Aucun projet ne correspond" : "Aucun projet"} hint={canEdit(profile) && !q ? "Creez votre premier projet." : undefined} action={canEdit(profile) && !q ? { href: "/projects/new", label: "Creer un projet" } : undefined} />
      ) : (
        <div className="space-y-6">
          {buckets.map((b) => {
            const bBudget = b.rows.reduce((t, r) => t + Number(r.p.budget), 0), bSpent = b.rows.reduce((t, r) => t + Number(r.s?.spent ?? 0), 0), bLate = b.rows.reduce((t, r) => t + Number(r.s?.late_count ?? 0), 0);
            return (
              <section key={b.value}>
                <div className="mb-2 flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-line-hair pb-1.5">
                  <div className="flex items-center gap-2"><CategoryIcon category={b.value} className="h-5 w-5 opacity-80" /><h2 className="text-[13.5px] font-bold text-ink">{b.label}</h2><span className="text-[10.5px] text-ink-faint">{b.rows.length} projet{b.rows.length > 1 ? "s" : ""}</span></div>
                  <div className="ml-auto flex items-center gap-3 text-[10.5px] text-ink-muted tabular-nums"><span>Budget <span className="font-semibold text-ink">{formatMoney(bBudget)}</span></span><span>Engage <span className="font-semibold text-ink">{formatMoney(bSpent)}</span> ({pct(bSpent, bBudget)} %)</span>{bLate > 0 && <span className="font-semibold text-alert">{bLate} retard{bLate > 1 ? "s" : ""}</span>}</div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                  {b.rows.map(({ p, s, health }) => {
                    const budget = Number(p.budget), spent = Number(s?.spent ?? 0), progress = Number(s?.progress ?? 0), over = spent > budget && budget > 0;
                    const manager = p.manager_id ? peopleMap.get(p.manager_id) : undefined;
                    return (
                      <Link key={p.id} href={`/projects/${p.id}`} className="card flex flex-col gap-2.5 px-[15px] pb-[13px] pt-[12px] transition-colors hover:border-line hover:bg-surface-alt">
                        <div className="flex items-center gap-2">
                          <span className={`dot ${HEALTH_DOT[health]}`} title={HEALTH_LABELS[health]} />
                          <span className="font-mono text-[10px] font-semibold text-ink-muted">{p.code}</span>
                          <span className="ml-auto"><Badge tone={PROJECT_STATUS_TONE[p.status]}>{PROJECT_STATUS_LABELS[p.status]}</Badge></span>
                        </div>
                        <div className="min-h-[34px] text-[12.5px] font-bold leading-snug text-ink">{p.name}</div>
                        <div className="flex items-center justify-between gap-2 text-[10px] text-ink-muted">
                          <span className="truncate">{manager?.full_name || manager?.email || p.manager_name || "Chef de projet a designer"}</span>
                          <span className="shrink-0 tabular-nums">{formatDate(p.start_date)} → {formatDate(p.end_date)}</span>
                        </div>
                        <div>
                          <div className="mb-1 flex items-center justify-between text-[10px]"><span className="text-ink-faint">Avancement</span><span className="font-semibold tabular-nums">{progress} %</span></div>
                          <ProgressBar value={progress} tone={health === "bad" ? "bad" : health === "warn" ? "warn" : "good"} />
                        </div>
                        <div>
                          <div className="mb-1 flex items-center justify-between text-[10px]"><span className="text-ink-faint">Engage / budget</span><span className={`tabular-nums ${over ? "font-semibold text-alert" : ""}`}>{formatMoney(spent, p.currency)} <span className="text-ink-faint">/ {formatMoney(budget, p.currency)}</span></span></div>
                          <div className="relative h-[5px] w-full overflow-hidden rounded-full bg-line-light"><div className={`absolute inset-y-0 left-0 rounded-full ${over ? "bg-alert" : "bg-ink-muted"}`} style={{ width: `${Math.min(100, pct(spent, budget))}%` }} /></div>
                        </div>
                        <div className="flex items-center gap-3 text-[10px] text-ink-faint">
                          <span>{Number(s?.task_count ?? 0)} tache{Number(s?.task_count ?? 0) > 1 ? "s" : ""}</span>
                          {Number(s?.late_count) > 0 && <span className="font-semibold text-alert">{s!.late_count} en retard</span>}
                          {s?.next_milestone && <span className="ml-auto">Jalon {formatDate(s.next_milestone)}</span>}
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </>
  );
}
