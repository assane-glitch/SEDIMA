import { TaskList } from "@/components/tasks/TaskList";
import { canEdit, requireProfile } from "@/lib/session";
import { getLists } from "@/lib/reference";
import { ProjectHeader } from "../ProjectHeader";
import { ProjectTabs } from "../ProjectTabs";
import { loadProject } from "../loadProject";

export default async function ProjectTasksPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await requireProfile();
  const [{ project, tasks, people, spentByTask }, lists] = await Promise.all([loadProject(id), getLists()]);
  const editor = canEdit(profile);
  return (
    <>
      <ProjectHeader project={project} manager={people.find((p) => p.id === project.manager_id)} />
      <ProjectTabs id={id} canEdit={editor} />
      <TaskList mode="project" tasks={tasks} projects={[{ id, code: project.code, name: project.name, currency: project.currency, start_date: project.start_date, end_date: project.end_date, status: project.status }]}
        people={people} spentByTask={Object.fromEntries(spentByTask)} lists={lists} me={profile} canEdit={editor} />
    </>
  );
}
