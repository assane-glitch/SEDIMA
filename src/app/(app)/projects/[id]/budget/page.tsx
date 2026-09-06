import { Alert, Stat } from "@/components/ui";
import { ExpenseForm } from "@/components/ExpenseForm";
import { ExpenseTable } from "@/components/ExpenseTable";
import { ProjectHeader } from "../ProjectHeader";

import { formatMoney, pct } from "@/lib/format";
import { excludedStatuses, getLists, labelOf } from "@/lib/reference";
import { canEdit, canSubmit, requireProfile } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import type { Expense } from "@/lib/types";
import { ProjectTabs } from "../ProjectTabs";
import { loadProject } from "../loadProject";

export default async function ExpensesPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string; ok?: string }> }) {
  const { id } = await params;
  const { error, ok } = await searchParams;
  const profile = await requireProfile();
  const { project, tasks, people } = await loadProject(id);
  const lists = await getLists();
  const excluded = excludedStatuses(lists.expense_status);
  const supabase = await createClient();
  const { data } = await supabase.from("expenses").select("*").eq("project_id", id).order("spent_on", { ascending: false }).order("created_at", { ascending: false });
  const expenses = (data ?? []) as Expense[];
  const taskName = new Map(tasks.map((t) => [t.id, `${t.wbs_code ? t.wbs_code + " · " : ""}${t.name}`]));
    const total = expenses.filter((e) => !excluded.has(e.status)).reduce((s, e) => s + Number(e.amount), 0);
  const byCat = new Map<string, number>();
  for (const e of expenses) if (!excluded.has(e.status)) byCat.set(e.category, (byCat.get(e.category) ?? 0) + Number(e.amount));

  return (
    <>
      <ProjectHeader project={project} manager={people.find((p) => p.id === project.manager_id)} />
      <ProjectTabs id={id} canEdit={canEdit(profile)} />
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Budget" value={formatMoney(Number(project.budget), project.currency)} />
        <Stat label="Depense" value={formatMoney(total, project.currency)} hint={`${pct(total, Number(project.budget))} % du budget`} tone={total > Number(project.budget) && Number(project.budget) > 0 ? "bad" : "default"} />
        <Stat label="Reste" value={formatMoney(Number(project.budget) - total, project.currency)} tone={Number(project.budget) - total < 0 ? "bad" : "default"} />
        <Stat label="Lignes" value={expenses.length} />
      </div>
      {error && <div className="mb-4"><Alert>{error}</Alert></div>}
      {ok && <div className="mb-4"><Alert tone="green">Depense enregistree.</Alert></div>}
      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <ExpenseTable expenses={expenses} currency={project.currency} taskName={taskName} canEdit={canEdit(profile)} categories={lists.expense_category} statuses={lists.expense_status} />
          {byCat.size > 0 && (
            <div className="card card-pad text-[10.5px]">
              <div className="eyebrow mb-2">Par categorie</div>
              {[...byCat.entries()].sort((a, b) => b[1] - a[1]).map(([c, v]) => <div key={c} className="flex justify-between py-0.5"><span>{labelOf(lists.expense_category, c)}</span><span className="tabular-nums">{formatMoney(v, project.currency)}</span></div>)}
            </div>
          )}
        </div>
        {canSubmit(profile) && (
          <div className="card card-pad h-fit">
            <div className="card-title mb-3">Enregistrer une depense</div>
            <ExpenseForm projects={[{ id, code: project.code, name: project.name, currency: project.currency }]} tasks={tasks.map((t) => ({ id: t.id, name: t.name, wbs_code: t.wbs_code, parent_id: t.parent_id, project_id: id }))} projectId={id} redirect={`/projects/${id}/budget`} categories={lists.expense_category} statuses={lists.expense_status} />
          </div>
        )}
      </div>
    </>
  );
}
