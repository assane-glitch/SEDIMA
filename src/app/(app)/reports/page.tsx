import { ComingSoon, PageHeader } from "@/components/ui";
export const metadata = { title: "Rapports" };
export default function ReportsPage() {
  return (
    <>
      <PageHeader title="Rapports" subtitle="Rapports hebdomadaires et exports" />
      <ComingSoon title="Rapports" step={9} hint="Rapport de projet en PDF, export Excel des depenses et des taches, envoi par email aux lecteurs." />
    </>
  );
}
