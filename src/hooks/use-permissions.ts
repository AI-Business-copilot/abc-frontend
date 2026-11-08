import { useMemo } from "react";
import { useAuth } from "@/hooks/use-auth";

export function usePermissions() {
  const { profile } = useAuth();
  return useMemo(() => {
    const permissions = new Set(profile?.permissions ?? []);
    const platformAdmin = profile?.platformRoles.some(
      (role) => role.code === "SYSTEM_ADMIN",
    );
    return {
      can: (permission: string) => permissions.has(permission),
      isOwner: profile?.business?.role === "OWNER",
      isStaff: Boolean(profile?.business && profile.business.role !== "OWNER"),
      isSystemAdmin: Boolean(platformAdmin),
      canManageSystemAdmins: Boolean(profile?.canManageSystemAdmins),
    };
  }, [profile]);
}
