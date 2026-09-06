"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { canEdit, requireProfile } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();

/** Cree une demande de changement : la nouvelle reference proposee = le planning actuel des taches choisies. */
export async function createChangeRequest(formData: FormData) {
  const profile = await requireProfile();
  const projectId = str(formData, "project_id");
  const back = `/projects/${projectId}/changes`;
  if (!canEdit(profile)) redirect(`${back}?error=${encodeURIComponent("Droits insuffisants")}`);
  const taskIds = formData.getAll("task_id").map(String).filter(Boolean);
  const title = str(formData, "title");
  if (!title || taskIds.length === 0) redirect(`${back}?error=${encodeURIComponent("Indiquez un titre et au moins une tache")}`);
  const supabase = await createClient();
  const { data: tasks } = await supabase.from("tasks").select("id,start_date,end_date,baseline_start,baseline_end").eq("project_id", projectId).in("id", taskIds);
  const { data: req, error } = await supabase.from("change_requests").insert({ project_id: projectId, title, reason: str(formData, "reason"), requested_by: profile.id }).select("id").single();
  if (error || !req) redirect(`${back}?error=${encodeURIComponent(error?.message ?? "Erreur")}`);
  const items = (tasks ?? []).map((t) => ({ request_id: req.id, task_id: t.id, old_start: t.baseline_start, old_end: t.baseline_end, new_start: t.start_date, new_end: t.end_date }));
  const { error: e2 } = await supabase.from("change_request_items").insert(items);
  if (e2) { await supabase.from("change_requests").delete().eq("id", req.id); redirect(`${back}?error=${encodeURIComponent(e2.message)}`); }
  revalidatePath(back); revalidatePath(`/projects/${projectId}/planning`);
  redirect(`${back}?ok=${encodeURIComponent("Demande soumise")}`);
}

/** Approuve (applique la nouvelle reference) ou refuse une demande. Administrateur ou chef de projet. */
export async function decideChangeRequest(decision: "approve" | "refuse", formData: FormData) {
  await requireProfile();
  const projectId = str(formData, "project_id"), id = str(formData, "id"), approve = decision === "approve";
  const back = `/projects/${projectId}/changes`;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("decide_change_request", { p_id: id, p_approve: approve, p_note: str(formData, "note") });
  if (error) redirect(`${back}?error=${encodeURIComponent(error.message)}`);
  for (const p of [back, `/projects/${projectId}/planning`, `/projects/${projectId}/settings`, `/projects/${projectId}/history`]) revalidatePath(p);
  redirect(`${back}?ok=${encodeURIComponent(approve ? `Demande approuvee : reference mise a jour sur ${data ?? 0} tache(s)` : "Demande refusee")}`);
}

/** Retire une demande encore soumise (demandeur, chef de projet ou administrateur). */
export async function deleteChangeRequest(formData: FormData) {
  await requireProfile();
  const projectId = str(formData, "project_id"), id = str(formData, "id");
  const supabase = await createClient();
  await supabase.from("change_requests").delete().eq("id", id);
  revalidatePath(`/projects/${projectId}/changes`); revalidatePath(`/projects/${projectId}/planning`);
  redirect(`/projects/${projectId}/changes`);
}
