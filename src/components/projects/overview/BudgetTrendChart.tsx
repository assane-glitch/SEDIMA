"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { formatDate, formatMoney, shortMoney, weekLabel } from "@/lib/format";

export interface TrendPoint { date: string; planned: number; spent: number }
const SERIES = [
  { key: "planned" as const, label: "Budget prevu (cumul)", color: "var(--color-chart-1)" },
  { key: "spent" as const, label: "Depense (cumul)", color: "var(--color-chart-2)" },
];
const H = 220, PAD = { top: 12, right: 12, bottom: 26, left: 44 };

/**
 * Courbe hebdomadaire du budget prevu cumule (budgets des taches lisses sur leur duree) et des depenses cumulees,
 * avec la ligne du budget approuve, le repere d'aujourd'hui et une infobulle au survol.
 */
export function BudgetTrendChart({ points, budget, today, currency }: { points: TrendPoint[]; budget: number; today: string; currency: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(600);
  const [hover, setHover] = useState<number | null>(null);
  const [on, setOn] = useState<Record<"planned" | "spent", boolean>>({ planned: true, spent: true });
  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver((e) => setW(Math.max(320, Math.floor(e[0].contentRect.width))));
    ro.observe(ref.current); return () => ro.disconnect();
  }, []);
  const iw = w - PAD.left - PAD.right, ih = H - PAD.top - PAD.bottom;
  const max = useMemo(() => Math.max(budget, ...points.map((p) => Math.max(p.planned, p.spent)), 1) * 1.05, [points, budget]);
  const x = (i: number) => PAD.left + (points.length > 1 ? (i / (points.length - 1)) * iw : iw / 2);
  const y = (v: number) => PAD.top + ih - (v / max) * ih;
  const path = (key: "planned" | "spent") => points.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p[key]).toFixed(1)}`).join(" ");
  const area = (key: "planned" | "spent") => points.length ? `${path(key)} L${x(points.length - 1).toFixed(1)},${y(0)} L${x(0).toFixed(1)},${y(0)} Z` : "";
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((f) => f * max);
  const todayIdx = points.findIndex((p) => p.date > today);
  const todayX = todayIdx === -1 ? null : x(Math.max(0, todayIdx - 1) + (todayIdx > 0 ? 0 : 0));
  const monthTicks = points.map((p, i) => ({ i, p })).filter(({ p }, k, arr) => k === 0 || p.date.slice(0, 7) !== arr[k - 1].p.date.slice(0, 7)).filter((_, k, arr) => arr.length <= 14 || k % 2 === 0);
  const move = (e: React.MouseEvent) => {
    const rect = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
    const px = e.clientX - rect.left;
    if (!points.length) return;
    const i = Math.round(((px - PAD.left) / iw) * (points.length - 1));
    setHover(Math.min(points.length - 1, Math.max(0, i)));
  };
  const hp = hover !== null ? points[hover] : null;
  if (points.length === 0) return <p className="text-[10.5px] text-ink-muted">Aucune tache datee.</p>;
  return (
    <div ref={ref} className="relative w-full overflow-hidden">
      <svg width={w} height={H} onMouseMove={move} onMouseLeave={() => setHover(null)} className="block select-none" role="img" aria-label="Budget prevu cumule et depenses cumulees par semaine">
        {yTicks.map((v) => <g key={v}><line x1={PAD.left} x2={w - PAD.right} y1={y(v)} y2={y(v)} stroke="var(--color-line-light)" /><text x={PAD.left - 6} y={y(v) + 3} textAnchor="end" fontSize="9" fill="var(--color-ink-faint)">{v >= 1e9 ? `${(v / 1e9).toFixed(1)} Md` : v >= 1e6 ? `${Math.round(v / 1e6)} M` : `${Math.round(v / 1e3)} k`}</text></g>)}
        {monthTicks.map(({ i, p }) => <text key={p.date} x={x(i)} y={H - 8} textAnchor="middle" fontSize="9" fill="var(--color-ink-faint)">{new Date(p.date + "T00:00:00Z").toLocaleDateString("fr-FR", { month: "short", year: monthTicks.length > 8 ? undefined : "2-digit", timeZone: "UTC" })}</text>)}
        {budget > 0 && <g><line x1={PAD.left} x2={w - PAD.right} y1={y(budget)} y2={y(budget)} stroke="var(--color-ink-faint)" strokeDasharray="3 3" /><text x={w - PAD.right} y={y(budget) - 4} textAnchor="end" fontSize="9" fill="var(--color-ink-muted)">Budget approuve · {shortMoney(budget)}</text></g>}
        {on.spent && <path d={area("spent")} fill="var(--color-chart-2)" opacity="0.08" />}
        {SERIES.filter((s) => on[s.key]).map((s) => <path key={s.key} d={path(s.key)} fill="none" stroke={s.color} strokeWidth="2" strokeLinejoin="round" />)}
        {todayX !== null && <g><line x1={todayX} x2={todayX} y1={PAD.top} y2={PAD.top + ih} stroke="var(--color-ink-faint)" strokeDasharray="2 3" /><text x={todayX + 3} y={PAD.top + 9} fontSize="9" fill="var(--color-ink-muted)">Auj.</text></g>}
        {hp && <g>
          <line x1={x(hover!)} x2={x(hover!)} y1={PAD.top} y2={PAD.top + ih} stroke="var(--color-ink-ghost)" />
          {SERIES.filter((s) => on[s.key]).map((s) => <circle key={s.key} cx={x(hover!)} cy={y(hp[s.key])} r="4" fill={s.color} stroke="var(--color-surface)" strokeWidth="2" />)}
        </g>}
      </svg>
      {hp && (
        <div className="pointer-events-none absolute top-2 z-10 rounded-md border border-line-hair bg-surface px-2.5 py-2 text-[10px]" style={{ left: Math.min(w - 190, Math.max(0, x(hover!) + 10)) }}>
          <div className="mb-1 font-semibold text-ink">{weekLabel(hp.date, "year")} · {formatDate(hp.date)}</div>
          {SERIES.filter((s) => on[s.key]).map((s) => <div key={s.key} className="flex items-center justify-between gap-4"><span className="flex items-center gap-1.5 text-ink-muted"><span className="h-2 w-2 rounded-[2px]" style={{ background: s.color }} />{s.label}</span><span className="tabular-nums text-ink">{formatMoney(hp[s.key], currency)}</span></div>)}
        </div>
      )}
      <div className="mt-2 flex flex-wrap items-center gap-3 text-[10px]">
        {SERIES.map((s) => (
          <label key={s.key} className="flex cursor-pointer items-center gap-1.5 text-ink-body">
            <input type="checkbox" checked={on[s.key]} onChange={() => setOn((o) => ({ ...o, [s.key]: !o[s.key] }))} className="sr-only" />
            <span className={`flex h-3 w-3 items-center justify-center rounded-[3px] border ${on[s.key] ? "border-transparent" : "border-line"}`} style={{ background: on[s.key] ? s.color : "transparent" }}>{on[s.key] && <svg viewBox="0 0 10 10" className="h-2 w-2"><path d="M2 5l2 2 4-4" fill="none" stroke="#fff" strokeWidth="1.6" /></svg>}</span>
            {s.label}
          </label>
        ))}
        {budget > 0 && <span className="ml-auto flex items-center gap-1.5 text-ink-faint"><span className="inline-block h-px w-4 border-t border-dashed border-ink-faint" />Budget approuve</span>}
      </div>
    </div>
  );
}
