import Image from "next/image";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { signIn } from "./actions";

export const metadata = { title: "Connexion · SEDIMA" };

/** Ecran d'accueil : panneau anthracite (titre, formulaire) et photo coupee par une diagonale jaune. */
export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string; next?: string; info?: string }> }) {
  const { error, next, info } = await searchParams;
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#1f2937] text-white">
      {/* Photo a droite, coupee en diagonale ; remplacee par un fond sombre si /brand/login.jpg est absent */}
      <div className="absolute inset-y-0 right-0 hidden w-[52%] lg:block" style={{ clipPath: "polygon(22% 0, 100% 0, 100% 100%, 0 100%)" }}>
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: "url(/brand/login.jpg), linear-gradient(160deg, #2b3646 0%, #1a2230 60%, #10161f 100%)" }} />
        <div className="absolute inset-0 bg-gradient-to-t from-[#1f2937]/60 via-transparent to-transparent" />
      </div>
      {/* Diagonale jaune du logo */}
      <svg className="pointer-events-none absolute inset-y-0 right-0 hidden h-full w-[52%] lg:block" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden><line x1="22" y1="0" x2="0" y2="100" stroke="#fcd814" strokeWidth="0.45" vectorEffect="non-scaling-stroke" style={{ strokeWidth: 3 }} /></svg>

      <div className="relative flex min-h-screen flex-col justify-between px-8 py-8 sm:px-14 lg:w-[55%] lg:px-20">
        <Image src="/brand/logo-horizontal-white.png" alt="SEDIMA" width={190} height={41} priority className="h-9 w-auto" />

        <div className="my-12 max-w-md">
          <h1 className="text-[34px] font-bold leading-tight tracking-[-0.01em] sm:text-[42px]">Gestion de projets</h1>
          <div className="mt-2 text-[12px] font-medium uppercase tracking-[0.22em] text-white/70">Projets d&apos;investissements 2026-2030</div>
          <div className="mt-5 h-[2px] w-24 bg-brand" />

          <form action={signIn} className="mt-10 space-y-7">
            <input type="hidden" name="next" value={next ?? "/dashboard"} />
            {error && <div className="rounded-md border border-brand/50 bg-brand/15 px-3 py-2 text-[11px]">{error}</div>}
            {info && <div className="rounded-md border border-white/20 bg-white/10 px-3 py-2 text-[11px]">{info}</div>}
            <div className="group relative">
              <label htmlFor="email" className="block text-[10px] font-semibold uppercase tracking-[0.12em] text-white/60">Email</label>
              <input id="email" name="email" type="email" required autoComplete="email" placeholder="prenom.nom@sedima.sn"
                className="peer w-full border-0 border-b border-white/30 bg-transparent py-2 pr-8 text-[15px] text-white outline-none placeholder:text-white/25 focus:border-white" />
              <svg viewBox="0 0 24 24" className="absolute bottom-2.5 right-0 h-4 w-4 text-white/45 peer-focus:text-white" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></svg>
            </div>
            <div className="group relative">
              <label htmlFor="password" className="block text-[10px] font-semibold uppercase tracking-[0.12em] text-white/60">Mot de passe</label>
              <input id="password" name="password" type="password" required autoComplete="current-password" placeholder="••••••••"
                className="peer w-full border-0 border-b border-white/30 bg-transparent py-2 pr-8 text-[15px] text-white outline-none placeholder:text-white/25 focus:border-white" />
              <svg viewBox="0 0 24 24" className="absolute bottom-2.5 right-0 h-4 w-4 text-white/45 peer-focus:text-white" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg>
            </div>
            <SubmitButton pendingText="Connexion…" className="mt-2 w-full cursor-pointer rounded-md bg-white py-3 text-[13px] font-bold text-[#1f2937] transition-colors hover:bg-[#fcd814] disabled:opacity-60">Se connecter</SubmitButton>
            <p className="text-[10.5px] text-white/55">Acces sur invitation. Mot de passe oublie ou pas encore de compte : contactez un administrateur SEDIMA.</p>
          </form>
        </div>

        <div className="text-[10.5px] text-white/50">SEDIMA <span className="mx-2">|</span> Gestion de projets <span className="mx-2">|</span> Confidentiel, usage interne</div>
      </div>
    </main>
  );
}
