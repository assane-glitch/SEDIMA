"use client";
import { useEffect, useTransition } from "react";
import { deleteTask, saveTask } from "@/app/(app)/projects/actions";
import { formatDate, formatMoney, pct } from "@/lib/format";
import { TASK_STATUS_LABELS, type Profile } from "@/lib/types";
import { ProgressBar } from "@/components/ui";
import type { GanttRow } from "./Gantt";

export function TaskDrawer({ task, people, currency, projectId, canEdit, defaults, onClose }: {
  task: GanttRow | null; people: Profile[]; currency: string; projectId: string; canEdit: boolean; defaults: { start: string; end: string }; onClose: () => void;
}) {
  const [pending, start] = useTransition();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const responsible = task?.responsible_id ? people.find((p) => p.id === task.responsible_id) : undefined;
  const over = task && task.budget > 0 && task.spent > task.budget;

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-black/30" onClick={onClose}>
      <div className="h-full w-full max-w-md overflow-y-auto border-l border-line-hair bg-surface p-5" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-start justify-between">
          <h2 className="card-title">{task ? task.name : "Nouvelle tache"}</h2>
          <button onClick={onClose} className="btn-ghost" aria-label="Fermer">×</button>
        </div>

        {task && (
          <div className="mb-5 space-y-2.5 rounded-lg border border-line-hair bg-surface-alt p-3 text-[10.5px]">
            <div className="flex justify-between"><span className="text-ink-muted">Periode</span><span>{formatDate(task.start_date)} → {formatDate(task.end_date)}</span></div>
            <div className="flex justify-between"><span className="text-ink-muted">Responsable</span><span>{responsible ? (responsible.full_name || responsible.email) : "—"}</span></div>
            <div className="flex justify-between"><span className="text-ink-muted">Statut</span><span>{TASK_STATUS_LABELS[task.status]}</span></div>
            <div>
              <div className="mb-1 flex justify-between"><span className="text-ink-muted">Avancement</span><span>{task.progress} %</span></div>
              <ProgressBar value={task.progress} />
            </div>
            <div>
              <div className="mb-1 flex justify-between"><span className="text-ink-muted">Budget consomme</span><span className={over ? "font-bold text-alert" : ""}>{formatMoney(task.spent, currency)} / {formatMoney(task.budget, currency)}</span></div>
              <ProgressBar value={pct(task.spent, task.budget)} tone={over ? "bad" : pct(task.spent, task.budget) > task.progress + 15 ? "warn" : "good"} />
            </div>
            {task.notes && <p className="whitespace-pre-wrap text-ink-body">{task.notes}</p>}
          </div>
        )}

        {canEdit && (
          <form
            action={(fd) => start(async () => { await saveTask(fd); onClose(); })}
            className="space-y-3"
          >
            <input type="hidden" name="project_id" value={projectId} />
            {task && <input type="hidden" name="id" value={task.id} />}
            <div>
              <label className="label">Nom</label>
              <input name="name" required defaultValue={task?.name} className="input" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="label">Debut</label><input name="start_date" type="date" required defaultValue={task?.start_date ?? defaults.start} className="input" /></div>
              <div><label className="label">Fin</label><input name="end_date" type="date" required defaultValue={task?.end_date ?? defaults.end} className="input" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="label">Avancement (%)</label><input name="progress" type="number" min={0} max={100} defaultValue={task?.progress ?? 0} className="input" /></div>
              <div>
                <label className="label">Statut</label>
                <select name="status" defaultValue={task?.status ?? "todo"} className="input">
                  {Object.entries(TASK_STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="label">Budget ({currency})</label><input name="budget" type="number" min={0} step="1" defaultValue={task?.budget ?? 0} className="input" /></div>
              <div>
                <label className="label">Responsable</label>
                <select name="responsible_id" defaultValue={task?.responsible_id ?? ""} className="input">
                  <option value="">—</option>
                  {people.map((p) => <option key={p.id} value={p.id}>{p.full_name || p.email}</option>)}
                </select>
              </div>
            </div>
            <div><label className="label">Notes</label><textarea name="notes" rows={3} defaultValue={task?.notes} className="input" /></div>
            <div className="flex items-center justify-between pt-2">
              {task ? (
                <button type="button" disabled={pending} className="btn-danger" onClick={() => {
                  if (!confirm("Supprimer cette tache ?")) return;
                  const fd = new FormData(); fd.set("project_id", projectId); fd.set("id", task.id);
                  start(async () => { await deleteTask(fd); onClose(); });
                }}>Supprimer</button>
              ) : <span />}
              <button type="submit" disabled={pending} className="btn-primary">{pending ? "Enregistrement…" : "Enregistrer"}</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
