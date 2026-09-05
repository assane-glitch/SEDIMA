import { ComingSoon, PageHeader } from "@/components/ui";
export const metadata = { title: "Tâches" };
export default function TasksPage() {
  return (
    <>
      <PageHeader title="Tâches" subtitle="Toutes les taches, tous projets confondus" />
      <ComingSoon title="Liste des taches" step={4} hint="Mes taches par defaut, filtres par projet, responsable, statut et echeance, edition rapide." />
    </>
  );
}
