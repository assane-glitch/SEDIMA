import { Gantt, type GanttMilestone } from "@/components/gantt/Gantt";
import { canEdit, requireProfile } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import type { AuditEntry, Expense, JournalEntry, Milestone, RegisterEntry } from "@/lib/types";
import { getLists } from "@/lib/reference";
import { buildRows } from "@/lib/gantt-rows";
import { ProjectHeader } from "../ProjectHeader";
import { ProjectTabs } from "../ProjectTabs";
import { loadProject } from "../loadProject";

export default async function ProjectPlanningPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await requireProfile();
  const { project, tasks, people, spentByTask } = await loadProject(id);
  const supabase = await createClient();
  const [{ data: ms }, { data: exp }, { data: jr }, { data: rg }, { data: au }, lists] = await Promise.all([
    supabase.from("milestones").select("*").eq("project_id", id).order("due_date"),
    supabase.from("expenses").select("*").eq("project_id", id).order("spent_on", { ascending: false }),
    supabase.from("journal_entries").select("*").eq("project_id", id).not("task_id", "is", null).order("entry_date", { ascending: false }).limit(500),
    supabase.from("register_entries").select("*").eq("project_id", id).not("task_id", "is", null).order("entry_date", { ascending: false }).limit(500),
    supabase.from("audit_log").select("*").eq("project_id", id).in("table_name", ["tasks", "expenses"]).order("changed_at", { ascending: false }).limit(1000),
    getLists(),
  ]);
  const who = new Map(people.map((p) => [p.id, p.full_name || p.email]));
  const rows = buildRows(tasks, spentByTask, who);
  const milestones: GanttMilestone[] = ((ms ?? []) as Milestone[]).map((m) => ({ id: m.id, name: m.name, due: m.due_date, reached: m.reached_on, notes: m.notes, milestone: m }));
  const editor = canEdit(profile);
  return (
    <>
      <ProjectHeader project={project} manager={people.find((p) => p.id === project.manager_id)} />
      <ProjectTabs id={id} canEdit={editor} />
      <Gantt mode="project" rows={rows} milestones={milestones} expenses={(exp ?? []) as Expense[]} journal={(jr ?? []) as JournalEntry[]} registers={(rg ?? []) as RegisterEntry[]} audit={(au ?? []) as AuditEntry[]} lists={lists} people={people} currency={project.currency} canEdit={editor} projectId={id} projectCode={project.code} projectStart={project.start_date} projectEnd={project.end_date} />
    </>
  );
}
