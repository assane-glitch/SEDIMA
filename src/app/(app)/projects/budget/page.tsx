import Link from "next/link";
import { Badge, CategoryIcon, PageHeader, Stat } from "@/components/ui";
import { ViewToggle } from "../ViewToggle";
import { formatMoney, pct } from "@/lib/format";
import { requireProfile } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { PROJECT_CATEGORIES, PROJECT_STATUS_LABELS, PROJECT_STATUS_TONE, type Project, type ProjectStats, type ProjectStatus } from "@/lib/types";

export const metadata = { title: "Budget portefeuille" };
type Params = { category?: string; status?: string; sort?: string; dir?: string };
const SORTS = ["code", "budget", "rebuilt", "spent", "rest", "consumed", "progress", "gap"] as const;
const k = (v: number) => (v ? new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(Math.round(v / 1000)) : "—");

export default async function PortfolioBudgetPage({ searchParams }: { searchParams: Promise<Params> }) {
  const sp = await searchParams;
  await requireProfile();
  const supabase = await createClient();
  let query = supabase.from("projects").select("*").neq("status", "hors_perimetre");
  if (sp.category) query = query.eq("category", sp.category);
  if (sp.status) query = query.eq("status", sp.status);
  const [{ data: projects }, { data: stats }, { data: years }] = await Promise.all([query, supabase.from("project_stats").select("*"), supabase.from("project_budget_years").select("project_id,year,amount")]);
  const statMap = new Map(((stats ?? []) as ProjectStats[]).map((s) => [s.project_id, s]));
  const yearList = Array.from(new Set((years ?? []).map((y) => Number(y.year)))).sort();
  const yearMap = new Map<string, Map<number, number>>();
  for (const y of years ?? []) { const m = yearMap.get(y.project_id) ?? new Map(); m.set(Number(y.year), Number(y.amount)); yearMap.set(y.project_id, m); }
  const rows = ((projects ?? []) as Project[]).map((p) => {
    const s = statMap.get(p.id), budget = Number(p.budget), spent = Number(s?.spent ?? 0), progress = Number(s?.progress ?? 0);
    const consumed = budget > 0 ? Math.round((spent / budget) * 100) : 0;
    return { p, budget, rebuilt: Number(s?.rebuilt_cost ?? 0), spent, rest: budget - spent, consumed, progress, gap: consumed - progress, years: yearMap.get(p.id) ?? new Map<number, number>() };
  });
  const sort = (SORTS as readonly string[]).includes(sp.sort ?? "") ? sp.sort! : "code";
  const dir = sp.dir === "asc" ? "asc" : sp.dir === "desc" ? "desc" : sort === "code" ? "asc" : "desc";
  rows.sort((a, b) => { const ka = sort === "code" ? a.p.code : (a as Record<string, unknown>)[sort] as number, kb = sort === "code" ? b.p.code : (b as Record<string, unknown>)[sort] as number; return (ka < kb ? -1 : ka > kb ? 1 : 0) * (dir === "asc" ? 1 : -1); });
  const tot = rows.reduce((t, r) => ({ budget: t.budget + r.budget, rebuilt: t.rebuilt + r.rebuilt, spent: t.spent + r.spent, kpmg: t.kpmg + Number(r.p.budget_kpmg ?? 0) }), { budget: 0, rebuilt: 0, spent: 0, kpmg: 0 });
  const totYears = new Map<number, number>(); for (const r of rows) for (const [y, v] of r.years) totYears.set(y, (totYears.get(y) ?? 0) + v);
  const cur = rows[0]?.p.currency ?? "XOF";
  const link = (patch: Partial<Params>) => { const u = new URLSearchParams(); for (const [kk, v] of Object.entries({ ...sp, ...patch })) if (v) u.set(kk, v); const s = u.toString(); return `/projects/budget${s ? `?${s}` : ""}`; };
  const Th = ({ col, children, className = "" }: { col: typeof SORTS[number]; children: React.ReactNode; className?: string }) => {
    const active = sort === col, next = active && dir === "desc" ? "asc" : "desc";
    return <th className={className}><Link href={link({ sort: col, dir: col === "code" && !active ? "asc" : next })} className={`inline-flex items-center gap-1 whitespace-nowrap hover:text-ink ${active ? "text-ink" : ""}`}>{children}{active && <span>{dir === "asc" ? "▲" : "▼"}</span>}</Link></th>;
  };

  return (
    <>
      <PageHeader title="Budget du portefeuille" subtitle="Budget, engagement et tranches annuelles de tous les projets. Montants en k F CFA." actions={<ViewToggle view="budget" />} />
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Stat label="Budget total" value={formatMoney(tot.budget, cur)} hint={tot.kpmg ? `Ref. KPMG : ${formatMoney(tot.kpmg, cur)}` : undefined} />
        <Stat label="Cout reconstitue" value={formatMoney(tot.rebuilt, cur)} hint={`${tot.rebuilt > tot.budget ? "+" : ""}${formatMoney(tot.rebuilt - tot.budget, cur)} vs budget`} tone={tot.rebuilt > tot.budget ? "warn" : "default"} />
        <Stat label="Engage" value={formatMoney(tot.spent, cur)} hint={`${pct(tot.spent, tot.budget)} % du budget`} />
        <Stat label="Reste a engager" value={formatMoney(tot.budget - tot.spent, cur)} tone={tot.budget - tot.spent < 0 ? "bad" : "default"} />
        <Stat label="Projets" value={rows.length} hint={`${rows.filter((r) => r.spent > r.budget && r.budget > 0).length} en depassement`} />
      </div>
      <div className="mb-3 flex flex-wrap items-center gap-1.5">
        <Link href={link({ category: undefined })} className={`filter-chip ${!sp.category ? "filter-chip-active" : ""}`}>Toutes les categories</Link>
        {PROJECT_CATEGORIES.map((c) => <Link key={c.value} href={link({ category: c.value })} className={`filter-chip ${sp.category === c.value ? "filter-chip-active" : ""}`}><CategoryIcon category={c.value} className={`h-3.5 w-3.5 ${sp.category === c.value ? "invert" : ""}`} />{c.label}</Link>)}
        <span className="mx-1 h-4 w-px bg-line-hair" />
        <Link href={link({ status: undefined })} className={`filter-chip ${!sp.status ? "filter-chip-active" : ""}`}>Tous les statuts</Link>
        {(Object.keys(PROJECT_STATUS_LABELS) as ProjectStatus[]).filter((s) => s !== "hors_perimetre").map((s) => <Link key={s} href={link({ status: s })} className={`filter-chip ${sp.status === s ? "filter-chip-active" : ""}`}>{PROJECT_STATUS_LABELS[s]}</Link>)}
      </div>
      <div className="card overflow-x-auto">
        <table className="tbl">
          <thead>
            <tr>
              <Th col="code">Projet</Th><th className="hidden md:table-cell">Statut</th>
              <Th col="budget" className="num">Budget</Th><Th col="rebuilt" className="num hidden lg:table-cell">Reconstitue</Th>
              <Th col="spent" className="num">Engage</Th><Th col="rest" className="num">Reste</Th>
              <Th col="consumed" className="num">Consomme</Th><Th col="progress" className="num hidden md:table-cell">Avanc.</Th><Th col="gap" className="num hidden md:table-cell">Ecart</Th>
              {yearList.map((y) => <th key={y} className="num hidden xl:table-cell">{y}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.p.id}>
                <td className="whitespace-nowrap"><Link href={`/projects/${r.p.id}/budget`} className="flex items-center gap-2 hover:underline"><CategoryIcon category={r.p.category} className="h-4 w-4 opacity-80" /><span className="font-semibold">{r.p.code}</span><span className="hidden max-w-[260px] truncate text-ink-muted lg:inline">{r.p.name}</span></Link></td>
                <td className="hidden md:table-cell"><Badge tone={PROJECT_STATUS_TONE[r.p.status]}>{PROJECT_STATUS_LABELS[r.p.status]}</Badge></td>
                <td className="num font-semibold" title={formatMoney(r.budget, cur)}>{k(r.budget)}</td>
                <td className={`num hidden lg:table-cell ${r.rebuilt > r.budget && r.budget > 0 ? "text-warn" : "text-ink-muted"}`} title={formatMoney(r.rebuilt, cur)}>{k(r.rebuilt)}</td>
                <td className="num" title={formatMoney(r.spent, cur)}>{k(r.spent)}</td>
                <td className={`num ${r.rest < 0 ? "font-bold text-alert" : ""}`}>{r.budget || r.spent ? k(r.rest) : "—"}</td>
                <td className={`num ${r.consumed > 100 ? "font-bold text-alert" : ""}`}>{r.budget ? `${r.consumed} %` : "—"}</td>
                <td className="num hidden md:table-cell">{r.progress} %</td>
                <td className={`num hidden md:table-cell ${r.budget === 0 ? "text-ink-faint" : r.gap > 15 ? "font-semibold text-alert" : r.gap > 5 ? "text-warn" : "text-ok"}`} title="Consomme moins avancement">{r.budget ? `${r.gap > 0 ? "+" : ""}${r.gap} pt` : ""}</td>
                {yearList.map((y) => <td key={y} className="num hidden text-ink-muted xl:table-cell">{k(r.years.get(y) ?? 0)}</td>)}
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={9 + yearList.length} className="!py-8 text-center text-ink-faint">Aucun projet.</td></tr>}
          </tbody>
          {rows.length > 0 && (
            <tfoot>
              <tr className="font-bold">
                <td className="!border-t !border-line px-2 py-[6px]">Total · {rows.length} projets</td><td className="hidden !border-t !border-line md:table-cell" />
                <td className="num !border-t !border-line">{k(tot.budget)}</td><td className="num hidden !border-t !border-line lg:table-cell">{k(tot.rebuilt)}</td>
                <td className="num !border-t !border-line">{k(tot.spent)}</td><td className="num !border-t !border-line">{k(tot.budget - tot.spent)}</td>
                <td className="num !border-t !border-line">{tot.budget ? `${pct(tot.spent, tot.budget)} %` : "—"}</td><td className="hidden !border-t !border-line md:table-cell" /><td className="hidden !border-t !border-line md:table-cell" />
                {yearList.map((y) => <td key={y} className="num hidden !border-t !border-line xl:table-cell">{k(totYears.get(y) ?? 0)}</td>)}
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </>
  );
}
