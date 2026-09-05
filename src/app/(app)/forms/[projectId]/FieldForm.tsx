import Link from "next/link";
import { Alert } from "@/components/ui";
import { SubmitButton } from "@/components/ui/SubmitButton";


export function FieldForm({ projectId, title, action, error, children }: { projectId: string; title: string; action: (fd: FormData) => Promise<void>; error?: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-lg">
      <Link href={`/forms/${projectId}`} className="text-[10px] text-ink-muted">‹ Retour</Link>
      <h1 className="mb-4 mt-1 text-[16px] font-semibold">{title}</h1>
      {error && <div className="mb-4"><Alert>{error}</Alert></div>}
      <form action={action} className="card space-y-4 p-4 [&_input]:!text-[16px] [&_select]:!text-[16px] [&_textarea]:!text-[16px] [&_input]:!py-2.5 [&_select]:!py-2.5">
        <input type="hidden" name="project_id" value={projectId} />
        <input type="hidden" name="source" value="mobile" />
        <input type="hidden" name="redirect" value={`/forms/${projectId}`} />
        {children}
        <SubmitButton className="btn-primary w-full !py-3 !text-[13px]">Enregistrer</SubmitButton>
      </form>
    </div>
  );
}
