"use client";
import { useMemo, useState } from "react";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { daysBetween, formatDate } from "@/lib/format";
import { createChangeRequest } from "./actions";

export interface DriftTask { id: string; wbs_code: string | null; name: string; isLot: boolean; start_date: string; end_date: string; baseline_start: string | null; baseline_end: string | null }

/** Formulaire de demande : titre, motif, taches dont la reference doit etre alignee sur le planning actuel. */
export function ChangeRequestForm({ projectId, tasks }: { projectId: string; tasks: DriftTask[] }) {
  const drifted = useMemo(() => tasks.filter((t) => t.baseline_start !== t.start_date || t.baseline_end !== t.end_date), [tasks]);
  const [sel, setSel] = useState<Set<string>>(new Set(drifted.map((t) => t.id)));
  const [onlyDrift, setOnlyDrift] = useState(true);
  const shown = onlyDrift ? drifted : tasks;
  const toggle = (id: string) => setSel((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const delta = (t: DriftTask) => (t.baseline_end ? daysBetween(t.baseline_end, t.end_date) : null);
  return (
    <form action={createChangeRequest} className="card card-pad space-y-3">
      <input type="hidden" name="project_id" value={projectId} />
      <div className="card-title">Nouvelle demande de changement de la reference</div>
      <p className="hint">La demande propose d&apos;aligner la reference des taches choisies sur leur planning actuel. Elle prend effet une fois approuvee par le chef de projet ou un administrateur.</p>
      <div className="grid gap-3 md:grid-cols-[1fr_2fr]">
        <div><label className="label">Titre</label><input name="title" required placeholder="Ex. Report du lot L3 suite retard fournisseur" className="input" /></div>
        <div><label className="label">Motif</label><input name="reason" placeholder="Cause, impact, decisions prises…" className="input" /></div>
      </div>
      <div className="flex flex-wrap items-center gap-3 text-[10.5px]">
        <span className="font-semibold">{sel.size} tache{sel.size > 1 ? "s" : ""} selectionnee{sel.size > 1 ? "s" : ""}</span>
        <button type="button" onClick={() => setSel(new Set(drifted.map((t) => t.id)))} className="btn-ghost">Toutes en ecart ({drifted.length})</button>
        <button type="button" onClick={() => setSel(new Set(tasks.map((t) => t.id)))} className="btn-ghost">Tout le projet ({tasks.length})</button>
        <button type="button" onClick={() => setSel(new Set())} className="btn-ghost">Aucune</button>
        <label className="ml-auto inline-flex cursor-pointer items-center gap-1.5 text-ink-muted"><input type="checkbox" checked={onlyDrift} onChange={(e) => setOnlyDrift(e.target.checked)} />N&apos;afficher que les taches en ecart</label>
      </div>
      <div className="max-h-80 overflow-auto rounded-md border border-line-hair">
        <table className="tbl"><thead><tr><th className="w-6" /><th className="w-14">WBS</th><th>Tache</th><th>Reference</th><th>Planning actuel</th><th className="num">Ecart fin</th></tr></thead><tbody>
          {shown.map((t) => { const d = delta(t); return (
            <tr key={t.id} className={`cursor-pointer ${t.isLot ? "font-bold" : ""}`} onClick={() => toggle(t.id)}>
              <td onClick={(e) => e.stopPropagation()}><input type="checkbox" name="task_id" value={t.id} checked={sel.has(t.id)} onChange={() => toggle(t.id)} /></td>
              <td className="font-mono text-[9.5px] text-ink-faint">{t.wbs_code}</td><td className="max-w-[320px] truncate">{t.name}</td>
              <td className="whitespace-nowrap text-ink-muted">{t.baseline_start ? `${formatDate(t.baseline_start)} → ${formatDate(t.baseline_end!)}` : "—"}</td>
              <td className="whitespace-nowrap">{formatDate(t.start_date)} → {formatDate(t.end_date)}</td>
              <td className={`num ${d === null ? "text-ink-faint" : d > 0 ? "font-semibold text-alert" : d < 0 ? "font-semibold text-ok" : "text-ink-faint"}`}>{d === null ? "—" : d === 0 ? "=" : `${d > 0 ? "+" : "−"}${Math.abs(d)} j`}</td>
            </tr>
          ); })}
          {shown.length === 0 && <tr><td colSpan={6} className="!py-6 text-center text-ink-faint">Aucune tache en ecart avec la reference.</td></tr>}
        </tbody></table>
      </div>
      <div className="flex justify-end"><SubmitButton className="btn-primary" pendingText="Envoi…">Soumettre la demande</SubmitButton></div>
    </form>
  );
}
