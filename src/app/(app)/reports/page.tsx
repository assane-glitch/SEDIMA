import Link from "next/link";
import { PageHeader } from "@/components/ui";
import { requireProfile } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { ReportPicker } from "./ReportPicker";

export const metadata = { title: "Rapports" };

export default async function ReportsPage() {
  await requireProfile();
  const supabase = await createClient();
  const { data } = await supabase.from("projects").select("id,code,name,status").neq("status", "hors_perimetre").order("code");
  const projects = data ?? [];
  const exports = [
    { type: "tasks", label: "Taches", hint: "WBS, lot, dates, avancement, budget, responsable, liens" },
    { type: "expenses", label: "Journal des depenses", hint: "Reference, designation, montant, fournisseur, DA, statut" },
    { type: "journal", label: "Journal de chantier", hint: "Date, tache, lieu, compte rendu, auteur" },
    { type: "registers", label: "Registres", hint: "Type, date, champs, auteur" },
    { type: "milestones", label: "Jalons", hint: "Echeance, atteint le, notes" },
    { type: "projects", label: "Projets", hint: "Portefeuille : budget, engage, avancement, tranches annuelles" },
  ];
  return (
    <>
      <PageHeader title="Rapports" subtitle="Rapport hebdomadaire imprimable (PDF via le navigateur) et exports Excel (CSV)." />
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card card-pad">
          <div className="card-title mb-1">Rapport hebdomadaire</div>
          <p className="hint mb-3">Etat du portefeuille ou d&apos;un projet : sante, avancement, budget, taches de la semaine, retards, jalons et saisies terrain. Ouvrez-le puis « Imprimer » pour obtenir un PDF.</p>
          <ReportPicker projects={projects} />
        </div>
        <div className="card card-pad">
          <div className="card-title mb-1">Exports</div>
          <p className="hint mb-3">Fichiers CSV lisibles par Excel (separateur point-virgule, accents preserves). Choisissez un projet ou exportez tout le portefeuille.</p>
          <ReportPicker projects={projects} exports={exports} />
        </div>
      </div>
      <p className="hint mt-4">Envoi automatique par email : a activer plus tard avec un service d&apos;envoi (Resend ou SMTP). <Link href="/admin" className="underline">Administration</Link>.</p>
    </>
  );
}
