import Link from "next/link";
import { Badge, CategoryIcon, Empty, PageHeader, ProgressBar, Stat } from "@/components/ui";
import { formatDate, formatMoney, pct, today } from "@/lib/format";
import { HEALTH_DOT, HEALTH_LABELS, projectHealth, type Health } from "@/lib/health";
import { getLists } from "@/lib/reference";
import { labelOf } from "@/lib/reference-types";
import { canEdit, requireProfile } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { ACTIVE_STATUSES, CATEGORY_LABELS, PROJECT_CATEGORIES, PROJECT_STATUS_LABELS, PROJECT_STATUS_TONE, type Expense, type JournalEntry, type Milestone, type Profile, type Project, type ProjectStats, type RegisterEntry, type Task } from "@/lib/types";

export const metadata = { title: "Tableau de bord" };

const addDays = (iso: string, n: number) => { const d = new Date(iso + "T00:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const isoWeek = (iso: string) => { const d = new Date(iso + "T00:00:00Z"); const day = d.getUTCDay() || 7; d.setUTCDate(d.getUTCDate() + 4 - day); const y0 = new Date(Date.UTC(d.getUTCFullYear(), 0, 1)); return Math.ceil(((d.getTime() - y0.getTime()) / 86400000 + 1) / 7); };
const k = (v: number) => `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(Math.round(v / 1_000_000))} M`;
const ORDER: Record<Health, number> = { bad: 0, warn: 1, good: 2, idle: 3, done: 4 };

export default async function DashboardPage() {
  const profile = await requireProfile();
  const supabase = await createClient();
  const t0 = today();
  const monday = addDays(t0, -((new Date(t0 + "T00:00:00Z").getUTCDay() + 6) % 7)), sunday = addDays(monday, 6), in30 = addDays(t0, 30), ago7 = addDays(t0, -7);
  const [{ data: projects }, { data: stats }, { data: people }, { data: tasks }, { data: ms }, { data: jr }, { data: rg }, { data: ex }, lists] = await Promise.all([
    supabase.from("projects").select("*").neq("status", "hors_perimetre").order("code"),
    supabase.from("project_stats").select("*"),
    supabase.from("profiles").select("id,email,full_name,role"),
    supabase.from("tasks").select("id,project_id,parent_id,wbs_code,name,status,progress,start_date,end_date,responsible_id,responsible_role,budget").order("end_date"),
    supabase.from("milestones").select("*").is("reached_on", null).lte("due_date", in30).order("due_date"),
    supabase.from("journal_entries").select("*").order("created_at", { ascending: false }).limit(6),
    supabase.from("register_entries").select("*").order("created_at", { ascending: false }).limit(6),
    supabase.from("expenses").select("*").order("created_at", { ascending: false }).limit(6),
    getLists(),
  ]);
  const list = (projects ?? []) as Project[];
  const pmap = new Map(list.map((p) => [p.id, p]));
  const statMap = new Map(((stats ?? []) as ProjectStats[]).map((s) => [s.project_id, s]));
  const who = new Map(((people ?? []) as Profile[]).map((p) => [p.id, p.full_name || p.email]));
  const all = (tasks ?? []) as Pick<Task, "id" | "project_id" | "parent_id" | "wbs_code" | "name" | "status" | "progress" | "start_date" | "end_date" | "responsible_id" | "responsible_role" | "budget">[];
  const parents = new Set(all.filter((t) => t.parent_id).map((t) => t.parent_id!));
  const leaves = all.filter((t) => !parents.has(t.id) && pmap.has(t.project_id));
  const activeIds = new Set(list.filter((p) => ACTIVE_STATUSES.includes(p.status)).map((p) => p.id));

  const totalBudget = list.reduce((s, p) => s + Number(p.budget), 0);
  const totalSpent = list.reduce((s, p) => s + Number(statMap.get(p.id)?.spent ?? 0), 0);
  const late = leaves.filter((t) => t.end_date < t0 && t.status !== "done");
  const blocked = leaves.filter((t) => t.status === "blocked");
  const week = leaves.filter((t) => t.start_date <= sunday && t.end_date >= monday && t.status !== "done" && activeIds.has(t.project_id));
  const starting = week.filter((t) => t.start_date >= monday), ending = week.filter((t) => t.end_date <= sunday);
  const mine = leaves.filter((t) => t.responsible_id === profile.id && t.status !== "done");
  const milestones = ((ms ?? []) as Milestone[]).filter((m) => pmap.has(m.project_id));
  const overdueMs = milestones.filter((m) => m.due_date < t0);
  const rows = list.map((p) => ({ p, s: statMap.get(p.id), health: projectHealth(p, statMap.get(p.id)), next: milestones.find((m) => m.project_id === p.id && m.due_date >= t0) }))
    .filter((r) => ACTIVE_STATUSES.includes(r.p.status) || Number(r.s?.late_count ?? 0) > 0 || Number(r.s?.spent ?? 0) > 0)
    .sort((a, b) => ORDER[a.health] - ORDER[b.health] || a.p.code.localeCompare(b.p.code));
  const overBudget = rows.filter((r) => Number(r.s?.spent ?? 0) > Number(r.p.budget) && Number(r.p.budget) > 0);
  const feed = [
    ...((jr ?? []) as JournalEntry[]).map((e) => ({ id: e.id, at: e.created_at, kind: "Journal", tone: "info", pid: e.project_id, who: e.author_id, text: e.content.slice(0, 90), href: `/projects/${e.project_id}/events?type=journal` })),
    ...((rg ?? []) as RegisterEntry[]).map((e) => ({ id: e.id, at: e.created_at, kind: "Registre", tone: "neutral", pid: e.project_id, who: e.author_id, text: labelOf(lists.register_type, e.register_type), href: `/projects/${e.project_id}/events?type=registers` })),
    ...((ex ?? []) as Expense[]).map((e) => ({ id: e.id, at: e.created_at, kind: "Depense", tone: "warn", pid: e.project_id, who: e.created_by, text: `${e.ref} · ${e.description} · ${formatMoney(Number(e.amount), pmap.get(e.project_id)?.currency)}`, href: `/projects/${e.project_id}/events?type=expenses` })),
  ].filter((f) => pmap.has(f.pid)).sort((a, b) => (a.at < b.at ? 1 : -1)).slice(0, 8);
  const feed7 = feed.filter((f) => f.at.slice(0, 10) >= ago7).length;
  const byCat = PROJECT_CATEGORIES.map((c) => { const ps = list.filter((p) => p.category === c.value); return { ...c, n: ps.length, budget: ps.reduce((s, p) => s + Number(p.budget), 0), spent: ps.reduce((s, p) => s + Number(statMap.get(p.id)?.spent ?? 0), 0) }; }).filter((c) => c.n > 0);
  const maxCat = Math.max(1, ...byCat.map((c) => c.budget));
  const taskLine = (t: typeof leaves[number]) => (
    <Link key={t.id} href={`/projects/${t.project_id}/tasks`} className="flex items-center gap-2 px-3 py-1.5 text-[10.5px] hover:bg-surface-alt">
      <span className="w-12 shrink-0 font-semibold">{pmap.get(t.project_id)?.code}</span>
      <span className="min-w-0 flex-1 truncate">{t.wbs_code ? <span className="font-mono text-[9px] text-ink-faint">{t.wbs_code} </span> : null}{t.name}</span>
      <span className={`shrink-0 tabular-nums ${t.end_date < t0 ? "font-semibold text-alert" : "text-ink-muted"}`}>{formatDate(t.end_date)}</span>
    </Link>
  );

  return (
    <>
      <PageHeader title="Tableau de bord" subtitle={`Semaine ${isoWeek(t0)} · ${formatDate(monday)} → ${formatDate(sunday)} · ${list.length} projets, ${activeIds.size} en cours`}
        actions={<><Link href="/projects/planning" className="btn-secondary">Planning</Link><Link href="/projects/budget" className="btn-secondary">Budget</Link>{canEdit(profile) && <Link href="/projects/new" className="btn-primary">+ Nouveau projet</Link>}</>} />
      {list.length === 0 ? (
        <Empty title="Aucun projet pour le moment" hint={canEdit(profile) ? "Creez votre premier projet pour afficher le planning, le budget et l'avancement." : "Un chef de projet doit d'abord creer un projet."} action={canEdit(profile) ? { href: "/projects/new", label: "Creer un projet" } : undefined} />
      ) : (
        <>
          <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
            <Stat label="Budget portefeuille" value={formatMoney(totalBudget)} hint={`${list.length} projets`} />
            <Stat label="Engage" value={formatMoney(totalSpent)} hint={`${pct(totalSpent, totalBudget)} % du budget${overBudget.length ? ` · ${overBudget.length} en depassement` : ""}`} tone={overBudget.length ? "warn" : "default"} />
            <Stat label="Taches en retard" value={late.length} hint={blocked.length ? `${blocked.length} bloquee${blocked.length > 1 ? "s" : ""}` : "aucune bloquee"} tone={late.length ? "bad" : "good"} />
            <Stat label="Cette semaine" value={week.length} hint={`${starting.length} demarrent · ${ending.length} se terminent`} />
            <Stat label="Jalons a 30 jours" value={milestones.length} hint={overdueMs.length ? `${overdueMs.length} depasse${overdueMs.length > 1 ? "s" : ""}` : "aucun depasse"} tone={overdueMs.length ? "warn" : "default"} />
            <Stat label={mine.length ? "Mes taches ouvertes" : "Saisies terrain 7 j"} value={mine.length || feed7} hint={mine.length ? `${mine.filter((t) => t.end_date < t0).length} en retard` : "journal, registres, depenses"} />
          </div>

          <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
            <div className="space-y-4">
              <div className="card overflow-x-auto">
                <div className="flex items-center justify-between px-[15px] pb-2 pt-[13px]"><div className="card-title">Sante des projets <span className="text-[10px] font-normal text-ink-faint">{rows.length} en cours ou a suivre</span></div><Link href="/projects" className="btn-ghost">Tous les projets ({list.length}) ›</Link></div>
                <table className="tbl">
                  <thead><tr><th className="w-6" /><th>Projet</th><th className="hidden md:table-cell">Chef de projet</th><th className="hidden lg:table-cell">Statut</th><th className="w-32">Avancement</th><th className="num">Consomme</th><th className="num hidden md:table-cell">Ecart</th><th className="num">Retard</th><th className="hidden lg:table-cell">Prochain jalon</th></tr></thead>
                  <tbody>
                    {rows.map(({ p, s, health, next }) => {
                      const budget = Number(p.budget), spent = Number(s?.spent ?? 0), progress = Number(s?.progress ?? 0), cons = budget ? Math.round((spent / budget) * 100) : 0, gap = cons - progress;
                      return (
                        <tr key={p.id}>
                          <td><span className={`dot ${HEALTH_DOT[health]}`} title={HEALTH_LABELS[health]} /></td>
                          <td><Link href={`/projects/${p.id}`} className="flex items-center gap-2 hover:underline"><CategoryIcon category={p.category} className="h-4 w-4 shrink-0 opacity-80" /><span className="font-semibold">{p.code}</span><span className="hidden max-w-[240px] truncate text-ink-muted sm:inline">{p.name}</span></Link></td>
                          <td className="hidden max-w-[140px] truncate text-ink-muted md:table-cell">{(p.manager_id && who.get(p.manager_id)) || p.manager_name || "—"}</td>
                          <td className="hidden lg:table-cell"><Badge tone={PROJECT_STATUS_TONE[p.status]}>{PROJECT_STATUS_LABELS[p.status]}</Badge></td>
                          <td><div className="flex items-center gap-2"><div className="w-16"><ProgressBar value={progress} tone={progress >= 100 ? "ok" : undefined} /></div><span className="w-8 text-right tabular-nums">{progress} %</span></div></td>
                          <td className={`num ${cons > 100 ? "font-bold text-alert" : ""}`}>{budget ? `${cons} %` : "—"}</td>
                          <td className={`num hidden md:table-cell ${!budget ? "text-ink-faint" : gap > 15 ? "font-semibold text-alert" : gap > 5 ? "text-warn" : "text-ok"}`}>{budget ? `${gap > 0 ? "+" : ""}${gap} pt` : ""}</td>
                          <td className={`num ${Number(s?.late_count) ? "font-semibold text-alert" : "text-ink-faint"}`}>{Number(s?.late_count ?? 0) || "—"}</td>
                          <td className="hidden whitespace-nowrap text-ink-muted lg:table-cell">{next ? `${formatDate(next.due_date)} · ${next.name}` : "—"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="card">
                  <div className="flex items-center justify-between px-[15px] pb-1 pt-[13px]"><div className="card-title">Cette semaine <span className="text-[10px] font-normal text-ink-faint">S{isoWeek(t0)}</span></div><Link href="/tasks" className="btn-ghost">Toutes les taches ›</Link></div>
                  <div className="divide-y divide-line-light">
                    {week.length === 0 && <div className="px-3 py-6 text-center text-[10.5px] text-ink-faint">Aucune tache planifiee cette semaine.</div>}
                    {starting.length > 0 && <div className="eyebrow px-3 pt-2">Demarrent</div>}{starting.slice(0, 6).map(taskLine)}
                    {ending.length > 0 && <div className="eyebrow px-3 pt-2">Se terminent</div>}{ending.slice(0, 6).map(taskLine)}
                    {week.length > starting.length + ending.length && <div className="eyebrow px-3 pt-2">En cours</div>}{week.filter((t) => !starting.includes(t) && !ending.includes(t)).slice(0, 4).map(taskLine)}
                  </div>
                </div>
                <div className="card">
                  <div className="px-[15px] pb-1 pt-[13px]"><div className="card-title">Budget engage par categorie <span className="text-[10px] font-normal text-ink-faint">M F CFA</span></div></div>
                  <div className="space-y-2.5 px-[15px] pb-4 pt-1">
                    {byCat.map((c) => (
                      <div key={c.value} className="text-[10.5px]">
                        <div className="mb-1 flex items-center gap-2"><CategoryIcon category={c.value} className="h-3.5 w-3.5 opacity-80" /><span className="font-semibold">{CATEGORY_LABELS[c.value]}</span><span className="text-ink-faint">{c.n} projet{c.n > 1 ? "s" : ""}</span><span className="ml-auto tabular-nums">{k(c.spent)} <span className="text-ink-faint">/ {k(c.budget)}</span></span></div>
                        <div className="relative h-[6px] w-full overflow-hidden rounded-full bg-line-light"><div className="absolute inset-y-0 left-0 rounded-full bg-line" style={{ width: `${(c.budget / maxCat) * 100}%` }} /><div className={`absolute inset-y-0 left-0 rounded-full ${c.spent > c.budget ? "bg-alert" : "bg-ink"}`} style={{ width: `${(Math.min(c.spent, c.budget) / maxCat) * 100}%` }} /></div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              {(late.length > 0 || blocked.length > 0 || overBudget.length > 0 || overdueMs.length > 0) && (
                <div className="card">
                  <div className="px-[15px] pb-1 pt-[13px]"><div className="card-title">Alertes</div></div>
                  <div className="divide-y divide-line-light text-[10.5px]">
                    {overBudget.map((r) => <Link key={r.p.id} href={`/projects/${r.p.id}/budget`} className="flex items-center gap-2 px-3 py-1.5 hover:bg-surface-alt"><span className="dot bg-alert" /><span className="font-semibold">{r.p.code}</span><span className="min-w-0 flex-1 truncate">depasse son budget de {formatMoney(Number(r.s?.spent ?? 0) - Number(r.p.budget), r.p.currency)}</span></Link>)}
                    {overdueMs.slice(0, 5).map((m) => <Link key={m.id} href={`/projects/${m.project_id}/planning`} className="flex items-center gap-2 px-3 py-1.5 hover:bg-surface-alt"><span className="dot bg-alert" /><span className="font-semibold">{pmap.get(m.project_id)?.code}</span><span className="min-w-0 flex-1 truncate">jalon « {m.name} » depasse</span><span className="text-ink-muted tabular-nums">{formatDate(m.due_date)}</span></Link>)}
                    {blocked.slice(0, 5).map((t) => <Link key={t.id} href={`/projects/${t.project_id}/tasks`} className="flex items-center gap-2 px-3 py-1.5 hover:bg-surface-alt"><span className="dot bg-warn-dot" /><span className="font-semibold">{pmap.get(t.project_id)?.code}</span><span className="min-w-0 flex-1 truncate">bloquee : {t.name}</span></Link>)}
                    {late.length > 0 && <Link href="/tasks" className="flex items-center gap-2 px-3 py-1.5 hover:bg-surface-alt"><span className="dot bg-alert" /><span className="min-w-0 flex-1 truncate">{late.length} tache{late.length > 1 ? "s" : ""} en retard sur {new Set(late.map((t) => t.project_id)).size} projet{new Set(late.map((t) => t.project_id)).size > 1 ? "s" : ""}</span><span className="text-ink-faint">›</span></Link>}
                  </div>
                </div>
              )}
              <div className="card">
                <div className="flex items-center justify-between px-[15px] pb-1 pt-[13px]"><div className="card-title">Jalons a venir <span className="text-[10px] font-normal text-ink-faint">30 jours</span></div></div>
                <div className="divide-y divide-line-light text-[10.5px]">
                  {milestones.filter((m) => m.due_date >= t0).length === 0 && <div className="px-3 py-6 text-center text-ink-faint">Aucun jalon dans les 30 jours.</div>}
                  {milestones.filter((m) => m.due_date >= t0).slice(0, 8).map((m) => <Link key={m.id} href={`/projects/${m.project_id}/planning`} className="flex items-center gap-2 px-3 py-1.5 hover:bg-surface-alt"><span className="inline-block h-2 w-2 shrink-0 rotate-45 border border-ink bg-surface" /><span className="w-12 shrink-0 font-semibold">{pmap.get(m.project_id)?.code}</span><span className="min-w-0 flex-1 truncate">{m.name}</span><span className="shrink-0 tabular-nums text-ink-muted">{formatDate(m.due_date)}</span></Link>)}
                </div>
              </div>
              <div className="card">
                <div className="flex items-center justify-between px-[15px] pb-1 pt-[13px]"><div className="card-title">Dernieres saisies terrain</div><Link href="/forms" className="btn-ghost">Boite de reception ›</Link></div>
                <div className="divide-y divide-line-light text-[10.5px]">
                  {feed.length === 0 && <div className="px-3 py-6 text-center text-ink-faint">Aucune saisie pour le moment.</div>}
                  {feed.map((f) => <Link key={`${f.kind}-${f.id}`} href={f.href} className="flex items-start gap-2 px-3 py-1.5 hover:bg-surface-alt"><Badge tone={f.tone}>{f.kind}</Badge><div className="min-w-0 flex-1"><div className="truncate">{f.text}</div><div className="text-[9.5px] text-ink-faint">{pmap.get(f.pid)?.code} · {(f.who && who.get(f.who)) || "—"} · {formatDate(f.at.slice(0, 10))}</div></div></Link>)}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
