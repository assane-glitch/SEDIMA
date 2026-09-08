"use client";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deleteProject } from "@/app/(app)/projects/actions";

/**
 * Suppression definitive d'un projet : l'utilisateur recopie le code du projet pour deverrouiller le bouton,
 * puis confirme. Les taches, jalons, depenses, journal, registres, documents, demandes de changement
 * et favoris du projet sont supprimes en cascade par la base.
 */
export function DeleteProjectForm({ projectId, code, name, counts }: { projectId: string; code: string; name: string; counts: { tasks: number; expenses: number; documents: number } }) {
  const [typed, setTyped] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  const unlocked = typed.trim().toUpperCase() === code.toUpperCase();
  const submit = () => {
    if (!unlocked) return;
    if (!confirm(`Supprimer definitivement le projet ${code} « ${name} » et toutes ses donnees ? Cette action est irreversible.`)) return;
    start(async () => {
      setErr(null);
      const fd = new FormData(); fd.set("id", projectId);
      try {
        const r = await deleteProject(fd);
        if (r && "error" in r && r.error) { setErr(r.error); return; }
      } catch (e) { setErr(e instanceof Error ? e.message : "Suppression impossible"); return; }
      router.push(`/projects?ok=${encodeURIComponent(`Projet ${code} supprime`)}`);
      router.refresh();
    });
  };
  return (
    <section id="supprimer" className="card card-pad mt-4 border-alert-bd">
      <div className="card-title text-alert">Supprimer le projet</div>
      <p className="hint mt-1">
        Supprime le projet et toutes ses donnees : {counts.tasks} tache{counts.tasks > 1 ? "s" : ""} (lots compris), {counts.expenses} depense{counts.expenses > 1 ? "s" : ""}, {counts.documents} document{counts.documents > 1 ? "s" : ""}, ainsi que les jalons, le journal, les registres et les demandes de changement.
        L&apos;historique des modifications est conserve dans le journal d&apos;activite. Cette action est irreversible.
      </p>
      <div className="mt-3 flex flex-wrap items-end gap-3">
        <div>
          <label className="label">Recopier le code du projet pour confirmer</label>
          <input value={typed} onChange={(e) => setTyped(e.target.value)} placeholder={code} autoComplete="off" className="input !w-48 font-mono" />
        </div>
        <button type="button" onClick={submit} disabled={!unlocked || pending} className="btn-danger">{pending ? "Suppression…" : "Supprimer definitivement"}</button>
        {err && <span className="text-[10.5px] font-semibold text-alert">{err}</span>}
      </div>
    </section>
  );
}
