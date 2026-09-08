import Link from "next/link";
import { FavoriteStar } from "./FavoriteStar";
import { ProjectCardMenu } from "./ProjectCardMenu";
import { shortMoney, weekLabel } from "@/lib/format";
import { HEALTH_LABELS, type Health } from "@/lib/health";
import { PROJECT_STATUS_LABELS, type Project, type ProjectStats } from "@/lib/types";


export type CardRow = { p: Project; s?: ProjectStats; health: Health };
/** Cout reconstitue HTVA (somme des taches), null si le projet n'a pas de taches. */
export const rebuiltOf = (r: CardRow) => (Number(r.s?.task_count ?? 0) > 0 ? Number(r.s?.rebuilt_cost ?? 0) : null);
/** Projet en alerte : sante en difficulte, cout reconstitue > budget + 5 %, ou depense > budget. */
export const isAlert = (r: CardRow) => { const rb = rebuiltOf(r), b = Number(r.p.budget); return r.health === "bad" || (b > 0 && rb !== null && rb > b * 1.05) || (b > 0 && Number(r.s?.spent ?? 0) > b); };

/** Carte projet du portefeuille : code, badge, nom, budget approuve et ecart HTVA, semaines, barre, statut. */
export function ProjectCard({ row, href, favorite, canEdit }: { row: CardRow; href?: string; favorite?: boolean; canEdit?: boolean }) {
  const { p, s, health } = row;
  const budget = Number(p.budget), cost = rebuiltOf(row), late = Number(s?.late_count ?? 0);
  const diff = cost !== null && budget > 0 ? Math.round(((cost - budget) / budget) * 100) : null;
  const alert = isAlert(row);
  return (
    <div className="card relative transition-colors hover:border-line hover:bg-surface-alt">
      <div className="absolute right-1.5 top-1.5 flex items-center gap-0.5">
        {favorite !== undefined && <FavoriteStar projectId={p.id} favorite={favorite} />}
        {canEdit !== undefined && <ProjectCardMenu projectId={p.id} code={p.code} name={p.name} canEdit={canEdit} />}
      </div>
      <Link href={href ?? `/projects/${p.id}`} className="block px-[13px] pb-3 pt-[11px]">
      <div className="flex items-center gap-2 pr-12">
        <span className="font-mono text-[10.5px] font-bold text-ink">{p.code}</span>
        {alert ? <span className="flex h-4 w-4 items-center justify-center rounded-[3px] bg-brand text-[10px] font-bold leading-none text-surface" title={HEALTH_LABELS[health]}>!</span>
          : late > 0 ? <span className="flex h-4 min-w-4 items-center justify-center rounded-[3px] bg-accent px-1 text-[10px] font-bold leading-none text-ink" title={`${late} tache${late > 1 ? "s" : ""} en retard`}>{late}</span> : null}
      </div>
      <div className="mt-2 min-h-[36px] text-[12.5px] font-semibold leading-snug text-ink">{p.name}</div>
      <div className="mt-3 flex items-baseline gap-2 text-[10px]">
        <span className="text-[12.5px] font-bold tabular-nums text-ink" title={cost !== null ? `Cout reconstitue HTVA ${shortMoney(cost)}` : undefined}>{shortMoney(budget)}</span>
        {diff === null ? <span className="text-ink-faint">sans taches</span> : Math.abs(diff) < 1 ? <span className="font-semibold text-ink-muted">au budget</span> : <span className={`font-semibold tabular-nums ${diff > 0 ? "text-ink-body" : "text-ink-muted"}`}>{diff > 0 ? "+" : "−"}{Math.abs(diff)} %</span>}
        <span className="ml-auto whitespace-nowrap tabular-nums text-ink-faint">{weekLabel(p.start_date, "auto")} → {weekLabel(p.end_date, "auto")}</span>
      </div>
      <div className="mt-2 text-[10.5px] font-semibold text-ink-body">{PROJECT_STATUS_LABELS[p.status]}</div>
      </Link>
    </div>
  );
}
