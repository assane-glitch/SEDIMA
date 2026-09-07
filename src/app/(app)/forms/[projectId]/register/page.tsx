import Link from "next/link";
import { Alert } from "@/components/ui";
import { RegisterForm } from "@/components/forms/EntryForms";
import { getLists, registerFields } from "@/lib/reference";
import { createClient } from "@/lib/supabase/server";

export default async function FieldRegister({ params, searchParams }: { params: Promise<{ projectId: string }>; searchParams: Promise<{ error?: string }> }) {
  const { projectId } = await params;
  const { error } = await searchParams;
  const supabase = await createClient();
  const [{ data: project }, { data: tasks }, lists] = await Promise.all([
    supabase.from("projects").select("id,code,name").eq("id", projectId).maybeSingle(),
    supabase.from("tasks").select("id,name,wbs_code,project_id").eq("project_id", projectId).neq("status", "done").order("sort_order"),
    getLists(),
  ]);
  const types = lists.register_type.map((r) => ({ value: r.value, label: r.label, fields: registerFields(r) }));
  return (
    <div className="mx-auto max-w-lg">
      <Link href={`/forms/${projectId}`} className="text-[10px] text-ink-muted">‹ Retour</Link>
      <h1 className="mb-4 mt-1 text-[16px] font-semibold">Registre{project ? ` · ${project.code}` : ""}</h1>
      {error && <div className="mb-4"><Alert>{error}</Alert></div>}
      <RegisterForm projects={project ? [project] : []} tasks={tasks ?? []} projectId={projectId} redirect={`/forms/${projectId}`} types={types} />
    </div>
  );
}
