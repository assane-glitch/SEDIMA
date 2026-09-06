"use client";
import { DateInput } from "@/components/ui/DateInput";
import { useEffect, useTransition } from "react";
import { deleteMilestone, saveMilestone, toggleMilestone } from "@/app/(app)/projects/actions";
import { formatDate } from "@/lib/format";
import type { Milestone } from "@/lib/types";

export function MilestoneDrawer({ milestone, projectId, defaultDate, onClose }: { milestone: Milestone | null; projectId: string; defaultDate: string; onClose: () => void }) {
  const [pending, start] = useTransition();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  const run = (action: (fd: FormData) => Promise<void>, extra: Record<string, string>) => {
    const fd = new FormData(); fd.set("project_id", projectId); if (milestone) fd.set("id", milestone.id);
    for (const [k, v] of Object.entries(extra)) fd.set(k, v);
    start(async () => { await action(fd); onClose(); });
  };
  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-ink/20" onClick={onClose}>
      <div className="h-full w-full max-w-sm overflow-y-auto border-l border-line-hair bg-surface p-5" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-start justify-between">
          <div><div className="eyebrow">Jalon</div><h2 className="card-title">{milestone ? milestone.name : "Nouveau jalon"}</h2></div>
          <button onClick={onClose} className="btn-ghost text-[14px]" aria-label="Fermer">×</button>
        </div>
        {milestone?.reached_on && <div className="chip-ok mb-4">Atteint le {formatDate(milestone.reached_on)}</div>}
        <form action={(fd) => start(async () => { await saveMilestone(fd); onClose(); })} className="space-y-3">
          <input type="hidden" name="project_id" value={projectId} />
          {milestone && <input type="hidden" name="id" value={milestone.id} />}
          <div><label className="label">Nom</label><input name="name" required defaultValue={milestone?.name} placeholder="Ex. Reception des travaux" className="input" /></div>
          <div><label className="label">Date cible</label><DateInput name="due_date" required defaultValue={milestone?.due_date ?? defaultDate} className="input" /></div>
          <div><label className="label">Notes</label><textarea name="notes" rows={3} defaultValue={milestone?.notes} className="input" /></div>
          <div className="flex items-center justify-between pt-1">
            <div className="flex gap-2">
              {milestone && <button type="button" disabled={pending} className="btn-danger" onClick={() => confirm("Supprimer ce jalon ?") && run(deleteMilestone, {})}>Supprimer</button>}
              {milestone && <button type="button" disabled={pending} className="btn-secondary" onClick={() => run(toggleMilestone, { reached: milestone.reached_on ? "0" : "1" })}>{milestone.reached_on ? "Non atteint" : "✓ Atteint"}</button>}
            </div>
            <button type="submit" disabled={pending} className="btn-primary">{pending ? "Enregistrement…" : "Enregistrer"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
