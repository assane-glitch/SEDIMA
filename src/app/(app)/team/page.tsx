import Link from "next/link";
import { Badge, PageHeader } from "@/components/ui";
import { formatDate, today } from "@/lib/format";
import { requireProfile } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { ROLE_LABELS, type Profile, type Project, type Task } from "@/lib/types";

export const metadata = { title: "Équipe" };
const addDays = (iso: string, n: number) => { const d = new Date(iso + "T00:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };

export default async function TeamPage() {
  const me = await requireProfile();
  const supabase = await createClient();
  const t0 = today(), monday = addDays(t0, -((new Date(t0 + "T00:00:00Z").getUTCDay() + 6) % 7)), sunday = addDays(monday, 6), ago30 = new Date(Date.now() - 30 * 86400000).toISOString();
  const [{ data: people }, { data: projects }, { data: tasks }, { data: jr }, { data: rg }, { data: ex }] = await Promise.all([
    supabase.from("profiles").select("id,email,full_name,role").order("full_name"),
    supabase.from("projects").select("id,code,name,status,manager_id,manager_name").neq("status", "hors_perimetre").order("code"),
    supabase.from("tasks").select("id,project_id,parent_id,name,wbs_code,status,start_date,end_date,responsible_id,responsible_role,progress"),
    supabase.from("journal_entries").select("author_id").gte("created_at", ago30),
    supabase.from("register_entries").select("author_id").gte("created_at", ago30),
    supabase.from("expenses").select("created_by").gte("created_at", ago30),
  ]);
  const list = (people ?? []) as Profile[];
  const projs = (projects ?? []) as Pick<Project, "id" | "code" | "name" | "status" | "manager_id" | "manager_name">[];
  const all = (tasks ?? []) as Pick<Task, "id" | "project_id" | "parent_id" | "name" | "wbs_code" | "status" | "start_date" | "end_date" | "responsible_id" | "responsible_role" | "progress">[];
  const parents = new Set(all.filter((t) => t.parent_id).map((t) => t.parent_id!));
  const leaves = all.filter((t) => !parents.has(t.id));
  const entries = new Map<string, number>();
  for (const r of [...(jr ?? []).map((x) => x.author_id), ...(rg ?? []).map((x) => x.author_id), ...(ex ?? []).map((x) => x.created_by)]) if (r) entries.set(r, (entries.get(r) ?? 0) + 1);
  const rows = list.map((p) => {
    const mine = leaves.filter((t) => t.responsible_id === p.id), open = mine.filter((t) => t.status !== "done");
    return { p, managed: projs.filter((x) => x.manager_id === p.id), open, late: open.filter((t) => t.end_date < t0), week: open.filter((t) => t.start_date <= sunday && t.end_date >= monday), done: mine.length - open.length, entries: entries.get(p.id) ?? 0 };
  });
  const byRole = new Map<string, { open: number; late: number; projects: Set<string> }>();
  for (const t of leaves.filter((t) => !t.responsible_id && t.responsible_role && t.status !== "done")) { const r = byRole.get(t.responsible_role) ?? { open: 0, late: 0, projects: new Set<string>() }; r.open++; if (t.end_date < t0) r.late++; r.projects.add(t.project_id); byRole.set(t.responsible_role, r); }
  const pcode = new Map(projs.map((p) => [p.id, p.code]));

  return (
    <>
      <PageHeader title="Équipe" subtitle={`${list.length} membre${list.length > 1 ? "s" : ""} · charge et responsabilites`} actions={me.role === "admin" ? <Link href="/admin/users" className="btn-secondary">Inviter, gerer les roles</Link> : undefined} />
      <div className="card overflow-x-auto">
        <table className="tbl">
          <thead><tr><th>Membre</th><th className="hidden md:table-cell">Role</th><th>Projets geres</th><th className="num">Taches ouvertes</th><th className="num">En retard</th><th className="num hidden md:table-cell">Cette semaine</th><th className="num hidden lg:table-cell">Terminees</th><th className="num hidden lg:table-cell">Saisies 30 j</th></tr></thead>
          <tbody>
            {rows.map(({ p, managed, open, late, week, done, entries: n }) => (
              <tr key={p.id}>
                <td><div className="flex items-center gap-2.5"><div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-ink text-[10px] font-bold text-surface">{(p.full_name || p.email).slice(0, 1).toUpperCase()}</div><div className="min-w-0"><div className="truncate font-semibold text-ink">{p.full_name || "—"}{p.id === me.id && <span className="ml-1.5 text-[9px] font-normal text-ink-faint">vous</span>}</div><div className="truncate text-[9.5px] text-ink-muted">{p.email}</div></div></div></td>
                <td className="hidden md:table-cell"><Badge tone={p.role === "admin" ? "info" : p.role === "manager" ? "ok" : "neutral"}>{ROLE_LABELS[p.role]}</Badge></td>
                <td>{managed.length ? <div className="flex flex-wrap gap-1">{managed.map((x) => <Link key={x.id} href={`/projects/${x.id}`} className="chip chip-neutral hover:bg-surface-alt" title={x.name}>{x.code}</Link>)}</div> : <span className="text-ink-faint">—</span>}</td>
                <td className="num">{open.length ? <Link href="/tasks" className="font-semibold hover:underline">{open.length}</Link> : <span className="text-ink-faint">—</span>}</td>
                <td className={`num ${late.length ? "font-bold text-alert" : "text-ink-faint"}`}>{late.length || "—"}</td>
                <td className="num hidden md:table-cell">{week.length || <span className="text-ink-faint">—</span>}</td>
                <td className="num hidden text-ink-muted lg:table-cell">{done || "—"}</td>
                <td className="num hidden text-ink-muted lg:table-cell">{n || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {byRole.size > 0 && (
        <div className="card mt-4 overflow-x-auto">
          <div className="px-[15px] pb-1 pt-[13px]"><div className="card-title">Roles non rattaches a un compte</div><p className="hint">Taches dont le responsable est un role du referentiel. Pour les rattacher, choisissez un compte dans la fiche de la tache ou invitez la personne avec le meme nom.</p></div>
          <table className="tbl"><thead><tr><th>Role</th><th className="num">Taches ouvertes</th><th className="num">En retard</th><th>Projets</th></tr></thead><tbody>
            {[...byRole.entries()].sort((a, b) => b[1].open - a[1].open).map(([role, r]) => <tr key={role}><td className="font-semibold">{role}</td><td className="num">{r.open}</td><td className={`num ${r.late ? "font-bold text-alert" : "text-ink-faint"}`}>{r.late || "—"}</td><td className="text-ink-muted">{[...r.projects].map((id) => pcode.get(id)).filter(Boolean).sort().join(", ")}</td></tr>)}
          </tbody></table>
        </div>
      )}
      {(() => { const late = rows.flatMap((r) => r.late.map((t) => ({ t, who: r.p }))).sort((a, b) => a.t.end_date.localeCompare(b.t.end_date)).slice(0, 10); return late.length ? (
        <div className="card mt-4"><div className="px-[15px] pb-1 pt-[13px]"><div className="card-title">Retards par personne</div></div>
          <div className="divide-y divide-line-light text-[10.5px]">{late.map(({ t, who }) => <Link key={t.id} href={`/projects/${t.project_id}/tasks`} className="flex items-center gap-2 px-3 py-1.5 hover:bg-surface-alt"><span className="w-28 shrink-0 truncate font-semibold">{who.full_name || who.email}</span><span className="w-12 shrink-0">{pcode.get(t.project_id)}</span><span className="min-w-0 flex-1 truncate">{t.wbs_code ? `${t.wbs_code} · ` : ""}{t.name}</span><span className="shrink-0 font-semibold tabular-nums text-alert">{formatDate(t.end_date)}</span></Link>)}</div></div>
      ) : null; })()}
    </>
  );
}
