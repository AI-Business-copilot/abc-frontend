import type { ReactNode } from "react";
import { RouterProvider } from "react-router-dom";

import { AuthProvider } from "@/hooks/use-auth";
import { router } from "@/app/router";

export function Providers({ children: _children }: { children?: ReactNode }) {
  return (
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  );
}
