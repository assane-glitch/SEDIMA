import Link from "next/link";
import { notFound } from "next/navigation";
import { Alert, Badge, PageHeader } from "@/components/ui";
import { formatDate, formatMoney } from "@/lib/format";
import { requireProfile, canSubmit } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import type { Expense, JournalEntry, Project, RegisterEntry } from "@/lib/types";

export default async function FieldProject({ params, searchParams }: { params: Promise<{ projectId: string }>; searchParams: Promise<{ ok?: string }> }) {
  const { projectId } = await params;
  const { ok } = await searchParams;
  const profile = await requireProfile();
  const supabase = await createClient();
  const [{ data: project }, { data: journal }, { data: registers }, { data: expenses }] = await Promise.all([
    supabase.from("projects").select("*").eq("id", projectId).maybeSingle(),
    supabase.from("journal_entries").select("*").eq("project_id", projectId).eq("author_id", profile.id).order("created_at", { ascending: false }).limit(5),
    supabase.from("register_entries").select("*").eq("project_id", projectId).eq("author_id", profile.id).order("created_at", { ascending: false }).limit(5),
    supabase.from("expenses").select("*").eq("project_id", projectId).eq("created_by", profile.id).order("created_at", { ascending: false }).limit(5),
  ]);
  if (!project) notFound();
  const p = project as Project;
  const recent = [
    ...((journal ?? []) as JournalEntry[]).map((e) => ({ id: e.id, at: e.created_at, date: e.entry_date, kind: "Journal", text: e.content.slice(0, 80) })),
    ...((registers ?? []) as RegisterEntry[]).map((e) => ({ id: e.id, at: e.created_at, date: e.entry_date, kind: "Registre", text: e.register_type })),
    ...((expenses ?? []) as Expense[]).map((e) => ({ id: e.id, at: e.created_at, date: e.spent_on, kind: "Depense", text: formatMoney(Number(e.amount), p.currency) })),
  ].sort((a, b) => (a.at < b.at ? 1 : -1)).slice(0, 8);

  const actions = [
    { href: `/forms/${projectId}/journal`, label: "Journal", hint: "Compte rendu du jour", icon: "✎" },
    { href: `/forms/${projectId}/register`, label: "Registre", hint: "Presence, materiel, livraison, incident", icon: "☰" },
    { href: `/forms/${projectId}/expense`, label: "Depense", hint: "Montant et justificatif", icon: "¤" },
  ];

  return (
    <div className="mx-auto max-w-lg">
      <Link href="/forms" className="text-xs text-slate-500">‹ Projets</Link>
      <PageHeader title={p.name} subtitle={p.code} />
      {ok && <div className="mb-4"><Alert tone="green">Entree enregistree. Merci.</Alert></div>}
      {!canSubmit(profile) && <div className="mb-4"><Alert tone="amber">Votre compte est en lecture seule.</Alert></div>}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {actions.map((a) => (
          <Link key={a.href} href={a.href} className="card flex items-center gap-4 px-4 py-5 active:bg-slate-50 sm:flex-col sm:text-center">
            <span className="text-2xl text-brand-600">{a.icon}</span>
            <div><div className="font-medium">{a.label}</div><div className="text-xs text-slate-500">{a.hint}</div></div>
          </Link>
        ))}
      </div>
      {recent.length > 0 && (
        <div className="mt-6">
          <div className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Mes dernieres saisies</div>
          <div className="card divide-y divide-slate-100">
            {recent.map((r) => <div key={r.id} className="flex items-center gap-3 px-4 py-2 text-sm"><Badge>{r.kind}</Badge><span className="text-xs text-slate-500">{formatDate(r.date)}</span><span className="truncate">{r.text}</span></div>)}
          </div>
        </div>
      )}
    </div>
  );
}
