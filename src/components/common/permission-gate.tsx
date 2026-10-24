import type { ReactNode } from "react";

import { usePermissions } from "@/hooks/use-permissions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function PermissionGate({
  permission,
  children,
}: {
  permission: string;
  children: ReactNode;
}) {
  const { can } = usePermissions();
  if (can(permission)) return children;

  return (
    <Card>
      <CardHeader><CardTitle>Không có quyền truy cập</CardTitle></CardHeader>
      <CardContent className="text-sm text-slate-500">
        Vai trò hiện tại không được cấp quyền <code>{permission}</code>.
      </CardContent>
    </Card>
  );
}
