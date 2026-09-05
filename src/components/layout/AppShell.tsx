import Link from "next/link";
import Image from "next/image";
import type { Profile } from "@/lib/types";
import { ROLE_LABELS } from "@/lib/types";
import { signOut } from "@/app/login/actions";
import { Icon } from "@/components/icons";
import { Sidebar, type NavGroup, type NavItem } from "./Sidebar";
import { NavLinks } from "./NavLinks";

export function AppShell({ profile, children }: { profile: Profile; children: React.ReactNode }) {
  const isAdmin = profile.role === "admin";
  const groups: NavGroup[] = [
    [
      { href: "/dashboard", label: "Tableau de bord", icon: "dashboard" },
      { href: "/projects", label: "Projets", icon: "projects" },
      { href: "/tasks", label: "Tâches", icon: "tasks" },
    ],
    [
      { href: "/forms", label: "Formulaires", icon: "forms" },
      { href: "/documents", label: "Documents", icon: "documents" },
    ],
    [
      { href: "/team", label: "Équipe", icon: "team" },
      { href: "/reports", label: "Rapports", icon: "reports" },
    ],
    ...(isAdmin ? [[{ href: "/admin", label: "Administration", icon: "admin" as const }]] : []),
  ];
  const mobile: NavItem[] = [
    { href: "/projects", label: "Projets", icon: "projects" },
    { href: "/tasks", label: "Tâches", icon: "tasks" },
    { href: "/forms", label: "Formulaires", icon: "forms" },
  ];

  return (
    <div className="flex min-h-screen gap-3 bg-slate-50 md:px-3">
      <Sidebar groups={groups} profile={profile} signOut={signOut} />
      <div className="flex min-w-0 flex-1 flex-col">
        {/* En-tete : logo a cote du menu, sur chaque page */}
        <header className="flex items-center justify-between px-4 py-3 md:h-[68px] md:px-2 md:pt-3">
          <Link href="/dashboard" className="flex items-center" aria-label="SEDIMA">
            <Image src="/brand/logo-horizontal.png" alt="SEDIMA" width={150} height={32} priority className="h-7 w-auto md:h-8" />
          </Link>
          <div className="hidden items-center gap-3 text-sm md:flex">
            <div className="text-right leading-tight">
              <div className="font-medium text-slate-800">{profile.full_name || profile.email}</div>
              <div className="text-xs text-slate-500">{ROLE_LABELS[profile.role]}</div>
            </div>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-ink-900 text-xs font-semibold text-white">{(profile.full_name || profile.email).slice(0, 1).toUpperCase()}</div>
          </div>
          <form action={signOut} className="md:hidden"><button className="text-slate-500" aria-label="Se deconnecter"><Icon name="logout" className="h-5 w-5" /></button></form>
        </header>
        <main className="flex-1 px-4 pb-24 pt-2 md:px-2 md:pb-6">{children}</main>
        <nav className="fixed inset-x-0 bottom-0 z-20 flex border-t border-slate-200 bg-white md:hidden" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
          <NavLinks links={mobile} mobile />
        </nav>
      </div>
    </div>
  );
}
