"use client";
import { useMemo, useState } from "react";
import type { Task } from "@/lib/types";

const k = (v: number) => (v ? `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(Math.round(v / 1000))}` : "—");
const full = (v: number, cur: string) => `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(Math.round(v))} ${cur}`;

type Row = { id: string; kind: "lot" | "task"; parentId: string | null; code: string | null; name: string; budget: number; customs: number; vat: number; spent: number; progress: number };

/** Budget par lot et par tache : HTVA, douanes, TVA, TTC, engage, reste, avancement et consommation. */
export function BudgetTable({ tasks, spentByTask, currency }: { tasks: Task[]; spentByTask: Record<string, number>; currency: string }) {
  const rows = useMemo<Row[]>(() => {
    const byParent = new Map<string | null, Task[]>();
    for (const t of tasks) { const key = t.parent_id ?? null; byParent.set(key, [...(byParent.get(key) ?? []), t]); }
    const sortT = (a: Task, b: Task) => a.sort_order - b.sort_order || a.start_date.localeCompare(b.start_date);
    const leaf = (t: Task, parentId: string | null): Row => ({ id: t.id, kind: "task", parentId, code: t.wbs_code, name: t.name, budget: Number(t.budget), customs: Number(t.customs ?? 0), vat: Number(t.vat ?? 0), spent: spentByTask[t.id] ?? 0, progress: t.progress });
    const out: Row[] = [];
    for (const top of (byParent.get(null) ?? []).sort(sortT)) {
      const children = (byParent.get(top.id) ?? []).sort(sortT);
      if (!children.length) { out.push(leaf(top, null)); continue; }
      const c = children.map((x) => leaf(x, top.id));
      const budget = c.reduce((s, x) => s + x.budget, 0);
      out.push({ id: top.id, kind: "lot", parentId: null, code: top.wbs_code, name: top.name, budget, customs: c.reduce((s, x) => s + x.customs, 0), vat: c.reduce((s, x) => s + x.vat, 0), spent: c.reduce((s, x) => s + x.spent, 0), progress: budget > 0 ? Math.round(c.reduce((s, x) => s + x.progress * x.budget, 0) / budget) : Math.round(c.reduce((s, x) => s + x.progress, 0) / c.length) });
      out.push(...c);
    }
    return out;
  }, [tasks, spentByTask]);
  const lots = rows.filter((r) => r.kind === "lot");
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const toggle = (id: string) => setCollapsed((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const visible = rows.filter((r) => !r.parentId || !collapsed.has(r.parentId));
  const tot = rows.filter((r) => r.kind === "lot" || !r.parentId).reduce((s, r) => ({ budget: s.budget + r.budget, customs: s.customs + r.customs, vat: s.vat + r.vat, spent: s.spent + r.spent }), { budget: 0, customs: 0, vat: 0, spent: 0 });
  const pctOf = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 100) : 0);

  return (
    <div className="card overflow-x-auto">
      <div className="flex items-center justify-between px-[15px] pt-[13px] pb-2">
        <div className="card-title">Budget par lot et par tache <span className="text-[10px] font-normal text-ink-faint">montants en k {currency}</span></div>
        {lots.length > 0 && <button onClick={() => setCollapsed(collapsed.size === lots.length ? new Set() : new Set(lots.map((l) => l.id)))} className="btn-secondary !py-[2px]">{collapsed.size === lots.length ? "+ Tout deplier" : "− Tout replier"}</button>}
      </div>
      <table className="tbl">
        <thead>
          <tr>
            <th className="w-14">WBS</th><th>Lot / tache</th>
            <th className="num">Budget HTVA</th><th className="num hidden lg:table-cell">Douanes</th><th className="num hidden lg:table-cell">TVA</th><th className="num hidden md:table-cell">TTC</th>
            <th className="num">Engage</th><th className="num">Reste</th><th className="num hidden md:table-cell">Avanc.</th><th className="num">Consomme</th><th className="w-24 hidden md:table-cell">Ecart</th>
          </tr>
        </thead>
        <tbody>
          {visible.map((r) => {
            const isLot = r.kind === "lot", ttc = r.budget + r.customs + r.vat, rest = r.budget - r.spent, cons = pctOf(r.spent, r.budget), gap = cons - r.progress;
            const tone = r.budget === 0 ? "text-ink-faint" : gap > 15 ? "text-alert" : gap > 5 ? "text-warn" : "text-ok";
            return (
              <tr key={r.id} className={isLot ? "font-bold" : ""}>
                <td className={`font-mono text-[9.5px] ${isLot ? "text-ink" : "text-ink-faint"}`}>{r.code ?? ""}</td>
                <td className={r.parentId ? "pl-6" : ""}>
                  <span className="flex items-center gap-1.5">
                    {isLot && <button onClick={() => toggle(r.id)} className="flex h-[13px] w-[13px] shrink-0 cursor-pointer items-center justify-center rounded-xs border border-line text-[10px] font-bold leading-none text-ink-muted hover:bg-surface-sub">{collapsed.has(r.id) ? "+" : "−"}</button>}
                    <span className="truncate">{r.name}</span>
                  </span>
                </td>
                <td className="num" title={full(r.budget, currency)}>{k(r.budget)}</td>
                <td className="num hidden text-ink-muted lg:table-cell">{k(r.customs)}</td>
                <td className="num hidden text-ink-muted lg:table-cell">{k(r.vat)}</td>
                <td className="num hidden md:table-cell" title={full(ttc, currency)}>{k(ttc)}</td>
                <td className="num" title={full(r.spent, currency)}>{k(r.spent)}</td>
                <td className={`num ${rest < 0 ? "font-bold text-alert" : ""}`} title={full(rest, currency)}>{r.budget || r.spent ? k(rest) : "—"}</td>
                <td className="num hidden md:table-cell">{r.progress} %</td>
                <td className={`num ${cons > 100 ? "font-bold text-alert" : ""}`}>{r.budget ? `${cons} %` : "—"}</td>
                <td className="hidden md:table-cell">{r.budget > 0 && <span className={`text-[10px] font-semibold ${tone}`} title="Consomme moins avancement : positif = depense en avance sur l'avancement">{gap > 0 ? "+" : ""}{gap} pt</span>}</td>
              </tr>
            );
          })}
          {rows.length === 0 && <tr><td colSpan={11} className="!py-6 text-center text-ink-faint">Aucune tache budgetee.</td></tr>}
        </tbody>
        {rows.length > 0 && (
          <tfoot>
            <tr className="font-bold">
              <td /><td className="!border-t !border-line px-2 py-[6px]">Total</td>
              <td className="num !border-t !border-line" title={full(tot.budget, currency)}>{k(tot.budget)}</td>
              <td className="num hidden !border-t !border-line lg:table-cell">{k(tot.customs)}</td><td className="num hidden !border-t !border-line lg:table-cell">{k(tot.vat)}</td>
              <td className="num hidden !border-t !border-line md:table-cell">{k(tot.budget + tot.customs + tot.vat)}</td>
              <td className="num !border-t !border-line">{k(tot.spent)}</td>
              <td className={`num !border-t !border-line ${tot.budget - tot.spent < 0 ? "text-alert" : ""}`}>{k(tot.budget - tot.spent)}</td>
              <td className="hidden !border-t !border-line md:table-cell" /><td className="num !border-t !border-line">{tot.budget ? `${pctOf(tot.spent, tot.budget)} %` : "—"}</td><td className="hidden !border-t !border-line md:table-cell" />
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
}
