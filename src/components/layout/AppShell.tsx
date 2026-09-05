import Link from "next/link";
import type { Profile } from "@/lib/types";
import { ROLE_LABELS } from "@/lib/types";
import { signOut } from "@/app/login/actions";
import { NavLinks } from "./NavLinks";

export function AppShell({ profile, children }: { profile: Profile; children: React.ReactNode }) {
  const isAdmin = profile.role === "admin";
  const links = [
    { href: "/dashboard", label: "Tableau de bord", icon: "▦" },
    { href: "/field", label: "Terrain", icon: "◎" },
    ...(isAdmin ? [{ href: "/admin/users", label: "Utilisateurs", icon: "◉" }] : []),
  ];
  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-60 shrink-0 flex-col border-r border-slate-200 bg-white md:flex">
        <Link href="/dashboard" className="px-5 py-5 text-lg font-semibold tracking-tight">SEDIMA</Link>
        <nav className="flex-1 space-y-1 px-3">
          <NavLinks links={links} />
        </nav>
        <div className="border-t border-slate-200 px-5 py-4 text-sm">
          <div className="truncate font-medium">{profile.full_name || profile.email}</div>
          <div className="text-xs text-slate-500">{ROLE_LABELS[profile.role]}</div>
          <form action={signOut}><button className="mt-2 text-xs text-slate-500 hover:text-slate-900">Se deconnecter</button></form>
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 md:hidden">
          <Link href="/dashboard" className="font-semibold">SEDIMA</Link>
          <form action={signOut}><button className="text-xs text-slate-500">Deconnexion</button></form>
        </header>
        <main className="flex-1 px-4 py-6 pb-24 md:px-8 md:pb-8">{children}</main>
        <nav className="fixed inset-x-0 bottom-0 z-20 flex border-t border-slate-200 bg-white md:hidden" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
          <NavLinks links={links} mobile />
        </nav>
      </div>
    </div>
  );
}
