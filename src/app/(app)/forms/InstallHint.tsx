"use client";
import { useEffect, useState } from "react";

export function InstallHint() {
  const [standalone, setStandalone] = useState(true);
  useEffect(() => {
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => {});
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches || ("standalone" in navigator && (navigator as unknown as { standalone: boolean }).standalone);
    setStandalone(Boolean(isStandalone));
  }, []);
  if (standalone) return null;
  return (
    <div className="mb-4 rounded-lg border border-line-hair bg-surface-sub px-3 py-2 text-[10px] text-ink">
      Ajoutez SEDIMA a l&apos;ecran d&apos;accueil de votre telephone pour l&apos;utiliser comme une application : menu du navigateur, puis « Ajouter a l&apos;ecran d&apos;accueil ».
    </div>
  );
}
