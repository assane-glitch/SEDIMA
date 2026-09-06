import { addRegisterEntry } from "@/app/(app)/projects/actions";
import { today } from "@/lib/format";
import { getLists, registerFields } from "@/lib/reference";
import { FieldForm } from "../FieldForm";
import { loadOpenTasks } from "../loadTasks";
import { RegisterFields } from "./RegisterFields";

export default async function FieldRegister({ params, searchParams }: { params: Promise<{ projectId: string }>; searchParams: Promise<{ error?: string }> }) {
  const { projectId } = await params;
  const { error } = await searchParams;
  const tasks = await loadOpenTasks(projectId);
  const lists = await getLists();
  const types = lists.register_type.map((r) => ({ value: r.value, label: r.label, fields: registerFields(r) }));
  return (
    <FieldForm projectId={projectId} title="Registre" action={addRegisterEntry} error={error}>
      <div><label className="label">Date</label><input name="entry_date" type="date" required defaultValue={today()} className="input" /></div>
      <div><label className="label">Tache concernee</label><select name="task_id" className="input"><option value="">—</option>{tasks.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select></div>
      <RegisterFields types={types} />
    </FieldForm>
  );
}
