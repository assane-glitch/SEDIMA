import Link from "next/link";
import { Badge, CategoryIcon, PageHeader } from "@/components/ui";
import { formatDate, formatMoney } from "@/lib/format";
import { getLists } from "@/lib/reference";
import { labelOf } from "@/lib/reference-types";
import { requireProfile } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { PROJECT_STATUS_LABELS, PROJECT_STATUS_TONE, ROLE_LABELS, TASK_STATUS_LABELS, type Document, type Expense, type JournalEntry, type Milestone, type Profile, type Project, type RegisterEntry, type Task } from "@/lib/types";

export const metadata = { title: "Recherche" };

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  await requireProfile();
  const needle = q.trim();
  const like = `%${needle.replace(/[%_,()\\]/g, " ").trim()}%`;
  const supabase = await createClient();
  const empty = { data: [] as never[] };
  const [{ data: projects }, { data: tasks }, { data: ms }, { data: ex }, { data: jr }, { data: rg }, { data: docs }, { data: people }, { data: allProjects }, lists] = needle.length < 2
    ? [empty, empty, empty, empty, empty, empty, empty, empty, empty, await getLists()]
    : await Promise.all([
      supabase.from("projects").select("*").or(`code.ilike.${like},name.ilike.${like},description.ilike.${like},site.ilike.${like},manager_name.ilike.${like}`).limit(20),
      supabase.from("tasks").select("*").or(`name.ilike.${like},wbs_code.ilike.${like},notes.ilike.${like},responsible_role.ilike.${like}`).limit(30),
      supabase.from("milestones").select("*").or(`name.ilike.${like},notes.ilike.${like}`).limit(20),
      supabase.from("expenses").select("*").or(`ref.ilike.${like},description.ilike.${like},supplier.ilike.${like},da_number.ilike.${like}`).limit(30),
      supabase.from("journal_entries").select("*").or(`content.ilike.${like},location.ilike.${like}`).order("entry_date", { ascending: false }).limit(20),
      supabase.from("register_entries").select("*").or(`register_type.ilike.${like},data::text.ilike.${like}`).order("entry_date", { ascending: false }).limit(20),
      supabase.from("documents").select("*").ilike("name", like).limit(20),
      supabase.from("profiles").select("id,email,full_name,role").or(`full_name.ilike.${like},email.ilike.${like}`).limit(10),
      supabase.from("projects").select("id,code,name,currency"),
      getLists(),
    ]);
  const pmap = new Map(((allProjects ?? []) as { id: string; code: string; name: string; currency: string }[]).map((p) => [p.id, p]));
  const code = (id: string) => pmap.get(id)?.code ?? "";
  const groups = [
    { label: "Projets", n: (projects ?? []).length }, { label: "Taches", n: (tasks ?? []).length }, { label: "Jalons", n: (ms ?? []).length }, { label: "Depenses", n: (ex ?? []).length },
    { label: "Journal", n: (jr ?? []).length }, { label: "Registres", n: (rg ?? []).length }, { label: "Documents", n: (docs ?? []).length }, { label: "Equipe", n: (people ?? []).length },
  ];
  const total = groups.reduce((s, g) => s + g.n, 0);
  const Section = ({ title, n, children }: { title: string; n: number; children: React.ReactNode }) => n > 0 ? (
    <section className="card"><div className="flex items-center gap-2 border-b border-line-hair px-[15px] py-2"><span className="card-title">{title}</span><span className="text-[10px] text-ink-faint">{n}</span></div><div className="divide-y divide-line-light text-[10.5px]">{children}</div></section>
  ) : null;
  const Row = ({ href, children }: { href: string; children: React.ReactNode }) => <Link href={href} className="flex items-center gap-3 px-[15px] py-2 hover:bg-surface-alt">{children}</Link>;

  return (
    <>
      <PageHeader crumbs={[{ href: "/dashboard", label: "Tableau de bord" }]} title={needle ? `Resultats pour « ${needle} »` : "Recherche"} subtitle={needle.length < 2 ? "Tapez au moins deux caracteres dans la barre de recherche en haut de page. Raccourci : touche / ou Ctrl K." : `${total} resultat${total > 1 ? "s" : ""} · ${groups.filter((g) => g.n).map((g) => `${g.label} ${g.n}`).join(" · ") || "aucun"}`} />
      {needle.length >= 2 && total === 0 && <div className="card px-4 py-10 text-center text-[10.5px] text-ink-faint">Aucun resultat. Essayez un code (PI-03, L2.1, D00001), un mot du nom ou un fournisseur.</div>}
      <div className="grid gap-4 xl:grid-cols-2">
        <Section title="Projets" n={(projects ?? []).length}>
          {((projects ?? []) as Project[]).map((p) => <Row key={p.id} href={`/projects/${p.id}`}><CategoryIcon category={p.category} className="h-4 w-4" /><span className="font-mono font-semibold">{p.code}</span><span className="min-w-0 flex-1 truncate font-semibold text-ink">{p.name}</span><Badge tone={PROJECT_STATUS_TONE[p.status]}>{PROJECT_STATUS_LABELS[p.status]}</Badge><span className="text-ink-muted">{formatMoney(Number(p.budget), p.currency)}</span></Row>)}
        </Section>
        <Section title="Taches" n={(tasks ?? []).length}>
          {((tasks ?? []) as Task[]).map((t) => <Row key={t.id} href={`/projects/${t.project_id}/tasks`}><span className="w-12 shrink-0 font-semibold">{code(t.project_id)}</span><span className="font-mono text-[9.5px] text-ink-faint">{t.wbs_code}</span><span className="min-w-0 flex-1 truncate font-semibold text-ink">{t.name}</span><span className="text-ink-muted">{TASK_STATUS_LABELS[t.status]} · {t.progress} %</span><span className="whitespace-nowrap tabular-nums text-ink-faint">{formatDate(t.start_date)} → {formatDate(t.end_date)}</span></Row>)}
        </Section>
        <Section title="Jalons" n={(ms ?? []).length}>
          {((ms ?? []) as Milestone[]).map((m) => <Row key={m.id} href={`/projects/${m.project_id}/planning`}><span className="w-12 shrink-0 font-semibold">{code(m.project_id)}</span><span className="inline-block h-2 w-2 rotate-45 border border-ink bg-surface" /><span className="min-w-0 flex-1 truncate font-semibold text-ink">{m.name}</span><span className="tabular-nums text-ink-muted">{formatDate(m.due_date)}</span>{m.reached_on ? <Badge tone="ok">atteint</Badge> : null}</Row>)}
        </Section>
        <Section title="Depenses" n={(ex ?? []).length}>
          {((ex ?? []) as Expense[]).map((e) => <Row key={e.id} href={`/projects/${e.project_id}/events?type=expenses`}><span className="w-12 shrink-0 font-semibold">{code(e.project_id)}</span><span className="font-mono text-[9.5px]">{e.ref}</span><span className="min-w-0 flex-1 truncate font-semibold text-ink">{e.description}</span><span className="text-ink-muted">{e.supplier}</span><span className="tabular-nums">{formatMoney(Number(e.amount), pmap.get(e.project_id)?.currency)}</span><Badge>{labelOf(lists.expense_status, e.status)}</Badge></Row>)}
        </Section>
        <Section title="Journal de chantier" n={(jr ?? []).length}>
          {((jr ?? []) as JournalEntry[]).map((e) => <Row key={e.id} href={`/projects/${e.project_id}/events?type=journal`}><span className="w-12 shrink-0 font-semibold">{code(e.project_id)}</span><span className="tabular-nums text-ink-muted">{formatDate(e.entry_date)}</span><span className="min-w-0 flex-1 truncate">{e.content}</span>{e.location && <span className="text-ink-faint">{e.location}</span>}</Row>)}
        </Section>
        <Section title="Registres" n={(rg ?? []).length}>
          {((rg ?? []) as RegisterEntry[]).map((e) => <Row key={e.id} href={`/projects/${e.project_id}/events?type=registers`}><span className="w-12 shrink-0 font-semibold">{code(e.project_id)}</span><span className="tabular-nums text-ink-muted">{formatDate(e.entry_date)}</span><Badge>{labelOf(lists.register_type, e.register_type)}</Badge><span className="min-w-0 flex-1 truncate text-ink-muted">{Object.entries(e.data).map(([k, v]) => `${k} : ${v}`).join(" · ")}</span></Row>)}
        </Section>
        <Section title="Documents" n={(docs ?? []).length}>
          {((docs ?? []) as Document[]).map((d) => <Row key={d.id} href={`/projects/${d.project_id}/documents`}><span className="w-12 shrink-0 font-semibold">{code(d.project_id)}</span><span className="min-w-0 flex-1 truncate font-semibold text-ink">{d.name}</span><Badge>{labelOf(lists.doc_type, d.doc_type)}</Badge><span className="tabular-nums text-ink-faint">{formatDate(d.created_at.slice(0, 10))}</span></Row>)}
        </Section>
        <Section title="Equipe" n={(people ?? []).length}>
          {((people ?? []) as Profile[]).map((p) => <Row key={p.id} href="/team"><div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-ink text-[9px] font-bold text-surface">{(p.full_name || p.email).slice(0, 1).toUpperCase()}</div><span className="min-w-0 flex-1 truncate font-semibold text-ink">{p.full_name || "—"}</span><span className="text-ink-muted">{p.email}</span><Badge>{ROLE_LABELS[p.role]}</Badge></Row>)}
        </Section>
      </div>
    </>
  );
}
