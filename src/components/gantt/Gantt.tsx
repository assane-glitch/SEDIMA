"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { addDays, daysBetween, formatDate, formatMoney, today } from "@/lib/format";
import type { Milestone, Profile, Task } from "@/lib/types";
import { TaskDrawer } from "./TaskDrawer";
import { MilestoneDrawer } from "./MilestoneDrawer";

export type RowKind = "project" | "lot" | "task";
export interface GanttRow {
  id: string;
  kind: RowKind;
  parentId?: string | null;
  code?: string | null;
  name: string;
  href?: string;
  start: string;
  end: string;
  progress: number;
  budget: number;
  spent: number;
  responsible?: string;
  health?: Health;
  dependsOn?: string | null;
  linkType?: string;
  task?: Task;
}
export interface GanttMilestone { id: string; name: string; due: string; reached: string | null; rowId?: string | null; notes?: string; milestone?: Milestone }
export type Health = "good" | "warn" | "bad" | "done" | "idle";
type Scale = "day" | "week" | "month" | "year";

const MS_DAY = 86_400_000;
const ROW_H = 30;
const HEAD_H = 44;
const PX: Record<Scale, number> = { day: 26, week: 7, month: 2.4, year: 1.2 };
const BAR: Record<Health, string> = { good: "bg-ink", warn: "bg-warn-dot", bad: "bg-alert", done: "bg-ok", idle: "bg-ink-faint" };
const TRACK: Record<Health, string> = { good: "bg-line-light", warn: "bg-warn-bg border border-warn-bd", bad: "bg-alert-bg border border-alert-bd", done: "bg-ok-bg border border-ok-bd", idle: "bg-line-light" };

export function taskHealth(t: { status?: string; progress: number; start: string; end: string }, t0: string): Health {
  if (t.status === "done" || t.progress >= 100) return "done";
  if (t.status === "blocked") return "bad";
  if (t.end < t0) return "bad";
  if (t.start > t0) return "idle";
  const total = Math.max(1, daysBetween(t.start, t.end) + 1);
  const elapsed = daysBetween(t.start, t0) + 1;
  const expected = Math.round((elapsed / total) * 100);
  return t.progress + 15 < expected ? "warn" : "good";
}

