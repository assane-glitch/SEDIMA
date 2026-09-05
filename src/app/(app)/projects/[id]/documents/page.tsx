import { ComingSoon } from "@/components/ui";
import { canEdit, requireProfile } from "@/lib/session";
import { ProjectHeader } from "../ProjectHeader";
import { ProjectTabs } from "../ProjectTabs";
import { loadProject } from "../loadProject";
export default async function ProjectDocumentsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await requireProfile();
  const { project, people } = await loadProject(id);
  return (
    <>
      <ProjectHeader project={project} manager={people.find((p) => p.id === project.manager_id)} />
      <ProjectTabs id={id} canEdit={canEdit(profile)} />
      <ComingSoon title="Documents du projet" step={7} hint="Fichiers et photos lies au projet, a une tache ou a une entree de journal, avec filtres." />
    </>
  );
}
