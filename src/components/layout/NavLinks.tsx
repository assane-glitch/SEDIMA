"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "@/components/icons";

export function NavLinks({ links, mobile }: { links: { href: string; label: string; icon: IconName }[]; mobile?: boolean }) {
  const pathname = usePathname();
  return (
    <>
      {links.map((l) => {
        const active = pathname === l.href || pathname.startsWith(l.href + "/");
        return mobile ? (
          <Link key={l.href} href={l.href} className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-semibold ${active ? "text-ink" : "text-ink-faint"}`}>
            <Icon name={l.icon} className="h-5 w-5" />{l.label}
          </Link>
        ) : (
          <Link key={l.href} href={l.href} className={`flex items-center gap-3 rounded-lg px-3 py-2 text-[11px] ${active ? "bg-surface-sub font-semibold text-ink" : "text-ink-muted hover:bg-surface-sub"}`}>
            <Icon name={l.icon} className="h-5 w-5" />{l.label}
          </Link>
        );
      })}
    </>
  );
}
