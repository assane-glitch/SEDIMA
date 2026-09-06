"use client";
import { useOptimistic, useTransition } from "react";
import { toggleFavorite } from "@/app/(app)/projects/actions";

/** Etoile de favori : jaune SEDIMA quand le projet est en favori, contour gris sinon. */
export function FavoriteStar({ projectId, favorite, className = "" }: { projectId: string; favorite: boolean; className?: string }) {
  const [pending, start] = useTransition();
  const [fav, setFav] = useOptimistic(favorite);
  return (
    <button type="button" disabled={pending} aria-pressed={fav} title={fav ? "Retirer des favoris" : "Ajouter aux favoris"}
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); start(async () => { setFav(!fav); await toggleFavorite(projectId); }); }}
      className={`flex h-6 w-6 cursor-pointer items-center justify-center rounded-md transition-colors hover:bg-surface-sub ${className}`}>
      <svg viewBox="0 0 24 24" className={`h-4 w-4 ${fav ? "fill-accent text-accent" : "fill-none text-ink-faint hover:text-ink"}`} stroke="currentColor" strokeWidth={1.8} strokeLinejoin="round"><path d="m12 2.8 2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.7l-5.9 3.1 1.2-6.5L2.5 9.7l6.6-.9z" /></svg>
    </button>
  );
}
