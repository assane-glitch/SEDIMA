"use client";
import { useMemo, useState } from "react";
import { addDays, daysBetween, formatDate, formatMoney, today } from "@/lib/format";
import type { Profile, Task } from "@/lib/types";
import { TaskDrawer } from "./TaskDrawer";

export interface GanttRow extends Task { spent: number }

type Scale = "day" | "week" | "month";

const MS_DAY = 86_400_000;

function health(t: GanttRow, todayIso: string): "good" | "warn" | "bad" | "done" {
  if (t.status === "done" || t.progress >= 100) return "done";
  if (t.status === "blocked") return "bad";
  if (t.end_date < todayIso) return "bad";
  if (t.start_date > todayIso) return "good";
  const total = Math.max(1, daysBetween(t.start_date, t.end_date) + 1);
  const elapsed = daysBetween(t.start_date, todayIso) + 1;
  const expected = Math.round((elapsed / total) * 100);
  return t.progress + 15 < expected ? "warn" : "good";
}

const BAR: Record<ReturnType<typeof health>, string> = {
  good: "bg-brand-500",
  warn: "bg-amber-500",
  bad: "bg-red-500",
  done: "bg-emerald-500",
};
const TRACK: Record<ReturnType<typeof health>, string> = {
  good: "bg-brand-500/30",
  warn: "bg-amber-500/30",
  bad: "bg-red-500/30",
  done: "bg-emerald-500/30",
};

