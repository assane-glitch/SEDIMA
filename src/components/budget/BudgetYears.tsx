"use client";
import { useState } from "react";
import { saveBudgetYears } from "@/app/(app)/projects/actions";
import { SubmitButton } from "@/components/ui/SubmitButton";

const fmt = (v: number) => new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(Math.round(v));

/** Repartition du budget par annee (tranches), modifiable par les editeurs. */
export function BudgetYears({ projectId, years, budget, currency, canEdit }: { projectId: string; years: { year: number; amount: number }[]; budget: number; currency: string; canEdit: boolean }) {
  const now = new Date().getFullYear();
  const known = years.map((y) => y.year);
  const span = Array.from({ length: Math.max(...known, now + 2) - Math.min(...known, now) + 1 }, (_, i) => Math.min(...known, now) + i);
  const [vals, setVals] = useState<Record<number, string>>(Object.fromEntries(span.map((y) => [y, String(Math.round(years.find((x) => x.year === y)?.amount ?? 0))])));
  const total = span.reduce((s, y) => s + (Number(vals[y]) || 0), 0);
  const gap = total - budget;
  return (
    <form action={saveBudgetYears} className="card card-pad">
      <input type="hidden" name="project_id" value={projectId} />
      <div className="mb-2 flex items-center justify-between"><div className="card-title">Tranches annuelles</div><span className="text-[10px] text-ink-faint">{currency}</span></div>
      <table className="w-full text-[10.5px]">
        <tbody>
          {span.map((y) => {
            const v = Number(vals[y]) || 0;
            return (
              <tr key={y} className="border-b border-line-light">
                <td className="py-1 font-semibold">{y}</td>
                <td className="py-1 text-right">
                  {canEdit ? <input name={`year_${y}`} inputMode="numeric" value={vals[y]} onChange={(e) => setVals((s) => ({ ...s, [y]: e.target.value.replace(/[^\d]/g, "") }))} className="input !w-36 text-right tabular-nums" />
                    : <span className="tabular-nums">{fmt(v)}</span>}
                </td>
                <td className="w-12 py-1 text-right text-ink-faint tabular-nums">{budget > 0 ? `${Math.round((v / budget) * 100)} %` : ""}</td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="font-bold"><td className="pt-2">Total</td><td className="pt-2 text-right tabular-nums">{fmt(total)}</td><td className="pt-2 text-right tabular-nums text-ink-faint">{budget > 0 ? `${Math.round((total / budget) * 100)} %` : ""}</td></tr>
        </tfoot>
      </table>
      <div className={`hint mt-1 ${Math.abs(gap) > 0.005 * Math.max(budget, 1) ? "text-warn" : ""}`}>{gap === 0 ? "Tranches egales au budget du projet." : `${gap > 0 ? "Depasse" : "Sous"} le budget du projet de ${fmt(Math.abs(gap))} ${currency}.`}</div>
      {canEdit && <div className="mt-3 flex justify-end"><SubmitButton className="btn-primary">Enregistrer les tranches</SubmitButton></div>}
    </form>
  );
}
