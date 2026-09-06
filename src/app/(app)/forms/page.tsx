import Link from "next/link";
import { Alert, PageHeader } from "@/components/ui";
import { Inbox, type InboxItem } from "@/components/forms/Inbox";
import { formatMoney } from "@/lib/format";
import { getLists } from "@/lib/reference";
import { labelOf, registerFields, toneOf } from "@/lib/reference-types";
import { canSubmit, requireProfile } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import type { Expense, JournalEntry, Profile, Project, RegisterEntry } from "@/lib/types";
import { InstallHint } from "./InstallHint";

export const metadata = { title: "Formulaires" };

export default async function FormsHome({ searchParams }: { searchParams: Promise<{ ok?: string }> }) {
  const { ok } = await searchParams;
  const profile = await requireProfile();
  const supabase = await createClient();
  const [{ data: projects }, { data: people }, { data: journal }, { data: registers }, { data: expenses }, lists] = await Promise.all([
    supabase.from("projects").select("id,code,name,status,currency").neq("status", "hors_perimetre").order("code"),
    supabase.from("profiles").select("id,email,full_name,role").order("full_name"),
    supabase.from("journal_entries").select("*").order("created_at", { ascending: false }).limit(400),
    supabase.from("register_entries").select("*").order("created_at", { ascending: false }).limit(400),
    supabase.from("expenses").select("*").order("created_at", { ascending: false }).limit(400),
    getLists(),
  ]);
  const projs = (projects ?? []) as Pick<Project, "id" | "code" | "name" | "status" | "currency">[];
  const pmap = new Map(projs.map((p) => [p.id, p]));
  const who = new Map(((people ?? []) as Profile[]).map((p) => [p.id, p.full_name || p.email]));
  const regTypes = new Map(lists.register_type.map((r) => [r.value, { label: r.label, fields: registerFields(r) }]));
  const items: InboxItem[] = [
    ...((journal ?? []) as JournalEntry[]).map((e) => ({ id: e.id, kind: "journal" as const, at: e.created_at, date: e.entry_date, projectId: e.project_id, authorId: e.author_id, source: e.source, title: e.content.slice(0, 140), detail: e.location })),
    ...((registers ?? []) as RegisterEntry[]).map((e) => { const t = regTypes.get(e.register_type); return { id: e.id, kind: "register" as const, at: e.created_at, date: e.entry_date, projectId: e.project_id, authorId: e.author_id, source: e.source, title: t?.label ?? e.register_type, detail: Object.entries(e.data).map(([k, v]) => `${t?.fields.find((f) => f.key === k)?.label ?? k} : ${v}`).join(" · ") }; }),
    ...((expenses ?? []) as Expense[]).map((e) => ({ id: e.id, kind: "expense" as const, at: e.created_at, date: e.spent_on, projectId: e.project_id, authorId: e.created_by, source: e.source, title: `${e.ref} · ${e.description}`, detail: [e.supplier, e.da_number, labelOf(lists.expense_category, e.category)].filter(Boolean).join(" · "), amount: formatMoney(Number(e.amount), pmap.get(e.project_id)?.currency), status: labelOf(lists.expense_status, e.status), tone: toneOf(lists.expense_status, e.status) })),
  ].filter((i) => pmap.has(i.projectId)).map((i) => ({ ...i, projectCode: pmap.get(i.projectId)!.code, projectName: pmap.get(i.projectId)!.name, author: (i.authorId && who.get(i.authorId)) || "—" })).sort((a, b) => (a.at < b.at ? 1 : -1));
  const authorIds = new Set(items.map((i) => i.authorId).filter(Boolean));
  const authors = [...authorIds].map((id) => ({ id: id!, name: who.get(id!) ?? "—" })).sort((a, b) => a.name.localeCompare(b.name, "fr"));
  const active = projs.filter((p) => ["cadrage", "approuve", "engage", "execution"].includes(p.status));
  const isField = profile.role === "field";
  const actions = [
    { href: "/forms/journal", label: "Journal du jour", hint: "Compte rendu, effectifs, difficultes", icon: "✎" },
    { href: "/forms/register", label: "Registre", hint: "Presence, materiel, livraison, incident", icon: "☰" },
    { href: "/forms/expense", label: "Depense", hint: "Designation, montant, fournisseur, DA", icon: "¤" },
  ];

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title="Formulaires" subtitle="Saisies de terrain : journal, registres et depenses. Chaque saisie est definitive et tracee." />
      <InstallHint />
      {ok && <div className="mb-4"><Alert tone="green">Saisie enregistree. Merci.</Alert></div>}
      {!canSubmit(profile) && <div className="mb-4"><Alert tone="amber">Votre compte est en lecture seule.</Alert></div>}
      {canSubmit(profile) && (
        <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {actions.map((a) => (
            <Link key={a.href} href={a.href} className="card flex items-center gap-4 px-4 py-4 hover:bg-surface-alt active:bg-surface-alt">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-ink text-[15px] text-surface">{a.icon}</span>
              <div><div className="font-semibold">{a.label}</div><div className="text-[10px] text-ink-muted">{a.hint}</div></div>
            </Link>
          ))}
        </div>
      )}
      <Inbox items={items} meId={profile.id} defaultMode={isField ? "mine" : "all"} projects={projs} authors={authors} />
      {active.length > 0 && (
        <details className="mt-5">
          <summary className="cursor-pointer text-[10px] font-semibold uppercase tracking-[.06em] text-ink-faint">Saisir par projet ({active.length})</summary>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {active.map((p) => <Link key={p.id} href={`/forms/${p.id}`} className="card flex items-center justify-between px-4 py-3 hover:bg-surface-alt"><div><div className="font-semibold">{p.name}</div><div className="text-[10px] text-ink-muted">{p.code}</div></div><span className="text-ink-faint">›</span></Link>)}
          </div>
        </details>
      )}
    </div>
  );
}
