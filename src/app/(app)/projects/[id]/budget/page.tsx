import { Alert, Stat } from "@/components/ui";
import { BudgetTable } from "@/components/budget/BudgetTable";
import { BudgetYears } from "@/components/budget/BudgetYears";
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

export default async function BudgetPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string; ok?: string }> }) {
  const { id } = await params;
  const { error, ok } = await searchParams;
  const profile = await requireProfile();
  const supabase = await createClient();
  const [{ project, tasks, people, stats }, lists, { data: exp }, { data: years }] = await Promise.all([
    loadProject(id), getLists(),
    supabase.from("expenses").select("*").eq("project_id", id).order("spent_on", { ascending: false }).order("created_at", { ascending: false }),
    supabase.from("project_budget_years").select("year,amount").eq("project_id", id).order("year"),
  ]);
  const excluded = excludedStatuses(lists.expense_status);
  const expenses = (exp ?? []) as Expense[];
  const live = expenses.filter((e) => !excluded.has(e.status));
  const engaged = live.reduce((s, e) => s + Number(e.amount), 0);
  const paid = live.filter((e) => e.status === "payee").reduce((s, e) => s + Number(e.amount), 0);
  const budget = Number(project.budget), rebuilt = Number(stats.rebuilt_cost), cur = project.currency;
  const progress = Number(stats.progress);
  const earned = Math.round((budget * progress) / 100);
  const spentByTask: Record<string, number> = {};
  for (const e of live) if (e.task_id) spentByTask[e.task_id] = (spentByTask[e.task_id] ?? 0) + Number(e.amount);
  const taskName = new Map(tasks.map((t) => [t.id, `${t.wbs_code ? t.wbs_code + " · " : ""}${t.name}`]));
  const byCat = new Map<string, number>(), bySt = new Map<string, number>();
  for (const e of live) byCat.set(e.category, (byCat.get(e.category) ?? 0) + Number(e.amount));
  for (const e of expenses) bySt.set(e.status, (bySt.get(e.status) ?? 0) + Number(e.amount));
  const editor = canEdit(profile);

  return (
    <>
      <ProjectHeader project={project} manager={people.find((p) => p.id === project.manager_id)} />
      <ProjectTabs id={id} canEdit={editor} />
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Stat label="Budget du projet" value={formatMoney(budget, cur)} hint={Number(project.budget_kpmg) ? `Ref. KPMG : ${formatMoney(Number(project.budget_kpmg), cur)}` : undefined} />
        <Stat label="Cout reconstitue (taches)" value={formatMoney(rebuilt, cur)} hint={budget ? `${rebuilt > budget ? "+" : ""}${formatMoney(rebuilt - budget, cur)} vs budget` : undefined} tone={rebuilt > budget && budget > 0 ? "warn" : "default"} />
        <Stat label="Engage" value={formatMoney(engaged, cur)} hint={`${pct(engaged, budget)} % du budget · paye ${formatMoney(paid, cur)}`} tone={engaged > budget && budget > 0 ? "bad" : "default"} />
        <Stat label="Reste a engager" value={formatMoney(budget - engaged, cur)} tone={budget - engaged < 0 ? "bad" : "default"} />
        <Stat label="Valeur acquise" value={formatMoney(earned, cur)} hint={`Avancement ${progress} % · ${engaged > earned ? "depense en avance de " + formatMoney(engaged - earned, cur) : "depense en retrait de " + formatMoney(earned - engaged, cur)}`} tone={engaged > earned * 1.15 && earned > 0 ? "warn" : "default"} />
      </div>
      {error && <div className="mb-4"><Alert>{error}</Alert></div>}
      {ok && <div className="mb-4"><Alert tone="green">{ok === "tranches" ? "Tranches enregistrees." : "Depense enregistree."}</Alert></div>}
      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <BudgetTable tasks={tasks} spentByTask={spentByTask} currency={cur} />
          <ExpenseTable expenses={expenses} currency={cur} taskName={taskName} canEdit={editor} categories={lists.expense_category} statuses={lists.expense_status} />
        </div>
        <div className="space-y-4">
          <BudgetYears projectId={id} years={(years ?? []).map((y) => ({ year: Number(y.year), amount: Number(y.amount) }))} budget={budget} currency={cur} canEdit={editor} />
          {(byCat.size > 0 || bySt.size > 0) && (
            <div className="card card-pad text-[10.5px]">
              {byCat.size > 0 && <><div className="eyebrow mb-1.5">Engage par categorie</div>{[...byCat.entries()].sort((a, b) => b[1] - a[1]).map(([c, v]) => <div key={c} className="flex justify-between py-0.5"><span>{labelOf(lists.expense_category, c)}</span><span className="tabular-nums">{formatMoney(v, cur)}</span></div>)}</>}
              {bySt.size > 0 && <><div className="eyebrow mb-1.5 mt-3">Par statut</div>{[...bySt.entries()].sort((a, b) => b[1] - a[1]).map(([s, v]) => <div key={s} className={`flex justify-between py-0.5 ${excluded.has(s) ? "text-ink-faint line-through" : ""}`}><span>{labelOf(lists.expense_status, s)}</span><span className="tabular-nums">{formatMoney(v, cur)}</span></div>)}</>}
            </div>
          )}
          {canSubmit(profile) && (
            <div className="card card-pad">
              <div className="card-title mb-3">Enregistrer une depense</div>
              <ExpenseForm projects={[{ id, code: project.code, name: project.name, currency: cur }]} tasks={tasks.map((t) => ({ id: t.id, name: t.name, wbs_code: t.wbs_code, parent_id: t.parent_id, project_id: id }))} projectId={id} redirect={`/projects/${id}/budget`} categories={lists.expense_category} statuses={lists.expense_status} />
            </div>
          )}
        </div>
      </div>
    </>
  );
}
