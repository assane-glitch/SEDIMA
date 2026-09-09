import Link from "next/link";
import Image from "next/image";
import type { Profile } from "@/lib/types";
import { signOut } from "@/app/login/actions";
import { SearchLauncher } from "./SearchLauncher";
import { NavLinks } from "./NavLinks";
import { ProfileMenu } from "./ProfileMenu";
import { TopNav, type NavMenu } from "./TopNav";

/**
 * Coque de l'application : barre superieure anthracite (logo blanc, menu au centre, recherche et profil a droite),
 * contenu en pleine largeur, barre d'onglets en bas sur mobile.
 */
export function AppShell({ profile, children }: { profile: Profile; children: React.ReactNode }) {
  const menus: NavMenu[] = [
    { label: "Tableau de bord", href: "/dashboard" },
    { label: "Projets", href: "/projects" },
    { label: "Activites", items: [
      { href: "/tasks", label: "Taches", icon: "tasks", hint: "Toutes les taches, tous projets" },
      { href: "/forms", label: "Formulaires", icon: "forms", hint: "Saisies terrain et boite de reception" },
      { href: "/documents", label: "Documents", icon: "documents", hint: "Plans, contrats, photos, rapports" },
    ] },
    { label: "Organisation", items: [
      { href: "/team", label: "Equipe", icon: "team", hint: "Membres et responsabilites" },
      { href: "/reports", label: "Rapports", icon: "reports", hint: "Rapport hebdomadaire, exports" },
    ] },
  ];
  const mobile = [
    { href: "/dashboard", label: "Accueil", icon: "dashboard" as const },
    { href: "/projects", label: "Projets", icon: "projects" as const },
    { href: "/tasks", label: "Taches", icon: "tasks" as const },
    { href: "/forms", label: "Formulaires", icon: "forms" as const },
  ];

  return (
    <div className="min-h-screen bg-canvas">
      <header className="sticky top-0 z-30 h-11 border-b border-line-hair bg-surface text-ink">
        <div className="mx-auto grid h-full max-w-[1600px] grid-cols-[auto_1fr_auto] items-center gap-4 px-4 md:grid-cols-[200px_1fr_auto] md:px-6">
          <Link href="/dashboard" className="flex items-center" aria-label="SEDIMA">
            <Image src="/brand/logo-horizontal.png" alt="SEDIMA" width={150} height={32} priority className="h-5 w-auto md:h-[22px]" />
          </Link>
          <div className="hidden h-full justify-center md:flex"><TopNav menus={menus} /></div>
          <div className="md:hidden" />
          <div className="flex items-center justify-end gap-2">
            <SearchLauncher />
            <ProfileMenu profile={profile} signOut={signOut} />
          </div>
        </div>
      </header>
      <div className="mx-auto max-w-[1600px]">
        <main className="px-4 pb-24 pt-4 md:px-6 md:pb-8">{children}</main>
      </div>
      <nav className="fixed inset-x-0 bottom-0 z-20 flex border-t border-line-hair bg-surface md:hidden" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
        <NavLinks links={mobile} mobile />
      </nav>
    </div>
  );
}
