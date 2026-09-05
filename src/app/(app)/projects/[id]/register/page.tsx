import { Alert, Badge, PageHeader } from "@/components/ui";
import { formatDate } from "@/lib/format";
import { canEdit, requireProfile } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { REGISTER_TYPES, type RegisterEntry } from "@/lib/types";
import { ProjectTabs } from "../ProjectTabs";
import { loadProject } from "../loadProject";
import Link from "next/link";

export default async function RegisterPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ type?: string; ok?: string }> }) {
  const { id } = await params;
  const { type, ok } = await searchParams;
  const profile = await requireProfile();
  const { project, tasks, people } = await loadProject(id);
  const supabase = await createClient();
  let q = supabase.from("register_entries").select("*").eq("project_id", id).order("entry_date", { ascending: false }).order("created_at", { ascending: false }).limit(300);
  if (type) q = q.eq("register_type", type);
  const { data } = await q;
  const entries = (data ?? []) as RegisterEntry[];
  const taskName = new Map(tasks.map((t) => [t.id, t.name]));
  const who = new Map(people.map((p) => [p.id, p.full_name || p.email]));
  const typeLabel = new Map(REGISTER_TYPES.map((r) => [r.value, r.label]));

  return (
    <>
      <PageHeader title={project.name} subtitle="Registres" actions={<Link href={`/field/${id}/register`} className="btn-secondary">Saisir une entree</Link>} />
      <ProjectTabs id={id} canEdit={canEdit(profile)} />
      {ok && <div className="mb-4"><Alert tone="green">Entree enregistree.</Alert></div>}
      <div className="mb-4 flex flex-wrap gap-2">
        <Link href={`/projects/${id}/register`} className={`rounded-full px-3 py-1 text-xs ${!type ? "bg-slate-900 text-white" : "bg-white text-slate-700 border border-slate-300"}`}>Tous</Link>
        {REGISTER_TYPES.map((r) => <Link key={r.value} href={`/projects/${id}/register?type=${r.value}`} className={`rounded-full px-3 py-1 text-xs ${type === r.value ? "bg-slate-900 text-white" : "bg-white text-slate-700 border border-slate-300"}`}>{r.label}</Link>)}
      </div>
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr><th className="px-4 py-2">Date</th><th className="px-4 py-2">Registre</th><th className="px-4 py-2">Donnees</th><th className="hidden px-4 py-2 md:table-cell">Tache</th><th className="hidden px-4 py-2 md:table-cell">Saisi par</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {entries.map((e) => (
              <tr key={e.id}>
                <td className="whitespace-nowrap px-4 py-2">{formatDate(e.entry_date)}</td>
                <td className="px-4 py-2"><Badge tone="blue">{typeLabel.get(e.register_type) ?? e.register_type}</Badge></td>
                <td className="px-4 py-2 text-slate-700">{Object.entries(e.data).map(([k, v]) => <span key={k} className="mr-3 inline-block"><span className="text-slate-400">{k} :</span> {String(v)}</span>)}</td>
                <td className="hidden px-4 py-2 text-slate-600 md:table-cell">{e.task_id ? taskName.get(e.task_id) : "—"}</td>
                <td className="hidden px-4 py-2 text-slate-600 md:table-cell">{e.author_id ? who.get(e.author_id) : "—"}</td>
              </tr>
            ))}
            {entries.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-500">Aucune entree de registre.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
