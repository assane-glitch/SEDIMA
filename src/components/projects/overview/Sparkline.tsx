/** Mini-courbe statique (12 points max) : tendance d'un indice, derniere valeur marquee. */
export function Sparkline({ values, color = "var(--color-ink-muted)", baseline }: { values: (number | null)[]; color?: string; baseline?: number }) {
  const pts = values.map((v, i) => [i, v] as const).filter((p): p is readonly [number, number] => p[1] !== null);
  if (pts.length < 2) return <div className="h-6" />;
  const W = 96, H = 24, min = Math.min(...pts.map((p) => p[1]), baseline ?? Infinity), max = Math.max(...pts.map((p) => p[1]), baseline ?? -Infinity);
  const x = (i: number) => (i / Math.max(1, values.length - 1)) * (W - 4) + 2;
  const y = (v: number) => (max === min ? H / 2 : H - 3 - ((v - min) / (max - min)) * (H - 6));
  const d = pts.map(([i, v], k) => `${k ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const last = pts[pts.length - 1];
  return (
    <svg width={W} height={H} className="block" aria-hidden="true">
      {baseline !== undefined && <line x1="0" x2={W} y1={y(baseline)} y2={y(baseline)} stroke="var(--color-line)" strokeDasharray="2 2" />}
      <path d={d} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
      <circle cx={x(last[0])} cy={y(last[1])} r="2.5" fill={color} />
    </svg>
  );
}
