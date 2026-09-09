import { Alert, PageHeader } from "@/components/ui";
import { JournalForm } from "@/components/forms/EntryForms";
import { createClient } from "@/lib/supabase/server";

export default async function FieldJournal({ params, searchParams }: { params: Promise<{ projectId: string }>; searchParams: Promise<{ error?: string }> }) {
  const { projectId } = await params;
  const { error } = await searchParams;
  const supabase = await createClient();
  const [{ data: project }, { data: tasks }] = await Promise.all([
    supabase.from("projects").select("id,code,name").eq("id", projectId).maybeSingle(),
    supabase.from("tasks").select("id,name,wbs_code,project_id").eq("project_id", projectId).neq("status", "done").order("sort_order"),
  ]);
  return (
    <div className="mx-auto max-w-lg">
      <PageHeader crumbs={[{ label: "Activites" }, { href: "/forms", label: "Formulaires" }, { href: `/forms/${projectId}`, label: project?.code ?? "Projet" }]} title="Journal du jour" />
      {error && <div className="mb-4"><Alert>{error}</Alert></div>}
      <JournalForm projects={project ? [project] : []} tasks={tasks ?? []} projectId={projectId} redirect={`/forms/${projectId}`} />
    </div>
  );
}
