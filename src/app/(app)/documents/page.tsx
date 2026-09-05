import { ComingSoon, PageHeader } from "@/components/ui";
export const metadata = { title: "Documents" };
export default function DocumentsPage() {
  return (
    <>
      <PageHeader title="Documents" subtitle="Fichiers et photos de tous les projets" />
      <ComingSoon title="Espace documents" step={7} hint="Filtres par projet, categorie, type de document, tache, date et auteur. Photos prises depuis le mobile." />
    </>
  );
}
