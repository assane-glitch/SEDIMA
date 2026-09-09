"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Icon, type IconName } from "@/components/icons";

interface Entry { href: string; label: string; icon?: IconName; hint?: string; danger?: boolean }

/**
 * Onglets d'un projet : cinq entrees visibles (Apercu, Planning, Taches, Budget, Terrain) et un menu « ⋯ »
 * pour la gouvernance (Changements avec badge, Historique, Parametres, suppression).
 */
export function ProjectTabsClient({ id, canEdit, pending }: { id: string; canEdit: boolean; pending: number }) {
  const pathname = usePathname();
  const [open, setOpen] = useState<"terrain" | "more" | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(null); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(null); };
    document.addEventListener("mousedown", onDown); document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey); };
  }, [open]);
  useEffect(() => { setOpen(null); }, [pathname]);
  const base = `/projects/${id}`;
  const tabs: { href: string; label: string }[] = [
    { href: base, label: "Apercu" }, { href: `${base}/planning`, label: "Planning" }, { href: `${base}/tasks`, label: "Taches" }, { href: `${base}/budget`, label: "Budget" },
  ];
  const terrain: Entry[] = [
    { href: `${base}/journal`, label: "Journal", icon: "journal", hint: "Compte rendu quotidien du chantier" },
    { href: `${base}/register`, label: "Registres", icon: "register", hint: "Presence, materiel, livraisons, incidents" },
    { href: `${base}/events`, label: "Evenements", icon: "calendar", hint: "Flux unifie des saisies terrain" },
    { href: `${base}/documents`, label: "Documents", icon: "documents", hint: "Plans, contrats, photos, rapports" },
  ];
  const more: Entry[] = [
    { href: `${base}/changes`, label: "Changements", icon: "flag", hint: pending ? `${pending} demande${pending > 1 ? "s" : ""} en attente` : "Registre des demandes de changement" },
    { href: `${base}/history`, label: "Historique", icon: "history", hint: "Toutes les modifications du projet" },
    ...(canEdit ? [{ href: `${base}/settings`, label: "Parametres", icon: "admin" as IconName, hint: "Fiche, reference, calendrier" }, { href: `${base}/settings#supprimer`, label: "Supprimer le projet…", icon: "x" as IconName, danger: true }] : []),
  ];
  const isActive = (href: string) => (href === base ? pathname === base : pathname === href || pathname.startsWith(href + "/"));
  const groupActive = (items: Entry[]) => items.some((i) => isActive(i.href.split("#")[0]));
  const tabCls = (active: boolean) => `flex h-10 shrink-0 items-center gap-1 whitespace-nowrap border-b-2 px-3 text-[10.5px] font-semibold ${active ? "border-brand text-surface" : "border-transparent text-white/70 hover:text-surface"}`;
  const Menu = ({ items }: { items: Entry[] }) => (
    <div role="menu" className="absolute left-0 top-full z-40 w-64 pt-1">
      <div className="rounded-lg border border-line-hair bg-surface p-1.5">
        {items.map((i) => (
          <Link key={i.href} href={i.href} role="menuitem" className={`flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[11px] ${i.danger ? "text-alert hover:bg-alert-bg" : isActive(i.href) ? "bg-surface-sub font-semibold text-ink" : "text-ink-body hover:bg-surface-sub"}`}>
            {i.icon && <Icon name={i.icon} className={`h-4 w-4 shrink-0 ${i.danger ? "text-alert" : "text-ink-muted"}`} strokeWidth={1.7} />}
            <span className="min-w-0 flex-1"><span className="block">{i.label}</span>{i.hint && <span className="block truncate text-[9.5px] font-normal text-ink-faint">{i.hint}</span>}</span>
            {i.label === "Changements" && pending > 0 && <span className="rounded-full bg-accent px-1.5 text-[9px] font-bold text-ink">{pending}</span>}
          </Link>
        ))}
      </div>
    </div>
  );
  return (
    <div ref={ref} className="mb-5 flex items-center rounded-lg bg-ink px-2 text-surface">
      <div className="flex min-w-0 flex-1 flex-wrap">
        {tabs.map((t) => <Link key={t.href} href={t.href} className={tabCls(isActive(t.href))}>{t.label}</Link>)}
        <div className="relative shrink-0" onMouseEnter={() => setOpen("terrain")} onMouseLeave={() => setOpen((o) => (o === "terrain" ? null : o))}>
          <button type="button" aria-haspopup="menu" aria-expanded={open === "terrain"} onClick={() => setOpen("terrain")} className={`${tabCls(groupActive(terrain))} cursor-pointer`}>
            Terrain<Icon name="chevronDown" className={`h-3.5 w-3.5 transition-transform ${open === "terrain" ? "rotate-180" : ""}`} strokeWidth={2.2} />
          </button>
          {open === "terrain" && <Menu items={terrain} />}
        </div>
      </div>
      <div className="relative shrink-0 pl-2" onMouseEnter={() => setOpen("more")} onMouseLeave={() => setOpen((o) => (o === "more" ? null : o))}>
        <button type="button" aria-label="Plus d'onglets" aria-haspopup="menu" aria-expanded={open === "more"} onClick={() => setOpen("more")} title="Changements, historique, parametres"
          className={`relative flex h-10 cursor-pointer items-center gap-1 border-b-2 px-2 text-[10.5px] ${groupActive(more) ? "border-brand text-surface" : "border-transparent text-white/70 hover:text-surface"}`}>
          <Icon name="more" className="h-4 w-4 rotate-90" strokeWidth={2.2} />
          {pending > 0 && <span className="absolute -top-0.5 right-0 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[9px] font-bold text-ink" title={`${pending} demande${pending > 1 ? "s" : ""} de changement en attente`}>{pending}</span>}
        </button>
        {open === "more" && <div role="menu" className="absolute right-0 top-full z-40 w-64 pt-1"><div className="rounded-lg border border-line-hair bg-surface p-1.5">
          {more.map((i) => (
            <Link key={i.href} href={i.href} role="menuitem" className={`flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[11px] ${i.danger ? "text-alert hover:bg-alert-bg" : isActive(i.href) ? "bg-surface-sub font-semibold text-ink" : "text-ink-body hover:bg-surface-sub"}`}>
              {i.icon && <Icon name={i.icon} className={`h-4 w-4 shrink-0 ${i.danger ? "text-alert" : "text-ink-muted"}`} strokeWidth={1.7} />}
              <span className="min-w-0 flex-1"><span className="block">{i.label}</span>{i.hint && <span className="block truncate text-[9.5px] font-normal text-ink-faint">{i.hint}</span>}</span>
              {i.label === "Changements" && pending > 0 && <span className="rounded-full bg-accent px-1.5 text-[9px] font-bold text-ink">{pending}</span>}
            </Link>
          ))}
        </div></div>}
      </div>
    </div>
  );
}
