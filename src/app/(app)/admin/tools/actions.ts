"use server";
import { revalidatePath } from "next/cache";
import { requireProfile } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";

/** Recale les taches liees d'un projet (ou de tous) sur la semaine suivant leur predecesseur. */
export async function realignLinks(projectId: string | null) {
  const me = await requireProfile();
  if (me.role !== "admin") return { error: "Reserve aux administrateurs." };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("realign_task_links", { p_project: projectId });
  if (error) return { error: error.message };
  revalidatePath("/projects"); revalidatePath("/tasks"); revalidatePath("/dashboard");
  return { ok: true, moved: Number(data ?? 0) };
}
