import { apiJson } from "@/lib/api-client";

export async function apiRequest<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  return apiJson<T>(path, init);
}
