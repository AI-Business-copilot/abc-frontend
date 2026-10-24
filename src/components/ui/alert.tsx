import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export function Alert({
  className,
  variant = "default",
  ...props
}: HTMLAttributes<HTMLDivElement> & { variant?: "default" | "destructive" | "success" }) {
  const variants = {
    default: "border-sky-200 bg-sky-50 text-sky-900",
    destructive: "border-rose-200 bg-rose-50 text-rose-800",
    success: "border-emerald-200 bg-emerald-50 text-emerald-800",
  };

  return (
    <div
      role="status"
      className={cn("rounded-xl border px-4 py-3 text-sm leading-relaxed", variants[variant], className)}
      {...props}
    />
  );
}
