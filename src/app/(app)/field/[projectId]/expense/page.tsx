import { addExpense } from "@/app/(app)/projects/actions";
import { today } from "@/lib/format";
import { FieldForm } from "../FieldForm";
import { loadOpenTasks } from "../loadTasks";

export default async function FieldExpense({ params, searchParams }: { params: Promise<{ projectId: string }>; searchParams: Promise<{ error?: string }> }) {
  const { projectId } = await params;
  const { error } = await searchParams;
  const tasks = await loadOpenTasks(projectId);
  return (
    <FieldForm projectId={projectId} title="Depense" action={addExpense} error={error}>
      <div><label className="label">Montant</label><input name="amount" type="number" inputMode="numeric" min={0} step="1" required className="input" /></div>
      <div><label className="label">Date</label><input name="spent_on" type="date" required defaultValue={today()} className="input" /></div>
      <div><label className="label">Categorie</label>
        <select name="category" className="input"><option value="materiaux">Materiaux</option><option value="main_oeuvre">Main d&apos;oeuvre</option><option value="equipement">Equipement</option><option value="transport">Transport</option><option value="services">Services</option><option value="general">General</option></select></div>
      <div><label className="label">Tache concernee</label><select name="task_id" className="input"><option value="">—</option>{tasks.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select></div>
      <div><label className="label">Description</label><input name="description" placeholder="Fournisseur, objet…" className="input" /></div>
    </FieldForm>
  );
}
