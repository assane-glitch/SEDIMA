"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { TaskDrawer } from "@/components/gantt/TaskDrawer";
import { ProgressBar } from "@/components/ui";
import { loadTaskContext } from "@/app/(app)/tasks/actions";
import { deleteTasks } from "@/app/(app)/projects/actions";
import { HEALTH_DOT, HEALTH_LABELS, taskHealth, type Health } from "@/lib/health";
import { addDays, formatDate, kMoney, mondayOf, today, weekLabel } from "@/lib/format";
import type { Lists } from "@/lib/reference-types";
import { TASK_STATUS_LABELS, type AuditEntry, type Expense, type JournalEntry, type Profile, type RegisterEntry, type Task } from "@/lib/types";

export interface TaskProject { id: string; code: string; name: string; currency: string; start_date: string; end_date: string; status: string }

type Ctx = { expenses: Expense[]; journal: JournalEntry[]; registers: RegisterEntry[]; audit: AuditEntry[] };
type SortKey = "project" | "wbs" | "name" | "responsible" | "start" | "end" | "progress" | "budget";
type Due = "all" | "late" | "week" | "month";
const DUE_LABELS: Record<Due, string> = { all: "Toutes", late: "En retard", week: "Cette semaine", month: "4 prochaines semaines" };


/**
 * Liste de taches, tous projets (mode global) ou un seul (mode projet).
 * Les lots ne sont pas listes : seules les taches feuilles, avec leur lot en sous-titre.
 */
