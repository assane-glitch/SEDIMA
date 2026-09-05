import Link from "next/link";
import { Icon } from "@/components/icons";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { formatDate, today } from "@/lib/format";
import type { Milestone } from "@/lib/types";
import { deleteMilestone, saveMilestone, toggleMilestone } from "../actions";

export function MilestonesCard({ projectId, milestones, canEdit, defaultDate }: { projectId: string; milestones: Milestone[]; canEdit: boolean; defaultDate: string }) {
  const t = today();
  return (
    <section className="card p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold">Jalons <span className="font-normal text-slate-400">{milestones.filter((m) => m.reached_on).length}/{milestones.length}</span></h2>
        <Link href={`/projects/${projectId}/planning`} className="text-xs text-brand-700 hover:underline">Voir sur le planning</Link>
      </div>
      {milestones.length === 0 && <p className="mb-3 text-sm text-slate-500">Aucun jalon defini.</p>}
      <ul className="space-y-1.5 text-sm">
        {milestones.map((m) => {
          const overdue = !m.reached_on && m.due_date < t;
          return (
            <li key={m.id} className="group flex items-center gap-2 rounded-lg px-1 py-1 hover:bg-slate-50">
              {canEdit ? (
                <form action={toggleMilestone}>
                  <input type="hidden" name="project_id" value={projectId} /><input type="hidden" name="id" value={m.id} /><input type="hidden" name="reached" value={m.reached_on ? "0" : "1"} />
                  <button title={m.reached_on ? "Marquer non atteint" : "Marquer atteint"} className={`flex h-5 w-5 items-center justify-center rounded-md border ${m.reached_on ? "border-leaf-600 bg-leaf-500 text-white" : overdue ? "border-brand-500" : "border-slate-300"}`}>
                    {m.reached_on && <Icon name="check" className="h-3 w-3" strokeWidth={3} />}
                  </button>
                </form>
              ) : (
                <Icon name={m.reached_on ? "check" : "flag"} className={`h-4 w-4 ${m.reached_on ? "text-leaf-600" : overdue ? "text-brand-600" : "text-slate-400"}`} />
              )}
              <span className={`flex-1 truncate ${m.reached_on ? "text-slate-400 line-through" : ""}`} title={m.notes || undefined}>{m.name}</span>
              <span className={`text-xs tabular-nums ${overdue ? "font-medium text-brand-700" : "text-slate-500"}`}>{m.reached_on ? `atteint le ${formatDate(m.reached_on)}` : formatDate(m.due_date)}</span>
              {canEdit && (
                <form action={deleteMilestone} className="opacity-0 group-hover:opacity-100">
                  <input type="hidden" name="project_id" value={projectId} /><input type="hidden" name="id" value={m.id} />
                  <button className="text-slate-300 hover:text-brand-700" title="Supprimer"><Icon name="x" className="h-3.5 w-3.5" /></button>
                </form>
              )}
            </li>
          );
        })}
      </ul>
      {canEdit && (
        <form action={saveMilestone} className="mt-3 flex items-end gap-2 border-t border-slate-100 pt-3">
          <input type="hidden" name="project_id" value={projectId} />
          <div className="flex-1"><label className="label">Nouveau jalon</label><input name="name" required placeholder="Ex. Livraison batiment" className="input !py-1.5" /></div>
          <div><label className="label">Date</label><input name="due_date" type="date" required defaultValue={defaultDate} className="input !py-1.5" /></div>
          <SubmitButton className="btn-secondary !py-1.5" pendingText="…">Ajouter</SubmitButton>
        </form>
      )}
    </section>
  );
}
