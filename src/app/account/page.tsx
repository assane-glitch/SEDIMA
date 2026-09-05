import Link from "next/link";
import Image from "next/image";
import { Alert } from "@/components/ui";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { requireProfile } from "@/lib/session";
import { ROLE_LABELS } from "@/lib/types";
import { updateName, updatePassword } from "./actions";

export const metadata = { title: "Mon compte" };

export default async function AccountPage({ searchParams }: { searchParams: Promise<{ error?: string; ok?: string }> }) {
  const { error, ok } = await searchParams;
  const profile = await requireProfile();
  return (
    <main className="mx-auto max-w-xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <Link href="/dashboard"><Image src="/brand/logo-horizontal.png" alt="SEDIMA" width={140} height={30} /></Link>
        <Link href="/dashboard" className="text-sm text-slate-500 hover:text-slate-900">‹ Retour a l&apos;application</Link>
      </div>
      <h1 className="text-2xl font-semibold tracking-tight">Mon compte</h1>
      <p className="mt-1 text-sm text-slate-500">{profile.email} · {ROLE_LABELS[profile.role]}</p>
      {error && <div className="mt-4"><Alert>{error}</Alert></div>}
      {ok && <div className="mt-4"><Alert tone="green">{ok}</Alert></div>}

      <form action={updateName} className="card mt-6 space-y-4 p-6">
        <h2 className="text-sm font-semibold">Identite</h2>
        <div>
          <label className="label" htmlFor="full_name">Nom complet</label>
          <input id="full_name" name="full_name" required minLength={2} defaultValue={profile.full_name} placeholder="Prenom Nom" className="input" />
          <p className="mt-1 text-xs text-slate-500">Ce nom apparait sur les projets, les taches et dans l&apos;historique. Utilisez la meme orthographe que dans le referentiel pour que vos projets vous soient rattaches.</p>
        </div>
        <div className="flex justify-end"><SubmitButton>Enregistrer le nom</SubmitButton></div>
      </form>

      <form action={updatePassword} className="card mt-4 space-y-4 p-6">
        <h2 className="text-sm font-semibold">Mot de passe</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div><label className="label" htmlFor="password">Nouveau mot de passe</label><input id="password" name="password" type="password" minLength={8} required autoComplete="new-password" className="input" /></div>
          <div><label className="label" htmlFor="confirm">Confirmation</label><input id="confirm" name="confirm" type="password" minLength={8} required autoComplete="new-password" className="input" /></div>
        </div>
        <div className="flex justify-end"><SubmitButton pendingText="Modification…">Changer le mot de passe</SubmitButton></div>
      </form>
    </main>
  );
}
