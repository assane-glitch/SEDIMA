import Link from "next/link";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui";
import { Icon } from "@/components/icons";
import { requireProfile } from "@/lib/session";
export const metadata = { title: "Administration" };
export default async function AdminPage() {
  const me = await requireProfile();
  if (me.role !== "admin") redirect("/dashboard");
  const items = [
    { href: "/admin/users", label: "Utilisateurs et roles", hint: "Inviter, changer les roles", ready: true },
    { href: "/admin/lists", label: "Listes de reference", hint: "Categories et statuts de depense, types de registre, methodes, roles, types de document", ready: true },
  ];
  return (
    <>
      <PageHeader title="Administration" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((i) => (
          <Link key={i.label} href={i.href} className={`card flex items-center justify-between px-4 py-4 ${i.ready ? "hover:bg-surface-alt" : "opacity-60"}`}>
            <div><div className="font-semibold">{i.label}</div><div className="text-[10px] text-ink-muted">{i.hint}</div></div>
            <Icon name="chevronRight" className="h-4 w-4 text-ink-faint" />
          </Link>
        ))}
      </div>
    </>
  );
}
