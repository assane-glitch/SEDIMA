"use client";
import { useEffect } from "react";
export function PrintButton({ auto }: { auto?: boolean }) {
  useEffect(() => { if (auto) setTimeout(() => window.print(), 600); }, [auto]);
  return <button onClick={() => window.print()} className="btn-primary">Imprimer / PDF</button>;
}
