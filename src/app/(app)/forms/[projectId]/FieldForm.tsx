import Link from "next/link";
import { Alert } from "@/components/ui";
import { SubmitButton } from "@/components/ui/SubmitButton";


export function FieldForm({ projectId, title, action, error, children }: { projectId: string; title: string; action: (fd: FormData) => Promise<void>; error?: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-lg">
      <Link href={`/forms/${projectId}`} className="text-xs text-slate-500">‹ Retour</Link>
      <h1 className="mb-4 mt-1 text-xl font-semibold">{title}</h1>
      {error && <div className="mb-4"><Alert>{error}</Alert></div>}
      <form action={action} className="card space-y-4 p-4 [&_input]:text-base [&_select]:text-base [&_textarea]:text-base">
        <input type="hidden" name="project_id" value={projectId} />
        <input type="hidden" name="source" value="mobile" />
        <input type="hidden" name="redirect" value={`/forms/${projectId}`} />
        {children}
        <SubmitButton className="btn-primary w-full !py-3 !text-base">Enregistrer</SubmitButton>
      </form>
    </div>
  );
}