export function Gantt({ tasks, people, currency, canEdit, projectId, projectStart, projectEnd }: {
  tasks: GanttRow[]; people: Profile[]; currency: string; canEdit: boolean; projectId: string; projectStart: string; projectEnd: string;
}) {
  const todayIso = today();
  const [selected, setSelected] = useState<GanttRow | null | "new">(null);
  const peopleMap = useMemo(() => new Map(people.map((p) => [p.id, p])), [people]);

  const rangeStart = useMemo(() => {
    const min = tasks.reduce((m, t) => (t.start_date < m ? t.start_date : m), projectStart);
    return addDays(min, -3);
  }, [tasks, projectStart]);
  const rangeEnd = useMemo(() => {
    const max = tasks.reduce((m, t) => (t.end_date > m ? t.end_date : m), projectEnd);
    return addDays(max < todayIso ? todayIso : max, 7);
  }, [tasks, projectEnd, todayIso]);
  const totalDays = Math.max(14, daysBetween(rangeStart, rangeEnd) + 1);
  const scale: Scale = totalDays <= 60 ? "day" : totalDays <= 400 ? "week" : "month";
  const pxPerDay = scale === "day" ? 28 : scale === "week" ? 8 : 3;
  const width = totalDays * pxPerDay;

  const ticks = useMemo(() => {
    const out: { left: number; label: string; width: number }[] = [];
    const start = new Date(rangeStart + "T00:00:00Z");
    const end = new Date(rangeEnd + "T00:00:00Z");
    if (scale === "day") {
      for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
        const off = Math.round((d.getTime() - start.getTime()) / MS_DAY);
        out.push({ left: off * pxPerDay, width: pxPerDay, label: String(d.getUTCDate()) });
      }
    } else if (scale === "week") {
      const d = new Date(start);
      d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
      for (; d <= end; d.setUTCDate(d.getUTCDate() + 7)) {
        const off = Math.round((d.getTime() - start.getTime()) / MS_DAY);
        out.push({ left: off * pxPerDay, width: 7 * pxPerDay, label: `${d.getUTCDate()}/${d.getUTCMonth() + 1}` });
      }
    } else {
      const d = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1));
      for (; d <= end; d.setUTCMonth(d.getUTCMonth() + 1)) {
        const off = Math.round((d.getTime() - start.getTime()) / MS_DAY);
        const next = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1));
        const days = Math.round((next.getTime() - d.getTime()) / MS_DAY);
        out.push({ left: off * pxPerDay, width: days * pxPerDay, label: d.toLocaleDateString("fr-FR", { month: "short", year: "2-digit", timeZone: "UTC" }) });
      }
    }
    return out;
  }, [rangeStart, rangeEnd, scale, pxPerDay]);

  const months = useMemo(() => {
    if (scale === "month") return [];
    const out: { left: number; label: string; width: number }[] = [];
    const start = new Date(rangeStart + "T00:00:00Z");
    const end = new Date(rangeEnd + "T00:00:00Z");
    const d = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1));
    for (; d <= end; d.setUTCMonth(d.getUTCMonth() + 1)) {
      const off = Math.max(0, Math.round((d.getTime() - start.getTime()) / MS_DAY));
      const next = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1));
      const endOff = Math.min(totalDays, Math.round((next.getTime() - start.getTime()) / MS_DAY));
      out.push({ left: off * pxPerDay, width: (endOff - off) * pxPerDay, label: d.toLocaleDateString("fr-FR", { month: "long", year: "numeric", timeZone: "UTC" }) });
    }
    return out;
  }, [rangeStart, rangeEnd, scale, pxPerDay, totalDays]);

  const todayLeft = daysBetween(rangeStart, todayIso) * pxPerDay + pxPerDay / 2;
  const rowH = 44;

  return (
    <div className="card overflow-hidden">
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-2 text-xs text-slate-500">
        <div className="flex flex-wrap gap-3">
          <Legend color="bg-brand-500" label="Dans les temps" />
          <Legend color="bg-amber-500" label="En retard sur l'avancement" />
          <Legend color="bg-red-500" label="Echeance depassee / bloque" />
          <Legend color="bg-emerald-500" label="Termine" />
        </div>
        {canEdit && <button onClick={() => setSelected("new")} className="btn-primary !py-1 !text-xs">Ajouter une tache</button>}
      </div>
      <div className="flex overflow-x-auto">
        {/* Colonnes fixes */}
        <div className="sticky left-0 z-10 shrink-0 border-r border-slate-200 bg-white shadow-[4px_0_8px_-6px_rgba(0,0,0,0.2)]">
          <div className="grid h-[52px] grid-cols-[minmax(180px,260px)_120px_70px_110px_110px] items-end border-b border-slate-200 bg-slate-50 px-3 pb-2 text-[11px] font-medium uppercase tracking-wide text-slate-500">
            <div>Tache</div><div>Responsable</div><div className="text-right">Avanc.</div><div className="text-right">Budget</div><div className="text-right">Depense</div>
          </div>
          {tasks.map((t) => {
            const r = t.responsible_id ? peopleMap.get(t.responsible_id) : undefined;
            const over = t.budget > 0 && t.spent > t.budget;
            return (
              <button key={t.id} onClick={() => setSelected(t)} style={{ height: rowH }}
                className="grid w-full grid-cols-[minmax(180px,260px)_120px_70px_110px_110px] items-center border-b border-slate-100 px-3 text-left text-sm hover:bg-slate-50">
                <div className="truncate pr-2 font-medium">{t.name}</div>
                <div className="truncate pr-2 text-xs text-slate-600">{r ? (r.full_name || r.email) : "—"}</div>
                <div className="text-right text-xs tabular-nums">{t.progress} %</div>
                <div className="text-right text-xs tabular-nums text-slate-600">{t.budget ? formatMoney(t.budget, currency) : "—"}</div>
                <div className={`text-right text-xs tabular-nums ${over ? "font-semibold text-red-700" : "text-slate-600"}`}>{t.spent ? formatMoney(t.spent, currency) : "—"}</div>
              </button>
            );
          })}
          {tasks.length === 0 && <div className="px-3 py-8 text-sm text-slate-500">Aucune tache. {canEdit ? "Ajoutez la premiere tache pour construire le planning." : ""}</div>}
        </div>
        {/* Timeline */}
        <div className="relative" style={{ width, minHeight: 52 + Math.max(1, tasks.length) * rowH }}>
          <div className="sticky top-0 h-[52px] border-b border-slate-200 bg-slate-50">
            {months.map((m, i) => (
              <div key={i} className="absolute top-0 h-6 overflow-hidden whitespace-nowrap border-r border-slate-200 px-2 text-[11px] font-medium capitalize text-slate-600" style={{ left: m.left, width: m.width }}>{m.label}</div>
            ))}
            {ticks.map((t, i) => (
              <div key={i} className={`absolute bottom-0 h-6 border-r border-slate-200 text-center text-[10px] leading-6 text-slate-500 ${scale === "month" ? "capitalize" : ""}`} style={{ left: t.left, width: t.width }}>{t.label}</div>
            ))}
          </div>
          {/* Grille verticale */}
          {ticks.map((t, i) => (
            <div key={i} className="absolute bottom-0 top-[52px] border-r border-slate-100" style={{ left: t.left + t.width - 1 }} />
          ))}
          {/* Ligne aujourd'hui */}
          {todayLeft >= 0 && todayLeft <= width && (
            <div className="absolute bottom-0 top-[52px] z-[5] w-px bg-red-500" style={{ left: todayLeft }}>
              <div className="absolute -left-[22px] -top-4 rounded bg-red-500 px-1 text-[9px] font-medium text-white">Auj.</div>
            </div>
          )}
          {tasks.map((t, i) => {
            const left = daysBetween(rangeStart, t.start_date) * pxPerDay;
            const w = Math.max(pxPerDay, (daysBetween(t.start_date, t.end_date) + 1) * pxPerDay);
            const h = health(t, todayIso);
            return (
              <div key={t.id} className="absolute left-0 right-0 border-b border-slate-100" style={{ top: 52 + i * rowH, height: rowH }}>
                <button onClick={() => setSelected(t)} title={`${t.name}\n${formatDate(t.start_date)} → ${formatDate(t.end_date)}\n${t.progress} %`}
                  className={`absolute top-[11px] h-[22px] overflow-hidden rounded ${TRACK[h]} text-left`} style={{ left, width: w }}>
                  <div className={`h-full ${BAR[h]}`} style={{ width: `${t.progress}%` }} />
                  <span className="absolute inset-y-0 left-1.5 flex items-center truncate text-[11px] font-medium text-white mix-blend-difference" style={{ maxWidth: w - 8 }}>{w > 60 ? t.name : ""}</span>
                </button>
              </div>
            );
          })}
        </div>
      </div>
      {selected && (
        <TaskDrawer
          task={selected === "new" ? null : selected}
          people={people}
          currency={currency}
          projectId={projectId}
          canEdit={canEdit}
          defaults={{ start: projectStart, end: projectEnd }}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return <span className="inline-flex items-center gap-1.5"><span className={`h-2.5 w-2.5 rounded-sm ${color}`} />{label}</span>;
}
