import Link from "next/link";
import { Badge } from "@/components/ui";
import { formatDate, formatMoney, pct, today } from "@/lib/format";
import { HEALTH_LABELS, projectHealth, type Health } from "@/lib/health";
import { getLists } from "@/lib/reference";
import { labelOf } from "@/lib/reference-types";
import { requireProfile } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { PROJECT_STATUS_LABELS, PROJECT_STATUS_TONE, type Expense, type JournalEntry, type Milestone, type Profile, type Project, type ProjectStats, type Task } from "@/lib/types";
import { PrintButton } from "./PrintButton";

export const metadata = { title: "Rapport hebdomadaire" };
const addDays = (iso: string, n: number) => { const d = new Date(iso + "T00:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const isoWeek = (iso: string) => { const d = new Date(iso + "T00:00:00Z"); const day = d.getUTCDay() || 7; d.setUTCDate(d.getUTCDate() + 4 - day); const y0 = new Date(Date.UTC(d.getUTCFullYear(), 0, 1)); return Math.ceil(((d.getTime() - y0.getTime()) / 86400000 + 1) / 7); };
const HEALTH_TONE: Record<Health, string> = { good: "ok", warn: "warn", bad: "alert", done: "info", idle: "neutral" };

export default async function WeeklyReport({ searchParams }: { searchParams: Promise<{ project?: string; print?: string }> }) {
  const { project: pid, print } = await searchParams;
  const me = await requireProfile();
  const supabase = await createClient();
  const t0 = today(), monday = addDays(t0, -((new Date(t0 + "T00:00:00Z").getUTCDay() + 6) % 7)), sunday = addDays(monday, 6), nextSunday = addDays(sunday, 7), in30 = addDays(t0, 30);
  const pq = supabase.from("projects").select("*").neq("status", "hors_perimetre").order("code");
  const [{ data: projects }, { data: stats }, { data: people }, { data: tasks }, { data: ms }, { data: ex }, { data: jr }, lists] = await Promise.all([
    pid ? pq.eq("id", pid) : pq, supabase.from("project_stats").select("*"), supabase.from("profiles").select("id,email,full_name,role"),
    pid ? supabase.from("tasks").select("*").eq("project_id", pid) : supabase.from("tasks").select("*"),
    pid ? supabase.from("milestones").select("*").eq("project_id", pid).order("due_date") : supabase.from("milestones").select("*").order("due_date"),
    (pid ? supabase.from("expenses").select("*").eq("project_id", pid) : supabase.from("expenses").select("*")).gte("spent_on", monday).lte("spent_on", sunday),
    (pid ? supabase.from("journal_entries").select("*").eq("project_id", pid) : supabase.from("journal_entries").select("*")).gte("entry_date", monday).lte("entry_date", sunday).order("entry_date"),
    getLists(),
  ]);
  const list = (projects ?? []) as Project[];
  const statMap = new Map(((stats ?? []) as ProjectStats[]).map((s) => [s.project_id, s]));
  const who = new Map(((people ?? []) as Profile[]).map((p) => [p.id, p.full_name || p.email]));
  const all = (tasks ?? []) as Task[];
  const parents = new Set(all.filter((t) => t.parent_id).map((t) => t.parent_id!));
  const leaves = all.filter((t) => !parents.has(t.id));
  const totalBudget = list.reduce((s, p) => s + Number(p.budget), 0), totalSpent = list.reduce((s, p) => s + Number(statMap.get(p.id)?.spent ?? 0), 0);
  const weekSpent = ((ex ?? []) as Expense[]).filter((e) => e.status !== "annulee").reduce((s, e) => s + Number(e.amount), 0);
  const title = pid ? `${list[0]?.code} · ${list[0]?.name}` : "Portefeuille";

  return (
    <div className="mx-auto max-w-5xl print:max-w-none">
      <div className="mb-4 flex items-center justify-between print:hidden"><Link href="/reports" className="text-[10px] text-ink-muted">‹ Rapports</Link><PrintButton auto={print === "1"} /></div>
      <div className="card card-pad print:border-0 print:p-0">
        <div className="flex items-start justify-between border-b border-line-hair pb-3">
          <div><div className="eyebrow">Rapport hebdomadaire · SEDIMA</div><h1 className="text-[16px] font-bold">{title}</h1><div className="text-[10.5px] text-ink-muted">Semaine {isoWeek(t0)} · du {formatDate(monday)} au {formatDate(sunday)} · edite le {formatDate(t0)} par {me.full_name || me.email}</div></div>
          <div className="text-right text-[10.5px]"><div className="eyebrow">Budget</div><div className="font-bold">{formatMoney(totalBudget)}</div><div className="text-ink-muted">engage {formatMoney(totalSpent)} ({pct(totalSpent, totalBudget)} %)</div><div className="text-ink-muted">cette semaine {formatMoney(weekSpent)}</div></div>
        </div>

        <h2 className="mb-1.5 mt-4 text-[12.5px] font-bold">1. Etat des projets</h2>
        <table className="tbl"><thead><tr><th>Projet</th><th>Chef de projet</th><th>Statut</th><th>Sante</th><th className="num">Avanc.</th><th className="num">Engage</th><th className="num">Consomme</th><th className="num">Retards</th><th>Fin prevue</th></tr></thead><tbody>
          {list.map((p) => { const s = statMap.get(p.id), h = projectHealth(p, s), spent = Number(s?.spent ?? 0); return (
            <tr key={p.id}><td className="font-semibold">{p.code} <span className="font-normal text-ink-muted">{p.name}</span></td><td>{(p.manager_id && who.get(p.manager_id)) || p.manager_name || "—"}</td><td><Badge tone={PROJECT_STATUS_TONE[p.status]}>{PROJECT_STATUS_LABELS[p.status]}</Badge></td><td><Badge tone={HEALTH_TONE[h]}>{HEALTH_LABELS[h]}</Badge></td><td className="num">{Number(s?.progress ?? 0)} %</td><td className="num">{formatMoney(spent, p.currency)}</td><td className="num">{Number(p.budget) ? `${pct(spent, Number(p.budget))} %` : "—"}</td><td className={`num ${Number(s?.late_count) ? "font-bold text-alert" : ""}`}>{Number(s?.late_count ?? 0) || "—"}</td><td className="whitespace-nowrap">{formatDate(p.end_date)}</td></tr>
          ); })}
        </tbody></table>

        {(() => { const done = leaves.filter((t) => t.status === "done" && t.actual_end && t.actual_end >= monday && t.actual_end <= sunday); const active = leaves.filter((t) => t.start_date <= sunday && t.end_date >= monday && t.status !== "done"); const late = leaves.filter((t) => t.end_date < t0 && t.status !== "done").sort((a, b) => a.end_date.localeCompare(b.end_date)); const next = leaves.filter((t) => t.start_date > sunday && t.start_date <= nextSunday); const code = (t: Task) => list.find((p) => p.id === t.project_id)?.code ?? "";
          const block = (h: string, rows: Task[], date: (t: Task) => string, cls = "") => rows.length > 0 && (<><h2 className="mb-1.5 mt-4 text-[12.5px] font-bold">{h} <span className="font-normal text-ink-faint">{rows.length}</span></h2><table className="tbl"><tbody>{rows.slice(0, 40).map((t) => <tr key={t.id}><td className="w-14 font-semibold">{code(t)}</td><td className="w-12 font-mono text-[9.5px] text-ink-faint">{t.wbs_code}</td><td>{t.name}</td><td className="text-ink-muted">{(t.responsible_id && who.get(t.responsible_id)) || t.responsible_role}</td><td className="num">{t.progress} %</td><td className={`num whitespace-nowrap ${cls}`}>{date(t)}</td></tr>)}{rows.length > 40 && <tr><td colSpan={6} className="text-ink-faint">et {rows.length - 40} autres…</td></tr>}</tbody></table></>);
          return (<>
            {block("2. Taches terminees cette semaine", done, (t) => formatDate(t.actual_end!))}
            {block(`${done.length ? "3" : "2"}. Taches en cours cette semaine`, active, (t) => `→ ${formatDate(t.end_date)}`)}
            {block(`${done.length ? "4" : "3"}. Taches en retard`, late, (t) => formatDate(t.end_date), "font-bold text-alert")}
            {block(`${done.length ? "5" : "4"}. Demarrages prevus la semaine prochaine`, next, (t) => formatDate(t.start_date))}
          </>); })()}

        {(() => { const m = ((ms ?? []) as Milestone[]).filter((x) => (!x.reached_on && x.due_date <= in30) || (x.reached_on && x.reached_on >= monday && x.reached_on <= sunday)); return m.length > 0 && (<><h2 className="mb-1.5 mt-4 text-[12.5px] font-bold">Jalons</h2><table className="tbl"><tbody>{m.map((x) => <tr key={x.id}><td className="w-14 font-semibold">{list.find((p) => p.id === x.project_id)?.code}</td><td>{x.name}</td><td className="whitespace-nowrap">{formatDate(x.due_date)}</td><td>{x.reached_on ? <Badge tone="ok">atteint le {formatDate(x.reached_on)}</Badge> : x.due_date < t0 ? <Badge tone="alert">depasse</Badge> : <Badge tone="neutral">a venir</Badge>}</td></tr>)}</tbody></table></>); })()}

        {(ex ?? []).length > 0 && (<><h2 className="mb-1.5 mt-4 text-[12.5px] font-bold">Depenses de la semaine <span className="font-normal text-ink-faint">{formatMoney(weekSpent)}</span></h2><table className="tbl"><tbody>{((ex ?? []) as Expense[]).map((e) => <tr key={e.id}><td className="w-14 font-semibold">{list.find((p) => p.id === e.project_id)?.code}</td><td className="font-mono text-[9.5px]">{e.ref}</td><td>{e.description}</td><td className="text-ink-muted">{e.supplier}</td><td>{labelOf(lists.expense_status, e.status)}</td><td className="num whitespace-nowrap">{formatMoney(Number(e.amount), list.find((p) => p.id === e.project_id)?.currency)}</td></tr>)}</tbody></table></>)}

        {(jr ?? []).length > 0 && (<><h2 className="mb-1.5 mt-4 text-[12.5px] font-bold">Journal de chantier</h2><div className="divide-y divide-line-light text-[10.5px]">{((jr ?? []) as JournalEntry[]).map((e) => <div key={e.id} className="py-1.5"><span className="font-semibold">{list.find((p) => p.id === e.project_id)?.code}</span> · {formatDate(e.entry_date)} · <span className="text-ink-muted">{(e.author_id && who.get(e.author_id)) || "—"}{e.location ? ` · ${e.location}` : ""}</span><div className="whitespace-pre-line text-ink-body">{e.content}</div></div>)}</div></>)}
        <div className="mt-6 border-t border-line-hair pt-2 text-[9px] text-ink-faint">SEDIMA · gestion de projets · rapport genere le {formatDate(t0)}</div>
      </div>
    </div>
  );
}
