"use client";
import { useState } from "react";
type RegisterType = { value: string; label: string; fields: { key: string; label: string; type: "text" | "number" }[] };

export function RegisterFields({ types }: { types: RegisterType[] }) {
  const [type, setType] = useState(types[0]?.value ?? "");
  const def = types.find((t) => t.value === type) ?? types[0];
  if (!def) return <p className="hint">Aucun type de registre defini. Ajoutez-en dans Administration, Listes de reference.</p>;
  return (
    <>
      <div>
        <label className="label">Type de registre</label>
        <select name="register_type" value={type} onChange={(e) => setType(e.target.value)} className="input">
          {types.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
      </div>
      {def.fields.map((f) => (
        <div key={f.key}>
          <label className="label">{f.label}</label>
          <input name={`f_${f.key}`} type={f.type} step={f.type === "number" ? "any" : undefined} required className="input" />
        </div>
      ))}
    </>
  );
}
