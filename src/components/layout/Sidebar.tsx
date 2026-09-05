"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "@/components/icons";
import type { Profile } from "@/lib/types";

export interface NavItem { href: string; label: string; icon: IconName }
export type NavGroup = NavItem[];

const KEY = "sedima.sidebar.expanded";

export function Sidebar({ groups, profile, signOut }: { groups: NavGroup[]; profile: Profile; signOut: () => Promise<void> }) {
  const [expanded, setExpanded] = useState(false);
  const pathname = usePathname();
  useEffect(() => { try { setExpanded(localStorage.getItem(KEY) === "1"); } catch {} }, []);
  const toggle = () => setExpanded((e) => { try { localStorage.setItem(KEY, e ? "0" : "1"); } catch {} return !e; });
  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");
  const base = `flex items-center rounded-lg text-[11px] font-semibold transition-colors ${expanded ? "gap-3 px-3 py-2" : "h-10 w-10 justify-center"}`;
  const idle = "text-ink-muted hover:bg-surface-sub hover:text-ink";
  const active = "bg-surface-sub text-ink";

  const Item = ({ item }: { item: NavItem }) => (
    <Link href={item.href} title={expanded ? undefined : item.label} className={`${base} ${isActive(item.href) ? active : idle}`}>
      <Icon name={item.icon} className="h-[19px] w-[19px] shrink-0" strokeWidth={1.6} />
      {expanded && <span className="truncate">{item.label}</span>}
    </Link>
  );
  const Divider = () => <div className="my-2.5 h-px w-full bg-line-hair" />;

  return (
    <aside className={`sticky top-3 hidden h-[calc(100vh-1.5rem)] shrink-0 flex-col rounded-xl border border-line-hair bg-surface p-2 transition-[width] duration-200 md:flex ${expanded ? "w-52" : "w-14"}`}>
      <button onClick={toggle} aria-label={expanded ? "Replier le menu" : "Deplier le menu"} title={expanded ? "Replier" : "Deplier"}
        className={`flex h-10 cursor-pointer items-center rounded-lg text-ink-faint hover:bg-surface-sub hover:text-ink ${expanded ? "justify-between px-3" : "w-10 justify-center"}`}>
        {expanded && <span className="eyebrow">Menu</span>}
        <span className="text-[11px] font-bold">{expanded ? "◀" : "▶"}</span>
      </button>
      <nav className="mt-2 flex flex-1 flex-col overflow-y-auto">
        {groups.map((group, gi) => (
          <div key={gi} className="flex flex-col gap-1">
            {gi > 0 && <Divider />}
            {group.map((item) => <Item key={item.href} item={item} />)}
          </div>
        ))}
      </nav>
      <div className="flex flex-col gap-1">
        <Divider />
        <Link href="/account" title={expanded ? undefined : (profile.full_name || profile.email)} className={`${base} ${isActive("/account") ? active : idle}`}>
          <Icon name="user" className="h-[19px] w-[19px] shrink-0" strokeWidth={1.6} />
          {expanded && <span className="truncate">{profile.full_name || profile.email}</span>}
        </Link>
        <form action={signOut}>
          <button title={expanded ? undefined : "Se deconnecter"} className={`${base} ${idle} w-full cursor-pointer`}>
            <Icon name="logout" className="h-[19px] w-[19px] shrink-0" strokeWidth={1.6} />
            {expanded && <span>Se deconnecter</span>}
          </button>
        </form>
      </div>
    </aside>
  );
}
