"use client";
import { useMemo, useState } from "react";
import { addExpense } from "@/app/(app)/projects/actions";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { today } from "@/lib/format";
import type { RefItem } from "@/lib/reference-types";

export interface TaskOption { id: string; name: string; wbs_code: string | null; parent_id: string | null; project_id: string }
export interface ProjectOption { id: string; code: string; name: string; currency: string }

/** Formulaire du journal des depenses. Utilise dans le tiroir de tache, l'onglet Budget, les Formulaires et le mobile. */
export function ExpenseForm({ projects, tasks, categories, statuses, projectId, taskId, redirect, source = "web", compact, onSubmitted, mobile }: {
  projects: ProjectOption[]; tasks: TaskOption[]; categories: RefItem[]; statuses: RefItem[]; projectId?: string; taskId?: string; redirect?: string; source?: "web" | "mobile";
  compact?: boolean; onSubmitted?: () => void; mobile?: boolean;
}) {
  const [pid, setPid] = useState(projectId ?? projects[0]?.id ?? "");
  const project = projects.find((p) => p.id === pid);
  const grouped = useMemo(() => {
    const list = tasks.filter((t) => t.project_id === pid);
    const lots = list.filter((t) => !t.parent_id && list.some((c) => c.parent_id === t.id));
    const top = list.filter((t) => !t.parent_id && !lots.includes(t));
    return { lots: lots.map((l) => ({ lot: l, children: list.filter((c) => c.parent_id === l.id) })), top };
  }, [tasks, pid]);
  const opt = (t: TaskOption, indent = false) => <option key={t.id} value={t.id}>{indent ? "   " : ""}{t.wbs_code ? `${t.wbs_code} · ` : ""}{t.name}</option>;
  const big = mobile ? " !text-[16px] !py-2.5" : "";

  return (
    <form action={onSubmitted ? (fd) => { void addExpense(fd).then(onSubmitted); } : addExpense} className={compact ? "space-y-2" : "space-y-3"}>
      <input type="hidden" name="project_id" value={pid} />
      <input type="hidden" name="source" value={source} />
      <input type="hidden" name="redirect" value={redirect ?? (onSubmitted ? "none" : `/projects/${pid}/events`)} />
      {!projectId && (
        <div><label className="label">Projet</label>
          <select value={pid} onChange={(e) => setPid(e.target.value)} className={`input${big}`}>{projects.map((p) => <option key={p.id} value={p.id}>{p.code} · {p.name}</option>)}</select></div>
      )}
      <div><label className="label">Designation</label><input name="description" required placeholder="Objet de la depense" className={`input${big}`} /></div>
      <div className="grid grid-cols-2 gap-2">
        <div><label className="label">Date</label><input name="spent_on" type="date" required defaultValue={today()} className={`input${big}`} /></div>
        <div><label className="label">Montant ({project?.currency ?? "XOF"})</label><input name="amount" type="number" inputMode="numeric" min={0} step="1" required className={`input${big}`} /></div>
      </div>
      <div><label className="label">Fournisseur</label><input name="supplier" placeholder="Nom du fournisseur" className={`input${big}`} /></div>
      {taskId ? <input type="hidden" name="task_id" value={taskId} /> : (
        <div><label className="label">Lot / tache</label>
          <select name="task_id" defaultValue="" className={`input${big}`}>
            <option value="">— Projet entier —</option>
            {grouped.lots.map(({ lot, children }) => <optgroup key={lot.id} label={`${lot.wbs_code ?? ""} ${lot.name}`.trim()}>{opt(lot)}{children.map((c) => opt(c, true))}</optgroup>)}
            {grouped.top.map((t) => opt(t))}
          </select></div>
      )}
      <div className="grid grid-cols-2 gap-2">
        <div><label className="label">Categorie</label><select name="category" defaultValue={categories[0]?.value} className={`input${big}`}>{categories.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}</select></div>
        <div><label className="label">Numero de DA</label><input name="da_number" placeholder="DA-2026-…" className={`input${big}`} /></div>
      </div>
      <div><label className="label">Statut</label>
        <select name="status" defaultValue={statuses[0]?.value ?? "da_emise"} className={`input${big}`}>{statuses.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}</select></div>
      <div className="flex justify-end pt-1"><SubmitButton className={mobile ? "btn-primary w-full !py-3 !text-[13px]" : "btn-primary"}>Enregistrer la depense</SubmitButton></div>
    </form>
  );
}
