"use client";
import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "@/components/icons";
import type { Profile } from "@/lib/types";

export interface NavItem { href: string; label: string; icon: IconName }

const KEY = "sedima.sidebar.collapsed";

export function Sidebar({ main, bottom, profile, roleLabel, signOut }: { main: NavItem[]; bottom: NavItem[]; profile: Profile; roleLabel: string; signOut: () => Promise<void> }) {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  useEffect(() => {
    try { setCollapsed(localStorage.getItem(KEY) === "1"); } catch {}
  }, []);
  const toggle = () => {
    setCollapsed((c) => { try { localStorage.setItem(KEY, c ? "0" : "1"); } catch {} return !c; });
  };
  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  const Item = ({ item }: { item: NavItem }) => {
    const active = isActive(item.href);
    return (
      <Link href={item.href} title={collapsed ? item.label : undefined}
        className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${active ? "bg-brand-50 font-medium text-brand-700" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"} ${collapsed ? "justify-center px-0" : ""}`}>
        <Icon name={item.icon} className={`h-5 w-5 shrink-0 ${active ? "text-brand-600" : "text-slate-500"}`} />
        {!collapsed && <span className="truncate">{item.label}</span>}
      </Link>
    );
  };

  return (
    <aside className={`sticky top-0 hidden h-screen shrink-0 flex-col border-r border-slate-200 bg-white transition-[width] duration-200 md:flex ${collapsed ? "w-16" : "w-60"}`}>
      <div className={`flex h-16 items-center border-b border-slate-100 ${collapsed ? "justify-center" : "justify-between px-4"}`}>
        <Link href="/dashboard" className="flex items-center" aria-label="SEDIMA">
          {collapsed
            ? <Image src="/icons/icon-192.png" alt="" width={32} height={32} className="rounded-md" />
            : <Image src="/brand/logo-horizontal.png" alt="SEDIMA" width={140} height={30} priority />}
        </Link>
        {!collapsed && <button onClick={toggle} className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="Replier le menu"><Icon name="collapse" className="h-4 w-4" /></button>}
      </div>
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-2 py-3">
        {main.map((i) => <Item key={i.href} item={i} />)}
      </nav>
      <div className="space-y-0.5 border-t border-slate-100 px-2 py-3">
        {bottom.map((i) => <Item key={i.href} item={i} />)}
        {collapsed ? (
          <>
            <button onClick={toggle} className="flex w-full justify-center rounded-lg py-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="Deplier le menu"><Icon name="expand" className="h-4 w-4" /></button>
            <form action={signOut}><button className="flex w-full justify-center rounded-lg py-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900" title="Se deconnecter"><Icon name="logout" className="h-5 w-5" /></button></form>
          </>
        ) : (
          <div className="flex items-center gap-3 px-3 pt-2">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ink-900 text-xs font-semibold text-white">{(profile.full_name || profile.email).slice(0, 1).toUpperCase()}</div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium">{profile.full_name || profile.email}</div>
              <div className="text-xs text-slate-500">{roleLabel}</div>
            </div>
            <form action={signOut}><button className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700" title="Se deconnecter"><Icon name="logout" className="h-4 w-4" /></button></form>
          </div>
        )}
      </div>
    </aside>
  );
}
