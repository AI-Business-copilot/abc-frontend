export interface BusinessSummary {
  id: string;
  name: string;
  phone?: string;
  address?: string | null;
  industryType?: string;
  createdAt?: string | null;
  role: "OWNER" | "STAFF";
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
  onboardingRequired: boolean;
}

export interface BusinessInvitation {
  id: string;
  email: string;
  role: string;
  status: string;
  emailStatus: string;
  expiresAt: string;
  createdAt: string;
}

export interface BusinessMember {
  id: string;
  status: string;
  createdAt: string;
  role: string;
  roleName: string;
  user: { id: string; email: string; fullName: string };
}

export interface ApiErrorPayload {
  error?: string;
}
