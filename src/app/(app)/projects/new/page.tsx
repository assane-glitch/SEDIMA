import { redirect } from "next/navigation";
import { Alert, PageHeader } from "@/components/ui";
import { ProjectForm } from "@/components/ProjectForm";
import { canEdit, requireProfile } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";
import { createProject } from "../actions";

export const metadata = { title: "Nouveau projet" };

export default async function NewProjectPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const profile = await requireProfile();
  if (!canEdit(profile)) redirect("/dashboard");
  const { error } = await searchParams;
  const supabase = await createClient();
  const { data: people } = await supabase.from("profiles").select("id,email,full_name,role").order("full_name");
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Nouveau projet" />
      {error && <div className="mb-4"><Alert>{error}</Alert></div>}
      <ProjectForm people={(people ?? []) as Profile[]} action={createProject} submitLabel="Creer le projet" />
    </div>
  );
}
