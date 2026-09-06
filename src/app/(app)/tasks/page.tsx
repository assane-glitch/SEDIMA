import { PageHeader } from "@/components/ui";
import { TaskList, type TaskProject } from "@/components/tasks/TaskList";
import { canEdit, requireProfile } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { getLists } from "@/lib/reference";
import type { Profile, Task } from "@/lib/types";

export const metadata = { title: "Tâches" };

export default async function TasksPage() {
  const profile = await requireProfile();
  const supabase = await createClient();
  const [{ data: projects }, { data: tasks }, { data: people }, { data: spentRows }, lists] = await Promise.all([
    supabase.from("projects").select("id,code,name,currency,start_date,end_date,status").neq("status", "hors_perimetre").order("code"),
    supabase.from("tasks").select("*").order("sort_order").order("start_date"),
    supabase.from("profiles").select("id,email,full_name,role").order("full_name"),
    supabase.from("expenses").select("task_id,amount"),
    getLists(),
  ]);
  const ids = new Set((projects ?? []).map((p) => p.id));
  const spentByTask: Record<string, number> = {};
  for (const r of spentRows ?? []) if (r.task_id) spentByTask[r.task_id] = (spentByTask[r.task_id] ?? 0) + Number(r.amount);
  return (
    <>
      <PageHeader title="Tâches" subtitle="Toutes les taches, tous projets confondus. Cliquer une ligne pour ouvrir la tache." />
      <TaskList mode="global" tasks={((tasks ?? []) as Task[]).filter((t) => ids.has(t.project_id))} projects={(projects ?? []) as TaskProject[]} people={(people ?? []) as Profile[]}
        spentByTask={spentByTask} lists={lists} me={profile} canEdit={canEdit(profile)} />
    </>
  );
}
