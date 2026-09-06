"use client";
import { useEffect, useState, useTransition } from "react";
import { addExpense, deleteExpense, deleteTask, saveTask, setTaskProgress } from "@/app/(app)/projects/actions";
import { formatDate, formatMoney, pct, today } from "@/lib/format";
import { TASK_STATUS_LABELS, type Expense, type Profile, type Task } from "@/lib/types";
import { ProgressBar } from "@/components/ui";

const CATEGORIES = [["materiaux", "Materiaux"], ["main_oeuvre", "Main d'oeuvre"], ["equipement", "Equipement"], ["transport", "Transport"], ["services", "Services"], ["general", "General"]];

export function TaskDrawer({ task, isLot, lots, tasks, expenses, people, currency, projectId, canEdit, defaults, spent, onClose }: {
  task: Task | null; isLot: boolean; lots: { id: string; name: string }[]; tasks: Task[]; expenses: Expense[]; people: Profile[]; currency: string; projectId: string; canEdit: boolean;
  defaults: { start: string; end: string }; spent: number; onClose: () => void;
}) {
  const [pending, start] = useTransition();
  const [tab, setTab] = useState<"suivi" | "fiche" | "depenses">(task ? "suivi" : "fiche");
  const [progress, setProgress] = useState(task?.progress ?? 0);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  const responsible = task?.responsible_id ? people.find((p) => p.id === task.responsible_id) : undefined;
  const budget = Number(task?.budget ?? 0);
  const over = budget > 0 && spent > budget;
  const dep = task?.depends_on ? tasks.find((t) => t.id === task.depends_on) : undefined;
  const who = new Map(people.map((p) => [p.id, p.full_name || p.email]));
  const tabBtn = (k: typeof tab, label: string) => <button onClick={() => setTab(k)} className={`-mb-px border-b-2 px-2.5 py-1.5 text-[10.5px] ${tab === k ? "border-ink font-bold text-ink" : "border-transparent text-ink-muted hover:text-ink"}`}>{label}</button>;

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-ink/20" onClick={onClose}>
      <div className="flex h-full w-full max-w-md flex-col border-l border-line-hair bg-surface" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3 px-5 pb-2 pt-4">
          <div className="min-w-0">
            <div className="eyebrow">{task ? (isLot ? "Lot" : "Tache") : "Nouvelle tache"} {task?.wbs_code}</div>
            <h2 className="card-title truncate">{task ? task.name : ""}</h2>
            {task && <div className="hint mt-0.5">{formatDate(task.start_date)} → {formatDate(task.end_date)} · {responsible ? (responsible.full_name || responsible.email) : task.responsible_role || "—"}</div>}
          </div>
          <button onClick={onClose} className="btn-ghost text-[14px]" aria-label="Fermer">×</button>
        </div>
        {task && <div className="flex border-b border-line-hair px-5">{tabBtn("suivi", "Suivi")}{tabBtn("fiche", "Fiche")}{!isLot && tabBtn("depenses", `Depenses (${expenses.length})`)}</div>}

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {/* ---- Suivi : avancement et budget en un coup d'oeil ---- */}
          {task && tab === "suivi" && (
            <div className="space-y-4 text-[10.5px]">
              <div className="rounded-lg border border-line-hair bg-surface-alt p-3">
                <div className="mb-1.5 flex items-center justify-between"><span className="eyebrow">Avancement</span><span className="text-[13.5px] font-bold tabular-nums">{progress} %</span></div>
                {isLot ? <ProgressBar value={task.progress} /> : (
                  <form action={(fd) => start(async () => { await setTaskProgress(fd); onClose(); })} className="space-y-2">
                    <input type="hidden" name="project_id" value={projectId} /><input type="hidden" name="id" value={task.id} />
                    <input type="range" name="progress" min={0} max={100} step={5} value={progress} onChange={(e) => setProgress(Number(e.target.value))} disabled={!canEdit} className="w-full accent-ink" />
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex gap-1">{[0, 25, 50, 75, 100].map((v) => <button key={v} type="button" disabled={!canEdit} onClick={() => setProgress(v)} className={`filter-chip !py-[1px] ${progress === v ? "filter-chip-active" : ""}`}>{v}</button>)}</div>
                      {canEdit && progress !== task.progress && <button type="submit" disabled={pending} className="btn-primary !py-[3px]">{pending ? "…" : "Enregistrer"}</button>}
                    </div>
                  </form>
                )}
                {isLot && <div className="hint mt-1">Moyenne des taches du lot, ponderee par leur budget.</div>}
              </div>
              <div className="rounded-lg border border-line-hair bg-surface-alt p-3">
                <div className="mb-1.5 flex items-center justify-between"><span className="eyebrow">Budget consomme</span><span className={`font-bold tabular-nums ${over ? "text-alert" : ""}`}>{formatMoney(spent, currency)} <span className="font-normal text-ink-faint">/ {formatMoney(budget, currency)}</span></span></div>
                <ProgressBar value={pct(spent, budget)} tone={over ? "alert" : pct(spent, budget) > progress + 15 ? "warn" : "ok"} />
                <div className="mt-1.5 flex justify-between text-ink-muted"><span>Reste</span><span className={`tabular-nums ${budget - spent < 0 ? "font-bold text-alert" : ""}`}>{formatMoney(budget - spent, currency)}</span></div>
                {!isLot && (Number(task.customs) > 0 || Number(task.vat) > 0) && <div className="hint mt-1">Douanes {formatMoney(Number(task.customs), currency)} · TVA {formatMoney(Number(task.vat), currency)} · TTC {formatMoney(budget + Number(task.customs) + Number(task.vat), currency)}</div>}
              </div>
              {!isLot && canEdit && (
                <form action={(fd) => start(async () => { await addExpense(fd); onClose(); })} className="rounded-lg border border-line-hair p-3">
                  <div className="eyebrow mb-2">Ajouter une depense</div>
                  <input type="hidden" name="project_id" value={projectId} /><input type="hidden" name="task_id" value={task.id} /><input type="hidden" name="redirect" value="none" />
                  <div className="grid grid-cols-2 gap-2">
                    <div><label className="label">Montant ({currency})</label><input name="amount" type="number" min={0} step="1" required autoFocus className="input" /></div>
                    <div><label className="label">Date</label><input name="spent_on" type="date" required defaultValue={today()} className="input" /></div>
                    <div><label className="label">Categorie</label><select name="category" className="input">{CATEGORIES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div>
                    <div><label className="label">Description</label><input name="description" placeholder="Fournisseur, objet" className="input" /></div>
                  </div>
                  <div className="mt-2 flex justify-end"><button type="submit" disabled={pending} className="btn-primary">{pending ? "…" : "Enregistrer la depense"}</button></div>
                </form>
              )}
              <div className="grid grid-cols-2 gap-2 text-ink-muted">
                <div><div className="eyebrow">Statut</div><div className="text-ink">{TASK_STATUS_LABELS[task.status]}</div></div>
                {dep && <div><div className="eyebrow">Depend de</div><div className="truncate text-ink">{dep.wbs_code} {dep.name} <span className="text-ink-faint">({task.link_type === "DD" ? "debut-debut" : "fin-debut"})</span></div></div>}
                {(task.estimate_method || task.confidence) && <div><div className="eyebrow">Estimation</div><div className="text-ink">{task.estimate_method || "—"} · confiance {task.confidence || "—"}</div></div>}
              </div>
              {task.notes && <p className="whitespace-pre-wrap text-ink-body">{task.notes}</p>}
            </div>
          )}

          {/* ---- Depenses de la tache ---- */}
          {task && tab === "depenses" && (
            <div className="text-[10.5px]">
              {expenses.length === 0 ? <p className="hint">Aucune depense sur cette tache.</p> : (
                <table className="tbl">
                  <thead><tr><th>Date</th><th>Description</th><th className="num">Montant</th>{canEdit && <th />}</tr></thead>
                  <tbody>
                    {expenses.map((e) => (
                      <tr key={e.id}>
                        <td className="whitespace-nowrap">{formatDate(e.spent_on)}</td>
                        <td>{e.description || <span className="text-ink-faint">{e.category}</span>}<div className="hint">{e.category}{e.created_by ? ` · ${who.get(e.created_by)}` : ""}{e.source === "mobile" ? " · mobile" : ""}</div></td>
                        <td className="num">{formatMoney(Number(e.amount), currency)}</td>
                        {canEdit && <td className="num"><button className="btn-ghost text-ink-faint hover:text-alert" title="Supprimer" onClick={() => { if (!confirm("Supprimer cette depense ?")) return; const fd = new FormData(); fd.set("project_id", projectId); fd.set("id", e.id); start(async () => { await deleteExpense(fd); onClose(); }); }}>×</button></td>}
                      </tr>
                    ))}
                    <tr><td colSpan={2} className="font-bold">Total</td><td className="num font-bold">{formatMoney(expenses.reduce((s, e) => s + Number(e.amount), 0), currency)}</td>{canEdit && <td />}</tr>
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* ---- Fiche : tout est editable ---- */}
          {(tab === "fiche" || !task) && (canEdit ? (
            <form action={(fd) => start(async () => { await saveTask(fd); onClose(); })} className="space-y-3">
              <input type="hidden" name="project_id" value={projectId} />
              {task && <input type="hidden" name="id" value={task.id} />}
              <div className="grid grid-cols-[80px_1fr] gap-3">
                <div><label className="label">Code WBS</label><input name="wbs_code" defaultValue={task?.wbs_code ?? ""} placeholder="L2.3" className="input" /></div>
                <div><label className="label">Nom</label><input name="name" required defaultValue={task?.name} className="input" /></div>
              </div>
              {!isLot && (
                <div><label className="label">Lot</label>
                  <select name="parent_id" defaultValue={task?.parent_id ?? ""} className="input"><option value="">Aucun (premier niveau)</option>{lots.filter((l) => l.id !== task?.id).map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}</select></div>
              )}
              {!isLot ? (
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="label">Debut</label><input name="start_date" type="date" required defaultValue={task?.start_date ?? defaults.start} className="input" /></div>
                  <div><label className="label">Fin</label><input name="end_date" type="date" required defaultValue={task?.end_date ?? defaults.end} className="input" /></div>
                </div>
              ) : <p className="hint">Les dates, l&apos;avancement, le budget et les depenses d&apos;un lot sont calcules a partir de ses taches.</p>}
              {!isLot && (
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="label">Avancement (%)</label><input name="progress" type="number" min={0} max={100} defaultValue={task?.progress ?? 0} className="input" /></div>
                  <div><label className="label">Statut</label><select name="status" defaultValue={task?.status ?? "todo"} className="input">{Object.entries(TASK_STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">Responsable (compte)</label><select name="responsible_id" defaultValue={task?.responsible_id ?? ""} className="input"><option value="">—</option>{people.map((p) => <option key={p.id} value={p.id}>{p.full_name || p.email}</option>)}</select></div>
                <div><label className="label">Role responsable</label><input name="responsible_role" defaultValue={task?.responsible_role ?? ""} placeholder="Conducteur de travaux" className="input" /></div>
              </div>
              {!isLot && (
                <div className="grid grid-cols-[1fr_110px] gap-3">
                  <div><label className="label">Depend de</label><select name="depends_on" defaultValue={task?.depends_on ?? ""} className="input"><option value="">—</option>{tasks.filter((t) => t.id !== task?.id).map((t) => <option key={t.id} value={t.id}>{t.wbs_code ? `${t.wbs_code} · ` : ""}{t.name}</option>)}</select></div>
                  <div><label className="label">Type de lien</label><select name="link_type" defaultValue={task?.link_type || "FD"} className="input"><option value="FD">Fin → debut</option><option value="DD">Debut → debut</option></select></div>
                </div>
              )}
              {!isLot && (
                <div className="grid grid-cols-3 gap-3">
                  <div><label className="label">Budget HTVA</label><input name="budget" type="number" min={0} step="1" defaultValue={task?.budget ?? 0} className="input" /></div>
                  <div><label className="label">Douanes</label><input name="customs" type="number" min={0} step="1" defaultValue={task?.customs ?? 0} className="input" /></div>
                  <div><label className="label">TVA</label><input name="vat" type="number" min={0} step="1" defaultValue={task?.vat ?? 0} className="input" /></div>
                </div>
              )}
              {!isLot && (
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="label">Methode d&apos;estimation</label><select name="estimate_method" defaultValue={task?.estimate_method ?? ""} className="input"><option value="">—</option><option>Devis fournisseur</option><option>Ratio</option><option>Avis d&apos;expert</option><option>Contrat</option></select></div>
                  <div><label className="label">Confiance</label><select name="confidence" defaultValue={task?.confidence ?? ""} className="input"><option value="">—</option><option>Élevé</option><option>Moyen</option><option>Faible</option></select></div>
                </div>
              )}
              <div><label className="label">Notes</label><textarea name="notes" rows={3} defaultValue={task?.notes} className="input" /></div>
              <div className="flex items-center justify-between pt-1">
                {task ? <button type="button" disabled={pending} className="btn-danger" onClick={() => { if (!confirm(isLot ? "Supprimer ce lot et toutes ses taches ?" : "Supprimer cette tache ?")) return; const fd = new FormData(); fd.set("project_id", projectId); fd.set("id", task.id); start(async () => { await deleteTask(fd); onClose(); }); }}>Supprimer</button> : <span />}
                <button type="submit" disabled={pending} className="btn-primary">{pending ? "Enregistrement…" : "Enregistrer"}</button>
              </div>
            </form>
          ) : <p className="hint">Lecture seule.</p>)}
        </div>
      </div>
    </div>
  );
}
