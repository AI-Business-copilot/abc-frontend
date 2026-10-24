import { LoaderCircle } from "lucide-react";

export function Spinner({ className }: { className?: string }) {
  return <LoaderCircle aria-hidden="true" className={`animate-spin ${className ?? ""}`} />;
}
