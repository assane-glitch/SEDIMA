"use client";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { addDays, daysBetween, formatDate, today } from "@/lib/format";
import { HEALTH_DOT, HEALTH_LABELS, type Health } from "@/lib/health";
import type { AuditEntry, Expense, JournalEntry, Milestone, Profile, RegisterEntry, Task } from "@/lib/types";
import type { Lists } from "@/lib/reference-types";
import { TaskDrawer } from "./TaskDrawer";
import { MilestoneDrawer } from "./MilestoneDrawer";

export type RowKind = "project" | "lot" | "task";
export interface GanttRow {
  id: string; kind: RowKind; parentId?: string | null; code?: string | null; name: string; href?: string;
  start: string; end: string; progress: number; budget: number; spent: number; responsible?: string;
  baselineStart?: string | null; baselineEnd?: string | null; actualStart?: string | null; actualEnd?: string | null;
  health?: Health; dependsOn?: string | null; linkType?: string; task?: Task;
}
export interface GanttMilestone { id: string; name: string; due: string; reached: string | null; rowId?: string | null; notes?: string; milestone?: Milestone }
type Scale = "day" | "week" | "month" | "year";

const MS_DAY = 86_400_000;
const ROW_LOT = 26;
const ROW_TASK = 20;
const ROW_MS = 22;
const HEAD_H = 44;
const PX: Record<Scale, number> = { day: 26, week: 8, month: 3.2, year: 1.2 };
const SCALE_LABEL: Record<Scale, string> = { day: "Jour", week: "Semaine", month: "Mois", year: "Trimestre" };

function isoWeek(d: Date) {
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = t.getUTCDay() || 7; t.setUTCDate(t.getUTCDate() + 4 - day);
  const y0 = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  return Math.ceil(((t.getTime() - y0.getTime()) / MS_DAY + 1) / 7);
}

