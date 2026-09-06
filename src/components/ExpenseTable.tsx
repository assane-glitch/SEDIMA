import { Badge } from "@/components/ui";
import { formatDate, formatMoney } from "@/lib/format";
import { EXPENSE_STATUS_LABELS, EXPENSE_STATUS_TONE, type Expense } from "@/lib/types";
import { updateExpense, deleteExpense } from "@/app/(app)/projects/actions";

/** Journal des depenses : ID, designation, date, montant, fournisseur, projet, lot/tache, categorie, DA, statut. */
export function ExpenseTable({ expenses, currency, taskName, projectName, canEdit, showProject }: {
  expenses: Expense[]; currency: string; taskName: Map<string, string>; projectName?: Map<string, string>; canEdit: boolean; showProject?: boolean;
}) {
  const total = expenses.filter((e) => e.status !== "annulee").reduce((s, e) => s + Number(e.amount), 0);
  return (
    <div className="card overflow-x-auto">
      <table className="tbl">
        <thead><tr>
          <th>ID</th><th>Designation</th><th>Date</th><th className="num">Montant</th><th>Fournisseur</th>{showProject && <th>Projet</th>}<th>Lot / tache</th><th>Categorie</th><th>N° DA</th><th>Statut</th>{canEdit && <th />}
        </tr></thead>
        <tbody>
          {expenses.map((e) => (
            <tr key={e.id} className={e.status === "annulee" ? "opacity-60" : ""}>
              <td className="whitespace-nowrap font-mono text-[9.5px] text-ink-muted">{e.ref}</td>
              <td className="max-w-[260px] truncate font-semibold" title={e.description}>{e.description || "—"}{e.source === "mobile" && <span className="ml-1 text-[9px] font-normal text-ink-faint">mobile</span>}</td>
              <td className="whitespace-nowrap">{formatDate(e.spent_on)}</td>
              <td className="num whitespace-nowrap font-semibold">{formatMoney(Number(e.amount), currency)}</td>
              <td className="max-w-[160px] truncate">{e.supplier || "—"}</td>
              {showProject && <td className="max-w-[180px] truncate">{projectName?.get(e.project_id) ?? "—"}</td>}
              <td className="max-w-[200px] truncate text-ink-muted">{e.task_id ? taskName.get(e.task_id) ?? "—" : "Projet entier"}</td>
              <td className="capitalize text-ink-muted">{e.category.replace("_", " ")}</td>
              <td className="whitespace-nowrap font-mono text-[9.5px]">{e.da_number || "—"}</td>
              <td>
                {canEdit ? (
                  <form action={updateExpense} className="flex items-center gap-1">
                    <input type="hidden" name="project_id" value={e.project_id} /><input type="hidden" name="id" value={e.id} />
                    <select name="status" defaultValue={e.status} className="input !w-auto !py-[2px] !text-[9.5px]">{Object.entries(EXPENSE_STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
                    <button className="btn-secondary !px-1.5 !py-[2px]" title="Mettre a jour le statut">✓</button>
                  </form>
                ) : <Badge tone={EXPENSE_STATUS_TONE[e.status]}>{EXPENSE_STATUS_LABELS[e.status]}</Badge>}
              </td>
              {canEdit && <td className="num"><form action={deleteExpense}><input type="hidden" name="project_id" value={e.project_id} /><input type="hidden" name="id" value={e.id} /><button className="btn-ghost text-ink-faint hover:text-alert" title="Supprimer">×</button></form></td>}
            </tr>
          ))}
          {expenses.length === 0 && <tr><td colSpan={showProject ? 11 : 10} className="py-8 text-center text-ink-muted">Aucune depense enregistree.</td></tr>}
          {expenses.length > 0 && <tr><td colSpan={3} className="font-bold">Total hors annulees</td><td className="num font-bold">{formatMoney(total, currency)}</td><td colSpan={showProject ? 7 : 6} /></tr>}
        </tbody>
      </table>
    </div>
  );
}
