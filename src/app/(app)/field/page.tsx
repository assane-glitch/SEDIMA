import Link from "next/link";
import { Empty, PageHeader } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import type { Project } from "@/lib/types";
import { InstallHint } from "./InstallHint";

export const metadata = { title: "Terrain" };

export default async function FieldHome() {
  const supabase = await createClient();
  const { data } = await supabase.from("projects").select("id,code,name,status").in("status", ["planning", "active"]).order("name");
  const projects = (data ?? []) as Pick<Project, "id" | "code" | "name" | "status">[];
  return (
    <div className="mx-auto max-w-lg">
      <PageHeader title="Terrain" subtitle="Choisissez un projet pour saisir une entree" />
      <InstallHint />
      {projects.length === 0 ? <Empty title="Aucun projet actif" /> : (
        <div className="space-y-2">
          {projects.map((p) => (
            <Link key={p.id} href={`/field/${p.id}`} className="card flex items-center justify-between px-4 py-4 active:bg-slate-50">
              <div><div className="font-medium">{p.name}</div><div className="text-xs text-slate-500">{p.code}</div></div>
              <span className="text-slate-400">›</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
