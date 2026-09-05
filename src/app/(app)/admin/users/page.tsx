import { redirect } from "next/navigation";
import { Alert, PageHeader } from "@/components/ui";
import { SubmitButton } from "@/components/ui/SubmitButton";

import { requireProfile } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { ROLE_LABELS, type Profile } from "@/lib/types";
import { inviteUser, setRole } from "./actions";

export const metadata = { title: "Utilisateurs" };

export default async function UsersPage({ searchParams }: { searchParams: Promise<{ error?: string; ok?: string }> }) {
  const me = await requireProfile();
  if (me.role !== "admin") redirect("/dashboard");
  const { error, ok } = await searchParams;
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("id,email,full_name,role,created_at").order("created_at");
  const users = (data ?? []) as (Profile & { created_at: string })[];
  return (
    <>
      <PageHeader title="Utilisateurs" subtitle="Invitez les chefs de projet, lecteurs et equipes terrain" />
      {error && <div className="mb-4"><Alert>{error}</Alert></div>}
      {ok && <div className="mb-4"><Alert tone="green">{ok}</Alert></div>}
      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="card overflow-hidden">
          <table className="tbl">
            <thead><tr><th className="px-4 py-2">Nom</th><th className="px-4 py-2">Email</th><th className="px-4 py-2">Role</th></tr></thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td className="px-4 py-2 font-semibold">{u.full_name || "—"}</td>
                  <td className="px-4 py-2 text-ink-body">{u.email}</td>
                  <td className="px-4 py-2">
                    {u.id === me.id ? ROLE_LABELS[u.role] : (
                      <form action={setRole} className="flex items-center gap-2">
                        <input type="hidden" name="id" value={u.id} />
                        <select name="role" defaultValue={u.role} className="input !w-auto !py-1">
                          {Object.entries(ROLE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                        </select>
                        <SubmitButton className="btn-secondary !py-1 !text-[10px]" pendingText="…">OK</SubmitButton>
                      </form>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <form action={inviteUser} className="card h-fit space-y-3 p-4">
          <div className="text-[10.5px] font-semibold">Inviter un utilisateur</div>
          <div><label className="label">Email</label><input name="email" type="email" required className="input" /></div>
          <div><label className="label">Nom complet</label><input name="full_name" className="input" /></div>
          <div><label className="label">Role</label>
            <select name="role" defaultValue="viewer" className="input">{Object.entries(ROLE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div>
          <SubmitButton className="btn-primary w-full" pendingText="Envoi…">Envoyer l&apos;invitation</SubmitButton>
          <p className="text-[10px] text-ink-muted">La personne recoit un email avec un lien pour choisir son mot de passe.</p>
        </form>
      </div>
    </>
  );
}
