"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function ProjectTabs({ id, canEdit }: { id: string; canEdit: boolean }) {
  const pathname = usePathname();
  const tabs = [
    { href: `/projects/${id}`, label: "Gantt" },
    { href: `/projects/${id}/expenses`, label: "Depenses" },
    { href: `/projects/${id}/journal`, label: "Journal" },
    { href: `/projects/${id}/register`, label: "Registres" },
    ...(canEdit ? [{ href: `/projects/${id}/settings`, label: "Parametres" }] : []),
  ];
  return (
    <div className="mb-5 flex gap-1 overflow-x-auto border-b border-slate-200">
      {tabs.map((t) => {
        const active = pathname === t.href;
        return <Link key={t.href} href={t.href} className={`-mb-px whitespace-nowrap border-b-2 px-3 py-2 text-sm ${active ? "border-brand-600 font-medium text-brand-700" : "border-transparent text-slate-500 hover:text-slate-800"}`}>{t.label}</Link>;
      })}
    </div>
  );
}
