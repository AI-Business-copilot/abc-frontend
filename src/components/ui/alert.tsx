import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export function Alert({
  className,
  variant = "default",
  ...props
}: HTMLAttributes<HTMLDivElement> & { variant?: "default" | "destructive" | "success" }) {
  const variants = {
    default: "border-emerald-200 bg-emerald-50/80 text-emerald-950",
    destructive: "border-red-200 bg-red-50 text-red-800",
    success: "border-emerald-300 bg-emerald-50 text-emerald-900",
  };

  return (
    <div
      role="status"
      className={cn("rounded-xl border px-4 py-3 text-sm leading-relaxed", variants[variant], className)}
      {...props}
    />
  );
}
