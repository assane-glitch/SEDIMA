import Link from "next/link";
import { describeAudit, relativeTime } from "@/lib/audit";
import { addDays, daysBetween, formatDate, formatMoney, mondayOf, pct, shortMoney, today } from "@/lib/format";
import { HEALTH_DOT, HEALTH_LABELS, daysLeft, projectHealth } from "@/lib/health";
import { getLists } from "@/lib/reference";
import { excludedStatuses, labelOf } from "@/lib/reference-types";
import { canEdit, requireProfile } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import type { AuditEntry, JournalEntry, Milestone } from "@/lib/types";
import { BudgetTrendChart, type TrendPoint } from "@/components/projects/overview/BudgetTrendChart";
import { MonthlyExpensesChart } from "@/components/projects/overview/MonthlyExpensesChart";
import { OverviewTasks } from "@/components/projects/overview/OverviewTasks";
import { MilestonesCard } from "./MilestonesCard";
import { ProjectHeader } from "./ProjectHeader";
import { ProjectTabs } from "./ProjectTabs";
import { loadProject } from "./loadProject";

const SEQ = ["bg-chart-seq-1", "bg-chart-seq-2", "bg-chart-seq-3", "bg-chart-seq-4", "bg-chart-seq-5", "bg-chart-seq-6"];

/** Indicateur : libelle, valeur, complement, mini-graphique optionnel. */
function Kpi({ label, value, hint, children }: { label: string; value: React.ReactNode; hint?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <div className="eyebrow">{label}</div>
      <div className="mt-1 text-[16px] font-bold tabular-nums tracking-[-0.01em] text-ink">{value}</div>
      {hint && <div className="hint mt-0.5">{hint}</div>}
      {children && <div className="mt-3">{children}</div>}
    </div>
  );
}

