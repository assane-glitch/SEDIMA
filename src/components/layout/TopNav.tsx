"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Icon, type IconName } from "@/components/icons";

export interface NavEntry { href: string; label: string; icon?: IconName; hint?: string }
export interface NavMenu { label: string; href?: string; items?: NavEntry[] }

/** Menu principal de la barre superieure : liens directs et menus deroulants (Activites, Organisation). */
export function TopNav({ menus }: { menus: NavMenu[] }) {
  const pathname = usePathname();
  const [open, setOpen] = useState<string | null>(null);
  const [pinned, setPinned] = useState(false);   // ouvert au clic : ne se ferme pas quand la souris sort
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) { setOpen(null); setPinned(false); } };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { setOpen(null); setPinned(false); } };
    document.addEventListener("mousedown", onDown); document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey); };
  }, [open]);
  useEffect(() => { setOpen(null); setPinned(false); }, [pathname]);
  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");
  const menuActive = (m: NavMenu) => (m.href ? isActive(m.href) : (m.items ?? []).some((i) => isActive(i.href)));
  const btn = (active: boolean) => `flex h-full items-center gap-1 border-b-2 px-3 text-[11.5px] font-semibold transition-colors ${active ? "border-brand text-ink" : "border-transparent text-ink-muted hover:text-ink"}`;
  return (
    <nav ref={ref} aria-label="Navigation principale" className="flex h-full items-stretch gap-1">
      {menus.map((m) => m.href ? (
        <Link key={m.label} href={m.href} className={btn(menuActive(m))}>{m.label}</Link>
      ) : (
        <div key={m.label} className="relative flex" onMouseEnter={() => { if (!pinned) setOpen(m.label); }} onMouseLeave={() => { if (!pinned) setOpen((o) => (o === m.label ? null : o)); }}>
          <button type="button" aria-haspopup="menu" aria-expanded={open === m.label} onClick={() => { if (open === m.label && pinned) { setOpen(null); setPinned(false); } else { setOpen(m.label); setPinned(true); } }} className={`${btn(menuActive(m) || open === m.label)} cursor-pointer`}>
            {m.label}<Icon name="chevronDown" className={`h-3.5 w-3.5 transition-transform ${open === m.label ? "rotate-180" : ""}`} strokeWidth={2.2} />
          </button>
          {open === m.label && (
            <div role="menu" className="absolute left-1/2 top-full z-40 w-60 -translate-x-1/2 pt-2">
              <div className="rounded-lg border border-line-hair bg-surface p-1.5">
                {(m.items ?? []).map((i) => (
                  <Link key={i.href} href={i.href} role="menuitem" className={`flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[11px] ${isActive(i.href) ? "bg-surface-sub font-semibold text-ink" : "text-ink-body hover:bg-surface-sub"}`}>
                    {i.icon && <Icon name={i.icon} className="h-4 w-4 shrink-0 text-ink-muted" strokeWidth={1.7} />}
                    <span className="min-w-0"><span className="block">{i.label}</span>{i.hint && <span className="block truncate text-[9.5px] font-normal text-ink-faint">{i.hint}</span>}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      ))}
    </nav>
  );
}
