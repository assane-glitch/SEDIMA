import { createClient } from "@/lib/supabase/server";
import { ProjectTabsClient } from "./ProjectTabsClient";

/** Onglets d'un projet : charge le badge des demandes en attente et le nom du projet (affiche quand la barre est collee en haut) puis rend les onglets. */
export async function ProjectTabs({ id, canEdit }: { id: string; canEdit: boolean }) {
  const supabase = await createClient();
  const [{ count }, { data: p }] = await Promise.all([
    supabase.from("change_requests").select("*", { count: "exact", head: true }).eq("project_id", id).eq("status", "soumise"),
    supabase.from("projects").select("code,name").eq("id", id).maybeSingle(),
  ]);
  return <ProjectTabsClient id={id} canEdit={canEdit} pending={count ?? 0} code={p?.code ?? ""} name={p?.name ?? ""} />;
}
