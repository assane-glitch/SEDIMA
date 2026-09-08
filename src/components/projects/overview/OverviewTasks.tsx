"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { ProgressBar } from "@/components/ui";
import { formatDate } from "@/lib/format";
import type { Task } from "@/lib/types";

export interface OverviewTask { task: Task; lot: string; responsible: string }
type Filter = "all" | "late" | "in_progress" | "upcoming" | "done";
const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "Toutes" }, { key: "late", label: "En retard" }, { key: "in_progress", label: "En cours" }, { key: "upcoming", label: "A venir" }, { key: "done", label: "Terminees" },
];
const PAGE = 10;

/** Tableau compact des taches feuilles : filtres par etat, recherche, tri par echeance, pagination. */
export function OverviewTasks({ items, today, projectId }: { items: OverviewTask[]; today: string; projectId: string }) {
  const [filter, setFilter] = useState<Filter>("late");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const isLate = (t: Task) => t.status !== "done" && t.end_date < today;
  const counts = useMemo(() => ({
    all: items.length,
    late: items.filter((i) => isLate(i.task)).length,
    in_progress: items.filter((i) => i.task.status === "in_progress" && !isLate(i.task)).length,
    upcoming: items.filter((i) => i.task.status === "todo" && !isLate(i.task)).length,
    done: items.filter((i) => i.task.status === "done").length,
  }), [items, today]); // eslint-disable-line react-hooks/exhaustive-deps
  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return items.filter(({ task: t, lot, responsible }) => {
      if (filter === "late" && !isLate(t)) return false;
      if (filter === "in_progress" && !(t.status === "in_progress" && !isLate(t))) return false;
      if (filter === "upcoming" && !(t.status === "todo" && !isLate(t))) return false;
      if (filter === "done" && t.status !== "done") return false;
      if (needle && !`${t.wbs_code ?? ""} ${t.name} ${lot} ${responsible}`.toLowerCase().includes(needle)) return false;
      return true;
    }).sort((a, b) => a.task.end_date.localeCompare(b.task.end_date) || (a.task.wbs_code ?? "").localeCompare(b.task.wbs_code ?? "", "fr", { numeric: true }));
  }, [items, filter, q, today]); // eslint-disable-line react-hooks/exhaustive-deps
  const pages = Math.max(1, Math.ceil(rows.length / PAGE));
  const cur = Math.min(page, pages);
  const shown = rows.slice((cur - 1) * PAGE, cur * PAGE);
  const effective = counts[filter] === 0 && filter === "late" && items.length > 0 ? "all" : filter;
  return (
    <>
      <div className="mb-2 flex flex-wrap items-center gap-1.5">
        {FILTERS.map((f) => <button key={f.key} type="button" onClick={() => { setFilter(f.key); setPage(1); }} className={`filter-chip !rounded-md ${filter === f.key ? "filter-chip-active" : ""}`}>{f.label}{counts[f.key] > 0 && <span className={`tabular-nums ${filter === f.key ? "text-surface/70" : "text-ink-faint"}`}>{counts[f.key]}</span>}</button>)}
        <input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="Rechercher…" className="input ml-auto !w-40 !py-1" />
      </div>
      <div className="overflow-x-auto">
        <table className="tbl">
          <thead><tr><th>Tache</th><th className="w-20">Fin</th><th className="hidden w-28 md:table-cell">Responsable</th><th className="w-28">Avancement</th></tr></thead>
          <tbody>
            {shown.map(({ task: t, lot, responsible }) => {
              const late = isLate(t);
              return (
                <tr key={t.id}>
                  <td className="max-w-[260px]"><div className="flex items-center gap-1.5"><span className={`dot ${t.status === "done" ? "bg-ok" : late ? "bg-alert" : t.status === "in_progress" ? "bg-chart-1" : "bg-neutral-dot"}`} /><span className="truncate font-semibold text-ink">{t.name}</span></div>{lot && <div className="truncate pl-3.5 text-[9.5px] text-ink-faint">{t.wbs_code ? `${t.wbs_code} · ` : ""}{lot}</div>}</td>
                  <td className="whitespace-nowrap tabular-nums text-ink-muted">{formatDate(t.end_date)}</td>
                  <td className="hidden max-w-[110px] truncate text-ink-muted md:table-cell">{responsible || "—"}</td>
                  <td><div className="flex items-center gap-2"><div className="w-14"><ProgressBar value={t.progress} /></div><span className="w-8 text-right tabular-nums text-ink-muted">{t.progress} %</span></div></td>
                </tr>
              );
            })}
            {shown.length === 0 && <tr><td colSpan={4} className="!py-6 text-center text-ink-faint">{effective === "all" ? "Aucune tache." : "Aucune tache dans cet etat."}</td></tr>}
          </tbody>
        </table>
      </div>
      <div className="mt-2 flex items-center justify-between text-[10px] text-ink-muted">
        <Link href={`/projects/${projectId}/tasks`} className="hover:text-ink hover:underline">Toutes les taches</Link>
        <div className="flex items-center gap-1.5">
          <button type="button" disabled={cur <= 1} onClick={() => setPage(cur - 1)} className="btn-secondary !px-2 !py-[2px] disabled:opacity-40" aria-label="Page precedente">‹</button>
          <span className="tabular-nums"><span className="rounded-md border border-line px-1.5 py-[1px] text-ink">{cur}</span> / {pages}</span>
          <button type="button" disabled={cur >= pages} onClick={() => setPage(cur + 1)} className="btn-secondary !px-2 !py-[2px] disabled:opacity-40" aria-label="Page suivante">›</button>
        </div>
      </div>
    </>
  );
}
