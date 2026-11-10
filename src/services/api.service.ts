import { supabase } from "@/lib/supabase";
import type { ApiErrorPayload } from "@/types/auth.types";

const apiBaseUrl =
  (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/+$/, "") ||
  "http://localhost:5000/api";

export async function apiRequest<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();
  if (sessionError) {
    throw sessionError;
  }
  if (!session?.access_token) {
    throw new Error("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
  }

  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${session.access_token}`);
  // FormData must go out without a Content-Type so the browser adds the multipart boundary itself.
  if (init.body && !(init.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${apiBaseUrl}${path}`, { ...init, headers });
  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as ApiErrorPayload;
    // Most modules reply with { error }, the inventory controller replies with { message }.
    throw new Error(payload.error || payload.message || `Yêu cầu thất bại (${response.status}).`);
  }

  if (response.status === 204) {
    return undefined as T;
  }
  return (await response.json()) as T;
}
