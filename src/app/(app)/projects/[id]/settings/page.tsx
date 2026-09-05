import { redirect } from "next/navigation";
import { Alert, PageHeader } from "@/components/ui";
import { ProjectForm } from "@/components/ProjectForm";
import { canEdit, requireProfile } from "@/lib/session";
import { deleteProject, updateProject } from "../../actions";
import { ProjectTabs } from "../ProjectTabs";
import { loadProject } from "../loadProject";

export default async function ProjectSettingsPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string }> }) {
  const { id } = await params;
  const { error } = await searchParams;
  const profile = await requireProfile();
  if (!canEdit(profile)) redirect(`/projects/${id}`);
  const { project, people } = await loadProject(id);
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title={project.name} subtitle="Parametres du projet" />
      <ProjectTabs id={id} canEdit />
      {error && <div className="mb-4"><Alert>{error}</Alert></div>}
      <ProjectForm project={project} people={people} action={updateProject} submitLabel="Enregistrer" />
      <form action={deleteProject} className="mt-6 flex justify-end">
        <input type="hidden" name="id" value={id} />
        <button type="submit" className="btn-danger" formNoValidate>Supprimer le projet et toutes ses donnees</button>
      </form>
    </div>
  );
}
