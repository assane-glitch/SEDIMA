"use client";
import { usePathname } from "next/navigation";
import { Breadcrumb } from "@/components/ui";

const TABS: Record<string, string> = { planning: "Planning", tasks: "Taches", budget: "Budget", events: "Evenements", journal: "Journal", register: "Registres", documents: "Documents", changes: "Changements", history: "Historique", settings: "Parametres", expenses: "Depenses" };

/** Fil d'Ariane d'une page projet : Projets › code · nom › onglet (le nom du projet est la page courante sur l'Apercu). */
export function ProjectCrumb({ id, code, name }: { id: string; code: string; name: string }) {
  const pathname = usePathname();
  const seg = pathname.split("/")[3] ?? "";
  const tab = TABS[seg];
  const label = `${code} · ${name}`;
  return tab
    ? <Breadcrumb crumbs={[{ href: "/projects", label: "Projets" }, { href: `/projects/${id}`, label }]} current={tab} />
    : <Breadcrumb crumbs={[{ href: "/projects", label: "Projets" }]} current={label} />;
}
