import Link from "next/link";
import type { ReactNode } from "react";
import { Icon } from "@/components/icons";

export type Tone = "neutral" | "info" | "ok" | "warn" | "alert";
// Compatibilite avec les anciens noms de tons
const TONE_ALIAS: Record<string, Tone> = { slate: "neutral", blue: "info", green: "ok", amber: "warn", red: "alert", good: "ok", bad: "alert", default: "neutral" };
export function tone(t?: string): Tone { return (t && (TONE_ALIAS[t] ?? (t as Tone))) || "neutral"; }

export interface Crumb { href?: string; label: string }

/** Fil d'Ariane : bouton retour vers le niveau precedent puis le chemin complet jusqu'a la page courante. */
export function Breadcrumb({ crumbs, current, className = "", tone = "light" }: { crumbs: Crumb[]; current: string; className?: string; tone?: "light" | "dark" }) {
  if (crumbs.length === 0) return null;
  const back = [...crumbs].reverse().find((c) => c.href) ?? { href: "/dashboard", label: "Tableau de bord" };
  const dark = tone === "dark";
  return (
    <nav aria-label="Fil d'Ariane" className={`mb-2 flex flex-wrap items-center gap-1.5 text-[10.5px] ${dark ? "text-white/60" : "text-ink-muted"} ${className}`}>
      <Link href={back.href!} title={`Retour a ${back.label}`} aria-label={`Retour a ${back.label}`} className={`inline-flex h-5 w-5 items-center justify-center rounded-md border ${dark ? "border-white/25 text-surface hover:bg-white/10" : "border-line bg-surface text-ink-body hover:bg-surface-sub"}`}><Icon name="chevronLeft" className="h-3.5 w-3.5" strokeWidth={2.2} /></Link>
      {crumbs.map((c, i) => (
        <span key={`${c.label}-${i}`} className={`items-center gap-1.5 ${i < crumbs.length - 1 ? "hidden sm:flex" : "flex"}`}>
          {c.href ? <Link href={c.href} className={`max-w-[260px] truncate hover:underline ${dark ? "hover:text-surface" : "hover:text-ink"}`}>{c.label}</Link> : <span className="max-w-[260px] truncate">{c.label}</span>}
          <span className={dark ? "text-white/40" : "text-ink-faint"}>›</span>
        </span>
      ))}
      <span className={`truncate font-semibold ${dark ? "text-surface" : "text-ink"}`}>{current}</span>
    </nav>
  );
}

export function PageHeader({ title, subtitle, actions, crumbs, tone = "light" }: { title: string; subtitle?: ReactNode; actions?: ReactNode; crumbs?: Crumb[]; tone?: "light" | "dark" }) {
  const dark = tone === "dark";
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div>
        {crumbs && crumbs.length > 0 && <Breadcrumb crumbs={crumbs} current={title} tone={tone} />}
        <h1 className={`text-[16px] font-bold tracking-[-0.01em] ${dark ? "text-surface" : "text-ink"}`}>{title}</h1>
        {subtitle && <div className={`mt-0.5 text-[10.5px] ${dark ? "text-white/60" : "text-ink-muted"}`}>{subtitle}</div>}
      </div>
      {actions && <div className="flex gap-2">{actions}</div>}
    </div>
  );
}

const DOT: Partial<Record<Tone, string>> = { ok: "bg-ok", warn: "bg-warn-dot", alert: "bg-alert" };

/** Indicateur : valeur toujours en anthracite, le ton (ok, warn, alert) n'apparait que comme un point discret devant le complement. */
export function Stat({ label, value, hint, tone: t = "default" }: { label: string; value: ReactNode; hint?: ReactNode; tone?: string }) {
  const dot = DOT[tone(t)];
  return (
    <div className="card card-pad">
      <div className="eyebrow">{label}</div>
      <div className="mt-1 text-[16px] font-bold tabular-nums tracking-[-0.01em] text-ink">{value}</div>
      {(hint || dot) && <div className="hint mt-0.5 flex items-center gap-1.5">{dot && <span className={`dot ${dot}`} />}{hint}</div>}
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

export function CategoryIcon({ category, className = "h-6 w-6", tone = "brand" }: { category: string; className?: string; tone?: "brand" | "ink" | "surface" | "raw" }) {
  const src: Record<string, string> = { oac_poussins: "/brand/poussin.png", poulet_chair: "/brand/coq.png", oeufs_table: "/brand/oeuf.png", industriels: "/brand/industry.png", autres: "/brand/autres.png" };
  const url = src[category] ?? src.autres;
  // Pictogramme colore : le PNG sert de masque sur un fond de la couleur voulue
  if (tone !== "raw") return <span aria-hidden className={`inline-block shrink-0 ${className} ${tone === "brand" ? "bg-brand" : tone === "surface" ? "bg-surface" : "bg-ink"}`} style={{ WebkitMaskImage: `url(${url})`, maskImage: `url(${url})`, WebkitMaskSize: "contain", maskSize: "contain", WebkitMaskRepeat: "no-repeat", maskRepeat: "no-repeat", WebkitMaskPosition: "center", maskPosition: "center" }} />;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={url} alt="" className={`${className} object-contain`} />;
}
