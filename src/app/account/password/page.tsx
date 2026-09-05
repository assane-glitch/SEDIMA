import { Alert } from "@/components/ui";
import { requireProfile } from "@/lib/session";
import { setPassword } from "./actions";

export default async function PasswordPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const profile = await requireProfile();
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="card w-full max-w-sm p-8">
        <h1 className="text-xl font-semibold">Bienvenue sur SEDIMA</h1>
        <p className="mt-1 text-sm text-slate-500">Choisissez votre mot de passe pour {profile.email}.</p>
        <form action={setPassword} className="mt-6 space-y-4">
          {error && <Alert>{error}</Alert>}
          <div>
            <label className="label" htmlFor="full_name">Nom complet</label>
            <input id="full_name" name="full_name" defaultValue={profile.full_name} className="input" />
          </div>
          <div>
            <label className="label" htmlFor="password">Nouveau mot de passe</label>
            <input id="password" name="password" type="password" minLength={8} required autoComplete="new-password" className="input" />
          </div>
          <button type="submit" className="btn-primary w-full">Enregistrer</button>
        </form>
      </div>
    </main>
  );
}
