import { ComingSoon } from "@/components/ui";
import { canEdit, requireProfile } from "@/lib/session";
import { ProjectHeader } from "../ProjectHeader";
import { ProjectTabs } from "../ProjectTabs";
import { loadProject } from "../loadProject";
export default async function ProjectHistoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await requireProfile();
  const { project, people } = await loadProject(id);
  return (
    <>
      <ProjectHeader project={project} manager={people.find((p) => p.id === project.manager_id)} />
      <ProjectTabs id={id} canEdit={canEdit(profile)} />
      <ComingSoon title="Historique des modifications" step={9} hint="Qui a modifie quoi et quand, avec les valeurs avant et apres. Deja enregistre en base depuis cette etape." />
    </>
  );
}