export function Gantt({ rows, milestones, people, currency, canEdit, projectId, projectStart, projectEnd, mode }: {
  rows: GanttRow[]; milestones: GanttMilestone[]; people: Profile[]; currency: string; canEdit: boolean;
  projectId?: string; projectStart: string; projectEnd: string; mode: "project" | "portfolio";
}) {
  const t0 = today();
  const [selected, setSelected] = useState<GanttRow | "new" | null>(null);
  const [selMilestone, setSelMilestone] = useState<GanttMilestone | "new" | null>(null);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [scaleChoice, setScaleChoice] = useState<Scale | "auto">("auto");
  const [showLinks, setShowLinks] = useState(true);

  // ---- Bornes et echelle ----
  const rangeStart = useMemo(() => addDays(rows.reduce((m, r) => (r.start < m ? r.start : m), projectStart), -7), [rows, projectStart]);
  const rangeEnd = useMemo(() => {
    const max = rows.reduce((m, r) => (r.end > m ? r.end : m), projectEnd);
    const mm = milestones.reduce((m, x) => (x.due > m ? x.due : m), max);
    return addDays(mm < t0 ? t0 : mm, 14);
  }, [rows, milestones, projectEnd, t0]);
  const totalDays = Math.max(14, daysBetween(rangeStart, rangeEnd) + 1);
  const scale: Scale = scaleChoice !== "auto" ? scaleChoice : totalDays <= 70 ? "day" : totalDays <= 420 ? "week" : totalDays <= 1200 ? "month" : "year";
  const px = PX[scale];
  const width = Math.ceil(totalDays * px);
  const x = (iso: string) => daysBetween(rangeStart, iso) * px;

  // ---- Lignes visibles (repli des lots) ----
  const visible = useMemo(() => {
    const hasChildren = new Set(rows.filter((r) => r.parentId).map((r) => r.parentId as string));
    return rows.filter((r) => !r.parentId || !collapsed.has(r.parentId)).map((r) => ({ ...r, hasChildren: hasChildren.has(r.id) }));
  }, [rows, collapsed]);
  const rowIndex = useMemo(() => new Map(visible.map((r, i) => [r.id, i])), [visible]);
  const milestoneRow = mode === "project" && milestones.length > 0 ? 1 : 0; // ligne "Jalons" en tete
  const rowTop = (i: number) => HEAD_H + (i + milestoneRow) * ROW_H;
  const lots = rows.filter((r) => r.kind === "lot");
  const toggle = (id: string) => setCollapsed((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  // ---- Graduations ----
  const ticks = useMemo(() => {
    const out: { left: number; width: number; label: string; major?: boolean }[] = [];
    const start = new Date(rangeStart + "T00:00:00Z"), end = new Date(rangeEnd + "T00:00:00Z");
    const off = (d: Date) => Math.round((d.getTime() - start.getTime()) / MS_DAY) * px;
    if (scale === "day") for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) out.push({ left: off(d), width: px, label: String(d.getUTCDate()), major: d.getUTCDay() === 1 });
    else if (scale === "week") { const d = new Date(start); d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7)); for (; d <= end; d.setUTCDate(d.getUTCDate() + 7)) out.push({ left: off(d), width: 7 * px, label: `${d.getUTCDate()}/${d.getUTCMonth() + 1}` }); }
    else if (scale === "month") { const d = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1)); for (; d <= end; d.setUTCMonth(d.getUTCMonth() + 1)) { const n = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1)); out.push({ left: off(d), width: Math.round((n.getTime() - d.getTime()) / MS_DAY) * px, label: d.toLocaleDateString("fr-FR", { month: "short", timeZone: "UTC" }), major: d.getUTCMonth() === 0 }); } }
    else { const d = new Date(Date.UTC(start.getUTCFullYear(), Math.floor(start.getUTCMonth() / 3) * 3, 1)); for (; d <= end; d.setUTCMonth(d.getUTCMonth() + 3)) { const n = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 3, 1)); out.push({ left: off(d), width: Math.round((n.getTime() - d.getTime()) / MS_DAY) * px, label: `T${Math.floor(d.getUTCMonth() / 3) + 1}`, major: d.getUTCMonth() === 0 }); } }
    return out;
  }, [rangeStart, rangeEnd, scale, px]);
  const bands = useMemo(() => {
    const out: { left: number; width: number; label: string }[] = [];
    const start = new Date(rangeStart + "T00:00:00Z"), end = new Date(rangeEnd + "T00:00:00Z");
    const yearly = scale === "month" || scale === "year";
    const d = yearly ? new Date(Date.UTC(start.getUTCFullYear(), 0, 1)) : new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1));
    for (; d <= end; yearly ? d.setUTCFullYear(d.getUTCFullYear() + 1) : d.setUTCMonth(d.getUTCMonth() + 1)) {
      const n = yearly ? new Date(Date.UTC(d.getUTCFullYear() + 1, 0, 1)) : new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1));
      const a = Math.max(0, Math.round((d.getTime() - start.getTime()) / MS_DAY)), b = Math.min(totalDays, Math.round((n.getTime() - start.getTime()) / MS_DAY));
      out.push({ left: a * px, width: (b - a) * px, label: yearly ? String(d.getUTCFullYear()) : d.toLocaleDateString("fr-FR", { month: "long", year: "numeric", timeZone: "UTC" }) });
    }
    return out;
  }, [rangeStart, rangeEnd, scale, px, totalDays]);

  // ---- Liens de dependance ----
  const links = useMemo(() => {
    if (!showLinks) return [];
    const byId = new Map(visible.map((r) => [r.id, r]));
    const out: { d: string; key: string }[] = [];
    for (const r of visible) {
      if (!r.dependsOn) continue;
      const p = byId.get(r.dependsOn); if (!p) continue;
      const i1 = rowIndex.get(p.id)!, i2 = rowIndex.get(r.id)!;
      const fromX = r.linkType === "DD" ? x(p.start) : x(addDays(p.end, 1));
      const y1 = rowTop(i1) + ROW_H / 2 - HEAD_H, y2 = rowTop(i2) + ROW_H / 2 - HEAD_H;
      const toX = x(r.start);
      const mid = Math.max(fromX + 6, toX - 8);
      out.push({ key: r.id, d: `M${fromX},${y1} H${fromX + 6} V${y2} H${toX - 3}` + (mid > fromX + 6 ? "" : "") });
    }
    return out;
  }, [visible, rowIndex, showLinks, px, rangeStart]); // eslint-disable-line react-hooks/exhaustive-deps

  const todayX = x(t0) + px / 2;
  const gridH = HEAD_H + (visible.length + milestoneRow) * ROW_H;
  const cols = mode === "project" ? "grid-cols-[52px_minmax(200px,1fr)_120px_58px_100px_100px]" : "grid-cols-[minmax(220px,1fr)_120px_58px_110px_110px]";
  const leftW = mode === "project" ? "w-[630px]" : "w-[618px]";

  return (
    <div className="card overflow-hidden">
      {/* Barre d'outils */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line-hair px-3 py-1.5 text-[10px] text-ink-muted">
        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-1.5"><span className="dot bg-ink" />Dans les temps</span>
          <span className="inline-flex items-center gap-1.5"><span className="dot bg-warn-dot" />Avancement en retard</span>
          <span className="inline-flex items-center gap-1.5"><span className="dot bg-alert" />Echeance depassee</span>
          <span className="inline-flex items-center gap-1.5"><span className="dot bg-ok" />Termine</span>
          <span className="inline-flex items-center gap-1.5"><span className="inline-block h-2 w-2 rotate-45 border border-ink bg-surface" />Jalon</span>
        </div>
        <div className="flex items-center gap-1">
          {(["day", "week", "month", "year"] as Scale[]).map((s) => (
            <button key={s} onClick={() => setScaleChoice(s)} className={`filter-chip !py-[2px] ${scale === s ? "filter-chip-active" : ""}`}>{{ day: "Jour", week: "Semaine", month: "Mois", year: "Trimestre" }[s]}</button>
          ))}
          <span className="mx-1 h-4 w-px bg-line-hair" />
          {lots.length > 0 && <>
            <button onClick={() => setCollapsed(new Set())} className="btn-secondary !py-[2px]" title="Tout deplier">▾</button>
            <button onClick={() => setCollapsed(new Set(lots.map((l) => l.id)))} className="btn-secondary !py-[2px]" title="Tout replier">▸</button>
          </>}
          {mode === "project" && <button onClick={() => setShowLinks((v) => !v)} className={`btn-secondary !py-[2px] ${showLinks ? "!bg-surface-sub" : ""}`} title="Liens de dependance">⇢ Liens</button>}
          {canEdit && mode === "project" && <>
            <span className="mx-1 h-4 w-px bg-line-hair" />
            <button onClick={() => setSelMilestone("new")} className="btn-secondary !py-[2px]">+ Jalon</button>
            <button onClick={() => setSelected("new")} className="btn-primary !py-[2px]">+ Tache</button>
          </>}
        </div>
      </div>

      <div className="flex overflow-x-auto">
        {/* Colonnes fixes */}
        <div className={`sticky left-0 z-10 shrink-0 border-r border-line-hair bg-surface ${leftW}`}>
          <div className={`grid ${cols} items-end border-b border-line-hair bg-thead px-2 pb-1.5 eyebrow`} style={{ height: HEAD_H }}>
            {mode === "project" && <div>WBS</div>}
            <div>{mode === "project" ? "Lot / tache" : "Projet"}</div><div>{mode === "project" ? "Responsable" : "Chef de projet"}</div><div className="text-right">Avanc.</div><div className="text-right">Budget</div><div className="text-right">Depense</div>
          </div>
          {milestoneRow === 1 && (
            <div className={`grid ${cols} items-center border-b border-line-light px-2 text-[10.5px]`} style={{ height: ROW_H }}>
              {mode === "project" && <div />}
              <div className="font-bold text-ink">Jalons <span className="font-normal text-ink-faint">{milestones.filter((m) => m.reached).length}/{milestones.length}</span></div><div /><div /><div /><div />
            </div>
          )}
          {visible.map((r) => {
            const over = r.budget > 0 && r.spent > r.budget;
            const isLot = r.kind === "lot";
            return (
              <div key={r.id} className={`grid ${cols} items-center border-b border-line-light px-2 text-[10.5px] ${isLot ? "bg-surface-alt" : "hover:bg-surface-alt"}`} style={{ height: ROW_H }}>
                {mode === "project" && <div className="truncate pr-1 font-mono text-[9.5px] text-ink-faint">{r.code}</div>}
                <div className={`flex min-w-0 items-center gap-1 ${r.kind === "task" && r.parentId ? "pl-4" : ""}`}>
                  {isLot && <button onClick={() => toggle(r.id)} className="w-3 shrink-0 cursor-pointer text-[9px] text-ink-faint" aria-label="Replier">{collapsed.has(r.id) ? "▸" : "▾"}</button>}
                  {r.href
                    ? <Link href={r.href} className="truncate font-semibold hover:underline">{r.name}</Link>
                    : <button onClick={() => (r.kind === "task" || r.kind === "lot") && setSelected(r)} className={`min-w-0 cursor-pointer truncate text-left ${isLot ? "font-bold" : "font-semibold"}`}>{r.name}</button>}
                </div>
                <div className="truncate pr-1 text-[10px] text-ink-muted">{r.responsible || "—"}</div>
                <div className="text-right tabular-nums">{r.progress} %</div>
                <div className="text-right tabular-nums text-ink-muted">{r.budget ? formatMoney(r.budget, currency) : "—"}</div>
                <div className={`text-right tabular-nums ${over ? "font-bold text-alert" : "text-ink-muted"}`}>{r.spent ? formatMoney(r.spent, currency) : "—"}</div>
              </div>
            );
          })}
          {visible.length === 0 && <div className="hint px-3 py-8">Aucune ligne a afficher.</div>}
        </div>

        {/* Chronologie */}
        <div className="relative" style={{ width, height: Math.max(gridH, HEAD_H + ROW_H) }}>
          <div className="sticky top-0 border-b border-line-hair bg-thead" style={{ height: HEAD_H }}>
            {bands.map((b, i) => <div key={i} className="absolute top-0 h-5 overflow-hidden whitespace-nowrap border-r border-line-hair px-1.5 text-[9.5px] font-semibold capitalize leading-5 text-ink-body" style={{ left: b.left, width: b.width }}>{b.label}</div>)}
            {ticks.map((t, i) => <div key={i} className={`absolute bottom-0 h-6 overflow-hidden border-r text-center text-[9px] leading-6 text-ink-faint ${t.major ? "border-line-hair" : "border-line-light"}`} style={{ left: t.left, width: t.width }}>{t.width > 14 ? t.label : ""}</div>)}
          </div>
          {ticks.map((t, i) => <div key={i} className={`absolute bottom-0 border-r ${t.major ? "border-line-hair" : "border-line-light"}`} style={{ left: t.left + t.width - 1, top: HEAD_H }} />)}
          {/* Lignes horizontales */}
          {Array.from({ length: visible.length + milestoneRow }).map((_, i) => <div key={i} className={`absolute left-0 right-0 border-b border-line-light ${milestoneRow === 1 && i === 0 ? "bg-surface-alt/60" : ""}`} style={{ top: HEAD_H + i * ROW_H, height: ROW_H }} />)}
          {/* Aujourd'hui : le seul trait rouge */}
          {todayX >= 0 && todayX <= width && (
            <div className="absolute bottom-0 z-[6] w-px bg-brand" style={{ left: todayX, top: HEAD_H }}>
              <div className="absolute -left-[18px] -top-[14px] rounded-xs bg-brand px-1 text-[8px] font-bold leading-[13px] text-surface">Auj.</div>
            </div>
          )}
          {/* Liens */}
          {links.length > 0 && (
            <svg className="pointer-events-none absolute left-0 z-[4]" style={{ top: HEAD_H }} width={width} height={gridH - HEAD_H}>
              <defs><marker id="arr" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 z" fill="#9ca3af" /></marker></defs>
              {links.map((l) => <path key={l.key} d={l.d} fill="none" stroke="#9ca3af" strokeWidth="1" markerEnd="url(#arr)" />)}
            </svg>
          )}
          {/* Jalons, ligne de tete (mode projet) */}
          {milestoneRow === 1 && milestones.map((m) => <Diamond key={m.id} m={m} left={x(m.due) + px / 2} top={HEAD_H + ROW_H / 2} t0={t0} onClick={() => canEdit && setSelMilestone(m)} />)}
          {/* Barres */}
          {visible.map((r, i) => {
            const left = x(r.start), w = Math.max(px, (daysBetween(r.start, r.end) + 1) * px);
            const h = r.health ?? taskHealth({ status: r.task?.status, progress: r.progress, start: r.start, end: r.end }, t0);
            const top = rowTop(i);
            if (r.kind === "lot" || r.kind === "project") {
              return (
                <div key={r.id} className="absolute" style={{ top: top + 9, left, width: w, height: 12 }}>
                  <button onClick={() => r.href ? undefined : setSelected(r)} title={`${r.name}\n${formatDate(r.start)} → ${formatDate(r.end)}\n${r.progress} %`} className="relative block h-full w-full cursor-pointer">
                    <div className={`absolute inset-x-0 top-0 h-[7px] rounded-xs ${r.kind === "project" ? TRACK[h] : "bg-line-soft"}`} />
                    <div className={`absolute left-0 top-0 h-[7px] rounded-xs ${r.kind === "project" ? BAR[h] : "bg-ink-muted"}`} style={{ width: `${r.progress}%` }} />
                    <div className="absolute -bottom-px left-0 h-0 w-0 border-l-[5px] border-t-[6px] border-l-transparent border-t-ink-muted" />
                    <div className="absolute -bottom-px right-0 h-0 w-0 border-r-[5px] border-t-[6px] border-r-transparent border-t-ink-muted" />
                  </button>
                  {mode === "portfolio" && milestones.filter((m) => m.rowId === r.id).map((m) => <Diamond key={m.id} m={m} left={x(m.due) - left + px / 2} top={6} t0={t0} small />)}
                </div>
              );
            }
            return (
              <button key={r.id} onClick={() => setSelected(r)} title={`${r.name}\n${formatDate(r.start)} → ${formatDate(r.end)}\n${r.progress} %${r.responsible ? `\n${r.responsible}` : ""}`}
                className={`absolute cursor-pointer overflow-hidden rounded-xs ${TRACK[h]} text-left`} style={{ top: top + 7, left, width: w, height: 16 }}>
                <div className={`h-full ${BAR[h]}`} style={{ width: `${r.progress}%` }} />
                {w > 70 && <span className="absolute inset-y-0 left-1.5 flex items-center truncate text-[9.5px] font-semibold text-surface mix-blend-difference" style={{ maxWidth: w - 8 }}>{r.name}</span>}
              </button>
            );
          })}
        </div>
      </div>

      {selected && projectId && (
        <TaskDrawer task={selected === "new" ? null : (selected.task ?? null)} lots={lots.map((l) => ({ id: l.id, name: l.name }))} tasks={rows.filter((r) => r.kind === "task" && r.task).map((r) => r.task!)}
          people={people} currency={currency} projectId={projectId} canEdit={canEdit} defaults={{ start: projectStart, end: projectEnd }}
          spent={selected === "new" ? 0 : selected.spent} onClose={() => setSelected(null)} />
      )}
      {selMilestone && projectId && (
        <MilestoneDrawer milestone={selMilestone === "new" ? null : (selMilestone.milestone ?? null)} projectId={projectId} defaultDate={projectEnd} onClose={() => setSelMilestone(null)} />
      )}
    </div>
  );
}

function Diamond({ m, left, top, t0, onClick, small }: { m: GanttMilestone; left: number; top: number; t0: string; onClick?: () => void; small?: boolean }) {
  const overdue = !m.reached && m.due < t0;
  const size = small ? 8 : 11;
  const cls = m.reached ? "border-ok bg-ok" : overdue ? "border-alert bg-alert" : "border-ink bg-surface";
  return (
    <button onClick={onClick} title={`${m.name}\n${m.reached ? `atteint le ${formatDate(m.reached)}` : formatDate(m.due)}`}
      className={`absolute z-[5] rotate-45 border cursor-pointer ${cls}`} style={{ left: left - size / 2, top: top - size / 2, width: size, height: size }} />
  );
}
