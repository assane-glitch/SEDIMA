"use server";
import { revalidatePath } from "next/cache";
import { canEdit, canSubmit, requireProfile } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";

/** Enregistre la fiche d'un fichier deja depose dans le bucket "documents". */
export async function addDocument(input: { project_id: string; task_id: string | null; name: string; doc_type: string; storage_path: string; mime_type: string; size_bytes: number; source: "web" | "mobile"; tags: string[] }) {
  const profile = await requireProfile();
  if (!canSubmit(profile)) return { error: "Compte en lecture seule." };
  const supabase = await createClient();
  const { error } = await supabase.from("documents").insert({ ...input, uploaded_by: profile.id });
  if (error) return { error: error.message };
  revalidatePath("/documents"); revalidatePath(`/projects/${input.project_id}/documents`); revalidatePath(`/projects/${input.project_id}/events`);
  return { ok: true };
}

/** Supprime la fiche et le fichier (editeurs seulement, les policies font foi). */
export async function deleteDocument(id: string) {
  const profile = await requireProfile();
  if (!canEdit(profile)) return { error: "Non autorise." };
  const supabase = await createClient();
  const { data: doc } = await supabase.from("documents").select("project_id,storage_path").eq("id", id).maybeSingle();
  if (!doc) return { error: "Document introuvable." };
  const { error } = await supabase.from("documents").delete().eq("id", id);
  if (error) return { error: error.message };
  await supabase.storage.from("documents").remove([doc.storage_path]);
  revalidatePath("/documents"); revalidatePath(`/projects/${doc.project_id}/documents`);
  return { ok: true };
}

/** Renomme ou reclasse un document (editeurs ou auteur). */
export async function updateDocument(id: string, patch: { name?: string; doc_type?: string; task_id?: string | null }) {
  await requireProfile();
  const supabase = await createClient();
  const { data: doc, error } = await supabase.from("documents").update(patch).eq("id", id).select("project_id").maybeSingle();
  if (error) return { error: error.message };
  if (doc) { revalidatePath("/documents"); revalidatePath(`/projects/${doc.project_id}/documents`); }
  return { ok: true };
}
