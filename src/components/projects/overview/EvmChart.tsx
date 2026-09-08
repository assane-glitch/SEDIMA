"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import type { EvmPoint } from "@/lib/evm";
import { formatDate, formatMoney, shortMoney, weekLabel } from "@/lib/format";

type Key = "pv" | "ev" | "ac";
const SERIES: { key: Key; label: string; color: string }[] = [
  { key: "pv", label: "Valeur planifiee (PV)", color: "var(--color-chart-1)" },
  { key: "ev", label: "Valeur acquise (EV)", color: "var(--color-chart-2)" },
  { key: "ac", label: "Cout reel (AC)", color: "var(--color-ink)" },
];
const H = 240, PAD = { top: 14, right: 14, bottom: 26, left: 46 };
const short = (v: number) => (v >= 1e9 ? `${(v / 1e9).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} Md` : v >= 1e6 ? `${Math.round(v / 1e6)} M` : `${Math.round(v / 1e3)} k`);

/**
 * Courbe en S de la valeur acquise : PV sur toute la duree, EV et AC jusqu'a aujourd'hui, ligne du BAC,
 * projection EAC en pointille jusqu'a la fin previsionnelle, infobulle par semaine.
 */
export function EvmChart({ points, bac, envelope, eac, forecastEnd, today, currency }: { points: EvmPoint[]; bac: number; envelope: number; eac: number; forecastEnd: string; today: string; currency: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(600);
  const [hover, setHover] = useState<number | null>(null);
  const [on, setOn] = useState<Record<Key, boolean>>({ pv: true, ev: true, ac: true });
  useEffect(() => { if (!ref.current) return; const ro = new ResizeObserver((e) => setW(Math.max(320, Math.floor(e[0].contentRect.width)))); ro.observe(ref.current); return () => ro.disconnect(); }, []);
  const iw = w - PAD.left - PAD.right, ih = H - PAD.top - PAD.bottom;
  const dates = points.map((p) => p.date);
  const d0 = dates[0], d1 = dates[dates.length - 1];
  const span = Math.max(1, (new Date(d1 + "T00:00:00Z").getTime() - new Date(d0 + "T00:00:00Z").getTime()) / 86_400_000);
  const xd = (d: string) => PAD.left + ((new Date(d + "T00:00:00Z").getTime() - new Date(d0 + "T00:00:00Z").getTime()) / 86_400_000 / span) * iw;
  const max = useMemo(() => Math.max(bac, envelope, eac, ...points.flatMap((p) => [p.pv, p.ev ?? 0, p.ac ?? 0]), 1) * 1.06, [points, bac, envelope, eac]);
  const y = (v: number) => PAD.top + ih - (v / max) * ih;
  const path = (key: Key) => { let s = "", pen = false; for (const p of points) { const v = p[key]; if (v === null) { pen = false; continue; } s += `${pen ? "L" : "M"}${xd(p.date).toFixed(1)},${y(v).toFixed(1)} `; pen = true; } return s; };
  const todayPt = points.find((p) => p.date === today) ?? points.filter((p) => p.date <= today).slice(-1)[0];
  const monthTicks = points.filter((p, i, arr) => i === 0 || p.date.slice(0, 7) !== arr[i - 1].date.slice(0, 7)).filter((_, k, arr) => arr.length <= 14 || k % Math.ceil(arr.length / 14) === 0);
  const move = (e: React.MouseEvent) => {
    const rect = (e.currentTarget as SVGSVGElement).getBoundingClientRect(); const px = e.clientX - rect.left;
    let best = 0, bd = Infinity; points.forEach((p, i) => { const d = Math.abs(xd(p.date) - px); if (d < bd) { bd = d; best = i; } }); setHover(best);
  };
  const hp = hover !== null ? points[hover] : null;
  if (points.length < 2) return <p className="text-[10.5px] text-ink-muted">Pas assez de donnees datees pour tracer la courbe.</p>;
  return (
    <div ref={ref} className="relative w-full overflow-hidden">
      <svg width={w} height={H} onMouseMove={move} onMouseLeave={() => setHover(null)} className="block select-none" role="img" aria-label="Courbe en S : valeur planifiee, valeur acquise et cout reel">
        {[0, 0.25, 0.5, 0.75, 1].map((f) => <g key={f}><line x1={PAD.left} x2={w - PAD.right} y1={y(f * max)} y2={y(f * max)} stroke="var(--color-line-light)" /><text x={PAD.left - 6} y={y(f * max) + 3} textAnchor="end" fontSize="9" fill="var(--color-ink-faint)">{short(f * max)}</text></g>)}
        {monthTicks.map((p) => <text key={p.date} x={xd(p.date)} y={H - 8} textAnchor="middle" fontSize="9" fill="var(--color-ink-faint)">{new Date(p.date + "T00:00:00Z").toLocaleDateString("fr-FR", { month: "short", year: monthTicks.length > 8 ? undefined : "2-digit", timeZone: "UTC" }).replace(".", "")}</text>)}
        {bac > 0 && <g><line x1={PAD.left} x2={w - PAD.right} y1={y(bac)} y2={y(bac)} stroke="var(--color-ink-faint)" strokeDasharray="3 3" /><text x={PAD.left + 4} y={y(bac) - 4} fontSize="9" fill="var(--color-ink-muted)">BAC · {shortMoney(bac)}</text></g>}
        {envelope > 0 && Math.abs(envelope - bac) / Math.max(bac, 1) > 0.02 && <g><line x1={PAD.left} x2={w - PAD.right} y1={y(envelope)} y2={y(envelope)} stroke="var(--color-ink-ghost)" strokeDasharray="1 3" /><text x={w - PAD.right} y={y(envelope) - 4} textAnchor="end" fontSize="9" fill="var(--color-ink-faint)">Enveloppe approuvee · {shortMoney(envelope)}</text></g>}
        {on.ev && <path d={`${path("ev")}`.trim() ? `${path("ev").trim()} L${xd(todayPt?.date ?? today).toFixed(1)},${y(0)} L${xd(points.find((p) => p.ev !== null)?.date ?? d0).toFixed(1)},${y(0)} Z` : ""} fill="var(--color-chart-2)" opacity="0.07" />}
        {SERIES.filter((s) => on[s.key]).map((s) => <path key={s.key} d={path(s.key)} fill="none" stroke={s.color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />)}
        {/* Projection EAC : du cout reel actuel a la fin previsionnelle */}
        {on.ac && todayPt && todayPt.ac !== null && eac > 0 && forecastEnd >= today && <g>
          <line x1={xd(todayPt.date)} y1={y(todayPt.ac)} x2={xd(forecastEnd > d1 ? d1 : forecastEnd)} y2={y(eac)} stroke="var(--color-ink)" strokeWidth="1.5" strokeDasharray="4 3" opacity="0.7" />
          <circle cx={xd(forecastEnd > d1 ? d1 : forecastEnd)} cy={y(eac)} r="3.5" fill="var(--color-surface)" stroke="var(--color-ink)" strokeWidth="1.5" />
          <text x={xd(forecastEnd > d1 ? d1 : forecastEnd) - 6} y={y(eac) - 7} textAnchor="end" fontSize="9" fill="var(--color-ink-body)">EAC · {shortMoney(eac)}</text>
        </g>}
        {todayPt && <g><line x1={xd(todayPt.date)} x2={xd(todayPt.date)} y1={PAD.top} y2={PAD.top + ih} stroke="var(--color-ink-faint)" strokeDasharray="2 3" /><text x={xd(todayPt.date) + 3} y={PAD.top + 9} fontSize="9" fill="var(--color-ink-muted)">Auj.</text></g>}
        {hp && <g><line x1={xd(hp.date)} x2={xd(hp.date)} y1={PAD.top} y2={PAD.top + ih} stroke="var(--color-ink-ghost)" />
          {SERIES.filter((s) => on[s.key] && hp[s.key] !== null).map((s) => <circle key={s.key} cx={xd(hp.date)} cy={y(hp[s.key] as number)} r="4" fill={s.color} stroke="var(--color-surface)" strokeWidth="2" />)}</g>}
      </svg>
      {hp && (
        <div className="pointer-events-none absolute top-2 z-10 rounded-md border border-line-hair bg-surface px-2.5 py-2 text-[10px]" style={{ left: Math.min(w - 210, Math.max(0, xd(hp.date) + 10)) }}>
          <div className="mb-1 font-semibold text-ink">{weekLabel(hp.date, "year")} · {formatDate(hp.date)}</div>
          {SERIES.filter((s) => on[s.key]).map((s) => <div key={s.key} className="flex items-center justify-between gap-4"><span className="flex items-center gap-1.5 text-ink-muted"><span className="h-2 w-2 rounded-[2px]" style={{ background: s.color }} />{s.label}</span><span className="tabular-nums text-ink">{hp[s.key] === null ? "—" : formatMoney(hp[s.key] as number, currency)}</span></div>)}
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
        <span className="ml-auto flex items-center gap-1.5 text-ink-faint"><span className="inline-block h-px w-4 border-t border-dashed border-ink" />Projection EAC</span>
      </div>
    </div>
  );
}
