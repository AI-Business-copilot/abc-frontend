import { apiRequest } from "@/services/api.service";
import type { BusinessInvitation, BusinessMember } from "@/types/auth.types";

export interface CreateBusinessInput {
  name: string;
  phone: string;
  industryType: string;
  address?: string;
}

export interface BusinessRole {
  id: string;
  code: string;
  displayName: string;
  description: string | null;
  isDefault: boolean;
  isArchived: boolean;
  permissionCodes: string[];
  memberCount: number;
  invitationCount: number;
}

export interface BusinessPermission {
  code: string;
  description: string | null;
}

type BusinessRoleMutationResult = Pick<
  BusinessRole,
  "id" | "code" | "displayName" | "description" | "isDefault" | "isArchived" | "permissionCodes"
>;

export async function createBusiness(input: CreateBusinessInput) {
  return apiRequest<{ business: { id: string; name: string }; role: string }>(
    "/businesses/onboarding",
    { method: "POST", body: JSON.stringify(input) },
  );
}

export async function updateCurrentBusiness(input: CreateBusinessInput) {
  return apiRequest<{ business: { id: string; name: string; phone: string; industryType: string; address: string | null; status: string } }>(
    "/businesses/profile",
    { method: "PATCH", body: JSON.stringify(input) },
  );
}

export async function inviteEmployee(email: string, roleId?: string) {
  return apiRequest<{
    invitation: {
      id: string;
      email: string;
      role: string;
      roleId: string;
      roleName: string;
      expiresAt: string;
      emailStatus: string;
    };
  }>("/businesses/invitations", {
    method: "POST",
    body: JSON.stringify({ email, ...(roleId ? { roleId } : {}) }),
  });
}

export async function listBusinessRoles() {
  return apiRequest<{ roles: BusinessRole[]; permissions: BusinessPermission[] }>("/businesses/roles");
}

export async function createBusinessRole(input: {
  displayName: string;
  description: string | null;
  permissionCodes: string[];
  reason: string;
}) {
  return apiRequest<{ role: BusinessRoleMutationResult }>("/businesses/roles", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function updateBusinessRole(
  roleId: string,
  input: {
    displayName: string;
    description: string | null;
    permissionCodes: string[];
    reason: string;
  },
) {
  return apiRequest<{ role: BusinessRoleMutationResult }>(`/businesses/roles/${roleId}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export async function archiveBusinessRole(roleId: string, reason: string) {
  return apiRequest<void>(`/businesses/roles/${roleId}/archive`, {
    method: "POST",
    body: JSON.stringify({ reason }),
  });
}

export async function restoreBusinessRole(roleId: string, reason: string) {
  return apiRequest<void>(`/businesses/roles/${roleId}/restore`, {
    method: "POST",
    body: JSON.stringify({ reason }),
  });
}

export async function updateBusinessMemberRole(membershipId: string, roleId: string, reason: string) {
  return apiRequest<{ membership: { id: string; roleId: string; role: string; roleName: string } }>(
    `/businesses/members/${membershipId}/role`,
    { method: "PATCH", body: JSON.stringify({ roleId, reason }) },
  );
}

export async function acceptInvitation(token: string) {
  return apiRequest<{ membership: { id: string; role: string } }>(
    "/businesses/invitations/accept",
    { method: "POST", body: JSON.stringify({ token }) },
  );
}

export async function revokeInvitation(id: string) {
  return apiRequest<void>(`/businesses/invitations/${id}`, { method: "DELETE" });
}

export async function listInvitations() {
  return apiRequest<{ invitations: BusinessInvitation[] }>(
    "/businesses/invitations",
  );
}

export async function listBusinessMembers() {
  return apiRequest<{ members: BusinessMember[] }>("/businesses/members");
}
