import { PageHeader } from "@/components/ui";
import { DocumentList } from "@/components/documents/DocumentList";
import { DocumentUpload } from "@/components/documents/DocumentUpload";
import { loadDocuments } from "@/lib/documents";
import { getLists } from "@/lib/reference";
import { canEdit, canSubmit, requireProfile } from "@/lib/session";

export const metadata = { title: "Documents" };

export default async function DocumentsPage() {
  const profile = await requireProfile();
  const [{ items, projects, tasks }, lists] = await Promise.all([loadDocuments(), getLists()]);
  return (
    <>
      <PageHeader title="Documents" subtitle={`Fichiers et photos de tous les projets · ${items.length} document${items.length > 1 ? "s" : ""}`} />
      <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
        <DocumentList docs={items} projects={projects} tasks={tasks} docTypes={lists.doc_type} canEdit={canEdit(profile)} meId={profile.id} mode="global" />
        {canSubmit(profile) && <div className="card card-pad h-fit lg:order-none order-first"><div className="card-title mb-3">Deposer des fichiers</div><DocumentUpload projects={projects} tasks={tasks} docTypes={lists.doc_type} /></div>}
      </div>
    </>
  );
}
