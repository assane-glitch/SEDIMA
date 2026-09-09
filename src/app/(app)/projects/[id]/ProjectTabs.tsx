import { createClient } from "@/lib/supabase/server";
import { ProjectTabsClient } from "./ProjectTabsClient";

/** Onglets d'un projet : charge le nombre de demandes de changement en attente (badge du menu ⋯) puis rend les onglets. */
export async function ProjectTabs({ id, canEdit }: { id: string; canEdit: boolean }) {
  const supabase = await createClient();
  const { count } = await supabase.from("change_requests").select("*", { count: "exact", head: true }).eq("project_id", id).eq("status", "soumise");
  return <ProjectTabsClient id={id} canEdit={canEdit} pending={count ?? 0} />;
}
