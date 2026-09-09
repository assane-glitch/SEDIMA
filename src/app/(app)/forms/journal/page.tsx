import { Alert, PageHeader } from "@/components/ui";
import { JournalForm } from "@/components/forms/EntryForms";
import { canSubmit, requireProfile } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Journal du jour" };

export default async function GlobalJournalFormPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const profile = await requireProfile();
  const supabase = await createClient();
  const [{ data: projects }, { data: tasks }] = await Promise.all([
    supabase.from("projects").select("id,code,name").in("status", ["cadrage", "approuve", "engage", "execution"]).order("code"),
    supabase.from("tasks").select("id,name,wbs_code,project_id").neq("status", "done").order("sort_order"),
  ]);
  return (
    <div className="mx-auto max-w-lg">
      <PageHeader crumbs={[{ label: "Activites" }, { href: "/forms", label: "Formulaires" }]} title="Journal du jour" />
      {error && <div className="mb-4"><Alert>{error}</Alert></div>}
      {canSubmit(profile) ? <JournalForm projects={projects ?? []} tasks={tasks ?? []} redirect="/forms" /> : <Alert tone="amber">Votre compte est en lecture seule.</Alert>}
    </div>
  );
}
