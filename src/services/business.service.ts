import { apiRequest } from "@/services/api.service";
import type { BusinessInvitation, BusinessMember } from "@/types/auth.types";

export interface CreateBusinessInput {
  name: string;
  phone: string;
  industryType: string;
  address?: string;
}

export async function createBusiness(input: CreateBusinessInput) {
  return apiRequest<{ business: { id: string; name: string }; role: string }>(
    "/businesses/onboarding",
    { method: "POST", body: JSON.stringify(input) },
  );
}

export async function inviteEmployee(email: string) {
  return apiRequest<{
    invitation: {
      id: string;
      email: string;
      role: string;
      expiresAt: string;
      emailStatus: string;
    };
  }>("/businesses/invitations", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
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
