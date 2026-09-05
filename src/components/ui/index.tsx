import Link from "next/link";
import type { ReactNode } from "react";

export type Tone = "neutral" | "info" | "ok" | "warn" | "alert";
// Compatibilite avec les anciens noms de tons
const TONE_ALIAS: Record<string, Tone> = { slate: "neutral", blue: "info", green: "ok", amber: "warn", red: "alert", good: "ok", bad: "alert", default: "neutral" };
export function tone(t?: string): Tone { return (t && (TONE_ALIAS[t] ?? (t as Tone))) || "neutral"; }
const DOT: Record<Tone, string> = { neutral: "bg-neutral-dot", info: "bg-ink-faint", ok: "bg-ok", warn: "bg-warn-dot", alert: "bg-alert" };
const TEXT: Record<Tone, string> = { neutral: "text-ink", info: "text-ink-body", ok: "text-ok", warn: "text-warn", alert: "text-alert" };

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-[16px] font-bold tracking-[-0.01em] text-ink">{title}</h1>
        {subtitle && <div className="mt-0.5 text-[10.5px] text-ink-muted">{subtitle}</div>}
      </div>
      {actions && <div className="flex gap-2">{actions}</div>}
    </div>
  );
}

export function Stat({ label, value, hint, tone: t = "default" }: { label: string; value: ReactNode; hint?: ReactNode; tone?: string }) {
  return (
    <div className="card card-pad">
      <div className="eyebrow">{label}</div>
      <div className={`mt-1 text-[16px] font-bold tabular-nums tracking-[-0.01em] ${TEXT[tone(t)]}`}>{value}</div>
      {hint && <div className="hint mt-0.5">{hint}</div>}
    </div>
  );
}

export function ProgressBar({ value, tone: t }: { value: number; tone?: string }) {
  const v = Math.min(100, Math.max(0, value));
  const fill = v >= 100 ? "bg-ok" : t === "bad" || t === "alert" ? "bg-alert" : t === "warn" ? "bg-warn-dot" : "bg-ink";
  return (
    <div className="h-[6px] w-full overflow-hidden rounded-xs bg-line-light">
      <div className={`h-full ${fill}`} style={{ width: `${Math.max(v, v > 0 ? 2 : 0)}%` }} />
    </div>
  );
}

export function Badge({ children, tone: t = "neutral" }: { children: ReactNode; tone?: string }) {
  return <span className={`chip-${tone(t)}`}>{children}</span>;
}

export function Dot({ tone: t = "neutral", title }: { tone?: string; title?: string }) {
  return <span className={`dot ${DOT[tone(t)]}`} title={title} />;
}

export function Empty({ title, hint, action }: { title: string; hint?: string; action?: { href: string; label: string } }) {
  return (
    <div className="card flex flex-col items-center justify-center px-6 py-10 text-center">
      <div className="text-[12.5px] font-bold">{title}</div>
      {hint && <div className="hint mt-1 max-w-md">{hint}</div>}
      {action && <Link href={action.href} className="btn-primary mt-4">{action.label}</Link>}
    </div>
  );
}

export function Alert({ children, tone: t = "alert" }: { children: ReactNode; tone?: string }) {
  const k = tone(t);
  const cls = { neutral: "border-line-soft bg-surface-sub text-ink-muted", info: "border-line-hair bg-surface-alt text-ink-body", ok: "border-ok-bd bg-ok-bg text-ok", warn: "border-warn-bd bg-warn-bg text-warn", alert: "border-alert-bd bg-alert-bg text-alert" }[k];
  return <div className={`rounded-md border px-3 py-2 text-[11px] ${cls}`}>{children}</div>;
}

export function ComingSoon({ title, step, hint }: { title: string; step: number; hint: string }) {
  return (
    <div className="card flex flex-col items-center justify-center px-6 py-14 text-center">
      <div className="text-[12.5px] font-bold">{title}</div>
      <div className="hint mt-1 max-w-md">{hint}</div>
      <div className="mt-4"><Badge tone="warn">Prevu a l&apos;etape {step}</Badge></div>
    </div>
  );
}

export function CategoryIcon({ category, className = "h-6 w-6" }: { category: string; className?: string }) {
  const src: Record<string, string> = { oac_poussins: "/brand/poussin.png", poulet_chair: "/brand/coq.png", oeufs_table: "/brand/oeuf.png", industriels: "/brand/industry.png", autres: "/brand/autres.png" };
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src[category] ?? src.autres} alt="" className={`${className} object-contain`} />;
}
