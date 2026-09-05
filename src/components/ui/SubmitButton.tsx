"use client";
import { useFormStatus } from "react-dom";

export function SubmitButton({ children, pendingText = "Enregistrement…", className = "btn-primary" }: { children: React.ReactNode; pendingText?: string; className?: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={className} aria-busy={pending}>
      {pending ? pendingText : children}
    </button>
  );
}
