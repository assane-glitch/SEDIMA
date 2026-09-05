import { Gantt, type GanttRow } from "@/components/gantt/Gantt";
import { canEdit, requireProfile } from "@/lib/session";
import { ProjectHeader } from "../ProjectHeader";
import { ProjectTabs } from "../ProjectTabs";
import { loadProject } from "../loadProject";

export default async function ProjectPlanningPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await requireProfile();
  const { project, tasks, people, spentByTask } = await loadProject(id);
  const rows: GanttRow[] = tasks.map((t) => ({ ...t, budget: Number(t.budget), spent: spentByTask.get(t.id) ?? 0 }));

  const manager = people.find((p) => p.id === project.manager_id);
  const editor = canEdit(profile);

  return (
    <>
      <ProjectHeader project={project} manager={manager} />
      <ProjectTabs id={id} canEdit={editor} />
      <Gantt tasks={rows} people={people} currency={project.currency} canEdit={editor} projectId={id} projectStart={project.start_date} projectEnd={project.end_date} />
    </>
  );
}
