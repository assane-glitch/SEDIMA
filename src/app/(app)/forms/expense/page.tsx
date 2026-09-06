import Link from "next/link";
import { Alert } from "@/components/ui";
import { ExpenseForm } from "@/components/ExpenseForm";
import { canSubmit, requireProfile } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { getLists } from "@/lib/reference";

export const metadata = { title: "Journal des depenses" };

export default async function GlobalExpensePage({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const { ok, error } = await searchParams;
  const profile = await requireProfile();
  const supabase = await createClient();
  const lists = await getLists();
  const [{ data: projects }, { data: tasks }] = await Promise.all([
    supabase.from("projects").select("id,code,name,currency").neq("status", "hors_perimetre").neq("status", "cloture").order("code"),
    supabase.from("tasks").select("id,name,wbs_code,parent_id,project_id").order("sort_order"),
  ]);
  return (
    <div className="mx-auto max-w-lg">
      <Link href="/forms" className="text-[10px] text-ink-muted">‹ Formulaires</Link>
      <h1 className="mb-1 mt-1 text-[16px] font-bold">Journal des depenses</h1>
      <p className="hint mb-4">La depense recoit un identifiant automatique et apparait dans l&apos;onglet Evenements du projet.</p>
      {ok && <div className="mb-3"><Alert tone="ok">Depense enregistree.</Alert></div>}
      {error && <div className="mb-3"><Alert>{error}</Alert></div>}
      {canSubmit(profile) ? (
        <div className="card card-pad">
          <ExpenseForm projects={projects ?? []} tasks={tasks ?? []} redirect="/forms/expense" mobile categories={lists.expense_category} statuses={lists.expense_status} />
        </div>
      ) : <Alert tone="warn">Votre compte est en lecture seule.</Alert>}
    </div>
  );
}
