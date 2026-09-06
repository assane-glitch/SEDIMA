import { Alert, Badge } from "@/components/ui";
import { daysBetween, formatDate, formatDateLong } from "@/lib/format";
import { canEdit, requireProfile } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { CHANGE_STATUS_LABELS, type ChangeRequest, type ChangeRequestItem } from "@/lib/types";
import { ProjectHeader } from "../ProjectHeader";
import { ProjectTabs } from "../ProjectTabs";
import { loadProject } from "../loadProject";
import { ChangeRequestForm, type DriftTask } from "./ChangeRequestForm";
import { decideChangeRequest, deleteChangeRequest } from "./actions";

const TONE: Record<ChangeRequest["status"], string> = { soumise: "warn", approuvee: "ok", refusee: "alert" };

export default async function ChangesPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ ok?: string; error?: string }> }) {
  const { id } = await params;
  const { ok, error } = await searchParams;
  const profile = await requireProfile();
  const supabase = await createClient();
  const [{ project, tasks, people, favorite }, { data: reqs }, { data: items }] = await Promise.all([
    loadProject(id),
    supabase.from("change_requests").select("*").eq("project_id", id).order("requested_at", { ascending: false }),
    supabase.from("change_request_items").select("*"),
  ]);
  const who = new Map(people.map((p) => [p.id, p.full_name || p.email]));
  const tmap = new Map(tasks.map((t) => [t.id, t]));
  const parents = new Set(tasks.filter((t) => t.parent_id).map((t) => t.parent_id!));
  const drift: DriftTask[] = tasks.map((t) => ({ id: t.id, wbs_code: t.wbs_code, name: t.name, isLot: parents.has(t.id), start_date: t.start_date, end_date: t.end_date, baseline_start: t.baseline_start, baseline_end: t.baseline_end }));
  const list = (reqs ?? []) as ChangeRequest[];
  const byReq = new Map<string, ChangeRequestItem[]>();
  for (const i of (items ?? []) as ChangeRequestItem[]) byReq.set(i.request_id, [...(byReq.get(i.request_id) ?? []), i]);
  const decider = profile.role === "admin" || project.manager_id === profile.id;
  const editor = canEdit(profile);
  const hasBaseline = tasks.some((t) => t.baseline_start);
  const pending = list.filter((r) => r.status === "soumise").length;

  return (
    <>
      <ProjectHeader project={project} manager={people.find((p) => p.id === project.manager_id)} favorite={favorite} />
      <ProjectTabs id={id} canEdit={editor} />
      {ok && <div className="mb-4"><Alert tone="ok">{ok}</Alert></div>}
      {error && <div className="mb-4"><Alert>{error}</Alert></div>}
      <div className="mb-4 flex flex-wrap items-baseline gap-3">
        <h2 className="text-[13.5px] font-bold">Registre des demandes de changement</h2>
        <span className="text-[10.5px] text-ink-muted">{list.length} demande{list.length > 1 ? "s" : ""}{pending ? ` · ${pending} en attente` : ""} · decision par {(project.manager_id && who.get(project.manager_id)) || "le chef de projet"} ou un administrateur</span>
      </div>
      {!hasBaseline && <div className="mb-4"><Alert tone="warn">Ce projet n&apos;a pas encore de planning de reference. Figez-le d&apos;abord depuis l&apos;onglet Planning ou Parametres.</Alert></div>}
      {editor && hasBaseline && <div className="mb-5"><ChangeRequestForm projectId={id} tasks={drift} /></div>}
      <div className="space-y-3">
        {list.length === 0 && <div className="card px-4 py-8 text-center text-[10.5px] text-ink-faint">Aucune demande de changement.</div>}
        {list.map((r) => { const its = byReq.get(r.id) ?? []; return (
          <details key={r.id} className="card" open={r.status === "soumise"}>
            <summary className="flex cursor-pointer flex-wrap items-center gap-3 px-[15px] py-3 text-[10.5px]">
              <span className="font-mono font-bold">{r.ref}</span>
              <Badge tone={TONE[r.status]}>{CHANGE_STATUS_LABELS[r.status]}</Badge>
              <span className="min-w-0 flex-1 truncate font-semibold text-ink">{r.title}</span>
              <span className="text-ink-muted">{its.length} tache{its.length > 1 ? "s" : ""} · {(r.requested_by && who.get(r.requested_by)) || "—"} · {formatDateLong(r.requested_at.slice(0, 10))}</span>
            </summary>
            <div className="border-t border-line-hair px-[15px] py-3 text-[10.5px]">
              {r.reason && <p className="mb-2 text-ink-body">{r.reason}</p>}
              <table className="tbl"><thead><tr><th className="w-14">WBS</th><th>Tache</th><th>Reference actuelle</th><th>Nouvelle reference</th><th className="num">Ecart fin</th></tr></thead><tbody>
                {its.map((i) => { const t = tmap.get(i.task_id); const d = i.old_end ? daysBetween(i.old_end, i.new_end) : null; return (
                  <tr key={i.task_id}><td className="font-mono text-[9.5px] text-ink-faint">{t?.wbs_code}</td><td className="max-w-[320px] truncate">{t?.name ?? "(tache supprimee)"}</td>
                    <td className="whitespace-nowrap text-ink-muted">{i.old_start ? `${formatDate(i.old_start)} → ${formatDate(i.old_end!)}` : "—"}</td>
                    <td className="whitespace-nowrap">{formatDate(i.new_start)} → {formatDate(i.new_end)}</td>
                    <td className={`num ${d === null ? "text-ink-faint" : d > 0 ? "font-semibold text-alert" : d < 0 ? "font-semibold text-ok" : "text-ink-faint"}`}>{d === null ? "—" : d === 0 ? "=" : `${d > 0 ? "+" : "−"}${Math.abs(d)} j`}</td></tr>
                ); })}
              </tbody></table>
              {r.status !== "soumise" && <p className="mt-2 text-ink-muted">{CHANGE_STATUS_LABELS[r.status]} par {(r.decided_by && who.get(r.decided_by)) || "—"} le {r.decided_at ? formatDateLong(r.decided_at.slice(0, 10)) : "—"}{r.decision_note ? ` · « ${r.decision_note} »` : ""}</p>}
              {r.status === "soumise" && (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {decider ? (
                    <form action={decideChangeRequest.bind(null, "approve")} className="flex flex-wrap items-center gap-2">
                      <input type="hidden" name="project_id" value={id} /><input type="hidden" name="id" value={r.id} />
                      <input name="note" placeholder="Note de decision (facultatif)" className="input !w-72" />
                      <button formAction={decideChangeRequest.bind(null, "approve")} className="btn-primary">Approuver et appliquer</button>
                      <button formAction={decideChangeRequest.bind(null, "refuse")} className="btn-secondary">Refuser</button>
                    </form>
                  ) : <span className="text-ink-muted">En attente de decision du chef de projet ou d&apos;un administrateur.</span>}
                  {(r.requested_by === profile.id || decider) && <form action={deleteChangeRequest}><input type="hidden" name="project_id" value={id} /><input type="hidden" name="id" value={r.id} /><button className="btn-ghost">Retirer la demande</button></form>}
                </div>
              )}
            </div>
          </details>
        ); })}
      </div>
    </>
  );
}
