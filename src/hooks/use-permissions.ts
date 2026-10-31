import { useMemo } from "react";
import { useAuth } from "@/hooks/use-auth";

export function usePermissions() {
  const { profile } = useAuth();
  return useMemo(() => {
    const permissions = new Set(profile?.permissions ?? []);
    const platformAdmin = profile?.platformRoles.some(
      (role) => role.code === "SYSTEM_ADMIN",
    );
    console.log(profile);
    return {
      can: (permission: string) => permissions.has(permission),
      isOwner: profile?.business?.role === "OWNER",
      isStaff: profile?.business?.role === "STAFF",
      isSystemAdmin: Boolean(platformAdmin),
    };
  }, [profile]);
}
