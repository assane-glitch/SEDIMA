import { Alert, Badge, PageHeader } from "@/components/ui";
import { SubmitButton } from "@/components/ui/SubmitButton";

import { formatDate, today } from "@/lib/format";
import { canEdit, canSubmit, requireProfile } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import type { JournalEntry } from "@/lib/types";
import { addJournalEntry } from "../../actions";
import { ProjectTabs } from "../ProjectTabs";
import { loadProject } from "../loadProject";

export default async function JournalPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string; ok?: string }> }) {
  const { id } = await params;
  const { error, ok } = await searchParams;
  const profile = await requireProfile();
  const { project, tasks, people } = await loadProject(id);
  const supabase = await createClient();
  const { data } = await supabase.from("journal_entries").select("*").eq("project_id", id).order("entry_date", { ascending: false }).order("created_at", { ascending: false }).limit(200);
  const entries = (data ?? []) as JournalEntry[];
  const taskName = new Map(tasks.map((t) => [t.id, t.name]));
  const who = new Map(people.map((p) => [p.id, p.full_name || p.email]));

  return (
    <>
      <PageHeader title={project.name} subtitle="Journal de terrain" />
      <ProjectTabs id={id} canEdit={canEdit(profile)} />
      {error && <div className="mb-4"><Alert>{error}</Alert></div>}
      {ok && <div className="mb-4"><Alert tone="green">Entree enregistree.</Alert></div>}
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-3">
          {entries.map((e) => (
            <article key={e.id} className="card p-4">
              <div className="mb-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <span className="font-medium text-slate-700">{formatDate(e.entry_date)}</span>
                <span>{e.author_id ? who.get(e.author_id) : "—"}</span>
                {e.location && <span>· {e.location}</span>}
                {e.task_id && <Badge>{taskName.get(e.task_id)}</Badge>}
                {e.source === "mobile" && <Badge tone="blue">mobile</Badge>}
              </div>
              <p className="whitespace-pre-wrap text-sm">{e.content}</p>
            </article>
          ))}
          {entries.length === 0 && <div className="card px-4 py-8 text-center text-sm text-slate-500">Aucune entree de journal.</div>}
        </div>
        {canSubmit(profile) && (
          <form action={addJournalEntry} className="card h-fit space-y-3 p-4">
            <div className="text-sm font-medium">Nouvelle entree</div>
            <input type="hidden" name="project_id" value={id} />
            <div><label className="label">Date</label><input name="entry_date" type="date" required defaultValue={today()} className="input" /></div>
            <div><label className="label">Tache</label><select name="task_id" className="input"><option value="">—</option>{tasks.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select></div>
            <div><label className="label">Lieu</label><input name="location" className="input" /></div>
            <div><label className="label">Compte rendu</label><textarea name="content" rows={5} required className="input" /></div>
            <SubmitButton className="btn-primary w-full">Enregistrer</SubmitButton>
          </form>
        )}
      </div>
    </>
  );
}
