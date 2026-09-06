import Link from "next/link";
import { Badge } from "@/components/ui";
import { ExpenseForm } from "@/components/ExpenseForm";
import { ExpenseTable } from "@/components/ExpenseTable";
import { describeAudit, relativeTime } from "@/lib/audit";
import { formatDate, formatMoney } from "@/lib/format";
import { canEdit, canSubmit, requireProfile } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { REGISTER_TYPES, type AuditEntry, type Expense, type JournalEntry, type Milestone, type RegisterEntry } from "@/lib/types";
import { ProjectHeader } from "../ProjectHeader";
import { ProjectTabs } from "../ProjectTabs";
import { loadProject } from "../loadProject";

type Kind = "all" | "expenses" | "journal" | "register" | "milestones" | "changes";
const KINDS: { value: Kind; label: string }[] = [
  { value: "all", label: "Tous" }, { value: "expenses", label: "Depenses" }, { value: "journal", label: "Journal de terrain" },
  { value: "register", label: "Registres" }, { value: "milestones", label: "Jalons" }, { value: "changes", label: "Modifications" },
];

export default async function ProjectEventsPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ type?: string; ok?: string; error?: string }> }) {
  const { id } = await params;
  const sp = await searchParams;
  const kind = (KINDS.some((k) => k.value === sp.type) ? sp.type : "all") as Kind;
  const profile = await requireProfile();
  const { project, tasks, people } = await loadProject(id);
  const supabase = await createClient();
  const [{ data: exp }, { data: jr }, { data: rg }, { data: ms }, { data: au }] = await Promise.all([
    supabase.from("expenses").select("*").eq("project_id", id).order("spent_on", { ascending: false }).order("created_at", { ascending: false }),
    supabase.from("journal_entries").select("*").eq("project_id", id).order("entry_date", { ascending: false }).limit(300),
    supabase.from("register_entries").select("*").eq("project_id", id).order("entry_date", { ascending: false }).limit(300),
    supabase.from("milestones").select("*").eq("project_id", id).order("due_date"),
    supabase.from("audit_log").select("*").eq("project_id", id).order("changed_at", { ascending: false }).limit(200),
  ]);
  const expenses = (exp ?? []) as Expense[];
  const who = new Map(people.map((p) => [p.id, p.full_name || p.email]));
  const taskName = new Map(tasks.map((t) => [t.id, `${t.wbs_code ? t.wbs_code + " · " : ""}${t.name}`]));
  const typeLabel = new Map(REGISTER_TYPES.map((r) => [r.value, r.label]));
  const editor = canEdit(profile);

  // Fil unifie
  type Ev = { at: string; kind: Exclude<Kind, "all">; title: string; detail?: string; who?: string; tone?: string };
  const events: Ev[] = [
    ...expenses.map((e) => ({ at: e.spent_on, kind: "expenses" as const, title: `${e.ref} · ${e.description || e.category} · ${formatMoney(Number(e.amount), project.currency)}`, detail: [e.supplier, e.task_id ? taskName.get(e.task_id) : "Projet entier", e.da_number].filter(Boolean).join(" · "), who: e.created_by ? who.get(e.created_by) : undefined, tone: e.status === "annulee" ? "alert" : e.status === "payee" ? "ok" : "neutral" })),
    ...((jr ?? []) as JournalEntry[]).map((e) => ({ at: e.entry_date, kind: "journal" as const, title: e.content.length > 140 ? e.content.slice(0, 140) + "…" : e.content, detail: [e.location, e.task_id ? taskName.get(e.task_id) : ""].filter(Boolean).join(" · "), who: e.author_id ? who.get(e.author_id) : undefined })),
    ...((rg ?? []) as RegisterEntry[]).map((e) => ({ at: e.entry_date, kind: "register" as const, title: `Registre ${typeLabel.get(e.register_type) ?? e.register_type}`, detail: Object.entries(e.data).map(([k, v]) => `${k} : ${String(v)}`).join(" · "), who: e.author_id ? who.get(e.author_id) : undefined })),
    ...((ms ?? []) as Milestone[]).map((m) => ({ at: m.reached_on ?? m.due_date, kind: "milestones" as const, title: `${m.reached_on ? "Jalon atteint" : "Jalon prevu"} · ${m.name}`, detail: m.notes, tone: m.reached_on ? "ok" : "neutral" })),
    ...((au ?? []) as AuditEntry[]).filter((a) => a.table_name !== "expenses" || a.action !== "insert").map((a) => { const d = describeAudit(a, project.currency); return { at: a.changed_at, kind: "changes" as const, title: `${(a.changed_by && who.get(a.changed_by)) || "Systeme"} ${d.what}`, detail: d.details.join(" · ") }; }),
  ].sort((a, b) => (a.at < b.at ? 1 : -1));
  const shown = kind === "all" ? events : events.filter((e) => e.kind === kind);
  const KIND_LABEL: Record<Exclude<Kind, "all">, string> = { expenses: "Depense", journal: "Journal", register: "Registre", milestones: "Jalon", changes: "Modification" };

  return (
    <>
      <ProjectHeader project={project} manager={people.find((p) => p.id === project.manager_id)} />
      <ProjectTabs id={id} canEdit={editor} />
      {sp.ok && <div className="chip-ok mb-3">Depense enregistree.</div>}
      {sp.error && <div className="chip-alert mb-3">{sp.error}</div>}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {KINDS.map((k) => <Link key={k.value} href={`/projects/${id}/events${k.value === "all" ? "" : `?type=${k.value}`}`} className={`filter-chip ${kind === k.value ? "filter-chip-active" : ""}`}>{k.label}{k.value === "expenses" ? ` (${expenses.length})` : ""}</Link>)}
      </div>

      {kind === "expenses" ? (
        <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
          <ExpenseTable expenses={expenses} currency={project.currency} taskName={taskName} canEdit={editor} />
          {canSubmit(profile) && (
            <div className="card card-pad h-fit">
              <div className="card-title mb-3">Enregistrer une depense</div>
              <ExpenseForm projects={[{ id, code: project.code, name: project.name, currency: project.currency }]} tasks={tasks.map((t) => ({ id: t.id, name: t.name, wbs_code: t.wbs_code, parent_id: t.parent_id, project_id: id }))} projectId={id} redirect={`/projects/${id}/events?type=expenses`} />
            </div>
          )}
        </div>
      ) : (
        <div className="card">
          {shown.length === 0 ? <p className="hint px-4 py-8 text-center">Aucun evenement.</p> : (
            <ul className="divide-y divide-line-light">
              {shown.slice(0, 300).map((e, i) => (
                <li key={i} className="flex gap-3 px-4 py-2 text-[10.5px]">
                  <div className="w-20 shrink-0 whitespace-nowrap text-ink-muted" title={e.at}>{e.at.length > 10 ? relativeTime(e.at) : formatDate(e.at)}</div>
                  <div className="w-24 shrink-0"><Badge tone={e.tone ?? "neutral"}>{KIND_LABEL[e.kind]}</Badge></div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-semibold">{e.title}</div>
                    {(e.detail || e.who) && <div className="hint truncate">{[e.detail, e.who].filter(Boolean).join(" · ")}</div>}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </>
  );
}