export function TaskList({ tasks, projects, people, spentByTask, lists, me, canEdit, mode }: {
  tasks: Task[]; projects: TaskProject[]; people: Profile[]; spentByTask: Record<string, number>; lists: Lists; me: Profile; canEdit: boolean; mode: "global" | "project";
}) {
  const router = useRouter();
  const t0 = today();
  const who = useMemo(() => new Map(people.map((p) => [p.id, p.full_name || p.email])), [people]);
  const byProject = useMemo(() => new Map(projects.map((p) => [p.id, p])), [projects]);
  const byId = useMemo(() => new Map(tasks.map((t) => [t.id, t])), [tasks]);
  const parents = useMemo(() => new Set(tasks.filter((t) => t.parent_id).map((t) => t.parent_id!)), [tasks]);

  const items = useMemo(() => tasks.filter((t) => !parents.has(t.id)).map((t) => {
    const p = byProject.get(t.project_id);
    const lot = t.parent_id ? byId.get(t.parent_id) : undefined;
    const responsible = t.responsible_id ? who.get(t.responsible_id) ?? "" : t.responsible_role ?? "";
    return { task: t, project: p, lot, responsible, spent: spentByTask[t.id] ?? 0, health: taskHealth({ status: t.status, progress: t.progress, start: t.start_date, end: t.end_date }, t0) };
  }), [tasks, parents, byProject, byId, who, spentByTask, t0]);

  const mineCount = useMemo(() => items.filter((i) => i.task.responsible_id === me.id).length, [items, me.id]);
  const [mine, setMine] = useState(false);
  useEffect(() => { setMine(mineCount > 0); }, [mineCount]);
  const [q, setQ] = useState("");
  const [projectId, setProjectId] = useState("");
  const [resp, setResp] = useState("");
  const [status, setStatus] = useState("");
  const [due, setDue] = useState<Due>("all");
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: mode === "global" ? "end" : "wbs", dir: 1 });

  const responsibles = useMemo(() => Array.from(new Set(items.map((i) => i.responsible).filter(Boolean))).sort((a, b) => a.localeCompare(b, "fr")), [items]);
  const monday = mondayOf(t0), sunday = addDays(monday, 6), in4w = addDays(t0, 28);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return items.filter((i) => {
      const t = i.task;
      if (mine && t.responsible_id !== me.id) return false;
      if (projectId && t.project_id !== projectId) return false;
      if (resp && i.responsible !== resp) return false;
      if (status && t.status !== status) return false;
      if (due === "late" && !(t.end_date < t0 && t.status !== "done")) return false;
      if (due === "week" && !(t.start_date <= sunday && t.end_date >= monday && t.status !== "done")) return false;
      if (due === "month" && !(t.start_date <= in4w && t.end_date >= t0 && t.status !== "done")) return false;
      if (needle && !`${t.wbs_code ?? ""} ${t.name} ${i.lot?.name ?? ""} ${i.project?.code ?? ""} ${i.project?.name ?? ""} ${i.responsible}`.toLowerCase().includes(needle)) return false;
      return true;
    }).sort((a, b) => {
      const k = sort.key, d = sort.dir;
      const va = k === "project" ? a.project?.code ?? "" : k === "wbs" ? (a.task.wbs_code ?? "").padStart(8, "0") : k === "name" ? a.task.name : k === "responsible" ? a.responsible : k === "start" ? a.task.start_date : k === "end" ? a.task.end_date : k === "progress" ? a.task.progress : Number(a.task.budget);
      const vb = k === "project" ? b.project?.code ?? "" : k === "wbs" ? (b.task.wbs_code ?? "").padStart(8, "0") : k === "name" ? b.task.name : k === "responsible" ? b.responsible : k === "start" ? b.task.start_date : k === "end" ? b.task.end_date : k === "progress" ? b.task.progress : Number(b.task.budget);
      const c = typeof va === "number" && typeof vb === "number" ? va - vb : String(va).localeCompare(String(vb), "fr");
      return c !== 0 ? c * d : (a.project?.code ?? "").localeCompare(b.project?.code ?? "") || (a.task.wbs_code ?? "").localeCompare(b.task.wbs_code ?? "", "fr", { numeric: true });
    });
  }, [items, mine, me.id, projectId, resp, status, due, q, sort, t0, monday, sunday, in4w]);

  const late = items.filter((i) => i.task.end_date < t0 && i.task.status !== "done").length;
  const thisWeek = items.filter((i) => i.task.start_date <= sunday && i.task.end_date >= monday && i.task.status !== "done").length;

  // Tiroir : contexte charge a l'ouverture
  const [selected, setSelected] = useState<Task | null>(null);
  const [ctx, setCtx] = useState<Ctx>({ expenses: [], journal: [], registers: [], audit: [] });
  const open = (t: Task) => { setSelected(t); setCtx({ expenses: [], journal: [], registers: [], audit: [] }); loadTaskContext(t.project_id, t.id).then(setCtx).catch(() => {}); };
  const close = () => { setSelected(null); router.refresh(); };
  const selProject = selected ? byProject.get(selected.project_id) : undefined;
  const projTasks = selected ? tasks.filter((t) => t.project_id === selected.project_id) : [];

  // Suppression en lot : mode selection avec cases a cocher, reserve aux editeurs
  const [selecting, setSelecting] = useState(false);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [err, setErr] = useState<string | null>(null);
  const [pending, startDelete] = useTransition();
  const toggleChecked = (id: string) => setChecked((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const visibleChecked = filtered.filter((i) => checked.has(i.task.id)).length;
  const allVisible = filtered.length > 0 && visibleChecked === filtered.length;
  const toggleAllVisible = () => setChecked((s) => { const n = new Set(s); for (const i of filtered) { if (allVisible) n.delete(i.task.id); else n.add(i.task.id); } return n; });
  const stopSelecting = () => { setSelecting(false); setChecked(new Set()); setErr(null); };
  const removeChecked = () => {
    const ids = Array.from(checked);
    if (ids.length === 0) return;
    if (!confirm(ids.length === 1 ? "Supprimer la tache selectionnee ? Les depenses, entrees de journal et de registre liees seront detachees." : `Supprimer les ${ids.length} taches selectionnees ? Les depenses, entrees de journal et de registre liees seront detachees.`)) return;
    startDelete(async () => {
      setErr(null);
      const r = await deleteTasks(ids);
      if (r && "error" in r && r.error) { setErr(r.error); return; }
      stopSelecting();
      router.refresh();
    });
  };

  const Th = ({ k, children, className = "" }: { k: SortKey; children: React.ReactNode; className?: string }) => (
    <th className={`cursor-pointer select-none whitespace-nowrap hover:text-ink ${className}`} onClick={() => setSort((s) => ({ key: k, dir: s.key === k ? (s.dir === 1 ? -1 : 1) : 1 }))}>
      {children}{sort.key === k && <span className="ml-1 text-ink-muted">{sort.dir === 1 ? "↑" : "↓"}</span>}
    </th>
  );

  return (
    <>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher une tache, un lot, un responsable…" className="input !w-64" />
        {mode === "global" && (
          <select value={projectId} onChange={(e) => setProjectId(e.target.value)} className="input !w-56">
            <option value="">Tous les projets</option>
            {projects.map((p) => <option key={p.id} value={p.id}>{p.code} · {p.name}</option>)}
          </select>
        )}
        <select value={resp} onChange={(e) => setResp(e.target.value)} className="input !w-48">
          <option value="">Tous les responsables</option>
          {responsibles.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="input !w-36">
          <option value="">Tous les statuts</option>
          {Object.entries(TASK_STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        {mineCount > 0 && <button onClick={() => setMine((v) => !v)} className={`filter-chip ${mine ? "filter-chip-active" : ""}`}>Mes taches ({mineCount})</button>}
        <span className="mx-1 h-4 w-px bg-line-hair" />
        {(Object.keys(DUE_LABELS) as Due[]).map((d) => (
          <button key={d} onClick={() => setDue(d)} className={`filter-chip ${due === d ? "filter-chip-active" : ""}`}>
            {DUE_LABELS[d]}{d === "late" && late > 0 ? <span className="rounded-full bg-alert-bg px-1.5 text-[9px] text-alert">{late}</span> : null}{d === "week" && thisWeek > 0 ? <span className="rounded-full bg-surface-sub px-1.5 text-[9px] text-ink-muted">{thisWeek}</span> : null}
          </button>
        ))}
        <span className="ml-auto text-[10px] text-ink-muted">{filtered.length} / {items.length} taches</span>
        {canEdit && !selecting && <button type="button" onClick={() => setSelecting(true)} className="btn-secondary" title="Selectionner des taches a supprimer">Supprimer des taches</button>}
      </div>
      {selecting && (
        <div className="mb-3 flex flex-wrap items-center gap-3 rounded-md border border-alert-bd bg-alert-bg px-3 py-2 text-[10.5px]">
          <span className="font-semibold text-alert">{checked.size} tache{checked.size > 1 ? "s" : ""} selectionnee{checked.size > 1 ? "s" : ""}</span>
          <button type="button" onClick={toggleAllVisible} className="btn-ghost">{allVisible ? "Aucune" : `Toutes les taches affichees (${filtered.length})`}</button>
          {checked.size > 0 && !allVisible && <button type="button" onClick={() => setChecked(new Set())} className="btn-ghost">Aucune</button>}
          <span className="text-ink-muted">Cocher les taches a supprimer, puis confirmer. Cette action est definitive.</span>
          {err && <span className="font-semibold text-alert">{err}</span>}
          <span className="ml-auto flex items-center gap-2">
            <button type="button" onClick={stopSelecting} disabled={pending} className="btn-secondary">Annuler</button>
            <button type="button" onClick={removeChecked} disabled={pending || checked.size === 0} className="btn-danger">{pending ? "Suppression…" : `Supprimer (${checked.size})`}</button>
          </span>
        </div>
      )}

      <div className="card overflow-x-auto">
        <table className="tbl">
          <thead>
            <tr>
              {selecting && <th className="w-6"><input type="checkbox" checked={allVisible} onChange={toggleAllVisible} aria-label="Tout selectionner" /></th>}
              <th className="w-6" />
              {mode === "global" && <Th k="project">Projet</Th>}
              <Th k="wbs" className="hidden w-14 md:table-cell">WBS</Th>
              <Th k="name">Tache</Th>
              <Th k="responsible" className="hidden md:table-cell">Responsable</Th>
              <Th k="start" className="hidden md:table-cell">Debut</Th>
              <Th k="end">Fin</Th>
              <Th k="progress" className="w-32">Avancement</Th>
              <Th k="budget" className="num hidden lg:table-cell">Budget (k)</Th>
              <th className="num hidden lg:table-cell">Depense (k)</th>
              <th className="hidden md:table-cell">Statut</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((i) => {
              const t = i.task, over = Number(t.budget) > 0 && i.spent > Number(t.budget), lateRow = t.end_date < t0 && t.status !== "done";
              return (
                <tr key={t.id} className={`cursor-pointer ${selecting && checked.has(t.id) ? "[&>td]:!bg-alert-bg" : ""}`} onClick={() => (selecting ? toggleChecked(t.id) : open(t))}>
                  {selecting && <td onClick={(e) => e.stopPropagation()}><input type="checkbox" checked={checked.has(t.id)} onChange={() => toggleChecked(t.id)} aria-label={`Selectionner ${t.name}`} /></td>}
                  <td><span className={`dot ${HEALTH_DOT[i.health as Health]}`} title={HEALTH_LABELS[i.health as Health]} /></td>
                  {mode === "global" && <td className="whitespace-nowrap"><Link href={`/projects/${t.project_id}/planning`} onClick={(e) => e.stopPropagation()} className="font-semibold hover:underline" title={i.project?.name}>{i.project?.code ?? "—"}</Link></td>}
                  <td className="hidden font-mono text-[9.5px] text-ink-faint md:table-cell">{t.wbs_code ?? ""}</td>
                  <td className="min-w-[140px] max-w-[420px]">
                    <div className="truncate font-semibold text-ink">{t.name}</div>
                    {i.lot && <div className="truncate text-[9.5px] text-ink-faint">{i.lot.wbs_code ? `${i.lot.wbs_code} · ` : ""}{i.lot.name}</div>}
                  </td>
                  <td className="hidden max-w-[160px] truncate text-ink-muted md:table-cell">{i.responsible || "—"}</td>
                  <td className="hidden whitespace-nowrap tabular-nums md:table-cell">{formatDate(t.start_date)} <span className="text-ink-faint">{weekLabel(t.start_date)}</span></td>
                  <td className={`whitespace-nowrap tabular-nums ${lateRow ? "font-bold text-alert" : ""}`}>{formatDate(t.end_date)} <span className={lateRow ? "text-alert/70" : "text-ink-faint"}>{weekLabel(t.end_date)}</span></td>
                  <td><div className="flex items-center gap-2"><div className="w-16"><ProgressBar value={t.progress} tone={t.progress >= 100 ? "ok" : undefined} /></div><span className="w-8 text-right tabular-nums">{t.progress} %</span></div></td>
                  <td className="num hidden lg:table-cell">{Number(t.budget) ? kMoney(Number(t.budget)) : "—"}</td>
                  <td className={`num hidden lg:table-cell ${over ? "font-bold text-alert" : "text-ink-muted"}`}>{i.spent ? kMoney(i.spent) : "—"}</td>
                  <td className="hidden whitespace-nowrap md:table-cell"><span className={`chip ${t.status === "done" ? "chip-ok" : t.status === "blocked" ? "chip-alert" : t.status === "in_progress" ? "chip-info" : "chip-neutral"}`}>{TASK_STATUS_LABELS[t.status]}</span></td>
                </tr>
              );
            })}
            {filtered.length === 0 && <tr><td colSpan={12} className="!py-8 text-center text-ink-faint">Aucune tache ne correspond aux filtres.</td></tr>}
          </tbody>
        </table>
      </div>

      {selected && selProject && (
        <TaskDrawer task={selected} isLot={false} lots={projTasks.filter((t) => !t.parent_id && parents.has(t.id)).map((l) => ({ id: l.id, name: l.name }))}
          tasks={projTasks} lists={lists} expenses={ctx.expenses} journal={ctx.journal} registers={ctx.registers} audit={ctx.audit}
          people={people} currency={selProject.currency} projectId={selProject.id} projectCode={selProject.code} canEdit={canEdit}
          defaults={{ start: selProject.start_date, end: selProject.end_date }} spent={spentByTask[selected.id] ?? 0} onClose={close} />
      )}
    </>
  );
}
