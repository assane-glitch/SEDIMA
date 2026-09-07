"use client";
import { formatDate } from "@/lib/format";
import type { GanttMilestone } from "./Gantt";

export function Bar({ fill, track, progress }: { fill: string; track: string; progress: number }) {
  // Piste claire de la couleur du type, remplie en fonce au fur et a mesure de l'avancement
  return (
    <div className={`relative h-full w-full overflow-hidden rounded-full ${track}`}>
      <div className={`absolute inset-y-0 left-0 rounded-full ${progress >= 100 ? "bg-ok" : fill}`} style={{ width: `${Math.max(0, Math.min(100, progress))}%` }} />
    </div>
  );
}

export function Diamond({ m, left, top, t0, onClick, small }: { m: GanttMilestone; left: number; top: number; t0: string; onClick?: () => void; small?: boolean }) {
  const overdue = !m.reached && m.due < t0;
  const size = small ? 8 : 11;
  const cls = m.reached ? "border-ok bg-ok" : overdue ? "border-alert bg-alert" : "border-ink bg-surface";
  return <button onClick={onClick} title={`${m.name}\n${m.reached ? `atteint le ${formatDate(m.reached)}` : formatDate(m.due)}`} className={`absolute z-[5] rotate-45 cursor-pointer border ${cls}`} style={{ left: left - size / 2, top: top - size / 2, width: size, height: size }} />;
}
