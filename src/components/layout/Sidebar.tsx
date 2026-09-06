"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "@/components/icons";
import type { Profile } from "@/lib/types";

export interface NavItem { href: string; label: string; icon: IconName }
export type NavGroup = NavItem[];

/** Bulle affichee a droite de l'icone au survol. */
function Tip({ label }: { label: string }) {
  return (
    <span role="tooltip" className="pointer-events-none absolute left-full top-1/2 z-50 ml-2 -translate-y-1/2 whitespace-nowrap rounded-md bg-ink px-2 py-1 text-[10.5px] font-semibold text-surface opacity-0 transition-opacity duration-100 group-hover:opacity-100 group-focus-visible:opacity-100">
      {label}
      <span className="absolute right-full top-1/2 -mt-[4px] border-[4px] border-transparent border-r-ink" />
    </span>
  );
}

export function Sidebar({ groups, profile, signOut }: { groups: NavGroup[]; profile: Profile; signOut: () => Promise<void> }) {
  const pathname = usePathname();
  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");
  const base = "group relative flex h-10 w-10 items-center justify-center rounded-lg transition-colors";
  const idle = "text-ink-muted hover:bg-surface-sub hover:text-ink";
  const active = "bg-surface-sub text-ink";

  const Item = ({ item }: { item: NavItem }) => (
    <Link href={item.href} aria-label={item.label} className={`${base} ${isActive(item.href) ? active : idle}`}>
      <Icon name={item.icon} className="h-[19px] w-[19px] shrink-0" strokeWidth={1.6} />
      <Tip label={item.label} />
    </Link>
  );
  const Divider = () => <div className="my-2.5 h-px w-full bg-line-hair" />;

  return (
    <aside className="sticky top-3 z-[35] hidden h-[calc(100vh-1.5rem)] w-14 shrink-0 flex-col rounded-xl border border-line-hair bg-surface p-2 md:flex">
      <nav className="flex flex-1 flex-col pt-1">
        {groups.map((group, gi) => (
          <div key={gi} className="flex flex-col gap-1.5">
            {gi > 0 && <Divider />}
            {group.map((item) => <Item key={item.href} item={item} />)}
          </div>
        ))}
      </nav>
      <div className="flex flex-col gap-1.5">
        <Divider />
        <Link href="/account" aria-label="Mon compte" className={`${base} ${isActive("/account") ? active : idle}`}>
          <Icon name="user" className="h-[19px] w-[19px] shrink-0" strokeWidth={1.6} />
          <Tip label={profile.full_name || profile.email} />
        </Link>
        <form action={signOut}>
          <button aria-label="Se deconnecter" className={`${base} ${idle} cursor-pointer`}>
            <Icon name="logout" className="h-[19px] w-[19px] shrink-0" strokeWidth={1.6} />
            <Tip label="Se deconnecter" />
          </button>
        </form>
      </div>
    </aside>
  );
}
