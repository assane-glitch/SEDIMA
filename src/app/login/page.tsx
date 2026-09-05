import Image from "next/image";
import { Alert } from "@/components/ui";
import { SubmitButton } from "@/components/ui/SubmitButton";

import { signIn } from "./actions";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string; next?: string; info?: string }> }) {
  const { error, next, info } = await searchParams;
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="card w-full max-w-sm p-7">
        <div className="mb-8">
          <Image src="/brand/logo-horizontal.png" alt="SEDIMA" width={200} height={43} priority />
          <div className="mt-2 text-[10.5px] text-ink-muted">Gestion de projets</div>
        </div>
        <form action={signIn} className="space-y-4">
          <input type="hidden" name="next" value={next ?? "/dashboard"} />
          {error && <Alert>{error}</Alert>}
          {info && <Alert tone="green">{info}</Alert>}
          <div>
            <label className="label" htmlFor="email">Email</label>
            <input id="email" name="email" type="email" required autoComplete="email" className="input" />
          </div>
          <div>
            <label className="label" htmlFor="password">Mot de passe</label>
            <input id="password" name="password" type="password" required autoComplete="current-password" className="input" />
          </div>
          <SubmitButton className="btn-primary w-full" pendingText="Connexion…">Se connecter</SubmitButton>
        </form>
        <p className="mt-6 text-[10px] text-ink-muted">Acces sur invitation. Contactez un administrateur pour obtenir un compte.</p>
      </div>
    </main>
  );
}
