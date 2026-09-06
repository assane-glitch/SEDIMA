import { DocumentList } from "@/components/documents/DocumentList";
import { DocumentUpload } from "@/components/documents/DocumentUpload";
import { loadDocuments } from "@/lib/documents";
import { getLists } from "@/lib/reference";
import { canEdit, canSubmit, requireProfile } from "@/lib/session";
import { ProjectHeader } from "../ProjectHeader";
import { ProjectTabs } from "../ProjectTabs";
import { loadProject } from "../loadProject";

export default async function ProjectDocumentsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await requireProfile();
  const [{ project, people }, { items, projects, tasks }, lists] = await Promise.all([loadProject(id), loadDocuments(id), getLists()]);
  const editor = canEdit(profile);
  return (
    <>
      <ProjectHeader project={project} manager={people.find((p) => p.id === project.manager_id)} />
      <ProjectTabs id={id} canEdit={editor} />
      <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
        <DocumentList docs={items} projects={projects} tasks={tasks} docTypes={lists.doc_type} canEdit={editor} meId={profile.id} mode="project" />
        {canSubmit(profile) && <div className="card card-pad h-fit order-first lg:order-none"><div className="card-title mb-3">Deposer des fichiers</div><DocumentUpload projects={projects} tasks={tasks} docTypes={lists.doc_type} projectId={id} /></div>}
      </div>
    </>
  );
}
