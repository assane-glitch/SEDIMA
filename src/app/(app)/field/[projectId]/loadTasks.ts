import { createClient } from "@/lib/supabase/server";

export async function loadOpenTasks(projectId: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("tasks").select("id,name").eq("project_id", projectId).neq("status", "done").order("sort_order");
  return (data ?? []) as { id: string; name: string }[];
}
