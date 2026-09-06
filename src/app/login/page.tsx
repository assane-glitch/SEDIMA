import Image from "next/image";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { signIn } from "./actions";

export const metadata = { title: "Connexion · SEDIMA" };

/** Ecran d'accueil : photo plein ecran, panneau de connexion en filtre anthracite translucide, coupe par la diagonale jaune. */
export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string; next?: string; info?: string }> }) {
  const { error, next, info } = await searchParams;
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#1f2937] text-white">
      {/* Photo plein ecran */}
      <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: "url(/brand/login.jpg), linear-gradient(160deg, #2b3646, #10161f)" }} />
      {/* Filtre anthracite translucide sur la zone de connexion, avec la diagonale jaune */}
      <div className="absolute inset-y-0 left-0 w-full bg-[#1f2937]/85 backdrop-blur-[2px] lg:w-[58%] lg:[clip-path:polygon(0_0,100%_0,78%_100%,0_100%)]" />
      <svg className="pointer-events-none absolute inset-y-0 left-0 hidden h-full w-[58%] lg:block" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden><line x1="100" y1="0" x2="78" y2="100" stroke="#fcd814" style={{ strokeWidth: 3 }} vectorEffect="non-scaling-stroke" /></svg>

      {/* Contenu centre dans la zone filtree */}
      <div className="relative flex min-h-screen flex-col lg:w-[58%] lg:pr-[11%]">
        <div className="flex flex-1 items-center justify-center px-8 py-10 sm:px-14">
          <div className="w-full max-w-md">
            <Image src="/brand/logo-horizontal-white.png" alt="SEDIMA" width={190} height={41} priority className="h-12 w-auto" />
            <h1 className="mt-8 whitespace-nowrap text-[30px] font-bold leading-tight tracking-[-0.01em] sm:text-[36px]">Gestion de projets</h1>
            <div className="mt-2 whitespace-nowrap text-[10.5px] font-medium uppercase tracking-[0.2em] text-white/70 sm:text-[11.5px]">Projets d&apos;investissements 2026-2030</div>
            <div className="mt-5 h-[2px] w-24 bg-brand" />

            <form action={signIn} className="mt-9 space-y-7">
              <input type="hidden" name="next" value={next ?? "/dashboard"} />
              {error && <div className="rounded-md border border-brand/50 bg-brand/15 px-3 py-2 text-[11px]">{error}</div>}
              {info && <div className="rounded-md border border-white/20 bg-white/10 px-3 py-2 text-[11px]">{info}</div>}
              <div className="relative">
                <label htmlFor="email" className="block text-[10px] font-semibold uppercase tracking-[0.12em] text-white/60">Email</label>
                <input id="email" name="email" type="email" required autoComplete="email" placeholder="prenom.nom@sedima.sn"
                  className="peer w-full border-0 border-b border-white/30 bg-transparent py-2 pr-8 text-[15px] text-white outline-none placeholder:text-white/25 focus:border-white" />
                <svg viewBox="0 0 24 24" className="absolute bottom-2.5 right-0 h-4 w-4 text-white/45 peer-focus:text-white" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></svg>
              </div>
              <div className="relative">
                <label htmlFor="password" className="block text-[10px] font-semibold uppercase tracking-[0.12em] text-white/60">Mot de passe</label>
                <input id="password" name="password" type="password" required autoComplete="current-password" placeholder="••••••••"
                  className="peer w-full border-0 border-b border-white/30 bg-transparent py-2 pr-8 text-[15px] text-white outline-none placeholder:text-white/25 focus:border-white" />
                <svg viewBox="0 0 24 24" className="absolute bottom-2.5 right-0 h-4 w-4 text-white/45 peer-focus:text-white" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg>
              </div>
              <SubmitButton pendingText="Connexion…" className="mt-2 w-full cursor-pointer rounded-md bg-white py-3 text-[13px] font-bold text-[#1f2937] transition-colors hover:bg-[#fcd814] disabled:opacity-60">Se connecter</SubmitButton>
              <p className="text-[10.5px] text-white/55">Acces sur invitation. Mot de passe oublie ou pas encore de compte : contactez un administrateur SEDIMA.</p>
            </form>
          </div>
        </div>
        <div className="px-8 pb-6 text-center text-[10.5px] text-white/50 sm:px-14">SEDIMA <span className="mx-2">|</span> Gestion de projets <span className="mx-2">|</span> Confidentiel, usage interne</div>
      </div>
    </main>
  );
}
