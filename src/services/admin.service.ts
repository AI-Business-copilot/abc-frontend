import { apiRequest } from "@/services/api.service";

export interface AdminAuditLog {
  id: string;
  action: string;
  targetType: string;
  targetId: string;
  changes: Record<string, unknown> | null;
  reason: string | null;
  createdAt: string;
  actor: { id: string; email: string; fullName: string };
  business?: { id: string; name: string } | null;
}

export interface AdminBusiness {
  id: string;
  name: string;
  phone: string;
  address: string | null;
  industryType: string;
  status: "ACTIVE" | "SUSPENDED";
  createdAt: string | null;
  memberships: Array<{
    status: string;
    role: { code: string };
    user: { id: string; email: string; fullName: string };
  }>;
  _count: { memberships: number };
}

export interface AdminUser {
  id: string;
  email: string;
  fullName: string;
  status: "ACTIVE" | "SUSPENDED";
  createdAt: string | null;
  memberships: Array<{
    status: string;
    role: { code: string; displayName: string };
    business: { id: string; name: string; status: string };
  }>;
  platformRoles: Array<{ role: { code: string; displayName: string } }>;
  isBootstrapAdmin: boolean;
}

export interface PagedResult {
  page: number;
  pageSize: number;
  total: number;
}

export async function getAdminDashboard() {
  return apiRequest<{
    totals: {
      users: number;
      activeUsers: number;
      suspendedUsers: number;
      businesses: number;
      activeBusinesses: number;
      suspendedBusinesses: number;
      newBusinesses30d: number;
    };
    recentActivity: AdminAuditLog[];
  }>("/admin/dashboard");
}

export async function listAdminBusinesses(params: { search?: string; status?: string; page?: number } = {}) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) if (value) query.set(key, String(value));
  return apiRequest<{ businesses: AdminBusiness[] } & PagedResult>(`/admin/businesses?${query}`);
}

export async function updateAdminBusiness(id: string, input: Pick<AdminBusiness, "name" | "phone" | "address" | "industryType">) {
  return apiRequest<{ business: AdminBusiness }>(`/admin/businesses/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export async function setAdminBusinessStatus(id: string, status: AdminBusiness["status"], reason: string) {
  return apiRequest<{ business: { id: string; status: string } }>(`/admin/businesses/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status, reason }),
  });
}

export async function listAdminUsers(params: { search?: string; status?: string; page?: number } = {}) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) if (value) query.set(key, String(value));
  return apiRequest<{ users: AdminUser[] } & PagedResult>(`/admin/users?${query}`);
}

export async function setAdminUserStatus(id: string, status: AdminUser["status"], reason: string) {
  return apiRequest<{ user: { id: string; status: string } }>(`/admin/users/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status, reason }),
  });
}

export async function setSystemAdminRole(id: string, enabled: boolean, reason: string) {
  return apiRequest<{ user: { id: string; systemAdmin: boolean } }>(`/admin/users/${id}/system-admin`, {
    method: "PATCH",
    body: JSON.stringify({ enabled, reason }),
  });
}

export async function listAdminAuditLogs(params: {
  search?: string;
  action?: string;
  from?: string;
  to?: string;
  sort?: "newest" | "oldest";
  page?: number;
  pageSize?: number;
} = {}) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") query.set(key, String(value));
  }
  return apiRequest<{ logs: AdminAuditLog[]; actions: string[] } & PagedResult>(`/admin/audit-logs?${query}`);
}

export async function listBusinessActivity(params: {
  search?: string;
  action?: string;
  from?: string;
  to?: string;
  sort?: "newest" | "oldest";
  page?: number;
  pageSize?: number;
} = {}) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") query.set(key, String(value));
  }
  return apiRequest<{
    logs: AdminAuditLog[];
    actions: string[];
  } & PagedResult>(`/businesses/activity?${query}`);
}

export async function setBusinessMemberStatus(id: string, status: "ACTIVE" | "SUSPENDED" | "INACTIVE", reason: string) {
  return apiRequest<{ membership: { id: string; status: string } }>(`/businesses/members/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status, reason }),
  });
}
