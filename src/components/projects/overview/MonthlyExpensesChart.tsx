"use client";
import { useEffect, useRef, useState } from "react";
import { formatMoney } from "@/lib/format";

export interface MonthPoint { month: string; amount: number }
const H = 150, PAD = { top: 10, right: 6, bottom: 22, left: 6 };

/** Depenses par mois (barres fines, infobulle au survol) ; le mois courant est marque. */
export function MonthlyExpensesChart({ months, currency, currentMonth }: { months: MonthPoint[]; currency: string; currentMonth: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(320);
  const [hover, setHover] = useState<number | null>(null);
  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver((e) => setW(Math.max(200, Math.floor(e[0].contentRect.width))));
    ro.observe(ref.current); return () => ro.disconnect();
  }, []);
  if (months.length === 0) return <p className="text-[10.5px] text-ink-muted">Aucune depense enregistree.</p>;
  const iw = w - PAD.left - PAD.right, ih = H - PAD.top - PAD.bottom;
  const max = Math.max(1, ...months.map((m) => m.amount));
  const slot = iw / months.length, bw = Math.max(3, Math.min(14, slot - 2));
  const label = (m: string) => new Date(m + "-01T00:00:00Z").toLocaleDateString("fr-FR", { month: "short", timeZone: "UTC" }).replace(".", "");
  const every = Math.ceil(months.length / 12);
  const hp = hover !== null ? months[hover] : null;
  return (
    <div ref={ref} className="relative w-full overflow-hidden">
      <svg width={w} height={H} className="block select-none" role="img" aria-label="Depenses par mois" onMouseLeave={() => setHover(null)}>
        <line x1={PAD.left} x2={w - PAD.right} y1={PAD.top + ih} y2={PAD.top + ih} stroke="var(--color-line-light)" />
        {months.map((m, i) => {
          const h = (m.amount / max) * ih, cx = PAD.left + slot * i + slot / 2;
          const cur = m.month === currentMonth;
          return (
            <g key={m.month} onMouseEnter={() => setHover(i)}>
              <rect x={PAD.left + slot * i} y={PAD.top} width={slot} height={ih} fill="transparent" />
              <rect x={cx - bw / 2} y={PAD.top + ih - h} width={bw} height={h} rx="2" fill={cur ? "var(--color-chart-1)" : "var(--color-chart-2)"} opacity={hover === null || hover === i ? 1 : 0.45} />
              {(i % every === 0) && <text x={cx} y={H - 7} textAnchor="middle" fontSize="9" fill="var(--color-ink-faint)">{label(m.month)}{m.month.endsWith("-01") ? ` ${m.month.slice(2, 4)}` : ""}</text>}
            </g>
          );
        })}
      </svg>
      {hp && (
        <div className="pointer-events-none absolute top-0 z-10 rounded-md border border-line-hair bg-surface px-2.5 py-1.5 text-[10px]" style={{ left: Math.min(w - 150, Math.max(0, PAD.left + slot * hover! + slot / 2 + 8)) }}>
          <div className="font-semibold text-ink">{new Date(hp.month + "-01T00:00:00Z").toLocaleDateString("fr-FR", { month: "long", year: "numeric", timeZone: "UTC" })}</div>
          <div className="tabular-nums text-ink-body">{formatMoney(hp.amount, currency)}</div>
        </div>
      )}
    </div>
  );
}
