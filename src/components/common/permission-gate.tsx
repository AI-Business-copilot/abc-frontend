import type { ReactNode } from "react";

import { usePermissions } from "@/hooks/use-permissions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function PermissionGate({
  permission,
  children,
  fallback,
}: {
  permission: string;
  children: ReactNode;
  /** Rendered when the permission is missing. Pass `null` to render nothing; omit it for the default "no access" card. */
  fallback?: ReactNode;
}) {
  const { can } = usePermissions();
  
  if (can(permission)) return children;
  if (fallback !== undefined) return fallback;

  return (
    <Card>
      <CardHeader><CardTitle>Không có quyền truy cập</CardTitle></CardHeader>
      <CardContent className="text-sm text-slate-500">
        Vai trò hiện tại không được cấp quyền <code>{permission}</code>.
      </CardContent>
    </Card>
  );
}