export function Gantt({ rows, milestones, expenses = [], journal = [], registers = [], audit = [], lists, people, currency, canEdit, projectId, projectCode, projectStart, projectEnd, mode }: {
  rows: GanttRow[]; milestones: GanttMilestone[]; expenses?: Expense[]; journal?: JournalEntry[]; registers?: RegisterEntry[]; audit?: AuditEntry[]; lists?: Lists; people: Profile[]; currency: string; canEdit: boolean;
  projectId?: string; projectCode?: string; projectStart: string; projectEnd: string; mode: "project" | "portfolio";
}) {
  const t0 = today();
  const [selected, setSelected] = useState<GanttRow | "new" | null>(null);
  const [selMilestone, setSelMilestone] = useState<GanttMilestone | "new" | null>(null);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [scaleChoice, setScaleChoice] = useState<Scale | "auto">("auto");
  const [showLinks, setShowLinks] = useState(true);
  const [showBaseline, setShowBaseline] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);
  // Largeurs des colonnes de gauche, redimensionnables et memorisees
  const COLS_KEY = `sedima.gantt.cols.${mode}`;
  const defaultWidths = mode === "project" ? [44, 250, 116, 52, 92, 92] : [18, 280, 120, 52, 100, 100];
  const [widths, setWidths] = useState<number[]>(defaultWidths);
  useEffect(() => { try { const v = JSON.parse(localStorage.getItem(COLS_KEY) ?? "null"); if (Array.isArray(v) && v.length === defaultWidths.length) setWidths(v); } catch {} }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const startResize = (i: number, e: React.MouseEvent) => {
    e.preventDefault();
    const x0 = e.clientX, w0 = widths[i];
    const move = (ev: MouseEvent) => setWidths((w) => { const n = [...w]; n[i] = Math.max(28, w0 + ev.clientX - x0); return n; });
    const up = () => { window.removeEventListener("mousemove", move); window.removeEventListener("mouseup", up); setWidths((w) => { try { localStorage.setItem(COLS_KEY, JSON.stringify(w)); } catch {} return w; }); };
    window.addEventListener("mousemove", move); window.addEventListener("mouseup", up);
  };
  const scrollToToday = () => { const el = bodyRef.current; if (el) el.scrollLeft = Math.max(0, todayXRef.current - el.clientWidth / 3); };
  const todayXRef = useRef(0);
  const lots = useMemo(() => rows.filter((r) => r.kind === "lot"), [rows]);
  const allCollapsed = lots.length > 0 && lots.every((l) => collapsed.has(l.id));

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

  // ---- Lignes visibles ----
  const visible = useMemo(() => rows.filter((r) => !r.parentId || !collapsed.has(r.parentId)), [rows, collapsed]);
  const rowIndex = useMemo(() => new Map(visible.map((r, i) => [r.id, i])), [visible]);
  const msRow = mode === "project" && milestones.length > 0 ? 1 : 0;
  const rowH = (r: GanttRow) => (r.kind === "task" && r.parentId ? ROW_TASK : ROW_LOT);
  const tops = useMemo(() => { let y = HEAD_H + msRow * ROW_MS; return visible.map((r) => { const t = y; y += rowH(r); return t; }); }, [visible, msRow]);
  const rowTop = (i: number) => tops[i] ?? HEAD_H;
  const toggle = (id: string) => setCollapsed((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  // ---- Graduations : bandes (haut) et ticks (bas) ----
  const { bands, ticks } = useMemo(() => {
    const start = new Date(rangeStart + "T00:00:00Z"), end = new Date(rangeEnd + "T00:00:00Z");
    const off = (d: Date) => Math.round((d.getTime() - start.getTime()) / MS_DAY) * px;
    const clampW = (a: Date, b: Date) => (Math.min(totalDays, Math.round((b.getTime() - start.getTime()) / MS_DAY)) - Math.max(0, Math.round((a.getTime() - start.getTime()) / MS_DAY))) * px;
    const bands: { left: number; width: number; label: string }[] = [];
    const ticks: { left: number; width: number; label: string; major?: boolean }[] = [];
    if (scale === "year") {
      for (const d = new Date(Date.UTC(start.getUTCFullYear(), 0, 1)); d <= end; d.setUTCFullYear(d.getUTCFullYear() + 1)) { const n = new Date(Date.UTC(d.getUTCFullYear() + 1, 0, 1)); bands.push({ left: Math.max(0, off(d)), width: clampW(d, n), label: String(d.getUTCFullYear()) }); }
      for (const d = new Date(Date.UTC(start.getUTCFullYear(), Math.floor(start.getUTCMonth() / 3) * 3, 1)); d <= end; d.setUTCMonth(d.getUTCMonth() + 3)) { const n = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 3, 1)); ticks.push({ left: off(d), width: Math.round((n.getTime() - d.getTime()) / MS_DAY) * px, label: `T${Math.floor(d.getUTCMonth() / 3) + 1}`, major: d.getUTCMonth() === 0 }); }
    } else {
      // Bandes = mois (avec l'annee), ticks = semaines ou jours
      for (const d = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1)); d <= end; d.setUTCMonth(d.getUTCMonth() + 1)) { const n = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1)); bands.push({ left: Math.max(0, off(d)), width: clampW(d, n), label: d.toLocaleDateString("fr-FR", { month: scale === "month" ? "short" : "long", year: "numeric", timeZone: "UTC" }) }); }
      if (scale === "day") for (const d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) ticks.push({ left: off(d), width: px, label: String(d.getUTCDate()), major: d.getUTCDay() === 1 });
      else { const d = new Date(start); d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7)); for (; d <= end; d.setUTCDate(d.getUTCDate() + 7)) ticks.push({ left: off(d), width: 7 * px, label: `S${isoWeek(d)}`, major: d.getUTCDate() <= 7 }); }
    }
    return { bands, ticks };
  }, [rangeStart, rangeEnd, scale, px, totalDays]);

  // ---- Liens de dependance : du predecesseur vers le successeur, fleche entrante a gauche ----
  const links = useMemo(() => {
    if (!showLinks || mode !== "project") return [];
    const byId = new Map(visible.map((r) => [r.id, r]));
    const out: { d: string; key: string }[] = [];
    for (const r of visible) {
      if (!r.dependsOn) continue;
      const p = byId.get(r.dependsOn); if (!p) continue;
      const i1 = rowIndex.get(p.id)!, i2 = rowIndex.get(r.id)!;
      const y1 = rowTop(i1) + rowH(visible[i1]) / 2 - HEAD_H;
      const barTop2 = rowTop(i2) + (rowH(visible[i2]) - 8) / 2 - HEAD_H;   // bord superieur de la barre du successeur
      const yEnd = i2 > i1 ? barTop2 - 1 : barTop2 + 9;                      // arrivee par le dessus (ou le dessous si le successeur est au-dessus)
      const xIn = x(r.start) + Math.min(6, Math.max(2, px));                 // point d'entree, juste apres le debut de la barre
      if (r.linkType === "DD") {
        const x1 = x(p.start);
        out.push({ key: r.id, d: xIn >= x1 - 2 ? `M${x1},${y1} V${(y1 + yEnd) / 2} H${xIn} V${yEnd}` : `M${x1},${y1} H${xIn - 8} V${(y1 + yEnd) / 2} H${xIn} V${yEnd}` });
      } else {
        const x1 = x(addDays(p.end, 1));
        if (xIn >= x1 + 4) out.push({ key: r.id, d: `M${x1},${y1} H${xIn} V${yEnd}` });
        else { const ym = y1 + (i2 > i1 ? ROW_TASK / 2 + 2 : -(ROW_TASK / 2 + 2)); out.push({ key: r.id, d: `M${x1},${y1} H${x1 + 8} V${ym} H${xIn} V${yEnd}` }); }
      }
    }
    return out;
  }, [visible, rowIndex, showLinks, mode, px, rangeStart, tops]); // eslint-disable-line react-hooks/exhaustive-deps

  const todayX = x(t0) + px / 2;
  todayXRef.current = todayX;
  const gridH = (tops.length ? tops[tops.length - 1] + rowH(visible[visible.length - 1]) : HEAD_H + msRow * ROW_MS);
  const gridStyle = { gridTemplateColumns: widths.map((w) => `${w}px`).join(" ") };
  const leftPx = widths.reduce((a, b) => a + b, 0) + 16;
  const headRef = useRef<HTMLDivElement>(null);
  const kMoney = (v: number) => `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(Math.round(v / 1000))} k`;
  const weekLabel = (a: string, b: string) => `S${isoWeek(new Date(a + "T00:00:00Z"))} → S${isoWeek(new Date(b + "T00:00:00Z"))}`;

  return (
    <div className="card overflow-hidden">
      {/* Barre d'outils, hors zone de defilement */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line-hair px-3 py-1.5 text-[10px] text-ink-muted">
        <div className="flex flex-wrap items-center gap-3">
          {(["good", "warn", "bad", "done", "idle"] as Health[]).map((h) => <span key={h} className="inline-flex items-center gap-1.5"><span className={`dot ${HEALTH_DOT[h]}`} />{HEALTH_LABELS[h]}</span>)}
          <span className="inline-flex items-center gap-1.5"><span className="inline-block h-2 w-2 rotate-45 border border-ink bg-surface" />Jalon</span>
          {showBaseline && <span className="inline-flex items-center gap-1.5"><span className="inline-block h-[3px] w-4 rounded-full bg-line-soft" />Reference</span>}
          <span className="inline-flex items-center gap-1.5"><span className="inline-block h-[2px] w-4 rounded-full bg-ink" />Reel</span>
        </div>
        <div className="flex flex-wrap items-center gap-1">
          {(["day", "week", "month", "year"] as Scale[]).map((s) => <button key={s} onClick={() => setScaleChoice(s)} className={`filter-chip !py-[2px] ${scale === s ? "filter-chip-active" : ""}`}>{SCALE_LABEL[s]}</button>)}
          <button onClick={scrollToToday} className="btn-primary !py-[2px]">Aujourd&apos;hui</button>
          {lots.length > 0 && <>
            <span className="mx-1 h-4 w-px bg-line-hair" />
            <button onClick={() => setCollapsed(allCollapsed ? new Set() : new Set(lots.map((l) => l.id)))} className="btn-secondary !py-[2px]">{allCollapsed ? "+ Tout deplier" : "− Tout replier"}</button>
          </>}
          {mode === "project" && <button onClick={() => setShowLinks((v) => !v)} className={`btn-secondary !py-[2px] ${showLinks ? "!bg-surface-sub" : ""}`}>⇢ Liens</button>}
          {mode === "project" && <button onClick={() => setShowBaseline((v) => !v)} className={`btn-secondary !py-[2px] ${showBaseline ? "!bg-surface-sub" : ""}`} title="Afficher le planning de reference sous chaque barre">▭ Reference</button>}
          {canEdit && mode === "project" && <>
            <span className="mx-1 h-4 w-px bg-line-hair" />
            <button onClick={() => setSelMilestone("new")} className="btn-secondary !py-[2px]">+ Jalon</button>
            <button onClick={() => setSelected("new")} className="btn-primary !py-[2px]">+ Tache</button>
          </>}
        </div>
      </div>

      {/* Corps : defilement vertical global ; seules les barres defilent horizontalement */}
      <div className="relative overflow-y-auto" style={{ maxHeight: "calc(100vh - 210px)" }}>
        {/* En-tete fige : colonnes a gauche, graduations a droite (synchronisees avec le defilement des barres) */}
        <div className="sticky top-0 z-30 flex border-b border-line-hair bg-thead">
          <div className="relative grid shrink-0 overflow-hidden border-r-2 border-line px-2 eyebrow" style={{ ...gridStyle, width: leftPx, height: HEAD_H }}>
            {[mode === "project" ? "WBS" : "", mode === "project" ? "Lot / tache" : "Projet", mode === "project" ? "Responsable" : "Chef de projet", "Avanc.", "Budget (k FCFA)", "Depense (k FCFA)"].map((label, i) => (
              <div key={i} className={`relative h-full truncate pr-3.5 leading-[44px] ${i >= 3 ? "text-right" : ""}`}>
                {label}
                <div onMouseDown={(e) => startResize(i, e)} className="group absolute -right-[3px] bottom-0 top-0 flex w-[7px] cursor-col-resize items-center justify-center" title="Glisser pour redimensionner">
                  <div className="h-5 w-px bg-line group-hover:w-[2px] group-hover:bg-ink-muted" />
                </div>
              </div>
            ))}
          </div>
          <div ref={headRef} className="relative min-w-0 flex-1 overflow-hidden" style={{ height: HEAD_H }}>
            <div className="relative" style={{ width, height: HEAD_H }}>
              {bands.map((b, i) => <div key={i} className="absolute top-0 h-5 overflow-hidden whitespace-nowrap border-r border-line-hair px-1.5 text-[9.5px] font-semibold capitalize leading-5 text-ink-body" style={{ left: b.left, width: b.width }}>{b.width > 40 ? b.label : ""}</div>)}
              {ticks.map((t, i) => { const cur = todayX >= t.left && todayX < t.left + t.width && scale !== "day"; return <div key={i} className={`absolute bottom-0 h-6 overflow-hidden border-r text-center text-[9px] leading-6 ${cur ? "rounded-t-xs bg-brand font-bold text-surface" : t.major ? "border-line-hair text-ink-faint" : "border-line-light text-ink-faint"}`} style={{ left: t.left, width: t.width }}>{t.width > 16 ? t.label : ""}</div>; })}
              {scale === "day" && todayX >= 0 && todayX <= width && <div className="absolute bottom-0 -ml-[18px] rounded-xs bg-brand px-1 text-[8px] font-bold leading-[13px] text-surface" style={{ left: todayX }}>Auj.</div>}
            </div>
          </div>
        </div>

        <div className="flex">
          {/* Panneau gauche : toujours visible */}
          <div className="shrink-0 border-r-2 border-line bg-surface" style={{ width: leftPx }}>
            {msRow === 1 && (
              <div className="grid items-center border-b border-line-light bg-surface-alt px-2 text-[11px]" style={{ ...gridStyle, height: ROW_MS }}>
                <div /><div className="font-bold">Jalons <span className="font-normal text-ink-faint">{milestones.filter((m) => m.reached).length}/{milestones.length}</span></div><div /><div /><div /><div />
              </div>
            )}
            {visible.map((r) => {
              const isLot = r.kind === "lot";
              const over = r.budget > 0 && r.spent > r.budget;
              const h = r.health ?? "idle";
              return (
                <div key={r.id} className={`grid items-center border-b border-line-light px-2 ${isLot ? "bg-surface-alt text-[12px] font-bold" : "text-[11px] hover:bg-surface-alt"}`} style={{ ...gridStyle, height: rowH(r) }}>
                  <div className="flex items-center gap-1 truncate pr-1">
                    <span className={`dot ${HEALTH_DOT[h]}`} title={HEALTH_LABELS[h]} />
                    {mode === "project" && <span className={`font-mono text-[9px] ${isLot ? "text-ink" : "text-ink-faint"}`}>{r.code}</span>}
                  </div>
                  <div className={`flex min-w-0 items-center gap-1 ${r.parentId ? "pl-4" : ""}`}>
                    {isLot && <button onClick={() => toggle(r.id)} className="flex h-[13px] w-[13px] shrink-0 cursor-pointer items-center justify-center rounded-xs border border-line text-[10px] font-bold leading-none text-ink-muted hover:bg-surface-sub" aria-label={collapsed.has(r.id) ? "Deplier" : "Replier"}>{collapsed.has(r.id) ? "+" : "−"}</button>}
                    {r.href
                      ? <Link href={r.href} className="truncate font-semibold hover:underline">{r.name}</Link>
                      : <button onClick={() => setSelected(r)} className={`min-w-0 cursor-pointer truncate text-left ${isLot ? "font-bold text-ink" : "font-normal text-ink-body"}`}>{r.name}</button>}
                  </div>
                  <div className={`truncate pr-1 text-[10px] ${isLot ? "text-ink-body" : "text-ink-muted"}`}>{r.responsible || "—"}</div>
                  <div className="pr-3.5 text-right tabular-nums">{r.progress} %</div>
                  <div className={`truncate pr-3.5 text-right tabular-nums ${isLot ? "" : "text-ink-muted"}`}>{r.budget ? kMoney(r.budget) : "—"}</div>
                  <div className={`truncate pr-3.5 text-right tabular-nums ${over ? "font-bold text-alert" : isLot ? "" : "text-ink-muted"}`}>{r.spent ? kMoney(r.spent) : "—"}</div>
                </div>
              );
            })}
            {visible.length === 0 && <div className="hint px-3 py-8">Aucune ligne a afficher.</div>}
          </div>

          {/* Barres : seul element a defilement horizontal */}
          <div ref={bodyRef} className="min-w-0 flex-1 overflow-x-auto" onScroll={(e) => { if (headRef.current) headRef.current.scrollLeft = e.currentTarget.scrollLeft; }}>
            <div className="relative" style={{ width, height: Math.max(gridH - HEAD_H, ROW_LOT) }}>
              {msRow === 1 && <div className="absolute inset-x-0 top-0 border-b border-line-light bg-surface-alt" style={{ height: ROW_MS }}>
                {milestones.map((m) => <Diamond key={m.id} m={m} left={x(m.due) + px / 2} top={ROW_MS / 2} t0={t0} onClick={() => canEdit && setSelMilestone(m)} />)}
              </div>}
              {/* Bande de la semaine en cours */}
              {(() => { const wk = ticks.find((t) => todayX >= t.left && todayX < t.left + t.width); return wk && scale !== "day" ? <div className="absolute bottom-0 top-0 z-[6] border-l-2 border-r border-l-brand border-r-alert-bd bg-alert-bg/80" style={{ left: wk.left, width: wk.width }} /> : null; })()}
              {ticks.map((t, i) => <div key={i} className={`absolute bottom-0 top-0 border-r ${t.major ? "border-line-hair" : "border-line-light"}`} style={{ left: t.left + t.width - 1 }} />)}
              {visible.map((r, i) => <div key={i} className={`absolute left-0 right-0 border-b border-line-light ${r.kind === "lot" ? "bg-surface-alt/50" : ""}`} style={{ top: rowTop(i) - HEAD_H, height: rowH(r) }} />)}
              {scale === "day" && todayX >= 0 && todayX <= width && <div className="absolute bottom-0 top-0 z-[6] w-px bg-brand" style={{ left: todayX }} />}
              {links.length > 0 && (
                <svg className="pointer-events-none absolute left-0 top-0 z-[4]" width={width} height={gridH - HEAD_H}>
                  <defs><marker id="arr" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto"><path d="M0,0 L7,3.5 L0,7 z" fill="#6b7280" /></marker></defs>
                  {links.map((l) => <path key={l.key} d={l.d} fill="none" stroke="#6b7280" strokeWidth="1" markerEnd="url(#arr)" />)}
                </svg>
              )}
              {visible.map((r, i) => {
                const left = x(r.start), w = Math.max(px, (daysBetween(r.start, r.end) + 1) * px), top = rowTop(i) - HEAD_H;
                const title = `${r.name}\n${formatDate(r.start)} → ${formatDate(r.end)}\n${r.progress} %${r.responsible ? `\n${r.responsible}` : ""}`;
                const h = rowH(r), barH = 8, barTop = top + (h - barH) / 2 - (showBaseline && r.baselineStart ? 2 : 0);
                const baseline = showBaseline && r.baselineStart && r.baselineEnd ? <div className="pointer-events-none absolute rounded-full bg-line-soft" title={`Reference : ${formatDate(r.baselineStart)} → ${formatDate(r.baselineEnd)}`} style={{ top: barTop + barH + 1, left: x(r.baselineStart), width: Math.max(px, (daysBetween(r.baselineStart, r.baselineEnd) + 1) * px), height: 3 }} /> : null;
                const actual = r.actualStart ? <div className="pointer-events-none absolute rounded-full bg-ink" title={`Reel : ${formatDate(r.actualStart)} → ${r.actualEnd ? formatDate(r.actualEnd) : "en cours"}`} style={{ top: barTop - 3, left: x(r.actualStart), width: Math.max(2, (daysBetween(r.actualStart, r.actualEnd ?? t0) + 1) * px), height: 2 }} /> : null;
                const atEdge = left + w + 60 > width;
                const weeks = <span className="pointer-events-none absolute whitespace-nowrap text-[9px] tabular-nums text-ink-muted" style={atEdge ? { right: width - left + 5, top: barTop - 2 } : { left: left + w + 6, top: barTop - 2 }}>{weekLabel(r.start, r.end)}</span>;
                if (r.kind === "lot" || r.kind === "project") {
                  const fill = r.kind === "lot" ? "bg-brand" : "bg-ink-body", track = r.kind === "lot" ? "bg-alert-bd" : "bg-line";
                  return (
                    <div key={r.id}>
                      <div className="absolute" style={{ top: barTop, left, width: w, height: barH }}>
                        {r.href ? <Link href={r.href} title={title} className="relative block h-full w-full"><Bar fill={fill} track={track} progress={r.progress} /></Link>
                          : <button onClick={() => setSelected(r)} title={title} className="relative block h-full w-full cursor-pointer"><Bar fill={fill} track={track} progress={r.progress} /></button>}
                        {mode === "portfolio" && milestones.filter((m) => m.rowId === r.id).map((m) => <Diamond key={m.id} m={m} left={x(m.due) - left + px / 2} top={barH / 2} t0={t0} small />)}
                      </div>
                      {weeks}{baseline}{actual}
                    </div>
                  );
                }
                return (
                  <div key={r.id}>
                    <button onClick={() => setSelected(r)} title={title} className="absolute cursor-pointer" style={{ top: barTop, left, width: w, height: barH }}>
                      <Bar fill="bg-ink-body" track="bg-line" progress={r.progress} />
                    </button>
                    {weeks}{baseline}{actual}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {selected && projectId && (
        <TaskDrawer task={selected === "new" ? null : (selected.task ?? null)} isLot={selected !== "new" && selected.kind === "lot"} lots={lots.map((l) => ({ id: l.id, name: l.name }))}
          tasks={rows.filter((r) => r.kind === "task" && r.task).map((r) => r.task!)} lists={lists}
          expenses={selected === "new" ? [] : expenses.filter((e) => e.task_id === selected.id || (selected.kind === "lot" && rows.some((c) => c.parentId === selected.id && c.id === e.task_id)))}
          journal={selected === "new" ? [] : journal.filter((e) => e.task_id === selected.id)} registers={selected === "new" ? [] : registers.filter((e) => e.task_id === selected.id)}
          audit={selected === "new" ? [] : audit.filter((a) => (a.table_name === "tasks" && a.record_id === selected.id) || (a.table_name === "expenses" && (a.new_data?.task_id === selected.id || a.old_data?.task_id === selected.id)))}
          people={people} currency={currency} projectId={projectId} projectCode={projectCode} canEdit={canEdit} defaults={{ start: projectStart, end: projectEnd }} spent={selected === "new" ? 0 : selected.spent} onClose={() => setSelected(null)} />
      )}
      {selMilestone && projectId && <MilestoneDrawer milestone={selMilestone === "new" ? null : (selMilestone.milestone ?? null)} projectId={projectId} defaultDate={projectEnd} onClose={() => setSelMilestone(null)} />}
    </div>
  );
}

function Bar({ fill, track, progress }: { fill: string; track: string; progress: number }) {
  // Piste claire de la couleur du type, remplie en fonce au fur et a mesure de l'avancement
  return (
    <div className={`relative h-full w-full overflow-hidden rounded-full ${track}`}>
      <div className={`absolute inset-y-0 left-0 rounded-full ${progress >= 100 ? "bg-ok" : fill}`} style={{ width: `${Math.max(0, Math.min(100, progress))}%` }} />
    </div>
  );
}

function Diamond({ m, left, top, t0, onClick, small }: { m: GanttMilestone; left: number; top: number; t0: string; onClick?: () => void; small?: boolean }) {
  const overdue = !m.reached && m.due < t0;
  const size = small ? 8 : 11;
  const cls = m.reached ? "border-ok bg-ok" : overdue ? "border-alert bg-alert" : "border-ink bg-surface";
  return <button onClick={onClick} title={`${m.name}\n${m.reached ? `atteint le ${formatDate(m.reached)}` : formatDate(m.due)}`} className={`absolute z-[5] rotate-45 cursor-pointer border ${cls}`} style={{ left: left - size / 2, top: top - size / 2, width: size, height: size }} />;
}
