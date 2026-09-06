"use client";
import { useEffect, useTransition } from "react";
import { deleteTask, saveTask } from "@/app/(app)/projects/actions";
import { formatDate, formatMoney, pct } from "@/lib/format";
import { TASK_STATUS_LABELS, type Profile, type Task } from "@/lib/types";
import { ProgressBar } from "@/components/ui";

export function TaskDrawer({ task, lots, tasks, people, currency, projectId, canEdit, defaults, spent, onClose }: {
  task: Task | null; lots: { id: string; name: string }[]; tasks: Task[]; people: Profile[]; currency: string; projectId: string; canEdit: boolean;
  defaults: { start: string; end: string }; spent: number; onClose: () => void;
}) {
  const [pending, start] = useTransition();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  const responsible = task?.responsible_id ? people.find((p) => p.id === task.responsible_id) : undefined;
  const over = task && Number(task.budget) > 0 && spent > Number(task.budget);
  const isLot = task ? !task.parent_id && tasks.some((t) => t.parent_id === task.id) : false;
  const dep = task?.depends_on ? tasks.find((t) => t.id === task.depends_on) : undefined;

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-ink/20" onClick={onClose}>
      <div className="h-full w-full max-w-md overflow-y-auto border-l border-line-hair bg-surface p-5" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            {task?.wbs_code && <div className="eyebrow">{isLot ? "Lot" : "Tache"} {task.wbs_code}</div>}
            <h2 className="card-title truncate">{task ? task.name : "Nouvelle tache"}</h2>
          </div>
          <button onClick={onClose} className="btn-ghost text-[14px]" aria-label="Fermer">×</button>
        </div>

        {task && (
          <div className="mb-5 space-y-2.5 rounded-lg border border-line-hair bg-surface-alt p-3 text-[10.5px]">
            <div className="flex justify-between"><span className="text-ink-muted">Periode</span><span>{formatDate(task.start_date)} → {formatDate(task.end_date)}</span></div>
            <div className="flex justify-between"><span className="text-ink-muted">Responsable</span><span>{responsible ? (responsible.full_name || responsible.email) : task.responsible_role || "—"}</span></div>
            {dep && <div className="flex justify-between"><span className="text-ink-muted">Depend de</span><span className="truncate pl-4">{dep.wbs_code} {dep.name} <span className="text-ink-faint">({task.link_type === "DD" ? "debut-debut" : "fin-debut"})</span></span></div>}
            <div className="flex justify-between"><span className="text-ink-muted">Statut</span><span>{TASK_STATUS_LABELS[task.status]}</span></div>
            <div><div className="mb-1 flex justify-between"><span className="text-ink-muted">Avancement</span><span>{task.progress} %</span></div><ProgressBar value={task.progress} /></div>
            {!isLot && (
              <div>
                <div className="mb-1 flex justify-between"><span className="text-ink-muted">Budget consomme</span><span className={over ? "font-bold text-alert" : ""}>{formatMoney(spent, currency)} / {formatMoney(Number(task.budget), currency)}</span></div>
                <ProgressBar value={pct(spent, Number(task.budget))} tone={over ? "alert" : pct(spent, Number(task.budget)) > task.progress + 15 ? "warn" : "ok"} />
                {(Number(task.customs) > 0 || Number(task.vat) > 0) && <div className="hint mt-1">Douanes {formatMoney(Number(task.customs), currency)} · TVA {formatMoney(Number(task.vat), currency)} · TTC {formatMoney(Number(task.budget) + Number(task.customs) + Number(task.vat), currency)}</div>}
              </div>
            )}
            {(task.estimate_method || task.confidence) && <div className="hint">Estimation : {task.estimate_method || "—"} · confiance {task.confidence || "—"}</div>}
            {task.notes && <p className="whitespace-pre-wrap text-ink-body">{task.notes}</p>}
          </div>
        )}

        {canEdit && (
          <form action={(fd) => start(async () => { await saveTask(fd); onClose(); })} className="space-y-3">
            <input type="hidden" name="project_id" value={projectId} />
            {task && <input type="hidden" name="id" value={task.id} />}
            <div className="grid grid-cols-[80px_1fr] gap-3">
              <div><label className="label">Code WBS</label><input name="wbs_code" defaultValue={task?.wbs_code ?? ""} placeholder="L2.3" className="input" /></div>
              <div><label className="label">Nom</label><input name="name" required defaultValue={task?.name} className="input" /></div>
            </div>
            {!isLot && (
              <div>
                <label className="label">Lot</label>
                <select name="parent_id" defaultValue={task?.parent_id ?? ""} className="input">
                  <option value="">Aucun (ligne de premier niveau)</option>
                  {lots.filter((l) => l.id !== task?.id).map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div><label className="label">Debut</label><input name="start_date" type="date" required defaultValue={task?.start_date ?? defaults.start} className="input" /></div>
              <div><label className="label">Fin</label><input name="end_date" type="date" required defaultValue={task?.end_date ?? defaults.end} className="input" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="label">Avancement (%)</label><input name="progress" type="number" min={0} max={100} defaultValue={task?.progress ?? 0} className="input" /></div>
              <div><label className="label">Statut</label>
                <select name="status" defaultValue={task?.status ?? "todo"} className="input">{Object.entries(TASK_STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="label">Responsable (compte)</label>
                <select name="responsible_id" defaultValue={task?.responsible_id ?? ""} className="input"><option value="">—</option>{people.map((p) => <option key={p.id} value={p.id}>{p.full_name || p.email}</option>)}</select></div>
              <div><label className="label">Role responsable</label><input name="responsible_role" defaultValue={task?.responsible_role ?? ""} placeholder="Conducteur de travaux" className="input" /></div>
            </div>
            {!isLot && (
              <div className="grid grid-cols-[1fr_110px] gap-3">
                <div><label className="label">Depend de</label>
                  <select name="depends_on" defaultValue={task?.depends_on ?? ""} className="input">
                    <option value="">—</option>
                    {tasks.filter((t) => t.id !== task?.id).map((t) => <option key={t.id} value={t.id}>{t.wbs_code ? `${t.wbs_code} · ` : ""}{t.name}</option>)}
                  </select></div>
                <div><label className="label">Type de lien</label>
                  <select name="link_type" defaultValue={task?.link_type || "FD"} className="input"><option value="FD">Fin → debut</option><option value="DD">Debut → debut</option></select></div>
              </div>
            )}
            {!isLot && <div><label className="label">Budget HTVA ({currency})</label><input name="budget" type="number" min={0} step="1" defaultValue={task?.budget ?? 0} className="input" /></div>}
            <div><label className="label">Notes</label><textarea name="notes" rows={3} defaultValue={task?.notes} className="input" /></div>
            <div className="flex items-center justify-between pt-1">
              {task ? (
                <button type="button" disabled={pending} className="btn-danger" onClick={() => {
                  if (!confirm(isLot ? "Supprimer ce lot et toutes ses taches ?" : "Supprimer cette tache ?")) return;
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
