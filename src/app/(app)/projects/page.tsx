import Link from "next/link";
import { Badge, CategoryIcon, Empty, PageHeader, ProgressBar } from "@/components/ui";
import { Icon } from "@/components/icons";
import { formatDate, formatMoney, pct } from "@/lib/format";
import { HEALTH_DOT, HEALTH_LABELS, projectHealth } from "@/lib/health";
import { canEdit, requireProfile } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { CATEGORY_LABELS, PROJECT_CATEGORIES, PROJECT_STATUS_LABELS, PROJECT_STATUS_TONE, type Profile, type Project, type ProjectStats } from "@/lib/types";

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
  const chip = (active: boolean) => `inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs ${active ? "border-ink-900 bg-ink-900 text-white" : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"}`;
  const Th = ({ col, children, className = "" }: { col: typeof SORTS[number]; children: React.ReactNode; className?: string }) => {
    const active = sort === col;
    const nextDir = active && dir === "asc" ? "desc" : active && dir === "desc" ? "asc" : col === "name" ? "asc" : "desc";
    return (
      <th className={`px-4 py-2 ${className}`}>
        <Link href={link({ sort: col, dir: nextDir })} className={`inline-flex items-center gap-1 hover:text-slate-900 ${active ? "text-slate-900" : ""}`}>
          {children}{active && <span className="text-[10px]">{dir === "asc" ? "▲" : "▼"}</span>}
        </Link>
      </th>
    );
  };

  return (
    <>
      <PageHeader title="Projets" subtitle={`${rows.length} projet${rows.length > 1 ? "s" : ""} · budget ${formatMoney(totalBudget)} · depense ${formatMoney(totalSpent)} (${pct(totalSpent, totalBudget)} %)`}
        actions={canEdit(profile) && <Link href="/projects/new" className="btn-primary"><Icon name="plus" className="h-4 w-4" />Nouveau projet</Link>} />

      <form className="mb-3 flex flex-wrap items-center gap-2" action="/projects">
        {sp.category && <input type="hidden" name="category" value={sp.category} />}
        {sp.sort && <input type="hidden" name="sort" value={sp.sort} />}
        {sp.dir && <input type="hidden" name="dir" value={sp.dir} />}
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Icon name="search" className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
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
        <button className="btn-secondary">Filtrer</button>
        {(q || sp.status || sp.manager || sp.category) && <Link href="/projects" className="text-xs text-slate-500 hover:text-slate-900">Effacer</Link>}
      </form>
      <div className="mb-4 flex flex-wrap gap-2">
        <Link href={link({ category: undefined })} className={chip(!sp.category)}>Toutes les categories</Link>
        {PROJECT_CATEGORIES.map((c) => (
          <Link key={c.value} href={link({ category: c.value })} className={chip(sp.category === c.value)}>
            <CategoryIcon category={c.value} className={`h-3.5 w-3.5 ${sp.category === c.value ? "invert" : ""}`} />{c.label}
          </Link>
        ))}
      </div>

      {rows.length === 0 ? (
        <Empty title={q || sp.category || sp.status || sp.manager ? "Aucun projet ne correspond" : "Aucun projet"} hint={canEdit(profile) && !q ? "Creez votre premier projet." : undefined} action={canEdit(profile) && !q ? { href: "/projects/new", label: "Creer un projet" } : undefined} />
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <Th col="name">Projet</Th>
                <th className="hidden px-4 py-2 md:table-cell">Chef de projet</th>
                <Th col="end_date" className="hidden md:table-cell">Periode</Th>
                <Th col="progress">Avancement</Th>
                <Th col="budget" className="hidden text-right lg:table-cell">Budget</Th>
                <Th col="spent" className="text-right">Depense</Th>
                <Th col="status" className="hidden md:table-cell">Statut</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map(({ p, s, health }) => {
                const spent = Number(s?.spent ?? 0); const over = spent > Number(p.budget) && Number(p.budget) > 0;
                const manager = p.manager_id ? peopleMap.get(p.manager_id) : undefined;
                return (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <CategoryIcon category={p.category} className="h-7 w-7 shrink-0 opacity-80" />
                        <div className="min-w-0">
                          <Link href={`/projects/${p.id}`} className="font-medium text-ink-900 hover:text-brand-700 hover:underline">{p.name}</Link>
                          <div className="flex items-center gap-1.5 text-xs text-slate-500">
                            <span className={`inline-block h-2 w-2 rounded-full ${HEALTH_DOT[health]}`} title={HEALTH_LABELS[health]} />
                            {p.code} · {CATEGORY_LABELS[p.category]}{s?.late_count ? ` · ${s.late_count} en retard` : ""}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="hidden px-4 py-3 md:table-cell">{manager?.full_name || manager?.email || p.manager_name || "—"}</td>
                    <td className="hidden whitespace-nowrap px-4 py-3 text-slate-600 md:table-cell">{formatDate(p.start_date)} → {formatDate(p.end_date)}</td>
                    <td className="px-4 py-3"><div className="flex items-center gap-2"><div className="w-24"><ProgressBar value={Number(s?.progress ?? 0)} tone={health === "bad" ? "bad" : health === "warn" ? "warn" : "good"} /></div><span className="text-xs tabular-nums">{Number(s?.progress ?? 0)} %</span></div></td>
                    <td className="hidden px-4 py-3 text-right tabular-nums lg:table-cell">{formatMoney(Number(p.budget), p.currency)}</td>
                    <td className={`px-4 py-3 text-right tabular-nums ${over ? "font-medium text-brand-700" : ""}`}>{formatMoney(spent, p.currency)}<div className="text-[11px] text-slate-400">{pct(spent, Number(p.budget))} %</div></td>
                    <td className="hidden px-4 py-3 md:table-cell"><Badge tone={PROJECT_STATUS_TONE[p.status]}>{PROJECT_STATUS_LABELS[p.status]}</Badge></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
