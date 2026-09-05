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

  const Item = ({ item, onClick }: { item: NavItem; onClick?: () => void }) => {
    const active = isActive(item.href);
    const cls = `group flex items-center rounded-xl text-sm transition-colors ${expanded ? "gap-3 px-3 py-2.5" : "h-11 w-11 justify-center"} ${active ? "bg-brand-50 text-brand-700" : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"}`;
    const inner = <><Icon name={item.icon} className="h-[22px] w-[22px] shrink-0" strokeWidth={1.6} />{expanded && <span className="truncate font-medium">{item.label}</span>}</>;
    return onClick
      ? <button onClick={onClick} title={expanded ? undefined : item.label} className={`${cls} w-full`}>{inner}</button>
      : <Link href={item.href} title={expanded ? undefined : item.label} className={cls}>{inner}</Link>;
  };
  const Divider = () => <div className="my-3 h-px w-full bg-slate-100" />;

  return (
    <aside className={`sticky top-3 hidden h-[calc(100vh-1.5rem)] shrink-0 flex-col rounded-2xl border border-slate-200 bg-white p-2.5 shadow-sm transition-[width] duration-200 md:flex ${expanded ? "w-56" : "w-[68px]"}`}>
      <button onClick={toggle} aria-label={expanded ? "Replier le menu" : "Deplier le menu"} title={expanded ? "Replier" : "Deplier"}
        className={`flex h-11 items-center rounded-xl bg-slate-100 text-slate-500 hover:text-slate-900 ${expanded ? "justify-between px-3" : "w-11 justify-center"}`}>
        {expanded && <span className="text-xs font-medium uppercase tracking-wide text-slate-400">Menu</span>}
        <Icon name={expanded ? "collapse" : "expand"} className="h-4 w-4" />
      </button>

      <nav className="mt-3 flex flex-1 flex-col overflow-y-auto">
        {groups.map((group, gi) => (
          <div key={gi} className="flex flex-col gap-1.5">
            {gi > 0 && <Divider />}
            {group.map((item) => <Item key={item.href} item={item} />)}
          </div>
        ))}
      </nav>

      <div className="flex flex-col gap-1.5">
        <Divider />
        <Link href="/account" title={expanded ? undefined : (profile.full_name || profile.email)}
          className={`flex items-center rounded-xl text-sm text-slate-500 hover:bg-slate-100 hover:text-slate-900 ${expanded ? "gap-3 px-3 py-2.5" : "h-11 w-11 justify-center"}`}>
          <Icon name="user" className="h-[22px] w-[22px] shrink-0" strokeWidth={1.6} />
          {expanded && <span className="truncate font-medium">{profile.full_name || profile.email}</span>}
        </Link>
        <form action={signOut}>
          <button title={expanded ? undefined : "Se deconnecter"} className={`flex items-center rounded-xl text-sm text-slate-500 hover:bg-slate-100 hover:text-slate-900 ${expanded ? "w-full gap-3 px-3 py-2.5" : "h-11 w-11 justify-center"}`}>
            <Icon name="logout" className="h-[22px] w-[22px] shrink-0" strokeWidth={1.6} />
            {expanded && <span className="font-medium">Se deconnecter</span>}
          </button>
        </form>
      </div>
    </aside>
  );
}
