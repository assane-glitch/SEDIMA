import { Badge, PageHeader, Stat } from "@/components/ui";
import { Gantt, type GanttRow } from "@/components/gantt/Gantt";
import { formatDate, formatMoney, pct } from "@/lib/format";
import { canEdit, requireProfile } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { PROJECT_STATUS_LABELS } from "@/lib/types";
import { ProjectTabs } from "./ProjectTabs";
import { loadProject } from "./loadProject";

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await requireProfile();
  const { project, stats, tasks, people } = await loadProject(id);
  const supabase = await createClient();
  const { data: spentRows } = await supabase.from("expenses").select("task_id,amount").eq("project_id", id);
  const spentByTask = new Map<string, number>();
  for (const r of spentRows ?? []) if (r.task_id) spentByTask.set(r.task_id, (spentByTask.get(r.task_id) ?? 0) + Number(r.amount));
  const rows: GanttRow[] = tasks.map((t) => ({ ...t, budget: Number(t.budget), spent: spentByTask.get(t.id) ?? 0 }));

  const spent = Number(stats.spent);
  const budget = Number(project.budget);
  const manager = people.find((p) => p.id === project.manager_id);
  const editor = canEdit(profile);

  return (
    <>
      <PageHeader
        title={project.name}
        subtitle={<span className="flex flex-wrap items-center gap-2">
          <span>{project.code}</span>·<span>{formatDate(project.start_date)} → {formatDate(project.end_date)}</span>·
          <span>Chef de projet : {manager ? (manager.full_name || manager.email) : "—"}</span>
          <Badge tone={project.status === "active" ? "green" : project.status === "on_hold" ? "amber" : "slate"}>{PROJECT_STATUS_LABELS[project.status]}</Badge>
        </span>}
      />
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Avancement" value={`${stats.progress} %`} hint={`${stats.done_count}/${stats.task_count} taches terminees`} tone={stats.late_count > 0 ? "warn" : "good"} />
        <Stat label="Budget" value={formatMoney(budget, project.currency)} hint={`Alloue aux taches : ${formatMoney(rows.reduce((s, t) => s + t.budget, 0), project.currency)}`} />
        <Stat label="Depense" value={formatMoney(spent, project.currency)} hint={`${pct(spent, budget)} % du budget`} tone={spent > budget && budget > 0 ? "bad" : pct(spent, budget) > Number(stats.progress) + 15 ? "warn" : "default"} />
        <Stat label="Reste a depenser" value={formatMoney(budget - spent, project.currency)} tone={budget - spent < 0 ? "bad" : "default"} />
      </div>
      <ProjectTabs id={id} canEdit={editor} />
      <Gantt tasks={rows} people={people} currency={project.currency} canEdit={editor} projectId={id} projectStart={project.start_date} projectEnd={project.end_date} />
    </>
  );
}
