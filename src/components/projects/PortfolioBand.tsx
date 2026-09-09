import type { ReactNode } from "react";
import { PageHeader, type Crumb } from "@/components/ui";

/**
 * Bandeau anthracite en tete des vues du portefeuille : fil d'Ariane, titre, sous-titre, action principale
 * et barre d'outils integree (enfant), sur toute la largeur sous la barre principale.
 */
export function PortfolioBand({ title, subtitle, crumbs, action, children, flush = false }: { title: string; subtitle?: ReactNode; crumbs?: Crumb[]; action?: ReactNode; children: ReactNode; flush?: boolean }) {
  return (
    <div className={`-mx-4 mb-4 bg-ink px-4 pb-1 pt-3 text-surface md:-mx-6 md:px-6 ${flush ? "-mt-4" : ""}`}>
      <PageHeader tone="dark" title={title} subtitle={subtitle} crumbs={crumbs} actions={action} />
      {children}
    </div>
  );
}
