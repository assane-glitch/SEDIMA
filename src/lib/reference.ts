import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { DEFAULT_LISTS, type ListKey, type Lists, type RefItem } from "@/lib/reference-types";
export * from "@/lib/reference-types";

/** Toutes les listes de reference, actives en premier, memoisees par requete. */
export const getLists = cache(async (includeInactive = false): Promise<Lists> => {
  const supabase = await createClient();
  const { data } = await supabase.from("reference_lists").select("id,list_key,value,label,sort_order,active,meta").order("sort_order").order("label");
  const out = { ...DEFAULT_LISTS } as Lists;
  const grouped = new Map<string, RefItem[]>();
  for (const r of data ?? []) {
    if (!includeInactive && !r.active) continue;
    grouped.set(r.list_key, [...(grouped.get(r.list_key) ?? []), { id: r.id, value: r.value, label: r.label, meta: (r.meta ?? {}) as Record<string, unknown>, active: r.active, sort_order: r.sort_order }]);
  }
  for (const [k, v] of grouped) if (v.length > 0) out[k as ListKey] = v;
  return out;
});
