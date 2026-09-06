import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile, Project, ProjectStats, Task } from "@/lib/types";

export async function loadProject(id: string) {
  const supabase = await createClient();
  const [{ data: project }, { data: stats }, { data: tasks }, { data: people }, { data: spentRows }, { data: fav }] = await Promise.all([
    supabase.from("projects").select("*").eq("id", id).maybeSingle(),
    supabase.from("project_stats").select("*").eq("project_id", id).maybeSingle(),
    supabase.from("tasks").select("*").eq("project_id", id).order("sort_order").order("start_date"),
    supabase.from("profiles").select("id,email,full_name,role").order("full_name"),
    supabase.from("expenses").select("task_id,amount").eq("project_id", id),
    supabase.from("user_favorites").select("project_id").eq("project_id", id).maybeSingle(),
  ]);
  if (!project) notFound();
  return {
    project: project as Project,
    stats: (stats ?? { project_id: id, budget: 0, spent: 0, task_count: 0, done_count: 0, progress: 0, late_count: 0 }) as ProjectStats,
    tasks: (tasks ?? []) as Task[],
    people: (people ?? []) as Profile[],
    favorite: !!fav,
    spentByTask: (spentRows ?? []).reduce<Map<string, number>>((m, r) => { if (r.task_id) m.set(r.task_id, (m.get(r.task_id) ?? 0) + Number(r.amount)); return m; }, new Map()),
  };
}
