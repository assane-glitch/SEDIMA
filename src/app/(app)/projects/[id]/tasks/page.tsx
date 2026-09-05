import { ComingSoon } from "@/components/ui";
import { canEdit, requireProfile } from "@/lib/session";
import { ProjectHeader } from "../ProjectHeader";
import { ProjectTabs } from "../ProjectTabs";
import { loadProject } from "../loadProject";
export default async function ProjectTasksPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await requireProfile();
  const { project, people } = await loadProject(id);
  return (
    <>
      <ProjectHeader project={project} manager={people.find((p) => p.id === project.manager_id)} />
      <ProjectTabs id={id} canEdit={canEdit(profile)} />
      <ComingSoon title="Liste des taches" step={4} hint="Les memes taches que le Gantt, en liste, avec regroupement par statut ou responsable et edition rapide." />
    </>
  );
}
