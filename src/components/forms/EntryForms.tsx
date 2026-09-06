"use client";
import { useMemo, useState } from "react";
import { addJournalEntry, addRegisterEntry } from "@/app/(app)/projects/actions";
import { DateInput } from "@/components/ui/DateInput";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { today } from "@/lib/format";

export interface FormProject { id: string; code: string; name: string }
export interface FormTask { id: string; name: string; wbs_code: string | null; project_id: string }
export type RegisterType = { value: string; label: string; fields: { key: string; label: string; type: "text" | "number" }[] };

const mobileCls = "card space-y-4 p-4 [&_input]:!text-[16px] [&_select]:!text-[16px] [&_textarea]:!text-[16px] [&_input]:!py-2.5 [&_select]:!py-2.5";

function ProjectAndTask({ projects, tasks, projectId, pid, setPid }: { projects: FormProject[]; tasks: FormTask[]; projectId?: string; pid: string; setPid: (v: string) => void }) {
  const list = useMemo(() => tasks.filter((t) => t.project_id === pid), [tasks, pid]);
  return (
    <>
      <input type="hidden" name="project_id" value={pid} />
      {!projectId && (
        <div><label className="label">Projet</label>
          <select value={pid} onChange={(e) => setPid(e.target.value)} className="input" required>{projects.map((p) => <option key={p.id} value={p.id}>{p.code} · {p.name}</option>)}</select></div>
      )}
      <div><label className="label">Tache concernee</label>
        <select name="task_id" className="input"><option value="">—</option>{list.map((t) => <option key={t.id} value={t.id}>{t.wbs_code ? `${t.wbs_code} · ` : ""}{t.name}</option>)}</select></div>
    </>
  );
}

/** Journal du jour, avec choix du projet si projectId n'est pas fixe. */
export function JournalForm({ projects, tasks, projectId, redirect }: { projects: FormProject[]; tasks: FormTask[]; projectId?: string; redirect: string }) {
  const [pid, setPid] = useState(projectId ?? projects[0]?.id ?? "");
  return (
    <form action={addJournalEntry} className={mobileCls}>
      <input type="hidden" name="source" value="mobile" /><input type="hidden" name="redirect" value={redirect} />
      <ProjectAndTask projects={projects} tasks={tasks} projectId={projectId} pid={pid} setPid={setPid} />
      <div><label className="label">Date</label><DateInput name="entry_date" required defaultValue={today()} className="input" /></div>
      <div><label className="label">Lieu</label><input name="location" placeholder="Site, zone…" className="input" /></div>
      <div><label className="label">Compte rendu</label><textarea name="content" rows={6} required placeholder="Travaux realises, effectifs, difficultes, meteo…" className="input" /></div>
      <SubmitButton className="btn-primary w-full !py-3 !text-[13px]">Enregistrer</SubmitButton>
    </form>
  );
}

/** Registre (presence, materiel, livraison, incident…), champs selon le type. */
export function RegisterForm({ projects, tasks, projectId, redirect, types }: { projects: FormProject[]; tasks: FormTask[]; projectId?: string; redirect: string; types: RegisterType[] }) {
  const [pid, setPid] = useState(projectId ?? projects[0]?.id ?? "");
  const [type, setType] = useState(types[0]?.value ?? "");
  const def = types.find((t) => t.value === type) ?? types[0];
  return (
    <form action={addRegisterEntry} className={mobileCls}>
      <input type="hidden" name="source" value="mobile" /><input type="hidden" name="redirect" value={redirect} />
      <ProjectAndTask projects={projects} tasks={tasks} projectId={projectId} pid={pid} setPid={setPid} />
      <div><label className="label">Date</label><DateInput name="entry_date" required defaultValue={today()} className="input" /></div>
      {!def ? <p className="hint">Aucun type de registre defini. Ajoutez-en dans Administration, Listes de reference.</p> : (
        <>
          <div><label className="label">Type de registre</label>
            <select name="register_type" value={type} onChange={(e) => setType(e.target.value)} className="input">{types.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}</select></div>
          {def.fields.map((f) => <div key={f.key}><label className="label">{f.label}</label><input name={`f_${f.key}`} type={f.type} step={f.type === "number" ? "any" : undefined} required className="input" /></div>)}
        </>
      )}
      <SubmitButton className="btn-primary w-full !py-3 !text-[13px]">Enregistrer</SubmitButton>
    </form>
  );
}
