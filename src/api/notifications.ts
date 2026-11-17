import { apiFetch } from "@/lib/api-client";

export type NotificationItem = {
  id: string;
  type: "LOT_EXPIRY" | "SCRAP_PENDING" | "AUDIT_ASSIGNED";
  title: string;
  message: string;
  href: string;
  occurredAt: string;
  readAt: string | null;
};
export type NotificationPage = {
  items: NotificationItem[];
  total: number;
  unreadCount: number;
  page: number;
  pageSize: number;
};
async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await apiFetch(path, init);
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.message || payload.error || "Không tải được thông báo.");
  }
  return response.status === 204 ? undefined as T : response.json();
}
export const getNotifications = (page: number, signal?: AbortSignal) =>
  request<NotificationPage>(`/notifications?page=${page}`, { signal });
export const readNotifications = (ids: string[]) =>
  request<void>("/notifications/read", { method: "POST", body: JSON.stringify({ ids }) });
