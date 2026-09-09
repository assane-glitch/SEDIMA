"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/icons";
import { ROLE_LABELS, type Profile } from "@/lib/types";

/** Avatar a droite de la barre : menu contextuel avec le compte, l'administration et la deconnexion. */
export function ProfileMenu({ profile, signOut }: { profile: Profile; signOut: () => Promise<void> }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDown); document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey); };
  }, [open]);
  useEffect(() => { setOpen(false); }, [pathname]);
  const name = profile.full_name || profile.email;
  const item = "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[11px] text-ink-body hover:bg-surface-sub";
  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen((v) => !v)} aria-haspopup="menu" aria-expanded={open} aria-label="Menu du profil" title={name}
        className={`flex h-9 cursor-pointer items-center gap-2 rounded-full pl-1 pr-2 transition-colors hover:bg-white/10 ${open ? "bg-white/15" : ""}`}>
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-surface text-[10.5px] font-bold text-ink">{name.slice(0, 1).toUpperCase()}</span>
        <span className="hidden max-w-[140px] truncate text-[11px] font-semibold text-surface md:block">{name}</span>
        <Icon name="chevronDown" className={`hidden h-3.5 w-3.5 text-white/70 transition-transform md:block ${open ? "rotate-180" : ""}`} strokeWidth={2.2} />
      </button>
      {open && (
        <div role="menu" className="absolute right-0 top-full z-40 w-60 pt-2">
          <div className="rounded-lg border border-line-hair bg-surface p-1.5">
            <div className="px-2.5 pb-2 pt-1.5"><div className="truncate text-[11px] font-semibold text-ink">{name}</div><div className="truncate text-[9.5px] text-ink-faint">{profile.email} · {ROLE_LABELS[profile.role]}</div></div>
            <div className="my-1 border-t border-line-hair" />
            <Link href="/account" role="menuitem" className={item}><Icon name="user" className="h-4 w-4 text-ink-muted" strokeWidth={1.7} />Mon compte</Link>
            {profile.role === "admin" && <Link href="/admin" role="menuitem" className={item}><Icon name="admin" className="h-4 w-4 text-ink-muted" strokeWidth={1.7} />Administration</Link>}
            <div className="my-1 border-t border-line-hair" />
            <form action={signOut}><button type="submit" role="menuitem" className={`${item} w-full cursor-pointer text-left`}><Icon name="logout" className="h-4 w-4 text-ink-muted" strokeWidth={1.7} />Se deconnecter</button></form>
          </div>
        </div>
      )}
    </div>
  );
}
