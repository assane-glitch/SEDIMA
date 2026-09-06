import { Gantt, type GanttMilestone } from "@/components/gantt/Gantt";
import { canEdit, requireProfile } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import type { Expense, Milestone } from "@/lib/types";
import { buildRows } from "@/lib/gantt-rows";
import { ProjectHeader } from "../ProjectHeader";
import { ProjectTabs } from "../ProjectTabs";
import { loadProject } from "../loadProject";

export default async function ProjectPlanningPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await requireProfile();
  const { project, tasks, people, spentByTask } = await loadProject(id);
  const supabase = await createClient();
  const [{ data: ms }, { data: exp }] = await Promise.all([
    supabase.from("milestones").select("*").eq("project_id", id).order("due_date"),
    supabase.from("expenses").select("*").eq("project_id", id).order("spent_on", { ascending: false }),
  ]);
  const who = new Map(people.map((p) => [p.id, p.full_name || p.email]));
  const rows = buildRows(tasks, spentByTask, who);
  const milestones: GanttMilestone[] = ((ms ?? []) as Milestone[]).map((m) => ({ id: m.id, name: m.name, due: m.due_date, reached: m.reached_on, notes: m.notes, milestone: m }));
  const editor = canEdit(profile);
  return (
    <>
      <ProjectHeader project={project} manager={people.find((p) => p.id === project.manager_id)} />
      <ProjectTabs id={id} canEdit={editor} />
      <Gantt mode="project" rows={rows} milestones={milestones} expenses={(exp ?? []) as Expense[]} people={people} currency={project.currency} canEdit={editor} projectId={id} projectCode={project.code} projectStart={project.start_date} projectEnd={project.end_date} />
    </>
  );
}
