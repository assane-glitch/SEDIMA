import { DateInput } from "@/components/ui/DateInput";
import { addJournalEntry } from "@/app/(app)/projects/actions";
import { today } from "@/lib/format";
import { FieldForm } from "../FieldForm";
import { loadOpenTasks } from "../loadTasks";

export default async function FieldJournal({ params, searchParams }: { params: Promise<{ projectId: string }>; searchParams: Promise<{ error?: string }> }) {
  const { projectId } = await params;
  const { error } = await searchParams;
  const tasks = await loadOpenTasks(projectId);
  return (
    <FieldForm projectId={projectId} title="Journal du jour" action={addJournalEntry} error={error}>
      <div><label className="label">Date</label><DateInput name="entry_date" required defaultValue={today()} className="input" /></div>
      <div><label className="label">Tache concernee</label><select name="task_id" className="input"><option value="">—</option>{tasks.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select></div>
      <div><label className="label">Lieu</label><input name="location" placeholder="Site, zone…" className="input" /></div>
      <div><label className="label">Compte rendu</label><textarea name="content" rows={6} required placeholder="Travaux realises, effectifs, difficultes, meteo…" className="input" /></div>
    </FieldForm>
  );
}
