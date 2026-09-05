import Link from "next/link";
import Image from "next/image";
import type { Profile } from "@/lib/types";
import { ROLE_LABELS } from "@/lib/types";
import { signOut } from "@/app/login/actions";
import { Icon } from "@/components/icons";
import { Sidebar, type NavItem } from "./Sidebar";
import { NavLinks } from "./NavLinks";

export function AppShell({ profile, children }: { profile: Profile; children: React.ReactNode }) {
  const isAdmin = profile.role === "admin";
  const main: NavItem[] = [
    { href: "/dashboard", label: "Tableau de bord", icon: "dashboard" },
    { href: "/projects", label: "Projets", icon: "projects" },
    { href: "/tasks", label: "Tâches", icon: "tasks" },
    { href: "/forms", label: "Formulaires", icon: "forms" },
    { href: "/documents", label: "Documents", icon: "documents" },
    { href: "/team", label: "Équipe", icon: "team" },
    { href: "/reports", label: "Rapports", icon: "reports" },
  ];
  const bottom: NavItem[] = isAdmin ? [{ href: "/admin", label: "Administration", icon: "admin" }] : [];
  const mobile: NavItem[] = [
    { href: "/projects", label: "Projets", icon: "projects" },
    { href: "/tasks", label: "Tâches", icon: "tasks" },
    { href: "/forms", label: "Formulaires", icon: "forms" },
  ];

  return (
    <div className="flex min-h-screen">
      <Sidebar main={main} bottom={bottom} profile={profile} roleLabel={ROLE_LABELS[profile.role]} signOut={signOut} />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-2.5 md:hidden">
          <Link href="/projects" className="flex items-center"><Image src="/brand/logo-horizontal.png" alt="SEDIMA" width={120} height={26} priority /></Link>
          <form action={signOut}><button className="flex items-center gap-1 text-xs text-slate-500" aria-label="Se deconnecter"><Icon name="logout" className="h-4 w-4" /></button></form>
        </header>
        <main className="flex-1 px-4 py-6 pb-24 md:px-8 md:pb-8">{children}</main>
        <nav className="fixed inset-x-0 bottom-0 z-20 flex border-t border-slate-200 bg-white md:hidden" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
          <NavLinks links={mobile} mobile />
        </nav>
      </div>
    </div>
  );
}
