import Link from "next/link";
import { Icon } from "@/components/icons";
import { FilterSelect } from "./FilterSelect";
import { PROJECT_CATEGORIES, PROJECT_STATUS_LABELS, type ProjectStatus } from "@/lib/types";

export type PortfolioView = "list" | "planning" | "budget";
export interface PortfolioParams { category?: string; status?: string; fav?: string; q?: string; sort?: string; dir?: string; manager?: string }
const BASE: Record<PortfolioView, string> = { list: "/projects", planning: "/projects/planning", budget: "/projects/budget" };
const VIEWS: { view: PortfolioView; label: string; glyph: string }[] = [{ view: "list", label: "Liste", glyph: "☰" }, { view: "planning", label: "Planning", glyph: "▤" }, { view: "budget", label: "Budget", glyph: "Σ" }];

function href(base: string, params: PortfolioParams, patch: Partial<PortfolioParams>) {
  const u = new URLSearchParams();
  for (const [k, v] of Object.entries({ ...params, ...patch })) if (v) u.set(k, v);
  const s = u.toString(); return `${base}${s ? `?${s}` : ""}`;
}

/**
 * Barre d'outils unique des vues du portefeuille : selecteur de vue, filtres Categorie et Statut (conserves d'une vue
 * a l'autre), compteur de filtres avec « Effacer », etoile Mes favoris et recherche (liste seulement).
 */
export function PortfolioToolbar({ view, params, favCount, search = false, withOutOfScope = false, embedded = false }: { view: PortfolioView; params: PortfolioParams; favCount: number; search?: boolean; withOutOfScope?: boolean; embedded?: boolean }) {
  const base = BASE[view];
  const fav = params.fav === "1";
  const active = [params.category, params.status].filter(Boolean).length;
  const carried = { category: params.category, status: params.status, fav: params.fav };
  const statuses = (Object.keys(PROJECT_STATUS_LABELS) as ProjectStatus[]).filter((s) => withOutOfScope || s !== "hors_perimetre");
  const seg = (on: boolean) => `flex h-10 items-center gap-1.5 border-b-2 px-3 text-[10.5px] font-semibold ${on ? "border-brand text-surface" : "border-transparent text-white/70 hover:text-surface"}`;
  return (
    <div className={`flex flex-wrap items-center gap-2 text-surface ${embedded ? "-mx-2 border-t border-white/10 px-2 pt-1" : "mb-3 rounded-lg bg-ink px-2 py-1"}`}>
      <div className="flex items-center" role="tablist" aria-label="Vue du portefeuille">
        {VIEWS.map((v) => <Link key={v.view} href={href(BASE[v.view], carried, {})} role="tab" aria-selected={view === v.view} className={seg(view === v.view)}><span aria-hidden="true">{v.glyph}</span>{v.label}</Link>)}
      </div>
      <span className="mx-1 hidden h-4 w-px bg-white/20 sm:block" />
      <FilterSelect label="Categorie" value={params.category ?? ""} options={[{ value: "", label: "Toutes les categories", href: href(base, params, { category: undefined }) }, ...PROJECT_CATEGORIES.map((c) => ({ value: c.value, label: c.label, href: href(base, params, { category: c.value }) }))]} />
      <FilterSelect label="Statut" value={params.status ?? ""} options={[{ value: "", label: "Tous les statuts", href: href(base, params, { status: undefined }) }, ...statuses.map((s) => ({ value: s, label: PROJECT_STATUS_LABELS[s], href: href(base, params, { status: s }) }))]} />
      {active > 0 && <a href={href(base, params, { category: undefined, status: undefined })} className="btn-ghost flex items-center gap-1 text-white/70 hover:text-surface"><Icon name="x" className="h-3 w-3" strokeWidth={2.2} />{active} filtre{active > 1 ? "s" : ""} · Effacer</a>}
      <div className="ml-auto flex items-center gap-2">
        <Link href={href(base, params, { fav: fav ? undefined : "1" })} aria-pressed={fav} title={fav ? "Afficher tous les projets" : `Mes favoris${favCount ? ` (${favCount})` : ""}`}
          className={`flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-[10px] font-semibold transition-colors ${fav ? "border-surface bg-surface text-ink" : "border-white/25 bg-transparent text-surface hover:bg-white/10"}`}>
          <svg viewBox="0 0 24 24" className={`h-3.5 w-3.5 ${fav ? "fill-ink" : "fill-none"}`} stroke="currentColor" strokeWidth={1.8} strokeLinejoin="round" aria-hidden="true"><path d="m12 2.8 2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.7l-5.9 3.1 1.2-6.5L2.5 9.7l6.6-.9z" /></svg>
          Favoris{favCount > 0 && <span className={`tabular-nums ${fav ? "text-ink-muted" : "text-white/60"}`}>{favCount}</span>}
        </Link>
        {search && (
          <form action={base} className="relative">
            {params.category && <input type="hidden" name="category" value={params.category} />}{params.status && <input type="hidden" name="status" value={params.status} />}{params.fav && <input type="hidden" name="fav" value={params.fav} />}
            <Icon name="search" className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-faint" />
            <input name="q" defaultValue={params.q ?? ""} placeholder="Rechercher…" aria-label="Rechercher un projet" className="input !h-8 !w-44 !py-0 !pl-8" />
            {params.q && <a href={href(base, params, { q: undefined })} className="absolute right-2 top-1/2 -translate-y-1/2 text-ink-faint hover:text-ink" aria-label="Effacer la recherche"><Icon name="x" className="h-3 w-3" strokeWidth={2.2} /></a>}
          </form>
        )}
      </div>
    </div>
  );
}
