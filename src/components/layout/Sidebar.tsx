"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Icon, type IconName } from "@/components/icons";
import type { Profile } from "@/lib/types";

export interface NavItem { href: string; label: string; icon: IconName }
export interface NavGroup { title: string; items: NavItem[] }
const OPEN_KEY = "sedima.sidebar.open";

/** Bulle affichee a droite de l'icone au survol (barre repliee seulement). */
function Tip({ label }: { label: string }) {
  return (
    <span role="tooltip" className="pointer-events-none absolute left-full top-1/2 z-50 ml-2 -translate-y-1/2 whitespace-nowrap rounded-md bg-ink px-2 py-1 text-[10.5px] font-semibold text-surface opacity-0 transition-opacity duration-100 group-hover:opacity-100">
      {label}
      <span className="absolute right-full top-1/2 -mt-[4px] border-[4px] border-transparent border-r-ink" />
    </span>
  );
}

/**
 * Barre laterale : repliee (icones seules, libelle au survol) ou depliee (libelles et titres de groupe).
 * L'etat est memorise dans le navigateur.
 */
export function Sidebar({ groups, profile, signOut }: { groups: NavGroup[]; profile: Profile; signOut: () => Promise<void> }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  useEffect(() => { try { setOpen(localStorage.getItem(OPEN_KEY) === "1"); } catch {} }, []);
  const toggle = () => setOpen((v) => { try { localStorage.setItem(OPEN_KEY, v ? "0" : "1"); } catch {} return !v; });
  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");
  const base = `group relative flex h-10 items-center rounded-lg transition-colors ${open ? "w-full gap-3 px-3" : "w-10 justify-center"}`;
  const idle = "text-ink-muted hover:bg-surface-sub hover:text-ink";
  const active = "bg-surface-sub text-ink";
  const label = (text: string) => (open ? <span className="truncate text-[11px] font-semibold">{text}</span> : <Tip label={text} />);

  const Item = ({ item }: { item: NavItem }) => (
    <Link href={item.href} aria-label={item.label} className={`${base} ${isActive(item.href) ? active : idle}`}>
      <Icon name={item.icon} className="h-[19px] w-[19px] shrink-0" strokeWidth={1.6} />
      {label(item.label)}
    </Link>
  );
  const Divider = () => <div className="my-2.5 h-px w-full bg-line-hair" />;

  return (
    <aside className={`sticky top-[72px] z-[25] mt-3 hidden h-[calc(100vh-72px-0.75rem)] shrink-0 flex-col rounded-xl border border-line-hair bg-surface p-2 transition-[width] duration-150 md:flex ${open ? "w-52" : "w-14"}`}>
      <button type="button" onClick={toggle} aria-label={open ? "Replier le menu" : "Deplier le menu"} aria-expanded={open} title={open ? "Replier le menu" : "Deplier le menu"}
        className={`${base} ${idle} cursor-pointer`}>
        <Icon name={open ? "collapse" : "expand"} className="h-[17px] w-[17px] shrink-0" strokeWidth={1.6} />
        {open ? <span className="truncate text-[10px] font-semibold text-ink-faint">Replier</span> : <Tip label="Deplier le menu" />}
      </button>
      <nav className="flex flex-1 flex-col justify-center overflow-y-auto [scrollbar-width:none]">
        {groups.map((group, gi) => (
          <div key={group.title} className="flex flex-col gap-1">
            {gi > 0 && !open && <Divider />}
            {open && <div className={`eyebrow px-3 pb-1 ${gi > 0 ? "pt-4" : ""}`}>{group.title}</div>}
            {group.items.map((item) => <Item key={item.href} item={item} />)}
          </div>
        ))}
      </nav>
      <div className="flex flex-col gap-1">
        <Divider />
        <Link href="/account" aria-label="Mon compte" className={`${base} ${isActive("/account") ? active : idle}`}>
          <Icon name="user" className="h-[19px] w-[19px] shrink-0" strokeWidth={1.6} />
          {label(profile.full_name || profile.email)}
        </Link>
        <form action={signOut}>
          <button aria-label="Se deconnecter" className={`${base} ${idle} cursor-pointer`}>
            <Icon name="logout" className="h-[19px] w-[19px] shrink-0" strokeWidth={1.6} />
            {label("Se deconnecter")}
          </button>
        </form>
      </div>
    </aside>
  );
}
