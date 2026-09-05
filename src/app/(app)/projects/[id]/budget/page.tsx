import { Alert, Badge, Stat } from "@/components/ui";
import { ProjectHeader } from "../ProjectHeader";
import { SubmitButton } from "@/components/ui/SubmitButton";

import { formatDate, formatMoney, pct, today } from "@/lib/format";
import { canEdit, canSubmit, requireProfile } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import type { Expense } from "@/lib/types";
import { addExpense, deleteExpense } from "../../actions";
import { ProjectTabs } from "../ProjectTabs";
import { loadProject } from "../loadProject";

export default async function ExpensesPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string; ok?: string }> }) {
  const { id } = await params;
  const { error, ok } = await searchParams;
  const profile = await requireProfile();
  const { project, tasks, people } = await loadProject(id);
  const supabase = await createClient();
  const { data } = await supabase.from("expenses").select("*").eq("project_id", id).order("spent_on", { ascending: false }).order("created_at", { ascending: false });
  const expenses = (data ?? []) as Expense[];
  const taskName = new Map(tasks.map((t) => [t.id, t.name]));
  const who = new Map(people.map((p) => [p.id, p.full_name || p.email]));
  const total = expenses.reduce((s, e) => s + Number(e.amount), 0);
  const byCat = new Map<string, number>();
  for (const e of expenses) byCat.set(e.category, (byCat.get(e.category) ?? 0) + Number(e.amount));

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
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="card overflow-hidden">
          <table className="tbl">
            <thead>
              <tr><th className="px-4 py-2">Date</th><th className="px-4 py-2">Description</th><th className="hidden px-4 py-2 md:table-cell">Tache</th><th className="hidden px-4 py-2 md:table-cell">Saisi par</th><th className="px-4 py-2 text-right">Montant</th>{canEdit(profile) && <th />}</tr>
            </thead>
            <tbody>
              {expenses.map((e) => (
                <tr key={e.id}>
                  <td className="whitespace-nowrap px-4 py-2">{formatDate(e.spent_on)}</td>
                  <td className="px-4 py-2">{e.description || <span className="text-ink-faint">—</span>} <Badge>{e.category}</Badge> {e.source === "mobile" && <Badge tone="blue">mobile</Badge>}</td>
                  <td className="hidden px-4 py-2 text-ink-body md:table-cell">{e.task_id ? taskName.get(e.task_id) : "—"}</td>
                  <td className="hidden px-4 py-2 text-ink-body md:table-cell">{e.created_by ? who.get(e.created_by) : "—"}</td>
                  <td className="whitespace-nowrap px-4 py-2 text-right tabular-nums">{formatMoney(Number(e.amount), project.currency)}</td>
                  {canEdit(profile) && <td className="px-2 py-2 text-right"><form action={deleteExpense}><input type="hidden" name="project_id" value={id} /><input type="hidden" name="id" value={e.id} /><button className="text-[10px] text-ink-faint hover:text-alert">Suppr.</button></form></td>}
                </tr>
              ))}
              {expenses.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-ink-muted">Aucune depense enregistree.</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="space-y-4">
          {byCat.size > 0 && (
            <div className="card p-4 text-[10.5px]">
              <div className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-ink-muted">Par categorie</div>
              {[...byCat.entries()].sort((a, b) => b[1] - a[1]).map(([c, v]) => <div key={c} className="flex justify-between py-0.5"><span>{c}</span><span className="tabular-nums">{formatMoney(v, project.currency)}</span></div>)}
            </div>
          )}
          {canSubmit(profile) && (
            <form action={addExpense} className="card space-y-3 p-4">
              <div className="text-[10.5px] font-semibold">Ajouter une depense</div>
              <input type="hidden" name="project_id" value={id} />
              <div><label className="label">Montant ({project.currency})</label><input name="amount" type="number" min={0} step="1" required className="input" /></div>
              <div><label className="label">Date</label><input name="spent_on" type="date" required defaultValue={today()} className="input" /></div>
              <div><label className="label">Categorie</label>
                <select name="category" className="input"><option value="materiaux">Materiaux</option><option value="main_oeuvre">Main d&apos;oeuvre</option><option value="equipement">Equipement</option><option value="transport">Transport</option><option value="services">Services</option><option value="general">General</option></select></div>
              <div><label className="label">Tache</label><select name="task_id" className="input"><option value="">—</option>{tasks.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select></div>
              <div><label className="label">Description</label><input name="description" className="input" /></div>
              <SubmitButton className="btn-primary w-full">Enregistrer</SubmitButton>
            </form>
          )}
        </div>
      </div>
    </>
  );
}
