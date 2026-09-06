import { createClient } from "@/lib/supabase/server";
import type { DocItem } from "@/components/documents/DocumentList";
import type { Document, Profile } from "@/lib/types";

/** Charge les documents (tous projets ou un seul) avec URL signees (1 h), auteur, projet et tache. */
export async function loadDocuments(projectId?: string) {
  const supabase = await createClient();
  let q = supabase.from("documents").select("*").order("created_at", { ascending: false }).limit(600);
  if (projectId) q = q.eq("project_id", projectId);
  const [{ data: docs }, { data: projects }, { data: tasks }, { data: people }] = await Promise.all([
    q,
    projectId ? supabase.from("projects").select("id,code,name").eq("id", projectId) : supabase.from("projects").select("id,code,name").neq("status", "hors_perimetre").order("code"),
    projectId ? supabase.from("tasks").select("id,name,wbs_code,project_id").eq("project_id", projectId).order("sort_order") : supabase.from("tasks").select("id,name,wbs_code,project_id").order("sort_order"),
    supabase.from("profiles").select("id,email,full_name,role"),
  ]);
  const list = (docs ?? []) as Document[];
  const urls = new Map<string, string>();
  if (list.length) {
    const { data: signed } = await supabase.storage.from("documents").createSignedUrls(list.map((d) => d.storage_path), 3600);
    for (const s of signed ?? []) if (s.signedUrl && s.path) urls.set(s.path, s.signedUrl);
  }
  const pmap = new Map((projects ?? []).map((p) => [p.id, p]));
  const tmap = new Map((tasks ?? []).map((t) => [t.id, t]));
  const who = new Map(((people ?? []) as Profile[]).map((p) => [p.id, p.full_name || p.email]));
  const items: DocItem[] = list.map((d) => { const t = d.task_id ? tmap.get(d.task_id) : undefined; return { ...d, url: urls.get(d.storage_path) ?? null, author: (d.uploaded_by && who.get(d.uploaded_by)) || "—", projectCode: pmap.get(d.project_id)?.code ?? "", projectName: pmap.get(d.project_id)?.name ?? "", taskLabel: t ? `${t.wbs_code ? t.wbs_code + " · " : ""}${t.name}` : "" }; });
  return { items, projects: (projects ?? []) as { id: string; code: string; name: string }[], tasks: (tasks ?? []) as { id: string; name: string; wbs_code: string | null; project_id: string }[] };
}