export default async function ProjectOverview({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await requireProfile();
  const supabase = await createClient();
  const [{ project, stats, tasks, people }, lists, { data: milestones }, { data: journal }, { data: audit }, { data: expenses }] = await Promise.all([
    loadProject(id), getLists(),
    supabase.from("milestones").select("*").eq("project_id", id).order("due_date"),
    supabase.from("journal_entries").select("*").eq("project_id", id).order("entry_date", { ascending: false }).limit(4),
    supabase.from("audit_log").select("*").eq("project_id", id).order("changed_at", { ascending: false }).limit(8),
    supabase.from("expenses").select("amount,spent_on,category,status").eq("project_id", id),
  ]);
  const editor = canEdit(profile);
  const t0 = today();
  const budget = Number(project.budget);
  const progress = Number(stats.progress);
  const manager = people.find((p) => p.id === project.manager_id);
  const who = new Map(people.map((p) => [p.id, p.full_name || p.email]));
  const health = projectHealth(project, stats);
  const remaining = daysLeft(project);

  // ---- Taches feuilles et lots ----
  const parents = new Set(tasks.filter((t) => t.parent_id).map((t) => t.parent_id!));
  const byId = new Map(tasks.map((t) => [t.id, t]));
  const leaves = tasks.filter((t) => !parents.has(t.id));
  const lots = tasks.filter((t) => parents.has(t.id));
  const isLate = (t: typeof leaves[number]) => t.status !== "done" && t.end_date < t0;
  const nDone = leaves.filter((t) => t.status === "done").length, nLate = leaves.filter(isLate).length;
  const nProg = leaves.filter((t) => t.status === "in_progress" && !isLate(t)).length, nTodo = leaves.length - nDone - nLate - nProg;
  const onTime = leaves.length ? Math.round(((leaves.length - nLate) / leaves.length) * 100) : 100;
  const taskItems = leaves.map((t) => ({ task: t, lot: t.parent_id ? byId.get(t.parent_id)?.name ?? "" : "", responsible: (t.responsible_id && who.get(t.responsible_id)) || t.responsible_role || "" }));
  // Charge : taches se terminant par mois (12 mois autour d'aujourd'hui)
  const monthKey = (iso: string) => iso.slice(0, 7);
  const loadMonths: string[] = []; { const d = new Date(t0.slice(0, 7) + "-01T00:00:00Z"); d.setUTCMonth(d.getUTCMonth() - 5); for (let i = 0; i < 12; i++) { loadMonths.push(d.toISOString().slice(0, 7)); d.setUTCMonth(d.getUTCMonth() + 1); } }
  const loadByMonth = loadMonths.map((m) => ({ month: m, n: leaves.filter((t) => monthKey(t.end_date) === m).length }));
  const loadMax = Math.max(1, ...loadByMonth.map((x) => x.n));

  // ---- Depenses ----
  const excluded = excludedStatuses(lists.expense_status);
  const valid = (expenses ?? []).filter((e) => !excluded.has(e.status));
  const spent = valid.reduce((s, e) => s + Number(e.amount), 0);
  const paid = valid.filter((e) => e.status === "payee").reduce((s, e) => s + Number(e.amount), 0);
  const engaged = spent - paid;
  const rest = Math.max(0, budget - spent);
  const segBase = Math.max(budget, spent, 1);
  const seg = (v: number) => `${Math.max(0, (v / segBase) * 100)}%`;
  const burn = pct(spent, budget);
  const byCat = new Map<string, number>();
  for (const e of valid) byCat.set(e.category, (byCat.get(e.category) ?? 0) + Number(e.amount));
  const cats = [...byCat.entries()].sort((a, b) => b[1] - a[1]);
  const topCats = cats.length > 6 ? [...cats.slice(0, 5), ["autres", cats.slice(5).reduce((s, c) => s + c[1], 0)] as [string, number]] : cats;
  const byMonth = new Map<string, number>();
  for (const e of valid) byMonth.set(monthKey(e.spent_on), (byMonth.get(monthKey(e.spent_on)) ?? 0) + Number(e.amount));
  const monthsSorted = [...byMonth.keys()].sort();
  const months: { month: string; amount: number }[] = [];
  if (monthsSorted.length) { const d = new Date(monthsSorted[0] + "-01T00:00:00Z"), end = monthsSorted[monthsSorted.length - 1] > monthKey(t0) ? monthsSorted[monthsSorted.length - 1] : monthKey(t0); for (let k = d.toISOString().slice(0, 7); k <= end && months.length < 36; d.setUTCMonth(d.getUTCMonth() + 1), k = d.toISOString().slice(0, 7)) months.push({ month: k, amount: byMonth.get(k) ?? 0 }); }

  // ---- Courbe : budget prevu cumule (taches lissees sur leur duree) vs depenses cumulees, par semaine ----
  const trend: TrendPoint[] = [];
  const first = mondayOf(leaves.reduce((m, t) => (t.start_date < m ? t.start_date : m), project.start_date));
  const last = leaves.reduce((m, t) => (t.end_date > m ? t.end_date : m), project.end_date > t0 ? project.end_date : t0);
  const sortedExp = valid.map((e) => ({ d: e.spent_on, a: Number(e.amount) })).sort((a, b) => a.d.localeCompare(b.d));
  for (let wk = first, guard = 0; wk <= last && guard < 320; wk = addDays(wk, 7), guard++) {
    const end = addDays(wk, 6);
    let planned = 0;
    for (const t of leaves) { const b = Number(t.budget); if (!b) continue; const dur = Math.max(1, daysBetween(t.start_date, t.end_date) + 1); const done = Math.min(dur, Math.max(0, daysBetween(t.start_date, end) + 1)); planned += b * (done / dur); }
    let cum = 0; for (const e of sortedExp) { if (e.d > end) break; cum += e.a; }
    trend.push({ date: wk, planned: Math.round(planned), spent: Math.round(cum) });
  }

  const cur = project.currency;
  const Card = ({ title, action, children, className = "" }: { title: React.ReactNode; action?: React.ReactNode; children: React.ReactNode; className?: string }) => (
    <section className={`card card-pad min-w-0 ${className}`}>
      <div className="mb-3 flex items-center justify-between gap-3"><h2 className="card-title">{title}</h2>{action}</div>
      {children}
    </section>
  );
  const linkCls = "text-[10px] text-ink-muted hover:text-ink hover:underline";

  return (
    <>
      <ProjectHeader project={project} manager={manager} actions={editor ? <Link href={`/projects/${id}/settings#supprimer`} className="btn-ghost text-ink-faint hover:text-alert" title="Supprimer le projet (onglet Parametres)">Supprimer le projet</Link> : undefined} />
      <ProjectTabs id={id} canEdit={editor} />
      {project.description && <p className="mb-4 max-w-3xl text-[10.5px] text-ink-body">{project.description}</p>}

      <div className="grid gap-4 lg:grid-cols-2 lg:items-start [&>*]:min-w-0">
        {/* Colonne gauche : avancement, courbe, depenses */}
        <div className="grid gap-4 [&>*]:min-w-0">
          <Card title="Avancement" action={<Link href={`/projects/${id}/planning`} className={linkCls}>Planning</Link>}>
            <div className="grid grid-cols-3 divide-x divide-line-hair">
              <div className="pr-4">
                <Kpi label="Avancement" value={`${progress} %`} hint={`${nDone}/${leaves.length} taches terminees`}>
                  <div className="flex h-8 items-end gap-[3px]" title="Avancement par lot">
                    {lots.length ? lots.map((l) => <div key={l.id} title={`${l.name} · ${l.progress} %`} className={`w-full max-w-[10px] rounded-t-[2px] ${l.progress >= 100 ? "bg-chart-2" : "bg-ink"}`} style={{ height: `${Math.max(6, l.progress)}%` }} />) : <span className="text-[10px] text-ink-faint">Aucun lot</span>}
                  </div>
                </Kpi>
              </div>
              <div className="px-4">
                <Kpi label="Delais tenus" value={`${onTime} %`} hint={nLate > 0 ? `${nLate} tache${nLate > 1 ? "s" : ""} en retard` : "Aucune tache en retard"}>
                  <div className="flex h-2 gap-[2px] overflow-hidden rounded-[3px]" title="Terminees, en cours, a venir, en retard">
                    {[[nDone, "bg-chart-2", "Terminees"], [nProg, "bg-chart-1", "En cours"], [nTodo, "bg-line", "A venir"], [nLate, "bg-alert", "En retard"]].map(([n, c, l]) => Number(n) > 0 && <div key={String(l)} title={`${l} · ${n}`} className={String(c)} style={{ width: `${(Number(n) / Math.max(1, leaves.length)) * 100}%` }} />)}
                  </div>
                  <div className="mt-1.5 flex flex-wrap gap-x-2 text-[9.5px] text-ink-faint"><span>{nDone} terminees</span><span>{nProg} en cours</span><span>{nTodo} a venir</span>{nLate > 0 && <span className="text-ink-muted">{nLate} en retard</span>}</div>
                </Kpi>
              </div>
              <div className="pl-4">
                <Kpi label="Echeance" value={remaining < 0 ? `${-remaining} j de retard` : `${remaining} j`} hint={`${formatDate(project.end_date)} · ${stats.milestone_reached ?? 0}/${stats.milestone_count ?? 0} jalons`}>
                  <div className="flex h-8 items-end gap-[3px]" title="Taches a terminer par mois (6 mois avant et apres aujourd'hui)">
                    {loadByMonth.map((m) => <div key={m.month} title={`${m.month} · ${m.n} tache${m.n > 1 ? "s" : ""}`} className={`w-full rounded-t-[2px] ${m.month === monthKey(t0) ? "bg-chart-1" : "bg-chart-2"}`} style={{ height: `${Math.max(6, (m.n / loadMax) * 100)}%`, opacity: m.n ? 1 : 0.25 }} />)}
                  </div>
                </Kpi>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2 border-t border-line-hair pt-3 text-[10.5px]"><span className={`dot ${HEALTH_DOT[health]}`} /><span className="font-semibold text-ink">{HEALTH_LABELS[health]}</span><span className="text-ink-muted">· sante calculee sur les retards, le budget consomme et l&apos;echeance</span></div>
          </Card>

          <Card title="Budget et depenses" action={<Link href={`/projects/${id}/budget`} className={linkCls}>Detail du budget</Link>}>
            <BudgetTrendChart points={trend} budget={budget} today={t0} currency={cur} />
          </Card>

          <div className="grid gap-4 md:grid-cols-2 [&>*]:min-w-0">
            <Card title="Depenses par mois" action={<span className="text-[10px] text-ink-faint">{formatMoney(spent, cur)} au total</span>}>
              <MonthlyExpensesChart months={months} currency={cur} currentMonth={monthKey(t0)} />
            </Card>
            <Card title="Depenses par categorie" action={<Link href={`/projects/${id}/expenses`} className={linkCls}>Journal des depenses</Link>}>
              {topCats.length === 0 ? <p className="text-[10.5px] text-ink-muted">Aucune depense enregistree.</p> : (
                <>
                  <div className="mb-3 flex h-2 gap-[2px] overflow-hidden rounded-[3px]">{topCats.map(([c, v], i) => <div key={c} className={SEQ[i]} style={{ width: `${(v / Math.max(1, spent)) * 100}%` }} title={`${labelOf(lists.expense_category, c)} · ${formatMoney(v, cur)}`} />)}</div>
                  <ul className="space-y-1.5 text-[10.5px]">
                    {topCats.map(([c, v], i) => (
                      <li key={c} className="flex items-center gap-2">
                        <span className={`h-2 w-2 shrink-0 rounded-[2px] ${SEQ[i]}`} />
                        <span className="truncate text-ink-body">{c === "autres" ? "Autres" : labelOf(lists.expense_category, c)}</span>
                        <span className="mx-1 flex-1 border-b border-dotted border-line" />
                        <span className="tabular-nums text-ink">{shortMoney(v)}</span>
                        <span className="w-11 whitespace-nowrap text-right tabular-nums text-ink-muted">{pct(v, spent)} %</span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </Card>
          </div>
        </div>

        {/* Colonne droite : budget segmente, taches */}
        <div className="grid gap-4 [&>*]:min-w-0">
          <Card title="Budget" action={<span className="text-[10px] text-ink-faint">{formatMoney(budget, cur)} approuve</span>}>
            <div className="grid grid-cols-3 divide-x divide-line-hair">
              <div className="pr-4"><Kpi label="Paye" value={shortMoney(paid)} hint={`${pct(paid, budget)} %`} /></div>
              <div className="px-4"><Kpi label="Engage, non paye" value={shortMoney(engaged)} hint={`${pct(engaged, budget)} %`} /></div>
              <div className="pl-4"><Kpi label="Reste" value={shortMoney(budget - spent)} hint={spent > budget ? `depassement de ${pct(spent - budget, budget)} %` : `${100 - burn} %`} /></div>
            </div>
            <div className="mt-4 flex h-[6px] gap-[2px] overflow-hidden rounded-[3px] bg-line-light" title={`Consomme ${burn} % du budget`}>
              {paid > 0 && <div className="bg-chart-2" style={{ width: seg(paid) }} />}
              {engaged > 0 && <div className="bg-chart-1" style={{ width: seg(engaged) }} />}
              {rest > 0 && <div className="bg-transparent" style={{ width: seg(rest) }} />}
            </div>
            <div className="mt-1.5 flex flex-wrap gap-x-3 text-[9.5px] text-ink-faint"><span className="flex items-center gap-1"><span className="h-2 w-2 rounded-[2px] bg-chart-2" />Paye</span><span className="flex items-center gap-1"><span className="h-2 w-2 rounded-[2px] bg-chart-1" />Engage</span><span className="flex items-center gap-1"><span className="h-2 w-2 rounded-[2px] bg-line-light" />Reste</span>{spent > budget && <span className="ml-auto flex items-center gap-1 text-ink-muted"><span className="dot bg-alert" />Budget depasse</span>}</div>
          </Card>

          <Card title={<>Taches <span className="text-[10px] font-normal text-ink-faint">{leaves.length}</span></>} action={<Link href={`/projects/${id}/tasks`} className={linkCls}>Liste complete</Link>}>
            <OverviewTasks items={taskItems} today={t0} projectId={id} />
          </Card>
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3 [&>*]:min-w-0">
        <MilestonesCard projectId={id} milestones={(milestones ?? []) as Milestone[]} canEdit={editor} defaultDate={project.end_date} />
        <Card title="Activite recente" action={<Link href={`/projects/${id}/history`} className={linkCls}>Historique complet</Link>}>
          {(audit ?? []).length === 0 ? <p className="text-[10.5px] text-ink-muted">Aucune activite enregistree.</p> : (
            <ul className="divide-y divide-line-light text-[10.5px]">
              {(audit as AuditEntry[]).map((e) => {
                const d = describeAudit(e, cur);
                return (
                  <li key={e.id} className="flex gap-3 py-2">
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-surface-sub text-[10px] font-semibold text-ink-muted">{((e.changed_by && who.get(e.changed_by)) || "?").slice(0, 1).toUpperCase()}</div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate"><span className="font-semibold">{(e.changed_by && who.get(e.changed_by)) || "Systeme"}</span> {d.what}</div>
                      {d.details.length > 0 && <div className="mt-0.5 truncate text-[10px] text-ink-muted">{d.details.join(" · ")}</div>}
                    </div>
                    <div className="shrink-0 text-[10px] text-ink-faint" title={new Date(e.changed_at).toLocaleString("fr-FR")}>{relativeTime(e.changed_at)}</div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
        <Card title="Journal de terrain" action={<Link href={`/projects/${id}/journal`} className={linkCls}>Tout le journal</Link>}>
          {(journal ?? []).length === 0 ? <p className="text-[10.5px] text-ink-muted">Aucune entree.</p> : (
            <ul className="space-y-3 text-[10.5px]">
              {(journal as JournalEntry[]).map((e) => (
                <li key={e.id}><div className="text-[10px] text-ink-muted">{formatDate(e.entry_date)} · {e.author_id ? who.get(e.author_id) : "—"}{e.location ? ` · ${e.location}` : ""}</div><p className="line-clamp-2">{e.content}</p></li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
