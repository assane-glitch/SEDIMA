"use client";
import { DateInput } from "@/components/ui/DateInput";
import { useEffect, useState, useTransition } from "react";
import { deleteTask, saveTask, setTaskActuals, setTaskProgress } from "@/app/(app)/projects/actions";
import { ExpenseForm } from "@/components/ExpenseForm";
import { ProgressBar, Badge } from "@/components/ui";
import { describeAudit, relativeTime } from "@/lib/audit";
import { formatDate, formatMoney, pct } from "@/lib/format";
import { excludedStatuses, labelOf, registerFields, type Lists } from "@/lib/reference-types";
import { TASK_STATUS_LABELS, type AuditEntry, type Expense, type JournalEntry, type Profile, type RegisterEntry, type Task } from "@/lib/types";

export function TaskDrawer({ task, isLot, lots, tasks, expenses, journal, registers, audit, lists, people, currency, projectId, projectCode, canEdit, defaults, spent, onClose }: {
  task: Task | null; isLot: boolean; lots: { id: string; name: string }[]; tasks: Task[]; expenses: Expense[]; journal: JournalEntry[]; registers: RegisterEntry[]; audit: AuditEntry[];
  lists?: Lists; people: Profile[]; currency: string; projectId: string; projectCode?: string; canEdit: boolean; defaults: { start: string; end: string }; spent: number; onClose: () => void;
}) {
  const [pending, start] = useTransition();
  const [tab, setTab] = useState<"suivi" | "fiche" | "events">(task ? "suivi" : "fiche");
  const [progress, setProgress] = useState<string>(String(task?.progress ?? 0));
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  const who = new Map(people.map((p) => [p.id, p.full_name || p.email]));
  const responsible = task?.responsible_id ? who.get(task.responsible_id) : task?.responsible_role;
  const budget = Number(task?.budget ?? 0);
  const over = budget > 0 && spent > budget;
  const dep = task?.depends_on ? tasks.find((t) => t.id === task.depends_on) : undefined;
  const [depId, setDepId] = useState(task?.depends_on ?? "");
  const [linkType, setLinkType] = useState(task?.link_type || "FD");
  const [lag, setLag] = useState(String(task?.lag_weeks ?? 0));
  const weekOf = (iso: string) => { const d = new Date(iso + "T00:00:00Z"); const day = d.getUTCDay() || 7; d.setUTCDate(d.getUTCDate() + 4 - day); const y0 = new Date(Date.UTC(d.getUTCFullYear(), 0, 1)); return `S${Math.ceil(((d.getTime() - y0.getTime()) / 86400000 + 1) / 7)}`; };
  const earliest = (() => {
    const p = depId ? tasks.find((t) => t.id === depId) : undefined; if (!p) return null;
    const ref = new Date((linkType === "DD" ? p.start_date : p.end_date) + "T00:00:00Z");
    ref.setUTCDate(ref.getUTCDate() - ((ref.getUTCDay() + 6) % 7) + 7 * (1 + Math.max(0, Number(lag) || 0)));
    return ref.toISOString().slice(0, 10);
  })();
  const cats = lists?.expense_category ?? [], statuses = lists?.expense_status ?? [];
  const excluded = excludedStatuses(statuses);
  const regTypes = lists?.register_type ?? [];
  const progressNum = Math.max(0, Math.min(100, Math.round(Number(progress) || 0)));
  const [actualStart, setActualStart] = useState(task?.actual_start ?? "");
  const [actualEnd, setActualEnd] = useState(task?.actual_end ?? "");
  const week = (iso: string) => { if (!iso) return ""; const d = new Date(iso + "T00:00:00Z"); const day = d.getUTCDay() || 7; d.setUTCDate(d.getUTCDate() + 4 - day); const y0 = new Date(Date.UTC(d.getUTCFullYear(), 0, 1)); return `S${Math.ceil(((d.getTime() - y0.getTime()) / 86400000 + 1) / 7)}`; };
  const actualsChanged = task ? actualStart !== (task.actual_start ?? "") || actualEnd !== (task.actual_end ?? "") : false;
  const changed = task ? progressNum !== task.progress : false;

  // Fil d'evenements de la tache : depenses, journal, registres, modifications
  type Ev = { at: string; kind: string; tone?: string; title: string; detail?: string };
  const events: Ev[] = task ? [
    ...expenses.map((e) => ({ at: e.spent_on, kind: "Depense", tone: excluded.has(e.status) ? "alert" : e.status === "payee" ? "ok" : "neutral", title: `${e.ref} · ${e.description || labelOf(cats, e.category)} · ${formatMoney(Number(e.amount), currency)}`, detail: [e.supplier, e.da_number, labelOf(statuses, e.status), e.created_by ? who.get(e.created_by) : ""].filter(Boolean).join(" · ") })),
    ...journal.map((e) => ({ at: e.entry_date, kind: "Journal", title: e.content.length > 160 ? e.content.slice(0, 160) + "…" : e.content, detail: [e.location, e.author_id ? who.get(e.author_id) : ""].filter(Boolean).join(" · ") })),
    ...registers.map((e) => { const rt = regTypes.find((r) => r.value === e.register_type); const fl = new Map(rt ? registerFields(rt).map((f) => [f.key, f.label]) : []); return { at: e.entry_date, kind: "Registre", title: rt?.label ?? e.register_type, detail: Object.entries(e.data).map(([k, v]) => `${fl.get(k) ?? k} : ${String(v)}`).join(" · ") + (e.author_id ? ` · ${who.get(e.author_id)}` : "") }; }),
    ...audit.map((a) => { const d = describeAudit(a, currency); return { at: a.changed_at, kind: "Modification", title: `${(a.changed_by && who.get(a.changed_by)) || "Systeme"} ${d.what}`, detail: d.details.join(" · ") }; }),
  ].sort((a, b) => (a.at < b.at ? 1 : -1)) : [];

  const tabBtn = (k: typeof tab, label: string) => <button onClick={() => setTab(k)} className={`-mb-px border-b-2 px-3 py-2 text-[11px] ${tab === k ? "border-ink font-bold text-ink" : "border-transparent text-ink-muted hover:text-ink"}`}>{label}</button>;
  const Field = ({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) => <div className={className}><label className="label">{label}</label>{children}</div>;

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-ink/25" onClick={onClose}>
      <div className="flex h-full w-full max-w-2xl flex-col border-l border-line-hair bg-surface" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-4 px-7 pb-3 pt-6">
          <div className="min-w-0">
            <div className="eyebrow">{task ? (isLot ? "Lot" : "Tache") : "Nouvelle tache"} {task?.wbs_code}</div>
            <h2 className="mt-0.5 truncate text-[16px] font-bold tracking-[-0.01em]">{task ? task.name : ""}</h2>
            {task && <div className="mt-1 text-[10.5px] text-ink-muted">{formatDate(task.start_date)} → {formatDate(task.end_date)} · {responsible || "—"} · {TASK_STATUS_LABELS[task.status]}</div>}
          </div>
          <button onClick={onClose} className="btn-ghost text-[16px]" aria-label="Fermer">×</button>
        </div>
        {task && <div className="flex border-b border-line-hair px-7">{tabBtn("suivi", "Suivi")}{tabBtn("fiche", "Fiche")}{tabBtn("events", `Évènements (${events.length})`)}</div>}

        <div className="flex-1 overflow-y-auto px-7 py-5">
          {/* ---------- Suivi ---------- */}
          {task && tab === "suivi" && (
            <div className="space-y-5 text-[11px]">
              <div className="rounded-lg border border-line-hair bg-surface-alt p-4">
                <div className="eyebrow mb-3">Avancement</div>
                {isLot ? (
                  <><div className="mb-1.5 flex items-center justify-between"><span className="text-ink-muted">Moyenne des taches du lot, ponderee par leur budget</span><span className="text-[16px] font-bold tabular-nums">{task.progress} %</span></div><ProgressBar value={task.progress} /></>
                ) : (
                  <form action={(fd) => start(async () => { await setTaskProgress(fd); onClose(); })} className="flex items-end gap-4">
                    <input type="hidden" name="project_id" value={projectId} /><input type="hidden" name="id" value={task.id} />
                    <Field label="Nouvelle valeur (%)">
                      <div className="flex items-center gap-1">
                        <button type="button" disabled={!canEdit} onClick={() => setProgress(String(Math.max(0, progressNum - 10)))} className="btn-secondary !px-2 !py-[5px]" aria-label="Moins 10">−</button>
                        <input name="progress" type="text" inputMode="numeric" pattern="[0-9]*" value={progress} disabled={!canEdit}
                          onFocus={(e) => e.target.select()}
                          onChange={(e) => { const d = e.target.value.replace(/[^\d]/g, "").replace(/^0+(?=\d)/, ""); setProgress(d === "" ? "" : String(Math.min(100, Number(d)))); }}
                          onBlur={() => setProgress(String(progressNum))}
                          className="input !w-20 text-center !text-[13px] font-bold" />
                        <button type="button" disabled={!canEdit} onClick={() => setProgress(String(Math.min(100, progressNum + 10)))} className="btn-secondary !px-2 !py-[5px]" aria-label="Plus 10">+</button>
                      </div>
                      <div className="mt-1.5 flex gap-1">{[0, 25, 50, 75, 100].map((v) => <button key={v} type="button" disabled={!canEdit} onClick={() => setProgress(String(v))} className={`filter-chip !px-2 !py-[1px] ${progressNum === v ? "filter-chip-active" : ""}`}>{v}</button>)}</div>
                    </Field>
                    <div className="pb-1.5 text-ink-muted">Valeur enregistree : <span className="text-[13px] font-bold text-ink">{task.progress} %</span></div>
                    <div className="flex-1" />
                    {canEdit && <button type="submit" disabled={pending || !changed} className="btn-primary">{pending ? "…" : "Enregistrer"}</button>}
                  </form>
                )}
                <div className="mt-3"><ProgressBar value={isLot ? task.progress : progressNum} /></div>
              </div>

              {!isLot && (
                <form action={(fd) => start(async () => { await setTaskActuals(fd); onClose(); })} className="rounded-lg border border-line-hair bg-surface-alt p-4">
                  <input type="hidden" name="project_id" value={projectId} /><input type="hidden" name="id" value={task.id} />
                  <div className="eyebrow mb-3">Dates reelles</div>
                  <div className="grid grid-cols-[1fr_1fr_auto] items-end gap-4">
                    <Field label="Demarrage reel"><DateInput name="actual_start" value={actualStart} onChange={(e) => setActualStart(e.target.value)} disabled={!canEdit} className="input" /></Field>
                    <Field label="Fin reelle"><DateInput name="actual_end" value={actualEnd} onChange={(e) => setActualEnd(e.target.value)} disabled={!canEdit} className="input" /></Field>
                    {canEdit && <button type="submit" disabled={pending || !actualsChanged} className="btn-primary">{pending ? "…" : "Enregistrer"}</button>}
                  </div>
                  <div className="hint mt-2">Planifie : {week(task.start_date)} → {week(task.end_date)}{task.baseline_start ? ` · Reference : ${week(task.baseline_start)} → ${week(task.baseline_end ?? task.baseline_start)}` : ""}. Le planning suit le reel : la barre se deplace (duree conservee tant que la fin reelle est inconnue), la reference ne bouge pas, le lot et les taches liees sont recalcules.</div>
                </form>
              )}

              <div className="rounded-lg border border-line-hair bg-surface-alt p-4">
                <div className="mb-2 flex items-center justify-between"><span className="eyebrow">Budget consomme</span><span className={`text-[13px] font-bold tabular-nums ${over ? "text-alert" : ""}`}>{formatMoney(spent, currency)} <span className="font-normal text-ink-faint">/ {formatMoney(budget, currency)}</span></span></div>
                <ProgressBar value={pct(spent, budget)} tone={over ? "alert" : pct(spent, budget) > progressNum + 15 ? "warn" : "ok"} />
                <div className="mt-2 flex justify-between text-ink-muted"><span>Reste</span><span className={`tabular-nums ${budget - spent < 0 ? "font-bold text-alert" : ""}`}>{formatMoney(budget - spent, currency)}</span></div>
                {!isLot && (Number(task.customs) > 0 || Number(task.vat) > 0) && <div className="hint mt-1">Douanes {formatMoney(Number(task.customs), currency)} · TVA {formatMoney(Number(task.vat), currency)} · TTC {formatMoney(budget + Number(task.customs) + Number(task.vat), currency)}</div>}
              </div>

              {!isLot && canEdit && (
                <div className="rounded-lg border border-line-hair p-4">
                  <div className="eyebrow mb-3">Enregistrer une depense sur cette tache</div>
                  <ExpenseForm projects={[{ id: projectId, code: projectCode ?? "", name: "", currency }]} tasks={[]} categories={cats} statuses={statuses} projectId={projectId} taskId={task.id} onSubmitted={onClose} />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 text-ink-muted">
                {dep && <div><div className="eyebrow">Depend de</div><div className="mt-0.5 text-ink">{dep.wbs_code} {dep.name} <span className="text-ink-faint">({task.link_type === "DD" ? "debut-debut" : "fin-debut"}{task.lag_weeks ? `, +${task.lag_weeks} sem.` : ""})</span></div></div>}
                {(task.estimate_method || task.confidence) && <div><div className="eyebrow">Estimation</div><div className="mt-0.5 text-ink">{task.estimate_method || "—"} · confiance {task.confidence || "—"}</div></div>}
              </div>
              {task.notes && <p className="whitespace-pre-wrap text-ink-body">{task.notes}</p>}
            </div>
          )}

          {/* ---------- Evenements de la tache ---------- */}
          {task && tab === "events" && (
            events.length === 0 ? <p className="hint">Aucun evenement sur cette tache.</p> : (
              <ul className="divide-y divide-line-light text-[11px]">
                {events.map((e, i) => (
                  <li key={i} className="flex gap-4 py-2.5">
                    <div className="w-20 shrink-0 text-ink-muted" title={e.at}>{e.at.length > 10 ? relativeTime(e.at) : formatDate(e.at)}</div>
                    <div className="w-24 shrink-0"><Badge tone={e.tone ?? "neutral"}>{e.kind}</Badge></div>
                    <div className="min-w-0 flex-1"><div className="font-semibold">{e.title}</div>{e.detail && <div className="hint mt-0.5">{e.detail}</div>}</div>
                  </li>
                ))}
              </ul>
            )
          )}

          {/* ---------- Fiche ---------- */}
          {(tab === "fiche" || !task) && (canEdit ? (
            <form action={(fd) => start(async () => { await saveTask(fd); onClose(); })} className="space-y-4">
              <input type="hidden" name="project_id" value={projectId} />
              {task && <input type="hidden" name="id" value={task.id} />}
              <div className="grid grid-cols-[100px_1fr] gap-4">
                <Field label="Code WBS"><input name="wbs_code" defaultValue={task?.wbs_code ?? ""} placeholder="L2.3" className="input" /></Field>
                <Field label="Nom"><input name="name" required defaultValue={task?.name} className="input" /></Field>
              </div>
              {!isLot && <Field label="Lot"><select name="parent_id" defaultValue={task?.parent_id ?? ""} className="input"><option value="">Aucun (premier niveau)</option>{lots.filter((l) => l.id !== task?.id).map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}</select></Field>}
              {!isLot ? (
                <div className="grid grid-cols-3 gap-4">
                  <Field label="Debut"><DateInput name="start_date" required defaultValue={task?.start_date ?? defaults.start} className="input" /></Field>
                  <Field label="Fin"><DateInput name="end_date" required defaultValue={task?.end_date ?? defaults.end} className="input" /></Field>
                  <Field label="Statut"><select name="status" defaultValue={task?.status ?? "todo"} className="input">{Object.entries(TASK_STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></Field>
                </div>
              ) : <p className="hint">Les dates, l&apos;avancement, le budget et les depenses d&apos;un lot sont calcules a partir de ses taches.</p>}
              {!isLot && (
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Reference : debut"><div className="input !bg-surface-mut !border-line-lock text-ink-muted" title="Modifiable par une demande de changement approuvee">{task?.baseline_start ? `${formatDate(task.baseline_start)} · ${weekOf(task.baseline_start)}` : "—"}</div></Field>
                  <Field label="Reference : fin"><div className="input !bg-surface-mut !border-line-lock text-ink-muted" title="Modifiable par une demande de changement approuvee">{task?.baseline_end ? `${formatDate(task.baseline_end)} · ${weekOf(task.baseline_end)}` : "—"}</div></Field>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <Field label="Responsable (compte)"><select name="responsible_id" defaultValue={task?.responsible_id ?? ""} className="input"><option value="">—</option>{people.map((p) => <option key={p.id} value={p.id}>{p.full_name || p.email}</option>)}</select></Field>
                <Field label="Role responsable"><input name="responsible_role" list="roles" defaultValue={task?.responsible_role ?? ""} placeholder="Conducteur de travaux" className="input" /><datalist id="roles">{(lists?.responsible_role ?? []).map((r) => <option key={r.value} value={r.value} />)}</datalist></Field>
              </div>
              {!isLot && earliest && <p className="hint -mt-2">Demarrage au plus tot : lundi {formatDate(earliest)} ({weekOf(earliest)}), la semaine suivant {linkType === "DD" ? "le debut" : "la fin"} de la tache precedente plus le decalage. Une date plus tot sera recalee automatiquement, ainsi que les taches qui en dependent.</p>}
              {!isLot && (
                <div className="grid grid-cols-[1fr_130px_110px] gap-4">
                  <Field label="Depend de"><select name="depends_on" value={depId} onChange={(e) => setDepId(e.target.value)} className="input"><option value="">—</option>{tasks.filter((t) => t.id !== task?.id).map((t) => <option key={t.id} value={t.id}>{t.wbs_code ? `${t.wbs_code} · ` : ""}{t.name}</option>)}</select></Field>
                  <Field label="Type de lien"><select name="link_type" value={linkType} onChange={(e) => setLinkType(e.target.value)} className="input"><option value="FD">Fin → debut</option><option value="DD">Debut → debut</option></select></Field>
                  <Field label="Decalage (sem.)"><input name="lag_weeks" type="number" min={0} step="1" value={lag} onChange={(e) => setLag(e.target.value)} className="input" /></Field>
                </div>
              )}
              {!isLot && (
                <div className="grid grid-cols-3 gap-4">
                  <Field label={`Budget HTVA (${currency})`}><input name="budget" type="number" min={0} step="1" defaultValue={task?.budget ?? 0} className="input" /></Field>
                  <Field label="Douanes"><input name="customs" type="number" min={0} step="1" defaultValue={task?.customs ?? 0} className="input" /></Field>
                  <Field label="TVA"><input name="vat" type="number" min={0} step="1" defaultValue={task?.vat ?? 0} className="input" /></Field>
                </div>
              )}
              {!isLot && (
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Methode d'estimation"><select name="estimate_method" defaultValue={task?.estimate_method ?? ""} className="input"><option value="">—</option>{(lists?.estimate_method ?? []).map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}</select></Field>
                  <Field label="Confiance"><select name="confidence" defaultValue={task?.confidence ?? ""} className="input"><option value="">—</option>{(lists?.confidence ?? []).map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}</select></Field>
                </div>
              )}
              <Field label="Notes"><textarea name="notes" rows={4} defaultValue={task?.notes} className="input" /></Field>
              <div className="flex items-center justify-between pt-2">
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
