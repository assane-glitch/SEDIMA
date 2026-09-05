import Link from "next/link";
import { Badge, ProgressBar, Stat } from "@/components/ui";
import { describeAudit, relativeTime } from "@/lib/audit";
import { formatDate, formatMoney, pct } from "@/lib/format";
import { HEALTH_BADGE, HEALTH_LABELS, daysLeft, projectHealth } from "@/lib/health";
import { canEdit, requireProfile } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import type { AuditEntry, JournalEntry, Milestone } from "@/lib/types";
import { MilestonesCard } from "./MilestonesCard";
import { ProjectHeader } from "./ProjectHeader";
import { ProjectTabs } from "./ProjectTabs";
import { loadProject } from "./loadProject";

export default async function ProjectOverview({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await requireProfile();
  const { project, stats, tasks, people } = await loadProject(id);
  const supabase = await createClient();
  const [{ data: milestones }, { data: journal }, { data: audit }, { data: expByCat }] = await Promise.all([
    supabase.from("milestones").select("*").eq("project_id", id).order("due_date"),
    supabase.from("journal_entries").select("*").eq("project_id", id).order("entry_date", { ascending: false }).limit(4),
    supabase.from("audit_log").select("*").eq("project_id", id).order("changed_at", { ascending: false }).limit(8),
    supabase.from("expenses").select("category,amount").eq("project_id", id),
  ]);
  const editor = canEdit(profile);
  const spent = Number(stats.spent); const budget = Number(project.budget);
  const progress = Number(stats.progress);
  const manager = people.find((p) => p.id === project.manager_id);
  const who = new Map(people.map((p) => [p.id, p.full_name || p.email]));
  const t = new Date().toISOString().slice(0, 10);
  const late = tasks.filter((x) => x.status !== "done" && x.end_date < t);
  const upcoming = tasks.filter((x) => x.status !== "done" && !late.includes(x)).sort((a, b) => a.end_date.localeCompare(b.end_date)).slice(0, 5);
  const health = projectHealth(project, stats);
  const remaining = daysLeft(project);
  const byCat = new Map<string, number>();
  for (const e of expByCat ?? []) byCat.set(e.category, (byCat.get(e.category) ?? 0) + Number(e.amount));
  const taskBudget = tasks.reduce((s, x) => s + Number(x.budget), 0);
  const burn = pct(spent, budget);

  return (
    <>
      <ProjectHeader project={project} manager={manager} />
      <ProjectTabs id={id} canEdit={editor} />

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-5">
        <div className="card card-pad">
          <div className="eyebrow">Sante</div>
          <div className="mt-1.5"><Badge tone={HEALTH_BADGE[health]}>{HEALTH_LABELS[health]}</Badge></div>
          <div className="mt-1 text-[10px] text-ink-muted">{stats.late_count > 0 ? `${stats.late_count} tache${stats.late_count > 1 ? "s" : ""} en retard` : "Aucune tache en retard"}</div>
        </div>
        <Stat label="Avancement" value={`${progress} %`} hint={`${stats.done_count}/${stats.task_count} taches terminees`} tone={health === "bad" ? "bad" : health === "warn" ? "warn" : "good"} />
        <Stat label="Budget consomme" value={`${burn} %`} hint={`${formatMoney(spent, project.currency)} / ${formatMoney(budget, project.currency)}`} tone={burn > 100 ? "bad" : burn > progress + 20 ? "warn" : "default"} />
        <Stat label="Echeance" value={remaining < 0 ? `${-remaining} j de retard` : `${remaining} j`} hint={formatDate(project.end_date)} tone={remaining < 0 ? "bad" : remaining < 30 ? "warn" : "default"} />
        <Stat label="Jalons" value={`${stats.milestone_reached ?? 0}/${stats.milestone_count ?? 0}`} hint={stats.next_milestone ? `Prochain : ${formatDate(stats.next_milestone)}` : "Aucun jalon a venir"} />
      </div>

      {project.description && <p className="mb-4 max-w-3xl text-[10.5px] text-ink-body">{project.description}</p>}

      <div className="grid gap-4 lg:grid-cols-3">
        <MilestonesCard projectId={id} milestones={(milestones ?? []) as Milestone[]} canEdit={editor} defaultDate={project.end_date} />

        <section className="card p-4">
          <div className="mb-3 flex items-center justify-between"><h2 className="text-[10.5px] font-semibold">Taches a suivre</h2><Link href={`/projects/${id}/planning`} className="text-[10px] text-ink hover:underline">Planning</Link></div>
          {late.length === 0 && upcoming.length === 0 ? <p className="text-[10.5px] text-ink-muted">Aucune tache ouverte.</p> : (
            <ul className="space-y-2.5 text-[10.5px]">
              {[...late, ...upcoming].slice(0, 6).map((x) => (
                <li key={x.id}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate">{x.name}</span>
                    <span className={`shrink-0 text-[10px] tabular-nums ${late.includes(x) ? "font-semibold text-ink" : "text-ink-muted"}`}>{late.includes(x) ? "retard · " : ""}{formatDate(x.end_date)}</span>
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-[11px] text-ink-muted">
                    <div className="flex-1"><ProgressBar value={x.progress} tone={late.includes(x) ? "bad" : "good"} /></div>
                    <span className="w-8 text-right tabular-nums">{x.progress} %</span>
                    <span className="w-24 truncate text-right">{x.responsible_id ? who.get(x.responsible_id) : "—"}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card p-4">
          <div className="mb-3 flex items-center justify-between"><h2 className="text-[10.5px] font-semibold">Budget</h2><Link href={`/projects/${id}/budget`} className="text-[10px] text-ink hover:underline">Detail</Link></div>
          <div className="space-y-3 text-[10.5px]">
            <div>
              <div className="mb-1 flex justify-between text-[10px] text-ink-muted"><span>Consomme</span><span className={burn > 100 ? "font-semibold text-ink" : ""}>{burn} %</span></div>
              <ProgressBar value={burn} tone={burn > 100 ? "bad" : burn > progress + 20 ? "warn" : "good"} />
            </div>
            <div>
              <div className="mb-1 flex justify-between text-[10px] text-ink-muted"><span>Avancement physique</span><span>{progress} %</span></div>
              <ProgressBar value={progress} tone="good" />
            </div>
            <div className="flex justify-between border-t border-line-light pt-2"><span className="text-ink-muted">Reste</span><span className={`tabular-nums ${budget - spent < 0 ? "font-semibold text-ink" : ""}`}>{formatMoney(budget - spent, project.currency)}</span></div>
            <div className="flex justify-between"><span className="text-ink-muted">Alloue aux taches</span><span className="tabular-nums">{formatMoney(taskBudget, project.currency)}{budget > 0 && <span className="text-[10px] text-ink-faint"> ({pct(taskBudget, budget)} %)</span>}</span></div>
            {byCat.size > 0 && (
              <div className="border-t border-line-light pt-2">
                {[...byCat.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4).map(([c, v]) => <div key={c} className="flex justify-between py-0.5 text-[10px]"><span className="capitalize text-ink-muted">{c.replace("_", " ")}</span><span className="tabular-nums">{formatMoney(v, project.currency)}</span></div>)}
              </div>
            )}
          </div>
        </section>

        <section className="card p-4 lg:col-span-2">
          <div className="mb-3 flex items-center justify-between"><h2 className="text-[10.5px] font-semibold">Activite recente</h2><Link href={`/projects/${id}/history`} className="text-[10px] text-ink hover:underline">Historique complet</Link></div>
          {(audit ?? []).length === 0 ? <p className="text-[10.5px] text-ink-muted">Aucune activite enregistree.</p> : (
            <ul className="divide-y divide-line-light text-[10.5px]">
              {(audit as AuditEntry[]).map((e) => {
                const d = describeAudit(e, project.currency);
                return (
                  <li key={e.id} className="flex gap-3 py-2">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface-sub text-[11px] font-semibold text-ink-body">{((e.changed_by && who.get(e.changed_by)) || "?").slice(0, 1).toUpperCase()}</div>
                    <div className="min-w-0 flex-1">
                      <div><span className="font-semibold">{(e.changed_by && who.get(e.changed_by)) || "Systeme"}</span> {d.what}</div>
                      {d.details.length > 0 && <div className="mt-0.5 text-[10px] text-ink-muted">{d.details.join(" · ")}</div>}
                    </div>
                    <div className="shrink-0 text-[10px] text-ink-faint" title={new Date(e.changed_at).toLocaleString("fr-FR")}>{relativeTime(e.changed_at)}</div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="card p-4">
          <div className="mb-3 flex items-center justify-between"><h2 className="text-[10.5px] font-semibold">Journal de terrain</h2><Link href={`/projects/${id}/journal`} className="text-[10px] text-ink hover:underline">Tout le journal</Link></div>
          {(journal ?? []).length === 0 ? <p className="text-[10.5px] text-ink-muted">Aucune entree.</p> : (
            <ul className="space-y-3 text-[10.5px]">
              {(journal as JournalEntry[]).map((e) => (
                <li key={e.id}><div className="text-[10px] text-ink-muted">{formatDate(e.entry_date)} · {e.author_id ? who.get(e.author_id) : "—"}{e.location ? ` · ${e.location}` : ""}</div><p className="line-clamp-2">{e.content}</p></li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
