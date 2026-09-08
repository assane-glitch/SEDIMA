import Link from "next/link";

/** Bascule « Mes favoris » / « Tous les projets », commune aux vues liste, planning et budget du portefeuille. */
export function FavoritesToggle({ fav, hrefFav, hrefAll, count }: { fav: boolean; hrefFav: string; hrefAll: string; count: number }) {
  const cls = (active: boolean) => `px-2.5 py-[3px] text-[10px] font-semibold ${active ? "bg-ink text-surface" : "bg-surface text-ink-body hover:bg-surface-sub"}`;
  return (
    <div className="inline-flex overflow-hidden rounded-md border border-line" title="Limiter les vues du portefeuille a mes projets favoris">
      <Link href={hrefFav} className={cls(fav)}>★ Mes favoris{count > 0 ? ` (${count})` : ""}</Link>
      <Link href={hrefAll} className={cls(!fav)}>Tous les projets</Link>
    </div>
  );
}
