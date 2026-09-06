import Link from "next/link";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui";
import { HistoryList, type HistoryItem } from "@/components/history/HistoryList";
import { requireProfile } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import type { AuditEntry, Profile } from "@/lib/types";

export const metadata = { title: "Journal d'activite" };

export default async function ActivityPage() {
  const me = await requireProfile();
  if (me.role !== "admin") redirect("/dashboard");
  const supabase = await createClient();
  const [{ data: au }, { data: people }, { data: projects }] = await Promise.all([
    supabase.from("audit_log").select("*").order("changed_at", { ascending: false }).limit(2000),
    supabase.from("profiles").select("id,email,full_name,role"),
    supabase.from("projects").select("id,code,currency"),
  ]);
  const who = new Map(((people ?? []) as Profile[]).map((p) => [p.id, p.full_name || p.email]));
  const pmap = new Map((projects ?? []).map((p) => [p.id, p]));
  const items: HistoryItem[] = ((au ?? []) as AuditEntry[]).map((a) => ({ ...a, author: (a.changed_by && who.get(a.changed_by)) || "Systeme", projectCode: a.project_id ? pmap.get(a.project_id)?.code : undefined, currency: a.project_id ? pmap.get(a.project_id)?.currency : undefined }));
  return (
    <>
      <Link href="/admin" className="text-[10px] text-ink-muted">‹ Administration</Link>
      <PageHeader title="Journal d'activite" subtitle="Toutes les modifications, tous projets confondus (2 000 dernieres)." />
      <HistoryList items={items} global />
    </>
  );
}
