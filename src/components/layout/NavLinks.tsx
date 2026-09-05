"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function NavLinks({ links, mobile }: { links: { href: string; label: string; icon: string }[]; mobile?: boolean }) {
  const pathname = usePathname();
  return (
    <>
      {links.map((l) => {
        const active = pathname === l.href || pathname.startsWith(l.href + "/") || (l.href === "/dashboard" && pathname.startsWith("/projects"));
        return mobile ? (
          <Link key={l.href} href={l.href} className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-xs ${active ? "text-brand-600" : "text-slate-500"}`}>
            <span className="text-lg leading-none">{l.icon}</span>{l.label}
          </Link>
        ) : (
          <Link key={l.href} href={l.href} className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm ${active ? "bg-brand-50 font-medium text-brand-700" : "text-slate-600 hover:bg-slate-100"}`}>
            <span className="w-4 text-center">{l.icon}</span>{l.label}
          </Link>
        );
      })}
    </>
  );
}
