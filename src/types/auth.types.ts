export interface BusinessSummary {
  id: string;
  name: string;
  phone?: string;
  address?: string | null;
  industryType?: string;
  status: "ACTIVE" | "SUSPENDED";
  membershipStatus: "ACTIVE" | "SUSPENDED" | "INACTIVE";
  createdAt?: string | null;
  role: string;
  roleName?: string;
}

export interface ApplicationUser {
  id: string;
  email: string;
  fullName: string;
  emailVerified: boolean;
}

export interface AuthProfile {
  user: ApplicationUser;
  business: BusinessSummary | null;
  platformRoles: { code: string; displayName: string }[];
  permissions: string[];
  canManageSystemAdmins: boolean;
  onboardingRequired: boolean;
}

export interface BusinessInvitation {
  id: string;
  email: string;
  role: string;
  roleId: string;
  roleName?: string;
  status: string;
  emailStatus: string;
  expiresAt: string;
  createdAt: string;
}

export interface BusinessMember {
  id: string;
  status: "ACTIVE" | "SUSPENDED" | "INACTIVE";
  createdAt: string;
  role: string;
  roleId: string;
  roleName: string;
  user: { id: string; email: string; fullName: string; status: "ACTIVE" | "SUSPENDED" };
}

export interface ApiErrorPayload {
  error?: string;
  message?: string;
}
