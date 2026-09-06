import Link from "next/link";
import { redirect } from "next/navigation";
import { Alert, Badge, PageHeader } from "@/components/ui";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { LIST_LABELS, getLists, registerFields, type ListKey } from "@/lib/reference";
import { requireProfile } from "@/lib/session";
import { addItem, deleteItem, moveItem, toggleItem, updateItem } from "./actions";

export const metadata = { title: "Listes de reference" };
const TONES = ["neutral", "info", "ok", "warn", "alert"];

export default async function ListsPage({ searchParams }: { searchParams: Promise<{ list?: string; ok?: string; error?: string }> }) {
  const me = await requireProfile();
  if (me.role !== "admin") redirect("/dashboard");
  const sp = await searchParams;
  const keys = Object.keys(LIST_LABELS) as ListKey[];
  const key = (keys.includes(sp.list as ListKey) ? sp.list : "expense_category") as ListKey;
  const lists = await getLists(true);
  const items = lists[key];
  const isStatus = key === "expense_status", isRegister = key === "register_type", freeValue = ["estimate_method", "confidence", "responsible_role"].includes(key);

  return (
    <>
      <PageHeader title="Listes de reference" subtitle="Les valeurs des listes deroulantes de l'application. Desactiver une valeur la retire des formulaires sans toucher aux enregistrements existants." />
      {sp.ok && <div className="mb-3"><Alert tone="ok">{sp.ok}</Alert></div>}
      {sp.error && <div className="mb-3"><Alert>{sp.error}</Alert></div>}
      <div className="grid gap-4 lg:grid-cols-[220px_1fr_300px]">
        <nav className="card p-1.5">
          {keys.map((k) => (
            <Link key={k} href={`/admin/lists?list=${k}`} className={`block rounded-md px-3 py-2 text-[10.5px] ${k === key ? "bg-surface-sub font-bold text-ink" : "text-ink-body hover:bg-surface-sub"}`}>
              {LIST_LABELS[k].label} <span className="text-ink-faint">{lists[k].length}</span>
            </Link>
          ))}
        </nav>

        <div className="card overflow-x-auto">
          <table className="tbl">
            <thead><tr><th className="w-8"></th><th>Libelle</th><th>Valeur stockee</th>{isStatus && <th>Options</th>}{isRegister && <th>Champs</th>}<th>Etat</th><th className="w-40"></th></tr></thead>
            <tbody>
              {items.map((it, i) => (
                <tr key={it.id ?? it.value} className={it.active ? "" : "opacity-60"}>
                  <td>
                    <div className="flex flex-col">
                      <form action={moveItem}><input type="hidden" name="list_key" value={key} /><input type="hidden" name="id" value={it.id} /><input type="hidden" name="dir" value="up" /><button disabled={i === 0} className="btn-ghost text-ink-faint disabled:opacity-30" title="Monter">▴</button></form>
                      <form action={moveItem}><input type="hidden" name="list_key" value={key} /><input type="hidden" name="id" value={it.id} /><input type="hidden" name="dir" value="down" /><button disabled={i === items.length - 1} className="btn-ghost text-ink-faint disabled:opacity-30" title="Descendre">▾</button></form>
                    </div>
                  </td>
                  <td colSpan={isStatus || isRegister ? 3 : 2}>
                    <form action={updateItem} className="flex flex-wrap items-center gap-2">
                      <input type="hidden" name="list_key" value={key} /><input type="hidden" name="id" value={it.id} />
                      <input name="label" defaultValue={it.label} className="input !w-52 !py-1" />
                      <span className="font-mono text-[9.5px] text-ink-faint">{it.value}</span>
                      {isStatus && <>
                        <select name="tone" defaultValue={String(it.meta.tone ?? "neutral")} className="input !w-auto !py-1">{TONES.map((t) => <option key={t} value={t}>{t}</option>)}</select>
                        <label className="flex items-center gap-1 text-[10px] text-ink-muted"><input type="checkbox" name="excluded" defaultChecked={it.meta.excluded === true} /> exclu du consomme</label>
                      </>}
                      {isRegister && <input name="fields" defaultValue={registerFields(it).map((f) => `${f.key}:${f.label}:${f.type}`).join(", ")} placeholder="cle:Libelle:text, quantite:Quantite:number" className="input !w-72 !py-1" title="Un champ par virgule : cle:Libelle:type (text ou number)" />}
                      <SubmitButton className="btn-secondary !py-1" pendingText="…">Enregistrer</SubmitButton>
                    </form>
                  </td>
                  <td><Badge tone={it.active ? "ok" : "neutral"}>{it.active ? "Actif" : "Inactif"}</Badge></td>
                  <td className="num">
                    <div className="flex justify-end gap-1">
                      <form action={toggleItem}><input type="hidden" name="list_key" value={key} /><input type="hidden" name="id" value={it.id} /><input type="hidden" name="active" value={it.active ? "0" : "1"} /><button className="btn-secondary !py-1">{it.active ? "Desactiver" : "Activer"}</button></form>
                      <form action={deleteItem}><input type="hidden" name="list_key" value={key} /><input type="hidden" name="id" value={it.id} /><button className="btn-ghost text-ink-faint hover:text-alert" title="Supprimer definitivement">×</button></form>
                    </div>
                  </td>
                </tr>
              ))}
              {items.length === 0 && <tr><td colSpan={6} className="py-6 text-center text-ink-muted">Liste vide.</td></tr>}
            </tbody>
          </table>
        </div>

        <form action={addItem} className="card card-pad h-fit space-y-3">
          <div className="card-title">Ajouter a « {LIST_LABELS[key].label} »</div>
          <p className="hint">{LIST_LABELS[key].hint}</p>
          <input type="hidden" name="list_key" value={key} />
          <div><label className="label">Libelle</label><input name="label" required className="input" /></div>
          {!freeValue && <div><label className="label">Valeur stockee (optionnel)</label><input name="value" placeholder="deduite du libelle" className="input" /></div>}
          {isStatus && <>
            <div><label className="label">Ton</label><select name="tone" className="input">{TONES.map((t) => <option key={t} value={t}>{t}</option>)}</select></div>
            <label className="flex items-center gap-2 text-[10.5px]"><input type="checkbox" name="excluded" /> Exclu du budget consomme</label>
          </>}
          {isRegister && <div><label className="label">Champs</label><input name="fields" placeholder="cle:Libelle:text, quantite:Quantite:number" className="input" /><p className="hint mt-1">Un champ par virgule, sous la forme cle:Libelle:type. Type text ou number.</p></div>}
          <SubmitButton>Ajouter</SubmitButton>
        </form>
      </div>
    </>
  );
}
