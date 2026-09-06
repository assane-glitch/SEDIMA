"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function ProjectTabs({ id, canEdit }: { id: string; canEdit: boolean }) {
  const pathname = usePathname();
  const tabs = [
    { href: `/projects/${id}`, label: "Aperçu" },
    { href: `/projects/${id}/planning`, label: "Planning" },
    { href: `/projects/${id}/tasks`, label: "Tâches" },
    { href: `/projects/${id}/budget`, label: "Budget" },
    { href: `/projects/${id}/events`, label: "Évènements" },
    { href: `/projects/${id}/journal`, label: "Journal" },
    { href: `/projects/${id}/register`, label: "Registres" },
    { href: `/projects/${id}/documents`, label: "Documents" },
    { href: `/projects/${id}/changes`, label: "Changements" },
    { href: `/projects/${id}/history`, label: "Historique" },
    ...(canEdit ? [{ href: `/projects/${id}/settings`, label: "Paramètres" }] : []),
  ];
  return (
    <div className="mb-5 flex gap-1 overflow-x-auto overflow-y-hidden border-b border-line-hair [scrollbar-width:none]">
      {tabs.map((t) => {
        const active = pathname === t.href || (t.href.endsWith('/events') && pathname.startsWith(t.href));
        return <Link key={t.href} href={t.href} className={`-mb-px whitespace-nowrap border-b-2 px-3 py-2 text-[10.5px] ${active ? "border-ink font-bold text-ink" : "border-transparent text-ink-muted hover:text-ink"}`}>{t.label}</Link>;
      })}
    </div>
  );
}
