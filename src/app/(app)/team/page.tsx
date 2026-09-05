import { PageHeader } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import { ROLE_LABELS, type Profile } from "@/lib/types";
export const metadata = { title: "Équipe" };
export default async function TeamPage() {
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("id,email,full_name,role").order("full_name");
  const people = (data ?? []) as Profile[];
  return (
    <>
      <PageHeader title="Équipe" subtitle={`${people.length} membre${people.length > 1 ? "s" : ""}`} />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {people.map((p) => (
          <div key={p.id} className="card flex items-center gap-3 px-4 py-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ink text-[10.5px] font-semibold text-white">{(p.full_name || p.email).slice(0, 1).toUpperCase()}</div>
            <div className="min-w-0"><div className="truncate font-semibold">{p.full_name || "—"}</div><div className="truncate text-[10px] text-ink-muted">{p.email} · {ROLE_LABELS[p.role]}</div></div>
          </div>
        ))}
      </div>
      <p className="mt-4 text-[10px] text-ink-muted">Charge de travail et taches par personne : etape 9.</p>
    </>
  );
}
