"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { canEdit, requireProfile } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";

function str(fd: FormData, k: string) { return String(fd.get(k) ?? "").trim(); }
function num(fd: FormData, k: string) { const n = Number(String(fd.get(k) ?? "").replace(/\s/g, "")); return Number.isFinite(n) ? n : 0; }

export async function createProject(formData: FormData) {
  const profile = await requireProfile();
  if (!canEdit(profile)) redirect("/dashboard");
  const supabase = await createClient();
  const payload = {
    code: str(formData, "code").toUpperCase(),
    name: str(formData, "name"),
    description: str(formData, "description"),
    status: str(formData, "status") || "plan",
    site: str(formData, "site"),
    business_unit: str(formData, "business_unit"),
    category: str(formData, "category") || "autres",
    start_date: str(formData, "start_date"),
    end_date: str(formData, "end_date"),
    budget: num(formData, "budget"),
    currency: str(formData, "currency") || "XOF",
    manager_id: str(formData, "manager_id") || null,
    created_by: profile.id,
  };
  const { data, error } = await supabase.from("projects").insert(payload).select("id").single();
  if (error) redirect(`/projects/new?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/dashboard");
  redirect(`/projects/${data.id}`);
}

export async function updateProject(formData: FormData) {
  const profile = await requireProfile();
  if (!canEdit(profile)) return;
  const id = str(formData, "id");
  const supabase = await createClient();
  const { error } = await supabase.from("projects").update({
    code: str(formData, "code").toUpperCase(),
    name: str(formData, "name"),
    description: str(formData, "description"),
    status: str(formData, "status"),
    site: str(formData, "site"),
    business_unit: str(formData, "business_unit"),
    category: str(formData, "category") || "autres",
    start_date: str(formData, "start_date"),
    end_date: str(formData, "end_date"),
    budget: num(formData, "budget"),
    currency: str(formData, "currency") || "XOF",
    manager_id: str(formData, "manager_id") || null,
  }).eq("id", id);
  if (error) redirect(`/projects/${id}/settings?error=${encodeURIComponent(error.message)}`);
  revalidatePath(`/projects/${id}`);
  revalidatePath("/dashboard");
  redirect(`/projects/${id}`);
}

export async function deleteProject(formData: FormData) {
  const profile = await requireProfile();
  if (!canEdit(profile)) return;
  const id = str(formData, "id");
  const supabase = await createClient();
  await supabase.from("projects").delete().eq("id", id);
  revalidatePath("/dashboard");
  redirect("/dashboard");
}

export async function saveTask(formData: FormData) {
  const profile = await requireProfile();
  if (!canEdit(profile)) return;
  const projectId = str(formData, "project_id");
  const id = str(formData, "id");
  const supabase = await createClient();
  const payload = {
    project_id: projectId,
    name: str(formData, "name"),
    status: str(formData, "status") || "todo",
    start_date: str(formData, "start_date"),
    end_date: str(formData, "end_date"),
    progress: Math.max(0, Math.min(100, Math.round(num(formData, "progress")))),
    budget: num(formData, "budget"),
    responsible_id: str(formData, "responsible_id") || null,
    notes: str(formData, "notes"),
  };
  if (id) {
    await supabase.from("tasks").update(payload).eq("id", id);
  } else {
    const { data: last } = await supabase.from("tasks").select("sort_order").eq("project_id", projectId).order("sort_order", { ascending: false }).limit(1).maybeSingle();
    await supabase.from("tasks").insert({ ...payload, sort_order: (last?.sort_order ?? 0) + 10 });
  }
  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/dashboard");
}

export async function deleteTask(formData: FormData) {
  const profile = await requireProfile();
  if (!canEdit(profile)) return;
  const projectId = str(formData, "project_id");
  const supabase = await createClient();
  await supabase.from("tasks").delete().eq("id", str(formData, "id"));
  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/dashboard");
}

export async function moveTask(formData: FormData) {
  const profile = await requireProfile();
  if (!canEdit(profile)) return;
  const projectId = str(formData, "project_id");
  const id = str(formData, "id");
  const dir = str(formData, "dir") === "up" ? -1 : 1;
  const supabase = await createClient();
  const { data: tasks } = await supabase.from("tasks").select("id,sort_order").eq("project_id", projectId).order("sort_order");
  if (!tasks) return;
  const i = tasks.findIndex((t) => t.id === id);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= tasks.length) return;
  await Promise.all([
    supabase.from("tasks").update({ sort_order: tasks[j].sort_order }).eq("id", tasks[i].id),
    supabase.from("tasks").update({ sort_order: tasks[i].sort_order }).eq("id", tasks[j].id),
  ]);
  revalidatePath(`/projects/${projectId}`);
}

export async function addExpense(formData: FormData) {
  const profile = await requireProfile();
  const projectId = str(formData, "project_id");
  const supabase = await createClient();
  const { error } = await supabase.from("expenses").insert({
    project_id: projectId,
    task_id: str(formData, "task_id") || null,
    amount: num(formData, "amount"),
    spent_on: str(formData, "spent_on"),
    category: str(formData, "category") || "general",
    description: str(formData, "description"),
    source: str(formData, "source") === "mobile" ? "mobile" : "web",
    created_by: profile.id,
  });
  const back = str(formData, "redirect") || `/projects/${projectId}/budget`;
  if (error) redirect(`${back}?error=${encodeURIComponent(error.message)}`);
  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/dashboard");
  redirect(`${back}?ok=1`);
}

export async function deleteExpense(formData: FormData) {
  const profile = await requireProfile();
  if (!canEdit(profile)) return;
  const projectId = str(formData, "project_id");
  const supabase = await createClient();
  await supabase.from("expenses").delete().eq("id", str(formData, "id"));
  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/budget`);
  revalidatePath("/dashboard");
}

