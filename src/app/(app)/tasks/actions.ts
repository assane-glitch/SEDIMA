"use server";
import { requireProfile } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import type { AuditEntry, Expense, JournalEntry, RegisterEntry } from "@/lib/types";

/** Contexte d'une tache pour le tiroir (depenses, journal, registres, modifications), charge a l'ouverture. */
export async function loadTaskContext(projectId: string, taskId: string) {
  await requireProfile();
  const supabase = await createClient();
  const [{ data: exp }, { data: jr }, { data: rg }, { data: au }] = await Promise.all([
    supabase.from("expenses").select("*").eq("project_id", projectId).eq("task_id", taskId).order("spent_on", { ascending: false }),
    supabase.from("journal_entries").select("*").eq("project_id", projectId).eq("task_id", taskId).order("entry_date", { ascending: false }).limit(200),
    supabase.from("register_entries").select("*").eq("project_id", projectId).eq("task_id", taskId).order("entry_date", { ascending: false }).limit(200),
    supabase.from("audit_log").select("*").eq("project_id", projectId).in("table_name", ["tasks", "expenses"]).order("changed_at", { ascending: false }).limit(500),
  ]);
  const audit = ((au ?? []) as AuditEntry[]).filter((a) => (a.table_name === "tasks" && a.record_id === taskId) || (a.table_name === "expenses" && (a.new_data?.task_id === taskId || a.old_data?.task_id === taskId)));
  return { expenses: (exp ?? []) as Expense[], journal: (jr ?? []) as JournalEntry[], registers: (rg ?? []) as RegisterEntry[], audit };
}
