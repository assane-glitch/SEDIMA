import Link from "next/link";
import Image from "next/image";
import { Suspense } from "react";
import type { Profile } from "@/lib/types";
import { ROLE_LABELS } from "@/lib/types";
import { signOut } from "@/app/login/actions";
import { Icon } from "@/components/icons";
import { Sidebar, type NavGroup, type NavItem } from "./Sidebar";
import { NavLinks } from "./NavLinks";
import { GlobalSearch } from "./GlobalSearch";

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
    <div className="min-h-screen bg-canvas">
      {/* En-tete de l'application : logo, recherche globale centree, utilisateur */}
      <header className="sticky top-0 z-30 grid h-[52px] grid-cols-[auto_1fr_auto] items-center gap-3 border-b border-line-hair bg-surface px-4 md:h-[60px] md:grid-cols-[220px_1fr_220px] md:px-5">
        <Link href="/dashboard" className="flex items-center" aria-label="SEDIMA">
          <Image src="/brand/logo-horizontal.png" alt="SEDIMA" width={150} height={32} priority className="h-6 w-auto md:h-7" />
        </Link>
        <div className="flex justify-center"><Suspense fallback={null}><GlobalSearch /></Suspense></div>
        <div className="flex items-center justify-end gap-3">
          <Link href="/account" className="hidden items-center gap-3 md:flex" title="Mon compte">
            <div className="text-right leading-tight">
              <div className="text-[11px] font-semibold text-ink">{profile.full_name || profile.email}</div>
              <div className="text-[9.5px] text-ink-faint">{ROLE_LABELS[profile.role]}</div>
            </div>
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-ink text-[10px] font-bold text-surface">{(profile.full_name || profile.email).slice(0, 1).toUpperCase()}</div>
          </Link>
          <form action={signOut} className="md:hidden"><button className="text-ink-muted" aria-label="Se deconnecter"><Icon name="logout" className="h-5 w-5" /></button></form>
        </div>
      </header>
      <div className="flex gap-3 md:px-3">
        <Sidebar groups={groups} profile={profile} signOut={signOut} />
        <div className="flex min-w-0 flex-1 flex-col">
          <main className="flex-1 px-4 pb-24 pt-4 md:px-2 md:pb-6">{children}</main>
          <nav className="fixed inset-x-0 bottom-0 z-20 flex border-t border-line-hair bg-surface md:hidden" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
            <NavLinks links={mobile} mobile />
          </nav>
        </div>
      </div>
    </div>
  );
}