export async function addJournalEntry(formData: FormData) {
  const profile = await requireProfile();
  const projectId = str(formData, "project_id");
  const supabase = await createClient();
  const { error } = await supabase.from("journal_entries").insert({
    project_id: projectId,
    task_id: str(formData, "task_id") || null,
    entry_date: str(formData, "entry_date"),
    content: str(formData, "content"),
    location: str(formData, "location"),
    source: str(formData, "source") === "mobile" ? "mobile" : "web",
    author_id: profile.id,
  });
  const back = str(formData, "redirect") || `/projects/${projectId}/journal`;
  if (error) redirect(`${back}?error=${encodeURIComponent(error.message)}`);
  revalidatePath(`/projects/${projectId}/journal`);
  redirect(`${back}?ok=1`);
}

export async function addRegisterEntry(formData: FormData) {
  const profile = await requireProfile();
  const projectId = str(formData, "project_id");
  const data: Record<string, string | number> = {};
  for (const [k, v] of formData.entries()) {
    if (k.startsWith("f_") && typeof v === "string" && v.trim()) {
      const n = Number(v);
      data[k.slice(2)] = v.trim() !== "" && Number.isFinite(n) && /^-?\d+([.,]\d+)?$/.test(v.trim()) ? n : v.trim();
    }
  }
  const supabase = await createClient();
  const { error } = await supabase.from("register_entries").insert({
    project_id: projectId,
    task_id: str(formData, "task_id") || null,
    register_type: str(formData, "register_type"),
    entry_date: str(formData, "entry_date"),
    data,
    source: str(formData, "source") === "mobile" ? "mobile" : "web",
    author_id: profile.id,
  });
  const back = str(formData, "redirect") || `/projects/${projectId}/register`;
  if (error) redirect(`${back}?error=${encodeURIComponent(error.message)}`);
  revalidatePath(`/projects/${projectId}/register`);
  redirect(`${back}?ok=1`);
}

// ---------- Jalons ----------
export async function saveMilestone(formData: FormData) {
  const profile = await requireProfile();
  if (!canEdit(profile)) return;
  const projectId = str(formData, "project_id");
  const id = str(formData, "id");
  const supabase = await createClient();
  const payload = { project_id: projectId, name: str(formData, "name"), due_date: str(formData, "due_date"), notes: str(formData, "notes") };
  if (!payload.name || !payload.due_date) return;
  if (id) await supabase.from("milestones").update(payload).eq("id", id);
  else await supabase.from("milestones").insert(payload);
  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/planning`);
}

export async function toggleMilestone(formData: FormData) {
  const profile = await requireProfile();
  if (!canEdit(profile)) return;
  const projectId = str(formData, "project_id");
  const id = str(formData, "id");
  const reached = str(formData, "reached") === "1";
  const supabase = await createClient();
  await supabase.from("milestones").update({ reached_on: reached ? new Date().toISOString().slice(0, 10) : null }).eq("id", id);
  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/planning`);
}

export async function deleteMilestone(formData: FormData) {
  const profile = await requireProfile();
  if (!canEdit(profile)) return;
  const projectId = str(formData, "project_id");
  const supabase = await createClient();
  await supabase.from("milestones").delete().eq("id", str(formData, "id"));
  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/planning`);
}
