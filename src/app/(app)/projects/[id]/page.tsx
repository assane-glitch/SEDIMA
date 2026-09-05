import Link from "next/link";
import { ProgressBar, Stat } from "@/components/ui";
import { Icon } from "@/components/icons";
import { formatDate, formatMoney, pct } from "@/lib/format";
import { canEdit, requireProfile } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import type { JournalEntry, Milestone } from "@/lib/types";
import { ProjectHeader } from "./ProjectHeader";
import { ProjectTabs } from "./ProjectTabs";
import { loadProject } from "./loadProject";

export default async function ProjectOverview({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await requireProfile();
  const { project, stats, tasks, people } = await loadProject(id);
  const supabase = await createClient();
  const [{ data: milestones }, { data: journal }] = await Promise.all([
    supabase.from("milestones").select("*").eq("project_id", id).order("due_date").limit(6),
    supabase.from("journal_entries").select("*").eq("project_id", id).order("entry_date", { ascending: false }).limit(5),
  ]);
  const spent = Number(stats.spent); const budget = Number(project.budget);
  const manager = people.find((p) => p.id === project.manager_id);
  const who = new Map(people.map((p) => [p.id, p.full_name || p.email]));
  const late = tasks.filter((t) => t.status !== "done" && t.end_date < new Date().toISOString().slice(0, 10));
  const upcoming = tasks.filter((t) => t.status !== "done" && !late.includes(t)).sort((a, b) => a.end_date.localeCompare(b.end_date)).slice(0, 5);

  return (
    <>
      <ProjectHeader project={project} manager={manager} />
      <ProjectTabs id={id} canEdit={canEdit(profile)} />
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Avancement" value={`${stats.progress} %`} hint={`${stats.done_count}/${stats.task_count} taches terminees`} tone={stats.late_count > 0 ? "warn" : "good"} />
        <Stat label="Budget" value={formatMoney(budget, project.currency)} />
        <Stat label="Depense" value={formatMoney(spent, project.currency)} hint={`${pct(spent, budget)} % du budget`} tone={spent > budget && budget > 0 ? "bad" : pct(spent, budget) > Number(stats.progress) + 15 ? "warn" : "default"} />
        <Stat label="Jalons" value={`${stats.milestone_reached ?? 0}/${stats.milestone_count ?? 0}`} hint={stats.next_milestone ? `Prochain : ${formatDate(stats.next_milestone)}` : "Aucun jalon a venir"} />
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <section className="card p-4">
          <div className="mb-3 flex items-center justify-between"><h2 className="text-sm font-semibold">Jalons</h2><Link href={`/projects/${id}/planning`} className="text-xs text-brand-700 hover:underline">Planning</Link></div>
          {(milestones ?? []).length === 0 ? <p className="text-sm text-slate-500">Aucun jalon. Ajoutez-les depuis le Planning.</p> : (
            <ul className="space-y-2 text-sm">
              {(milestones as Milestone[]).map((m) => (
                <li key={m.id} className="flex items-center gap-2">
                  <Icon name={m.reached_on ? "check" : "flag"} className={`h-4 w-4 ${m.reached_on ? "text-leaf-600" : m.due_date < new Date().toISOString().slice(0, 10) ? "text-brand-600" : "text-slate-400"}`} />
                  <span className={`flex-1 truncate ${m.reached_on ? "text-slate-500 line-through" : ""}`}>{m.name}</span>
                  <span className="text-xs tabular-nums text-slate-500">{formatDate(m.due_date)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="card p-4">
          <div className="mb-3 flex items-center justify-between"><h2 className="text-sm font-semibold">Taches a suivre</h2><Link href={`/projects/${id}/tasks`} className="text-xs text-brand-700 hover:underline">Toutes</Link></div>
          {late.length === 0 && upcoming.length === 0 ? <p className="text-sm text-slate-500">Aucune tache ouverte.</p> : (
            <ul className="space-y-2 text-sm">
              {[...late, ...upcoming].slice(0, 6).map((t) => (
                <li key={t.id}>
                  <div className="flex items-center justify-between gap-2"><span className="truncate">{t.name}</span><span className={`text-xs tabular-nums ${late.includes(t) ? "font-medium text-brand-700" : "text-slate-500"}`}>{formatDate(t.end_date)}</span></div>
                  <div className="mt-1 flex items-center gap-2"><div className="flex-1"><ProgressBar value={t.progress} tone={late.includes(t) ? "bad" : "good"} /></div><span className="w-8 text-right text-[11px] tabular-nums text-slate-500">{t.progress} %</span></div>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="card p-4">
          <div className="mb-3 flex items-center justify-between"><h2 className="text-sm font-semibold">Dernieres entrees du journal</h2><Link href={`/projects/${id}/journal`} className="text-xs text-brand-700 hover:underline">Journal</Link></div>
          {(journal ?? []).length === 0 ? <p className="text-sm text-slate-500">Aucune entree.</p> : (
            <ul className="space-y-3 text-sm">
              {(journal as JournalEntry[]).map((e) => (
                <li key={e.id}><div className="text-xs text-slate-500">{formatDate(e.entry_date)} · {e.author_id ? who.get(e.author_id) : "—"}</div><p className="line-clamp-2">{e.content}</p></li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
