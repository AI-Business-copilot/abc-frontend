import { supabase } from "@/lib/supabase";

const apiBaseUrl = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export type CategoryNode = {
  id: string;
  code: string;
  name: string;
  parentId: string | null;
  level: 1 | 2;
  description: string | null;
  isActive: boolean;
  templateCount: number;
  variantCount: number;
  attributes: string[];
  children: CategoryNode[];
};

export type CategoryStats = {
  total: number;
  active: number;
  missingProducts: number;
};

export type CategoryListResponse = {
  stats: CategoryStats;
  items: CategoryNode[];
  parents: { id: string; name: string; code: string }[];
};

export type CategoryPayload = {
  name?: string;
  level?: 1 | 2;
  parentId?: string | null;
  description?: string | null;
  isActive?: boolean;
};

export type CategoryMutationResult = {
  id: string;
  businessId: string;
  name: string;
  code: string | null;
  parentId: string | null;
  description: string | null;
  isActive: boolean;
  level: 1 | 2;
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
  }

  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as { message?: string; error?: string };
    throw new Error(payload.message || payload.error || `Yêu cầu thất bại (${response.status}).`);
  }

  return (await response.json()) as T;
}

export const categoriesApi = {
  list: () => request<CategoryListResponse>("/categories"),
  create: (payload: CategoryPayload) =>
    request<CategoryMutationResult>("/categories", { method: "POST", body: JSON.stringify(payload) }),
  update: (id: string, payload: CategoryPayload) =>
    request<CategoryMutationResult>(`/categories/${id}`, { method: "PATCH", body: JSON.stringify(payload) }),
  remove: (id: string) => request<{ id: string }>(`/categories/${id}`, { method: "DELETE" }),
};
